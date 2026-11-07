---
description: "Add a client. The currency follows the country (NZ is NZD, AU is AUD). --min-hours is the fewest hours billed per person per shift (default 4)."
---

# add-client

Add a client. The currency follows the country (NZ is NZD, AU is AUD). --min-hours is the fewest hours billed per person per shift (default 4).

Run `node scripts/traffic.mjs add-client --code=<CODE> --name="<name>" --country=NZ|AU [--contact="<name>"] [--email=<email>] [--invoice-days=<n>] [--min-hours=<n>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then set its rates with set-rate.
