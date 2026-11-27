#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$env:RUSTUP_HOME = Join-Path $repoRoot ".tools/rustup"
$env:CARGO_HOME = Join-Path $repoRoot ".tools/cargo"

$rustBin = "C:\Users\Win8.1\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin"
$pnpmShimDir = Join-Path $env:TEMP "opencode\merlin-pnpm-shim"
$pnpmShim = Join-Path $pnpmShimDir "pnpm.exe"
$vcvars = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

# Import the MSVC environment into this process only when the linker is not already available.
if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
  if (Test-Path -LiteralPath $vcvars) {
    $vsEnvironment = & cmd.exe /d /c "`"$vcvars`" >nul && set"
    if ($LASTEXITCODE -ne 0) {
      throw "vcvars64.bat failed with exit code $LASTEXITCODE"
    }
    foreach ($line in $vsEnvironment) {
      if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        Set-Item -Path "Env:$($matches[1])" -Value $matches[2]
      }
    }
  } else {
    Write-Warning "vcvars64.bat not found; native builds may fail: $vcvars"
  }
}

# Prepend the verified toolchain paths for this process only.
if (Test-Path -LiteralPath $rustBin) {
  $env:PATH = "$rustBin;$env:PATH"
} else {
  Write-Warning "Rust toolchain not found; native builds may fail: $rustBin"
}

if (Test-Path -LiteralPath $pnpmShim) {
  $expectedPnpmHash = "6052300915B4D839772595DC15DD6539333BF2AF440839D1F8C1FFE34C86B4FD"
  $actualPnpmHash = (Get-FileHash -LiteralPath $pnpmShim -Algorithm SHA256).Hash.ToUpperInvariant()
  if ($actualPnpmHash -ne $expectedPnpmHash) {
    throw "Temporary pnpm shim hash mismatch: $actualPnpmHash"
  }
  $env:PATH = "$pnpmShimDir;$env:PATH"
} else {
  Write-Warning "pnpm shim not found; run the manual bootstrap in AGENTS.md: $pnpmShim"
}

if ($args.Count -eq 0) {
  Write-Error "An explicit command is required"
  exit 2
}

$command = $args[0]
$commandArgs = @($args | Select-Object -Skip 1)
& $command @commandArgs
exit $LASTEXITCODE
