---
description: "Record a permit application for a job: wap (NZ Work Access Permit), rol (NSW Road Occupancy Licence), council, tcp or other, with its dates and permitted hours."
---

# add-permit

Record a permit application for a job: wap (NZ Work Access Permit), rol (NSW Road Occupancy Licence), council, tcp or other, with its dates and permitted hours.

Run `node scripts/traffic.mjs add-permit <job> --kind=<kind> --reference=<reference> [--from=<date>] [--to=<date>] [--window-start=<hh:mm> --window-end=<hh:mm>] [--conditions="<text>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

A window that ends before it starts runs overnight.
