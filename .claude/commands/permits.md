---
description: "Every permit applied for or approved (WAP, ROL, council), with its dates, permitted hours and how many shifts are booked after it ends."
---

# permits

Every permit applied for or approved (WAP, ROL, council), with its dates, permitted hours and how many shifts are booked after it ends.

Run `node scripts/traffic.mjs permits`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Flag permits still waiting and ones ending with shifts after them.
