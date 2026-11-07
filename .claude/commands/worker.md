---
description: "Everything about one worker: tickets, upcoming shifts with any problems, and incidents."
---

# worker

Everything about one worker: tickets, upcoming shifts with any problems, and incidents.

Run `node scripts/traffic.mjs worker <worker>`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with anything that stops them working.
