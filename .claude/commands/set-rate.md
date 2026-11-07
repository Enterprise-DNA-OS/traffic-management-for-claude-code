---
description: "Set a client's hourly rate for a role (tc, supervisor, driver) or a vehicle type, with an optional weekend rate."
---

# set-rate

Set a client's hourly rate for a role (tc, supervisor, driver) or a vehicle type, with an optional weekend rate.

Run `node scripts/traffic.mjs set-rate <client> --item=<item> --rate=<amount> [--weekend=<amount>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Copy rates from the client's rate schedule. Never guess one.
