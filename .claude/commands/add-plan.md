---
description: "Add a traffic management plan or guidance scheme (tmp, tgs, tcp) to a job as a draft, with the dates it covers and the controllers it calls for. A new version of the same reference gets the next version number."
---

# add-plan

Add a traffic management plan or guidance scheme (tmp, tgs, tcp) to a job as a draft, with the dates it covers and the controllers it calls for. A new version of the same reference gets the next version number.

Run `node scripts/traffic.mjs add-plan <job> --ref=<reference> --kind=tmp|tgs|tcp [--from=<date>] [--to=<date>] [--controllers=<n>] [--no-supervisor] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Remind the operator it needs approval before work starts.
