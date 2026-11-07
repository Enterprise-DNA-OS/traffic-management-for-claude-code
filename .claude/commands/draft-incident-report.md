---
description: "Draft the incident report for the client. Warns at the top if a notifiable event has not been reported. Written to drafts/, never sent."
---

# draft-incident-report

Draft the incident report for the client. Warns at the top if a notifiable event has not been reported. Written to drafts/, never sent.

Run `node scripts/traffic.mjs draft-incident-report <incident>`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the draft path. Fill "What we have done" only from the supervisor.
