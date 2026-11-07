---
description: "Every job with its plan status, permit status and end date, and shifts still to come."
---

# jobs

Every job with its plan status, permit status and end date, and shifts still to come.

Run `node scripts/traffic.mjs jobs`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Point out any job with no approved plan or permit.
