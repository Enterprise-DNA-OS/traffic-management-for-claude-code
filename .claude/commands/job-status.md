---
description: "Change a job's status (quoted, confirmed, completed, cancelled). Cancelling cancels its future shifts with the reason."
---

# job-status

Change a job's status (quoted, confirmed, completed, cancelled). Cancelling cancels its future shifts with the reason.

Run `node scripts/traffic.mjs job-status <job> --status=<status> [--reason="<reason>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say how many shifts were cancelled and who to tell.
