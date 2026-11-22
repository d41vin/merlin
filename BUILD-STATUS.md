# Merlin Build Status

Last updated: 2026-11-23

## Current phase and recommendation

- **Current phase:** Phase 0 — Technical preflight.
- **Recommendation:** **Accepted PASS for the approved technical-preflight scope, with explicit offline and syntax-class-provenance limitations.** The NSIS install/launch/uninstall lifecycle passed. The installed application also reloaded successfully with WebView2 network emulation forced offline, but a cold process launch with operating-system networking disabled was not verified and is not marked as passed. The final hygiene review separately identified an unresolved trusted-renderer syntax-class provenance mismatch; the executed hostile-document non-execution proofs remain valid, but that broader contract is not marked as passed. This is not a claim that Merlin product features exist.
- **Product implementation:** Not started. There are no Overview, Projects, Resources, full Docs synchronization, provider, usage, attachment, or credential-management product workflows.
- **Next phase:** **Phase 1 is not authorized.** Stop here for user review and explicit approval.
- **Outstanding final-review limitations:** Cold installed-process launch with the host machine actually disconnected from networking remains unverified. The hygiene review also found that raw-HTML `code` elements may retain allowlisted `language-*` classes, so the security contract's trusted-renderer-owned syntax-class provenance is unresolved and is not marked as passed. No script execution was observed from this provenance mismatch. Environmental warnings and other intentionally unexecuted checks are listed below rather than hidden.

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

## Final verification commands and outcomes

The following commands completed after the implementation fixes. Separate earlier failures are retained in the next section.

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
- All reviewed changes were uncommitted at the pre-commit handoff, and no push or history rewrite was performed. This file is the pre-commit verification snapshot; the single authorized Phase 0 commit's hash and clean-tree confirmation belong to the final commit handoff.

## Changed files and artifacts

- **Root scaffold:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.agents/skills/.gitignore`, `.npmrc`, `.gitignore`, `.prettierignore`, `.prettierrc.json`, `components.json`, `index.html`, `public/favicon.png`, TypeScript/Vite/Vitest/ESLint/Playwright configuration, and `rust-toolchain.toml`. The generated `.agents/skills/pnpm-*` skill symlink is intentionally ignored rather than committed.
- **Frontend proof:** `src/App.tsx`, `src/main.tsx`, `src/components/`, `src/layout/`, `src/markdown/`, `src/styles/`, `src/themes/`, `src/test/`, and `src/lib/utils.ts`.
- **Native proof:** `src-tauri/Cargo.toml`, `Cargo.lock`, Tauri/capability/build configuration, migration SQL, `src-tauri/src/`, `src-tauri/tests/`, icon source/generated icons, and native target artifacts (ignored).
- **Verification/tooling:** `scripts/`, `tests/e2e/`, `tests/support/`, `playwright.chromium.config.ts`, and `playwright.webview2.config.ts`.
- **Documentation/status:** `AGENTS.md`, `README.md`, `docs/IMPLEMENTATION-PLAN.md`, `docs/UI-STACK.md`, `docs/DECISIONS.md`, and `BUILD-STATUS.md`. Existing user-authored `AGENTS.md` build-handoff and commit guidance was retained. Final hygiene removed its two trailing spaces and added only the explicitly approved repository-local UI SDK skill instruction recorded in D-046.

## Exact next task authorized

**Stop after the single authorized Phase 0 foundation commit and report its hash, committed files, verification, and final status.** Do not amend or rewrite existing history. No further implementation is authorized. Phase 1 — Application shell and foundation — and all other product work still require explicit approval.

## First recommended Phase 1 task after future approval

Start with **Tauri/React shell**, the first Build item in `docs/IMPLEMENTATION-PLAN.md` Phase 1 — Application shell and foundation, followed by the phase's production repositories, navigation/common controls, and acceptance gates. This is a recommendation only; the hygiene pass did not begin it.
