---
description: "Export every record to one JSON file the business owns."
---

# export

Export every record to one JSON file the business owns.

Run `node scripts/traffic.mjs export [--out=<file>]`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the file path and row counts.
