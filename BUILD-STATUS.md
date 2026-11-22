# Merlin Build Status

Last updated: 2026-11-23

## Current phase and exact authorization

- **Current phase:** Phase 1 — Application shell and foundation, **Milestone 2: Production settings foundation**.
- **Exact task authorized:** The user accepted Milestone 2 and authorized its separate Milestone 2-only commit and final status-file hygiene amendment on 2026-11-23. The amended commit retains parent `2e55e7232c12b1e86a415f0e33d1a88a7dd1a1c7`. Do not push or begin Milestone 3; no further implementation or commit is currently authorized.
- **Phase 0 baseline:** Commit `28d91919f83fae1ad4b47731693f9b5012473639` exists and the repository was clean when Phase 1 planning completed. Phase 0 passed its approved technical-preflight scope, subject to the offline and trusted-renderer syntax-class-provenance limitations retained below. Its proofs are not completed product workflows.
- **Milestone 1 status:** **Accepted and committed by the user-authorized checkpoint** as `2e55e7232c12b1e86a415f0e33d1a88a7dd1a1c7` (`feat: establish Merlin production foundation`). Implementation, automated verification, and the separately authorized packaging verification follow-up passed. The React presentation remains the Phase 0 proof shell until the separately authorized shell milestones; Overview, Projects, Resources, and other product workflows remain unimplemented.
- **Milestone 2 status:** **Accepted and committed** (`feat: establish persistent application settings`). The amended commit retains the accepted Milestone 1 parent. The approved V2 migration, production settings boundary, frontend startup integration, real WebView2 persistence proofs, and final commit hygiene passed. The source-level audit found no required corrections. The final commit contains exactly the 26 reviewed text files, and the working tree and index are clean.
- **Stop boundary:** Milestone 2 implementation, its authorized commit, and the final status-file hygiene amendment are complete. **Do not push and do not begin Milestone 3.**

## Phase 1 approved decisions

- Production Tauri identity is `com.merlin.desktop`, the product/window title is Merlin, the executable is `merlin.exe`, and the normal database is `<app_data_dir>/merlin.sqlite3`. Existing `preflight.sqlite3` files must remain untouched.
- Production packaging uses an explicit `custom-protocol,production` feature set and must fail if `test-harness` is also enabled; `--all-features` is not a production packaging path. The test-only database override exists only behind the compile-time `test-harness` feature. Harness compilation requires an explicit wrapper, release harnesses reject the normal target directory, and the Tauri pre-bundle hook requires a production-only feature marker while rejecting override markers. The single-NSIS production command uses `--no-binary-patching` so post-build verification can compare the unchanged raw executable hash with controlled pre-bundle evidence.
- The optimized harness uses a separate Cargo target directory and the distinct executable `merlin-test-harness.exe`. It must not enter the normal production bundle. Production binary marker absence, harness positive control, feature-conflict rejection, and package exclusion are required verification gates.
- Harness overrides additionally require `MERLIN_TEST_MODE=1` and a validated absolute `MERLIN_TEST_DATA_DIR`. The directory is canonicalized and validated before database creation/opening, and the final database file must remain inside it. Normal production resolver tests must prove environment variables cannot redirect storage.
- Approved future-workbench defaults are Docs 35%, Todos 30%, Activity 20%, Resources 15%, with open minima 20%, 20%, 12%, and 12%. This records the approved contract only; layout/product changes belong to later separately authorized milestones.
- Milestone 2 persists exactly `app.theme_slug.v1`, `app.density.v1`, and `app.accessibility.force_reduced_motion.v1`. Its repository writes only individual allowlisted keys. Missing, malformed, wrong-type, or unsupported individual values recover non-destructively with per-field defaults and `usedDefaults=true`; actual database/migration failures remain errors. False reduced motion follows the operating system and true forces reduction without overriding an operating-system request. Only `settings_get`, `settings_set_theme`, `settings_set_density`, and `settings_set_reduce_motion` are added; all validation errors must be content-free, including Serde/Tauri failures. Browser reads may use defaults, browser writes report unavailable native persistence, and browser storage remains prohibited.

## Phase 0 handoff summary

- **Recommendation:** **Accepted PASS for the approved technical-preflight scope, with explicit offline and syntax-class-provenance limitations.** The NSIS install/launch/uninstall lifecycle passed. The installed application also reloaded successfully with WebView2 network emulation forced offline, but a cold process launch with operating-system networking disabled was not verified and is not marked as passed. The final hygiene review separately identified an unresolved trusted-renderer syntax-class provenance mismatch; the executed hostile-document non-execution proofs remain valid, but that broader contract is not marked as passed. This is not a claim that Merlin product features exist.
- **Outstanding final-review limitations:** Cold installed-process launch with the host machine actually disconnected from networking remains unverified. Raw-HTML `code` elements may retain allowlisted `language-*` classes, so the security contract's trusted-renderer-owned syntax-class provenance remains unresolved and is a hard gate before production Docs. No script execution was observed from this provenance mismatch. Environmental warnings and other intentionally unexecuted checks are listed below rather than hidden.

## Approved architectural and technical decisions

- Windows 11, Node.js 24.22.1, pnpm 12.15.0, TypeScript 6.0.3, and Rust 1.97.1 are the verified Phase 0 baseline.
- One root application package with `src/` and `src-tauri/`; no pnpm monorepo.
- `@ui-sdk/react` and `@ui-sdk/core` 0.1.0-beta.13 passed the required real WebView2 interaction and SQLite restart-persistence proofs. D-038 is now accepted for Phase 0.
- The optional packaged `ui-sdk` coding-agent skill is approved repository-locally under D-046. `pnpm-workspace.yaml` grants only `@ui-sdk/core` skill permission and sets `skills.dirs` to `.agents/skills`; the generated version-matching skill symlink is ignored. This has no runtime or Phase 1 requirement and does not authorize the deferred product Agent Bridge.
- Layout persistence uses controlled UI SDK state, `onLayoutCommit`, and only `preflight_get_layout` / `preflight_save_layout`. `autoSaveId`, browser storage adapters, and `localStorage` are not used.
- rusqlite 0.41.0 uses bundled SQLite; refinery 0.10.0 provides the tested migration path.
- NSIS is the generated and install/launch/uninstall-runtime-verified initial package target. MSI remains undecided and was not a Phase 0 blocker. Offline evidence is limited to WebView2 network-offline emulation on reload, not an OS-disconnected cold start.
- Milkdown is conditional for full Docs. Rich editing is permitted only for sources with an exact measured round trip; unsupported or drifting source uses inert/source fallback. D-009 records this constraint.
- `rehype-raw` 7.0.0 parses raw HTML before the explicit sanitizer and controlled React renderer (D-045). It does not execute MDX or fetch Markdown/images remotely.
- Repository-local Rust tooling keeps the exact approved compiler and Cargo cache under ignored `.tools/`. This avoids the damaged global rustup installation without substituting another compiler.
- See `docs/DECISIONS.md` for D-001–D-046 and the remaining product-phase validations.

## Completed Phase 0 work

- Created the minimal React 19/Vite 8/Tailwind 4/shadcn Base UI/Tauri 2 proof shell and Merlin Dark semantic-token theme. This shell is explicitly labeled as technical preflight, not a product screen.
- Installed only the selected direct npm/crate dependencies and generated reviewed `pnpm-lock.yaml` and `Cargo.lock` files.
- Added the controlled four-panel UI SDK proof (`docs`, `todos`, `activity`, `resources`) with pointer/keyboard resize, named focusable handles, collapse/restore, focus removal, reset, and SQLite persistence.
- Added real Milkdown editor probes, byte-exact preservation checks, fail-closed source fallback, sanitized document rendering, inert Mermaid code output, strict URL policy, disabled task inputs, and no fetchable document images.
- Added migrated SQLite settings, durable sync-operation records, recursive watcher hints, confined paths, hashes, same-directory staging/snapshots, Windows replacement, interruption recovery, and repository-context pauses.
- Added strict HTTPS/direct-process validation with no shell-string executor and no general filesystem/process Tauri command.
- Added synthetic Windows Credential Manager and current-user DPAPI/AES-256-GCM proofs with zeroization and no plaintext fallback.
- Added unit, integration, browser, accessibility, security, native, production, and packaging tests; generated a local application icon and verified the production executable and NSIS artifact.
- Updated setup/reference documentation and this persistent handoff record.

## Environment and dependency verification

| Command or inspection | Actual result |
| --- | --- |
| `node --version` | PASS — v24.22.1. |
| `pnpm --version` | PASS — 12.15.0. |
| Windows/MSVC/SDK/WebView2 inventory | PASS — Windows 11 Pro build 26300 x64; MSVC 14.44.35207, Windows SDK 10.0.22621.0, and WebView2 available. |
| Initial global `rustc --version` / `cargo --version` | PASS at initial inventory — 1.97.1 MSVC. Later overlapping rustup operations damaged that global installation; it is not used by project commands. |
| `pnpm setup:rust` | PASS — repository-local Rust 1.97.1 with rustfmt and Clippy installed under `.tools/`; all native commands use this exact toolchain. |
| `pnpm install` | PASS on longer-timeout rerun — generated `pnpm-lock.yaml`. The first one-second background attempt was interrupted with exit 143 and was not counted as success. |
| `pnpm install --frozen-lockfile` | PASS on original verification and all final handoff reruns — lockfile up to date; resolution skipped. `.npmrc` enables `engine-strict`, `strict-peer-dependencies`, exact saves, and disabled automatic peer installation; no engine/peer replacement was needed. One rerun warned `Agent skills awaiting approval: @ui-sdk/core`; after investigation and explicit user approval, D-046 granted repository-local skill permission and the final frozen rerun completed without that warning. |
| Pnpm approval investigation | PASS — pnpm 12.15.0 discovered `skills/ui-sdk/SKILL.md` published by the direct `@ui-sdk/core` dependency and held it in `pendingSkills`; `pendingBuilds` was empty. The package has no consumer `preinstall`, `install`, `postinstall`, or `prepare` hook and its lock snapshot has no `requiresBuild`. The skill is Markdown guidance for selecting UI behaviors, building interfaces/components, agent-readiness, and testing keyboard/focus/ARIA behavior. It is not required by resizable runtime imports or either phase contract. |
| `pnpm approve @ui-sdk/core` / `pnpm permissions list` | **PASS** — explicit user-approved repo-local tooling change only. `pnpm-workspace.yaml` records `permissions['@ui-sdk/core'].skills: true` and `skills.dirs: [.agents/skills]`; permissions list reports granted with no pending skills. `.agents/skills/pnpm-@ui-sdk+core-ui-sdk` is an ignored symlink to the exact installed beta.13 package skill and OpenCode discovered it. No global skill directory, dependency build, or product Agent Bridge was enabled. |
| `pnpm list --depth=0` | PASS — all 42 direct packages resolve at their exact declared versions. |
| `pnpm list --depth=Infinity --json` | PASS — complete installed graph captured in ignored `test-results/pnpm-graph.json` for review. |
| `pnpm audit --prod` | PASS — npm reported `No known vulnerabilities found`. No equivalent Rust vulnerability-audit claim is made. |
| `pnpm shadcn add button --dry-run --diff --yes` | PASS after configuration correction — `base-nova` resolves the installed shadcn 4.23.0 Base UI registry. The final diff shows only intentional Merlin token/lint customizations; no file was overwritten by the dry run. |
| `cargo tree --manifest-path src-tauri/Cargo.toml --locked --depth 1` | PASS — direct crates match approved exact pins, including tauri 2.12.7, tauri-build 2.7.6, rusqlite 0.41.0, refinery 0.10.0, keyring 4.2.0, notify 9.0.0, windows 0.62.2, aes-gcm 0.11.1, and tempfile 3.27.0 (dev only). |
| `cargo metadata --manifest-path src-tauri/Cargo.toml --locked --format-version 1 [--no-deps on original run; full graph on final review]` | PASS — locked manifest/features/targets and the complete locked dependency graph resolve without updating the lockfile. |
| `cargo check --manifest-path src-tauri/Cargo.toml --locked --all-targets` | PASS — final handoff rerun completed in 11.64 seconds with the reviewed lockfile. |
| Lockfile presence/integrity | PASS — `pnpm-lock.yaml` (204,689 bytes; SHA-256 `49652E1036BF08E0B7C589576965524ED3036673E4E6E831552E9C3CC84F8562`) and `src-tauri/Cargo.lock` (134,842 bytes; SHA-256 `210B855CF95EF85472A08BF4C5396FBD9D67E8F6578D3BC566E98EFF7715C8F4`) are present. Frozen pnpm installation and locked Cargo resolution/checks succeeded. |

## Milestone 1 implementation and verification

### Implemented scope

- Renamed the native package/library and production-facing error/database types to Merlin application names while preserving proof IPC names, credential namespaces, V1 migration history, sync behavior, and all existing assertions.
- Set production identity to `com.merlin.desktop`, product/window title to Merlin, executable to `merlin.exe`, and database filename to `merlin.sqlite3`. A fixture proves `preflight.sqlite3` is not discovered or modified. No V2 migration or settings repository was added.
- Production path resolution has no environment lookup. Harness-only resolution requires `MERLIN_TEST_MODE=1`, rejects missing/relative/traversal inputs, canonicalizes the approved directory before opening SQLite, confines the final database file, and rejects an escaping database symlink. The symlink assertion now fails instead of silently passing if its fixture cannot be created.
- Cargo rejects conflicting/incomplete features, release builds without an explicit build kind, unauthorized harness compilation, and release harnesses outside the separate target. The Tauri pre-bundle hook requires `MERLIN_PRODUCTION_PACKAGE_V1`, rejects all legacy/current override markers, records the raw hash, and removes a stale current installer.
- WebView2 modes are now `development-harness` and `optimized-harness`; every prior interaction, IPC, persistence, security, accessibility, and console assertion remains. Synthetic data is confined to ignored `test-results/webview2/` artifacts.

### Final commands and outcomes

| Command/check | Actual result |
| --- | --- |
| `pnpm format:check` | **PASS** — Prettier-managed files and `cargo fmt --check` passed. |
| `pnpm typecheck` | **PASS** — application and Node TypeScript configurations passed. |
| `pnpm lint` | **PASS** — ESLint zero warnings; Clippy all targets with `-D warnings` passed in default and `test-harness` configurations through the approved wrappers. |
| `pnpm test` | **PASS** — 6 Vitest files/21 tests; 24 default-feature Rust tests; 27 harness-feature Rust tests; 50 Merlin Dark contrast pairings. Both database-path suites included the untouched-legacy fixture; the harness escaping-symlink assertion executed and passed. |
| `pnpm test:e2e` | **PASS** — all 3 Chromium tests passed in 20.1 seconds, preserving pointer/keyboard/focus/layout, DPR, Markdown/security, axe, and request assertions. |
| `pnpm tauri build --features custom-protocol,production --no-binary-patching` | **PASS** — explicit production-feature release completed; pre-bundle marker/override checks passed; current Merlin NSIS bundle generated without post-hook binary patching. |
| `pnpm build:test-harness` | **PASS** — Vite build and direct optimized Cargo build with `custom-protocol,test-harness` completed in 11m55s under the separate target; resulting executable was renamed to `merlin-test-harness.exe` and not bundled. |
| `pnpm verify:production-boundary` | **PASS** — actual production-feature resolver tests passed; conflicting features, unauthorized harness compilation, and incomplete production features were rejected; ASCII and UTF-16LE production scans found no `MERLIN_TEST_MODE`, `MERLIN_TEST_DATA_DIR`, or `MERLIN_PREFLIGHT_DATA_DIR`; harness positive controls found both current override markers and no production marker; raw hashes differed; pre-/post-bundle production hash matched; regenerated bundle/target excluded the distinct harness name. |
| Direct `pnpm tauri build --features custom-protocol,test-harness` negative gate | **EXPECTED FAILURE / PASS** — exit code 1 with the explicit harness-wrapper rejection. The production executable and installer hashes were checked before/after and remained unchanged. |
| Direct `pnpm tauri build` negative gate | **EXPECTED FAILURE / PASS** — exit code 1 requiring an explicit release build kind. Existing production executable and installer hashes remained unchanged. |
| `pnpm test:webview2` | **PASS** — 2 real WebView2 tests in 1.4 minutes: development-harness interaction/SQLite restart and all hostile-document/accessibility assertions (1.2m), followed by optimized-harness packaged assets/IPC/restart/current-scale checks (5.8s). Neither test used the production executable. |
| PowerShell AST parse probe for `assert-production-binary.ps1`, `build-test-harness.ps1`, `native-harness.ps1`, and `verify-production-boundary.ps1` | **PASS** — zero parser errors on Windows PowerShell 5.1. The verifier also executed its expected-native-failure capture successfully. |
| `git diff --check` | **PASS** — no whitespace errors. Git continues to report its normal LF-to-CRLF working-copy warnings on edited tracked files. |
| Complete diff and untracked-file inspection | **PASS** — all modified/new files were inspected. No later-milestone product workflow, dependency installation, migration change, staging, commit, push, or history mutation occurred. |

Ignored structured evidence is at `test-results/production-boundary/evidence.json` and `test-results/production-boundary/pre-bundle-binary.json`.

### Produced artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `src-tauri/target/release/merlin.exe` | 12,502,016 bytes | `75F77D45AAF4FE3C7FBC0BC444E8668195617B7F774F0E4A0C7C71A91C95655B` |
| `src-tauri/target/release/bundle/nsis/Merlin_0.1.0_x64-setup.exe` | 3,339,202 bytes | `3F8BBB774AEE56D93CA8F26ED282B521621AE3334830F37F8A51EBF44A6F792C` |
| `src-tauri/target/test-harness/release/merlin-test-harness.exe` | 12,504,064 bytes | `46383537808FEA3A2FC3C374C948993ABD75A111F8EA262A7D188A91BDF1AD65` |

The old ignored `Merlin Preflight_0.1.0_x64-setup.exe` remains as Phase 0 historical output and was not presented as the current bundle. Its retained bytes/hash match the earlier record. The harness path exists only under `target/test-harness/`, not in the production target or generated bundle.

### Corrections during Milestone 1

- Initial targeted test compilation exposed an environment-helper nested `Option`, a missing `Debug` bound in a negative assertion, and a Clippy flagged needless lifetime. These test-only errors were fixed before the final gates; final results above contain no failed or ignored tests.
- Focused review found that Tauri's automatic dependency-level custom-protocol behavior bypassed a local-only guard, and that Windows PowerShell 5.1 could terminate expected-native-error capture. Cargo build-script enforcement, an explicit harness wrapper/target check, a production-only pre-bundle marker, and nonterminating stderr capture were added and subsequently passed.
- The first explicit production build succeeded but reported Tauri binary patching after the pre-bundle hash. That intermediate artifact was superseded by the final `--no-binary-patching` build so the controlled raw hash remains unchanged through packaging. Final artifact hashes above are from the superseding build only.

### Milestone 1 limitations and unexecuted checks

- The initial independent-archive/install-lifecycle limitation was closed by the packaging follow-up below: the current NSIS artifact was independently extracted, its application payload matched the reviewed binary byte-for-byte, and isolated install/launch/uninstall checks passed. Authenticode/signing behavior remains unverified. The follow-up used a guarded same-user application-data junction and isolated WebView2 profile, not a separate Windows account, VM, or Windows Sandbox.
- Before the packaging follow-up, synthetic WebView2 restart tests deliberately used only separately identifiable harnesses. The follow-up subsequently launched the installed production executable for packaged-shell, console, production-path, override-immunity, and legacy-preservation verification without enabling or adding any production override.
- Hosted CI was not run; all listed results are local Windows 11 executions. No manual screen-reader pass or changed physical display scaling was performed. Existing Phase 0 offline, syntax-class-provenance, junction/race, signing, and other limitations remain unchanged.
- No claim of full Phase 1 completion or product readiness is made. Milestones 2–6 and their acceptance/CI gates remain outstanding.

## Milestone 1 packaging verification follow-up

### Isolation and safety controls

- The available environment reported current user `HP\Win8.1`, non-elevated PowerShell, Windows `ProductName=Windows 10 Pro`, `DisplayVersion=26H2`, and build `26300`. `WindowsSandbox.exe` and `WindowsSandboxClient.exe` were unavailable. A separate sandbox/OS-user environment was therefore not available without changing machine configuration or credentials.
- The executed alternative was an isolated **same-user test profile**: repository-local installation at `C:\dev\merlin\test-results\milestone1-installer-followup\install`, an isolated WebView2 profile under `test-results/milestone1-installer-followup/webview2-profile`, and a guarded roaming application-data junction. This is not presented as a separate Windows account, VM, or sandbox.
- Preflight checks proved no existing Merlin uninstall registrations, checked shortcuts, installation directory, running Merlin process, or `%APPDATA%\com.merlin.desktop`. The existing empty `%LOCALAPPDATA%\com.merlin.desktop` directory had zero children and remained unchanged.
- The test created `%APPDATA%\com.merlin.desktop` only as a junction to `C:\dev\merlin\test-results\milestone1-installer-followup\isolated-app-data`, after proving the roaming path absent. A synthetic `preflight.sqlite3` sentinel was placed only in that isolated physical target. The junction was removed after uninstall; the real roaming database/legacy paths are absent again, and the isolated evidence remains under ignored `test-results/`.
- The installed production process received `MERLIN_TEST_MODE=1`, `MERLIN_TEST_DATA_DIR=<test-root>\decoy-current`, and `MERLIN_PREFLIGHT_DATA_DIR=<test-root>\decoy-legacy`. Neither decoy was created, proving the packaged production binary did not honor either override. No test-harness executable or harness feature was used for this launch.

### Exact verification commands and results

| Command/action | Actual result |
| --- | --- |
| `& 'C:\Program Files\7-Zip\7z.exe' l -slt 'C:\dev\merlin\src-tauri\target\release\bundle\nsis\Merlin_0.1.0_x64-setup.exe'` | **PASS** — 7-Zip 24.09 independently identified `Type=Nsis`, `SubType=NSIS-3 Unicode BadCmd=13`, physical size 3,339,202 bytes, and listed the application plus six plugin/support payloads. Complete output: `test-results/milestone1-installer-followup/nsis-listing.txt`. |
| `& 'C:\Program Files\7-Zip\7z.exe' x -y '-oC:\dev\merlin\test-results\milestone1-installer-followup\extracted' 'C:\dev\merlin\src-tauri\target\release\bundle\nsis\Merlin_0.1.0_x64-setup.exe'` | **PASS** — `Everything is Ok`; seven files/12,607,870 uncompressed bytes were extracted without executing the installer. Log: `nsis-extraction.txt`. |
| `Get-FileHash` and ASCII/UTF-16LE scans of extracted `merlin.exe` | **PASS** — extracted executable is byte-identical to raw/installed production `merlin.exe`; `MERLIN_TEST_MODE`, `MERLIN_TEST_DATA_DIR`, and `MERLIN_PREFLIGHT_DATA_DIR` are absent; `MERLIN_PRODUCTION_PACKAGE_V1` is present. No harness executable was present in the archive. |
| Guarded `New-Item -ItemType Junction -Path "$env:APPDATA\com.merlin.desktop" -Target 'C:\dev\merlin\test-results\milestone1-installer-followup\isolated-app-data'` | **PASS** — created the intended isolated redirection only after the absent-path guard passed. Database creation/opening therefore used the standard logical production location but an isolated physical target. |
| `$process = Start-Process -FilePath $installer -ArgumentList @('/S',"/D=$installRoot") -Wait -PassThru` with `$installer` set to the above NSIS path and `$installRoot='C:\dev\merlin\test-results\milestone1-installer-followup\install'` | **PASS** — installer exit code 0. Installed contents were exactly `merlin.exe` (12,502,016 bytes) and `uninstall.exe` (79,449 bytes). No harness/preflight executable was installed. Installation evidence: `installed-evidence.json`. |
| Installed identity and shortcut inspection | **PASS** — binary `FileDescription=Merlin`, `ProductName=Merlin`, `CompanyName=merlin`, `FileVersion=ProductVersion=0.1.0`; HKCU uninstall `DisplayName=Merlin`, `DisplayVersion=0.1.0`, `Publisher=merlin`, and the expected isolated `InstallLocation`/`UninstallString`. `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Merlin.lnk` targeted the isolated installed `merlin.exe` with the isolated installation as its working directory. |
| `node --check test-results/milestone1-installer-followup/verify-installed.mjs` | **PASS** — installed-application runtime helper syntax passed. The exact helper remains in ignored evidence storage. |
| `node test-results/milestone1-installer-followup/verify-installed.mjs` | **PASS** — installed `merlin.exe` loaded `http://tauri.localhost/`, document title Merlin, the current Merlin-native proof shell surface, `SQLite layout ready`, typed Tauri IPC, and `Layout saved to SQLite`; Docs collapsed and persisted, browser `localStorage.length=0`, and captured console errors were `[]`. This is the current proof shell, not a claim that later product navigation exists. |
| Runtime production-path and legacy assertions in the same helper | **PASS** — logical `%APPDATA%\com.merlin.desktop\merlin.sqlite3` resolved to the isolated physical database; its signature was `SQLite format 3\0`. Saving changed the SQLite WAL SHA-256 from `08DB347358DB79D7EB17AD341083E8EBFB378E615E965C91D400DB8B5721AA1C` to `BD647B9E8D22D84F8B3240EEDCF8BD4B0E56390A089904451C9FE7AE315F4BAA`. Both decoy directories stayed absent. Logical/physical `preflight.sqlite3` sentinel bytes and hash remained unchanged. Full evidence: `installed-runtime-evidence.json`. |
| `$process = Start-Process -FilePath 'C:\dev\merlin\test-results\milestone1-installer-followup\install\uninstall.exe' -ArgumentList @('/S') -Wait -PassThru` | **PASS** — uninstaller exit code 0. The installation directory, HKCU `Uninstall\Merlin` registration, and current/all-users checked Merlin shortcut locations were absent afterward. No Merlin-named uninstall registrations remained. |
| `[IO.Directory]::Delete($appDataLink, $false)` and final path checks | **PASS** — removed only the verified application-data junction non-recursively. `%APPDATA%\com.merlin.desktop` and real roaming `merlin.sqlite3`/`preflight.sqlite3` paths are absent. Isolated database evidence remained intact, and the legacy sentinel hash was still identical. Local application-data child count remained zero. Full evidence: `cleanup-evidence.json`. |

The first cleanup attempt used `Remove-Item -LiteralPath $appDataLink -Force`. Uninstall and artifact cleanup had already succeeded, but PowerShell attempted an interactive directory-junction confirmation and failed in non-interactive mode before removing the link. The verified non-recursive `[IO.Directory]::Delete(..., $false)` correction then succeeded without deleting the isolated target. Neither attempt modified the sentinel or real database paths because the guard revalidated the junction first.

### Packaging follow-up hashes and retained evidence

| Artifact/evidence | Size | SHA-256 |
| --- | ---: | --- |
| Current `Merlin_0.1.0_x64-setup.exe` | 3,339,202 bytes | `3F8BBB774AEE56D93CA8F26ED282B521621AE3334830F37F8A51EBF44A6F792C` |
| Extracted/raw/installed `merlin.exe` | 12,502,016 bytes | `75F77D45AAF4FE3C7FBC0BC444E8668195617B7F774F0E4A0C7C71A91C95655B` |
| Isolated post-launch main SQLite file | 4,096 bytes at runtime | `89A2318C76452BE80E1D743F163F3DD96623B2B05604AA06985C6B5501238362` |
| Synthetic legacy sentinel before and after | Unchanged | `281C934C7E897CB04113F12FBC21681039D1BF0709090FD9A1F6D309680B6731` |

All seven extracted payload hashes and binary-version identity are retained in `test-results/milestone1-installer-followup/nsis-payload-hashes-and-identity.json`. Baseline, installation, runtime, and cleanup JSON evidence plus NSIS logs and the runtime helper are retained under the same ignored directory.

### Packaging follow-up limitations and change discipline

- The isolation was a same-user repository-local profile plus guarded junction, not a separate Windows user or VM. No claim is made about multi-user installer behavior, elevated/all-users installation, code signing, Authenticode, SmartScreen, upgrade behavior, or a cold launch with OS networking disabled. Shell/console/path checks were automated; no separate manual visual review was performed.
- No product source or configuration file was changed during this follow-up. Only `BUILD-STATUS.md` and ignored `test-results/milestone1-installer-followup/` tooling/evidence were written. No dependency was installed, no security assertion was weakened, and no staging, commit, push, or history mutation occurred.

## Milestone 2 implementation and verification

### Implemented scope

- Added `V2__production_application_settings.sql` without changing V1. Refinery applies V2 through the existing startup lifecycle and seeds exactly `app.theme_slug.v1` = `"merlin-dark"`, `app.density.v1` = `"default"`, and `app.accessibility.force_reduced_motion.v1` = `false` with `ON CONFLICT(key) DO NOTHING`. Existing application values, layout rows, credential-reference proof rows, sync metadata, schema, timestamps, and V1 migration history are preserved. `git hash-object` and `git rev-parse HEAD:...` both identify the unchanged V1 blob as `848e3b3747a821f013724aee47a9dd91faf729ac`.
- Added the crate-private `db/settings.rs` repository. It selects only the three approved keys and writes one parameterized allowlisted key at a time; no snapshot/table replacement or renderer-provided key exists.
- Added the typed settings service and serializable version-1 snapshot (`themeSlug`, `density`, `forceReducedMotion`, `usedDefaults`). Each missing, malformed, wrong-type, or unsupported field independently receives its safe default without rewriting stored bytes. Explicit valid updates repair only their own key. Operational database failures remain `database` errors.
- Added exactly `settings_get`, `settings_set_theme`, `settings_set_density`, and `settings_set_reduce_motion`. String and boolean IPC input deserializers replace Serde errors with fixed messages before service validation. Rejected secret-like and SQL-shaped values remain absent from error values and SQLite. Existing preflight layout commands, capabilities, CSP, database resolver, and proof-only APIs remain unchanged.
- Frontend startup still applies Merlin Dark synchronously, then validates native snapshots before applying `data-theme`, `data-density`, and `data-force-reduced-motion`. False forced motion leaves the operating-system media query in control; true applies the additional reduction selectors. Browser-only reads use defaults, browser-only writes report unavailable native persistence, and no browser storage was added.
- Added strict frontend model/transport/application tests and real development/optimized WebView2 IPC/restart assertions. The WebView2 suite also proves rejected IPC values are absent from captured console and native process logs. No settings screen, theme picker, navigation, or other product UI was introduced.
- Added `cargo:rerun-if-changed=migrations` so newly appended migrations are reliably embedded on subsequent Cargo builds. The pre-existing layout migration test now expects two recorded migrations; all its layout persistence and malformed-layout assertions remain intact.

### Final commands and outcomes

| Command/check | Actual result |
| --- | --- |
| `pnpm exec vitest run src/settings` | **PASS** — 3 focused files, 9 tests. |
| `powershell -NoProfile -File scripts/native.ps1 cargo test --manifest-path src-tauri/Cargo.toml --locked --test settings_db` | **PASS** — 9 migration/repository/service/command-boundary tests, including real Refinery V1 upgrade, complete V1 history preservation, idempotence, independent layout rows, corruption recovery, restart persistence, and content-free errors. |
| `powershell -NoProfile -File scripts/native-harness.ps1 cargo test --manifest-path src-tauri/Cargo.toml --locked --features test-harness --test settings_db` | **PASS** — same 9 settings tests under the harness feature. |
| `powershell -NoProfile -File scripts/native.ps1 cargo test --manifest-path src-tauri/Cargo.toml --locked --test layout_db --test settings_db` | **PASS after final history-strength edit** — 3 layout and 9 settings tests passed together. |
| `pnpm format:check` | **PASS** — all Prettier-managed files and Rust formatting passed. |
| `pnpm typecheck` | **PASS** — application and Node TypeScript configurations passed. |
| `pnpm lint` | **PASS** — ESLint zero warnings; Clippy `-D warnings` passed for default/all-target and harness/all-target builds. |
| `pnpm test` | **PASS on final complete rerun** — 9 Vitest files/30 tests; 33 default-feature Rust tests; 36 harness-feature Rust tests; 50 Merlin Dark contrast pairings. No failed, ignored, or skipped tests. |
| `pnpm test:e2e` | **PASS** — all 3 Chromium tests passed in 1.3 minutes, including browser settings defaults, layout interaction, accessibility, Markdown/security, DPR, and no-localStorage assertions. |
| `pnpm build` | **PASS** — Vite production build. The non-failing large-chunk advisory remains: main JS 1,019.91 kB (313.31 kB gzip). |
| `pnpm build:test-harness` | **PASS** — Vite build and separately targeted optimized `custom-protocol,test-harness` release completed in 1 minute 48 seconds; executable retained only as `merlin-test-harness.exe`. |
| `pnpm tauri build --features custom-protocol,production --no-binary-patching` | **PASS** — production release completed in 3 minutes 27 seconds, production pre-bundle marker/override checks passed, and the current Merlin NSIS installer was generated without binary patching. |
| `pnpm verify:production-boundary` | **PASS** — production resolver tests, conflicting-feature rejection, unauthorized/incomplete build rejection, ASCII/UTF-16LE override-marker scans, unchanged pre-/post-bundle hash, harness positive controls, distinct binaries, and package/target harness exclusion all passed. |
| `pnpm test:webview2` | **PASS** — 2 real WebView2 tests in 4.3 minutes: development-harness settings IPC, content-free rejected inputs, native restart, layout and hostile-document/accessibility coverage (4.1 minutes), and optimized-harness packaged settings/layout restart persistence (10.8 seconds). No production executable or production data directory was used. |
| Complete tracked/untracked diff and `git diff --check` | **PASS** — all changed/new files were inspected; no whitespace errors, dependencies, lockfile changes, capability expansion, or later-milestone workflow appeared. Normal Git LF-to-CRLF working-copy warnings remain. |
| Final pre-commit `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `git diff --check`, and `git diff --cached --check` | **PASS on 2026-11-23** — all commands succeeded after the acceptance/commit-authorization documentation update. |
| Final intended-file secret scan | **PASS** — no dedicated repository scanner or installed scanning executable was present, so an explicit 26-file content scan checked private-key blocks, provider tokens, JWTs, and secret assignments. Only the five reviewed synthetic test-canary occurrences matched; no real secrets were found. |
| Final amended-commit scope, parent, and clean-state verification | **PASS** — the amended commit contains exactly the approved 26 files, its parent is `2e55e7232c12b1e86a415f0e33d1a88a7dd1a1c7`, and both the working tree and index are clean. |

All final verification outcomes above are local Windows 11 executions. Focused tests intentionally failed before V2 existed; the final complete suite supersedes those expected red-to-green development runs.

### Produced artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `src-tauri/target/release/merlin.exe` | 12,564,480 bytes | `95621EEBEE860810A10F08325BF263881D1AA6CC8EDD309B3F164D31E6782247` |
| `src-tauri/target/release/bundle/nsis/Merlin_0.1.0_x64-setup.exe` | 3,353,240 bytes | `59F8D6BAA6A4A77B3CF343B8923A0EE05A8EFBF63B8CB6E1EF4E7C8EBAA0549F` |
| `src-tauri/target/test-harness/release/merlin-test-harness.exe` | 12,562,432 bytes | `C7A389C9FB5B1EC9918DD2A8A7437736DF934E2C151F40C1A6B258E525504229` |

Updated structured production-boundary evidence remains under ignored `test-results/production-boundary/`; isolated WebView2 synthetic data and logs remain under ignored `test-results/webview2/`.

### Corrections during Milestone 2

- The newly appended V2 file was not initially re-embedded because Cargo did not track directory additions through the existing build script. Adding the narrow migration-directory rerun directive corrected the build-invalidation issue; migration compatibility tests then passed without changing V1 or the migration runner.
- Initial Clippy review flagged one elidable test-support/service lifetime; it was removed and final default/harness lint passed.
- The first complete native run correctly exposed the pre-existing layout test's hard-coded one-migration expectation. Only that schema-version expectation changed from one to two; targeted and complete layout/settings reruns passed.
- Iterative corruption-case fixtures initially left an earlier case's invalid density in place while checking unrelated fields. The test now restores a valid baseline before each injection, preserving the intended per-field assertion without changing production recovery behavior.
- No production architecture, approved setting, command name, security policy, or packaging safeguard was changed to resolve these implementation/test issues.

### Milestone 2 limitations and unexecuted checks

- Milestone 2 is implemented, locally verified, **user-accepted, and committed**. Final scope, hygiene, staged-diff, amended-commit, and clean-state checks passed; no push or Milestone 3 work is authorized.
- Production packaging and binary boundary checks passed, but no new installed-production settings launch/persistence run, installer install/uninstall lifecycle, signing/SmartScreen check, upgrade test, separate-user/VM run, or OS-disconnected cold launch was performed. Settings IPC/persistence ran only in isolated development and optimized harnesses plus native tests.
- Non-destructive recovery covers individual setting values. It does not recover an entirely corrupt SQLite file, missing settings table, migration failure, power loss, or real crash; those remain errors or previously documented durability limitations.
- Density is persisted and exposed on the root for later product surfaces; no product controls consume it yet. Forced reduced motion supplements the existing proof-shell media query. No settings screen or picker exists.
- Filesystem/recovery is not applicable to the new behavior because shared filesystem infrastructure did not change. Existing filesystem proofs passed in the full native suites.
- Hosted CI was not run and no CI workflow was added. No manual screen-reader narration or changed physical display scale was performed. Existing Phase 0 and Milestone 1 limitations, including syntax-class provenance and offline cold-launch limits, remain unchanged.

## Phase 0 final verification commands and outcomes

The following historical commands completed during Phase 0 after its implementation fixes. They are retained as baseline evidence, not presented as Milestone 1 results. Separate earlier failures are retained in the next section.

| Command | Actual result |
| --- | --- |
| `pnpm format:check` | **PASS** — all Prettier-managed files and all Rust sources passed `cargo fmt --check`. |
| `pnpm typecheck` | **PASS** — TypeScript application and Node configurations passed. |
| `pnpm lint` | **PASS** — ESLint passed with zero warnings; Clippy passed all targets with `-D warnings`. |
| `pnpm test` | **PASS** — Vitest: 6 files, 21 tests; Rust: 22 tests; Merlin Dark: 50 declared contrast pairings. |
| `cargo test --manifest-path src-tauri/Cargo.toml --locked --no-fail-fast` | **PASS** — same 22 native tests with the reviewed lockfile, including doc-test discovery; zero failed. |
| `cargo test ... --test filesystem_path_watcher existing_symlink_escape_is_rejected_when_the_os_permits_the_fixture -- --nocapture` | **PASS** — executed with no skip message; an escaping symlink was rejected. |
| `cargo test ... --test launch_validation direct_launch_proof_runs_only_a_harmless_system_executable -- --nocapture` | **PASS** — executed with no skip message; typed direct launch ran the harmless system `whoami.exe` without a shell. |
| `pnpm test:e2e` | **PASS** — 3 Chromium tests: pointer/keyboard/focus/collapse/reset + axe; 100/125/150/200% emulated DPR hairline checks; Milkdown/source/renderer security + axe + zero remote example.com requests. |
| `pnpm test:webview2` | **PASS** — 2 real WebView2 tests: development interaction/SQLite native-process restart + direct hostile HTML/MDX non-execution, blocked-image, zero remote-request, Mermaid-inertness, axe, and no-console-error assertions; optimized production executable launch, packaged `tauri.localhost` assets, typed IPC, restart persistence, current-scale hairline check, and no console errors. |
| `pnpm build` | **PASS** — production Vite build completed. Non-failing warning: main JS chunk is 1,017.88 kB (312.83 kB gzip), above the 500 kB advisory threshold. |
| `pnpm tauri icon src-tauri/icon-source.svg` | **PASS** — generated the required local Windows icon and standard Tauri icon set. |
| `pnpm tauri build` | **PASS** — optimized Rust release completed in 9m39s; application built at `src-tauri/target/release/merlin-preflight.exe`; NSIS 3.13 bundling succeeded. |
| Produced NSIS artifact — generation only | PASS — `src-tauri/target/release/bundle/nsis/Merlin Preflight_0.1.0_x64-setup.exe`, 3,339,146 bytes; SHA-256 `737D94D9710AB7E93E35E9741C3FE6DED862F636B0C67F081B83FB5706085BAA`. This row does not by itself prove installer execution. |
| Silent NSIS installer execution | **PASS** — executed that exact installer with `/S` and a repository-local `/D=` destination under ignored `test-results/installer-review/install`; exit code 0. It produced `merlin-preflight.exe` and `uninstall.exe`, the expected HKCU `Merlin Preflight` uninstall entry (version 0.1.0), and a current-user Start Menu shortcut. No previous Merlin installation or uninstall entry existed before the test. |
| Installed application launch | **PASS** — cold-launched the installed executable, not the raw release executable. With an isolated WebView2 profile and synthetic SQLite directory, packaged `tauri.localhost` assets, all 10 fixture proofs, typed native IPC, layout saving to SQLite, and zero console errors or external requests passed. |
| Installed WebView2 offline reload | **PASS only for WebView2 network-offline emulation** — CDP `Network.emulateNetworkConditions` was set to `offline: true`; a complete packaged-page reload, all 10 fixture proofs, typed SQLite IPC readiness, and restoration of the collapsed synthetic layout passed with zero console errors or external requests. This proves packaged functionality without renderer networking after startup, not a disconnected cold process start. |
| OS/network-disconnected installed cold launch | **UNVERIFIED** — the machine's physical/network-adapter state was not changed and no firewall sandbox was created. Final isolation review found a non-elevated shell; the available `New-NetFirewallRule` control would require elevation, no usable Windows Sandbox command was found, and disabling adapters or blocking shared WebView2 processes would risk unrelated applications. No safe practical isolated cold-start test was established, so the stronger requirement remains open. Do not count the preceding emulated offline reload as proof. |
| Silent NSIS uninstaller execution | **PASS** — executed the installed `uninstall.exe /S`; exit code 0. The custom installation directory, HKCU uninstall entry, and current-user Start Menu shortcut were all absent afterward. Only the separate synthetic verification data/evidence under ignored `test-results/` was retained. |
| Production executable WebView2 launch | PASS — actual optimized binary was launched in an isolated profile/data directory; packaged assets and both typed SQLite commands worked before and after process restart. |
| `GetDpiForSystem` | PASS — actual Windows environment is 96 DPI (100%). The real WebView2 hairline check passed at that scale; other DPRs were Chromium emulation, not physical display changes. |
| `git diff --check` | **PASS after final hygiene cleanup** — exit code 0. Only the two understood trailing spaces on the pre-existing `AGENTS.md` commit-instruction lines were removed; their wording and all other content were retained. Git still warns about LF-to-CRLF conversion on the five modified tracked files when Git next touches them. |
| `git diff --cached --check` | **PASS after final staged hygiene cleanup** — the initial staged check found one new blank line at the end of `.gitignore`; removing only that extra empty line and restaging produced no whitespace errors. The staged set contains 137 additions and five modifications, with no deletions, forbidden artifacts, symlinks, or unexpected object modes. |

`pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` were also run sequentially as a final aggregate command and all passed. `pnpm test:e2e` and `pnpm test:webview2` then passed sequentially as the final browser aggregate. After adding direct hostile-document assertions to the existing real WebView2 development test, `pnpm typecheck`, `pnpm lint:frontend`, `pnpm format:check`, and `pnpm test:webview2` were rerun and all passed (2 WebView2 tests, 37.1 seconds). No application code changed in that final evidence-closing edit.

## Gate-by-gate evidence

### Unit — PASS

- 21 Vitest tests cover layout validation/serialization, typed transport and no-browser-storage behavior, real UI SDK component interactions, Markdown feature classification, real Milkdown round trips, sanitizer behavior, URL/path candidates, link activation, inert MDX/Mermaid, and hostile HTML.
- 22 Rust tests cover SQLite PRAGMAs, migrations/settings, credential references and synthetic Credential Manager round trips, DPAPI/AES-GCM authentication/tamper rejection, watcher/path behavior, HTTPS/executable validation, and recovery.

### Integration — PASS

- Fresh migration, idempotent reopen, restart persistence, malformed-layout rollback, and camelCase frontend snapshots passed against actual bundled SQLite.
- Synthetic credentials round-tripped through real Windows Credential Manager; SQLite/WAL bytes contained only the generated credential reference, not the generated secret. Test entries were cleaned up safely.
- Real WebView2 IPC exercised exactly the two exposed layout commands. Capabilities contain only `core:default`; no unrestricted SQL, filesystem, shell, secret-read, process, or URL-opening command exists.

### Filesystem/recovery — PASS for the scoped primitive

- Recursive watcher events arrived; watcher errors remain reconciliation hints rather than proof of deletion.
- Missing/escaping paths fail as unavailable/outside-root instead of recreating files or inferring deletion.
- Simulated stops after prepared, staged, replacing intent, replacement, and verified states recovered without losing originals.
- Changed source/destination hashes, corrupt staging/snapshots, missing files, and changed repository context pause safely. Restart recovery and committed-operation idempotence passed.

### Security — executed non-execution proofs PASS / syntax-class provenance unresolved

- Hostile scripts, iframe/object/svg/form elements, event handlers, styles, unsafe URLs, and the tested generic document-controlled class are stripped/rejected. MDX remains inert source; Mermaid remains an inert code block. Raw HTML `code` elements with `language-*` classes are currently allowlisted, so renderer-owned syntax-class provenance is not fully proven and remains a production-boundary limitation.
- No document script executed in unit, Chromium, or real WebView2 proofs. Real WebView2 directly exercised hostile HTML and MDX fixtures: the execution sentinel remained false, MDX stayed in inert source mode, executable-capable DOM was absent, remote and local document images had no fetchable `<img>`, and observed remote example.com requests were zero. Image-bearing documents enter source mode before Milkdown can request a remote image.
- Sanitized output is converted to controlled React elements, not injected as HTML. External HTTPS activation requires a click and Merlin-owned validation; local references remain inert pending native confinement.
- URL, executable, working-directory, argument, and shell-interpreter rejection tests passed. No real provider credential or unrestricted native capability was introduced.
- DPAPI wrapping and AES-256-GCM encryption, tamper rejection, and no-fallback behavior passed using only synthetic bytes.

### Accessibility and theme — PASS

- Named focusable resizable handles support keyboard resize and Enter collapse/restore. Collapsed panels are inert/hidden, focus does not remain inside them, and reset is keyboard-operable.
- Milkdown’s contenteditable region has an accessible multiline textbox name. Axe WCAG 2/2.1 A/AA scans passed in Chromium and real WebView2 with zero violations and no console errors.
- All 50 declared Merlin Dark contrast pairings passed. Components use semantic tokens; no product theme selector was added.
- The 0.5px hairline token remained visible and bounded between 0.5 and 1 CSS pixel at emulated DPR 1/1.25/1.5/2 and at the current real WebView2 scale. Minified production may serialize the same token as `.5px`; at 100% Chromium/WebView2 may report a 1 CSS-pixel used border width.

### Windows build and installer — PASS / disconnected cold start unverified

- Development Tauri/WebView2 launch, production optimized-binary launch, release compilation, and NSIS generation all succeeded on the stated baseline.
- The packaged application launched with local assets and proved typed SQLite persistence across native process restarts.
- The exact generated NSIS installer was silently executed into a safe repository-local test directory. Installation, installed-application cold launch, synthetic SQLite persistence, packaged offline-emulated reload, and silent uninstallation passed as distinguished in the command table above.
- A cold installed-process launch while the host OS/network adapters were actually disconnected was **not performed or passed**. WebView2's CDP offline emulation was used only after normal cold startup and then the packaged page was reloaded successfully.
- Authenticode inspection reports both the generated installer and raw release executable as `NotSigned`; no code-signing verification claim is made.

## Final repository-hygiene review

- Ignored directories verified by `git check-ignore` / `git status --ignored`: `.tools/`, `dist/`, `node_modules/`, `src-tauri/gen/schemas/`, `src-tauri/target/`, and `test-results/` (plus configured `playwright-report/`, coverage and TypeScript build-info patterns). This includes installers, raw executables, test SQLite databases, WebView2 profiles, generated Tauri schemas, installer-review evidence, and local Rust/Cargo caches.
- Intentional source inputs are not ignored: both lockfiles, `src-tauri/icon-source.svg`, referenced generated Tauri icon set, `public/favicon.png`, application/test sources, configuration, and documentation. The complete Tauri-generated standard icon set is retained rather than deleting pre-existing generated assets opportunistically.
- `.npmrc` contains only `engine-strict=true`, `save-exact=true`, `strict-peer-dependencies=true`, and `auto-install-peers=false`; it contains no token, approval grant, or lifecycle override.
- `package.json` declares the exact Node/pnpm engines, 42 exact direct packages, and only the configured verification/build commands. Cargo direct dependencies also resolve at their reviewed exact pins.
- Both lockfiles remain present and reproducible through frozen pnpm installation and locked Cargo metadata/check/tree commands. Searches found no repository-local absolute paths or generated-output references in either lockfile.
- The five tracked documentation diffs were reviewed: the Rust 1.97.1 updates implement approved D-037; README commands describe tools that actually exist; D-009 and D-038–D-045 record the accepted proof outcomes/decisions; D-046 records the user's repository-local UI SDK skill approval; `AGENTS.md` adds the approved persistent handoff contract (D-044), conventional-commit guidance, and the repository-local skill boundary. Only trailing spaces were removed during hygiene; no user-authored documentation change was discarded.
- The skill installation has two intentional source-control inputs: `pnpm-workspace.yaml` and `.agents/skills/.gitignore`. The generated `.agents/skills/pnpm-*` target is ignored because it links into `node_modules`; fresh pnpm installation recreates it from the committed approval/configuration. OpenCode's project-compatibility discovery recognized the resulting skill, so no extra OpenCode configuration is needed.

## Production-readiness boundaries

**Future-session rule:** a passing Phase 0 test verifies the stated primitive and trust boundary only. It does not make the enclosing workflow production-ready. Production claims require the relevant later-phase implementation and acceptance gates.

### Reusable verified foundations

- **SQLite/migrations:** bundled SQLite configuration, embedded Refinery migration execution, settings transactions, and typed camelCase IPC patterns are tested foundations. Current tables and repositories are still preflight-shaped.
- **Narrow native boundary:** only `preflight_get_layout` and `preflight_save_layout` are registered, with `core:default` capabilities. Strict versioned panel validation and SQLite restart persistence passed without browser storage. General SQL, filesystem, shell, process, credential-read, and URL-opening commands are deliberately absent.
- **Filesystem primitives:** existing-root/file canonicalization and ancestry checks, SHA-256 helpers, watcher/error reconciliation hints, durable operation states, same-directory staging/snapshots, hash verification, conservative recovery, and repository-context pause concepts have focused tests.
- **Markdown gates:** real Milkdown serialization measurement, exact-round-trip gating, original-source fallback, sanitizer AST auditing, controlled React element creation, inert MDX/Mermaid fallbacks, disabled task inputs, and non-fetchable image placeholders are useful foundations subject to the limitations below.
- **Windows mechanisms:** synthetic Credential Manager references, DPAPI-wrapped AES-256-GCM authenticated encryption/tamper rejection, HTTPS parsing, and direct argument-array process invocation prove mechanism feasibility only.

### Proof-only implementations — not finished services

- `SyncService` is explicitly a minimal persisted **replacement protocol**, not a Docs synchronizer. Callers supply hashes and repository context; deterministic test interruption points exist; both source and destination must already exist; prepared-operation recovery conservatively pauses; and no production conflict/replan workflow exists. Filesystem services are not exposed as Tauri commands.
- `MarkdownProof` operates on hard-coded in-memory fixtures. It has no repository document opening, save handler, autosave, or file persistence. Source fallback prevents loss in measured proof inputs but is not a complete editor product.
- Credential helpers use `merlin-preflight` names and the `save_credential_reference_for_proof` schema. They are not resource/provider workflows or secret-read commands.
- The DPAPI envelope contains wrapped key, nonce, and ciphertext without a version or attachment context. It is not attachment import, derivative storage, redaction, quarantine, export, purge, or recovery UX.
- `ValidatedHttpsUrl` never opens a browser. `ValidatedLaunch::run_and_wait` is native proof code rather than an exposed product command. Clicking a safe external link in the proof only updates UI status.

### Incomplete production functionality

- **Phase 1:** Tauri/React product navigation and common controls; Overview/Projects/Resources shell; production migrations and typed repositories; production settings/log-path secret rejection; navigation accessibility/state tests; complete production theme contract; and CI contrast validation. No CI workflow is currently present.
- **Phase 2:** real Docs roots and Project Store backup, repository file operations, dedicated open/save/autosave editor behavior, watcher orchestration and debounced reconciliation, manifests/baselines and three-way conflicts, tombstones/trash/version retention, full bidirectional synchronization, and production attachment/redaction/quarantine/derivative recovery workflows.
- **Phase 3:** persisted application/terminal/URL/folder LaunchActions, terminal presentation, real system-browser/folder opening, project/resource integration, and their native/UI verification gates.
- **Phase 4:** resource/account/provider metadata lifecycles and credential management UX, including masked default display, explicit reveal/copy, archive/history, and safe provider workflows.

### Additional proof boundaries that production work must not overlook

- Recorded recovery coverage exercises repository-to-backup replacement, not end-to-end bidirectional synchronization. Simulated stops do not prove crash/power-loss durability.
- Existing-file canonicalization is not handle-based immunity to every concurrent junction/symlink replacement race.
- Relative URL candidates are not yet resolved through a registered Docs root; relative links and local images remain inert placeholders rather than native confined actions. Mermaid is intentionally not rendered.
- Markdown feature detection uses fixture-oriented regular expressions. Exact measured serialization/fallback protects only the measured source path; it is not a universal proof for every legal Markdown or image/reference spelling.
- Raw HTML `code` elements with `language-*` classes are allowlisted. The requirement that syntax classes be generated solely by Merlin's trusted renderer remains unmet or unproven; this is a provenance issue, not a demonstrated code-execution finding.
- Direct launch validation permits an arbitrary existing `.exe` unless caught by the small denylist. It constrains invocation shape, not executable behavior, sandboxing, benignness, secret-free arguments, or the full Phase 3 policy.

### Explicitly deferred from v1

Merlin MCP/agent integration, UI SDK Agent Bridge, embedded ChatGPT WebView, automated CLI/provider usage collection, account/login switching, X promotions watcher, external theme loading/marketplace, cloud sync, AI assistant features, and GitHub API integration are deferred product exclusions, not hidden Phase 0 completions. External/cloud backup is future work.

## Failure history and resolutions

- Initial shadcn config used an unsupported `base` key and obsolete `nova` registry style. Correcting to the installed CLI schema and `base-nova` fixed resolution; a Windows alias-path issue was inspected and corrected before the successful dry run.
- TypeScript 6 rejected deprecated `baseUrl`; it was removed while preserving path aliases rather than suppressing the diagnostic or changing TypeScript.
- Initial browser failures found visible padded content in collapsed panels, Milkdown image fetching, a missing contenteditable name, and favicon 404s. These were fixed and the complete browser suites rerun successfully.
- Vite originally watched Cargo linker/PDB artifacts, causing lock/contention noise. Native output, local tools, and test artifacts are now excluded from its watcher.
- Initial Rust compilation found Tauri command macro paths, borrowing/type mismatches, and a missing required Windows icon. These were corrected; all native tests and Clippy subsequently passed.
- HTTPS validation incorrectly rejected a valid `%20` path escape. It now accepts encoded spaces while continuing to reject encoded controls/backslashes and raw ambiguous URLs.
- An initial strict display-scaling assertion assumed exact device-pixel rounding. The test now records and verifies actual browser behavior: the semantic token remains 0.5px and the visible used border remains within 0.5–1 CSS pixel.
- Two overlapping global rustup operations left the global 1.97.1 installation with a missing manifest. Project-local setup/wrapper scripts provide a verified exact-version path; no global repair was attempted.
- The first temporary installed-application review harness incorrectly expected 9 fixture rows instead of 10 and timed out after 90 seconds. Correcting only the ignored harness count produced a passing installed cold-launch and offline-emulated reload run. No application or installer code was changed during this final review.
- Earlier `git diff --check` failed on trailing spaces in the two user-authored `AGENTS.md` commit instructions. Final review understood those lines as commit/handoff guidance, removed only the trailing spaces without changing their meaning, and reran the check successfully with exit code 0.
- The initial pnpm-generated `pnpm-workspace.yaml` used single-quoted YAML syntax that failed the repository's Prettier check. Formatting changed only the package-key quote style; `pnpm permissions list`, frozen installation, formatting, TypeScript, and frontend lint then passed.
- The initial `git diff --cached --check` reported `.gitignore:13: new blank line at EOF`, which the earlier unstaged-only check could not see for an untracked file. Removing only the extra empty line and restaging corrected it; the final staged check passed.

## Explicit limitations and unexecuted checks

These limitations do not invalidate the scoped Phase 0 result, but they must not be upgraded into stronger claims:

- **Full Docs remains unimplemented.** The canonical CommonMark fixture is explicitly required to round-trip byte-for-byte in real Milkdown. Frontmatter, HTML/MDX, images, CRLF, unsupported directives, and measured serializer drift preserve original source through fallback instead. No source file is rewritten by this proof.
- Sync is a persisted replacement-protocol primitive, not full Docs synchronization. It has no three-way reconciliation UI, manifests/baselines, tombstones, pruning, repository discovery, or production conflict workflow.
- Deterministic interruption stops do not prove real process-crash or power-loss durability. Junction-specific fixtures and handle-based protection against every concurrent symlink replacement race remain future hardening work.
- The DPAPI envelope is a proof, not a versioned production attachment format. Recovery depends on the same Windows user’s protected DPAPI key material/profile; cross-user/machine/profile recovery is not guaranteed.
- The renderer currently permits raw-HTML `code[className]` values matching `language-*`. The security contract calls for trusted renderer-generated syntax classes; exact renderer-owned provenance must be enforced or separately proven before production Docs. There is no evidence that such a class executes script, but the broader provenance contract is not complete.
- The filesystem proof exercises persisted replacement from repository to backup, not end-to-end bidirectional synchronization. Path confinement still has junction-specific and concurrent replacement-race hardening work. Launch validation constrains process shape but does not sandbox arbitrary executables. Markdown feature classification is fixture-oriented rather than a universal parser for every legal Markdown spelling.
- Physical display settings other than the current Windows 100% scale were not changed. 125/150/200% checks used Chromium DPR emulation. Manual screen-reader narration was not run; accessibility results are automated behavior/axe proofs.
- The stronger OS/network-disconnected cold-installed-process launch remains unverified. Only the installed application's post-startup packaged-page reload was tested with WebView2 network emulation set offline. The final review session is non-elevated, so it cannot safely create the available firewall rule; no usable Windows Sandbox command was found. Disabling adapters or blocking shared WebView2 processes would risk unrelated applications, so no stronger test was attempted.
- The installer and raw release executable are unsigned (`NotSigned`). Signing, SmartScreen/reputation behavior, and signed-installer upgrade behavior were not verified.
- The repository-local UI SDK skill approval resolved the earlier pnpm pending-skill warning. A separate read-only `npx ... skills --help` inspection caused npm to warn that the pnpm-only `.npmrc` keys `strict-peer-dependencies` and `auto-install-peers` are unknown to npm; no skill was installed through npx. The actual pinned pnpm approval/frozen-install path uses those settings and completed cleanly.
- `cargo audit` was not run because it is not installed in the approved dependency set. `pnpm audit --prod` passed, but that is not a Rust vulnerability audit.
- The global damaged rustup installation remains an external environment issue; repository commands do not depend on it.
- The large-chunk Vite advisory remains a non-blocking Phase 0 finding, not a product performance acceptance result.
- Phase 0 was committed as `28d91919f83fae1ad4b47731693f9b5012473639`. The reviewed and accepted Milestone 1 changes are included only in the separately authorized Milestone 1 commit described below; no push or history rewrite has been performed.

## Changed files and artifacts

- **Root scaffold:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.agents/skills/.gitignore`, `.npmrc`, `.gitignore`, `.prettierignore`, `.prettierrc.json`, `components.json`, `index.html`, `public/favicon.png`, TypeScript/Vite/Vitest/ESLint/Playwright configuration, and `rust-toolchain.toml`. The generated `.agents/skills/pnpm-*` skill symlink is intentionally ignored rather than committed.
- **Frontend proof:** `src/App.tsx`, `src/main.tsx`, `src/components/`, `src/layout/`, `src/markdown/`, `src/styles/`, `src/themes/`, `src/test/`, and `src/lib/utils.ts`.
- **Native proof:** `src-tauri/Cargo.toml`, `Cargo.lock`, Tauri/capability/build configuration, migration SQL, `src-tauri/src/`, `src-tauri/tests/`, icon source/generated icons, and native target artifacts (ignored).
- **Verification/tooling:** `scripts/`, `tests/e2e/`, `tests/support/`, `playwright.chromium.config.ts`, and `playwright.webview2.config.ts`.
- **Documentation/status:** `AGENTS.md`, `README.md`, `docs/IMPLEMENTATION-PLAN.md`, `docs/UI-STACK.md`, `docs/DECISIONS.md`, and `BUILD-STATUS.md`. Existing user-authored `AGENTS.md` build-handoff and commit guidance was retained. Final hygiene removed its two trailing spaces and added only the explicitly approved repository-local UI SDK skill instruction recorded in D-046.

## Exact next task authorized

**Stop. Milestone 2 is committed; report the amended commit hash from Git history, changed files, verification results, parent, and final Git status.** No further implementation or commit is currently authorized. Do not push without separate explicit authorization.

## Milestone 2 stop boundary

Milestone 3 and every later milestone remain unauthorized. Do not add application navigation, a settings screen, theme picker, changed panel-layout defaults, resources/projects, Usage Journal controls, or other product workflows. The separately authorized Milestone 2 commit does not authorize any later implementation.
