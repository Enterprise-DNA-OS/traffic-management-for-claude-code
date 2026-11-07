---
description: "Close an incident with its outcome. Refuses until the client has been told and, for a notifiable event, the regulator."
---

# close-incident

Close an incident with its outcome. Refuses until the client has been told and, for a notifiable event, the regulator.

Run `node scripts/traffic.mjs close-incident <incident> --outcome="<outcome>" --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm.
