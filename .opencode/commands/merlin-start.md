---
description: Start or resume one explicitly authorized Merlin checkpoint
agent: merlin-orchestrator
---

Start or resume the Merlin checkpoint identified by: $ARGUMENTS

Follow `AGENTS.md` and your Orchestrator instructions exactly.

1. Read `AGENTS.md`, `BUILD-STATUS.md`, the current phase plan, and the authoritative documents relevant to the checkpoint.
2. Verify the actual Git state: branch, `HEAD`, index, working tree, untracked files, local and actual remote branch SHAs, and recent CI state. Do not trust a cached remote-tracking ref or a historical status entry.
3. Reconcile the product-owner authorization, the active checkpoint, the repository state, the remote state, CI, and `BUILD-STATUS.md`. If they disagree or the authorization is ambiguous, stop and report before changing anything.
4. Write the checkpoint authorization envelope: identifier, authorization source, base commit, branch, remote, allowed and prohibited paths, required verification gates, documentation scope, commit/push authorization, correction budget, stop conditions, and expected final state.
5. Delegate read-only discovery to `explore` where useful. Delegate implementation to `merlin-implementer` with the task, acceptance criteria, allowlist, base commit, and required gates. Never implement product code yourself.
6. After implementation, review the actual diff and raw evidence, then delegate an independent review to `merlin-auditor`. Do not commit or push before Auditor PASS.

This command does not create or infer authorization for a new checkpoint. Do not begin M4 Checkpoint 2, Step B, or any other checkpoint unless the product owner has explicitly authorized it. Stop at the exact authorization boundary.
