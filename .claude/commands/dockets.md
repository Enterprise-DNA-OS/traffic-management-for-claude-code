---
description: "Finished shifts whose docket is unsigned or disputed (--all for every docket), with crew hours and days waiting."
---

# dockets

Finished shifts whose docket is unsigned or disputed (--all for every docket), with crew hours and days waiting.

Run `node scripts/traffic.mjs dockets [--all]`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Offer draft-docket-chase for the client with the most waiting.
