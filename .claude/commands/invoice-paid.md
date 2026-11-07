---
description: "Record that an invoice was paid."
---

# invoice-paid

Record that an invoice was paid.

Run `node scripts/traffic.mjs invoice-paid <invoice> [--on=<date>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm.
