---
description: "Hours worked by client and job over the last 7 days (or --days=N), and how many are signed off."
---

# hours

Hours worked by client and job over the last 7 days (or --days=N), and how many are signed off.

Run `node scripts/traffic.mjs hours [--days=<n>]`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the table.
