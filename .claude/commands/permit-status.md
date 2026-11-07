---
description: "Record a permit as approved, refused or cancelled. Approval needs the dates it covers, copied from the permit."
---

# permit-status

Record a permit as approved, refused or cancelled. Approval needs the dates it covers, copied from the permit.

Run `node scripts/traffic.mjs permit-status <permit> --status=applied|approved|refused|cancelled [--from=<date>] [--to=<date>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then run check on the next shift.
