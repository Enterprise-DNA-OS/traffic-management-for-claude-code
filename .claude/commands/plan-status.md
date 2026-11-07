---
description: "Move a plan through draft, submitted, approved and obsolete. Approval needs who approved it and the dates it covers."
---

# plan-status

Move a plan through draft, submitted, approved and obsolete. Approval needs who approved it and the dates it covers.

Run `node scripts/traffic.mjs plan-status <plan> --status=<status> [--by="<who approved>"] [--on=<date>] [--from=<date>] [--to=<date>] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Copy the approver and dates from the approval. Never invent them.
