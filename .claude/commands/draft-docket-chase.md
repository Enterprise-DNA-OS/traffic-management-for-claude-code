---
description: "Draft a note to a client listing the finished shifts waiting on their docket signature, including any they queried. Written to drafts/, never sent."
---

# draft-docket-chase

Draft a note to a client listing the finished shifts waiting on their docket signature, including any they queried. Written to drafts/, never sent.

Run `node scripts/traffic.mjs draft-docket-chase <client>`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the draft path and the shifts in it.
