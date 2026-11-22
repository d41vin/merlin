# Merlin

Merlin is a local-first personal developer cockpit for managing projects, documentation, tasks, AI coding tools, API access, developer credits, and other resources from one Windows desktop application.

It is designed for one person's real workflow, not as a generic team productivity platform.

## Product principles

- Local-first, fast, and low idle resource usage.
- Clear ownership of data and explicit user control.
- Minimal, dense, functional interface.
- No invented usage metrics or assumptions that unknown means zero.
- No background surveillance, keystroke capture, clipboard capture, or document-content collection.
- Prefer simple, dependable workflows over broad feature surfaces.
- Preserve user data through backups, reconciliation, and recoverable deletion.

## Initial platform

- Windows 11 desktop
- Tauri 2
- React 19+, TypeScript, Vite
- SQLite
- Rust native/backend commands
- Tailwind CSS v4
- shadcn/ui with Base UI
- Vercel UI SDK (`@ui-sdk/react`, `@ui-sdk/core`) for complex interaction behavior
- Milkdown for Markdown editing
- Windows Credential Manager for API secrets
- Lucide React icons

Pin dependency versions. The Phase 0 compatibility baseline is Windows 11, Node.js 24.22.1, pnpm 12.15.0, and Rust 1.97.0. Verify the selected package versions against that baseline during technical preflight; do not downgrade a tool without a demonstrated compatibility reason recorded in `docs/DECISIONS.md`.

## Repository structure

```text
merlin/
├── AGENTS.md
├── README.md
├── package.json
├── src/
├── src-tauri/
└── docs/
    ├── PRD.md
    ├── UX-SPEC.md
    ├── DESIGN-SYSTEM.md
    ├── design-tokens.md
    ├── ARCHITECTURE.md
    ├── DATA-MODEL.md
    ├── DOCS-AND-VAULT.md
    ├── SECURITY.md
    ├── UI-STACK.md
    ├── IMPLEMENTATION-PLAN.md
    └── DECISIONS.md
```

The exact scaffold may differ if technical preflight identifies a compatibility issue. Any change must be recorded in `docs/DECISIONS.md`.

## Development setup

Prerequisites:
- Windows 11
- Node.js 24.22.1
- pnpm 12.15.0
- Rust 1.97.0
- Microsoft C++ Build Tools and Windows SDK as required by Tauri
- WebView2 Runtime

Initial setup commands (adjust only when the chosen scaffold requires it):

```bash
pnpm install
pnpm tauri dev
```

Useful checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Add scripts only when they are backed by actual configured tools. Do not leave placeholder scripts that appear to pass. The phase plans define required verification outcomes; add the exact commands only after the scaffold and test tooling exist.

## Documentation index

- [Product requirements](docs/PRD.md)
- [UX specification](docs/UX-SPEC.md)
- [Design system](docs/DESIGN-SYSTEM.md)
- [Design tokens and theme contract](docs/design-tokens.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA-MODEL.md)
- [Docs and Vault synchronization](docs/DOCS-AND-VAULT.md)
- [Security](docs/SECURITY.md)
- [UI stack and library integration](docs/UI-STACK.md)
- [Implementation plan](docs/IMPLEMENTATION-PLAN.md)
- [Decision log](docs/DECISIONS.md)

## Product boundaries

Merlin v1 is not:
- A hosted SaaS or team collaboration product.
- A replacement for Git, IDEs, coding agents, or provider dashboards.
- A universal usage-metering platform.
- An agent that silently operates the user's computer.
- A general-purpose project management suite.
- A marketplace for third-party themes or plugins.

See `docs/IMPLEMENTATION-PLAN.md` for phased delivery and explicit deferrals.
