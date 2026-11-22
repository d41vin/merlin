# Data Model

This is a domain-level model, not a final SQL schema. Normalize where appropriate and use migrations for schema changes. Derived values, including resource readiness and allowance aggregates, are calculated from source records and are not independent sources of truth.

## 1. Project

Fields:
- `id`
- `name`
- `description`
- `status`: planned | active | passive | archived
- `created_at` (added to Merlin)
- `archived_at`, `archive_reason`
- `repository_connection_id` (nullable)
- `docs_root_relative_path` (nullable)
- `chatgpt_project_url` (nullable)
- timestamps

A project can exist without a repository.

## 2. RepositoryConnection

- `id`
- `project_id`
- `local_path`
- `remote_identity` (nullable; aid, not sole identity)
- `default_branch` (nullable)
- `last_observed_head` (nullable; Git commit identity when available)
- `last_observed_branch` (nullable)
- `connection_status`
- `last_reconciled_at`

Do not assume remote identity uniquely identifies a project.

## 3. Todo

- `id`
- `project_id` (nullable for standalone todo)
- `title`
- `description` / scratchpad
- `status`: todo | in_progress | done
- `due_at` (nullable)
- `created_at`
- `completed_at` (nullable)
- timestamps

Linked Docs should use a join table to allow zero or more links.

## 4. Milestone

- `id`
- `project_id`
- `title`
- `description`
- `target_date`
- `status`: upcoming | completed | cancelled
- timestamps

## 5. ProjectActivityEvent

- `id`
- `project_id`
- `event_type`
- `source`: git | merlin
- `summary`
- `occurred_at`
- optional structured metadata with no secrets

Examples: Git commit, todo completed, document changed, milestone completed, resource allocated.

## 6. Resource

- `id`
- `name`
- `description`
- `category`: ai_coding | llm_api | other_developer
- `ownership_status`: potential | owned | archived
- `product_info`
- timestamps

A product/service has one canonical Resource record. Different access methods are LaunchActions.

`available` is a derived readiness state, not a Resource value. Calculate it from ownership, enabled access routes, account state, and required allowance state as defined in `PRD.md`.

## 7. ResourceAccount

- `id`
- `resource_id`
- `label`
- `email` (optional)
- `notes`
- `account_status`: active | idle | unassigned | archived
- timestamps

Avoid requiring an email; some provider accounts have no useful email identity.

## 8. Allowance

- `id`
- `resource_id`
- `scope`: resource_shared | account_specific
- `account_id` (null for `resource_shared`; required for `account_specific`)
- `overrides_allowance_id` (nullable; only an account-specific allowance may reference the resource-shared allowance it replaces for that account)
- `name`
- `initial_amount`
- `consumed_amount` (nullable/unknown)
- `remaining_amount` (nullable/unknown)
- `unit`
- `reset_type`
- `reset_at` / schedule fields
- `expires_at`
- `status`: verified | expected | stale | unknown | expired
- `last_verified_at`
- `aggregation_group` (nullable, presentation-only)
- `aggregation_basis`: provider_confirmed | manually_declared (nullable unless grouped)
- `notes`
- timestamps

`expired` is derived when `expires_at` has passed and takes precedence in presentation over a prior verification state. Do not infer remaining from missing data. If arithmetic is possible, preserve source values and record derivation rules.

### Effective allowance and aggregation rules

- A resource-shared allowance belongs to the resource and is represented once. It is not copied to accounts.
- When an account-specific allowance has `overrides_allowance_id`, it replaces the referenced shared allowance only for that account's effective view. The shared record remains the source for every other account and is never added to the override.
- An aggregate is a display calculation only. It may include allowances only when they share the required scope, unit, and simultaneous additive terms specified in `PRD.md`. An `aggregation_basis` of `manually_declared` makes the aggregate manual, not provider-verified.
- Do not aggregate an override with its overridden shared allowance, or use Unknown, Stale, or Expired amounts in a definitive remaining balance.

## 9. UsageRecord

- `id`
- `allowance_id`
- `amount`
- `unit`
- `recorded_at`
- `source`: manual | imported
- `notes`

Manual records must not be presented as provider-verified.

## 10. ApiKeyMetadata

- `id`
- `account_id`
- `label`
- `credential_reference`
- `masked_identifier` (optional)
- `created_at`
- `last_used_at` (only if reliably known)
- `archived_at`

Never store raw secret material in SQLite.

## 11. ModelRecord and associations

A manually maintained model catalogue:
- `id`
- `provider_resource_id`
- `name`
- optional description/pricing metadata
- active flag

Associations to projects or harnesses are descriptive. Do not claim measured consumption by association alone.

## 12. LaunchAction

- `id`
- owner type/id (project or resource)
- `label`
- `kind`: application | terminal | url | folder
- target
- arguments (structured array)
- working directory (optional)
- enabled
- sort order

Validate and constrain fields according to action kind.

## 13. ResourceProjectAllocation

Join record:
- `resource_id`
- `project_id`
- `allocated_at`
- optional notes

Allocation is not measured consumption.

## 14. Docs synchronization entities

See `DOCS-AND-VAULT.md`. Core entities include:
- DocsRoot configuration
- FileManifest entries
- LastSyncedBaseline
- SyncOperation: operation intent, side/source and destination identities, expected source/destination/result hashes, repository HEAD/branch context, staging reference, state, failure/recovery detail, and timestamps
- FileVersion snapshots
- DeletionTombstone
- SyncConflict
- Attachment metadata

Attachment metadata records classification and managed-copy locations, but never raw secret content. Sensitive private attachment payloads, revisions, previews, and trash entries are encrypted at rest as defined in `SECURITY.md`.

## 15. Settings

Store:
- Theme slug (Merlin Dark only in v1)
- Panel layout
- Density preference
- Accessibility preferences
- Usage Journal controls
- Other application preferences

## 16. UsageJournalEvent

- `id`
- `event_type`
- `target_type` / `target_id` where applicable
- `occurred_at`
- safe, non-content metadata

Do not store document text, API secrets, clipboard, screenshots, or keystrokes.
