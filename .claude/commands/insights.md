---
description: "The ten questions Traffio's reports do not answer directly: margin per signed hour by job, shifts that cannot legally start, tickets that run out before the last rostered shift, hours waiting on a signature, signed work not invoiced, late sign-ons, incidents per 100 hours, vehicle hours and billing, workers near the weekly limit, and permits ending with shifts booked after them."
---

# insights

The ten questions Traffio's reports do not answer directly: margin per signed hour by job, shifts that cannot legally start, tickets that run out before the last rostered shift, hours waiting on a signature, signed work not invoiced, late sign-ons, incidents per 100 hours, vehicle hours and billing, workers near the weekly limit, and permits ending with shifts booked after them.

Run `node scripts/traffic.mjs insights`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

One line of finding per question, then the table.
