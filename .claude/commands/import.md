---
description: "Bring people, skills (tickets), vehicles or bookings across from Traffio report exports saved as CSV. Dry run first. Import people, then skills, then vehicles, then jobs."
---

# import

Bring people, skills (tickets), vehicles or bookings across from Traffio report exports saved as CSV. Dry run first. Import people, then skills, then vehicles, then jobs.

Run `node scripts/traffic.mjs import traffio <file.csv> --kind=people|skills|vehicles|jobs [--region=<region>] [--client=<client>] [--map=<map.json>] --actor="<name>" --dry-run`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Follow docs/replace-traffio.md. Run with --dry-run, show the counts, then again without it once the operator agrees. One bad row stops the whole file.
