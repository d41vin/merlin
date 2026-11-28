# Phase 2 — Docs and Vault Milestone Plan

Status: **Planned; implementation proceeds under D-069 after Phase 1 automated closure.** Phase 1
manual Windows 11 acceptance and hosted CI for a pushed commit remain pending and are recorded
separately. This document sequences Phase 2 work and may not weaken the authoritative product
contract.

Date: 2026-11-26

Status update 2026-11-28: Phase 1 Milestone 4 automated closure is complete. The product shell,
navigation, session-only sidebar, minimal controls, proof/controls harnesses, real WebView2 checks,
production packaging, and production-boundary checks pass. Under D-069, Phase 2 implementation
begins without waiting for manual acceptance; acceptance and hosted CI are never inferred.

Authoritative requirements:

- `docs/PRD.md` §9
- `docs/DOCS-AND-VAULT.md`
- `docs/DATA-MODEL.md` §14
- `docs/SECURITY.md` §6
- `docs/UX-SPEC.md` §5
- `docs/ARCHITECTURE.md` §6
- `docs/IMPLEMENTATION-PLAN.md` Phase 2

## 1. Entry conditions

Phase 2 entry conditions:

1. Phase 1 Milestone 4 — Application shell, navigation, common controls, and Phase 1 closure —
   has passed its automated closure gates. **Met.** Checkpoints 1–2 are accepted; 3–6 are verified;
   the closure evidence is recorded in `BUILD-STATUS.md`. Manual Windows 11 acceptance and hosted CI
   for a pushed commit remain pending and are recorded separately, not inferred.
2. Hosted CI is green for the pushed `main` commit. It is green for `d1a4864` (both jobs); after the
   M4 milestone commit is pushed, hosted CI must be green for that commit as well. **Pending:** push
   is unauthorized, so this remains unverified and does not block local implementation under D-069.
3. The milestone sequence and scope boundary in §2 are accepted. D-069 authorizes ordinary
   implementation decisions; consequential scope changes still require product-owner direction.
4. Any open decisions listed in §6 that block the first milestone are resolved before that
   milestone's implementation.
5. M4-D5 **Option B** and D-070 are recorded, so P2-M1 inherits a stable test/build boundary.
   **Met.**

## 2. Scope boundary

Phase 2 delivers repository-backed Docs, the Merlin Project Store backup, the source-preserving
editor, reconciliation and conflict handling, version history, trash, attachments, and the
required sensitive-data protections.

Phase 2 includes the **minimum project identity and registration prerequisite** needed by Docs:
a stable project record, an optional repository connection, and one confirmed Docs root per
project. It does not deliver the full Projects product area. Phase 3 owns the project list,
status lifecycle, workbench, todos, milestones, activity, and launch actions. Phase 3 must
extend the Phase 2 project records rather than create a second project identity.

Out of scope for Phase 2:

- Full Overview, Projects, or Resources product surfaces.
- Project todos, milestones, activity, and launch actions.
- Resource, account, allowance, API-key, or Usage Journal work.
- Git commit history import, GitHub API integration, or broad repository integration.
- Cloud sync, multi-user collaboration, AI features, or Merlin MCP/agent integration.
- Executing MDX, raw scripts, embedded HTML, or remote document content.
- A second editor, second resizable-panel implementation, or competing sync protocol.
- Real crash/power-loss guarantees. Deterministic interruption tests are required; they do not
  prove physical durability.

## 3. Reused foundations and invariants

Phase 2 reuses the existing Phase 0–1 foundations:

- `AppDatabase` with bundled SQLite, WAL, foreign keys, busy timeout, and append-only Refinery
  migrations.
- `RegisteredRoot` canonicalization and ancestry checks; SHA-256 helpers.
- The persisted `sync_operations` state machine and atomic same-directory replacement proof.
  It is a primitive, not yet a Docs synchronizer.
- `RootWatcher` (notify) as a reconciliation hint, never as truth.
- DPAPI-wrapped AES-256-GCM proof. It must become a versioned production envelope before
  private attachments are accepted.
- Milkdown with exact-round-trip gating and fail-closed source fallback.
- The sanitized, capability-free document renderer.
- Typed Tauri commands, content-free errors, test-harness separation, and production packaging
  guards.

Non-negotiable invariants:

- Repository Markdown files are the primary working copy when a repository is available.
- The Project Store backup is separate and is never presented as a competing primary editor.
- No file is overwritten unless the destination still matches the expected baseline.
- Absence is not deletion. Branch changes and missing files pause propagation.
- No document content enters logs, the Usage Journal, or ordinary SQLite rows. Version and
  recovery snapshots are files with metadata only, as permitted by `ARCHITECTURE.md`.
- No renderer capability, Tauri binding, or remote fetch is exposed to document content.
- No browser storage. No background polling. Watch only the registered Docs root.

## 4. Milestone sequence

| #      | Milestone                                                       | User-visible outcome                                                                                                  | Depends on                 |
| ------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| P2-M1  | Project identity, registration, and Project Store foundation    | Register a project, connect an optional repository, confirm/create/skip a Docs root, and see the Docs entry point     | Phase 1 M4; approved scope |
| P2-M2  | Docs manifest and read-only source browser                      | Browse the confirmed Docs tree and open Markdown read-only with a sanitized preview or source fallback                | P2-M1                      |
| P2-M3  | Backup enrollment and baseline                                  | A verified Project Store backup and a last-synced baseline exist; backup state is visible                             | P2-M2                      |
| P2-M4  | Editor, autosave, revisions, and offline active-copy editing    | Edit the repository copy, or the backup when the repository is unavailable; receive revisions and save-state feedback | P2-M3                      |
| P2-M5  | Watcher, reconciliation detection, and Git context              | External changes, missing files, and branch/HEAD changes become visible without automatic propagation                 | P2-M4                      |
| P2-M6  | Three-way propagation and conflict records                      | Non-conflicting changes propagate safely; divergent changes create conflicts and never overwrite                      | P2-M5                      |
| P2-M7  | Conflict resolution and recovery surface                        | Resolve conflicts explicitly with both versions accessible; recovery-required operations are actionable               | P2-M6                      |
| P2-M8  | Deletion, tombstones, trash, branch and reconnect safety        | Delete/restore safely; branch switches and reconnect do not resurrect or silently delete files                        | P2-M7                      |
| P2-M9  | Attachments and shared/private assets                           | Reference public `docs/assets/` files and store private attachments with encrypted managed copies                     | P2-M8                      |
| P2-M10 | Sensitive-data detection, redaction, quarantine, and purge      | Unredacted secrets are refused; exposed managed attachments can be quarantined and purged everywhere Merlin controls  | P2-M9                      |
| P2-M11 | Fault injection, restart, accessibility, and Phase 2 acceptance | Phase 2 passes its complete recovery, security, accessibility, Windows, and packaging gates                           | P2-M1–M10                  |

Eleven milestones are intentional. Each can be implemented, tested, and committed without
requiring the next milestone. If a milestone proves too broad during implementation, split it at
the stated commit boundary; do not merge verification or skip the acceptance gate.

## 5. Milestone details

### P2-M1 — Project identity, registration, and Project Store foundation

**Objective and user-visible outcome**

A user can create a stable Merlin project, optionally connect an existing local repository, and
explicitly confirm a Docs root. The project has a deterministic Merlin Project Store directory
and a Docs entry point. No document is copied, edited, or synchronized yet.

**Scope**

- Add a minimal project record with a stable UUID and name/description/status/timestamps.
- Add one optional repository connection per project with canonical local path, optional remote
  identity, optional default branch, last observed HEAD/branch, connection status, and
  last-reconciled timestamp.
- Add one primary Docs root per project. Detect a root-level `docs/` directory when present and
  ask for confirmation. If absent, offer only: create `docs/`, choose an existing folder, or skip
  for now. Never create a repository folder silently.
- Allow a project without a repository and use the Project Store as its document home.
- Create the Project Store layout atomically under the app data directory:
  `project-store/<project-id>/` with `docs/`, `versions/`, `trash/`, `attachments/`, `previews/`,
  `recovery/`, and `exports/`. Create only the directories required by the current operation;
  never place them inside the repository.
- Add a minimal Projects destination limited to project creation/selection and Docs
  registration status. Reuse the M4 shell, navigation, and minimal controls; do not add a settings
  screen, theme picker, or new settings key. Full project lifecycle/workbench UI remains Phase 3.
- Re-registration must offer an explicit reconnect to the existing project when the same local
  path or remote identity is encountered. Do not silently create duplicates.

**Exclusions**

- No document copy, manifest, editor, watcher, sync, conflict, deletion, version, or attachment
  import.
- No project status transitions beyond the initial value, no workbench, todos, milestones,
  activity, launch actions, or resource allocation.
- No Git commit import or GitHub integration.

**Dependencies**

- Phase 1 M4 product shell, navigation, and minimal common controls (Button, Input, Textarea,
  Label, Dialog).
- The M4 decision that sidebar width is session-only; P2-M1 must not assume or add sidebar-width
  persistence.
- Explicit approval of the minimal Phase 2 project/repository boundary (outstanding; see §6.2).

**Expected data-model and migration changes**

Append-only V3 migration (expected):

- `projects`: `id`, `name`, `description`, `status`, `created_at`, `updated_at`.
- `repository_connections`: `id`, `project_id`, canonical local path, nullable remote identity,
  nullable default branch, nullable last observed HEAD/branch, connection status,
  last reconciled timestamp.
- `docs_roots`: `id`, `project_id`, root kind (`repository` or `project_store`), relative path,
  status, timestamps. Enforce one primary root per project.
- Foreign keys and indexes for project, path, and status lookups. Preserve V1/V2 byte-for-byte.

**Native/backend responsibilities**

- Project/repository/docs-root repositories with parameterized SQL.
- Typed commands for create/list/select, repository connection, Docs-root detection,
  confirmation/creation, and Project Store status.
- Canonicalize and validate every path; reject traversal, non-directories, escaping links, and
  paths outside the selected repository.
- Content-free errors. No generic filesystem command.

**Frontend responsibilities**

- Minimal project registration and selection surface; Docs-root confirmation dialog; create/
  choose/skip actions with clear consequences. Reuse the M4 controls (Button, Input, Textarea,
  Label, Dialog) rather than adding a second control stack.
- Repository-unavailable and Docs-root-missing states.
- Keyboard operation, visible focus, accessible names, and dialog focus management.
- No fabricated activity or placeholder data presented as real.

**Security and data-loss risks**

- Attaching a repository to the wrong project or creating duplicate projects.
- Path traversal, junction/symlink escape, or writing the Project Store into a repository.
- Silently creating `docs/` when the user declined.
- Storing a path as identity and breaking on move/rename.
- Mitigations: stable UUID, canonical paths, explicit confirmation, reconnect comparison, no
  destructive action, and no file writes outside the registered roots.

**Required automated tests and verification checkpoints**

- V2→V3 migration, idempotent reopen, V1/V2 history preservation.
- Stable project ID across restart; duplicate/reconnect detection.
- Canonicalization, traversal, symlink/junction escape, non-directory, and outside-repository
  rejection.
- No silent folder creation; one primary Docs root; create/choose/skip paths.
- Project Store directory creation idempotence and cross-project isolation.
- No browser storage, no secret-like values in errors, keyboard/dialog accessibility, and no
  sidebar-width persistence assumption.

**Acceptance criteria**

- A project with and without a repository can be registered and survives restart.
- A repository Docs root is confirmed or explicitly skipped; no folder is created without
  consent.
- The Project Store layout is deterministic and confined to app data.
- Re-registration does not silently duplicate a project.
- Phase 1 gates and hosted CI remain green.

**Expected commit boundary**

One milestone commit, for example `feat: add project and docs registration foundation`, containing
the V3 migration, native repositories/commands, minimal UI, tests, and documentation. Do not begin
P2-M2 in the same commit.

---

### P2-M2 — Docs manifest and read-only source browser

**Objective and user-visible outcome**

A user can browse the confirmed Docs root as a file tree, see folders and Markdown files, and open
a document read-only. Supported Markdown renders through the sanitized renderer; unsupported
constructs open in source mode. No file is written.

**Scope**

- Scan only the confirmed Docs root, recursively, with a bounded file count/size policy. Include
  `docs/personal/` even when Gitignored. Exclude `.git` internals.
- Persist a file manifest with relative path, file identity, kind, size, mtime, raw SHA-256,
  encoding, and Markdown feature flags. Use raw bytes for hashing.
- Support Markdown-family text files (`.md`, `.markdown`; `.mdx` is source-only). List other
  regular files as attachments/unsupported entries without opening them in the Markdown editor.
- Read a file only through the registered root; enforce canonicalization, regular-file checks,
  size limits, and UTF-8 validity. Preserve BOM and CRLF in source mode. Do not silently truncate.
- Add the Docs tree/folders and recent-document view to the minimal Phase 2 project surface.
- Render sanitized preview with the existing policy: no script/HTML execution, no MDX execution,
  no remote image fetch, inert Mermaid, disabled task inputs, no Tauri capabilities.
- Show source fallback for frontmatter, HTML, MDX, images, CRLF, custom containers, invalid
  encoding, and any measured round-trip drift.

**Exclusions**

- No create/rename/delete/save, autosave, revision, watcher, sync, conflict, trash, or attachment
  import.
- No editing of binary files or non-Markdown formats.
- No whole-repository scan.

**Dependencies**

- P2-M1.

**Expected data-model and migration changes**

Append-only V4 migration (expected):

- `docs_files`/manifest table with project, root, relative path, kind, size, mtime, raw hash,
  encoding, feature flags, last seen timestamp, and status.
- Unique identity per project/root/path; indexes for tree and hash lookups.

**Native/backend responsibilities**

- Bounded tree scan and manifest upsert; no watcher yet.
- Confined read command returning source and metadata; no path supplied by the renderer without
  validation.
- Hash and encoding utilities; content-free errors.
- Do not log document contents.

**Frontend responsibilities**

- File tree and folder display; selected-file state; recent documents from the manifest.
- Read-only preview/source toggle; loading, empty, unsupported, and error states.
- Keyboard tree navigation, accessible names, focus restoration, and screen-reader semantics.

**Security and data-loss risks**

- Path traversal or symlink escape through a crafted manifest or path.
- Hostile HTML/MDX or remote images executing or fetching during preview.
- Treating an unreadable/large/binary file as empty or deleting it from the manifest.
- Encoding normalization losing BOM/CRLF or unsupported bytes.
- Mitigations: raw-byte hashing, confined reads, fail-closed source mode, size/encoding errors,
  and no write path.

**Required automated tests and verification checkpoints**

- Tree/manifest correctness, restart persistence, nested folders, `docs/personal`, and ignored
  files.
- Traversal, symlink/junction, outside-root, non-regular-file, large-file, invalid-UTF-8, BOM, and
  CRLF fixtures.
- Hostile HTML/MDX non-execution, zero remote requests, inert Mermaid, sanitizer allowlist, and
  no document Tauri capability.
- Keyboard tree navigation and axe checks.

**Acceptance criteria**

- The tree matches the confirmed root without scanning outside it.
- Opening a supported document is byte-exact in source mode and shows the correct feature mode.
- Unsupported constructs remain readable as inert source and are never executed.
- No write, rename, delete, watcher, or sync occurs.

**Expected commit boundary**

One milestone commit, for example `feat: add read-only docs manifest and browser`, including the
V4 migration, scanner/reader, read-only UI, tests, and documentation.

---

### P2-M3 — Backup enrollment and baseline

**Objective and user-visible outcome**

Merlin creates a verified Project Store backup of the confirmed Docs root and records a
last-synced baseline. The user can see whether the backup is current, unavailable, or awaiting
reconciliation. No editing or propagation occurs yet.

**Scope**

- Create the Docs Backup under `project-store/<project-id>/docs/`, mirroring relative paths.
- Copy through same-directory staging, verify the copied hash, and only then publish the backup
  file. Do not overwrite an existing divergent backup silently.
- Persist a backup manifest and a baseline per file containing the repository hash, backup hash,
  repository HEAD/branch context when available, and timestamps. A baseline exists only when both
  sides have been verified.
- For a project without a repository, establish a store-only document root with no repository
  baseline.
- If the repository is unavailable at enrollment, offer an explicit store-only/deferred path; do
  not fabricate a baseline.
- Show backup state (not created, current, stale, unavailable, recovery required) and allow a
  manual "refresh backup" only through the safe copy protocol.
- Keep the backup read-only in this milestone.

**Exclusions**

- No editor, autosave, revision history, watcher, three-way propagation, conflict resolution,
  deletion, trash, or attachments.
- No automatic background copy or polling.

**Dependencies**

- P2-M2.

**Expected data-model and migration changes**

Append-only V5 migration (expected):

- `last_synced_baselines` keyed by project/file with repository and backup hashes, context,
  state, and timestamps.
- Backup-side manifest metadata or a side discriminator on the existing manifest.
- No baseline for an unverified or unavailable side.

**Native/backend responsibilities**

- Backup enrollment/copy command using staging, hash verification, and atomic publication.
- Baseline repository/service; idempotent refresh; recovery for interrupted copy.
- Confinement to the Project Store and the registered repository root.
- Preserve existing backup files when the repository version is unavailable or divergent.

**Frontend responsibilities**

- Backup status and manual refresh action.
- Clear unavailable/deferred state; no false claim that a backup is current.
- Accessible status announcements and confirmation for a refresh that would replace a stale
  backup.

**Security and data-loss risks**

- Overwriting a divergent backup or marking a baseline before both hashes verify.
- Copying outside the Project Store or following a link into the repository.
- Treating an unavailable repository as an empty repository.
- Mitigations: staged copy, dual hash verification, no baseline on failure, explicit status, and
  no deletion.

**Required automated tests and verification checkpoints**

- Enrollment with an available repository; store-only project; unavailable repository.
- Existing divergent backup; existing identical backup; interrupted copy at each stage.
- Baseline idempotence, restart persistence, hash mismatch, path confinement, and link escape.
- No baseline creation when either side is unverified.

**Acceptance criteria**

- A verified backup exists for a connected repository, or the UI clearly states why it does not.
- The baseline is recorded only after both hashes verify.
- A divergent backup is preserved and surfaced, never overwritten.
- Restart preserves backup and baseline state.

**Expected commit boundary**

One milestone commit, for example `feat: add docs backup and baseline`, including the V5
migration, copy/baseline services, status UI, tests, and documentation.

---

### P2-M4 — Editor, autosave, revisions, and offline active-copy editing

**Objective and user-visible outcome**

A user can open a Markdown document in a dedicated full-size editor, edit with Milkdown when the
source has an exact measured round trip, or use source mode otherwise. Autosave and Ctrl+S save the
active copy with saved/unsaved/saving/error feedback. Every save creates a bounded revision.

**Scope**

- Add the dedicated Docs editor surface and file/folder creation actions. Selecting a file opens
  the editor, not an editor squeezed into a panel.
- Use Milkdown only for sources with an exact measured round trip. Preserve frontmatter, code
  fences, Mermaid, tables, task lists, HTML/MDX, links/images, CRLF, and unsupported syntax through
  source fallback. Never rewrite unsupported constructs during an unrelated edit.
- Save only the active copy: repository when available, backup when the repository is unavailable
  or the project is store-only. Record which side was edited. Do not advance the baseline or
  propagate to the other side in this milestone.
- Before replacement, verify the active copy still matches the hash observed when it was opened or
  last saved. If it changed externally, do not overwrite; keep the editor buffer and create a
  recovery/blocked-save record that M5/M6 can surface.
- Write through same-directory staging, verify the intended hash, atomically replace, re-read, and
  only then report saved. Preserve the previous content as a revision before replacement.
- Retain the latest 30 revisions per file, content-hash deduplicated. Autosave keystrokes do not
  each create a revision. Create checkpoints before destructive or conflict operations in later
  milestones.
- Autosave approximately one second after idle; Ctrl+S saves immediately. Show
  saved/unsaved/saving/error and backup-pending state. Do not claim the backup is current.
- Create-file/folder actions use atomic creation and never overwrite an existing path.

**Exclusions**

- No watcher, external reconciliation, three-way propagation, conflict resolution, deletion,
  trash, or attachments.
- No Git commit activity.
- No automatic save of unsupported syntax through a lossy editor.

**Dependencies**

- P2-M3; baseline and backup state must exist before editing.
- Existing Milkdown exact-round-trip gate and sanitized renderer.

**Expected data-model and migration changes**

Append-only V6 migration (expected):

- `file_versions`: project/file, side, content hash, storage reference, reason/checkpoint,
  pinned flag, created timestamp; dedupe by hash; bounded retention.
- A blocked-save/recovery record or an operation-kind extension that M6 can consume.
- No document content in ordinary SQLite rows; revision payloads stay in Project Store files.

**Native/backend responsibilities**

- Typed save/create commands with expected-hash validation, staging, atomic replacement,
  post-write verification, and revision snapshot.
- Active-copy resolution (repository vs backup) without treating unavailability as empty.
- Confinement, size limits, content-free errors, and no generic write command.
- Preserve the editor buffer/recovery snapshot if the destination changed or the write fails.

**Frontend responsibilities**

- Editor host, rich/source mode selection, autosave controller, Ctrl+S, dirty-state guard, and
  status announcements.
- Create file/folder dialog with validation and conflict-safe errors.
- Accessible editor name, keyboard focus, focus-within boundary, and reduced-motion behavior.
- No business logic or persistence in the editor component.

**Security and data-loss risks**

- Lossy Milkdown serialization rewriting unsupported syntax.
- Overwriting an external edit because the expected hash was not checked.
- Partial write or crash between repository and revision updates.
- Autosave races, duplicate revisions, unbounded storage, or silently truncating large files.
- Stale backup being mistaken for a current backup.
- Mitigations: exact round-trip gate, source fallback, expected-hash checks, staged/verified atomic
  writes, pre-write revision, bounded dedupe, explicit backup-pending status, and no automatic
  overwrite.

**Required automated tests and verification checkpoints**

- Round-trip fixtures for canonical Markdown, GFM, Mermaid, frontmatter, HTML, MDX, images, CRLF,
  and custom containers.
- Save exactness, source-mode byte preservation, unsupported-syntax no-rewrite, and file create/
  folder create collision handling.
- External change before save, changed destination after intent, simulated failure at staged/
  replacing/verified, restart recovery, and no silent overwrite.
- Autosave debounce, Ctrl+S, dirty guard, revision retention/dedupe/pinning, and large-file errors.
- Editor keyboard/focus/a11y and real WebView2/Chromium checks.

**Acceptance criteria**

- Supported documents edit and save with an exact round trip; unsupported documents remain
  byte-exact in source mode.
- Autosave and Ctrl+S behave as specified and show accurate state.
- A changed active copy blocks the write and preserves both the editor buffer and the previous
  content.
- Revisions are bounded, deduplicated, and survive restart.
- Editing a backup while the repository is unavailable works; the UI clearly marks reconciliation
  as pending.

**Expected commit boundary**

One milestone commit, for example `feat: add source-preserving docs editor and revisions`,
including the V6 migration, editor/save/revision services, UI, tests, and documentation.

---

### P2-M5 — Watcher, reconciliation detection, and Git context

**Objective and user-visible outcome**

Merlin detects external edits, additions, and possible deletions in the registered Docs root and
shows them as reconciliation candidates. It also detects repository HEAD/branch changes and pauses
automatic propagation. It does not write files in this milestone.

**Scope**

- Watch only the confirmed Docs root recursively. Debounce events; treat events and watcher errors
  as hints.
- Reconcile manifests at startup, after resume, on repository reconnect, after watcher overflow/
  error, on explicit request, and after a detected HEAD/branch change.
- Compare current files and hashes to the manifest/baseline. Classify added, modified, missing,
  and branch-context changes. A missing file is ambiguous, not a deletion.
- Record last observed repository HEAD and branch in the repository connection and Docs-root state.
  A changed HEAD/branch pauses automatic propagation and requires an explicit reconciliation view.
- Add a read-only "pending changes" list/status and an explicit refresh action.
- Do not propagate any change in this milestone.

**Exclusions**

- No automatic or manual copy between repository and backup.
- No conflict resolution, deletion/tombstone/trash, branch reconciliation actions, attachments, or
  resource work.
- No whole-repository watcher or polling loop.

**Dependencies**

- P2-M4; manifests and baselines are stable.
- A decision on the read-only Git context mechanism (§6).

**Expected data-model and migration changes**

Append-only V7 migration (expected):

- Docs-root/repository context state: last observed HEAD, branch, last reconciliation status/time.
- Reconciliation runs or scan metadata; manifest status for pending changes.
- No new destructive action.

**Native/backend responsibilities**

- Watcher lifecycle and debounce; reconciliation scan; hash/manifest updates.
- Read-only Git context lookup with fixed arguments or a narrowly scoped parser; no shell string,
  no user-controlled arguments, no network.
- Pause state when context is missing, detached, changed, or unreadable.
- No file mutation.

**Frontend responsibilities**

- Pending-change list/status, refresh action, branch-pause banner, and error/overflow states.
- Explain that a missing file is not yet a deletion.
- Keyboard and screen-reader access to the status and list.

**Security and data-loss risks**

- Treating a watcher event or missing file as proof of deletion.
- Missing a rapid change or watcher overflow and silently assuming no change.
- Misidentifying a branch (worktree, detached HEAD, missing Git) and propagating against the wrong
  context.
- Event storms or idle CPU use.
- Mitigations: hashes as truth, explicit ambiguity, debounce, bounded scans, and pause on context
  uncertainty.

**Required automated tests and verification checkpoints**

- External edit/addition detection; missing-file ambiguity; watcher error/overflow; startup/
  resume/restart.
- Branch switch, detached HEAD, missing `.git`, unavailable repository, and reconnected context.
- No file writes during reconciliation.
- Debounce/idle behavior and no whole-repository scan.

**Acceptance criteria**

- External changes appear as candidates without overwriting either copy.
- Missing files are surfaced as ambiguous, not deleted.
- A HEAD/branch change pauses automatic propagation and requires reconciliation.
- Watcher errors/overflow trigger a safe reconciliation request.

**Expected commit boundary**

One milestone commit, for example `feat: add docs watcher and reconciliation detection`,
including the V7 migration, watcher/context services, status UI, tests, and documentation.

---

### P2-M6 — Three-way propagation and conflict records

**Objective and user-visible outcome**

Non-conflicting changes propagate safely between the repository and backup using the last-synced
baseline. Divergent changes produce a conflict record with both versions preserved. No divergent
copy is overwritten.

**Scope**

- Extend and reuse the persisted sync-operation protocol; do not create a second sync engine.
- Compare baseline, repository, and backup for each file:
  - only repository changed: propagate repository → backup after destination validation;
  - only backup changed: propagate backup → repository after destination validation;
  - both changed identically: mark synchronized;
  - both changed differently: create a conflict and write neither side.
- Before every write, verify the destination still matches the expected baseline. If not,
  re-evaluate and create a conflict/recovery state rather than overwrite.
- Persist operation intent, expected source/destination/result hashes, repository context, staging
  reference, state, and recovery detail. Use staged writes, atomic replacement, post-write
  verification, and baseline commit only after verification.
- Recover every incomplete operation at startup/resume before normal propagation.
- Add conflict records with repository version, backup version, base version, hashes, and status.
  This milestone lists conflicts but does not provide resolution actions.
- Checkpoint versions before propagation or conflict creation.

**Exclusions**

- No keep-repo/keep-backup/compare/save-both resolution actions (P2-M7).
- No deletion/tombstone/trash, branch-resurrection logic, attachments, or resource work.
- No automatic resolution of a divergent change.

**Dependencies**

- P2-M5; manifests, baselines, and branch context are established.
- The baseline/recovery model must be stable before this milestone.

**Expected data-model and migration changes**

Append-only V8 migration (expected):

- Extend `sync_operations` with project/file/root identity, baseline reference, operation kind,
  and repository context as needed.
- `sync_conflicts`: project/file, repository hash/path, backup hash/path, base hash, context,
  status, timestamps.
- Foreign keys and indexes; preserve existing proof columns and tests where practical.

**Native/backend responsibilities**

- Three-way planner and propagation service; explicit pending/conflict/recovery results.
- Destination baseline validation before staging and replacement; snapshot preservation.
- Idempotent baseline commit; recovery for prepared/staged/replacing/verified states.
- No document content in logs or ordinary SQLite rows.

**Frontend responsibilities**

- Sync status, pending counts, conflict list, and recovery-required status.
- No resolution buttons yet; conflict details must still be accessible read-only.
- Accessible announcements and error states.

**Security and data-loss risks**

- Silent overwrite of a divergent or externally changed destination.
- Committing a baseline against the wrong branch or after a failed write.
- Partial propagation, stale staging/snapshot files, or duplicate operations.
- Conflict records that lose one side's bytes.
- Mitigations: expected-hash checks, staged/verified replacement, branch context, recovery states,
  and immutable conflict snapshots.

**Required automated tests and verification checkpoints**

- All four three-way cases; both-sides-identical; destination drift before prepare/stage/replace.
- Interruption after prepared, staged, replacing intent, replacement, and verified; restart
  recovery and idempotent commit.
- Branch/HEAD change before and during an operation; wrong-context pause.
- Conflict preservation (both bytes recoverable), no baseline commit on failure, and no silent
  overwrite.
- Large/binary/unsupported files are not propagated as Markdown.

**Acceptance criteria**

- Non-conflicting changes propagate in the correct direction with verified hashes.
- Divergent changes create a conflict and leave both copies untouched.
- Interrupted operations recover without losing either side.
- No baseline advances without a verified destination and matching context.

**Expected commit boundary**

One milestone commit, for example `feat: add docs three-way reconciliation`, including the V8
migration, planner/propagation/recovery services, conflict list UI, tests, and documentation.

---

### P2-M7 — Conflict resolution and recovery surface

**Objective and user-visible outcome**

A user can inspect both sides of a conflict and choose Keep repository version, Keep backup
version, Compare and resolve, or Save both as separate copies. Recovery-required operations are
explained and can be retried or replanned without silent loss.

**Scope**

- Dedicated conflict-resolution surface with repository version, backup version, base version,
  hashes, context, and safe preview/source access.
- Resolution actions are typed and validated against the conflict's expected hashes. A changed
  side invalidates the resolution and requires re-evaluation.
- Before resolution, create checkpoints. After a verified write, advance the baseline; otherwise
  preserve both copies and remain in recovery/conflict state.
- "Save both" creates two distinct recoverable paths without overwriting either original.
- Recovery-required operations show their state, preserved copies, and safe next actions. Do not
  offer an action that deletes the only copy.
- Keep unresolved conflicts until resolved; no automatic pruning.

**Exclusions**

- No deletion/tombstone/trash, branch resurrection, reconnect workflow, attachments, or sensitive
  data handling.
- No bulk auto-resolution.

**Dependencies**

- P2-M6.

**Expected data-model and migration changes**

Append-only V9 migration (expected):

- Conflict resolution metadata/audit: chosen action, actor/timestamp, resulting hashes, status.
- No document content in audit rows.

**Native/backend responsibilities**

- Typed resolution command with expected-hash validation, checkpoint, atomic verified write, and
  baseline update.
- Recovery actions that preserve all copies and revalidate context.
- Content-free errors; no path supplied directly by the renderer.

**Frontend responsibilities**

- Side-by-side or toggleable version inspection; source/preview access; explicit action labels.
- Keyboard operation, focus management, accessible conflict status, and confirmation for
  destructive-looking choices.
- Clear unresolved/error states.

**Security and data-loss risks**

- Choosing a stale version or applying a resolution after a side changed.
- Losing the non-chosen side when "Save both" is selected.
- Committing a baseline after a failed resolution write.
- Ambiguous recovery actions that delete copies.
- Mitigations: expected-hash validation, checkpoints, both-copy preservation, and no automatic
  deletion.

**Required automated tests and verification checkpoints**

- Each resolution action; changed side after opening; stale conflict; restart mid-resolution.
- Both-copy preservation; baseline advancement only after verification; no overwrite.
- Recovery-required operation retry/replan paths and refusal of unsafe actions.
- Accessibility of the conflict surface and keyboard focus restoration.

**Acceptance criteria**

- All four conflict actions are available and safe.
- No resolution overwrites a changed side or loses the non-chosen version.
- Recovery-required operations are understandable and do not require guessing.
- Unresolved conflicts remain until explicitly resolved.

**Expected commit boundary**

One milestone commit, for example `feat: add docs conflict resolution`, including the V9
migration, resolution/recovery services, UI, tests, and documentation.

---

### P2-M8 — Deletion, tombstones, trash, branch and reconnect safety

**Objective and user-visible outcome**

Deleting a document is recoverable. External deletion and branch changes never cause automatic
file deletion or resurrection. Reconnecting a repository does not create duplicates or attach it
to the wrong project.

**Scope**

- Explicit deletion creates a tombstone and a recoverable trash entry, retains a version
  checkpoint, and removes the active copy only after the trash/checkpoint is durable.
- Trash retention is 30 days. Restore and export are available. Permanent purge requires explicit
  confirmation and must not remove the only recoverable copy without warning.
- External deletion/disappearance produces a recoverable snapshot and a reconciliation prompt. It
  is never inferred from absence alone.
- Record repository HEAD/branch context. A branch/HEAD change pauses automatic propagation, retains
  backup and baseline, refreshes the manifest, and presents reconciliation before any write.
- A file that existed only on the previous branch is never recreated automatically; treat it as
  branch-state ambiguity or a conflict.
- Reconnect compares local path, remote identity, Docs configuration, manifest, HEAD, and branch.
  Require explicit confirmation. A deleted local repository does not delete the Merlin project.
- Keep `docs/personal/` included even when Gitignored.

**Exclusions**

- No attachments, sensitive-data purge, or resource work.
- No automatic branch merge, rebase, or Git history rewriting.

**Dependencies**

- P2-M7.

**Expected data-model and migration changes**

Append-only V10 migration (expected):

- `deletion_tombstones`: project/file/path, context, deleted timestamp, reason, status.
- `trash_entries`: original path, stored payload reference, hash, deleted timestamp, purge-after,
  restore status.
- Repository connection/docs-root context fields for reconnect/branch state, if not already added.

**Native/backend responsibilities**

- Trash/tombstone/restore/purge services with confinement and atomic moves/copies.
- Branch/HEAD context comparison; pause state; reconnect validation.
- Never delete based on watcher events or missing files.
- Content-free audit metadata.

**Frontend responsibilities**

- Delete confirmation; Trash view; restore/export/purge actions.
- Branch-switch and reconnect dialogs with clear consequences.
- Keyboard/a11y and status announcements for missing/deleted/paused states.

**Security and data-loss risks**

- Treating a missing drive, branch switch, or fresh clone as deletion.
- Resurrecting a previous-branch file.
- Purging trash that is the only copy.
- Reconnecting the wrong repository to a project.
- Mitigations: tombstones, snapshots, explicit confirmation, branch pause, reconnect comparison,
  and retention.

**Required automated tests and verification checkpoints**

- Explicit delete → tombstone/trash/version → restore; purge-after-retention.
- External deletion, disconnected drive, fresh clone, branch switch, only-previous-branch file.
- Branch switch before/during an operation; reconnect with matching/mismatching path, remote,
  Docs config, HEAD, branch.
- Restart recovery; no automatic resurrection; no duplicate project.
- Accessibility of delete/restore/reconnect dialogs.

**Acceptance criteria**

- Explicit deletion is recoverable for 30 days.
- External deletion and branch changes pause rather than delete or resurrect.
- Reconnect requires confirmation and does not duplicate projects.
- A deleted repository leaves the Merlin project intact.

**Expected commit boundary**

One milestone commit, for example `feat: add docs deletion and branch recovery`, including the V10
migration, trash/reconnect services, UI, tests, and documentation.

---

### P2-M9 — Attachments and shared/private assets

**Objective and user-visible outcome**

Users can reference repository-shared assets under `docs/assets/` and import private attachments
into the Project Store. Private attachment payloads and managed derivatives are encrypted at rest;
referenced files are not deleted while other references remain.

**Scope**

- Public/repo-shared assets live under `docs/assets/` and are referenced from Markdown with
  confined relative paths.
- Private attachments live in the Project Store outside the repository. Store metadata in SQLite;
  keep payloads as managed files.
- Support multiple references per attachment. Removing one reference does not delete the payload
  while other references remain.
- Deduplicate managed payloads by content hash. Preserve original display names/metadata.
- Replace the Phase 0 proof envelope with a versioned production envelope: DPAPI-wrapped AES-256-
  GCM key, nonce, ciphertext, format version, and attachment/derivative context. No plaintext
  fallback. If OS protection is unavailable, block the sensitive import and explain why.
- Encrypt private attachment payloads and managed derivatives (previews/thumbnails/versions) at
  rest. Keep document Markdown references non-secret.
- Provide a manual export with a warning that Merlin cannot recall an exported copy. Remove
  unencrypted temporary export material.
- Preview only supported safe types through the capability-free renderer; do not fetch remote
  attachment URLs.

**Exclusions**

- No secret detection/redaction/quarantine/purge (P2-M10).
- No resource/account attachment UI (Phase 4 may reuse the service).
- No cloud upload, external sharing, or automatic LLM submission.

**Dependencies**

- P2-M8; document references and trash/recovery exist.
- Approved production attachment envelope/key-lifecycle decision (§6).

**Expected data-model and migration changes**

Append-only V11 migration (expected):

- `attachments`: project, classification (shared/private), content hash, storage reference,
  encryption format/version, size, MIME/type, created timestamp.
- `attachment_references`: attachment, owner type/id or document path, created timestamp.
- `attachment_derivatives`: attachment, derivative kind, storage reference, encryption metadata.
- No raw secret or payload bytes in SQLite.

**Native/backend responsibilities**

- Confined import/read/export, hash/dedupe, reference counting, encryption/decryption, and
  derivative storage.
- Versioned envelope parsing with fail-closed behavior; no plaintext fallback.
- Purge only unreferenced payloads; preserve referenced files.
- Content-free errors and no document/attachment payload logging.

**Frontend responsibilities**

- Attachment list, insert-reference action, safe preview, and export warning.
- Clear encrypted/unavailable/unsupported states.
- Keyboard/a11y and confirmation for removal/export.

**Security and data-loss risks**

- Path traversal or symlink escape during import/export.
- Plaintext attachment/derivative leakage; DPAPI unavailable and silent fallback.
- Deleting a shared payload still referenced elsewhere.
- Exporting sensitive data without warning.
- Mitigations: confinement, encryption, reference counting, explicit export warning, and no
  plaintext fallback.

**Required automated tests and verification checkpoints**

- Import/read/export confinement; hash dedupe; multiple references; removal/ref-count behavior.
- Encryption/decryption, tamper rejection, missing DPAPI, no plaintext fallback, and versioned
  envelope round trip.
- Derivatives encrypted; export cleanup; restart recovery; orphan handling.
- Safe preview/no remote fetch; accessibility.

**Acceptance criteria**

- Shared assets are referenced only inside registered roots.
- Private attachments and derivatives are encrypted at rest with no plaintext fallback.
- Removing one reference does not delete a still-referenced payload.
- Export warns and leaves no unencrypted temporary material.

**Expected commit boundary**

One milestone commit, for example `feat: add docs attachments and encrypted asset storage`,
including the V11 migration, attachment/crypto services, UI, tests, and documentation.

---

### P2-M10 — Sensitive-data detection, redaction, quarantine, and purge

**Objective and user-visible outcome**

Unredacted secrets are refused at attachment import. If an exposed attachment was already
imported, the user can quarantine it, rotate the secret, and purge every managed copy Merlin
controls, without silently modifying external repository files or completed exports.

**Scope**

- Require an explicit redaction confirmation before importing screenshots/evidence that may
  contain secrets.
- Run local detection for full API keys, passwords, recovery codes, and similarly sensitive
  patterns. If detected, refuse the import and require a redacted replacement. Detection is
  conservative and explainable; it is not a guarantee that all secrets are found.
- If a secret is reported or detected after import: quarantine the managed attachment from
  rendering, sharing, and export; instruct the user to rotate/revoke it; purge active copies,
  previews, thumbnails, versions, backup copies, trash, and pending exports.
- Do not silently rewrite an external repository copy or retract an already completed external
  export. Identify the known external location and require the user to redact/remove it there.
- Record content-free quarantine/purge audit metadata. Do not log the secret or attachment payload.
- Explain DPAPI/profile recovery limits and the limits of secure deletion.

**Exclusions**

- No automatic provider key testing, network validation, or external upload.
- No AI/LLM submission.
- No claim that redaction detection is exhaustive.

**Dependencies**

- P2-M9.

**Expected data-model and migration changes**

Append-only V12 migration (expected):

- Attachment classification/quarantine state, purge status, and content-free audit records.
- No secret material or payload bytes in SQLite or logs.

**Native/backend responsibilities**

- Local detector with bounded patterns; refusal and content-free diagnostics.
- Quarantine/purge across managed storage, versions, trash, previews, and pending exports.
- Encryption-aware deletion; preserve external files; report what could not be purged.
- No secret logging, crash-report inclusion, or error reflection.

**Frontend responsibilities**

- Redaction warning/confirmation at import.
- Quarantine banner and blocked render/share/export states.
- Purge flow with explicit scope, rotation guidance, external-copy warning, and completion report.
- Keyboard/a11y and clear destructive-action confirmation.

**Security and data-loss risks**

- False negatives leaving a secret; false positives blocking a safe file.
- Secret leaking into logs, SQLite, a preview, a version, trash, or an export.
- Incomplete purge across derivatives or backups.
- Accidentally modifying an external repository copy.
- Mitigations: local-only detection, content-free diagnostics, quarantine before purge, complete
  managed-copy inventory, explicit external warning, and no automatic external writes.

**Required automated tests and verification checkpoints**

- Synthetic API-key/password/recovery-code fixtures; refusal and redacted replacement.
- Quarantine blocks render/share/export.
- Purge removes active copy, previews, thumbnails, versions, trash, backup copy, and pending export.
- No secret in SQLite, logs, errors, or journal; external repository bytes unchanged.
- DPAPI unavailable behavior and restart recovery; accessibility.

**Acceptance criteria**

- Unredacted secret-like imports are refused with a clear, content-free explanation.
- An exposed managed attachment can be quarantined and purged from every Merlin-controlled copy.
- External repository copies and completed exports are not silently modified.
- No secret appears in logs, errors, SQLite, or the Usage Journal.

**Expected commit boundary**

One milestone commit, for example `feat: add attachment redaction and quarantine controls`,
including the V12 migration, detector/quarantine/purge services, UI, tests, and documentation.

---

### P2-M11 — Fault injection, restart, accessibility, and Phase 2 acceptance

**Objective and user-visible outcome**

Phase 2 is proven end to end: recovery works after every simulated interruption, restart/resume
is safe, conflicts/deletions/attachments behave as specified, and the Windows build passes the
documented gates. No new product behavior is added.

**Scope**

- Run the complete fault-injection matrix across copy, save, propagation, conflict resolution,
  deletion/trash, reconnect, and purge.
- Verify startup/resume recovery before normal propagation; watcher overflow; unavailable/
  reconnected repository; branch switch before/during an operation.
- Run all frontend, native, Chromium, real WebView2, accessibility, security, production-boundary,
  and packaged Windows checks.
- Review idle behavior: no broad polling, bounded watcher scope, no whole-repository scans.
- Update `BUILD-STATUS.md`, `docs/DECISIONS.md`, and any affected architecture/security docs with
  actual results and residual limitations.
- Fix defects in separate corrective commits; do not introduce new features.

**Exclusions**

- No new product scope, dependencies, or migrations except a narrowly justified defect fix.
- No claim of real crash/power-loss durability from deterministic interruption tests.
- No signing/SmartScreen claim unless separately executed and recorded.

**Dependencies**

- P2-M1–M10.

**Expected data-model and migration changes**

None planned. If a defect requires a migration, use a separate append-only migration and record
why; do not rewrite earlier migrations.

**Native/backend responsibilities**

- Provide deterministic test hooks only behind the existing test-harness feature; production
  builds must not expose them.
- Verify recovery order, idempotence, and error mapping.
- Verify no secret/document content in logs.

**Frontend responsibilities**

- Complete keyboard/focus/ARIA regression pass for tree, editor, conflicts, delete/restore,
  attachments, quarantine, and recovery states.
- Verify reduced-motion behavior and status announcements.
- No UI-only workaround for a persistence/recovery defect.

**Security and data-loss risks**

- A passing happy-path suite hiding an untested interruption state.
- Test hooks leaking into production.
- Incomplete cleanup of staging/snapshot/trash/export material.
- Accessibility regressions in destructive flows.
- Mitigations: test-harness separation, full matrix, production-boundary scan, and a11y regression.

**Required automated tests and verification checkpoints**

- Unit: three-way classification, deletion ambiguity, branch-context checks, operation state
  transitions, hashes, rendering policy, retention.
- Integration: manifests, baselines, conflicts, operations, versions, trash, attachments, and
  typed command boundaries.
- Filesystem/recovery: interruption at prepared/staged/replacing/verified, changed destination,
  external edit, branch switch, unavailable/reconnect, startup/resume, atomic failure.
- Security: HTML/MDX non-execution, sanitizer/URL/path policy, no renderer capability, redaction
  refusal, encrypted managed copies, purge across versions/trash/previews/pending exports.
- Accessibility: tree, editor, conflict actions, source fallback, recovery errors, keyboard/focus/
  names; axe and real WebView2.
- Windows build: production-equivalent packaged build, watcher/recovery behavior, no test-harness
  binary in the package.

**Acceptance criteria**

- Phase 2 acceptance in `docs/IMPLEMENTATION-PLAN.md` is met: external edits detected, backup edits
  work while the repository is unavailable, divergent changes never overwrite, missing files are
  not automatic deletions, restart/resume recovery works, and Markdown round-trip tests pass.
- All relevant Phase 2 gates in §7 pass or are explicitly recorded as not applicable with a reason.
- No known data-loss or secret-handling issue remains undocumented.
- The final packaged build excludes test hooks and the harness.

**Expected commit boundary**

A verification/acceptance commit, for example `test: complete phase 2 recovery and acceptance`.
Corrective fixes must be separate commits before the acceptance record; do not combine new
features with acceptance.

## 6. Outstanding decisions and risks

These require explicit resolution before the affected milestone:

1. **Phase 1 M4 status.** The M4 decisions M4-D1–M4-D6, Option B, and D-070 are recorded.
   Checkpoints 1–2 are accepted; Checkpoints 3–6 are implemented and automatically verified with
   Phase 1 automated closure evidence in `BUILD-STATUS.md`. Manual Windows 11 acceptance and hosted
   CI for a pushed commit remain pending and do not block local Phase 2 implementation under D-069.
2. **Minimal Phase 2 Projects surface.** P2-M1 proposes a minimal project create/select and Docs-
   registration surface. Phase 3 will expand it into the full Projects area. If this boundary is
   not approved, Phase 2 needs a different, explicitly approved entry point.
3. **Git HEAD/branch acquisition.** Choose one: read-only fixed-argument `git.exe` invocation,
   narrow `.git` parsing, or a pinned Rust Git crate. A new dependency requires separate approval.
   The chosen mechanism must handle detached HEAD, worktrees, missing `.git`, and unavailable
   repositories without treating uncertainty as a branch match.
4. **Production attachment envelope.** The Phase 0 DPAPI/AES-GCM proof has no format version or
   context. Approve the versioned envelope, key lifecycle, recovery limits, and behavior when
   DPAPI is unavailable before P2-M9.
5. **Docs file policy.** Approve extensions (`.md`, `.markdown`, `.mdx` source-only), maximum file
   size, maximum manifest entries, encoding policy, and hidden-folder inclusion. Defaults must
   fail loudly, not truncate.
6. **Backup enrollment default.** Confirm whether backup enrollment is automatic after Docs-root
   confirmation or an explicit user action. Either way, never create a repository folder without
   consent.
7. **Conflict presentation.** Confirm whether "Compare and resolve" needs a diff view or a
   side-by-side/source comparison without a new diff dependency. Do not add a dependency without
   approval.
8. **Real durability.** Deterministic test hooks prove recovery from simulated stops, not physical
   power loss or filesystem cache loss. Any stronger claim requires separate fault-injection
   infrastructure and approval.
9. **Native local environment.** Hosted CI native is green, but this workstation's repository-local
   Rust toolchain still requires the documented process-scoped recovery. Local native verification
   must use the approved exact 1.97.1 toolchain or a separately authorized repair.
10. **Phase 2 authorization.** This plan is proposed only. No migration, dependency, product code,
    or Phase 2 implementation is authorized by this document.

## 7. Phase 2 verification matrix

| Gate                | Required evidence                                                                                                                                                             | Milestones                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Unit                | Three-way comparison, conflict classification, deletion ambiguity, branch-context checks, operation transitions, hashes, Markdown policy                                      | M2–M11                     |
| Integration         | Real SQLite manifests, baselines, conflicts, operations, versions, trash, attachments, typed commands                                                                         | M1–M11                     |
| Filesystem/recovery | Temporary-directory scenarios at prepared/staged/replacing/verified; changed destination; external edit; branch switch; unavailable/reconnect; startup/resume; atomic failure | M3–M11                     |
| Security            | Source preservation, HTML/MDX non-execution, sanitizer/URL/path policy, no renderer capability, redaction refusal, encrypted managed copies, purge                            | M2, M4, M7–M11             |
| Accessibility       | File tree, editor, conflict actions, source fallback, delete/restore, attachments, quarantine, recovery errors                                                                | M1–M11                     |
| Windows build       | Production-equivalent packaged build with watcher/recovery behavior; harness excluded                                                                                         | M11                        |
| CI                  | Frontend/theme and native jobs green for the implementation commits                                                                                                           | Every milestone; final M11 |

## 8. Definition of done

Phase 2 is complete only when:

- Every milestone acceptance criterion is met.
- The Phase 2 acceptance and verification gates in `docs/IMPLEMENTATION-PLAN.md` pass.
- Divergent changes never overwrite each other.
- Missing files are never treated as deletions.
- Restart/resume recovery is demonstrated at every persisted operation stage.
- Markdown round-trip and source-preservation tests pass for the supported matrix.
- Private attachments have no plaintext fallback and purge covers every managed copy.
- The Windows packaged build contains no test hooks or harness.
- Documentation, decisions, and `BUILD-STATUS.md` reflect actual results and limitations.
