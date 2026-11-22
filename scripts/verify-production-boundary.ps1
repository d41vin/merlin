$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$repoRoot = Split-Path -Parent $PSScriptRoot
$productionExecutable = Join-Path $repoRoot "src-tauri/target/release/merlin.exe"
$harnessExecutable = Join-Path $repoRoot "src-tauri/target/test-harness/release/merlin-test-harness.exe"
$bundleDirectory = Join-Path $repoRoot "src-tauri/target/release/bundle"
$currentInstaller = Join-Path $bundleDirectory "nsis/Merlin_0.1.0_x64-setup.exe"
$evidenceDirectory = Join-Path $repoRoot "test-results/production-boundary"
$preBundleEvidencePath = Join-Path $evidenceDirectory "pre-bundle-binary.json"
$forbiddenMarkers = @("MERLIN_TEST_MODE", "MERLIN_TEST_DATA_DIR", "MERLIN_PREFLIGHT_DATA_DIR")
$harnessMarkers = @("MERLIN_TEST_MODE", "MERLIN_TEST_DATA_DIR")
$productionMarker = "MERLIN_PRODUCTION_PACKAGE_V1"

function Require-Condition([bool] $condition, [string] $message) {
  if (-not $condition) {
    throw $message
  }
}

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

function Invoke-NativeCapture([string[]] $nativeArguments) {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & powershell @nativeArguments 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  return @{ output = $output; exitCode = $exitCode }
}

Push-Location $repoRoot
try {
  Require-Condition (Test-Path -LiteralPath $productionExecutable -PathType Leaf) "Production executable is missing; run pnpm tauri build --features custom-protocol,production --no-binary-patching"
  Require-Condition (Test-Path -LiteralPath $harnessExecutable -PathType Leaf) "Optimized harness is missing; run pnpm build:test-harness"
  Require-Condition (Test-Path -LiteralPath $currentInstaller -PathType Leaf) "Current Merlin NSIS installer is missing"
  Require-Condition (Test-Path -LiteralPath $preBundleEvidencePath -PathType Leaf) "Controlled pre-bundle evidence is missing"

  $productionResolver = Invoke-NativeCapture @("-NoProfile", "-File", "scripts/native.ps1", "cargo", "test", "--manifest-path", "src-tauri/Cargo.toml", "--features", "custom-protocol,production", "--test", "database_paths")
  Require-Condition ($productionResolver.exitCode -eq 0) "Production-feature resolver tests failed: $($productionResolver.output)"
  Write-Output "PASS: production-feature resolver tests reject environment redirection and preserve the legacy database"

  $conflict = Invoke-NativeCapture @("-NoProfile", "-File", "scripts/native.ps1", "cargo", "check", "--manifest-path", "src-tauri/Cargo.toml", "--features", "custom-protocol,production,test-harness")
  Require-Condition ($conflict.exitCode -ne 0) "Production/test-harness feature conflict unexpectedly compiled"
  Require-Condition ($conflict.output.Contains("test-harness cannot be enabled in a production build")) "Feature conflict failed for an unexpected reason: $($conflict.output)"
  Write-Output "PASS: production/test-harness feature conflict was rejected at compile time"

  $unauthorizedHarness = Invoke-NativeCapture @("-NoProfile", "-File", "scripts/native.ps1", "cargo", "check", "--manifest-path", "src-tauri/Cargo.toml", "--features", "custom-protocol,test-harness")
  Require-Condition ($unauthorizedHarness.exitCode -ne 0) "Harness compiled without the explicit harness build wrapper"
  Require-Condition ($unauthorizedHarness.output.Contains("test-harness compilation requires the explicit harness build wrapper")) "Unauthorized harness failed for an unexpected reason: $($unauthorizedHarness.output)"
  Write-Output "PASS: direct harness compilation without the authorized wrapper was rejected"

  $incompleteProduction = Invoke-NativeCapture @("-NoProfile", "-File", "scripts/native.ps1", "cargo", "check", "--manifest-path", "src-tauri/Cargo.toml", "--features", "production")
  Require-Condition ($incompleteProduction.exitCode -ne 0) "Production feature compiled without explicit custom-protocol"
  Require-Condition ($incompleteProduction.output.Contains("production builds require the explicit custom-protocol feature")) "Incomplete production feature set failed for an unexpected reason: $($incompleteProduction.output)"
  Write-Output "PASS: production without the explicit custom-protocol feature was rejected"

  $productionScans = @()
  foreach ($marker in $forbiddenMarkers) {
    $found = @(Get-MarkerEncodings $productionExecutable $marker)
    Require-Condition ($found.Count -eq 0) "Production executable contains forbidden marker $marker ($($found -join ', '))"
    $productionScans += [ordered]@{ marker = $marker; encodings = @("ASCII", "UTF-16LE"); found = $false }
  }
  $productionMarkerEncodings = @(Get-MarkerEncodings $productionExecutable $productionMarker)
  Require-Condition ($productionMarkerEncodings.Count -gt 0) "Production executable lacks the production/custom-protocol feature marker"
  Write-Output "PASS: production executable has its required feature marker and no override markers in ASCII or UTF-16LE"

  $harnessScans = @()
  foreach ($marker in $harnessMarkers) {
    $found = @(Get-MarkerEncodings $harnessExecutable $marker)
    Require-Condition ($found.Count -gt 0) "Harness positive control is missing marker $marker"
    $harnessScans += [ordered]@{ marker = $marker; foundIn = $found }
  }
  $harnessProductionMarker = @(Get-MarkerEncodings $harnessExecutable $productionMarker)
  Require-Condition ($harnessProductionMarker.Count -eq 0) "Harness unexpectedly contains the production package marker"
  Write-Output "PASS: optimized harness contains both override markers and no production package marker"

  $productionHash = (Get-FileHash -LiteralPath $productionExecutable -Algorithm SHA256).Hash
  $harnessHash = (Get-FileHash -LiteralPath $harnessExecutable -Algorithm SHA256).Hash
  Require-Condition ($productionHash -ne $harnessHash) "Production and harness executables have identical hashes"
  $preBundleEvidence = Get-Content -LiteralPath $preBundleEvidencePath -Raw | ConvertFrom-Json
  Require-Condition ($preBundleEvidence.path -eq $productionExecutable) "Pre-bundle evidence refers to a different executable"
  Require-Condition ($preBundleEvidence.sha256 -eq $productionHash) "Production executable changed after the controlled pre-bundle check"
  $installer = Get-Item -LiteralPath $currentInstaller
  $evidenceCreatedAt = [DateTime]::Parse($preBundleEvidence.createdAtUtc).ToUniversalTime()
  Require-Condition ($installer.LastWriteTimeUtc -ge $evidenceCreatedAt.AddSeconds(-2)) "Current installer predates the controlled pre-bundle check"
  Write-Output "PASS: current installer was regenerated after the unchanged production executable's pre-bundle verification"

  $misplacedHarness = Join-Path $repoRoot "src-tauri/target/release/merlin-test-harness.exe"
  Require-Condition (-not (Test-Path -LiteralPath $misplacedHarness)) "Harness executable exists in the production target directory"
  $bundleArtifacts = @(Get-ChildItem -LiteralPath $bundleDirectory -Recurse -File)
  Require-Condition ($bundleArtifacts.Count -gt 0) "No production bundle artifacts were found"
  $excludedByName = @($bundleArtifacts | Where-Object { $_.Name -like "*test-harness*" })
  Require-Condition ($excludedByName.Count -eq 0) "A production bundle artifact contains the harness name"
  foreach ($artifact in $bundleArtifacts) {
    $found = @(Get-MarkerEncodings $artifact.FullName "merlin-test-harness.exe")
    Require-Condition ($found.Count -eq 0) "Production bundle artifact $($artifact.FullName) contains the harness executable name"
  }
  Write-Output "PASS: production target and generated bundle artifacts exclude the harness executable"

  $evidence = [ordered]@{
    production = [ordered]@{
      path = $productionExecutable
      bytes = (Get-Item -LiteralPath $productionExecutable).Length
      sha256 = $productionHash
      productionMarkerFoundIn = $productionMarkerEncodings
      markerScans = $productionScans
    }
    harness = [ordered]@{
      path = $harnessExecutable
      bytes = (Get-Item -LiteralPath $harnessExecutable).Length
      sha256 = $harnessHash
      markerScans = $harnessScans
      productionMarkerFound = $false
    }
    compileTimeRejection = [ordered]@{
      productionHarnessConflict = $true
      unauthorizedHarness = $true
      incompleteProductionFeatures = $true
    }
    controlledPackaging = [ordered]@{
      preBundleEvidence = $preBundleEvidencePath
      preBundleSha256MatchesPostBundleExecutable = $true
      installerRecreatedAfterPreBundleCheck = $true
    }
    bundles = @($bundleArtifacts | ForEach-Object {
      [ordered]@{
        path = $_.FullName
        bytes = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        harnessNameFound = $false
      }
    })
  }
  $evidencePath = Join-Path $evidenceDirectory "evidence.json"
  $evidence | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $evidencePath -Encoding UTF8
  Write-Output "Production executable: $productionExecutable"
  Write-Output "Production SHA256: $productionHash"
  Write-Output "Harness executable: $harnessExecutable"
  Write-Output "Harness SHA256: $harnessHash"
  foreach ($artifact in $bundleArtifacts) {
    $hash = (Get-FileHash -LiteralPath $artifact.FullName -Algorithm SHA256).Hash
    Write-Output "Bundle artifact: $($artifact.FullName) ($($artifact.Length) bytes, SHA256 $hash)"
  }
  Write-Output "Evidence: $evidencePath"
} finally {
  Pop-Location
}
