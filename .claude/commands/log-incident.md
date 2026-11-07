---
description: "Log an incident on a job: when (job time), type, severity, what happened, police event number, injury, and whether it is a notifiable event. The shift on at that time is attached."
---

# log-incident

Log an incident on a job: when (job time), type, severity, what happened, police event number, injury, and whether it is a notifiable event. The shift on at that time is attached.

Run `node scripts/traffic.mjs log-incident <job> --kind=<kind> --summary="<what>" [--severity=<level>] [--detail="<detail>"] [--police=<event>] [--injury] [--notifiable] [--worker=<worker>] [--at="<date time>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

For a notifiable event, say who to notify and to keep the site as it is. Copy details from the supervisor; never invent them.
