---
description: "Record a traffic control ticket: NZ tmo or stms; AU tc, itcp (TMI in Queensland) or pwztmp, for the state it was issued in. Copy the expiry from the card; a Queensland traffic controller accreditation defaults to 3 years; --no-expiry for a card that carries none."
---

# add-ticket

Record a traffic control ticket: NZ tmo or stms; AU tc, itcp (TMI in Queensland) or pwztmp, for the state it was issued in. Copy the expiry from the card; a Queensland traffic controller accreditation defaults to 3 years; --no-expiry for a card that carries none.

Run `node scripts/traffic.mjs add-ticket <worker> --region=<region> --kind=<kind> --number=<number> --issued=<date> [--expires=<date>|--no-expiry] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Copy every number and date from the card. Never invent one.
