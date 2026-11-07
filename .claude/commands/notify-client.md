---
description: "Record that the client was told about an incident (now, or --at)."
---

# notify-client

Record that the client was told about an incident (now, or --at).

Run `node scripts/traffic.mjs notify-client <incident> [--at="<date time>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm.
