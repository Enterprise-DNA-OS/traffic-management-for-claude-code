---
description: "Record a vehicle prestart check, pass or fail with the defects. A driver cannot sign on without a passed prestart in the last 12 hours."
---

# prestart

Record a vehicle prestart check, pass or fail with the defects. A driver cannot sign on without a passed prestart in the last 12 hours.

Run `node scripts/traffic.mjs prestart <vehicle> --result=pass|fail [--defects="<what>"] [--worker=<worker>] [--shift=<shift>] [--at="<date time>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

A fail lists the shifts the vehicle is booked on next.
