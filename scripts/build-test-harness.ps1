$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$targetDirectory = Join-Path $repoRoot "src-tauri/target/test-harness"
$releaseDirectory = Join-Path $targetDirectory "release"
$builtExecutable = Join-Path $releaseDirectory "merlin.exe"
$harnessExecutable = Join-Path $releaseDirectory "merlin-test-harness.exe"
$harnessDist = Join-Path $repoRoot "dist-harness"
$harnessProofPage = Join-Path $harnessDist "tests/harness/proofs.html"
$previousTauriConfig = $env:TAURI_CONFIG

Push-Location $repoRoot
try {
  & pnpm build:harness:frontend
  if ($LASTEXITCODE -ne 0) {
    throw "Harness frontend build failed with exit code $LASTEXITCODE"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $harnessDist "index.html") -PathType Leaf)) {
    throw "Harness frontend build did not produce index.html"
  }
  if (-not (Test-Path -LiteralPath $harnessProofPage -PathType Leaf)) {
    throw "Harness frontend build did not produce tests/harness/proofs.html"
  }

  $env:CARGO_TARGET_DIR = $targetDirectory
  $env:TAURI_CONFIG = '{"build":{"frontendDist":"../dist-harness"}}'
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
  Write-Output "Harness frontend: $harnessDist"
  Write-Output "SHA256: $hash"
} finally {
  if ($null -eq $previousTauriConfig) {
    Remove-Item Env:TAURI_CONFIG -ErrorAction SilentlyContinue
  } else {
    $env:TAURI_CONFIG = $previousTauriConfig
  }
  Pop-Location
}
