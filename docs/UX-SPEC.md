# UX Specification

## 1. Global shell

- Desktop-first Windows application.
- Three primary navigation destinations: Overview, Projects, Resources.
- Dark Merlin theme is the only shipped theme initially.
- Compact, functional layout with restrained typography and minimal decoration.
- Persistent navigation sidebar, default width 240px; resizable within a practical 200–320px range.
- Sidebar items are 28px high by default, with a 2px active indicator.
- Provide keyboard focus and clear active/hover/selected states.

## 2. Overview

Suggested order:
1. Header with date and quick-add actions.
2. Compact summary row.
3. Conditional Needs attention.
4. Active projects.
5. Resource category summary and Ready to use resources.
6. Recent activity.
7. Coming up.

Keep the first viewport useful. Do not force users to scroll through empty sections. Attention items should link directly to the relevant project/resource/detail.

Ready to use:
- Show about 3–5 relevant unallocated resources with derived readiness Available.
- Show the underlying ownership, account, and allowance certainty. An Expected allowance must be labeled Expected; Unknown, Stale, and Expired values cannot appear as ready capacity.
- Quick actions should launch the relevant configured destination.
- Link to full Resources view.

## 3. Projects list

Use a compact searchable list/table, not a card grid.

Suggested columns:
- Project
- Status
- Last meaningful activity
- Next milestone
- Open todos
- Allocated resources
- Repository state

Support search and simple filters by status. Avoid complex query builders.

Project row should open the workbench. Make repository-unavailable state visible without making the project inaccessible.

## 4. Project workbench

Four fixed panels:
- Docs
- Todos
- Activity
- Resources

Default size gives Docs and Todos more space. Activity and Resources are secondary panels.

Interaction:
- Drag dividers to resize.
- Keyboard resize where supported by UI SDK.
- Collapse and restore each panel.
- Optional maximize/restore panel if implemented consistently.
- Reset to default layout.
- Persist layout globally in Merlin settings.
- Do not permit arbitrary panel rearrangement.

Docs panel:
- File tree and folders.
- Recent documents.
- Create file/folder actions.
- Selecting a file opens a dedicated full-size editor view, not an editor squeezed into the panel.

Todos panel:
- Simple list grouped by state or due date where useful.
- Create/edit/complete actions.
- Scratchpad and linked Docs accessible from todo detail.
- Avoid priority badges and complex workflow decoration.

Activity panel:
- Chronological factual events.
- Clearly distinguish Git commit events from Merlin events.
- Show source/type and timestamp.

Resources panel:
- Allocated resources and relevant accounts.
- Allocation and removal available here.
- Resource details remain canonical in Resources.
- Removing allocation does not delete the resource.

## 5. Docs editor

- Dedicated reading/editing surface.
- WYSIWYG Markdown editing using Milkdown, subject to round-trip proof.
- Autosave after approximately one second idle.
- Ctrl+S triggers immediate save.
- Visible saved/unsaved/saving/error state.
- Provide source-edit fallback for unsupported syntax.
- Long-form content uses comfortable reading typography rather than compact application chrome typography.
- Do not rewrite frontmatter or unsupported syntax during an edit to an unrelated section.
- Treat document preview as an untrusted, capability-free renderer. Preserve HTML/MDX in source, but never execute it; show unsupported or MDX content in source fallback. External links require an explicit click and open in the system browser.

## 6. Resources

Use a compact expandable list, not cards.

Top level:
- Three fixed category sections or filters.
- Counts.
- Search.
- Simple filters for ownership (Potential, Owned, Archived), readiness (Available, Unavailable, Unknown), and allowance status (expiring, Expired, Expected, Stale, Unknown).

Resource row:
- Name, category, ownership status, derived readiness, and useful allowance summary if available.
- Expand inline to show accounts.

Resource detail:
- One scrollable page with overview, launch actions, accounts, references/attachments, and history.
- Accounts may be expanded and quick-edited inline.
- Display last-verified timestamp, history, and each allowance's status.
- Distinguish resource ownership, derived readiness, account status, and allowance status. Show a shared allowance once, identify any account-specific override, and do not display an inherited balance as a separate account balance.
- Aggregate distinct allowances only when the detail makes their common unit, scope, additive basis, and provenance visible. A manual aggregate is visibly manual; an unknown/stale/expired member prevents a definitive aggregate total.
- Never show unknown as zero.

Archive first; permanent deletion requires confirmation and uses a 30-day trash recovery window for eligible records.

## 7. Settings

Separate preferences into:
- Theme (architecture only; no theme picker in v1)
- Density
- Layout
- Accessibility

Do not let a theme change information architecture or panel geometry. Density and layout settings are separate from theme choice.

## 8. Interaction and feedback

- Use concise inline status text and toasts for completed actions/errors.
- Destructive actions require clear confirmation.
- Conflicts require a dedicated resolution surface with both versions accessible.
- Use dialogs/popovers for focused secondary interactions, not as a substitute for full-page workflows.
- Keep keyboard behavior consistent and test it.
- Avoid animation that delays task completion; respect reduced motion.

## 9. Density defaults

- Row heights: 28px compact, 32px default.
- Metadata: 11px.
- Labels: 12px.
- Controls and application body: 13px.
- Section titles: 15px.
- Page title: 20px.
- Inner panel padding: 8px.
- Section padding: 16px.
- Table headers: 28px where sticky headers are useful.
- Hairline separation: 1px layout gap or semantic border, not decorative card stacks.

These are initial design targets; verify at actual Windows display scaling and accessibility settings.
