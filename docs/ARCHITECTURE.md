# Architecture

## 1. Architectural stance

Merlin is a local-first desktop application. Keep the UI, domain logic, persistence, and operating-system integrations separated.

Primary layers:
1. React presentation and interaction.
2. TypeScript application/domain services.
3. Tauri command boundary.
4. Rust services for filesystem, process launching, credentials integration, and other native operations.
5. SQLite persistence and filesystem-backed project documents.

Do not place core business rules inside React components or UI SDK behavior handlers.

## 2. Proposed repository layout

```text
src/
  app/
  components/
  features/
    overview/
    projects/
    resources/
    settings/
  lib/
  styles/
  themes/
src-tauri/
  src/
    commands/
    services/
    db/
    security/
    filesystem/
    main.rs
  migrations/
docs/
```

Adapt structure to the selected scaffold while preserving boundaries.

## 3. Frontend

- React 19+, TypeScript, Vite.
- Tailwind CSS v4 and CSS variables.
- shadcn/ui with Base UI for common controls.
- Vercel UI SDK for complex interaction behavior.
- Milkdown for Markdown editing.
- Lucide React for icons.

The UI SDK is a behavior toolkit, not the visual design system. It must not own business logic or persistence.

## 4. Native backend

Use Tauri 2 and Rust for:
- Filesystem access and watchers.
- Atomic document writes.
- Process/application launch.
- Credential Manager integration.
- SQLite access where appropriate.
- Safe path validation and native dialogs.

Expose narrow, typed commands. Avoid a generic command that accepts arbitrary shell strings or filesystem paths without validation.

## 5. Persistence

SQLite stores:
- Projects and repository connections.
- Todos, milestones, activity events.
- Resources, accounts, allowances, usage history.
- API-key metadata and credential references.
- Launch action definitions.
- Docs sync metadata, manifests, tombstones, and conflict records.
- Persisted Docs sync operations and recovery state.
- Settings and panel layouts.
- Usage Journal events.

Markdown documents remain files, not SQLite blobs, except for version snapshots or recovery records as specified in `DOCS-AND-VAULT.md`.

## 6. Filesystem and Docs

A configured Docs root is watched recursively. Watcher notifications are hints, not the source of truth.

Reconcile on:
- Application startup.
- Repository reconnect.
- Resume after sleep where relevant.
- Watcher overflow/error.
- Explicit user request.

Use file hashes and manifests. Apply three-way sync against a last-synced baseline. Persist sync intent before filesystem mutation, then verify the filesystem result before committing a new baseline. SQLite transactions do not make filesystem writes atomic; recovery must reconcile the durable operation record with the actual files. See `DOCS-AND-VAULT.md`.

Repository branch and HEAD identity are part of the reconciliation context. A change pauses automatic propagation until the new working tree is safely reconciled; no file from a previous branch may be resurrected automatically.

## 7. Process launching

Custom launch actions use typed action kinds:
- `application`
- `terminal`
- `url`
- `folder`

Validate executable paths, working directories, arguments, and URLs. Avoid shell interpolation. Use argument arrays where possible. Terminal commands are explicitly configured and presented to the user before execution.

## 8. Credentials

Use Windows Credential Manager for API secrets. Rust command boundary performs secret operations. SQLite stores a credential reference and non-secret metadata only.

## 9. Event model

Use distinct event streams:
- Project Activity: meaningful events about project work.
- Usage Journal: meaningful interactions with Merlin itself.

Do not mix them. Do not record document contents or secrets.

## 10. Error handling

- Typed errors across native command boundaries.
- Surface actionable errors to the UI.
- Preserve original files on failure.
- Atomic writes and transaction boundaries for multi-record updates.
- Model filesystem operations and SQLite baseline updates as recoverable stages rather than one atomic transaction.
- Log technical diagnostics without secrets or document contents.
- Recovery paths for interrupted synchronization.

## 11. Performance

- No broad polling loops.
- Debounce filesystem watcher events.
- Avoid scanning entire repositories; monitor only configured Docs roots.
- Use pagination/virtualization if resource/project lists become large.
- Keep idle CPU usage near zero when no filesystem event or user action occurs.
