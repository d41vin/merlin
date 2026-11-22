# Docs and Merlin Project Store

## 1. Purpose

Merlin manages project documentation without taking ownership away from the repository or the user's editor/coding agent.

Terminology:
- **Docs:** the user-facing document area in Merlin.
- **Repository Docs root:** the configured folder in the connected repository, default `docs/`.
- **Docs Backup:** secondary persistent copy held by Merlin.
- **Merlin Project Store:** Merlin-managed storage for project documents and backup data.
- **Last-synced baseline:** the content hash and repository context that both copies matched after a completed reconciliation.
- **Sync operation:** a persisted, recoverable record of one planned filesystem propagation and its expected result.

## 2. Source and backup model

When a repository is connected:
- The configured repository Docs folder is the primary working copy.
- Merlin Project Store maintains a separate backup copy.
- Merlin edits the actual repository Markdown files.
- Changes made externally by an IDE or coding agent are detected and reconciled.
- The backup is not a competing primary editor.

When the repository is unavailable:
- Merlin can open and edit Docs Backup.
- Show that the repository is unavailable and backup is active.
- Reconcile when the repository reconnects.

The backup protects against repository deletion/reclone, not physical drive failure. Provide manual export/backup. External/cloud backup is future work.

## 3. Initial setup

When registering a repository:
1. Detect a root-level `docs/` folder if present.
2. Ask the user to confirm it as the Docs root.
3. If none exists, offer:
   - Create docs folder
   - Choose existing folder
   - Skip for now
4. Never silently create a folder.
5. Allow a custom repo-relative Docs path later.

Only one primary Docs root per project in v1. Monorepo nested roots are selected manually.

Projects without a repository may use Merlin Project Store documents from the beginning.

## 4. Markdown editor

Use Milkdown, subject to a proof-of-compatibility phase.

Markdown files remain the source format. Preserve:
- YAML frontmatter
- fenced code blocks
- Mermaid
- tables
- task lists
- HTML/MDX
- links and images
- unsupported syntax

Source preservation is independent from display and execution. Treat every project document as untrusted input:
- Preserve raw HTML and MDX in the Markdown source without evaluating either.
- Render only the sanitized, non-privileged representation defined in `SECURITY.md`.
- Show MDX expressions, imports, exports, components, and any unsupported construct as inert source or in source-edit mode.
- Resolve document links and attachment paths only inside registered roots; external `https` links require an explicit click and open in the system browser.
- Do not give the editor preview or document renderer access to Tauri commands or other native capabilities.

Round-trip tests must prove that opening and saving a document does not destroy unsupported constructs. Rendering tests must separately prove that source constructs cannot execute. Use source-edit fallback where WYSIWYG support is incomplete.

Autosave approximately one second after idle. Ctrl+S saves immediately. Show saved/unsaved/saving/error state.

## 5. Watcher and reconciliation

Watch only the configured Docs root recursively. Watcher events are hints, not truth.

Reconcile:
- At startup
- On repository reconnect
- On resume after sleep
- After watcher overflow/error
- On explicit request
- After a detected repository HEAD or branch change

Use:
- Content hashes
- File manifests
- Last-synced baseline
- Current repository HEAD and branch identity, when Git is available
- Persisted sync-operation records
- Atomic writes
- Debounced watcher handling

Avoid watching/scanning the entire repository.

## 6. Three-way synchronization

For each file compare:
- Last-synced baseline
- Current repository copy
- Current Docs Backup copy

Rules:
- Only repo changed: propagate repo version to backup.
- Only backup changed: propagate backup version to repo, after validating destination baseline.
- Both changed identically: mark synchronized.
- Both changed differently: create conflict; do not overwrite either side.

Conflict actions:
- Keep repository version
- Keep backup version
- Compare and resolve
- Save both as separate copies

Before writing, verify destination still matches the expected baseline. If not, re-evaluate and create a conflict rather than overwriting.

### 6.1 Persisted sync-operation and recovery protocol

SQLite transactions cannot atomically include filesystem writes. Every propagation therefore uses a persisted protocol that makes the actual file state authoritative after interruption:

1. **Prepare intent.** Create a `SyncOperation` before changing a file. It records the operation ID, project and file identity, source and destination sides, baseline hash, expected source hash, expected destination hash, intended result hash, repository HEAD/branch context when applicable, and the operation state.
2. **Validate and stage.** Re-read the destination and confirm its hash still equals the recorded expected destination hash. Write the intended bytes to a staging file in the destination directory, then verify the staged hash equals the intended result hash. Keep the original destination unchanged.
3. **Atomically replace.** Mark the operation as replacing, atomically replace the destination with the staged file, and preserve the required recovery snapshot. The implementation must use the platform's atomic replacement primitive where the source and destination are on the same volume.
4. **Verify the write.** Re-read the destination and compare its hash to the intended result hash. If it differs, preserve both recoverable copies and create a conflict or recovery error; never commit a new baseline.
5. **Commit the baseline.** Only after post-write verification, transactionally update manifests, version metadata, last-synced baseline, and operation state to committed. This database commit is idempotent and may be retried after a crash.
6. **Clean up.** Remove the staging file only after the committed state is durable. Cleanup failure is recoverable and must not change the recorded content state.

Operation states are `prepared`, `staged`, `replacing`, `verified`, `committed`, and `recovery_required`. Persist state transitions before the corresponding irreversible step.

At startup or resume, recover every non-committed operation before normal propagation:
- `prepared`: revalidate both sides; discard only an unused operation record or replan it. Do not write a file.
- `staged`: verify the destination remains at its expected hash. Reuse a valid staging file only after revalidation; otherwise keep the files unchanged and replan or mark recovery required.
- `replacing`: inspect the destination, staging file, and recovery snapshot. If the destination matches the intended result, continue with post-write verification and baseline commit. If it matches the pre-write expectation, retry only after revalidation. Any other state becomes a conflict or recovery error without overwriting either copy.
- `verified`: retry the idempotent baseline commit only after confirming the repository context and destination hash still match the operation record.
- `recovery_required`: keep automatic propagation paused for that file until the user resolves the surfaced recovery state.

Recovery must be tested with simulated interruption after every stage. No stage may use a SQLite rollback as evidence that a filesystem replacement was undone.

## 7. Deletion and branch changes

Absence is ambiguous. A missing file may result from:
- Fresh clone
- Branch switch
- Disconnected drive
- Temporary path issue
- External deletion

Do not infer deletion from absence alone.

- Explicit deletion inside Merlin creates a tombstone and recoverable trash entry.
- External deletion creates a recoverable snapshot and asks for reconciliation where intent is ambiguous.
- Record the last reconciled Git HEAD and branch identity for each repository-backed Docs root when Git is available. Compare that context before a reconciliation that could propagate changes.
- A changed HEAD or branch pauses automatic propagation in either direction. Refresh the repository manifest under the new context, retain the backup and prior baseline, and present reconciliation before any copy is written.
- A file that existed only on the previous branch must never be recreated in the new branch automatically. Treat it as branch-state ambiguity or a conflict until the user chooses an explicit reconciliation action.
- A branch switch during a pending sync operation makes that operation `recovery_required` unless its recorded HEAD/branch context still matches. Do not commit a new baseline against the wrong branch.
- Reconnect follows the same rule: compare path, remote identity, Docs configuration, manifest, HEAD, and branch context before propagation.
- `docs/personal/` may be Gitignored but remains part of Merlin Docs and backup.
- Git-ignore does not mean exclude from Merlin.

## 8. Version history and trash

- Retain latest 30 revisions per file.
- Content-hash deduplicate.
- Autosave keystrokes do not each create a revision.
- Create checkpoints before destructive operations and conflict resolution.
- Pinned versions are protected from automatic pruning.
- Deleted files remain in Merlin Trash for 30 days.
- Unresolved conflicts are retained until resolved.
- Provide restore and export.

## 9. Reconnect and project identity

Use a stable Merlin Project ID. Repository remote identity is only one signal.

On re-registration:
- Offer explicit reconnect to an existing Merlin project.
- Compare local path, remote identity, Docs configuration, and manifests.
- Ask for confirmation.
- Do not silently create duplicates or attach a repository to the wrong project.

A deleted local repository does not delete the Merlin project.

## 10. Attachments

- Public/repo-shared assets may live in `docs/assets/` and be referenced from Markdown.
- Private attachments live in Merlin Project Store outside the repository.
- Screenshots/evidence for API key creation, promotions, emails, and provider instructions may be attached to resource/account records only after full API keys, passwords, recovery codes, and other secrets have been redacted. A user confirmation of redaction is required before import; encryption does not replace redaction.
- If a potentially exposed secret is detected by the import flow or reported by the user, reject the import and require a redacted replacement. If it was already imported, quarantine it from rendering, sharing, and export; instruct the user to rotate or revoke the secret; and purge it from managed active copies, previews, thumbnails, versions, backup copies, trash, and pending exports. Do not silently modify any external repository copy or already completed export.
- Attachments can be referenced by multiple records. Removing one reference does not delete the underlying file if other references remain.
- Sensitive screenshots are not sent to an LLM without explicit approval and are not exposed to coding agents automatically.
- Encrypt sensitive private attachments and all Merlin-managed derivatives at rest with authenticated encryption. Protect encryption keys with the current Windows user's OS-backed protection. Do not store a plaintext fallback; if protection is unavailable, block the sensitive import and explain the limitation.
- Phase 0 must validate the chosen platform mechanism and document its backup, restore, profile-migration, and recovery limits. Explicit exports remain user-controlled external copies and need a warning when they include sensitive attachments.

## 11. Failure behavior

- Never silently overwrite.
- Use atomic writes.
- Keep recovery snapshots for failed or interrupted operations.
- If sync fails, preserve both copies and surface a clear status.
- Do not mark a file synchronized until hashes/manifests confirm the expected result.
- A restart must resume safely from persisted sync metadata.
- Test interrupted operations at `prepared`, `staged`, `replacing`, and `verified`; destination changes after intent; branch switches before and during reconciliation; unavailable/reconnected repositories; and recovery after restart. Each test must show that Merlin preserves copies and pauses rather than silently propagating uncertain data.
