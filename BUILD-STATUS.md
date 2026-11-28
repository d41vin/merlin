# Merlin Build Status

Last updated: 2026-11-28

## Now

- **Phase 1 M4 automated closure** is committed (`7b62f61`). M4.2 is product-owner accepted; M4.3–M4.6 automated gates pass but manual Windows 11 acceptance remains pending and is not inferred.
- **Phase 2 P2-M1 — project identity, registration, and Project Store foundation** is committed as `0dc77bc` (`feat: add project and docs registration foundation`). Manual Windows 11 acceptance and hosted CI remain pending.
- P2-M1 adds the append-only V3 `projects`, `repository_connections`, and `docs_roots` schema; stable UUID identity; canonical repository paths with remote reconnect detection; explicit Docs-root confirm/create/choose/skip; the deterministic Project Store skeleton; a minimal Projects registration UI; and honest browser-only behavior. Typed path fields are used; a native folder picker is deferred (D-071).
- Branch `main`; `origin/main` is `c40e9a9`. The history through `c40e9a9` is pushed and hosted CI passed (frontend-theme and native, 114 Vitest tests; only Node 20 action-deprecation warnings). The push-policy commit is local until the next push.
- Workflow: one primary agent (`merlin`), optional read-only support, local commits and verified-slice pushes, `/wrap` for session handoff. Workflow commit `b81ccfca35a76bbe7dfae9c84542d0812c04ef73`.

## Next

- **Phase 2, P2-M2 — Docs manifest and read-only source browser** (`docs/PHASE-2-PLAN.md` §P2-M2, `docs/DOCS-AND-VAULT.md`, `docs/SECURITY.md`). Preserve P2-M1 records and Phase 1 gates.
- Continue autonomous implementation under D-069. Select the next unblocked slice; commit each verified slice locally.
- Complete M4.3–M4.6 and P2-M1 manual Windows 11 acceptance when the product owner is available; confirm hosted CI for the pushed history. Record separately; never infer.
- Push verified slices to `origin/main`; never force-push, rewrite history, delete remote branches, push tags, or publish packages.
- Update the pinned GitHub Actions that emit Node 20 deprecation warnings when convenient; maintenance, not a blocker.
- A native folder picker remains deferred (D-071).

## Blocked

- No implementation blocker.
- The machine-wide pnpm launcher is broken (`C:\Program Files\nodejs\node_modules\pnpm\pnpm.exe` missing). Use `powershell -NoProfile -File scripts/native.ps1 <command>`. No machine-wide changes without authorization.
- Manual Windows 11 acceptance is pending; it does not block implementation. Hosted CI for `c40e9a9` passed; the push-policy commit is a new run when pushed.
- Escalate only for the conditions in `AGENTS.md`: product direction, security/privacy/data integrity, destructive operations, money/publishing, gates that cannot run, repeated blockers, or unresolved consequential tradeoffs.

## Last verified

- 2026-11-28 — wrap procedure commit: Prettier passed on `AGENTS.md`, `BUILD-STATUS.md`, `.opencode/agents/merlin.md`, and `.opencode/commands/wrap.md`; `git diff --check` passed.
- 2026-11-28 — push policy commit: Prettier passed on the changed Markdown; `.opencode/opencode.jsonc` parsed; `git diff --check` passed.
- 2026-11-28 — P2-M1 gates, all through `scripts/native.ps1` and all exit 0: `format:check`; `typecheck`; `lint:frontend`; `lint:rust`; `lint:rust:harness`; `test:themes` (74 pairings, 39 source files); `test:frontend` (22 files, 114 tests); `test:e2e` (8 Chromium); `test:webview2` (3 real, including registration across restart); `test:rust` (42); `test:rust:harness` (43); `tauri build` (installer generated); `build:test-harness`; `verify:build-isolation`; `verify:production-boundary` (all eight gates); `git diff --check`.
- 2026-11-28 — M4.2–M4.6 and earlier workflow verification: see git history and `test-results/build-isolation/evidence.json`, `test-results/production-boundary/evidence.json`. No earlier failures remain open.
- 2026-11-28 — history through `c40e9a9` pushed to `origin/main`; hosted CI passed both jobs (114 Vitest tests; Node 20 action-deprecation warnings only). Manual Windows 11 acceptance remains pending.

## Durable state

- Decisions: D-061–D-066 (M4), D-068 (simplified workflow), D-069 (autonomous mandate), D-070 (controls harness), D-071 (P2-M1 registration/reconnect).
- Evidence: `test-results/build-isolation/evidence.json`, `test-results/production-boundary/evidence.json`.
- Session wrap-up: `.opencode/commands/wrap.md`.
- Read `AGENTS.md` before resuming.
