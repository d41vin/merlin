#Requires -Version 5.1
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Checkpoint,
  [Parameter(Mandatory = $true)][string]$ExpectedCommit,
  [Parameter(Mandatory = $true)][string]$ExpectedParent,
  [Parameter(Mandatory = $true)][string]$ExpectedBranch,
  [Parameter(Mandatory = $true)][string]$Remote,
  [Parameter(Mandatory = $true)][string]$RemoteBranch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$env:GIT_TERMINAL_PROMPT = "0"

$repoRoot = Split-Path -Parent $PSScriptRoot
$operation = "push"

function Write-Result {
  param(
    [bool]$Ok,
    [string]$Stage,
    [string]$ErrorText,
    [hashtable]$Data
  )

  $result = [ordered]@{
    ok         = $Ok
    operation  = $operation
    checkpoint = $Checkpoint
    stage      = $Stage
  }
  if ($Ok) {
    $result.Remove("stage")
    if ($null -ne $Data) {
      foreach ($key in $Data.Keys) { $result[$key] = $Data[$key] }
    }
  } else {
    $result.error = $ErrorText
    if ($null -ne $Data) {
      foreach ($key in $Data.Keys) { $result[$key] = $Data[$key] }
    }
  }

  Write-Output ($result | ConvertTo-Json -Compress -Depth 6)
  if ($Ok) { exit 0 } else { exit 1 }
}

function Invoke-Git {
  param([string[]]$Arguments)

  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & git -C $repoRoot @Arguments 2>&1
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }

  return [pscustomobject]@{
    ExitCode = $code
    Output   = @($output | ForEach-Object { "$_" })
  }
}

function Get-GitText {
  param([string[]]$Arguments)
  $result = Invoke-Git -Arguments $Arguments
  if ($result.ExitCode -ne 0) {
    throw "git $($Arguments -join ' ') failed: $($result.Output -join ' ')"
  }
  return (($result.Output -join "`n").Trim())
}

try {
  if ($Checkpoint -notmatch "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$") {
    throw "Invalid checkpoint identifier."
  }
  if ($ExpectedCommit -notmatch "^[0-9a-fA-F]{40}$") {
    throw "ExpectedCommit must be a full 40-character commit SHA."
  }
  if ($ExpectedParent -notmatch "^[0-9a-fA-F]{40}$") {
    throw "ExpectedParent must be a full 40-character commit SHA."
  }
  $ExpectedCommit = $ExpectedCommit.ToLowerInvariant()
  $ExpectedParent = $ExpectedParent.ToLowerInvariant()

  if ([string]::IsNullOrWhiteSpace($ExpectedBranch) -or [string]::IsNullOrWhiteSpace($Remote) -or [string]::IsNullOrWhiteSpace($RemoteBranch)) {
    throw "Branch and remote parameters are required."
  }
  if ($Remote -notmatch "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$") {
    throw "Invalid remote name."
  }
  $branchCheck = Invoke-Git -Arguments @("check-ref-format", "--branch", $ExpectedBranch)
  if ($branchCheck.ExitCode -ne 0) { throw "Invalid expected branch name." }
  $remoteBranchCheck = Invoke-Git -Arguments @("check-ref-format", "refs/heads/$RemoteBranch")
  if ($remoteBranchCheck.ExitCode -ne 0) { throw "Invalid remote branch name." }

  $isWorkTree = Invoke-Git -Arguments @("rev-parse", "--is-inside-work-tree")
  if ($isWorkTree.ExitCode -ne 0 -or (($isWorkTree.Output -join "").Trim()) -ne "true") {
    throw "The wrapper is not inside a Git worktree."
  }
  $topLevel = Get-GitText -Arguments @("rev-parse", "--show-toplevel")
  $normalizedRoot = [System.IO.Path]::GetFullPath($repoRoot).TrimEnd("\", "/")
  $normalizedTop = [System.IO.Path]::GetFullPath($topLevel).TrimEnd("\", "/")
  if (-not $normalizedRoot.Equals($normalizedTop, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "The wrapper repository root does not match the Git worktree root."
  }

  $currentBranch = Get-GitText -Arguments @("symbolic-ref", "--quiet", "--short", "HEAD")
  if ($currentBranch -ne $ExpectedBranch) {
    throw "Current branch '$currentBranch' does not match expected branch '$ExpectedBranch'."
  }

  $head = Get-GitText -Arguments @("rev-parse", "HEAD")
  if ($head -ne $ExpectedCommit) {
    throw "Current HEAD '$head' does not match expected audited commit '$ExpectedCommit'."
  }

  $commitExists = Invoke-Git -Arguments @("cat-file", "-e", "$ExpectedCommit^{commit}")
  if ($commitExists.ExitCode -ne 0) { throw "Expected commit is not a commit object." }

  $parentsLine = Get-GitText -Arguments @("rev-list", "--parents", "-n", "1", $ExpectedCommit)
  $parents = @($parentsLine -split "\s+" | Where-Object { $_ -ne "" })
  if ($parents.Count -ne 2) {
    throw "The audited commit must have exactly one parent."
  }
  if ($parents[1] -ne $ExpectedParent) {
    throw "The audited commit parent '$($parents[1])' does not match expected parent '$ExpectedParent'."
  }

  $isAncestor = Invoke-Git -Arguments @("merge-base", "--is-ancestor", $ExpectedParent, $ExpectedCommit)
  if ($isAncestor.ExitCode -ne 0) {
    throw "The expected parent is not an ancestor of the audited commit."
  }

  $aheadCount = Get-GitText -Arguments @("rev-list", "--count", "$ExpectedParent..$ExpectedCommit")
  if ($aheadCount -ne "1") {
    throw "The audited commit is not exactly one commit ahead of its expected parent."
  }
  $behindCount = Get-GitText -Arguments @("rev-list", "--count", "$ExpectedCommit..HEAD")
  if ($behindCount -ne "0") {
    throw "There are additional local commits after the audited commit."
  }

  $status = Get-GitText -Arguments @("status", "--porcelain")
  if ($status.Length -ne 0) {
    throw "The working tree or index is not clean."
  }

  $remoteUrl = Invoke-Git -Arguments @("remote", "get-url", $Remote)
  if ($remoteUrl.ExitCode -ne 0) { throw "Remote '$Remote' does not exist." }

  $remoteRefs = Invoke-Git -Arguments @("ls-remote", "--heads", $Remote, "refs/heads/$RemoteBranch")
  if ($remoteRefs.ExitCode -ne 0) { throw "Unable to read remote branch '$Remote/$RemoteBranch'." }
  $remoteLines = @($remoteRefs.Output | Where-Object { $_ -match "^[0-9a-fA-F]{40}\s+refs/heads/" })
  if ($remoteLines.Count -ne 1) {
    throw "Remote branch '$Remote/$RemoteBranch' was not found exactly once."
  }
  $remoteSha = (($remoteLines[0] -split "\s+")[0]).ToLowerInvariant()
  if ($remoteSha -ne $ExpectedParent) {
    throw "Remote branch '$Remote/$RemoteBranch' is at '$remoteSha', not expected parent '$ExpectedParent'."
  }

  $pushArguments = @("push", "--porcelain", "--no-verify", $Remote, "$($ExpectedCommit):refs/heads/$RemoteBranch")
  $pushResult = Invoke-Git -Arguments $pushArguments
  if ($pushResult.ExitCode -ne 0) {
    throw "git push failed: $($pushResult.Output -join ' ')"
  }

  $remoteAfter = Invoke-Git -Arguments @("ls-remote", "--heads", $Remote, "refs/heads/$RemoteBranch")
  if ($remoteAfter.ExitCode -ne 0) { throw "Unable to verify the remote branch after the push." }
  $remoteAfterLines = @($remoteAfter.Output | Where-Object { $_ -match "^[0-9a-fA-F]{40}\s+refs/heads/" })
  if ($remoteAfterLines.Count -ne 1) {
    throw "Remote branch '$Remote/$RemoteBranch' was not found exactly once after the push."
  }
  $remoteAfterSha = (($remoteAfterLines[0] -split "\s+")[0]).ToLowerInvariant()
  if ($remoteAfterSha -ne $ExpectedCommit) {
    throw "Remote branch '$Remote/$RemoteBranch' is at '$remoteAfterSha' after the push, not '$ExpectedCommit'."
  }

  $headAfter = Get-GitText -Arguments @("rev-parse", "HEAD")
  if ($headAfter -ne $ExpectedCommit) {
    throw "Local HEAD changed during the push."
  }
  $statusAfter = Get-GitText -Arguments @("status", "--porcelain")
  if ($statusAfter.Length -ne 0) {
    throw "The working tree or index is not clean after the push."
  }

  Write-Result -Ok $true -Stage "pushed" -ErrorText "" -Data @{
    branch       = $ExpectedBranch
    remote       = $Remote
    remoteBranch = $RemoteBranch
    parent       = $ExpectedParent
    commit       = $ExpectedCommit
    remoteSha    = $remoteAfterSha
  }
} catch {
  Write-Result -Ok $false -Stage "validation" -ErrorText $_.Exception.Message -Data @{
    branch = $ExpectedBranch
    remote = $Remote
    base   = $ExpectedParent
    commit = $ExpectedCommit
  }
}
