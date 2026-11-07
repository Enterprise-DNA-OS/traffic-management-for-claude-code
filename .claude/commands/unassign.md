---
description: "Take a worker off a shift before they sign on, with the reason."
---

# unassign

Take a worker off a shift before they sign on, with the reason.

Run `node scripts/traffic.mjs unassign <shift> --worker=<worker> --reason="<reason>" --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say what the shift is now short of.
