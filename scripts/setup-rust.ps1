$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$env:RUSTUP_HOME = Join-Path $repoRoot ".tools/rustup"
$env:CARGO_HOME = Join-Path $repoRoot ".tools/cargo"

# Keep compiler components and Cargo's registry/cache inside this repository.
rustup toolchain install 1.97.1-x86_64-pc-windows-msvc `
  --profile minimal `
  --component rustfmt,clippy `
  --no-self-update
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
