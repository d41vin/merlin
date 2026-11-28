# Merlin Build Status

Last updated: 2026-11-28

## Now

- **Phase 1, Milestone 4, Checkpoint 2 (M4.2)** is complete. Every required automated gate passes, manual Windows 11 verification passed, and the product owner accepted the checkpoint on 2026-11-28. It is committed locally as `feat: add product shell and navigation`; it is not pushed.
- M4.2 scope is the product shell, typed three-destination navigation, `PrimaryNavigation`, `PageHeader`, `StatusMessage`, `UnavailableState`, the three honest destination pages, a fixed 240px sidebar, `shell.css`, and settings load/apply in `AppShell`. Sidebar resizing, common controls, proof-harness changes, settings UI, routing, and persistence remain out of scope for M4.2.
- **Phase 1, Milestone 4, Checkpoint 3 (M4.3)** is implemented and every required automated gate passes. The local commit boundary is `feat: add resizable session sidebar`; it is not pushed. Manual Windows 11 verification and product-owner acceptance are **pending** and are not inferred.
- M4.3 adds the UI SDK resizable sidebar at 240px default with 200–320px pixel bounds, a named keyboard-operable resize handle, 28px navigation items with a 2px active indicator, hover/selected/focus states, session retention across destination changes, and reset to 240px on reload. No width persistence, settings key, IPC, migration, or browser storage is added.
- The development workflow is one primary agent (`merlin`), optional read-only support agents, and local commits at verified slice boundaries. Workflow commit: `b81ccfca35a76bbe7dfae9c84542d0812c04ef73` (`chore: simplify opencode development workflow`).
- Branch `main`. Before this slice commit, `HEAD` is `caf73a6` (`docs: adopt autonomous operating mandate`); `origin/main` is `3da8bfcf2a3a74ee6ffb93b464f89e9fb46baee7`. The four local commits ahead of the remote are `b81ccfc`, `5c216ad`, `4bcab98`, and `caf73a6`; this slice adds a fifth. No push of any local work has occurred.

## Next

- Complete M4.3 manual Windows 11 verification when the product owner is available; record acceptance separately. Continue without blocking on it.
- Implement **M4.4 — minimal common controls and harness**: Input, Textarea, Label, and Dialog over installed Base UI/native primitives, the dev-only controls harness, focused keyboard/focus/ARIA tests, and theme/token validation.
- Then implement **M4.5 — shell-era Chromium, WebView2, and native integration**, followed by **M4.6 — Phase 1 closure verification and documentation**.
- Continue autonomous implementation of Merlin using the accepted product specifications, architecture, decisions, and roadmap as the source of truth.
- The primary `merlin` agent owns engineering execution. Read `AGENTS.md`, relevant product documentation, `docs/DECISIONS.md`, and this file before continuing.
- Independently select the next unblocked vertical slice based on dependencies, technical soundness, and overall product completeness; implementation order may be adjusted when technically justified.
- Make ordinary technical, architectural, implementation, and UX decisions independently within the accepted product direction and constraints.
- Decompose work into manageable slices. Implement, test, inspect, fix failures, and commit completed, verified slices locally using conventional commit messages.
- Continue across roadmap milestones without waiting for product-owner approval at each checkpoint or milestone boundary.
- If a slice needs product-owner manual acceptance, record it as pending and continue with work that does not depend on it. Never infer or fabricate acceptance.
- Keep this file accurate and concise. Update `Now`, `Next`, `Blocked`, and `Last verified` when the operational state changes.
- Do not push without explicit product-owner authorization.

## Blocked

- No current implementation blocker.
- `scripts/native.ps1` provides the verified process-scoped pnpm and native environment.
- The machine-wide pnpm launcher remains broken (`C:\Program Files\nodejs\node_modules\pnpm\pnpm.exe` is missing). Continue using `scripts/native.ps1`. Do not make machine-wide changes without explicit authorization.
- Escalate only when a fundamental product-direction decision is required, an existing security/privacy/data-integrity requirement must change, a destructive or irreversible operation is necessary, money must be spent, something must be published externally, a required verification gate cannot run, repeated credible attempts cannot resolve a blocker, or specifications cannot reasonably resolve a consequential product tradeoff.
- Never push without explicit authorization. Never fake, weaken, or silently skip verification. Never use destructive Git recovery as automatic repair. Never overwrite user changes.

## Last verified

- 2026-11-28 — M4.3 gates, all run through `powershell -NoProfile -File scripts/native.ps1`:
  - `pnpm format:check` — exit 0; "All matched files use Prettier code style!" and `cargo fmt --check` produced no findings.
  - `pnpm typecheck` — exit 0; `tsc --noEmit` passed for `tsconfig.app.json`, `tsconfig.node.json`, and `tsconfig.harness.json`.
  - `pnpm lint:frontend` — exit 0; `eslint . --max-warnings=0` produced no findings.
  - `pnpm test:themes` — exit 0; 74 contrast pairings validated, 1 bundled theme validated, 32 production source files consume registered tokens.
  - `pnpm test:frontend` — exit 0; 17 test files, 103 tests passed.
  - `pnpm test:e2e` — exit 0; 7 Chromium tests passed, including "sidebar resizes by pointer and keyboard within session bounds and resets on reload" with pointer drag, Home/End/Arrow keys, destination retention, 760px window bounds, reload reset, focus ring, contrast, axe, and no browser storage.
  - `pnpm build` — exit 0; production build emitted only `dist/index.html`, one CSS asset (20.42 kB), and one JS asset (289.47 kB).
  - `pnpm build:harness:frontend` — exit 0; harness build emitted both entries and assets. Vite reported the existing chunk-size warning for the proofs chunk (743.96 kB); the command did not fail.
  - `pnpm verify:build-isolation` — exit 0; production output contains exactly one HTML entry with no harness page/path/marker; the optimized harness contains both entries; both executables passed isolation checks. Evidence: `test-results/build-isolation/evidence.json`.
- 2026-11-28 — M4.3 implementation note: the installed UI SDK `0.1.0-beta.13` resolves a pixel `defaultSize` against pre-layout panel widths at startup when reduced motion is active, producing an incorrect default share. The shell supplies a two-panel initial percentage layout derived from the measured viewport (`initialSidebarLayout`) so the 240px session default holds. CSS `min-width: 200px`/`max-width: 320px` on the sidebar panel keeps the approved pixel bounds stable during the SDK's asynchronous group-resize reconciliation; the SDK still owns pointer/keyboard resize and layout. This is a workaround for observed beta behavior, not a second layout implementation.
- 2026-11-28 — docs commit `docs: adopt autonomous operating mandate` (local; not pushed):
  - `powershell -NoProfile -File scripts/native.ps1 pnpm exec prettier --check AGENTS.md BUILD-STATUS.md .opencode/agents/merlin.md` — exit 0; "All matched files use Prettier code style!"
  - `git diff --check` — exit 0; no output.
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
- Autonomous roadmap execution: `docs/DECISIONS.md` D-069.
- Phase 2 remains documented in `docs/PHASE-2-PLAN.md`. It begins after Phase 1 closure under D-069.
- Read `AGENTS.md` before resuming.