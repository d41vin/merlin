# Product Requirements Document

## 1. Product summary

Merlin is a local-first Windows desktop developer cockpit. It gives one developer a dependable place to see active projects, maintain project documentation and tasks, launch tools, and track accounts, credits, API access, and other developer resources.

Merlin organizes the user's existing workflow; it does not replace coding tools or provider dashboards.

## 2. Problem

A developer working across multiple AI coding tools, accounts, providers, repositories, hackathons, and promotional credits has information scattered across:
- IDEs and coding-agent applications
- provider dashboards and API consoles
- repositories and Markdown notes
- browser bookmarks and project pages
- spreadsheets, scratchpads, and personal reminders

This makes it difficult to answer:
- What projects are active, passive, or blocked?
- What is the next concrete task or milestone?
- Where are the important project documents?
- Which accounts and resources are available?
- Which credits are expiring, stale, or need verification?
- What tools and project destinations should be launched?

Merlin consolidates this information without pretending to know more than it can reliably measure.

## 3. Target user and product stance

- One technically capable developer.
- Uses multiple AI coding applications and providers, often across multiple accounts.
- Works across local repositories and projects that may not yet have a repository.
- Wants quick access to tools, project context, and available resources.
- Values local control, low overhead, and clear data provenance.

Do not generalize this into a multi-user product in v1.

## 4. Product principles

1. **Local-first:** core features work without a Merlin account or hosted backend.
2. **Explicit truth:** distinguish known, unknown, expected, stale, and verified values.
3. **Recoverability:** protect documents and metadata from accidental loss.
4. **Low overhead:** no continuous broad repository scanning or unnecessary polling.
5. **One useful source of truth:** avoid duplicate resource entries and competing document copies.
6. **Composable actions:** launch external tools without embedding or controlling them.
7. **No false productivity analytics:** factual activity only.

## 5. Navigation

Three primary destinations:
- Overview
- Projects
- Resources

Settings are accessed separately and do not become a fourth core work area.

## 6. Overview requirements

Overview should answer within approximately five seconds:
- What is happening?
- What do I have available?
- What needs attention?
- What could I work on?
- What have I accomplished recently?

Include:
- Current date and quick-add actions.
- Compact factual summary: active projects, resource count, items needing attention.
- Conditional needs-attention section for expiring resources, claim deadlines, overdue todos, milestones, sync errors, and unresolved conflicts.
- Active/passive project preview.
- Resource category summary.
- Recent meaningful activity.
- Compact Ready to use resource subsection showing roughly 3–5 unallocated resources whose derived readiness is Available, their underlying certainty, and quick actions.
- Coming-up chronology.

Do not include:
- Productivity scores, streaks, gamification, or inferred performance percentages.
- Giant analytics or charts.
- Full calendar in v1.
- Empty attention panels when there is nothing to report.
- Invented values where data is unknown.

## 7. Projects requirements

### Project records

A project may be created before a repository exists. It can use Merlin Project Store documents and connect a repository later.

Statuses:
- Planned
- Active
- Passive
- Archived

Archive preserves project data and can be reversed. Store an optional archive reason such as completed or discontinued.

Track:
- Name and description
- Status
- Added-to-Merlin timestamp
- Repository connection and path, if any
- Docs configuration
- Optional ChatGPT Project URL
- Milestones
- Todos
- Resources allocated
- Meaningful project activity

Do not represent project creation time as repository creation time. Obtain first-commit date from Git history when available.

### Project workbench

Four fixed, resizable/collapsible panels:
1. Docs
2. Todos
3. Activity
4. Resources

Docs and Todos receive larger default space; Activity and Resources smaller. Users can resize, collapse, restore, and reset layout. Remember layout globally. Keep panel positions fixed; do not build an arbitrary dashboard editor.

### Todos

- States: To do, In progress, Done.
- Optional due date.
- One scratchpad per todo.
- Zero or more linked project Docs.
- Standalone todos are allowed.
- Record created/completed timestamps.
- No priority, dependencies, nested subtasks, or complex workflow in v1.

### Milestones

- Optional title, target date, status, description.
- Status: Upcoming, Completed, Cancelled.
- No Gantt chart, dependencies, or nested milestones.

### Activity

Show local Git commits and meaningful Merlin project events, including todo completion, document changes, milestone changes, and resource allocation changes.

Opening a project or launching an application is not project work activity. Do not monitor the whole repository continuously. No GitHub API integration in v1.

### Launch actions

Allow multiple configurable actions per project:
- Open executable/application
- Run a configured terminal command
- Open URL
- Open folder

Support optional arguments and working directory. Pass the repository path to compatible actions. Validate action types and arguments; do not implement unrestricted arbitrary shell execution.

A project may store a ChatGPT Project URL and open it in the external browser. Embedded ChatGPT WebView is deferred.

## 8. Resources requirements

Exactly three fixed categories:
1. AI Coding
2. LLM & API Access
3. Other Developer Resources

Examples include Antigravity, Codex, Qoder, ZCode, OpenCode, Cline, AutoClaw, OpenRouter, NVIDIA NIM, DeepSeek, GitHub Codespaces, Daytona, Modal, cloud/compute credits, hackathon rewards, MCP servers, skills, tools, and useful repositories.

A product/service has one resource listing. Multiple access methods (desktop, CLI, IDE extension) are launch actions under that listing, not duplicate resources.

### Resource and account records

Resource:
- Name, description, category
- General product information and references
- Multiple launch actions
- Optional multiple accounts
- Optional models and provider information
- Ownership status: Potential, Owned, Archived

Account:
- Optional email/label and notes
- Account status: Active, Idle, Unassigned, Archived
- Multiple allowances and API keys
- Usage history
- Project associations where relevant

### Allowances and usage

An allowance records:
- Name
- Initial limit/balance
- Consumed
- Remaining
- Unit
- Reset type/date
- Expiry
- Allowance status: Verified, Expected, Stale, Unknown, Expired
- Last verified timestamp
- Notes

Support daily, weekly, monthly, fixed-date, rolling-window, and custom-date reset schedules.

At reset, the new cycle is Expected until checked. A passed expiry makes the allowance Expired even when a prior verification exists. Unknown remains distinct from zero. Multiple allowances can exist for one account (for example, a recurring weekly quota plus promotional credits).

Resource ownership, account status, and allowance status are independent. “Available” is a derived readiness state, never a stored resource ownership status. A resource is Available only when it is Owned and non-archived, has an enabled declared access route, and has at least one route with either no allowance requirement, a non-expired resource-shared allowance, or an Active account with a non-expired allowance of known Verified or explicitly Expected capacity. Show Expected as expected, not provider-verified. If the route's account or allowance is Unknown or Stale, surface Unknown readiness rather than claiming availability. If every route is blocked, archived, disabled, or expired, surface Unavailable.

`Active` is the only account status that positively establishes a ready account route. `Idle` and `Unassigned` are descriptive states and do not independently establish readiness; `Archived` cannot be used. An account status never changes an allowance's status or balance.

Resource-level shared allowances are a single balance owned by the resource. An account-specific allowance may explicitly override one shared allowance for that account; the override replaces the inherited balance for that account and is never added to it. A shared balance is displayed once at resource level and is never copied into each account's totals.

Distinct allowances may be aggregated only in a derived display when they have the same resource, account or explicitly shared scope, unit, and simultaneous availability, and their provider terms establish that the balances are additive. A manually declared additive group is allowed only when its provenance is shown as manual; it must not be presented as provider-verified. Do not aggregate an override with the shared allowance it overrides, balances from different billing systems, differently scoped shared balances, or unknown/stale/expired values into a definitive total. Preserve each source allowance and its provenance; do not persist a merged balance as a new source of truth.

Native coding-tool credits remain with that tool's resource listing. BYOK API credits are separate LLM & API resources. Do not merge different billing systems or double-count shared allowances.

### API keys

- Multiple keys per account.
- User-defined labels.
- Store secrets in Windows Credential Manager.
- Store only metadata and credential references in SQLite.
- Mask by default; explicit reveal/hide and one-click copy.
- No automatic API test in v1.
- Do not write keys to Markdown, logs, or project documents.
- Screenshots and attachments must redact full keys and other secrets before import; see `DOCS-AND-VAULT.md` and `SECURITY.md` for required handling of a suspected exposed secret.

### API models and associations

Maintain a simple manually curated model list. No large live catalogue in v1.

A provider account balance has one source of truth. Optional associations to harnesses and projects are descriptive; do not imply per-harness consumption unless a reliable data source exists.

### Other developer resources

Do not force credit/usage fields onto MCP servers, skills, repositories, and other non-credit resources.

Hackathon rewards may record source, awarded amount, redemption, restrictions, expiry, account, and resulting resource. Avoid duplicate balance accounting when a reward becomes a resource.

### Potential resources

Potential/unclaimed resources can store source URL, notes, optional redacted screenshot/evidence, and claim state. No forced review inbox or workflow.

## 9. Docs and Vault requirements

See `DOCS-AND-VAULT.md` for the authoritative synchronization contract.

- Repo `docs/` is the primary working copy when connected.
- Merlin Project Store keeps a separate backup copy.
- Users can work from backup while repository is unavailable.
- Reconcile changes with a three-way comparison.
- Never silently overwrite conflicting changes.
- Preserve Markdown source and unsupported syntax.
- Preserve source separately from sanitized rendering; HTML/MDX from project documents never executes or receives Tauri capabilities.
- Recover deleted files and retain bounded version history.

## 10. Usage Journal

Record meaningful interactions with Merlin, such as creating/updating todos and resources, changing usage values, editing document metadata, and invoking configured launch actions.

Do not collect document contents, API keys, passwords, clipboard contents, screenshots, keystrokes, or activity in external applications.

Journal writes locally to SQLite. No background LLM. Provide pause, clear, export, and retention controls. On-demand export can be explicitly reviewed and shared with an LLM by the user.

Keep Usage Journal separate from project Activity.

## 11. Non-functional requirements

- Local-first and usable offline.
- Low idle CPU and memory use.
- Restart-safe state and synchronization.
- Atomic file writes and integrity checks for document operations.
- Persisted, restart-safe Docs sync operations that account for filesystem and SQLite boundaries.
- Keyboard-accessible UI.
- No secrets in ordinary database or file storage.
- Clear error and recovery states.
- Testable domain logic separated from UI.
- Windows 11 packaging and startup verification.

## 12. Explicit v1 exclusions

- Hosted sync or multi-user collaboration.
- Generic custom resource categories.
- Arbitrary dashboard layout editing.
- Automatic account/login switching.
- Terminal keystroke injection.
- Continuous AI usage polling or scraping.
- Embedded ChatGPT.
- Merlin MCP/agent integration.
- UI SDK Agent Bridge.
- X account/keyword watcher.
- Theme marketplace or external theme installation.
- Automatic provider API usage discovery where no reliable documented interface exists.
- Broad GitHub integration.
