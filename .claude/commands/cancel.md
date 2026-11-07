---
description: "Cancel a shift with the reason."
---

# cancel

Cancel a shift with the reason.

Run `node scripts/traffic.mjs cancel <shift> --reason="<reason>" --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

List the crew to tell.
