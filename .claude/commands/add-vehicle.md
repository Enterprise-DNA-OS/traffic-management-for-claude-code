---
description: "Add a vehicle: ute, tma, vms-trailer, arrow-board or truck, with the licence class to drive it and its registration, inspection and service dates."
---

# add-vehicle

Add a vehicle: ute, tma, vms-trailer, arrow-board or truck, with the licence class to drive it and its registration, inspection and service dates.

Run `node scripts/traffic.mjs add-vehicle --code=<CODE> --rego=<rego> --kind=<kind> --region=<region> [--class=<class>] --rego-expires=<date> [--inspection-expires=<date>] [--service-due=<date>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm the dates back.
