# Merlin Build Status

Last updated: 2026-11-28

## Now

- **Phase 2 P2-M2 — Docs manifest and read-only source browser** is committed as `8125497` (`feat: add read-only docs manifest and browser`). Automated gates pass. Manual Windows 11 acceptance and hosted CI remain pending.
- P2-M2 adds the append-only V4 metadata-only `docs_files` and `docs_manifest_state` schema; explicit, bounded refresh of the confirmed Docs root; a file tree with recent documents; sanitized read-only preview; exact source mode; and fail-closed states for missing, oversized, invalid-UTF-8, unreadable, and linked entries. No document content is stored in SQLite and no file is written. Policy is recorded in D-072.
- **Phase 2 P2-M1 — project identity, registration, and Project Store foundation** remains committed as `0dc77bc` (`feat: add project and docs registration foundation`). Manual Windows 11 acceptance and hosted CI remain pending.
- **Phase 1 M4 automated closure** is committed (`7b62f61`). M4.2 is product-owner accepted; M4.3–M4.6 automated gates pass but manual Windows 11 acceptance remains pending and is not inferred.
- Branch `main`; `origin/main` is `c40e9a9`. Local commits `7aec3ea` (push policy), `8125497` (P2-M2), and the P2-M2 status commit are waiting for a verified-slice push under that policy. The history through `c40e9a9` is pushed and hosted CI passed for it.
- Workflow: one primary agent (`merlin`), optional read-only support, local commits and verified-slice pushes, `/wrap` for session handoff.

## Next

- **Phase 2, P2-M3 — Backup enrollment and baseline** (`docs/PHASE-2-PLAN.md` §P2-M3, `docs/DOCS-AND-VAULT.md`, `docs/SECURITY.md`). Preserve P2-M1/P2-M2 records and Phase 1 gates.
- Continue autonomous implementation under D-069. Select the next unblocked slice; commit each verified slice locally.
- Complete M4.3–M4.6, P2-M1, and P2-M2 manual Windows 11 acceptance when the product owner is available; confirm hosted CI for the pushed history. Record separately; never infer.
- Push verified slices to `origin/main`; never force-push, rewrite history, delete remote branches, push tags, or publish packages.
- Update the pinned GitHub Actions that emit Node 20 deprecation warnings when convenient; maintenance, not a blocker.
- A native folder picker remains deferred (D-071).

## Blocked

- No implementation blocker.
- The machine-wide pnpm launcher is broken (`C:\Program Files\nodejs\node_modules\pnpm\pnpm.exe` missing). Use `powershell -NoProfile -File scripts/native.ps1 <command>`. No machine-wide changes without authorization.
- Manual Windows 11 acceptance is pending; it does not block implementation. Hosted CI for `c40e9a9` passed; the local P2-M2 history is a new run when pushed.
- Escalate only for the conditions in `AGENTS.md`: product direction, security/privacy/data integrity, destructive operations, money/publishing, gates that cannot run, repeated blockers, or unresolved consequential tradeoffs.

## Last verified

- 2026-11-28 — P2-M2 gates, all through `scripts/native.ps1` and all exit 0: `format:check` (Prettier all files; rustfmt check); `typecheck` (three TypeScript projects); `lint:frontend`; `lint:rust`; `lint:rust:harness`; `test:themes` (74 required/declared pairings, 1 theme, 42 production source files); `test:frontend` (24 files, 124 tests); `test:e2e` (8 Chromium); `test:webview2` (3 real WebView2 tests, including manifest scan/read and restart persistence plus axe); `test:rust` (49 tests); `test:rust:harness` (50 tests); `tauri build` (release executable plus NSIS installer, 3.20 MiB, production SHA256 `E59010D36DEC0D3EA88D9E344608EC7CB80A81DAE565B32FA7C22577FD43E388`); `build:test-harness` (harness SHA256 `B3B5368DA1F587C475FE56E0E6B217DE0111738A677BB0728D7E718CE7CA7239`); `verify:build-isolation` (7 checks); `verify:production-boundary` (8 gates, evidence in `test-results/production-boundary/evidence.json`); `git diff --check`.
- 2026-11-28 — P2-M2 test ordering note: Playwright owns and cleans `test-results/`. The production build was rerun after the WebView2 suite, then the production-boundary gates ran, so the pre-bundle evidence and installer correspond to the verified source.
- 2026-11-28 — P2-M1 gates, all through `scripts/native.ps1` and all exit 0: `format:check`; `typecheck`; `lint:frontend`; `lint:rust`; `lint:rust:harness`; `test:themes` (74 pairings, 39 source files); `test:frontend` (22 files, 114 tests); `test:e2e` (8 Chromium); `test:webview2` (3 real, including registration across restart); `test:rust` (42); `test:rust:harness` (43); `tauri build` (installer generated); `build:test-harness`; `verify:build-isolation`; `verify:production-boundary` (all eight gates); `git diff --check`.
- 2026-11-28 — M4.2–M4.6 and earlier workflow verification: see git history and `test-results/build-isolation/evidence.json`, `test-results/production-boundary/evidence.json`. No earlier failures remain open.
- 2026-11-28 — history through `c40e9a9` pushed to `origin/main`; hosted CI passed both jobs (114 Vitest tests; Node 20 action-deprecation warnings only). Manual Windows 11 acceptance remains pending.

## Durable state

- Decisions: D-061–D-066 (M4), D-068 (simplified workflow), D-069 (autonomous mandate), D-070 (controls harness), D-071 (P2-M1 registration/reconnect), D-072 (P2-M2 manifest and file policy).
- Evidence: `test-results/build-isolation/evidence.json`, `test-results/production-boundary/evidence.json`.
- Session wrap-up: `.opencode/commands/wrap.md`.
- Read `AGENTS.md` before resuming.
