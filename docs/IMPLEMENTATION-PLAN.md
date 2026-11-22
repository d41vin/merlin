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
- Tauri/React shell.
- Navigation: Overview, Projects, Resources.
- SQLite migrations and repositories.
- Settings service.
- Merlin Dark semantic token system.
- Theme contract validation and CI contrast script.
- Common controls and layout primitives.

Acceptance:
- App launches on Windows 11.
- Data survives restart.
- Contrast validation runs locally and in CI.
- Components consume semantic tokens only.

Verification gates:
- **Unit:** settings, theme-contract completeness, contrast calculations, and navigation state.
- **Integration:** SQLite migrations and settings repositories through typed Tauri commands, including SQLite-backed panel-layout save/restore.
- **Filesystem/recovery:** not applicable to new Phase 1 behavior; rerun the Phase 0 atomic-write proof if shared filesystem infrastructure changes.
- **Security:** prove layouts do not use browser localStorage and that settings/log paths do not accept secrets.
- **Accessibility:** navigation and common controls have accessible names, visible focus, keyboard operation, and reduced-motion behavior where animated.
- **Windows build:** Windows 11 debug launch and configured production build succeed.

## Phase 2 — Docs and Vault

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
