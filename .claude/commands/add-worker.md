---
description: "Add a worker: home region, employment (employee, casual, subcontractor), pay rate, driver licence classes and expiry."
---

# add-worker

Add a worker: home region, employment (employee, casual, subcontractor), pay rate, driver licence classes and expiry.

Run `node scripts/traffic.mjs add-worker --code=<CODE> --name="<name>" --region=<region> [--employment=<type>] [--pay=<amount>] [--classes=<C,MR>] [--licence-expires=<date>] [--phone=<phone>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then add their tickets with add-ticket.
