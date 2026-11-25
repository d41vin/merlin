# Implementation Plan

## Delivery strategy

Build in verified phases. Do not start with every screen and feature at once. Establish risky foundations early, especially Markdown preservation, Docs synchronization, native credential storage, and custom launch safety.

## Verification policy

Each phase must record results for the relevant gates below before it is complete:

- **Unit:** deterministic domain and utility behavior.
- **Integration:** SQLite repositories, Tauri commands, and other in-process boundaries.
- **Filesystem/recovery:** temporary-directory and simulated-failure coverage for file or attachment behavior.
- **Security:** the trust boundary introduced or changed by the phase.
- **Accessibility:** keyboard operation, visible focus, accessible names, and relevant screen-reader semantics.
- **Windows build:** a Windows 11 development and packaged-build check appropriate to the phase.

The exact scripts and test runners are intentionally not prescribed before the scaffold exists. Phase 0 selects and configures them; later phases must name the actual commands run and their results. Typecheck and lint are required whenever the configured tooling can run them. A phase may mark a gate not applicable only with a written reason and must rerun an earlier suite if it changes that earlier surface.

## Phase 0 — Technical preflight

Prove:

- Tauri 2 desktop build on Windows 11 with Node.js 24.22.1, pnpm 12.15.0, and Rust 1.97.1.
- React/Vite/Tailwind v4/shadcn Base UI.
- The exact pinned beta versions of `@ui-sdk/react` and `@ui-sdk/core` for resizable panels, pointer and keyboard resize, focus behavior, collapse/restore, reset, and SQLite-backed layout persistence across restart. Do not use browser localStorage.
- Milkdown Markdown round-trip compatibility and safe rendering of the resulting source.
- Rust filesystem watcher and atomic write.
- SQLite migration path.
- Windows Credential Manager integration.
- Safe process launching.
- Theme loading and contrast validator.

Deliver:

- Minimal runnable shell.
- Technical findings.
- Dependency/version decisions.
- Tests for each proof.

Do not proceed with the full Docs feature until Markdown preservation and basic sync primitives are demonstrated.

Verification gates:

- **Unit:** contrast calculation, layout serialization, Markdown fixture classification, and command/path validation utilities.
- **Integration:** a SQLite migration proof; settings-backed layout persistence; Credential Manager reference handling; typed Tauri command boundaries.
- **Filesystem/recovery:** atomic-write proof plus simulated interruption through the sync-operation stages needed for the prototype.
- **Security:** Markdown/HTML sanitization allowlist, MDX and script non-execution, safe Mermaid rendering or code fallback, safe URL handling, no Tauri access from rendered content, launch validation, and secret redaction proofs.
- **Accessibility:** UI SDK resizable handles support keyboard resize, focus, collapse/restore, labels, and reset.
- **Windows build:** debug launch and production/package build on the stated Windows and toolchain baseline.

## Phase 1 — Application shell and foundation

Build:

- Production Tauri identity and native database lifecycle.
- Production-only packaging features with a separately compiled and targeted optimized test harness; no runtime database override in normal distribution.
- Tauri/React shell.
- Navigation: Overview, Projects, Resources.
- SQLite migrations and the existing settings repository foundation (no product-entity repositories in Phase 1).
- Settings service.
- Merlin Dark semantic token system.
- Theme contract validation and CI contrast script.
- Common controls and layout primitives.

Acceptance:

- App launches on Windows 11.
- Data survives restart.
- The product shell, Overview/Projects/Resources navigation, and common controls meet their keyboard, focus, accessible-name, and navigation-state gates.
- Contrast validation runs locally and in CI.
- Components consume semantic tokens only.

Verification gates:

- **Unit:** settings, theme-contract completeness, contrast calculations, and navigation state.
- **Integration:** SQLite migrations and the settings repository through typed Tauri commands, including SQLite-backed panel-layout save/restore.
- **Filesystem/recovery:** not applicable to new Phase 1 behavior; rerun the Phase 0 atomic-write proof if shared filesystem infrastructure changes.
- **Security:** prove layouts do not use browser localStorage and that settings/log paths do not accept secrets. Normal production resolver tests and binary inspection must prove test database environment overrides are absent, while the separately compiled harness accepts only explicitly gated canonicalized paths.
- **Accessibility:** navigation and common controls have accessible names, visible focus, keyboard operation, and reduced-motion behavior where animated.
- **Windows build:** Windows 11 debug launch, explicit production-feature packaged build, and optimized test-harness build succeed. The production package must exclude the harness and the production build must reject simultaneous production/test-harness features.

### Milestone 1 — Production identity and database lifecycle

Milestone 1 established the accepted production identity, packaging guards, and native database lifecycle. It did not add navigation, product screens, settings, or the design system.

Delivered scope:

- Production Tauri identity `com.merlin.desktop`, window title Merlin, executable `merlin.exe`, and database `<app_data_dir>/merlin.sqlite3`.
- Production-only packaging features and a separately compiled, optimized test harness; normal distribution cannot use the test database override.
- Canonicalized, confined test-database resolution behind explicit harness markers and environment gates.
- Native database lifecycle with the V1 migration and migration history preserved.
- Regression coverage for production-boundary exclusion, conflicting features, and legacy preflight database preservation.

Milestone 1 was accepted and committed as `2e55e7232c12b1e86a415f0e33d1a88a7dd1a1c7`.

### Milestone 2 — Production settings foundation

Milestone 1 established the accepted production identity, packaging guards, and native database lifecycle. Milestone 2 adds only the production settings foundation; it does not add navigation, a settings screen, a theme picker, later panel-layout changes, or other product workflows.

Approved scope:

- Preserve the V1 migration byte-for-byte and add an append-only V2 migration that reuses the existing `settings` table.
- Seed exactly `app.theme_slug.v1` = `"merlin-dark"`, `app.density.v1` = `"default"`, and `app.accessibility.force_reduced_motion.v1` = `false` using conflict-safe insertion that never overwrites existing rows.
- Add a focused native repository that reads and updates only individual allowlisted settings keys, plus a typed settings service.
- Expose exactly `settings_get`, `settings_set_theme`, `settings_set_density`, and `settings_set_reduce_motion`; no generic key/value, arbitrary JSON, path, SQL, or secret-related commands.
- Permit only theme slug `merlin-dark`, densities `default` and `compact`, and boolean forced-reduced-motion values. `false` follows the operating-system preference and `true` forces reduced motion; Merlin never disables an operating-system reduced-motion request.
- Recover missing, malformed, wrong-type, or unsupported individual settings non-destructively with per-field safe defaults and `usedDefaults=true`. Reads never overwrite corrupt values; valid explicit updates may repair their own field. Actual database and migration failures remain errors.
- Keep Merlin Dark as the synchronous initial theme, then load, validate, and apply persisted settings. Browser-only reads may use safe defaults; browser-only writes must report unavailable native persistence. No browser localStorage or alternative browser persistence is permitted.
- Ensure all validation failures, including Serde/Tauri deserialization failures, are content-free.

Acceptance:

- A real V1 database created through Refinery upgrades to V2 with V1 schema, data, and migration history preserved; reopen is idempotent.
- Approved settings persist across native-process restart, while rejected writes preserve the last valid value and corrupt reads do not rewrite stored values.
- Existing layout persistence remains independent and unchanged, with no browser-storage fallback.
- Validation errors, logs, and database writes do not reflect submitted secret-like values.
- Existing native, frontend, browser, real WebView2, accessibility, production packaging, and test-harness regression gates pass.

### Milestone 3 — Merlin Dark design system and CI foundation

Milestone 3 establishes only the production design-system and verification foundation. It does not add application navigation, a settings screen, a theme picker, later panel-layout changes, or other product workflows.

Approved scope:

- Separate hue-named primitives, semantic tokens, and component styles. Every semantic color resolves through a primitive; Merlin Dark remains the only bundled theme.
- Use a strict shared theme contract for manifest fields, exact semantic-token completeness, valid aliases, required contrast coverage, and synchronous fail-closed runtime application.
- Generate committed theme CSS deterministically from manifests and compare generated output during local and build verification.
- Validate all required text/surface pairings at 4.5:1 and meaningful control, selected, boundary, and focus indicators at 3:1. Coverage is based on actual permitted component states and adjacency, not a fixed pair count.
- Keep decorative surface hairlines distinct from meaningful control boundaries. Status colors used as text require text contrast independently of graphical-indicator contrast.
- Split global base, typography, density, common-component, and proof-only styles. Add a scoped static token-usage audit with documented exclusions and limitations.
- Define default density at 32px and compact density at 28px for row/control roles, with fixed shared spacing and indicator tokens. Static HTML supplies default density before rendering; persisted compact density may still follow asynchronous native settings load.
- Preserve the four Milestone 2 settings commands, all persistence/recovery behavior, and the prohibition on browser storage. Add no dependencies, migrations, settings keys, or IPC commands.
- Add deterministic local theme/build gates and a GitHub Actions workflow for frontend/theme and native checks. Validate workflow-equivalent commands locally and record hosted execution as unverified while pushing remains unauthorized.

Acceptance:

- Complete strict theme contracts and generated CSS agree, runtime registry and discovered bundled manifests agree, and invalid themes cannot mutate the applied root.
- All actual permitted rendered pairings pass, including hover, pressed, selected, disabled, status text, meaningful boundaries, and focus. Test success never results from omitting a failing pair.
- Production CSS/TSX passes the scoped primitive, raw-color, Tailwind-color, and unregistered-token audit; positive and negative scanner tests pass.
- Static default theme/density/color-scheme markers precede rendering, compact density applies after settings load, and computed Chromium/WebView2 behavior agrees.
- Existing frontend, native, Chromium, WebView2, accessibility, production packaging, test-harness, settings, security, and production-boundary gates pass.
- Workflow-equivalent steps pass locally; hosted CI is explicitly unverified until actually executed under separate authorization.

### Milestone 4 — Application shell, navigation, common controls, and Phase 1 closure (required; Checkpoint 1 authorized; Checkpoints 2–6 not authorized)

Phase 1 is not complete. The Phase 1 build list requires a Tauri/React shell, Overview/Projects/Resources navigation, and common controls and layout primitives. Milestones 1–3 delivered identity, settings, and the design system, but the normal React surface is still the Phase 0 technical-preflight proof. Milestone 4 is the remaining Phase 1 work, not new product scope.

The finalized dependency-aware plan, file map, proof relocation, and approved decisions M4-D1–M4-D6 are in `docs/PHASE-1-M4-PLAN.md`. **Checkpoint 1 (baseline guards and Phase 0 proof relocation using Option B) is authorized.** Checkpoints 2–6 remain unauthorized until separately approved.

Approved scope:

- Replace the Phase 0 proof surface with the product shell. The normal application must not describe itself as a technical preflight or say that it is not a product screen.- Add a persistent left navigation for exactly Overview, Projects, Resources. Default width 240px; resizable within 200–320px using the approved UI SDK resizable primitive rather than a second layout implementation. Items are 28px high with a 2px active indicator and clear hover, focus, and selected states. Sidebar width is session-only and resets to 240px on restart; it is not persisted in settings, SQLite layout data, or browser storage.
- Use keyboard-operable destinations with accessible names, visible focus, and an active state exposed to assistive technology. Preserve focus when destinations change and respect reduced-motion preferences.
- Add the shell and common-control foundations owned by shadcn/Base UI: application frame, page and section headers, content regions, status/unavailable presentation, and the approved M4-D1 minimal control set: existing Button plus Input, Textarea, Label, and Dialog for the immediate P2-M1 consumer. Defer Checkbox, Select, Tabs, Menus, Tooltips, Field, AlertDialog, and the other listed controls until a concrete consumer exists. UI SDK and shadcn/Base UI must not own the same interaction primitive.
- Show an explicit unavailable/not-yet-implemented state for Overview, Projects, and Resources content. Do not fabricate project records, resources, activity, metrics, or usage data to fill the shell, and do not add controls that imply unavailable workflows. Their product workflows remain Phase 3–5.
- Add no settings screen, settings destination, theme picker, density picker, or reduced-motion control. Keep the M2 settings foundation, Merlin Dark before render, density/reduced-motion behavior, settings IPC, and persistence unchanged.
- Relocate the Phase 0 browser proofs out of the normal product surface without deleting, weakening, or skipping assertions. Preserve complete Phase 0 security/rendering coverage in Chromium and development WebView2; Option B keeps the optimized-harness proof parity in a harness-only build.
- Close the remaining Phase 1 verification gaps: navigation-state and accessibility tests; a proven rejection of secret-like settings values and of secret-like values on any log-path surface, or a documented not-applicable finding if no log-path surface exists; and re-verification of the existing production migrations and settings repository through typed commands. Add no product-entity repositories in this milestone.
- Preserve the four Milestone 2 settings commands and recovery behavior, the Merlin Dark theme contract, SQLite layout persistence, and the prohibition on browser storage. Add no dependency, migration, settings key, or IPC command unless separately approved.

Acceptance:

- The application launches into the product shell on Windows 11; existing settings and four-panel layout data survive restart, while sidebar width resets to 240px.
- Overview, Projects, and Resources are reachable by keyboard and pointer; focus is visible, names are accessible, and the active destination is announced.
- Sidebar width defaults to 240px and stays within 200–320px; navigation uses the documented item height and active indicator; no arbitrary destination rearrangement or sidebar-width persistence is introduced.
- Components consume semantic tokens only; the minimal control set is keyboard/focus/ARIA tested; and the normal product surface contains no proof-only labeling, fabricated data, or controls implying unavailable workflows.
- Phase 0 security/rendering assertions remain executable through the approved proof harness; the optimized-harness Option B build is approved and preserves the existing proof assertions.
- Phase 1 acceptance in this document is met, including local and CI contrast validation, and all existing settings, theme, security, packaging, and test-harness gates remain green.
- Hosted CI passes for the milestone commit. Hosted CI does not run real WebView2, NSIS packaging, or the production-boundary gates; those remain separate local Windows gates.

Verification gates:

- **Unit:** navigation state, active-destination semantics, sidebar bounds/session behavior, shell state transitions, and minimal control behavior.
- **Integration:** existing production migrations and the settings repository through typed Tauri commands; SQLite-backed four-panel layout save/restore unchanged; separate sidebar session/restart assertions; no browser storage.
- **Filesystem/recovery:** not applicable to new shell behavior; rerun the Phase 0 atomic-write proof if shared filesystem infrastructure changes.
- **Security:** settings and any log-path surface reject secret-like values; no document, resource, or remote content is rendered or fetched by the shell; renderer capabilities remain minimal; Phase 0 rendering/security assertions remain executable through the approved proof harness.
- **Accessibility:** navigation and minimal controls have accessible names, visible focus, keyboard operation, active-state announcement, dialog focus management, and reduced-motion behavior where animated.
- **Windows build:** Windows 11 debug launch and production-feature packaged build succeed with the harness excluded.

Milestone 4 implementation is authorized **only for Checkpoint 1**. Do not begin Checkpoints 2–6 or Phase 2 until separately approved.

## Phase 2 — Docs and Vault

**Planning status (2026-11-26):** Proposed only; not authorized. The detailed, sequenced milestone plan is in `docs/PHASE-2-PLAN.md`. It requires Phase 1 Milestone 4 to pass first. M4-D5 Option B is approved and Checkpoint 1 is authorized; the remaining M4 checkpoints still require approval. The summary below remains the authoritative Phase 2 outcome contract; the detailed plan may not weaken it.

Phase 2 includes the minimum stable project identity, optional repository connection, and Docs-root registration that Docs requires. Phase 3 extends those records into the full Projects area; it must not create a second project identity. The rest of the Phase 2 build list below remains unchanged.

Build:

- Project registration and repository connection.
- Docs root detection/confirmation.
- Merlin Project Store.
- Markdown editor proof and dedicated editor.
- File tree and folders.
- Watcher, manifests, hashes, atomic writes.
- Three-way reconciliation and conflict UI.
- Version history, trash, reconnect workflow.
- Attachment storage and references.

Acceptance:

- External edits are detected.
- Backup edits work while repository is unavailable.
- Divergent changes never overwrite each other.
- Missing files are not automatically treated as deletions.
- Restart/resume recovery works.
- Markdown round-trip tests pass.

Verification gates:

- **Unit:** three-way comparison, conflict classification, deletion ambiguity, branch-context checks, sync-operation state transitions, content hashes, and Markdown rendering policy.
- **Integration:** SQLite manifests, baselines, conflict records, sync operations, version/trash metadata, and the Tauri filesystem command boundary.
- **Filesystem/recovery:** temporary-directory scenarios for interrupted writes at prepared, staged, replacing, and verified states; changed destination hashes; external edits; branch switches; repository unavailability and reconnect; startup/resume recovery; and atomic replacement failure.
- **Security:** source preservation with HTML/MDX non-execution; sanitizer allowlist; URL/path restrictions; no renderer Tauri capability; attachment redaction refusal, sensitive managed-copy encryption, and purge of managed revisions/trash/previews/pending exports.
- **Accessibility:** file tree, editor state, conflict-resolution actions, source fallback, and recovery errors are keyboard-operable and named.
- **Windows build:** Docs workflows run in a Windows 11 packaged or production-equivalent build, including watcher and recovery behavior.

## Phase 3 — Projects

Build:

- Project list and status lifecycle.
- Project workbench with four fixed resizable panels.
- Todos and scratchpads.
- Linked Docs.
- Milestones.
- Git commit activity.
- Meaningful Merlin project activity.
- Custom launch actions.
- ChatGPT Project URL action.

Acceptance:

- Projects can exist without repositories.
- Panel layout persists.
- Todos/milestones survive restart.
- Activity is factual and source-labeled.
- Launch actions are constrained and validated.

Verification gates:

- **Unit:** project/todo/milestone lifecycle rules, activity-source labeling, and action-kind/argument validation.
- **Integration:** project repositories, Git commit import boundary, launch-action commands, and layout persistence.
- **Filesystem/recovery:** rerun Phase 2 Docs/linking regression coverage after connecting project workbench actions to project documents; no new direct file mutation is accepted without Phase 2 recovery coverage.
- **Security:** URL, executable, working-directory, and argument validation rejects unsafe action configurations; no shell-string executor is introduced.
- **Accessibility:** fixed panels, UI SDK handles, collapse/restore/reset, project tables, todo controls, and launch actions work by keyboard with focus and labels.
- **Windows build:** project, Git, and launch workflows are exercised in a Windows 11 build.

## Phase 4 — Resources

Build:

- Three fixed resource categories.
- Resource listing and details.
- Multiple accounts.
- Allowances and reset/expiry states.
- Manual usage records and verification timestamps.
- API key metadata and Credential Manager integration.
- Models and descriptive associations.
- Potential resources.
- Resource-project allocation.
- Archive/trash/history.
- Resource launch actions.

Acceptance:

- No duplicate resource for different access methods.
- Unknown is distinct from zero.
- Shared/account-specific allowances behave correctly.
- Secrets never enter SQLite or logs.
- Allocation does not imply consumption.

Verification gates:

- **Unit:** ownership/account/allowance state separation; availability derivation; reset/expiry rules; shared allowance and account-specific override resolution; aggregation eligibility; and unknown-versus-zero behavior.
- **Integration:** resource repositories, allowance/usage history, Credential Manager references, and resource launch-action commands.
- **Filesystem/recovery:** attachment storage, encrypted managed revisions/trash, shared references, export cleanup, and suspected-secret purge behavior use temporary directories and simulated failures.
- **Security:** raw secrets stay out of SQLite/logs/Markdown; full-secret attachment imports are refused or purged; sensitive managed attachments do not fall back to plaintext; and exports require the specified warning.
- **Accessibility:** resource filters, status distinctions, account expansion, allowance detail, and destructive archive/trash actions are keyboard-accessible and announced.
- **Windows build:** Credential Manager and resource workflows are verified in a Windows 11 build.

## Phase 5 — Overview

Build:

- Factual summary.
- Conditional attention items.
- Active/passive project preview.
- Resource summary.
- Ready to use resources.
- Recent activity.
- Coming up chronology.

Acceptance:

- No fabricated analytics.
- Empty attention state does not waste space.
- Resource and project actions navigate to canonical records.

Verification gates:

- **Unit:** factual overview derivation, attention eligibility, chronology ordering, and Ready to use selection respect ownership, readiness, and allowance certainty.
- **Integration:** overview queries return canonical project/resource records and preserve unknown values.
- **Filesystem/recovery:** not applicable to new Overview behavior; rerun relevant Phase 2/4 suites if Overview changes document or attachment storage.
- **Security:** summaries and journal-adjacent views do not expose secrets, document contents, or private attachment payloads.
- **Accessibility:** conditional sections, summaries, quick actions, and empty states have correct keyboard order, names, and status messaging.
- **Windows build:** Overview renders and navigates correctly in a Windows 11 build.

## Phase 6 — Usage Journal and hardening

Build:

- Local meaningful interaction events.
- Pause, clear, export, retention controls.
- Error/recovery polish.
- Performance review.
- Backup/export.
- Packaging and installer.
- Accessibility and keyboard pass.

Acceptance:

- No document contents or secrets in journal.
- Idle resource use remains low.
- Data recovery paths are tested.
- Windows packaging and upgrade path are verified.

Verification gates:

- **Unit:** journal retention/clear/export rules, redaction, backup eligibility, and recovery-state classification.
- **Integration:** journal/settings repositories, export boundary, backup metadata, upgrade migrations, and error reporting.
- **Filesystem/recovery:** backup/restore, version/trash retention, interrupted export, sync-operation restart recovery, and sensitive-attachment purge regressions.
- **Security:** journal and diagnostics contain no document contents or secrets; exports require explicit review; private attachment encryption and recovery limits are documented and enforced.
- **Accessibility:** full regression pass for interactive controls, dialogs, errors, conflicts, focus restoration, keyboard panel interaction, and reduced motion.
- **Windows build:** installer, install/upgrade, launch, persistence, and core workflows are verified on Windows 11.

## Deferred backlog

Do not include in v1 unless separately approved:

- Merlin MCP/agent integration.
- UI SDK Agent Bridge.
- Embedded ChatGPT WebView.
- Automated CLI/provider usage collection.
- Account/login switching.
- X promotions watcher.
- External theme loading/marketplace.
- Cloud sync.
- AI assistant features.
- GitHub API integration.

## Definition of done

A phase is complete only when:

- Its acceptance criteria are met.
- Relevant tests run and results are reported.
- Errors and recovery behavior are implemented.
- Documentation reflects the shipped behavior.
- No known data-loss or secret-handling issue is left undocumented.
