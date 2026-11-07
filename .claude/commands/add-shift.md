---
description: "Add a shift to a job (job time), optionally repeated daily (--repeat=N). An end time before the start runs past midnight."
---

# add-shift

Add a shift to a job (job time), optionally repeated daily (--repeat=N). An end time before the start runs past midnight.

Run `node scripts/traffic.mjs add-shift <job> --start="<date time>" --end=<hh:mm or date time> [--repeat=<n>] [--controllers=<n>] [--no-supervisor] [--note="<note>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then fill the crew.
