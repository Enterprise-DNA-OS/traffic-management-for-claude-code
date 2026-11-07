---
description: "Record that a notifiable event was reported to WorkSafe or the state regulator, with the reference they gave."
---

# notify-regulator

Record that a notifiable event was reported to WorkSafe or the state regulator, with the reference they gave.

Run `node scripts/traffic.mjs notify-regulator <incident> --reference=<reference> [--at="<date time>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Copy the regulator reference exactly.
