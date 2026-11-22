# Instructions for coding agents

## Mission

Build Merlin according to the product and engineering contracts in `docs/`. These documents are the source of truth. Do not invent product features or silently simplify safety-critical behavior.

Before implementation:
1. Read `README.md`.
2. Read `docs/PRD.md`, `docs/UX-SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/DOCS-AND-VAULT.md`, `docs/SECURITY.md`, `docs/UI-STACK.md`, `docs/DESIGN-SYSTEM.md`, `docs/design-tokens.md`, and `docs/IMPLEMENTATION-PLAN.md`.
3. Inspect the actual repository and installed package versions.
4. Report conflicts, missing decisions, and technical risks before changing architecture.

## Non-negotiable engineering rules

- Local-first. No required account, cloud service, telemetry endpoint, or external database.
- Do not put API keys, passwords, or other secrets in SQLite, Markdown, logs, crash reports, or source control.
- API secrets belong in Windows Credential Manager. SQLite stores only non-secret metadata and a credential reference.
- Never silently overwrite user documents or resolve a two-sided sync conflict by choosing a side.
- Never interpret an unavailable repository or missing file as proof that the user deleted it.
- Use atomic writes for important file operations.
- Do not collect document contents in the Usage Journal.
- No keystroke, clipboard, screenshot, or external-app surveillance.
- No unrestricted shell execution. Custom actions must use validated, explicit action types and arguments.
- Unknown usage/balance is not zero.
- Do not claim that a resource was consumed merely because it was allocated to a project.
- Do not create fake project activity from opening a project or launching an application.
- Avoid background polling. Prefer event-driven watchers and reconciliation at startup/resume.
- Preserve recoverability for destructive actions.

## UI and interaction rules

- Follow `docs/DESIGN-SYSTEM.md` and `docs/design-tokens.md`.
- Components consume semantic tokens only. Never hardcode theme-specific hex colors, font families, radii, shadows, or border widths in component styles.
- Keep the three theme layers separate: hue primitives, semantic tokens, component styles.
- Theme selection is not a v1 feature. Ship Merlin Dark only, but implement the theme contract so additional bundled themes can be added without rewriting components.
- Use UI SDK for complex interaction behavior where specified; use shadcn/Base UI for standard visual components; use native HTML/CSS for simple elements.
- Do not let two libraries own the same interaction primitive.
- Keep layouts compact and data-dense without making long-form Markdown uncomfortable to read.
- Respect keyboard navigation, visible focus, accessible names, and reduced-motion preferences.
- No decorative gradients, glows, or gratuitous shadows.

## UI SDK

Use exact pinned versions of `@ui-sdk/react` and `@ui-sdk/core`. Before implementing a UI SDK behavior:
- Read the installed package documentation, especially `node_modules/@ui-sdk/react/docs/llms.txt` when present.
- Inspect the installed API and examples; do not rely on memory of beta APIs.
- Add behavior tests for keyboard, focus, collapse/restore, and layout persistence where relevant.
- Persist panel layout in Merlin settings/SQLite, not browser localStorage.
- Keep application business logic and persistence outside the UI SDK behavior layer.

## Docs editor and synchronization

- Markdown files are the source of truth for repo-backed Docs.
- Preserve frontmatter, code fences, Mermaid, tables, task lists, HTML/MDX, and unsupported syntax.
- Treat project document source as untrusted. Preservation does not permit HTML, MDX, scripts, links, or embedded content to execute or gain Tauri capabilities; follow `docs/SECURITY.md` and `docs/DOCS-AND-VAULT.md` for the rendering and recovery contracts.
- Add round-trip tests before relying on editor import/export.
- Never use a lossy editor conversion as an excuse to rewrite source files.
- Follow `docs/DOCS-AND-VAULT.md` for conflict handling and recovery.

## Testing expectations

Every phase must meet the verification outcomes in `docs/IMPLEMENTATION-PLAN.md`. At minimum, where relevant to the phase:
- Typecheck and lint.
- Unit tests for domain logic.
- Integration tests for SQLite repositories and Tauri commands.
- File-sync tests using temporary directories and simulated failures.
- Security tests for the relevant trust boundary.
- Theme contrast validation for every bundled theme.
- Accessibility tests for interactive controls.
- Build verification on Windows 11.

Do not invent test commands before the scaffold and actual tooling exist. Do not claim a test passed unless it was actually run. Report skipped tests and environmental limitations explicitly.

## Change discipline

- Keep changes scoped to the current implementation phase.
- Do not add future/parked features opportunistically.
- Update the relevant documentation and `docs/DECISIONS.md` when a material decision changes.
- Prefer small, reviewable commits.
- Do not delete or overwrite existing project files without inspecting them first.
