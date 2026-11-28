---
description: Finish the current slice, tighten operational state, clean reproducible artifacts, and stop
agent: merlin
---

Wrap up this session. This is the last slice for this session.

## 1. Current work

- Finish and verify the current slice only. Commit it with the planned conventional message.
- Push the verified slice to `origin/main` with a normal fast-forward. If the remote advanced or the branch diverged, stop and report. Record the pushed SHA; report hosted CI as pending unless its result is known.
- If the slice cannot be completed safely, stop at a clean point, report exactly what is uncommitted, and do not fake verification.
- Do not start the next slice or any later slice.

## 2. BUILD-STATUS.md

- Rewrite it to exactly four sections: `Now`, `Next`, `Blocked`, `Last verified`.
- Keep it under 60 lines.
- `Now`: current state only, at most 5 bullets. Collapse completed slices to one line each; do not repeat their full scope.
- `Next`: the next 1-3 slices with exact plan references.
- `Blocked`: only active blockers.
- `Last verified`: only the most recent slice, at most 12 bullets. Collapse older verification to one line and point to git history and evidence files.
- Do not append a new historical log; replace the previous one.
- Keep the `HEAD`, remote, and commits-ahead summary accurate.

## 3. Operational docs consistency

- Check `README.md` only if setup or commands changed.
- Update plan status lines in `docs/PHASE-*.md` and `docs/IMPLEMENTATION-PLAN.md` only where stale; do not rewrite scope.
- Add material decisions to `docs/DECISIONS.md` as new rows; mark superseded decisions; do not rewrite history.
- Do not modify `PRD.md`, `UX-SPEC.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, `DOCS-AND-VAULT.md`, `SECURITY.md`, `UI-STACK.md`, `DESIGN-SYSTEM.md`, or `design-tokens.md` unless a verified contradiction requires it. Report before changing any of them.
- Do not add new process documents.

## 4. Artifact cleanup

- Measure free space and the size of `src-tauri/target`, `dist`, `dist-harness`, `playwright-report`, `coverage`, and `test-results`.
- Safe to remove: `dist/`, `dist-harness/`, `playwright-report/`, `coverage/`, old logs, and `src-tauri/target/debug/incremental`.
- Remove `target/debug` or `target/test-harness` only if space is needed and a rebuild is acceptable. Prefer `cargo clean` for the specific profile or package.
- Preserve source, fixtures, SQLite databases, user data, `test-results/**/evidence.json`, `.tools` Cargo registry/cache, and acceptance evidence.
- Never use `git clean`, `git reset`, or delete untracked source.
- Report what was deleted and how much space was freed.

## 5. Report

Report the commit SHA, pending manual checks, the next slice, and the disk result. Then stop.
