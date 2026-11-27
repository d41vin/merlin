# Merlin Build Status

Last updated: 2026-11-28

## Now

- **Phase 1, Milestone 4, Checkpoint 2 (M4.2)** implementation is present in the working tree. It is uncommitted and unverified. Do not accept or commit it until every required gate passes and the product owner inspects the result.
- The development workflow was simplified to one primary agent (`merlin`), optional read-only support agents, and local commits at verified slice boundaries. Workflow commit: `b81ccfca35a76bbe7dfae9c84542d0812c04ef73` (`chore: simplify opencode development workflow`).
- Branch `main`. Actual base `HEAD` and `origin/main` are `3da8bfcf2a3a74ee6ffb93b464f89e9fb46baee7`. M4.1 is committed and present on the remote via that commit.
- No push of the workflow or M4.2 work has occurred.

## Next

1. Run the first M4.2 gate:

   ```powershell
   powershell -NoProfile -File scripts/native.ps1 pnpm format:check
   ```

   Known history: this gate was run twice outside the agent prior to the workflow change, and the second run still reported formatting issues in `src/app/AppShell.test.tsx` and `tests/e2e/chromium.spec.ts`. An independent check on 2026-11-28 reproduced both failures. Do not treat them as resolved until a successful rerun.

2. Continue the remaining approved M4.2 gates in order:

   ```powershell
   powershell -NoProfile -File scripts/native.ps1 pnpm typecheck
   powershell -NoProfile -File scripts/native.ps1 pnpm lint:frontend
   powershell -NoProfile -File scripts/native.ps1 pnpm test:themes
   powershell -NoProfile -File scripts/native.ps1 pnpm test:frontend
   powershell -NoProfile -File scripts/native.ps1 pnpm test:e2e
   powershell -NoProfile -File scripts/native.ps1 pnpm build
   powershell -NoProfile -File scripts/native.ps1 pnpm build:harness:frontend
   powershell -NoProfile -File scripts/native.ps1 pnpm verify:build-isolation
   powershell -NoProfile -File scripts/native.ps1 pnpm test:rust
   powershell -NoProfile -File scripts/native.ps1 pnpm test:rust:harness
   ```

3. Perform the M4.2 manual Windows 11 check: launch the app, confirm the shell is the first screen, navigate all three destinations by pointer and keyboard, confirm `aria-current="page"`, focus retention, honest unavailable states, settings/density startup, and no fabricated content.

4. Only after all gates and manual acceptance: commit M4.2 as `feat: add product shell and navigation`. Do not push.

## Blocked

- No automation blocker after the workflow change. `scripts/native.ps1` provides the verified process-scoped pnpm and native environment.
- The machine-wide pnpm launcher remains broken (`C:\Program Files\nodejs\node_modules\pnpm\pnpm.exe` is missing). A permanent repair needs explicit product-owner authorization; the workflow does not perform one.
- Manual Windows 11 visual verification remains pending the product owner.
- Checkpoints 3–6 and Phase 2 remain unauthorized.

## Last verified

- 2026-11-28 — workflow commit `b81ccfca35a76bbe7dfae9c84542d0812c04ef73`: `.opencode/opencode.jsonc` parses; agent frontmatter is valid; Prettier passes on the changed workflow Markdown with an empty ignore override; `git diff --check` passes; `scripts/native.ps1` smoke tests for `node`, `pnpm`, and `cargo`.
- 2026-11-28 — M4.2 application verification has **not** run. The only M4.2 evidence is `git diff --check`; the two Prettier failures above are outstanding.
- 2026-11-28 — Prettier was reported run twice before the workflow change; the second run failed on the two files above. This is recorded history, not a claim of resolution.

## Durable state

- Phase 1 M4 scope and approved decisions: `docs/PHASE-1-M4-PLAN.md`, `docs/DECISIONS.md` D-061–D-066.
- Workflow decision: `docs/DECISIONS.md` D-068 (supersedes D-067).
- Phase 2 remains a proposed, unauthorized plan in `docs/PHASE-2-PLAN.md`.
- Read `AGENTS.md` before resuming.
