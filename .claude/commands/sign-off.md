---
description: "Record a worker finishing a shift (now, or --at) with their break in minutes (default 30). Worked hours are what the docket shows."
---

# sign-off

Record a worker finishing a shift (now, or --at) with their break in minutes (default 30). Worked hours are what the docket shows.

Run `node scripts/traffic.mjs sign-off <shift> --worker=<worker> [--at="<date time>"] [--break=<minutes>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the worked hours.
