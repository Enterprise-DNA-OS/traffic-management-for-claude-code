---
description: "Record the client signing the docket for a finished shift. Signed hours become billable."
---

# sign-docket

Record the client signing the docket for a finished shift. Signed hours become billable.

Run `node scripts/traffic.mjs sign-docket <shift> --by="<client name>" [--reference=<docket ref>] [--note="<note>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Only when the client has signed. Never sign for them.
