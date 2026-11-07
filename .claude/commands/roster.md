---
description: "The roster: every shift for the next 7 days (or --days=N from --from=date) with crew, vehicles and anything wrong with it. Filter by --job or --worker."
---

# roster

The roster: every shift for the next 7 days (or --days=N from --from=date) with crew, vehicles and anything wrong with it. Filter by --job or --worker.

Run `node scripts/traffic.mjs roster [--days=<n>] [--from=<date>] [--job=<job>] [--worker=<worker>]`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the table. Call out any shift with a problem.
