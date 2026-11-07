---
description: "Stand a worker down, mark them as left, or make them active again, with the reason. Lists the shifts that now need someone else."
---

# worker-status

Stand a worker down, mark them as left, or make them active again, with the reason. Lists the shifts that now need someone else.

Run `node scripts/traffic.mjs worker-status <worker> --status=active|stood-down|left --reason="<reason>" --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

List the shifts to cover and offer cover for each.
