$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$repoRoot = Split-Path -Parent $PSScriptRoot
$productionExecutable = Join-Path $repoRoot "src-tauri/target/release/merlin.exe"
$currentInstaller = Join-Path $repoRoot "src-tauri/target/release/bundle/nsis/Merlin_0.1.0_x64-setup.exe"
$evidenceDirectory = Join-Path $repoRoot "test-results/production-boundary"
$evidencePath = Join-Path $evidenceDirectory "pre-bundle-binary.json"
$forbiddenMarkers = @("MERLIN_TEST_MODE", "MERLIN_TEST_DATA_DIR", "MERLIN_PREFLIGHT_DATA_DIR")
$productionMarker = "MERLIN_PRODUCTION_PACKAGE_V1"

function Get-MarkerEncodings([string] $path, [string] $marker) {
  $bytes = [System.IO.File]::ReadAllBytes($path)
  $encodings = @()
  if ([System.Text.Encoding]::ASCII.GetString($bytes).Contains($marker)) {
    $encodings += "ASCII"
  }
  if ([System.Text.Encoding]::Unicode.GetString($bytes).Contains($marker)) {
    $encodings += "UTF-16LE"
  }
  return $encodings
}

if (-not (Test-Path -LiteralPath $productionExecutable -PathType Leaf)) {
  throw "Production executable is missing before bundling"
}
foreach ($marker in $forbiddenMarkers) {
  $found = @(Get-MarkerEncodings $productionExecutable $marker)
  if ($found.Count -ne 0) {
    throw "Refusing to bundle an executable containing test override marker $marker ($($found -join ', '))"
  }
}
$productionMarkerEncodings = @(Get-MarkerEncodings $productionExecutable $productionMarker)
if ($productionMarkerEncodings.Count -eq 0) {
  throw "Refusing to bundle an executable without the explicit production/custom-protocol feature marker"
}

New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null
$evidence = [ordered]@{
  createdAtUtc = [DateTime]::UtcNow.ToString("o")
  path = $productionExecutable
  bytes = (Get-Item -LiteralPath $productionExecutable).Length
  sha256 = (Get-FileHash -LiteralPath $productionExecutable -Algorithm SHA256).Hash
  productionMarkerFoundIn = $productionMarkerEncodings
  forbiddenMarkersFound = @()
}
$evidence | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $evidencePath -Encoding UTF8

if (Test-Path -LiteralPath $currentInstaller) {
  Remove-Item -LiteralPath $currentInstaller -Force
}
Write-Output "Production pre-bundle binary verified; stale current installer removed: $currentInstaller"
Write-Output "Production SHA256: $($evidence.sha256)"
