# Instructions for coding agents

## Mission

Build Merlin according to the product and engineering contracts in `docs/`. These documents are the source of truth. Do not invent product features or silently simplify safety-critical behavior.

Before implementation:
1. Read `README.md`.
2. Read `docs/PRD.md`, `docs/UX-SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/DOCS-AND-VAULT.md`, `docs/SECURITY.md`, `docs/UI-STACK.md`, `docs/DESIGN-SYSTEM.md`, `docs/design-tokens.md`, and `docs/IMPLEMENTATION-PLAN.md`.
3. Inspect the actual repository and installed package versions.
4. Report conflicts, missing decisions, and technical risks before changing architecture.

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

Do not invent test commands before the scaffold and actual tooling exist. Do not claim a test passed unless it was actually run. Report skipped tests and environmental limitations explicitly.

## Windows Verification Environment

Merlin's native verification commands require a process-scoped Windows toolchain environment. The default shell does not reliably resolve pnpm, Cargo, rustc, or the MSVC linker on this machine. The following procedure was verified against the actual installed tools on 2026-11-27. Treat it as the authoritative local bootstrap until the machine or the pinned toolchain changes.

Do not put credentials, tokens, or secret values in this file or in verification logs.

### Verified baseline

| Component | Verified value |
| --- | --- |
| OS | Windows 11 |
| Node.js | `v24.22.1` |
| npm | `12.2.1` |
| OpenCode | `v2.2.5` |
| pnpm | `12.15.0` |
| Cargo | `1.97.1 (c980f4866 2026-06-30)` |
| rustc | `1.97.1 (8bab26f4f 2026-07-14)` |
| rustfmt | `1.9.0-stable` |
| Clippy | `0.1.97` |
| MSVC compiler | `cl.exe` 19.44.35229 for x64 |
| MSVC linker | `link.exe` 14.44.35229.0 |
| Windows SDK | `10.0.22621.0` (`rc.exe`/`mt.exe` 10.0.22621.5040) |
| WebView2 runtime | `158.0.4370.33`, with `msedgewebview2.exe` present |

The repository-local Rust toolchain directory `.tools/rustup` is incomplete: its Cargo and rustc executables are absent. The global stable Rust 1.97.1 toolchain at the path below is complete and is used process-scoped. The zero-byte shims under `C:\Users\Win8.1\.cargo\bin` are not usable. Do not treat either condition as a source-code failure.

### Exact paths

```text
Repository root:        C:\dev\merlin
Node.js:                C:\Program Files\nodejs\node.exe
pnpm script:            C:\Program Files\nodejs\pnpm.cmd (points to a missing pnpm.exe)
pnpm native binary:     C:\Program Files\nodejs\node_modules\pnpm\node_modules\@pnpm\exe.win32-x64\pnpm.exe
Rust toolchain:         C:\Users\Win8.1\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin
MSVC vcvars64:          C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat
Repository Cargo home:  C:\dev\merlin\.tools\cargo
Repository Rustup home: C:\dev\merlin\.tools\rustup
Temporary pnpm shim:    %TEMP%\opencode\merlin-pnpm-shim\pnpm.exe
Temporary work area:    %TEMP%\opencode
```

### Process-scoped bootstrap

Run this in each PowerShell process that needs native verification. It creates a temporary, byte-identical pnpm shim, imports the MSVC environment from `vcvars64.bat`, sets the repository-local Cargo/Rustup homes, and prepends the shim and the complete stable Rust toolchain to `PATH`.

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

Supported invocation in a fresh PowerShell process:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { <paste the function above>; Initialize-MerlinVerificationEnvironment; Set-Location C:\dev\merlin; pnpm typecheck }"
```

For repeated work, save the function in a temporary helper under `%TEMP%\opencode`, dot-source it in each new process, call `Initialize-MerlinVerificationEnvironment`, and then run one command. The helper is not repository content and must not be committed.

### Environment checks

Run these after the bootstrap. They are read-only.

```powershell
node --version
npm --version
pnpm --version
cargo --version
rustc --version
rustfmt --version
cargo clippy --version
cmd.exe /d /c "cl.exe 2>&1"
cmd.exe /d /c "link.exe 2>&1"
where.exe rc.exe
where.exe mt.exe
(Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}').pv
Test-Path 'C:\Program Files (x86)\Microsoft\EdgeWebView\Application\158.0.4370.33\msedgewebview2.exe'
```

Expected results are the values in the verified-baseline table. `cl.exe` and `link.exe` write their banners to standard error; on Windows PowerShell 5.1 with `$ErrorActionPreference = 'Stop'`, capture them through `cmd.exe /d /c "... 2>&1"` or `Start-Process` redirection rather than a direct `2>&1` pipeline.

### Commands that require the bootstrapped environment

Use the bootstrapped environment for every command that resolves pnpm, Cargo, rustc, rustfmt, Clippy, MSVC, the Windows SDK, Tauri, or WebView2, including:

- `pnpm install` and any `pnpm` script.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:themes`, `pnpm test:frontend`.
- `pnpm test:rust`, `pnpm test:rust:harness`, `pnpm lint:rust`, `pnpm lint:rust:harness`, `pnpm format:rust`.
- `pnpm build`, `pnpm build:test-harness`, `pnpm tauri ...`, `pnpm verify:production-boundary`.
- `pnpm test:e2e` and `pnpm test:webview2` when they need the browser/runtime environment.
- Any direct `cargo`, `rustc`, `rustfmt`, `cl`, `link`, `rc`, or `mt` invocation.

Frontend-only commands may run without MSVC, but use the same bootstrap for consistency so results are comparable.

### Fresh subshells

Every OpenCode `shell` call is a new process. Environment changes do not persist between calls. Re-run the bootstrap in each new PowerShell process, or wrap the entire command in one `powershell -NoProfile ... -Command` invocation that includes the bootstrap. Do not assume `$env:PATH`, `CARGO_HOME`, `RUSTUP_HOME`, or the MSVC environment from a previous call is still present.

### Hosted CI verification

GitHub CLI (`gh`) is not installed on this machine, so hosted CI cannot currently be queried locally. Agents must not install `gh` or any other software without product-owner authorization. When hosted CI cannot be checked independently, report it as unverified; do not infer success from an earlier run.

### Shell invocation discipline

OpenCode checks each scanner-produced subcommand against the agent's shell allowlist. A compound command containing any unapproved subcommand is denied as a whole. Run one command per shell call. Do not combine commands with `;`, `&&`, `||`, pipes, `echo` separators, or `cd`. Use the shell tool's `workdir` instead of changing directories. If a command is denied, split it into separate calls; do not attempt to route around the permission layer with a script, alias, encoded command, or alternate shell.

### Missing toolchain components

When a required path, executable, or component is missing:

- For a missing `pnpm.exe`, the documented process-scoped shim is the only permitted workaround. It must be created under `%TEMP%\opencode\merlin-pnpm-shim`, verified against the expected SHA-256, and used only in the current process. If the source native binary is also missing, stop and report.
- For a missing or damaged Rust toolchain, MSVC component, Windows SDK component, Node.js installation, or WebView2 runtime, stop and report. Do not install, update, repair, re-register, or replace it.
- For a missing repository file or toolchain directory, report it. Do not infer that the user deleted it and do not recreate it from an unverified source.

### Machine-wide changes are prohibited

Do not modify machine-wide or user-wide `PATH`, environment variables, installations, toolchain configuration, registry settings, or security settings to repair a process-level problem. Do not copy binaries into `C:\Program Files\nodejs`, `C:\Users\Win8.1\.cargo\bin`, or the global Rust toolchain. Do not run `pnpm setup:rust`, `rustup` install/update commands, Visual Studio Installer repairs, Node installers, or WebView2 installers as an agent repair action. A genuine machine repair requires explicit product-owner authorization and its own evidence record.

### Undocumented failures

If the verified procedure above does not work, or if a new environment failure appears, stop and report the exact command, exit code, complete error, and the state of the paths above. Do not experiment with PATH ordering, environment overrides, temporary binaries, registry changes, or alternate toolchains to "make it work." An undocumented repair is not verification.

## Change discipline

- Keep changes scoped to the current implementation phase.
- Do not add future/parked features opportunistically.
- Update the relevant documentation and `docs/DECISIONS.md` when a material decision changes.
- Prefer small, reviewable commits.
- Do not delete or overwrite existing project files without inspecting them first.

## Build status and handoff

- Keep root `BUILD-STATUS.md` current at every phase completion, before every handoff, and whenever resuming an interrupted session.
- Record actual verification commands and outcomes, unexecuted tests, failures, blockers, approved decisions, and the exact next authorized task.
- Never mark work complete merely because code exists; every relevant documented verification gate must pass.
- Check `BUILD-STATUS.md` before resuming work. Do not advance beyond its exact authorization.

## commits

- Use conventional atomic commit message(s). Include appropriate description if needed.