# Merlin Build Status

Last updated: 2026-11-28

## Now

- **Phase 1, Milestone 4, Checkpoint 2 (M4.2)** every required automated gate passes, manual Windows 11 verification passed, and the product owner accepted the checkpoint on 2026-11-28. It is committed locally as `feat: add product shell and navigation`; it is not pushed.
- M4.2 scope is the product shell, typed three-destination navigation, `PrimaryNavigation`, `PageHeader`, `StatusMessage`, `UnavailableState`, the three honest destination pages, a fixed 240px sidebar, `shell.css`, and settings load/apply in `AppShell`. Sidebar resizing, common controls, proof-harness changes, settings UI, routing, and persistence remain out of scope.
- The development workflow is one primary agent (`merlin`), optional read-only support agents, and local commits at verified slice boundaries. Workflow commit: `b81ccfca35a76bbe7dfae9c84542d0812c04ef73` (`chore: simplify opencode development workflow`).
- Branch `main`. Current `HEAD` is `5c216ad` (`docs: record workflow simplification commit`); `origin/main` is `3da8bfcf2a3a74ee6ffb93b464f89e9fb46baee7`. M4.1 is committed and present on the remote via that commit. The two local commits ahead of the remote are `b81ccfc` and `5c216ad`, both workflow documentation.
- No push of the workflow or M4.2 work has occurred.

## Next

1. M4.2 is complete and committed locally. No further implementation is authorized; M4.3–M4.6 and Phase 2 require explicit product-owner approval.
2. Do not push without explicit product-owner authorization.

## Blocked

- No automation blocker. `scripts/native.ps1` provides the verified process-scoped pnpm and native environment.
- The machine-wide pnpm launcher remains broken (`C:\Program Files\nodejs\node_modules\pnpm\pnpm.exe` is missing). A permanent repair needs explicit product-owner authorization; the workflow does not perform one.
- Checkpoints 3–6 and Phase 2 remain unauthorized.

## Last verified

- 2026-11-28 — M4.2 required gates, all run through `powershell -NoProfile -File scripts/native.ps1`:
  - `pnpm format:check` — first run exit 1 with Prettier warnings for `src/app/AppShell.test.tsx` and `tests/e2e/chromium.spec.ts`. Fixed only those files with `pnpm exec prettier --write src/app/AppShell.test.tsx tests/e2e/chromium.spec.ts`; rerun exit 0: "All matched files use Prettier code style!" and `cargo fmt --check` produced no findings.
  - `pnpm typecheck` — exit 0; `tsc --noEmit` passed for `tsconfig.app.json`, `tsconfig.node.json`, and `tsconfig.harness.json`.
  - `pnpm lint:frontend` — exit 0; `eslint . --max-warnings=0` produced no findings.
  - `pnpm test:themes` — exit 0; 74 contrast pairings validated, 1 bundled theme validated, 32 production source files consume registered tokens.
  - `pnpm test:frontend` — exit 0; 17 test files, 101 tests passed.
  - `pnpm test:e2e` — exit 0; 6 Chromium tests passed, including "product shell exposes three honest destinations with accessible navigation".
  - `pnpm build` — exit 0; production build emitted only `dist/index.html`, one CSS asset (19.87 kB), and one JS asset (237.67 kB).
  - `pnpm build:harness:frontend` — exit 0; harness build emitted `dist-harness/index.html` and `dist-harness/tests/harness/proofs.html`. Vite reported a chunk-size warning for the proofs chunk (795.50 kB); the command did not fail.
  - `pnpm verify:build-isolation` — exit 0; production output contains exactly one HTML entry with no harness page/path/marker; the optimized harness contains both entries; both executables passed isolation checks. Evidence: `test-results/build-isolation/evidence.json`.
  - `git diff --check` — exit 0; no output.
- 2026-11-28 — M4.2 optional native regression checks (not acceptance gates): `pnpm test:rust` passed 33 tests with 0 failures; `pnpm test:rust:harness` passed 36 tests with 0 failures.
- 2026-11-28 — workflow commit `b81ccfca35a76bbe7dfae9c84542d0812c04ef73`: `.opencode/opencode.jsonc` parses; agent frontmatter is valid; Prettier passes on the changed workflow Markdown with an empty ignore override; `git diff --check` passes; `scripts/native.ps1` smoke tests for `node`, `pnpm`, and `cargo`.
- 2026-11-28 — M4.2 manual Windows 11 verification passed: the shell is the first screen; all three destinations are reachable by pointer and keyboard; `aria-current="page"`, focus retention, settings/density startup, honest unavailable states, and the absence of fabricated content were confirmed. The product owner accepted the checkpoint.
- 2026-11-28 — Prettier was reported run twice before the workflow change; the second run failed on the two files above. This is recorded history; the failures were fixed and the gate now passes as recorded above.

## Durable state

- Phase 1 M4 scope and approved decisions: `docs/PHASE-1-M4-PLAN.md`, `docs/DECISIONS.md` D-061–D-066.
- Workflow decision: `docs/DECISIONS.md` D-068 (supersedes D-067).
- Phase 2 remains a proposed, unauthorized plan in `docs/PHASE-2-PLAN.md`.
- Read `AGENTS.md` before resuming.
