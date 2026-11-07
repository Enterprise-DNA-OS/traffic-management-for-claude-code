---
description: "Add a job for a client: name, address, region, road authority and PO number. --no-permit when the work needs no road authority permit."
---

# add-job

Add a job for a client: name, address, region, road authority and PO number. --no-permit when the work needs no road authority permit.

Run `node scripts/traffic.mjs add-job --ref=J-<n> --client=<client> --name="<name>" --region=<region> [--address="<address>"] [--authority="<who>"] [--po=<po>] [--no-permit] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then add the plan and the permit.
