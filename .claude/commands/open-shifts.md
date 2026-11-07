---
description: "Shifts short of controllers or a supervisor in the next 14 days (or --days=N), soonest first."
---

# open-shifts

Shifts short of controllers or a supervisor in the next 14 days (or --days=N), soonest first.

Run `node scripts/traffic.mjs open-shifts [--days=<n>]`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

For the first one, offer to run cover.
