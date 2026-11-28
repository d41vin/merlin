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

Pin dependency versions. The Phase 0 compatibility baseline is Windows 11, Node.js 24.22.1, pnpm 12.15.0, and Rust 1.97.1. Verify the selected package versions against that baseline during technical preflight; do not downgrade a tool without a demonstrated compatibility reason recorded in `docs/DECISIONS.md`.

## Current status

Phase 0 technical proofs and the Phase 1 shell foundation are implemented. The normal application renders the Overview, Projects, and Resources shell with three honest unavailable states, saved display settings, a session-only resizable sidebar, and the minimal common-control foundation. The Phase 1 closure automated gates pass, including real WebView2, optimized-harness, production packaging, and production-boundary checks. Manual Windows 11 acceptance and hosted CI for a pushed commit remain pending; Phase 1 is not claimed as product-owner accepted.

Phase 2 (Docs and Vault) is underway under the autonomous operating mandate (D-069). P2-M1 adds stable project registration, optional repository connection, explicit Docs-root confirmation/creation/skip, and the deterministic Merlin Project Store skeleton. See `BUILD-STATUS.md` for current operational state and exact verification evidence.

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
    ├── PHASE-1-M4-PLAN.md
    ├── PHASE-2-PLAN.md
    └── DECISIONS.md
```

The exact scaffold may differ if technical preflight identifies a compatibility issue. Any change must be recorded in `docs/DECISIONS.md`.

## Development setup

Prerequisites:

- Windows 11
- Node.js 24.22.1
- pnpm 12.15.0
- Rust 1.97.1
- Microsoft C++ Build Tools and Windows SDK as required by Tauri
- WebView2 Runtime

Initial setup commands:

```powershell
powershell -NoProfile -File scripts/native.ps1 pnpm install
powershell -NoProfile -File scripts/native.ps1 pnpm exec playwright install chromium
```

Do not run `pnpm setup:rust`; the verified Windows path uses the installed stable Rust 1.97.1 toolchain and the repository's process-scoped `scripts/native.ps1` wrapper. Native or verification commands must run through that wrapper:

```powershell
powershell -NoProfile -File scripts/native.ps1 pnpm tauri dev
```

Useful checks, all through the native wrapper:

```powershell
powershell -NoProfile -File scripts/native.ps1 pnpm format:check
powershell -NoProfile -File scripts/native.ps1 pnpm typecheck
powershell -NoProfile -File scripts/native.ps1 pnpm lint
powershell -NoProfile -File scripts/native.ps1 pnpm test
powershell -NoProfile -File scripts/native.ps1 pnpm test:e2e
powershell -NoProfile -File scripts/native.ps1 pnpm test:webview2
powershell -NoProfile -File scripts/native.ps1 pnpm tauri build --features custom-protocol,production --no-binary-patching
powershell -NoProfile -File scripts/native.ps1 pnpm build:test-harness
powershell -NoProfile -File scripts/native.ps1 pnpm verify:production-boundary
```

Edit `src/themes/*.tokens.json` rather than generated theme CSS, then run `pnpm generate:themes`. Ordinary `pnpm test:themes` and `pnpm build` validation is read-only and fails on manifest, completeness, contrast, generated-CSS, density, registry, or scoped production token-usage drift.

Production packaging must explicitly select `custom-protocol,production`; do not use `--all-features`. The Tauri pre-bundle hook requires the production feature marker and rejects test override markers. Harness-enabled native commands use `scripts/native-harness.ps1` through the package scripts; direct harness compilation without that wrapper is rejected.

The separately targeted optimized harness is `src-tauri/target/test-harness/release/merlin-test-harness.exe` and is not a distributable application. Real WebView2 tests use only development/optimized harnesses with isolated synthetic data.

The scripts use the verified Windows toolchain and record their actual outcomes in `BUILD-STATUS.md`, including the limits of each proof.

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
- [Phase 1 Milestone 4 shell plan](docs/PHASE-1-M4-PLAN.md) (automated closure complete; M4.3–M4.6 manual acceptance and hosted CI pending)
- [Phase 2 Docs and Vault plan](docs/PHASE-2-PLAN.md) (P2-M1 implemented; later milestones proceed under D-069; hosted CI and manual acceptance pending)
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
