---
description: "Draft a reminder to a worker whose ticket is running out, with the rule that applies in their region. Written to drafts/, never sent."
---

# draft-ticket-reminder

Draft a reminder to a worker whose ticket is running out, with the rule that applies in their region. Written to drafts/, never sent.

Run `node scripts/traffic.mjs draft-ticket-reminder <worker>`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the draft path.
