# Phase 1 Milestone 4 — Application Shell, Navigation, Minimal Common Controls, and Phase 1 Closure

Status: **Decisions M4-D1–M4-D6 approved 2026-11-26. Checkpoint 1 (M4.1) authorized 2026-11-26;
Checkpoint 2 (M4.2) authorized 2026-11-28 and accepted 2026-11-28. Checkpoint 3 (M4.3) implemented
and automatically verified under the autonomous operating mandate (D-069); manual Windows 11
acceptance is pending. Checkpoints 4–6 proceed under D-069 without separate approval.** This
document does not authorize dependency changes, migrations, IPC changes, or pushes.

Status update 2026-11-28: The product owner authorized M4 Checkpoint 2 (M4.2) with the words
"M4 Checkpoint 2 is authorized" and approved the execution envelope. Implementation is present in
the working tree; source-level audit corrections were accepted. The required automated gates have
since run and passed; exact commands and results are recorded in `BUILD-STATUS.md`. Manual Windows
11 verification passed and the product owner accepted the checkpoint on 2026-11-28. The local
commit boundary is `feat: add product shell and navigation`; no push is authorized.

Status update 2026-11-28: The product owner adopted the autonomous operating mandate in
`AGENTS.md` and directed the primary agent to choose and complete unblocked slices without
per-checkpoint approval (D-069). Checkpoint 3 (M4.3) is implemented and automatically verified;
manual Windows 11 acceptance is pending and is not inferred. The local commit boundary is
`feat: add resizable session sidebar`; no push is authorized. Checkpoints 4–6 proceed under D-069.

Date: 2026-11-26

Authoritative requirements:

- `docs/IMPLEMENTATION-PLAN.md` Phase 1 and Milestone 4
- `docs/UX-SPEC.md` §1
- `docs/DESIGN-SYSTEM.md` §5 and §8
- `docs/design-tokens.md` §5
- `docs/UI-STACK.md` §2–§3
- `docs/SECURITY.md`
- `docs/PHASE-2-PLAN.md` §1 and P2-M1
- `BUILD-STATUS.md`

If this plan conflicts with an authoritative document, the authoritative document wins and this
plan must be corrected before implementation.

## 1. Purpose and authorization boundary

Phase 1 is incomplete. Milestones 1–3 delivered production identity and database lifecycle,
persisted settings, and the Merlin Dark design-system/CI foundation. The normal React surface is
still the Phase 0 technical-preflight proof and exposes no product navigation.

Milestone 4 is the remaining Phase 1 work:

- Replace the proof surface with the product shell.
- Add exactly Overview, Projects, and Resources navigation.
- Add the shell, sidebar, minimal common-control, and honest unavailable-state foundations.
- Preserve the Phase 0 proof coverage outside the normal product surface.
- Close the remaining Phase 1 verification gaps.

The six decisions in §2 are approved, including **Option B** for the harness-only multi-page Vite
build. **Checkpoint 1 is the first authorized implementation task.** Checkpoints 2–6, Phase 2, and
any dependency, migration, IPC, or production-build-boundary change remain unauthorized.

## 2. Approved decisions

| ID    | Approved resolution                                                                                                                                                                                                                                                                                                    | Implementation consequence                                                                                                                                                                                                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M4-D1 | Build only the smallest useful shared control foundation required by the shell, navigation/sidebar, immediate Phase 2 entry, and documented accessibility. Classify each proposed control as required, deferred, or already provided; identify a concrete consumer; add no duplicate wrappers or new dependencies.     | The inventory in §6 is the maximum M4 control scope. Button already exists; Input, Textarea, Label, and Dialog are added for P2-M1; all other listed controls are deferred.                                                                                                                     |
| M4-D2 | Sidebar width is session-only: 240px default, 200–320px bounds, UI SDK resizable, reset to 240px on restart. No settings key, IPC, migration, or width-persistence mechanism. Preserve existing persisted settings and layout data.                                                                                    | The shell does not read or write the existing four-panel `PanelLayout` and does not persist sidebar width. The sidebar is not "persisted layout state."                                                                                                                                         |
| M4-D3 | Typed in-memory navigation for exactly Overview, Projects, and Resources. No URL routing, deep links, browser history, or navigation framework unless an existing architectural constraint makes it unavoidable; then provide evidence and request approval.                                                           | `src/app/navigation.ts` owns a typed destination union and initial state. No router dependency is added. Restart returns to Overview.                                                                                                                                                           |
| M4-D4 | All three destinations remain enabled and navigable, each with a deliberate honest not-yet-implemented state. No fabricated data, metrics, records, or controls implying unavailable functionality. Make implemented-versus-future distinctions clear.                                                                 | Each page renders an explicit unavailable state. No disabled destinations, fake rows, counts, dates, search boxes, filters, or action buttons that imply a workflow exists.                                                                                                                     |
| M4-D5 | Preserve complete Phase 0 security/rendering coverage. Relocate proof tests out of the normal production UI without deleting, weakening, skipping, or silently reducing assertions. Inspect optimized-harness coverage separately and request approval before any build-boundary or feature-guard architecture change. | Proofs move to a dev-only harness. §8 maps every proof assertion. **Option B is approved:** a harness-only multi-page Vite build adds the proof pages to the optimized harness while production remains single-entry. No production route, hidden diagnostic, or feature-guard branch is added. |
| M4-D6 | No settings screen, settings page, or theme picker. Keep the existing M2 settings foundation, Merlin Dark before render, density/reduced-motion behavior, settings IPC, and persistence unchanged. No new settings keys or IPC.                                                                                        | The shell loads/applies settings silently. A load failure shows a fixed, content-free status with safe defaults. No settings destination or theme control is added.                                                                                                                             |

## 3. Verified current state (2026-11-26)

| Item                        | Verified state                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Branch                      | `main`                                                                                                                                                                                                                                                                                                             |
| HEAD                        | `ad2f0ea848960e3c5bc442d911bb212397e40f22`                                                                                                                                                                                                                                                                         |
| `origin/main`               | `d1a48646cb3d54a2ffb97b0d8aa9c56855fae8fa`                                                                                                                                                                                                                                                                         |
| Local commits ahead         | 2 planning commits (`69313bd`, `ad2f0ea`) plus the finalization commit that contains this plan; all documentation-only                                                                                                                                                                                             |
| Hosted CI                   | Green at `d1a4864` for `frontend-theme` and `native`. The frontend job runs Prettier, typecheck, lint, theme/token validation, Vitest, Chromium, and `pnpm build`; the native job runs formatting, Clippy, and Rust tests. Hosted CI does not run real WebView2, NSIS packaging, or the production-boundary gates. |
| Normal React surface        | `src/App.tsx` is the Phase 0 proof shell                                                                                                                                                                                                                                                                           |
| Native boundary             | Exactly six commands: `preflight_get_layout`, `preflight_save_layout`, `settings_get`, `settings_set_theme`, `settings_set_density`, `settings_set_reduce_motion`                                                                                                                                                  |
| Settings keys               | Exactly `app.theme_slug.v1`, `app.density.v1`, and `app.accessibility.force_reduced_motion.v1`                                                                                                                                                                                                                     |
| Navigation                  | None; no router dependency is installed                                                                                                                                                                                                                                                                            |
| UI SDK                      | `@ui-sdk/react` / `@ui-sdk/core` `0.1.0-beta.13` installed; pixel sizes and keyboard resize are documented and proven                                                                                                                                                                                              |
| Existing layout persistence | Four-panel percentage `PanelLayout` used by `PanelProof`; separate from sidebar width and not modified by M4                                                                                                                                                                                                       |
| Browser tests               | Chromium and WebView2 suites currently depend on proof-surface test IDs                                                                                                                                                                                                                                            |
| Optimized harness           | Checkpoint 1 adds `vite.harness.config.ts`, which builds the shell and proof pages into a separate output directory; production `vite.config.ts` remains single-entry                                                                                                                                              |

> **2026-11-28 baseline correction:** actual `HEAD` and `origin/main` are
> `3da8bfcf2a3a74ee6ffb93b464f89e9fb46baee7`. The table above records the historical 2026-11-26
> baseline. Checkpoint 1's commit `1cdb814` is present in `origin/main` history via `3da8bfc`.

The finalization commit records the approved decisions in `docs/DECISIONS.md` (D-061–D-066), this
plan, and the companion status documents. It contains no source, native, dependency, lockfile,
migration, capability, or IPC change. The exact finalization commit and resulting remote HEAD are
recorded in `BUILD-STATUS.md` after the documentation push.

## 4. Scope

### 4.1 In scope

1. **Product shell** replacing the proof surface. The normal application must not call itself a
   preflight or say it is not a product screen.
2. **Primary navigation** with exactly three destinations: Overview, Projects, Resources.
3. **Session-only resizable sidebar** using the installed UI SDK resizable primitive. Default
   240px; 200–320px bounds; 28px items; 2px active indicator.
4. **Navigation accessibility**: keyboard operation, visible focus, accessible names, active
   destination exposed with `aria-current="page"`, and no focus loss when destinations change.
5. **Page and content foundations**: application frame, page/section headers, content region, and
   explicit not-yet-implemented states for all three destinations.
6. **Minimal common-control foundation** from §6, owned by shadcn/Base UI patterns over installed
   Base UI primitives and styled with semantic tokens.
7. **Status and unavailable presentation** used by the shell: `StatusMessage` for settings-load
   failure and `UnavailableState` for the three destinations.
8. **Phase 0 proof relocation**: a dev-only proof harness that preserves every existing proof
   assertion outside the normal product surface.
9. **Phase 1 closure verification**: navigation/accessibility/sidebar tests; settings and layout
   regression; secret-like settings rejection; log-path finding; migration/settings repository
   re-verification through typed commands.
10. **Documentation and status**: update `README.md`, `docs/IMPLEMENTATION-PLAN.md`,
    `docs/PHASE-2-PLAN.md`, `BUILD-STATUS.md`, and this plan.

### 4.2 Out of scope

- Overview, Projects, or Resources product workflows, records, metrics, counts, dates, activity,
  usage, or resource data.
- Project workbench, four-panel product layout, Docs, Todos, Activity, or Resources panels.
- Settings screen, settings destination, theme picker, density picker, or reduced-motion control.
- Deep-link/URL routing, browser-history integration, or navigation persistence across restart.
- Sidebar width persistence across restart. No new settings key, IPC command, migration, table,
  column, or browser-storage mechanism.
- New npm or Rust dependencies, or a second resizable/control library.
- New SQLite migrations, product-entity repositories, settings keys, IPC commands, Tauri
  capabilities, CSP relaxations, or remote content.
- Browser `localStorage`, `sessionStorage`, IndexedDB, cookies, or any alternative browser
  persistence.
- Fabricated projects, resources, accounts, allowances, activity, metrics, or usage.
- The deferred UI SDK Agent Bridge, WebMCP, or other product agent features.
- Any Phase 2 project/repository/Docs-root implementation.

## 5. Shell, navigation, and sidebar contract

### 5.1 Navigation model

`src/app/navigation.ts` owns:

```ts
export const DESTINATIONS = ["overview", "projects", "resources"] as const
export type DestinationId = (typeof DESTINATIONS)[number]
```

The shell holds `useState<DestinationId>("overview")`. Activation sets the typed id. There is no
URL, hash, query parameter, `history` API, router dependency, or persisted destination.

Evidence for M4-D3: `package.json` contains no router; the current application has no routing;
the PRD and UX-SPEC define three fixed primary destinations but no deep-link or browser-history
requirement; the Tauri configuration defines one main window and no deep-link handler. No
architectural constraint requires URL routing. If one appears during implementation, stop and
request approval with the evidence.

### 5.2 Sidebar geometry and session behavior

| Property            | Contract                                                                |
| ------------------- | ----------------------------------------------------------------------- |
| Default width       | 240px on every launch and full reload                                   |
| Minimum width       | 200px                                                                   |
| Maximum width       | 320px                                                                   |
| Item height         | `var(--sidebar-item-height)` = 28px in both densities                   |
| Active indicator    | `var(--active-indicator-width)` = 2px, using a validated semantic color |
| Resize owner        | `@ui-sdk/react/resizable` only; no second resizable implementation      |
| Persistence         | None. No settings key, IPC, migration, layout row, or browser storage   |
| Destination changes | Width is retained because the shell and resizable group stay mounted    |
| Restart/reload      | Width returns to 240px                                                  |
| Collapse            | Not collapsible; navigation must remain persistent                      |

Implementation rules:

- Use `<ResizablePanel defaultSize="240px" minSize="200px" maxSize="320px">` and a named
  `ResizableHandle`.
- Do not use `autoSaveId`, a custom storage adapter, or `onLayoutCommit` to save width. No layout
  commit handler is needed for the sidebar.
- `onLayoutChange`/`onLayoutCommit` report percentages, not pixels. Do not invent a
  percentage-to-pixel persistence conversion.
- The shell does not call `preflight_get_layout` or `preflight_save_layout`. The existing
  four-panel layout data, commands, and tests remain unchanged and independent.
- The sidebar panel must not shrink below 200px or grow above 320px when the window resizes.
- The handle must be keyboard focusable and named. Arrow keys, Home, and End use the installed UI
  SDK behavior. The visual divider may be subtle, but the handle retains its hit area and visible
  focus.
- Do not call sidebar width "persisted layout state." It is session UI state only.

### 5.3 Destination states

All three destinations are enabled. Each page renders a page heading and a shared
`UnavailableState` with:

- A clear statement that the destination is not implemented in this build.
- A short, factual description of what is absent.
- No fabricated records, counts, dates, activity, metrics, usage, or readiness.
- No disabled or enabled control that implies the workflow exists (no search box, filter, table,
  "New project," "Add resource," or similar action).
- No wording such as "No projects yet" that implies an empty data store rather than an
  unimplemented workflow.

Suggested copy:

| Destination | Heading   | State text                                                                                                              |
| ----------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Overview    | Overview  | "Overview is not implemented in this build. Project summaries, resource readiness, and activity are not available yet." |
| Projects    | Projects  | "Project records and the project workbench are not implemented in this build."                                          |
| Resources   | Resources | "Resource records, accounts, and usage tracking are not implemented in this build."                                     |

A small shell-level status line may say that navigation and display settings are available while
project and resource workflows are not. Do not add a fake summary row or fake activity.

### 5.4 Settings startup and the absence of settings UI

- `index.html` continues to supply `data-theme="merlin-dark"`, `data-density="default"`, and
  `color-scheme: dark` before the application script runs.
- `src/main.tsx` continues to apply synchronous defaults before the first React render.
- `AppShell` loads persisted settings through the existing `ApplicationSettingsStore`, validates
  them, and applies them with `applyApplicationSettings`.
- Successful settings load is silent. Failure applies safe defaults and renders a non-blocking
  `StatusMessage` with a fixed, content-free message. Do not display raw errors or log them.
- Persisted compact density and forced reduced motion may apply after the first render; that
  asynchronous transition is the accepted M2/M3 behavior. Do not claim compact density is present
  before settings load.
- No settings screen, settings destination, theme picker, density picker, or reduced-motion
  control is added.
- No new settings key, IPC command, migration, or persistence mechanism is added.

### 5.5 Accessibility

- The navigation is a named `nav` landmark containing three native `<button>` elements. Nav items
  are full-width 28px rows with a 2px active indicator; the shared `Button` remains the action
  control for forms/dialogs and is not wrapped into a nav-item variant.
- The active destination has `aria-current="page"`.
- Tab/Shift+Tab, Enter, and Space operate the destinations. Focus remains on the activated nav
  control after the destination changes.
- The content region is a `main` landmark associated with the current page heading.
- The resize handle has an accessible name and visible `:focus-visible` treatment.
- No motion is required. If any transition is added, it must respect both
  `prefers-reduced-motion` and `data-force-reduced-motion`.
- Do not add a skip link, roving tabindex, or custom keyboard model in M4; the three-button
  navigation does not need them.

## 6. Common-control inventory

This is the approved M4-D1 application of "smallest useful shared control foundation." A control
is included only with a concrete consumer in M4, navigation/sidebar, immediate Phase 2 entry, or
documented accessibility. No control is added "for later."

### 6.1 Shared controls

| Control  | Classification                   | Concrete consumer                                                         | Decision and reason                                                                                                  |
| -------- | -------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Button   | Already provided                 | No new M4 mount required; P2-M1 project form and Docs-root dialog actions | Keep `src/components/ui/button.tsx` and its existing variants. Add no variant without a concrete M4/P2-M1 state.     |
| Input    | Required — immediate P2-M1 entry | P2-M1 project name field                                                  | Add one text-input wrapper over the installed Base UI/native input pattern. No search/number/password variants yet.  |
| Textarea | Required — immediate P2-M1 entry | P2-M1 project description field                                           | Add one multi-line wrapper. No rich-text or autosize behavior.                                                       |
| Label    | Required — immediate P2-M1 entry | P2-M1 project name and description labels; accessible association         | Add one native `<label>` wrapper with token styling and explicit `htmlFor`. Do not add a separate Field wrapper yet. |
| Dialog   | Required — immediate P2-M1 entry | P2-M1 Docs-root confirmation/create/choose/skip surface                   | Add one modal wrapper with Base UI focus trap/restore, Escape close, labelled title/description, and token styling.  |

### 6.2 Shell presentation (not shadcn controls)

| Component        | Classification  | Concrete consumer                                       | Decision and reason                                                                              |
| ---------------- | --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| StatusMessage    | Required for M4 | Settings-load failure in `AppShell`                     | Add one inline status component with a fixed, content-free message and correct live-region role. |
| UnavailableState | Required for M4 | Overview, Projects, and Resources not-implemented pages | Add one explicit unavailable-state component. It is not an empty-dataset component.              |
| EmptyState       | Deferred        | No real empty dataset exists in M4                      | Do not add it until Phase 2/3 has a genuine empty collection to present.                         |
| PageHeader       | Required for M4 | Shell page title/description                            | Simple semantic heading component; no control-library behavior.                                  |

Navigation/sidebar adds no new shared control. The three nav items are native `<button>` elements
styled by `shell.css`; the UI SDK `Resizable`/`ResizableHandle` is already installed and is used
directly, not wrapped in a second resizable abstraction.

### 6.3 Deferred controls

| Control                                                                                   | Deferral reason                                                                                                                           |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Checkbox                                                                                  | No M4 or P2-M1 boolean field. P2-M1 project status starts at its initial value; no toggle is exposed.                                     |
| Select                                                                                    | No M4 or P2-M1 selection control. Project selection in P2-M1 can use the project list/actions.                                            |
| Tabs                                                                                      | No M4 or P2-M1 tabbed surface.                                                                                                            |
| DropdownMenu / Menus                                                                      | No M4 or P2-M1 menu. P2-M1 actions are visible buttons in a form/dialog.                                                                  |
| Tooltip                                                                                   | No essential-only information. Visible labels and descriptions are required instead.                                                      |
| Field wrapper                                                                             | Defer until P2-M1 validation/help design proves a shared field wrapper is needed; use Label plus `aria-describedby`/`aria-invalid` first. |
| AlertDialog                                                                               | Dialog covers the P2-M1 confirmation need; do not add two modal wrappers.                                                                 |
| Accordion, Popover, Command, Table, Badge, Toast, Progress, and other registry components | No concrete M4 or P2-M1 consumer. Add only with a separately approved milestone that uses them.                                           |

### 6.4 Control rules

- Use the existing shadcn-style local component pattern. Input, Textarea, and Label may wrap native
  elements; Dialog uses the already-installed `@base-ui/react/dialog` primitive. Do not run a
  generator that requires network access or adds a dependency. Do not add a second control library.
- Customize every component to semantic tokens. Do not leave generic shadcn palette classes, raw
  colors, unregistered variables, or a second visual system.
- UI SDK and shadcn/Base UI must not own the same interaction. The sidebar resize remains UI SDK;
  the standard controls remain shadcn/Base UI.
- Foundation-only controls are not mounted in the product shell. Exercise them in the dev-only
  controls harness and focused tests. They must not display fabricated domain data.
- Reuse existing validated semantic pairings. If a rendered control state genuinely requires a new
  token or contrast pairing, stop and request approval; do not silently change the theme contract.
- Add behavior tests for keyboard operation, focus, accessible names, disabled/error states, and
  dialog focus return where applicable.

## 7. File map

### 7.1 Shell, navigation, and pages

| File                                              | Action  | Purpose                                                                                |
| ------------------------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `src/App.tsx`                                     | Replace | Thin root that renders `AppShell`; remove proof imports and proof output               |
| `src/app/AppShell.tsx`                            | Add     | Application frame, settings load/apply, destination state, sidebar, content            |
| `src/app/navigation.ts`                           | Add     | Typed destinations, labels, initial destination, sidebar width constants               |
| `src/app/navigation.test.ts`                      | Add     | Pure navigation-state, invalid-id, initial, and width-constant tests                   |
| `src/app/AppShell.test.tsx`                       | Add     | Destination switching, active state, focus retention, settings fallback                |
| `src/components/shell/PrimaryNavigation.tsx`      | Add     | Named `nav` landmark, three destination buttons, active indicator                      |
| `src/components/shell/PrimaryNavigation.test.tsx` | Add     | Keyboard activation, active state, accessible name, focus retention                    |
| `src/components/shell/PageHeader.tsx`             | Add     | Page title/description header with semantic heading level                              |
| `src/features/overview/OverviewPage.tsx`          | Add     | Overview heading and `UnavailableState`; no data                                       |
| `src/features/projects/ProjectsPage.tsx`          | Add     | Projects heading and `UnavailableState`; no data                                       |
| `src/features/resources/ResourcesPage.tsx`        | Add     | Resources heading and `UnavailableState`; no data                                      |
| `src/components/common/StatusMessage.tsx`         | Add     | Inline settings-failure status with a fixed message                                    |
| `src/components/common/StatusMessage.test.tsx`    | Add     | Role, accessible text, no raw-error reflection                                         |
| `src/components/common/UnavailableState.tsx`      | Add     | Explicit not-implemented state with no fake controls                                   |
| `src/components/common/UnavailableState.test.tsx` | Add     | Heading/description semantics and no fabricated content                                |
| `src/styles/shell.css`                            | Add     | Shell frame, sidebar, nav item, active indicator, content region                       |
| `src/styles/index.css`                            | Edit    | Import `shell.css`; stop importing proof-only `preflight.css` into the product surface |

### 7.2 Minimal common controls

| File                                  | Action | Purpose                                                            |
| ------------------------------------- | ------ | ------------------------------------------------------------------ |
| `src/components/ui/input.tsx`         | Add    | Token-styled text input with visible focus                         |
| `src/components/ui/textarea.tsx`      | Add    | Token-styled multi-line input with visible focus                   |
| `src/components/ui/label.tsx`         | Add    | Token-styled accessible label                                      |
| `src/components/ui/dialog.tsx`        | Add    | Modal wrapper with focus trap/restore, Escape, labelled content    |
| `src/components/ui/input.test.tsx`    | Add    | Label association, focus, disabled/error attributes                |
| `src/components/ui/textarea.test.tsx` | Add    | Label association, focus, disabled/error attributes                |
| `src/components/ui/label.test.tsx`    | Add    | Association and accessible name                                    |
| `src/components/ui/dialog.test.tsx`   | Add    | Open/close, Escape, focus trap/restore, labelled title/description |

### 7.3 Proof and control harnesses

| File                             | Action                   | Purpose                                                                                          |
| -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ |
| `tests/harness/proofs.html`      | Add                      | Dev-only Vite HTML entry for the Phase 0 proofs                                                  |
| `tests/harness/proofs.tsx`       | Add                      | Mount the existing proof composition with real browser stores                                    |
| `tests/harness/controls.html`    | Add                      | Dev-only entry for the minimal common-control harness                                            |
| `tests/harness/controls.tsx`     | Add                      | Render Input, Textarea, Label, Dialog, and Button with test-only state                           |
| `tsconfig.harness.json`          | Add                      | Isolated typecheck for `tests/harness/**/*.tsx` with the existing `@/` alias                     |
| `vite.harness.config.ts`         | Add (Option B approved)  | Multi-page harness build into a separate output directory; production build remains single-entry |
| `scripts/build-test-harness.ps1` | Edit (Option B approved) | Build the optimized harness from the harness config and embed only that output                   |

These files are test infrastructure. They are served by the Vite development server and are not
product routes. Do not add a production route, query-parameter branch, or hidden diagnostics
surface to the application. The harness typecheck must resolve the existing `@/` alias (or the
harness must use relative imports).

### 7.4 Browser tests

| File                            | Action                           | Purpose                                                                          |
| ------------------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| `tests/e2e/chromium.spec.ts`    | Edit                             | Shell/navigation/sidebar tests plus proof-harness navigation                     |
| `tests/e2e/shell.spec.ts`       | Add if the suite is split        | Shell-only Chromium coverage; update `playwright.chromium.config.ts` `testMatch` |
| `tests/e2e/webview2.spec.ts`    | Edit                             | Development shell/settings/proof harness; optimized shell/settings/layout IPC    |
| `playwright.chromium.config.ts` | Edit only if a new spec is added | Include the new spec without changing ports/timeouts                             |

## 8. Phase 0 proof relocation and optimized-harness coverage

### 8.1 What must be preserved

The current proof surface in `src/App.tsx` composes `ControlStateProof`, `PanelProof`,
`MarkdownProof`, and the external-link status. The following assertions must remain executable
after the shell replaces `App.tsx`:

| Proof area                    | Current assertions to preserve                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Panel resize/collapse/restore | Pointer drag, arrow keys, Home/End, collapse/restore, reset, focus sentinel, no browser storage                         |
| Panel persistence             | SQLite load/save/commit, restart restore, no localStorage                                                               |
| Control states and density    | Neutral/accent/destructive base, hover, pressed, selected, disabled, focus, 32px/28px density                           |
| Markdown round-trip/security  | Canonical fixture, hostile HTML, MDX inert source, links/images, Mermaid fallback, no remote fetch, no script execution |
| Editor focus/accessibility    | Milkdown contenteditable accessible name, focus-within boundary, 2px focus ring                                         |
| Theme/contrast                | Merlin Dark computed colors, hairline rendering, semantic token pairings                                                |
| Settings startup              | Defaults, persisted density/reduced motion, no raw-error reflection, no browser storage                                 |

The relocation must not delete a test, skip a test, weaken an assertion, or replace a real check
with a comment. Test IDs and fixture selectors may move with the proof components; their assertions
must remain equivalent.

### 8.2 Dev-only proof harness (required)

Move the proof composition out of `src/App.tsx` into a test-only entry:

- `tests/harness/proofs.html` loads `tests/harness/proofs.tsx`.
- `proofs.tsx` renders the existing `ControlStateProof`, `PanelProof`, and `MarkdownProof` with the
  real browser stores, plus the external-link status. It imports the proof-only stylesheet
  explicitly after the shared styles.
- Chromium and development WebView2 tests navigate to `/tests/harness/proofs.html` for proof
  assertions, and to `/` for shell assertions.
- The production `pnpm build` must contain no `tests/harness` output. Verify by inspecting `dist/`.

This preserves the complete Phase 0 security/rendering coverage in Chromium and development
WebView2 without mounting proof-only UI in the product.

### 8.3 Optimized-harness coverage issue

The optimized harness is built by `scripts/build-test-harness.ps1`, which currently runs
`pnpm build` and embeds the resulting `dist/`. The default Vite build has only the `index.html`
input. Therefore a dev-only proof page cannot be present in the optimized harness without changing
the harness build boundary.

Current optimized-harness assertions that depend on the proof surface:

- `layout-status` / `settings-status` readiness and Markdown fixture readiness.
- Milkdown editor accessible name and contenteditable presence.
- Panel collapse, SQLite save, restart, and restore through the UI.

Assertions that do not depend on the proof surface and remain in the optimized harness:

- Packaged shell loads from `tauri.localhost` with Tauri IPC available.
- Merlin Dark, default/compact density, forced reduced motion, and dark `color-scheme`.
- Settings typed IPC, persistence, and restart.
- Hairline rendering and no browser storage.
- No console errors and no proof-only surface in the production package.

Two conforming options were considered. **Option B is approved (2026-11-26).**

| Option           | Mechanism                                                                                                                                                                                                                                                                                    | Coverage                                                                                                                                                                | Boundary impact                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **A**            | Dev-only proof harness only. Optimized harness verifies the packaged shell, settings, native layout IPC round-trip, and absence of proof pages.                                                                                                                                              | Complete Phase 0 security/rendering coverage remains in Chromium and development WebView2. Optimized-harness UI proof assertions are explicitly removed and documented. | No build-boundary change. Requires explicit approval of the documented optimized-harness reduction. |
| **B** (approved) | Add `vite.harness.config.ts` with multi-page inputs for the shell and proof pages; `build-test-harness.ps1` retains theme/token validation, builds the harness from that config into a separate output directory, and embeds only that output. Production `pnpm build` remains single-entry. | Every current optimized-harness proof assertion is preserved; proof pages exist only in the harness package.                                                            | Harness-only build-boundary change. No production build or feature-guard change.                    |

Approved resolution: **B**, because it preserves the optimized-harness proof parity without
shipping proof pages in the production package. Option A is not implemented and no optimized-harness
assertion is removed.

No option may add a hidden production route, a query-parameter proof mode, or a runtime
feature-guard branch to the product application.

## 9. Checkpoints

Each checkpoint is a candidate commit boundary. Checkpoint 1 and Checkpoint 2 were separately
authorized; Checkpoint 3 is implemented and verified under D-069. Checkpoints 4–6 proceed under
D-069 without separate approval. Do not push any checkpoint without separate authorization.
Hosted CI is required for the final milestone commit.

> **2026-11-28:** D-069 supersedes the per-checkpoint authorization gate. Checkpoint 2 was accepted;
> Checkpoint 3 is implemented and automatically verified with manual acceptance pending. Checkpoints
> 4–6 continue autonomously within the approved milestone scope. The local commit prohibition for
> Checkpoint 2 is superseded by its accepted commit `4bcab98`.

Six checkpoints are retained because proof relocation, shell/navigation, sidebar behavior, minimal
controls, cross-boundary integration, and closure each have a distinct acceptance gate and commit
boundary. They are not forced: if implementation shows that two checkpoints cannot pass
independently, merge them and record why rather than shipping an unverified boundary.

### M4.1 — Baseline guards and proof relocation

**Status: implemented and verified 2026-11-26. The authorized local commit is
`test: relocate phase 0 browser proofs to harness`; it is not pushed.** This is the first
authorized implementation task.

> **2026-11-28 correction:** `1cdb814` is present in actual `origin/main` history via `3da8bfc`.
> The earlier "not pushed" statement is superseded by the verified remote state.

**Objective:** Preserve the Phase 0 proof gate before replacing the product surface, settle the
optimized-harness mechanism, and add automated production/harness build-isolation guards.

**Scope:**

- Record the six-command/three-setting boundary and the baseline test/assertion inventory.
- Add the dev-only proof harness and move Chromium/development-WebView2 proof navigation to it.
- Add harness typechecking.
- Add the approved harness-only Vite config and update the harness build script (Option B).
- Keep the production Vite config single-entry and confirm the production build excludes the
  harness.
- Add an automated build-isolation check covering production `dist/` and the separate harness
  output.

**Exclusions:** No `App.tsx` replacement, shell, navigation, common controls, product page,
dependency, migration, IPC, capability, settings, database, or production build-boundary change.

**Dependencies:** M4-D5 Option B approval (satisfied 2026-11-26).

**Likely files:** `tests/harness/proofs.html`, `tests/harness/proofs.tsx`,
`tests/e2e/*.spec.ts`, `tests/support/*`, `tsconfig.harness.json`, `vite.harness.config.ts`,
`scripts/build-test-harness.ps1`, `scripts/verify-build-isolation.mjs` (or `.ps1`),
`package.json` script wiring, and the relevant ignore files.

**Tasks:**

- Move the proof composition without changing assertions or test IDs.
- Make the proof harness import the proof-only stylesheet explicitly, so M4.2 can remove it from
  the product import path.
- Navigate proof tests to the harness; keep the normal application entry on `/`.
- Keep the production `vite.config.ts` single-entry and unchanged in build behavior.
- Build the optimized harness from `vite.harness.config.ts` into a separate output directory, and
  embed only that output in the harness executable.
- Verify `dist/` has no harness HTML, harness entry JavaScript, or harness-only marker.
- Verify the optimized harness contains both the normal entry and the proof page.
- Verify the harness build does not overwrite or contaminate production `dist/`.

**Acceptance:**

- Every Phase 0 proof assertion still runs in Chromium and development WebView2.
- The production build contains no harness entry, page, or harness-only asset.
- The optimized harness preserves the existing proof assertions (Option B).
- No browser storage is introduced.
- No product behavior, dependency, migration, IPC, settings, or production build-boundary change.
- The build-isolation check fails if a harness page or harness-only marker appears in production
  output.

**Automated tests:** `pnpm typecheck`, `pnpm lint:frontend`, `pnpm test:e2e`, `pnpm build`,
`pnpm build:test-harness`, `pnpm verify:build-isolation`, inspect `dist/` and the separate harness
output.

**Manual verification:** Open `/` and the harness in the dev server; confirm `/` is still the proof
surface at this checkpoint and the harness is not linked from it.

**Security/regression risks:** Test pages accidentally entering production; proof assertions
drifting during the move; harness build config affecting the production build. Mitigate by keeping
the production Vite config single-entry, using a separate harness output directory, and running the
automated isolation check.

**Expected commit boundary:** `test: relocate phase 0 browser proofs to harness` (includes the
approved harness-only build config). Actual commands, outputs, production/harness isolation
evidence, and remaining limitations are recorded in `BUILD-STATUS.md` under "Phase 1 Milestone 4
documentation finalization and Checkpoint 1 (2026-11-26)".

### M4.2 — Navigation model, product shell, and honest destination states

**Status 2026-11-28:** Authorized by the product owner ("M4 Checkpoint 2 is authorized") and
execution envelope approved. Implementation is present in the working tree; source-level audit
corrections were accepted. Every required automated gate passes; exact commands and results are
recorded in `BUILD-STATUS.md`. Manual Windows 11 verification passed and the product owner accepted
the checkpoint on 2026-11-28. The local commit boundary is `feat: add product shell and navigation`;
no push is authorized.

**Objective:** Replace the proof surface with a working shell and three reachable destinations.

**Scope:**

- Add the typed navigation model and shell.
- Add `PrimaryNavigation`, `PageHeader`, `StatusMessage`, `UnavailableState`, and the three pages.
- Replace `src/App.tsx` with a thin root.
- Move settings load/apply into `AppShell`; keep synchronous defaults in `main.tsx`.
- Add `shell.css`; remove proof-only CSS from the product import path.
- Use a fixed 240px sidebar at this checkpoint; resizing is added in M4.3.

**Exclusions:** Sidebar resizing/bounds, common controls, proof harness changes, settings UI,
product data, routing, persistence.

**Dependencies:** M4.1.

**Likely files:** `src/App.tsx`, `src/app/AppShell.tsx`, `src/app/navigation.ts`,
`src/components/shell/*`, `src/features/*`, `src/components/common/*`, `src/styles/shell.css`,
`src/styles/index.css`, unit tests.

**Tasks:**

- Implement exactly three destinations and the initial Overview state.
- Keep the shell mounted while content changes.
- Add `aria-current="page"`, named nav/main landmarks, and focus retention.
- Add the honest unavailable states with no fabricated controls.
- Preserve settings startup/fallback behavior.
- Remove proof-only copy and imports from the product surface.

**Acceptance:**

- The normal application launches into the product shell.
- Exactly three destinations are visible, enabled, and reachable by pointer and keyboard.
- The active destination has `aria-current="page"`; focus remains on the activated control.
- No proof-only labeling, fake data, or fake controls appear.
- Settings/theme/density startup behavior is preserved.
- The sidebar is 240px at this checkpoint.

**Automated tests:** Navigation model unit tests; shell/nav/page/status tests; focused Chromium
shell test; axe on the shell.

**Manual verification:** Launch the dev app; confirm the first screen is the shell; navigate by
mouse and keyboard; confirm honest copy and no fabricated content.

**Security/regression risks:** Settings failure leaking raw errors; focus lost on destination
change; proof CSS removal breaking the harness; token scanner failures. Mitigate with canary tests,
focus assertions, and harness import checks.

**Expected commit boundary:** `feat: add product shell and navigation`.

### M4.3 — Session-only sidebar resize and accessible states

**Status 2026-11-28:** Implemented and automatically verified under D-069. The local commit boundary
is `feat: add resizable session sidebar`; no push is authorized. Manual Windows 11 acceptance is
pending and is not inferred. All Chromium checks for pointer drag, keyboard resize, session
retention, window-resize bounds, reload reset, focus visibility, and storage absence pass.

**Objective:** Implement the documented sidebar geometry and interaction without persistence.

**Scope:**

- Integrate the UI SDK `Resizable` group with 240px default and 200–320px pixel bounds.
- Style nav items at 28px with a 2px active indicator.
- Add hover, selected, focus-visible, and current states using existing declared token pairings.
- Add the named resize handle with visible focus.
- Add session-retention and restart-reset tests.
- Add no persistence mechanism.

**Exclusions:** Collapse/restore, sidebar width settings/IPC/migration/layout storage, browser
storage, a second resizable implementation, arbitrary destination rearrangement.

**Dependencies:** M4.2.

**Likely files:** `src/app/AppShell.tsx`, `src/app/navigation.ts`, `src/components/shell/*`,
`src/styles/shell.css`, unit tests, Chromium/WebView2 shell tests.

**Tasks:**

- Replace the fixed sidebar container with the UI SDK resizable group.
- Add constants for default/min/max width.
- Supply a two-panel initial percentage layout derived from the measured viewport, because the
  installed UI SDK resolves a pixel `defaultSize` against the panels' pre-layout widths during
  startup under reduced motion; the initial percentage preserves the 240px session default.
- Add pointer and keyboard resize tests.
- Test width retention across destination changes.
- Test full reload and process restart return to 240px.
- Test no localStorage/sessionStorage and no new settings key or layout write.

**Acceptance:**

- Default width is 240px.
- Width never leaves 200–320px under pointer, keyboard, or window resize.
- Width survives destination changes because the shell stays mounted.
- Full reload and restart return to 240px.
- Nav item height and indicator match the density tokens.
- No sidebar width persistence exists.
- No second resizable implementation exists.

**Automated tests:** Unit width constants; Chromium bounding-box, drag, keyboard, destination
retention, reload reset, and storage checks; development WebView2 restart reset; native
`preflight_get_layout`/settings unchanged checks.

**Manual verification:** Drag to both extremes; use arrow keys, Home, and End; switch
destinations; resize the window to 760px minimum; restart and confirm 240px.

**Security/regression risks:** UI SDK percentage layout vs pixel bounds; handle focus loss; content
overflow at the minimum window; accidental persistence. Mitigate with real Chromium/WebView2
measurements and explicit no-storage assertions.

**Expected commit boundary:** `feat: add resizable session sidebar`.

### M4.4 — Minimal common controls and harness

**Objective:** Add only the approved common controls needed by immediate Phase 2 entry, without
mounting them in the product shell.

**Scope:**

- Add Input, Textarea, Label, and Dialog; keep Button unchanged.
- Add the dev-only controls harness.
- Add focused keyboard/focus/ARIA tests.
- Run token and contrast validation.

**Exclusions:** Checkbox, Select, Tabs, Menus, Tooltip, Field, AlertDialog, Accordion, Popover,
Command, Table, Badge, Toast, and other deferred controls; product data; settings UI; new
dependencies.

**Dependencies:** M4.1 (harness infrastructure), M4.2 (shell styles/tokens).

**Likely files:** `src/components/ui/{input,textarea,label,dialog}.tsx` and tests;
`tests/harness/controls.html`, `tests/harness/controls.tsx`; `src/styles/components.css` only if a
new shared control style is required.

**Tasks:**

- Implement each control as one local wrapper over installed Base UI/native primitives.
- Use semantic tokens and existing validated pairings.
- Add label association, focus-visible, disabled/error attributes, and dialog focus management.
- Render the controls in the dev-only harness with test-only state and no domain data.
- Add axe coverage.

**Acceptance:**

- The four controls pass keyboard, focus, accessible-name, and dialog focus-return tests.
- Dialog closes on Escape and restores focus to its trigger.
- Controls consume semantic tokens only.
- No deferred control or Field/AlertDialog wrapper is added.
- No product surface mounts foundation-only controls or fabricated domain data.

**Automated tests:** Vitest/Testing Library control tests; Chromium controls-harness test; axe;
`pnpm test:themes`.

**Manual verification:** Keyboard through the controls harness; open/close the dialog; confirm
visible focus and labels.

**Security/regression risks:** Generated palette classes or raw colors; duplicate modal/field
wrappers; dialog focus leaks; scope creep into deferred controls. Mitigate with the inventory in
§6, token scanner, and focused tests.

**Expected commit boundary:** `feat: add minimal common controls`.

### M4.5 — Shell-era Chromium, WebView2, and native integration

**Objective:** Prove the shell through the real application boundaries and separate existing
persisted-state checks from new sidebar checks.

**Scope:**

- Update Chromium tests for shell navigation, sidebar bounds, focus, active state, axe, no remote
  requests, no browser storage, and reduced motion.
- Update development WebView2 tests for shell startup, settings IPC, proof-harness layout
  persistence/restart, and no console errors.
- Update optimized WebView2 tests for packaged shell assets, settings persistence across restart,
  native layout IPC round-trip, absence of proof-only surface in the production package, and the
  approved Option B proof-harness assertions in the optimized harness.
- Re-run existing native settings/layout tests.
- Preserve the settings rejection and no-reflection assertions.

**Exclusions:** New product features, native code changes, migrations, settings keys, IPC commands,
capabilities, and Phase 2 data.

**Dependencies:** M4.2–M4.4; M4-D5 option decision.

**Likely files:** `tests/e2e/chromium.spec.ts`, `tests/e2e/shell.spec.ts` (if split),
`tests/e2e/webview2.spec.ts`, `tests/support/*`, Playwright configs.

**Tasks:**

- Split shell tests from proof-harness tests where practical.
- Add explicit assertions for existing persisted state:
  - Settings survive restart.
  - The seeded four-panel `PanelLayout` is unchanged.
  - Merlin Dark is the pre-render theme.
  - Persisted density and forced reduced motion are applied after load.
- Add separate assertions for new sidebar behavior:
  - 240px default, 200–320px bounds.
  - Width retained across destination changes.
  - Restart/reload resets to 240px.
  - No new settings key, layout write, or browser storage.
- Keep existing-state and sidebar assertions in separate test cases so a sidebar failure cannot mask
  a settings/layout regression.
- Do not call sidebar width "persisted layout state."

**Acceptance:**

- Shell behavior passes in Chromium and real WebView2.
- Existing settings and layout data survive restart and are not rewritten by the shell.
- Sidebar width resets to 240px on restart and is never persisted.
- Rejected secret-like values do not appear in SQLite, console, process logs, or errors.
- The production package excludes the harness; the optimized harness matches the approved option.

**Automated tests:** `pnpm test:e2e`, `pnpm test:webview2`, `pnpm test:rust`, `pnpm test:rust:harness`,
`pnpm test:frontend`, `pnpm test:themes`.

**Manual verification:** Windows 11 debug and packaged launch; restart; settings/density/motion;
sidebar bounds; proof harness; no proof surface in production.

**Security/regression risks:** WebView2 environment/toolchain failures; test timing; proof
assertions lost in the optimized harness; accidental layout writes. Mitigate with explicit
before/after layout comparisons, canary checks, and documented environment recovery.

**Expected commit boundary:** `test: verify phase 1 shell integration`.

### M4.6 — Phase 1 closure verification and documentation

**Objective:** Close the remaining Phase 1 gates and record exact results.

**Scope:**

- Re-run migrations/settings repository tests through typed commands.
- Record the log-path finding: no product log-path setting, command, or schema column exists; the
  only process log is test-harness output under ignored `test-results/webview2/`.
- Re-run secret-like settings rejection evidence.
- Run the full local gate sequence, production build, NSIS packaging, production-boundary checks,
  and real WebView2 suite.
- Update `BUILD-STATUS.md`, `docs/IMPLEMENTATION-PLAN.md` M4 status, `README.md`,
  `docs/PHASE-2-PLAN.md`, and this plan.
- Push only with separate authorization; verify hosted CI for the milestone commit.

**Exclusions:** New features, Phase 2 implementation, unapproved dependencies/migrations/IPC, and
unapproved pushes.

**Dependencies:** M4.1–M4.5.

**Likely files:** `BUILD-STATUS.md`, `docs/IMPLEMENTATION-PLAN.md`, `README.md`,
`docs/PHASE-2-PLAN.md`, `docs/PHASE-1-M4-PLAN.md`; `docs/DECISIONS.md` only if separately
authorized.

**Tasks:**

- Run the complete closure matrix in §10 and record actual commands/results.
- Distinguish local Chromium, local real WebView2, production packaging, and hosted CI evidence.
- Record any unexecuted check or environmental limitation explicitly.
- Update Phase 2 entry conditions to match the achieved state.
- Do not claim Phase 1 complete until every required gate passes.

**Acceptance:**

- All Phase 1 acceptance and verification gates in `docs/IMPLEMENTATION-PLAN.md` pass.
- The §10 closure matrix is complete with recorded evidence.
- Hosted CI is green for the pushed milestone commit.
- Real WebView2 and packaging evidence is recorded separately; hosted CI is not described as
  proving WebView2.
- Phase 1 is declared complete only after these results are recorded.

**Automated tests:** The full §11 command sequence.

**Manual verification:** The §12 checklist, including Windows 11 debug and packaged launch.

**Security/regression risks:** Stale status claims; local toolchain failure; hosted CI mistaken for
WebView2/packaging proof; docs drift. Mitigate with explicit evidence tables and separate gate
labels.

**Expected commit boundary:** `docs: record phase 1 milestone 4 closure`.

## 10. Phase 1 closure criteria

Phase 1 is complete only when every row below has recorded evidence. "Hosted CI" means the GitHub
Actions `frontend-theme` and `native` jobs only; it does not run real WebView2, NSIS packaging, or
the production-boundary gates.

| Area                               | Requirement and source                          | Required evidence                                                                                                            | Gate                                                |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Shell replaces proof surface       | `IMPLEMENTATION-PLAN.md` M4; `UX-SPEC.md` §1    | Normal app renders the shell; no "preflight"/"not a product screen" copy; proof pages absent from `dist/`                    | Unit + Chromium + WebView2                          |
| Exactly three destinations         | `UX-SPEC.md` §1; D-002                          | Navigation model and rendered nav contain only Overview, Projects, Resources                                                 | Unit + Chromium + WebView2                          |
| Destinations enabled and reachable | M4-D4; `IMPLEMENTATION-PLAN.md` M4              | All three reachable by pointer and keyboard; none disabled                                                                   | Unit + Chromium + WebView2                          |
| Active state and focus             | `UX-SPEC.md` §1; `DESIGN-SYSTEM.md` focus rules | `aria-current="page"`; focus remains on the activated control; visible focus                                                 | Unit + Chromium + axe                               |
| Sidebar geometry                   | `UX-SPEC.md` §1; `design-tokens.md` §5          | 240px default; 200–320px bounds; 28px items; 2px indicator                                                                   | Unit + Chromium + WebView2                          |
| Sidebar session-only               | M4-D2                                           | Width survives destination changes; restart/reload resets to 240px; no settings key/IPC/migration/layout row/browser storage | Unit + Chromium + WebView2 + native schema          |
| No browser persistence             | Phase 1 security gate; M4-D2                    | localStorage/sessionStorage/IndexedDB/cookies remain unused for settings, layout, and sidebar width                          | Source + Chromium + WebView2                        |
| Honest unavailable states          | M4-D4; `UX-SPEC.md` §1                          | Explicit not-implemented copy; no fabricated records/metrics/controls                                                        | Unit + Chromium                                     |
| Local-first and explicit truth     | `PRD.md` §1 and §6                              | Shell fetches no remote content; no invented values; unavailable states are explicit                                         | Source + Chromium                                   |
| Architecture boundaries            | `ARCHITECTURE.md` §1–§3                         | Shell/navigation state stays in the app layer; no business logic in UI SDK; no native boundary change                        | Source review                                       |
| Minimal common controls            | M4-D1; `UI-STACK.md` §2                         | Button (existing), Input, Textarea, Label, Dialog; token-only; keyboard/focus/ARIA; deferred list documented                 | Unit + Chromium + axe + token/contrast              |
| Contrast and token validation      | Phase 1 acceptance; `DESIGN-SYSTEM.md`          | All required text/control/focus pairings pass locally and in CI; scanner finds no primitive/raw/unregistered tokens          | Local + hosted CI                                   |
| Settings foundation preserved      | M2/D-050–D-053; `IMPLEMENTATION-PLAN.md` M2     | Exactly three keys and four settings commands; recovery behavior; settings survive restart                                   | Native + WebView2                                   |
| Layout data preserved              | `IMPLEMENTATION-PLAN.md` Phase 1 integration    | Seeded four-panel `PanelLayout` unchanged after shell use/restart; existing save/restore tests pass                          | Native + development WebView2                       |
| Dark before render                 | M2/M3; `DESIGN-SYSTEM.md` §8                    | Static `data-theme="merlin-dark"`; first observed theme is Merlin Dark; defaults applied before render                       | Unit + Chromium + WebView2                          |
| Density and reduced motion         | M2/M3; `IMPLEMENTATION-PLAN.md` M2              | Persisted compact density and forced reduced motion applied after load; OS reduced-motion respected                          | Chromium + WebView2                                 |
| No settings UI                     | M4-D6                                           | No settings screen/destination/theme picker; settings IPC and persistence unchanged                                          | Source + Chromium                                   |
| Secret-like settings rejection     | `SECURITY.md`; Phase 1 security gate            | Canary rejected; absent from SQLite, console, process log, and errors                                                        | Native + WebView2                                   |
| Log-path surface                   | Phase 1 security gate                           | No product log-path setting/command/schema; documented not-applicable finding                                                | Source/schema/command inspection                    |
| Renderer/remote-content boundary   | `SECURITY.md`; Phase 0 renderer proof           | Shell renders no document/resource/remote content; CSP and capabilities unchanged                                            | Source + Chromium                                   |
| Phase 0 proof coverage             | M4-D5                                           | Every proof assertion preserved in Chromium/development WebView2; optimized harness uses the approved Option B proof pages   | Chromium + development WebView2 + optimized harness |
| Migrations                         | M1/M2                                           | V1→V2, idempotent reopen, V1/V2 history preserved, recovery behavior                                                         | Native                                              |
| Production boundary                | M1/M3                                           | Production features, harness exclusion, feature-conflict rejection, binary markers                                           | Production build + boundary gates                   |
| Windows 11                         | Phase 1 gate                                    | Debug launch and production-feature packaged build succeed                                                                   | Manual Windows 11                                   |
| Hosted CI                          | `IMPLEMENTATION-PLAN.md` M4                     | Both jobs green for the pushed M4 commit; no WebView2 claim                                                                  | Hosted GitHub Actions                               |
| Documentation/status               | Change discipline                               | `BUILD-STATUS.md`, README, M4 plan, and Phase 2 entry conditions match the achieved state                                    | Review                                              |

## 11. Test plan and exact commands

Do not claim a command passed unless it was actually run and its output recorded.

| Gate             | Command                                                                       | Expected additions                                                                         |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Formatting       | `pnpm format:check`                                                           | No new failures                                                                            |
| Types            | `pnpm typecheck`                                                              | App, Node, and harness configs                                                             |
| Lint             | `pnpm lint`                                                                   | Frontend zero warnings; default/harness Clippy                                             |
| Theme/contrast   | `pnpm test:themes`                                                            | Existing pairings pass; no unregistered tokens; new controls use semantic tokens           |
| Frontend unit    | `pnpm test:frontend`                                                          | Navigation, shell, status/unavailable, minimal controls                                    |
| Native default   | `pnpm test:rust`                                                              | Existing settings/layout tests; no new product-entity repository                           |
| Native harness   | `pnpm test:rust:harness`                                                      | Same under `test-harness`                                                                  |
| Chromium         | `pnpm test:e2e`                                                               | Shell/nav/sidebar/axe/proof-harness tests                                                  |
| WebView2         | `pnpm test:webview2`                                                          | Development shell/settings/proof harness; optimized shell/settings/layout IPC              |
| Production build | `pnpm tauri build --features custom-protocol,production --no-binary-patching` | Production package succeeds                                                                |
| Harness build    | `pnpm build:test-harness`                                                     | Optimized harness succeeds, includes Option B proof pages, and is excluded from production |
| Build isolation  | `pnpm verify:build-isolation`                                                 | Production `dist/` has no harness entry/page/marker; harness output does                   |
| Boundary         | `pnpm verify:production-boundary`                                             | Existing eight gates still pass                                                            |
| Hosted CI        | Push with approval, then inspect the workflow run                             | Both jobs green; Chromium runs; WebView2 is not claimed                                    |

## 12. Manual verification checklist (Windows 11)

1. Launch the debug app and the production-feature package on Windows 11.
2. Confirm the first screen is the product shell, not the Phase 0 proof.
3. Confirm exactly Overview, Projects, Resources are present; no settings destination, theme
   picker, or fake data.
4. Activate each destination by mouse and keyboard; confirm the active indicator and
   `aria-current="page"`.
5. Tab through nav items and the resize handle; confirm visible focus and logical order.
6. Drag the sidebar to both extremes; confirm 200px and 320px bounds.
7. Focus the handle and use arrow keys, Home, and End; confirm bounds and visible focus.
8. Resize the window to the 760px minimum and the 1100×760 default; confirm no horizontal scroll
   and sidebar bounds hold.
9. Resize the sidebar, change destinations, and confirm the width is retained.
10. Restart the app; confirm the sidebar returns to 240px while persisted density/reduced motion
    and the existing four-panel layout data remain intact.
11. Confirm the unavailable copy is explicit and does not imply records exist.
12. Enable OS reduced motion and the persisted forced setting; confirm no motion or only the
    approved reduced behavior.
13. Run a screen-reader check if available; otherwise record manual narration as unverified.
14. Confirm the production package contains no test harness or proof-only route.
15. Open the dev-only proof harness and confirm the Phase 0 proofs still run; confirm it is not
    linked from the product shell.

## 13. Risks and mitigations

| Risk                                                                | Mitigation                                                                                                                                                       |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Common-control breadth expands beyond Phase 1                       | Use the §6 inventory; stop if a new control or dependency is proposed                                                                                            |
| Generated shadcn components use generic palette/token classes       | Customize to semantic tokens; token scanner and contrast validation gate every control                                                                           |
| UI SDK pixel bounds behave differently from percentage expectations | Verify with real Chromium/WebView2 at min/default/max widths; do not add a second resize implementation                                                          |
| Sidebar width is accidentally persisted                             | No `autoSaveId`, no layout store call, no settings key; explicit no-storage and restart-reset tests                                                              |
| Replacing the proof surface drops Phase 0 browser coverage          | Relocate to the dev-only harness; map every assertion; Option B preserves optimized-harness proof parity                                                         |
| Optimized-harness proof parity is lost silently                     | §8 enumerates the affected assertions; approved Option B preserves them in the optimized harness                                                                 |
| Focus is lost when pages remount                                    | Keep the shell/nav mounted; test `document.activeElement` after every destination change                                                                         |
| Settings failure exposes raw errors                                 | Fixed content-free banner; canary absence tests                                                                                                                  |
| New control styling changes theme contrast                          | Reuse validated pairings; stop and request approval if a new pairing is required                                                                                 |
| Local Rust toolchain remains process-scoped                         | Use the documented exact 1.97.1 recovery or request a separately authorized repair; hosted native CI is green                                                    |
| Hosted CI is mistaken for real WebView2/packaging proof             | State explicitly that hosted CI runs frontend, Chromium, and native checks but not WebView2, NSIS, or the production boundary; keep those as local Windows gates |

## 14. Commit boundaries

Proposed for Checkpoints 2–6; **Checkpoint 1 is authorized.** No commit is authorized for
Checkpoints 2–6, and no push is authorized for any checkpoint without separate approval.

1. `test: relocate phase 0 browser proofs to harness` — dev-only proof pages, test navigation,
   harness typechecking, the approved Option B harness build, and build-isolation checks.
2. `feat: add product shell and navigation` — navigation model, shell, pages, honest states,
   shell styles, unit tests.
3. `feat: add resizable session sidebar` — UI SDK sidebar, bounds, session/restart behavior,
   accessibility tests.
4. `feat: add minimal common controls` — Input, Textarea, Label, Dialog, controls harness, tests.
5. `test: verify phase 1 shell integration` — Chromium/WebView2/native closure tests.
6. `docs: record phase 1 milestone 4 closure` — status, plan status, Phase 2 entry, exact results.

Each commit must pass its relevant local gates. Do not squash verification into an unverified
commit. Do not push without explicit authorization; hosted CI must be green for the final milestone
commit before Phase 1 is declared complete.

## 15. Phase 2 entry dependencies on Milestone 4

Only these Phase 2 entry dependencies are created by M4:

1. A real product shell and three-destination navigation exist, so P2-M1 can add a Docs entry point
   without replacing the proof shell.
2. The minimal common controls Button (existing), Input, Textarea, Label, and Dialog exist and are
   token-styled/tested, so P2-M1 can build project registration and the Docs-root confirmation
   without a second control stack.
3. Navigation state, active-destination semantics, and focus behavior are established, so P2-M1
   integrates instead of inventing routing or accessibility behavior.
4. Phase 1 closure verification proves the existing settings/migration/security boundary, so
   Phase 2 can rely on it.
5. Hosted CI is green for the M4 commit, satisfying the Phase 2 CI entry condition.
6. P2-M1 still requires separate approval for its minimal project/repository/Docs-root records and
   V3 migration; M4 does not implement or authorize them.

M4 does not persist sidebar width. Phase 2 must not assume a persisted sidebar width or add a
settings key for it without a separate decision.

## 16. Authorization status

On 2026-11-26 the user approved:

- Decisions M4-D1–M4-D6 and the control inventory in §6.
- Proof-relocation **Option B**: a harness-only multi-page Vite build, with production remaining
  single-entry.
- The scope in §4.1 and exclusions in §4.2, and implementation consistent with §5–§8.
- **Checkpoint 1 only** (`test: relocate phase 0 browser proofs to harness`), including permission
  to run its local verification commands and commit it locally.

Not authorized by the 2026-11-26 approval:

- Checkpoints 2–6.
- Pushing the Checkpoint 1 commit.
- Phase 2 implementation.
- Any dependency, migration, settings key, IPC command, capability, CSP, or production
  build-boundary change.

> **2026-11-28 status update:** D-069 supersedes the per-checkpoint authorization gates.
> Checkpoint 2 was separately authorized and accepted. Checkpoint 3 is implemented and verified
> under D-069 with manual acceptance pending. Checkpoints 4–6 and subsequent roadmap milestones
> proceed autonomously within the accepted product requirements. Push remains unauthorized. The
> Checkpoint 1 push prohibition is superseded by verified remote history: `1cdb814` is present in
> `origin/main` via `3da8bfc`.

## 17. Stop conditions

Stop and request direction if any of the following occurs:

- A new dependency, lockfile change, migration, settings key, IPC command, capability, or CSP
  change appears necessary.
- The installed UI SDK cannot enforce 200–320px pixel bounds with keyboard/pointer behavior.
- The minimal control set cannot be implemented with existing dependencies.
- The proof-harness relocation would require including test pages in the production build.
- The optimized-harness option requires a production build-boundary or feature-guard change.
- A security, focus, or accessibility gate fails in a way that requires changing the approved
  contract.
- A new semantic token or contrast pairing is required for the minimal controls.
- The local toolchain cannot execute the approved exact-version verification.
