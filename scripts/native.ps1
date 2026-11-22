$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$env:RUSTUP_HOME = Join-Path $repoRoot ".tools/rustup"
$env:CARGO_HOME = Join-Path $repoRoot ".tools/cargo"

if ($args.Count -eq 0) {
  Write-Error "An explicit native command is required"
  exit 2
}
$command = $args[0]
$commandArgs = @($args | Select-Object -Skip 1)
& $command @commandArgs
exit $LASTEXITCODE
