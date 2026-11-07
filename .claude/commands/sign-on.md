---
description: "Record a worker starting a shift (now, or --at in job time). Refuses when the law, the plan, the permit or a vehicle says the shift cannot start, or the driver's vehicle has no passed prestart in the last 12 hours."
---

# sign-on

Record a worker starting a shift (now, or --at in job time). Refuses when the law, the plan, the permit or a vehicle says the shift cannot start, or the driver's vehicle has no passed prestart in the last 12 hours.

Run `node scripts/traffic.mjs sign-on <shift> --worker=<worker> [--at="<date time>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

If refused, say why and stop. Never look for a way around it.
