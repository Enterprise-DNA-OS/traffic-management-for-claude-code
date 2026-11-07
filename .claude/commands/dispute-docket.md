---
description: "Record that the client disputes a docket, with what they say. A disputed docket is not invoiced."
---

# dispute-docket

Record that the client disputes a docket, with what they say. A disputed docket is not invoiced.

Run `node scripts/traffic.mjs dispute-docket <shift> --note="<what the client says>" --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Offer draft-docket-chase.
