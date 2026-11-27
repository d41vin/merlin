---
description: Run an independent read-only audit of the current Merlin checkpoint
agent: merlin-auditor
subagent: true
---

Audit the current Merlin checkpoint changes in a separate read-only context.

Checkpoint context supplied by the caller: $ARGUMENTS

If the context is incomplete, derive what you safely can from `BUILD-STATUS.md`, the current phase plan, Git, and the working tree, and identify every missing item. Do not infer authorization or success.

Review:

- The actual diff against the base commit, including staged, unstaged, deleted, renamed, and untracked files.
- The authorization envelope, acceptance criteria, allowed path list, and prohibited paths.
- Raw verification commands, exit codes, and outputs.
- Security, privacy, data-integrity, production-boundary, dependency, migration, capability, CSP, and IPC risks.
- Accidental secrets or credential material.
- Scope expansion, unrelated changes, weakened tests, missing tests, and documentation drift.
- Unsupported or overstated claims.

Do not edit, write, patch, stage, commit, or push. Do not launch subagents. Do not ask the product owner questions. Return the structured PASS/FAIL report defined in your agent instructions, with findings, file/line references, and unverified items. A PASS requires that you inspected the actual changes and have no unresolved blocking findings.
