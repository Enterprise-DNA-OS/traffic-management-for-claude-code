---
description: "Every active vehicle: registration, inspection (WoF, CoF or roadworthy) and service dates, and the last prestart result."
---

# vehicles

Every active vehicle: registration, inspection (WoF, CoF or roadworthy) and service dates, and the last prestart result.

Run `node scripts/traffic.mjs vehicles`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Flag anything expired, due or failed.
