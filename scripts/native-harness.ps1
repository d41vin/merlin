$ErrorActionPreference = "Stop"

if ($args.Count -eq 0) {
  Write-Error "An explicit native harness command is required"
  exit 2
}

$env:MERLIN_TEST_HARNESS_BUILD = "1"
& $PSScriptRoot/native.ps1 @args
exit $LASTEXITCODE
