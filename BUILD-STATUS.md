# Merlin Build Status

Last updated: 2026-11-28

## Now

- **Phase 1 M4 automated closure** is committed (`7b62f61`). M4.2 is product-owner accepted; M4.3–M4.6 automated gates pass but manual Windows 11 acceptance remains pending and is not inferred.
- **Phase 2 P2-M1 — project identity, registration, and Project Store foundation** is committed as `0dc77bc` (`feat: add project and docs registration foundation`). Manual Windows 11 acceptance and hosted CI remain pending.
- P2-M1 adds the append-only V3 `projects`, `repository_connections`, and `docs_roots` schema; stable UUID identity; canonical repository paths with remote reconnect detection; explicit Docs-root confirm/create/choose/skip; the deterministic Project Store skeleton; a minimal Projects registration UI; and honest browser-only behavior. Typed path fields are used; a native folder picker is deferred (D-071).
- Branch `main`; `origin/main` is `3da8bfcf2a3a74ee6ffb93b464f89e9fb46baee7`. All local work is committed; run `git log --oneline origin/main..HEAD` for the exact commits ahead. Nothing is pushed.
- Workflow: one primary agent (`merlin`), optional read-only support, local commits at verified slice boundaries, `/wrap` for session handoff. Workflow commit `b81ccfca35a76bbe7dfae9c84542d0812c04ef73`.

## Next

- **Phase 2, P2-M2 — Docs manifest and read-only source browser** (`docs/PHASE-2-PLAN.md` §P2-M2, `docs/DOCS-AND-VAULT.md`, `docs/SECURITY.md`). Preserve P2-M1 records and Phase 1 gates.
- Continue autonomous implementation under D-069. Select the next unblocked slice; commit each verified slice locally.
- Complete M4.3–M4.6 and P2-M1 manual Windows 11 acceptance, and hosted CI for a pushed commit, when the product owner is available. Record separately; never infer.
- A native folder picker remains deferred (D-071).

## Blocked

- No implementation blocker.
- The machine-wide pnpm launcher is broken (`C:\Program Files\nodejs\node_modules\pnpm\pnpm.exe` missing). Use `powershell -NoProfile -File scripts/native.ps1 <command>`. No machine-wide changes without authorization.
- Manual Windows 11 acceptance and hosted CI are pending; they do not block implementation.
- Escalate only for the conditions in `AGENTS.md`: product direction, security/privacy/data integrity, destructive operations, money/publishing, gates that cannot run, repeated blockers, or unresolved consequential tradeoffs.

## Last verified

- 2026-11-28 — wrap procedure commit: Prettier passed on `AGENTS.md`, `BUILD-STATUS.md`, `.opencode/agents/merlin.md`, and `.opencode/commands/wrap.md`; `git diff --check` passed.
- 2026-11-28 — P2-M1 gates, all through `scripts/native.ps1` and all exit 0: `format:check`; `typecheck`; `lint:frontend`; `lint:rust`; `lint:rust:harness`; `test:themes` (74 pairings, 39 source files); `test:frontend` (22 files, 114 tests); `test:e2e` (8 Chromium); `test:webview2` (3 real, including registration across restart); `test:rust` (42); `test:rust:harness` (43); `tauri build` (installer generated); `build:test-harness`; `verify:build-isolation`; `verify:production-boundary` (all eight gates); `git diff --check`.
- 2026-11-28 — M4.2–M4.6 and earlier workflow verification: see git history and `test-results/build-isolation/evidence.json`, `test-results/production-boundary/evidence.json`. No earlier failures remain open.
- Manual Windows 11 acceptance and hosted CI remain unverified for the local commits; no push has occurred.

## Durable state

- Decisions: D-061–D-066 (M4), D-068 (simplified workflow), D-069 (autonomous mandate), D-070 (controls harness), D-071 (P2-M1 registration/reconnect).
- Evidence: `test-results/build-isolation/evidence.json`, `test-results/production-boundary/evidence.json`.
- Session wrap-up: `.opencode/commands/wrap.md`.
- Read `AGENTS.md` before resuming.
