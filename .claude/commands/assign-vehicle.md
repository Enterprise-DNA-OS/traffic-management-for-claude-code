---
description: "Put a vehicle on a shift with its driver. Refuses a vehicle past its registration or inspection, a driver without the licence class, or a driver not on the crew, unless --override names the reason."
---

# assign-vehicle

Put a vehicle on a shift with its driver. Refuses a vehicle past its registration or inspection, a driver without the licence class, or a driver not on the crew, unless --override names the reason.

Run `node scripts/traffic.mjs assign-vehicle <shift> --vehicle=<vehicle> [--driver=<worker>] [--override="<reason>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm the vehicle and driver.
