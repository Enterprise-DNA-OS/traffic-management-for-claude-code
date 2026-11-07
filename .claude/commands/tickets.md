---
description: "Every active worker's traffic control tickets, soonest to expire first, with the next shift that needs each one. --days=N shows only those expiring within N days."
---

# tickets

Every active worker's traffic control tickets, soonest to expire first, with the next shift that needs each one. --days=N shows only those expiring within N days.

Run `node scripts/traffic.mjs tickets [--days=<n>]`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Flag anything expired or expiring before the next shift.
