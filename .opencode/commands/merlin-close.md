---
description: Close an authorized Merlin checkpoint after verification and audit
agent: merlin-orchestrator
---

Close the Merlin checkpoint identified by: $ARGUMENTS

This command does not imply authorization to commit, push, publish, release, deploy, or start another checkpoint. Use it only inside an existing product-owner authorization envelope.

1. Confirm the implementation is complete against the acceptance criteria and that every required verification gate has an actual command, exit code, and result. Do not accept summaries without evidence.
2. Obtain an independent Auditor PASS on the actual diff, untracked files, acceptance criteria, allowlist, and evidence. If the Auditor reports actionable findings, delegate precise corrections to `merlin-implementer` and re-audit. Stop after two correction cycles or sooner if the same failure repeats without a credible new approach.
3. Update only the operational documentation included in the checkpoint's documentation scope, using verified facts. Keep `BUILD-STATUS.md` in the repository root. Do not create `docs/BUILD-HISTORY.md` and do not rewrite product or governance contracts.
4. If and only if the checkpoint explicitly authorizes a commit and the product owner has explicitly approved this specific commit, invoke the controlled commit wrapper with the checkpoint identifier, exact base SHA, branch, remote, commit message, and explicit allowed paths. Never use raw `git commit`. Verify the returned commit SHA, parent, changed paths, and clean index and working tree.
5. Do not invoke the push wrapper during the initial pilot. Pushing is performed manually by the product owner using the normal fast-forward push wrapper. Never use raw `git push`, force, lease, rebase, reset, clean, or history rewriting.
6. After the product owner reports a push, verify the actual remote branch SHA and hosted CI. If CI fails, stop and report; do not create another commit or push speculative fixes.
7. Produce the final report with the authorization envelope, files changed, verification commands and outcomes, Auditor verdict, commit/push SHAs, remote/CI state, unverified items, residual risks, and the exact next authorized action.

Stop before the next unauthorized checkpoint.
