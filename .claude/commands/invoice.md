---
description: "Raise an invoice for a client from every signed, uninvoiced docket in the period: crew hours at the role rate and vehicle hours at the vehicle rate, weekend rates on Saturday and Sunday, the client's minimum hours, GST (15% NZ, 10% AU). Nothing is invoiced twice."
---

# invoice

Raise an invoice for a client from every signed, uninvoiced docket in the period: crew hours at the role rate and vehicle hours at the vehicle rate, weekend rates on Saturday and Sunday, the client's minimum hours, GST (15% NZ, 10% AU). Nothing is invoiced twice.

Run `node scripts/traffic.mjs invoice <client> [--from=<date>] [--to=<date>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the total and offer npm run docs -- invoice. Recording it does not send it.
