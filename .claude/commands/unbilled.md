---
description: "Signed crew and vehicle hours not yet on an invoice, by client, at the client's rate (weekend rates and minimum hours applied)."
---

# unbilled

Signed crew and vehicle hours not yet on an invoice, by client, at the client's rate (weekend rates and minimum hours applied).

Run `node scripts/traffic.mjs unbilled`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Total by client and offer to invoice.
