---
description: "Check the roster, vehicles and incidents for the next 14 days against the rules in docs/compliance.md: breaches first (law, permit, plan, double bookings), then what to fix before the shift starts, then house rules, each with its source."
---

# compliance

Check the roster, vehicles and incidents for the next 14 days against the rules in docs/compliance.md: breaches first (law, permit, plan, double bookings), then what to fix before the shift starts, then house rules, each with its source.

Run `node scripts/traffic.mjs compliance [--days=<n>]`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Read docs/compliance.md first. Report as a table, breaches first. For each breach, name the fix command. Nothing here is legal advice; if a rule looks out of date, say so and stop.
