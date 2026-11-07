---
description: "Update a vehicle's registration, inspection (WoF, CoF, roadworthy) or service date after it is renewed or serviced."
---

# vehicle-dates

Update a vehicle's registration, inspection (WoF, CoF, roadworthy) or service date after it is renewed or serviced.

Run `node scripts/traffic.mjs vehicle-dates <vehicle> [--rego-expires=<date>] [--inspection-expires=<date>] [--service-due=<date>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm the new dates.
