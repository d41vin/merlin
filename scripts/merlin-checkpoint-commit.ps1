#Requires -Version 5.1
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Checkpoint,
  [Parameter(Mandatory = $true)][string]$ExpectedBase,
  [Parameter(Mandatory = $true)][string]$ExpectedBranch,
  [Parameter(Mandatory = $true)][string]$Remote,
  [Parameter(Mandatory = $true)][string]$RemoteBranch,
  [Parameter(Mandatory = $true)][string]$Message,
  [Parameter(Mandatory = $true)][string[]]$AllowedPaths
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$env:GIT_TERMINAL_PROMPT = "0"

$repoRoot = Split-Path -Parent $PSScriptRoot
$operation = "commit"
$stagedPaths = @()
$commitCreated = $false

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

function Get-NulPaths {
  param([string[]]$Arguments)

  $result = Invoke-Git -Arguments $Arguments
  if ($result.ExitCode -ne 0) {
    throw "git $($Arguments -join ' ') failed: $($result.Output -join ' ')"
  }
  $raw = ($result.Output -join "")
  return @($raw -split "`0" | Where-Object { $_ -ne "" })
}

function Normalize-RepoPath {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) { throw "A path is empty." }
  $normalized = $Path.Replace("\", "/").Trim()
  while ($normalized.StartsWith("./")) { $normalized = $normalized.Substring(2) }
  if ($normalized.StartsWith("/")) { throw "Absolute paths are not allowed: $Path" }
  if ($normalized -match "^[A-Za-z]:") { throw "Absolute paths are not allowed: $Path" }
  if ($normalized -match "\*|\?") { throw "Wildcards are not allowed in allowed paths: $Path" }
  $normalized = $normalized.TrimEnd("/")
  if ($normalized.Length -eq 0) { throw "A path is empty." }
  $segments = $normalized -split "/"
  if ($segments -contains "..") { throw "Parent traversal is not allowed: $Path" }
  if ($segments -contains "") { throw "Empty path segment is not allowed: $Path" }
  return $normalized
}

function Test-ProtectedPath {
  param([string]$Path)

  $p = $Path.Replace("\", "/").ToLowerInvariant()
  if ($p -eq "agents.md") { return $true }
  if ($p -eq "docs/decisions.md") { return $true }
  if ($p -eq ".opencode" -or $p.StartsWith(".opencode/")) { return $true }
  if ($p -eq ".git" -or $p.StartsWith(".git/")) { return $true }
  if ($p -like "scripts/merlin-checkpoint-*") { return $true }
  if ($p -match "(^|/)\.env($|\.)") {
    if ($p -match "\.env\.example$") { return $false }
    return $true
  }
  if ($p -match "\.(key|pem|pfx|p12)$") { return $true }
  if ($p -match "(^|/)(auth|credentials|secrets)\.json$") { return $true }
  if ($p -match "(^|/)id_(rsa|ed25519)($|\.)") { return $true }
  return $false
}

function Assert-AllowedPath {
  param([string]$Path, [hashtable]$Allowed)

  if (Test-ProtectedPath -Path $Path) {
    throw "Protected path is not allowed in this checkpoint: $Path"
  }

  $p = $Path.Replace("\", "/")
  foreach ($entry in $Allowed.Keys) {
    if ($Allowed[$entry]) {
      if ($p.StartsWith("$entry/", [System.StringComparison]::OrdinalIgnoreCase)) { return }
    } elseif ($p.Equals($entry, [System.StringComparison]::OrdinalIgnoreCase)) {
      return
    }
  }
  throw "Path is outside the allowed path list: $Path"
}

function Undo-Staging {
  if ($stagedPaths.Count -eq 0) { return }
  $arguments = @("restore", "--staged", "--") + $stagedPaths
  Invoke-Git -Arguments $arguments | Out-Null
  $stagedPaths = @()
}

try {
  if ($Checkpoint -notmatch "^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$") {
    throw "Invalid checkpoint identifier."
  }
  if ($ExpectedBase -notmatch "^[0-9a-fA-F]{40}$") {
    throw "ExpectedBase must be a full 40-character commit SHA."
  }
  $ExpectedBase = $ExpectedBase.ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($Message) -or $Message.Trim().Length -eq 0) {
    throw "A non-empty commit message is required."
  }
  if ($Message.Length -gt 10000) { throw "Commit message is too long." }
  if ($Message.IndexOf([char]0) -ge 0) { throw "Commit message contains an invalid character." }

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
  if ($head -ne $ExpectedBase) {
    throw "Current HEAD '$head' does not match expected base '$ExpectedBase'."
  }

  $baseExists = Invoke-Git -Arguments @("cat-file", "-e", "$ExpectedBase^{commit}")
  if ($baseExists.ExitCode -ne 0) { throw "Expected base is not a commit." }

  foreach ($marker in @("MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "BISECT_LOG")) {
    $markerPath = Get-GitText -Arguments @("rev-parse", "--git-path", $marker)
    if (-not [System.IO.Path]::IsPathRooted($markerPath)) {
      $markerPath = Join-Path $repoRoot $markerPath
    }
    if (Test-Path -LiteralPath $markerPath) {
      throw "A Git operation is in progress ($marker exists)."
    }
  }
  foreach ($marker in @("rebase-merge", "rebase-apply")) {
    $markerPath = Get-GitText -Arguments @("rev-parse", "--git-path", $marker)
    if (-not [System.IO.Path]::IsPathRooted($markerPath)) {
      $markerPath = Join-Path $repoRoot $markerPath
    }
    if (Test-Path -LiteralPath $markerPath) {
      throw "A Git operation is in progress ($marker exists)."
    }
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
  if ($remoteSha -ne $ExpectedBase) {
    throw "Remote branch '$Remote/$RemoteBranch' is at '$remoteSha', not expected base '$ExpectedBase'."
  }

  $cachedPaths = @(Get-NulPaths -Arguments @("diff", "--cached", "--name-only", "-z"))
  if ($cachedPaths.Count -ne 0) {
    throw "The Git index already contains staged changes."
  }

  $allowed = @{}
  foreach ($rawPath in $AllowedPaths) {
    if ([string]::IsNullOrWhiteSpace($rawPath)) { continue }
    foreach ($candidate in ($rawPath -split ";")) {
      $trimmed = $candidate.Trim()
      if ($trimmed.Length -eq 0) { continue }
      $isDirectory = $trimmed.EndsWith("/") -or $trimmed.EndsWith("\")
      $normalized = Normalize-RepoPath -Path $trimmed
      if (Test-ProtectedPath -Path $normalized) {
        throw "The allowed path list includes a protected path: $normalized"
      }
      $allowed[$normalized] = $isDirectory
    }
  }
  if ($allowed.Count -eq 0) { throw "At least one allowed path is required." }

  $modifiedPaths = @(Get-NulPaths -Arguments @("diff", "--name-only", "-z"))
  $untrackedPaths = @(Get-NulPaths -Arguments @("ls-files", "--others", "--exclude-standard", "-z"))
  $changedSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($path in @($modifiedPaths + $untrackedPaths)) {
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    $normalized = Normalize-RepoPath -Path $path
    [void]$changedSet.Add($normalized)
  }
  $changedPaths = @($changedSet | Sort-Object)
  if ($changedPaths.Count -eq 0) { throw "There are no changes to commit." }

  foreach ($path in $changedPaths) {
    Assert-AllowedPath -Path $path -Allowed $allowed
  }

  $stageArguments = @("add", "-A", "--") + $changedPaths
  $stageResult = Invoke-Git -Arguments $stageArguments
  if ($stageResult.ExitCode -ne 0) {
    throw "Staging failed: $($stageResult.Output -join ' ')"
  }
  $stagedPaths = $changedPaths

  $stagedAfter = @(Get-NulPaths -Arguments @("diff", "--cached", "--name-only", "-z") | Sort-Object)
  $expectedStaged = @($changedPaths | Sort-Object)
  if (($stagedAfter -join "`n") -ne ($expectedStaged -join "`n")) {
    Undo-Staging
    throw "The staged paths do not match the validated changed paths."
  }

  $commitArguments = @("-c", "commit.gpgsign=false", "commit", "--no-verify", "-m", $Message)
  $commitResult = Invoke-Git -Arguments $commitArguments
  if ($commitResult.ExitCode -ne 0) {
    Undo-Staging
    throw "git commit failed: $($commitResult.Output -join ' ')"
  }
  $commitCreated = $true
  $stagedPaths = @()

  $newCommit = Get-GitText -Arguments @("rev-parse", "HEAD")
  $newParent = Get-GitText -Arguments @("rev-parse", "HEAD^")
  if ($newParent -ne $ExpectedBase) {
    throw "New commit parent '$newParent' does not match expected base '$ExpectedBase'."
  }

  $commitPaths = @(Get-NulPaths -Arguments @("diff-tree", "--no-commit-id", "--name-only", "-r", "-z", $newCommit) | Sort-Object)
  if (($commitPaths -join "`n") -ne ($expectedStaged -join "`n")) {
    throw "The committed paths do not match the validated changed paths."
  }

  $commitMessage = Get-GitText -Arguments @("log", "-1", "--format=%B", $newCommit)
  if ($commitMessage.TrimEnd() -ne $Message.TrimEnd()) {
    throw "The committed message does not match the supplied message."
  }

  $statusAfter = Get-GitText -Arguments @("status", "--porcelain")
  if ($statusAfter.Length -ne 0) {
    throw "The working tree or index is not clean after the commit."
  }

  Write-Result -Ok $true -Stage "committed" -ErrorText "" -Data @{
    branch       = $ExpectedBranch
    remote       = $Remote
    remoteBranch = $RemoteBranch
    base         = $ExpectedBase
    commit       = $newCommit
    parent       = $newParent
    paths        = $changedPaths
    message      = $Message
  }
} catch {
  if (-not $commitCreated) {
    try { Undo-Staging } catch { }
  }
  $stage = "validation"
  if ($commitCreated) { $stage = "post-commit" }
  Write-Result -Ok $false -Stage $stage -ErrorText $_.Exception.Message -Data @{
    branch = $ExpectedBranch
    remote = $Remote
    base   = $ExpectedBase
  }
}

