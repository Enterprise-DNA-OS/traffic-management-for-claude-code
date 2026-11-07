---
description: "Put a worker on a shift in a role. Refuses outright with no current ticket for the job's region or a double booking. A house rule (rest, shift length, weekly hours) refuses unless --override names the reason, which is logged."
---

# fill

Put a worker on a shift in a role. Refuses outright with no current ticket for the job's region or a double booking. A house rule (rest, shift length, weekly hours) refuses unless --override names the reason, which is logged.

Run `node scripts/traffic.mjs fill <shift> --worker=<worker> [--role=tc|supervisor|driver] [--override="<reason>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Run cover first when the operator has not named a worker. Never invent an override reason.
