---
description: "Who can take a place on a shift: every active worker in that country checked against tickets for the job's region, double bookings, rest, shift length and weekly hours, those who can first, fewest hours that week first. --role=supervisor for a supervisor, --anywhere to include the other country. Changes nothing."
---

# cover

Who can take a place on a shift: every active worker in that country checked against tickets for the job's region, double bookings, rest, shift length and weekly hours, those who can first, fewest hours that week first. --role=supervisor for a supervisor, --anywhere to include the other country. Changes nothing.

Run `node scripts/traffic.mjs cover <shift> [--role=tc|supervisor|driver] [--anywhere]`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Name the best one or two who can cover and why. Never suggest anyone marked cannot.
