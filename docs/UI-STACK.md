# UI Stack and Integration Rules

## 1. Chosen stack

- Tauri 2
- React 19+
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui using Base UI
- Vercel UI SDK: `@ui-sdk/react`, `@ui-sdk/core`
- Milkdown
- Lucide React
- SQLite
- Rust native services

Pin exact versions in the package manager lockfile. Verify compatibility during technical preflight on Windows 11 with Node.js 24.22.1, pnpm 12.15.0, and Rust 1.97.1. Do not downgrade those tools without a demonstrated compatibility reason recorded in `DECISIONS.md`.

## 2. Responsibility boundaries

### shadcn/ui + Base UI
Use for standard visual components:
- Buttons
- Inputs
- Selects
- Checkboxes
- Tabs
- Menus
- Dialog primitives where not owned by UI SDK
- Tooltips and common form controls

shadcn is a source-code distribution approach; customize components to Merlin's semantic tokens.

### Vercel UI SDK
Use for sophisticated interaction behavior where it provides a clear advantage:
- Resizable panel groups
- Complex keyboard interaction
- Collapse/restore behavior
- Other advanced behavior primitives after reviewing the installed package API

It is not Merlin's visual design system and does not own business logic, persistence, or domain state.

### Native HTML/CSS
Use for simple layout and semantic elements where a library adds no value.

### Milkdown
Owns Markdown editing behavior. Prove round-trip preservation before making it the default editor.

Milkdown does not define Merlin's security boundary. Preserve HTML/MDX in source, but render it only under the sanitization, URL, and no-execution policy in `SECURITY.md`.

## 3. Avoid overlapping ownership

Do not implement the same interaction through multiple libraries. For example, do not wrap one resizable implementation inside another competing resizable system.

For each interaction, choose one owner and document the choice.

## 4. UI SDK package discipline

- Pin `@ui-sdk/react` and `@ui-sdk/core` versions.
- Read the installed documentation, especially `node_modules/@ui-sdk/react/docs/llms.txt` if available.
- Do not assume beta API names from external examples.
- Add tests for keyboard/focus/accessibility behavior.
- Persist panel layout in Merlin settings/SQLite, not localStorage.
- Keep behavior adapters thin.
- The UI SDK remains selected despite its beta status. Phase 0 must prove the exact pinned versions support resizable panels, keyboard resize, focus behavior, collapse/restore, and SQLite-backed layout persistence. Do not replace it preemptively; document a demonstrated failure before proposing any replacement.

## 5. Tailwind CSS v4 and tokens

Use CSS-first Tailwind v4 configuration and semantic CSS variables. Theme-specific raw colors belong only in theme files.

Tailwind utility classes may reference semantic variables, but must not introduce raw theme colors or bypass the token contract.

Run the contrast validator as part of CI.

## 6. Technical preflight

Before building the complete application:
1. Verify Tauri 2 builds and runs on Windows 11 with Node.js 24.22.1, pnpm 12.15.0, and Rust 1.97.1.
2. Verify React/Vite/Tailwind v4/shadcn Base UI integration.
3. Verify the exact pinned UI SDK packages through a resizable-panel proof covering pointer and keyboard resize, focus, collapse/restore, reset, and SQLite-backed persistence across restart without browser localStorage.
4. Verify Milkdown round-trip behavior for frontmatter, tables, Mermaid, code blocks, task lists, HTML/MDX, plus the document renderer's sanitization, safe URL handling, MDX non-execution, and absence of Tauri capabilities.
5. Verify Rust filesystem watcher behavior and atomic writes.
6. Verify SQLite migration strategy.
7. Verify Windows Credential Manager access from Tauri.
8. Verify safe process launching.
9. Verify theme token loading and CI contrast validation.

If a package/API is incompatible, record the exact version, environment, failed proof, and evidence. Keep the selected UI SDK unless a demonstrated failure warrants a separately approved replacement; update `DECISIONS.md` before broad implementation.
