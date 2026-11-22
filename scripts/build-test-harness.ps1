$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$targetDirectory = Join-Path $repoRoot "src-tauri/target/test-harness"
$releaseDirectory = Join-Path $targetDirectory "release"
$builtExecutable = Join-Path $releaseDirectory "merlin.exe"
$harnessExecutable = Join-Path $releaseDirectory "merlin-test-harness.exe"

Push-Location $repoRoot
try {
  & pnpm build
  if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed with exit code $LASTEXITCODE"
  }

  $env:CARGO_TARGET_DIR = $targetDirectory
  if (Test-Path -LiteralPath $harnessExecutable) {
    Remove-Item -LiteralPath $harnessExecutable -Force
  }

  & powershell -NoProfile -File scripts/native-harness.ps1 cargo build --manifest-path src-tauri/Cargo.toml --release --features custom-protocol,test-harness
  if ($LASTEXITCODE -ne 0) {
    throw "Optimized test-harness build failed with exit code $LASTEXITCODE"
  }
  if (-not (Test-Path -LiteralPath $builtExecutable -PathType Leaf)) {
    throw "Cargo did not produce the expected optimized harness executable"
  }

  Move-Item -LiteralPath $builtExecutable -Destination $harnessExecutable -Force
  $hash = (Get-FileHash -LiteralPath $harnessExecutable -Algorithm SHA256).Hash
  Write-Output "Optimized test harness: $harnessExecutable"
  Write-Output "SHA256: $hash"
} finally {
  Pop-Location
}
