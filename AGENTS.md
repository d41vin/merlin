# Instructions for coding agents

## Mission

Build Merlin according to the product and engineering contracts in `docs/`. These documents are the source of truth. Do not invent product features or silently simplify safety-critical behavior.

Before implementation:

1. Read `README.md`.
2. Read `docs/PRD.md`, `docs/UX-SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/DOCS-AND-VAULT.md`, `docs/SECURITY.md`, `docs/UI-STACK.md`, `docs/DESIGN-SYSTEM.md`, `docs/design-tokens.md`, and `docs/IMPLEMENTATION-PLAN.md`.
3. Inspect the actual repository and installed package versions.
4. Report conflicts, missing decisions, and technical risks before changing architecture.

## How work happens

- One primary coding agent (`merlin`) implements, verifies, and commits. It is the default agent.
- The product owner defines the outcome and accepts each milestone. Acceptance is never inferred from code existing.
- `explore` and `merlin-auditor` are optional read-only support. They are not approval stages.
- Local commits are allowed at verified slice boundaries. Pushing requires explicit product-owner authorization.
- Every claim that a command passed must include the exact command, exit code, and relevant result in the same report.
- Keep `BUILD-STATUS.md` current using `Now`, `Next`, `Blocked`, and `Last verified`.

## Non-negotiable engineering rules

- Local-first. No required account, cloud service, telemetry endpoint, or external database.
- Do not put API keys, passwords, or other secrets in SQLite, Markdown, logs, crash reports, or source control.
- API secrets belong in Windows Credential Manager. SQLite stores only non-secret metadata and a credential reference.
- Never silently overwrite user documents or resolve a two-sided sync conflict by choosing a side.
- Never interpret an unavailable repository or missing file as proof that the user deleted it.
- Use atomic writes for important file operations.
- Do not collect document contents in the Usage Journal.
- No keystroke, clipboard, screenshot, or external-app surveillance.
- No unrestricted shell execution. Custom actions must use validated, explicit action types and arguments.
- Unknown usage/balance is not zero.
- Do not claim that a resource was consumed merely because it was allocated to a project.
- Do not create fake project activity from opening a project or launching an application.
- Avoid background polling. Prefer event-driven watchers and reconciliation at startup/resume.
- Preserve recoverability for destructive actions.

## UI and interaction rules

- Follow `docs/DESIGN-SYSTEM.md` and `docs/design-tokens.md`.
- Components consume semantic tokens only. Never hardcode theme-specific hex colors, font families, radii, shadows, or border widths in component styles.
- Keep the three theme layers separate: hue primitives, semantic tokens, component styles.
- Theme selection is not a v1 feature. Ship Merlin Dark only, but implement the theme contract so additional bundled themes can be added without rewriting components.
- Use UI SDK for complex interaction behavior where specified; use shadcn/Base UI for standard visual components; use native HTML/CSS for simple elements.
- Do not let two libraries own the same interaction primitive.
- Keep layouts compact and data-dense without making long-form Markdown uncomfortable to read.
- Respect keyboard navigation, visible focus, accessible names, and reduced-motion preferences.
- No decorative gradients, glows, or gratuitous shadows.

## UI SDK

- Use the packaged `ui-sdk` coding-agent skill for UI SDK work. Its approval and `.agents/skills` link are repository-local through `pnpm-workspace.yaml`; the generated `pnpm-*` link is ignored and recreated by pnpm. This tooling skill does not authorize the deferred UI SDK Agent Bridge or other product agent features.

Use exact pinned versions of `@ui-sdk/react` and `@ui-sdk/core`. Before implementing a UI SDK behavior:

- Read the installed package documentation, especially `node_modules/@ui-sdk/react/docs/llms.txt` when present.
- Inspect the installed API and examples; do not rely on memory of beta APIs.
- Add behavior tests for keyboard, focus, collapse/restore, and layout persistence where relevant.
- Persist panel layout in Merlin settings/SQLite, not browser localStorage.
- Keep application business logic and persistence outside the UI SDK behavior layer.

## Docs editor and synchronization

- Markdown files are the source of truth for repo-backed Docs.
- Preserve frontmatter, code fences, Mermaid, tables, task lists, HTML/MDX, and unsupported syntax.
- Treat project document source as untrusted. Preservation does not permit HTML, MDX, scripts, links, or embedded content to execute or gain Tauri capabilities; follow `docs/SECURITY.md` and `docs/DOCS-AND-VAULT.md` for the rendering and recovery contracts.
- Add round-trip tests before relying on editor import/export.
- Never use a lossy editor conversion as an excuse to rewrite source files.
- Follow `docs/DOCS-AND-VAULT.md` for conflict handling and recovery.

## Testing expectations

Every phase must meet the verification outcomes in `docs/IMPLEMENTATION-PLAN.md`. At minimum, where relevant to the phase:

- Typecheck and lint.
- Unit tests for domain logic.
- Integration tests for SQLite repositories and Tauri commands.
- File-sync tests using temporary directories and simulated failures.
- Security tests for the relevant trust boundary.
- Theme contrast validation for every bundled theme.
- Accessibility tests for interactive controls.
- Build verification on Windows 11.

Do not invent test commands before the scaffold and actual tooling exist. Do not claim a test passed unless it was actually run. Report skipped tests and environmental limitations explicitly, with the exact command and result.

## Windows verification environment

Merlin's native verification commands require a process-scoped Windows toolchain environment. The default shell does not reliably resolve pnpm, Cargo, rustc, or the MSVC linker on this machine.

Use the existing entry point for every native or verification command:

```powershell
powershell -NoProfile -File scripts/native.ps1 <command>
```

For example:

```powershell
powershell -NoProfile -File scripts/native.ps1 pnpm typecheck
powershell -NoProfile -File scripts/native.ps1 pnpm test:rust
powershell -NoProfile -File scripts/native.ps1 cargo --version
```

`scripts/native.ps1` sets the repository-local Cargo/Rustup homes, prepends the complete stable Rust toolchain and the verified pnpm shim to `PATH` for the child process, imports the MSVC environment when needed, and runs the command. It does not change machine-wide settings.

### Verified baseline

| Component        | Verified value                  |
| ---------------- | ------------------------------- |
| OS               | Windows 11                      |
| Node.js          | `v24.22.1`                      |
| npm              | `12.2.1`                        |
| pnpm             | `12.15.0`                       |
| Cargo            | `1.97.1 (c980f4866 2026-06-30)` |
| rustc            | `1.97.1 (8bab26f4f 2026-07-14)` |
| rustfmt          | `1.9.0-stable`                  |
| Clippy           | `0.1.97`                        |
| MSVC compiler    | `cl.exe` 19.44.35229 for x64    |
| MSVC linker      | `link.exe` 14.44.35229.0        |
| Windows SDK      | `10.0.22621.0`                  |
| WebView2 runtime | `158.0.4370.33`                 |

The repository-local Rust toolchain directory `.tools/rustup` is incomplete: its Cargo and rustc executables are absent. The global stable Rust 1.97.1 toolchain at the path below is complete and is used process-scoped. The zero-byte shims under `C:\Users\Win8.1\.cargo\bin` are not usable. Do not treat either condition as a source-code failure.

### Exact paths

```text
Repository root:        C:\dev\merlin
Node.js:                C:\Program Files\nodejs\node.exe
pnpm native binary:     C:\Program Files\nodejs\node_modules\pnpm\node_modules\@pnpm\exe.win32-x64\pnpm.exe
Rust toolchain:         C:\Users\Win8.1\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin
MSVC vcvars64:          C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat
Repository Cargo home:  C:\dev\merlin\.tools\cargo
Repository Rustup home: C:\dev\merlin\.tools\rustup
Temporary pnpm shim:    %TEMP%\opencode\merlin-pnpm-shim\pnpm.exe
Temporary work area:    %TEMP%\opencode
```

### Manual bootstrap fallback

If `scripts/native.ps1` cannot establish the environment, run this in the current PowerShell process:

```powershell
function Initialize-MerlinVerificationEnvironment {
  $repoRoot = 'C:\dev\merlin'
  $vcvars = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat'
  $rustBin = 'C:\Users\Win8.1\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin'
  $pnpmSource = 'C:\Program Files\nodejs\node_modules\pnpm\node_modules\@pnpm\exe.win32-x64\pnpm.exe'
  $pnpmShimDir = Join-Path $env:TEMP 'opencode\merlin-pnpm-shim'
  $pnpmShim = Join-Path $pnpmShimDir 'pnpm.exe'
  $expectedPnpmHash = '6052300915B4D839772595DC15DD6539333BF2AF440839D1F8C1FFE34C86B4FD'

  foreach ($required in @($vcvars, $rustBin, $pnpmSource)) {
    if (-not (Test-Path -LiteralPath $required)) {
      throw "Missing required verification path: $required"
    }
  }

  New-Item -ItemType Directory -Force -Path $pnpmShimDir | Out-Null
  if (-not (Test-Path -LiteralPath $pnpmShim)) {
    Copy-Item -LiteralPath $pnpmSource -Destination $pnpmShim
  }
  $actualPnpmHash = (Get-FileHash -LiteralPath $pnpmShim -Algorithm SHA256).Hash.ToUpperInvariant()
  if ($actualPnpmHash -ne $expectedPnpmHash) {
    throw "Temporary pnpm shim hash mismatch: $actualPnpmHash"
  }

  $vsEnvironment = & cmd.exe /d /c "`"$vcvars`" >nul && set"
  if ($LASTEXITCODE -ne 0) {
    throw "vcvars64.bat failed with exit code $LASTEXITCODE"
  }
  foreach ($line in $vsEnvironment) {
    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      Set-Item -Path "Env:$($matches[1])" -Value $matches[2]
    }
  }

  $env:CARGO_HOME = Join-Path $repoRoot '.tools\cargo'
  $env:RUSTUP_HOME = Join-Path $repoRoot '.tools\rustup'
  $env:PATH = "$pnpmShimDir;$rustBin;$env:PATH"
  $env:GIT_TERMINAL_PROMPT = '0'
}
```

### Environment checks

After the bootstrap, these are read-only:

```powershell
node --version
pnpm --version
cargo --version
rustc --version
rustfmt --version
cargo clippy --version
```

The expected results are the values in the verified-baseline table. `cl.exe` and `link.exe` write their banners to standard error; on Windows PowerShell 5.1 with `$ErrorActionPreference = 'Stop'`, capture them through `cmd.exe /d /c "... 2>&1"` or `Start-Process` redirection rather than a direct `2>&1` pipeline.

### Fresh subshells

Every shell call is a new process. Environment changes do not persist between calls. Use `scripts/native.ps1` for each native command, or wrap the entire command in one `powershell -NoProfile ... -Command` invocation that includes the bootstrap.

### Hosted CI verification

GitHub CLI (`gh`) is not installed on this machine, so hosted CI cannot currently be queried locally. Do not install `gh` or any other software without product-owner authorization. When hosted CI cannot be checked independently, report it as unverified; do not infer success from an earlier run.

### Shell discipline

Run one command per shell call. Use the shell tool's `workdir` instead of changing directories. If a command is denied, split it into separate calls; do not attempt to route around the permission layer with a script, alias, encoded command, or alternate shell.

### Missing toolchain components

When a required path, executable, or component is missing:

- For a missing `pnpm.exe`, use `scripts/native.ps1` or the documented process-scoped shim. If the source native binary is also missing, stop and report.
- For a missing or damaged Rust toolchain, MSVC component, Windows SDK component, Node.js installation, or WebView2 runtime, stop and report. Do not install, update, repair, re-register, or replace it.

### Machine-wide changes

Do not modify machine-wide or user-wide `PATH`, environment variables, installations, toolchain configuration, registry settings, or security settings to repair a process-level problem. A genuine machine repair requires explicit product-owner authorization and its own evidence record. Do not run `pnpm setup:rust`, `rustup` install/update commands, Visual Studio Installer repairs, Node installers, or WebView2 installers as an agent repair action.

### Undocumented failures

If the documented procedure does not work, stop and report the exact command, exit code, complete error, and the state of the paths above. Do not experiment with PATH ordering, environment overrides, temporary binaries, registry changes, or alternate toolchains.

## Change discipline

- Keep changes scoped to the current implementation slice.
- Do not add future or parked features opportunistically.
- Update the relevant documentation and `docs/DECISIONS.md` when a material decision changes.
- Prefer small, reviewable commits.
- Do not delete or overwrite existing project files without inspecting them first.

## Build status and handoff

- Keep root `BUILD-STATUS.md` current at every slice boundary and before every handoff.
- Use `Now`, `Next`, `Blocked`, and `Last verified`, with exact commands, dates, and results.
- Check `BUILD-STATUS.md` before resuming work. Do not advance beyond its exact authorization.
- Never mark work complete merely because code exists; the documented verification gates must pass.

## Commits

- Use conventional atomic commit messages with an appropriate description.
- Local commits are allowed after a verified slice.
- Do not push without explicit product-owner authorization.
- Stage explicit paths; never use `git add -A` or indiscriminate staging.
