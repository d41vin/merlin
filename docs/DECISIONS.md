# Decision Log

This file records current product and technical decisions. Update it when a material decision changes.

| ID | Decision | Status | Rationale |
|---|---|---|---|
| D-001 | Merlin is a local-first personal desktop cockpit | Accepted | Fits the user's individual multi-tool workflow and avoids unnecessary hosted infrastructure |
| D-002 | Primary navigation is Overview, Projects, Resources | Accepted | Three clear work areas |
| D-003 | Exactly three fixed resource categories | Accepted | Avoids building a generic resource taxonomy system |
| D-004 | A product/service has one resource listing; access methods are launch actions | Accepted | Prevents duplicate records and quota counting |
| D-005 | Projects may exist without a repository | Accepted | Allows planning and Merlin Project Store docs before code exists |
| D-006 | Project workbench has four fixed resizable panels | Accepted | Docs, Todos, Activity, Resources; no arbitrary dashboard editor |
| D-007 | Repo Docs are primary working copy; Merlin Project Store is backup | Accepted | Preserves normal repository/editor workflow while providing recovery |
| D-008 | Docs synchronization uses three-way reconciliation | Accepted | Prevents silent overwrites and handles offline edits |
| D-009 | Milkdown is the Markdown editor candidate | Conditional | Must pass round-trip compatibility tests |
| D-010 | Tauri 2 + React + TypeScript + Vite | Accepted | Desktop/native boundary with familiar web UI stack |
| D-011 | SQLite is local structured persistence | Accepted | Simple, durable local data store |
| D-012 | API secrets use Windows Credential Manager | Accepted | Keeps raw secrets out of normal application data |
| D-013 | shadcn/Base UI handles common visual controls | Accepted | Customizable component source and standard interaction primitives |
| D-014 | Vercel UI SDK handles selected complex interactions | Accepted | Retained despite beta status; Phase 0 must prove the exact pinned versions support Merlin's resizable-panel behavior and SQLite-backed persistence |
| D-015 | UI SDK and shadcn/Base UI must not own the same interaction | Accepted | Avoids competing implementations |
| D-016 | Merlin Dark is the only v1 theme; architecture supports later bundled themes | Accepted | Avoids theme-picker scope while preserving extensibility |
| D-017 | Theme architecture uses primitives → semantic tokens → component styles | Accepted | Components remain theme-agnostic |
| D-018 | Theme mode is `light` or `dark` and sets CSS `color-scheme` | Accepted | Native controls and scrollbars follow theme |
| D-019 | Rust is Merlin Dark's UI accent, not a text/link color | Accepted | Proposed Rust contrast falls below text requirement on elevated surfaces |
| D-020 | Text links use a separately validated semantic token | Accepted | Text contrast must meet 4.5:1 |
| D-021 | Contrast validator runs in CI and fails on violations | Accepted | Prevents regressions across bundled themes |
| D-022 | Tracking is theme-defined per typography role | Accepted | Avoids carrying Inter-specific tracking into mono-forward themes |
| D-023 | Radius is theme-controlled | Accepted | Future themes may use different shape language |
| D-024 | Elevation uses inset border parameterized by `--border-width` | Accepted | Supports 0.5px subtle rules and future 1px hard rules |
| D-025 | Theme delivery is bundled only in v1 | Accepted | No external theme installer or marketplace |
| D-026 | Usage Journal is separate from project Activity | Accepted | One records Merlin use; the other records project work |
| D-027 | No automatic CLI usage collection in v1 | Deferred | Account/auth and data-source reliability issues |
| D-028 | No embedded ChatGPT in v1 | Deferred | External URL action is sufficient initially |
| D-029 | No Merlin MCP/agent bridge in v1 | Deferred | Validate manual workflows before adding agent write access |
| D-030 | No X promotion watcher in v1 | Deferred | Useful future automation, not core cockpit functionality |
| D-031 | No generic custom resource buckets | Rejected | Fixed categories are intentional for this personal app |
| D-032 | Markdown source preservation is separate from rendering and execution | Accepted | HTML/MDX and unsupported syntax remain source data, while a sanitized capability-free renderer prevents document content from executing or reaching native APIs |
| D-033 | Sensitive attachments require redaction and encrypted managed storage | Accepted | Full secrets are prohibited in attachments; redaction is mandatory, while OS-protected authenticated encryption protects eligible private attachments and managed derivatives at rest |
| D-034 | Resource availability is derived from separate ownership, account, and allowance states | Accepted | Prevents ownership/readiness conflation, double-counted shared balances, and false claims about unknown capacity |
| D-035 | Docs sync uses persisted operations and pauses propagation across Git context changes | Accepted | SQLite cannot atomically include filesystem writes; operation records, verification, recovery, and branch/HEAD context prevent silent loss or resurrection |
| D-036 | Each phase has outcome-based verification gates before commands are chosen | Accepted | Required test categories are explicit now; exact scripts follow the initialized scaffold and actual tooling |
| D-037 | Phase 0 toolchain baseline is Windows 11, Node.js 24.22.1, pnpm 12.15.0, and Rust 1.97.0 | Accepted | Compatibility must be proven against the actual development environment; tools are not downgraded without demonstrated need |

## Open implementation validations

These are engineering proofs, not unresolved product choices:
- Verify exact package versions and UI SDK APIs during Phase 0 on the D-037 toolchain baseline, including resizable panels, keyboard interaction, collapse/restore, and SQLite-backed layout persistence.
- Verify Milkdown round-trip preservation and the sanitized, capability-free Markdown rendering boundary.
- Verify Windows Credential Manager integration and the Windows OS-backed protection mechanism for sensitive private attachments, including documented backup/recovery limits.
- Verify Rust filesystem watcher, persisted sync-operation recovery, atomic replacement behavior, and Git branch/HEAD reconciliation behavior.
- Finalize the full Merlin Dark neutral surface/text ramp and run contrast validation.
- Verify 0.5px border rendering at common Windows display scaling settings.
