# CLI reference

Every command is `node scripts/traffic.mjs <command>`. Options use `--key=value`. Add `--json` to any command for machine output. Every write needs `--actor="<your name>"`. Times are the job's own clock.

## activity

The activity log for the last 7 days (or --days=N): who did what.

```
node scripts/traffic.mjs activity [--days=<n>]
```

## add-client

Add a client. The currency follows the country (NZ is NZD, AU is AUD). --min-hours is the fewest hours billed per person per shift (default 4).

```
node scripts/traffic.mjs add-client --code=<CODE> --name="<name>" --country=NZ|AU [--contact="<name>"] [--email=<email>] [--invoice-days=<n>] [--min-hours=<n>] --actor="<name>"
```

## add-job

Add a job for a client: name, address, region, road authority and PO number. --no-permit when the work needs no road authority permit.

```
node scripts/traffic.mjs add-job --ref=J-<n> --client=<client> --name="<name>" --region=<region> [--address="<address>"] [--authority="<who>"] [--po=<po>] [--no-permit] --actor="<name>"
```

## add-permit

Record a permit application for a job: wap (NZ Work Access Permit), rol (NSW Road Occupancy Licence), council, tcp or other, with its dates and permitted hours.

```
node scripts/traffic.mjs add-permit <job> --kind=<kind> --reference=<reference> [--from=<date>] [--to=<date>] [--window-start=<hh:mm> --window-end=<hh:mm>] [--conditions="<text>"] --actor="<name>"
```

## add-plan

Add a traffic management plan or guidance scheme (tmp, tgs, tcp) to a job as a draft, with the dates it covers and the controllers it calls for. A new version of the same reference gets the next version number.

```
node scripts/traffic.mjs add-plan <job> --ref=<reference> --kind=tmp|tgs|tcp [--from=<date>] [--to=<date>] [--controllers=<n>] [--no-supervisor] --actor="<name>"
```

## add-shift

Add a shift to a job (job time), optionally repeated daily (--repeat=N). An end time before the start runs past midnight.

```
node scripts/traffic.mjs add-shift <job> --start="<date time>" --end=<hh:mm or date time> [--repeat=<n>] [--controllers=<n>] [--no-supervisor] [--note="<note>"] --actor="<name>"
```

## add-ticket

Record a traffic control ticket: NZ tmo or stms; AU tc, itcp (TMI in Queensland) or pwztmp, for the state it was issued in. Copy the expiry from the card; a Queensland traffic controller accreditation defaults to 3 years; --no-expiry for a card that carries none.

```
node scripts/traffic.mjs add-ticket <worker> --region=<region> --kind=<kind> --number=<number> --issued=<date> [--expires=<date>|--no-expiry] --actor="<name>"
```

## add-vehicle

Add a vehicle: ute, tma, vms-trailer, arrow-board or truck, with the licence class to drive it and its registration, inspection and service dates.

```
node scripts/traffic.mjs add-vehicle --code=<CODE> --rego=<rego> --kind=<kind> --region=<region> [--class=<class>] --rego-expires=<date> [--inspection-expires=<date>] [--service-due=<date>] --actor="<name>"
```

## add-worker

Add a worker: home region, employment (employee, casual, subcontractor), pay rate, driver licence classes and expiry.

```
node scripts/traffic.mjs add-worker --code=<CODE> --name="<name>" --region=<region> [--employment=<type>] [--pay=<amount>] [--classes=<C,MR>] [--licence-expires=<date>] [--phone=<phone>] --actor="<name>"
```

## assign-vehicle

Put a vehicle on a shift with its driver. Refuses a vehicle past its registration or inspection, a driver without the licence class, or a driver not on the crew, unless --override names the reason.

```
node scripts/traffic.mjs assign-vehicle <shift> --vehicle=<vehicle> [--driver=<worker>] [--override="<reason>"] --actor="<name>"
```

## attention

Show what needs a person today: shifts that cannot start (no approved plan or permit, outside the permit hours), crews rostered against the law, double bookings, unfit vehicles and failed prestarts, crew gaps, incidents the regulator or client has not heard about, expired and expiring tickets, house rules broken, unsigned and disputed dockets, vehicle papers due, overdue invoices and permits ending with shifts booked after them.

```
node scripts/traffic.mjs attention
```

## cancel

Cancel a shift with the reason.

```
node scripts/traffic.mjs cancel <shift> --reason="<reason>" --actor="<name>"
```

## check

Every rule a shift breaks now, or would break with a named worker on it in a role (--worker, --role), with the source of each rule. Changes nothing.

```
node scripts/traffic.mjs check <shift> [--worker=<worker> --role=tc|supervisor|driver]
```

## clients

Every client: country, currency, invoice terms, minimum hours, rate card, open jobs and what they owe.

```
node scripts/traffic.mjs clients
```

## close-incident

Close an incident with its outcome. Refuses until the client has been told and, for a notifiable event, the regulator.

```
node scripts/traffic.mjs close-incident <incident> --outcome="<outcome>" --actor="<name>"
```

## compliance

Check the roster, vehicles and incidents for the next 14 days against the rules in docs/compliance.md: breaches first (law, permit, plan, double bookings), then what to fix before the shift starts, then house rules, each with its source.

```
node scripts/traffic.mjs compliance [--days=<n>]
```

## cover

Who can take a place on a shift: every active worker in that country checked against tickets for the job's region, double bookings, rest, shift length and weekly hours, those who can first, fewest hours that week first. --role=supervisor for a supervisor, --anywhere to include the other country. Changes nothing.

```
node scripts/traffic.mjs cover <shift> [--role=tc|supervisor|driver] [--anywhere]
```

## dispute-docket

Record that the client disputes a docket, with what they say. A disputed docket is not invoiced.

```
node scripts/traffic.mjs dispute-docket <shift> --note="<what the client says>" --actor="<name>"
```

## dockets

Finished shifts whose docket is unsigned or disputed (--all for every docket), with crew hours and days waiting.

```
node scripts/traffic.mjs dockets [--all]
```

## draft-docket-chase

Draft a note to a client listing the finished shifts waiting on their docket signature, including any they queried. Written to drafts/, never sent.

```
node scripts/traffic.mjs draft-docket-chase <client>
```

## draft-incident-report

Draft the incident report for the client. Warns at the top if a notifiable event has not been reported. Written to drafts/, never sent.

```
node scripts/traffic.mjs draft-incident-report <incident>
```

## draft-ticket-reminder

Draft a reminder to a worker whose ticket is running out, with the rule that applies in their region. Written to drafts/, never sent.

```
node scripts/traffic.mjs draft-ticket-reminder <worker>
```

## export

Export every record to one JSON file the business owns.

```
node scripts/traffic.mjs export [--out=<file>]
```

## fill

Put a worker on a shift in a role. Refuses outright with no current ticket for the job's region or a double booking. A house rule (rest, shift length, weekly hours) refuses unless --override names the reason, which is logged.

```
node scripts/traffic.mjs fill <shift> --worker=<worker> [--role=tc|supervisor|driver] [--override="<reason>"] --actor="<name>"
```

## hours

Hours worked by client and job over the last 7 days (or --days=N), and how many are signed off.

```
node scripts/traffic.mjs hours [--days=<n>]
```

## import

Bring people, skills (tickets), vehicles or bookings across from Traffio report exports saved as CSV. Dry run first. Import people, then skills, then vehicles, then jobs.

```
node scripts/traffic.mjs import traffio <file.csv> --kind=people|skills|vehicles|jobs [--region=<region>] [--client=<client>] [--map=<map.json>] --actor="<name>" --dry-run
```

## incident

One incident in full, with its activity.

```
node scripts/traffic.mjs incident <incident>
```

## incidents

Every incident, newest first, with whether the client and regulator have been told. --open hides closed ones.

```
node scripts/traffic.mjs incidents [--open]
```

## insights

The ten questions Traffio's reports do not answer directly: margin per signed hour by job, shifts that cannot legally start, tickets that run out before the last rostered shift, hours waiting on a signature, signed work not invoiced, late sign-ons, incidents per 100 hours, vehicle hours and billing, workers near the weekly limit, and permits ending with shifts booked after them.

```
node scripts/traffic.mjs insights
```

## invoice-paid

Record that an invoice was paid.

```
node scripts/traffic.mjs invoice-paid <invoice> [--on=<date>] --actor="<name>"
```

## invoice-sent

Record that an invoice was sent.

```
node scripts/traffic.mjs invoice-sent <invoice> [--on=<date>] --actor="<name>"
```

## invoice

Raise an invoice for a client from every signed, uninvoiced docket in the period: crew hours at the role rate and vehicle hours at the vehicle rate, weekend rates on Saturday and Sunday, the client's minimum hours, GST (15% NZ, 10% AU). Nothing is invoiced twice.

```
node scripts/traffic.mjs invoice <client> [--from=<date>] [--to=<date>] --actor="<name>"
```

## invoices

Every invoice with its standing: not sent, sent, overdue or paid.

```
node scripts/traffic.mjs invoices
```

## job-status

Change a job's status (quoted, confirmed, completed, cancelled). Cancelling cancels its future shifts with the reason.

```
node scripts/traffic.mjs job-status <job> --status=<status> [--reason="<reason>"] --actor="<name>"
```

## job

Everything about one job: plans, permits and their hours, upcoming shifts with problems, and incidents.

```
node scripts/traffic.mjs job <job>
```

## jobs

Every job with its plan status, permit status and end date, and shifts still to come.

```
node scripts/traffic.mjs jobs
```

## log-incident

Log an incident on a job: when (job time), type, severity, what happened, police event number, injury, and whether it is a notifiable event. The shift on at that time is attached.

```
node scripts/traffic.mjs log-incident <job> --kind=<kind> --summary="<what>" [--severity=<level>] [--detail="<detail>"] [--police=<event>] [--injury] [--notifiable] [--worker=<worker>] [--at="<date time>"] --actor="<name>"
```

## log

Add a note to the activity log about a job, shift, worker, vehicle or incident.

```
node scripts/traffic.mjs log <ref> --note="<note>" --actor="<name>"
```

## notify-client

Record that the client was told about an incident (now, or --at).

```
node scripts/traffic.mjs notify-client <incident> [--at="<date time>"] --actor="<name>"
```

## notify-regulator

Record that a notifiable event was reported to WorkSafe or the state regulator, with the reference they gave.

```
node scripts/traffic.mjs notify-regulator <incident> --reference=<reference> [--at="<date time>"] --actor="<name>"
```

## open-shifts

Shifts short of controllers or a supervisor in the next 14 days (or --days=N), soonest first.

```
node scripts/traffic.mjs open-shifts [--days=<n>]
```

## permit-status

Record a permit as approved, refused or cancelled. Approval needs the dates it covers, copied from the permit.

```
node scripts/traffic.mjs permit-status <permit> --status=applied|approved|refused|cancelled [--from=<date>] [--to=<date>] --actor="<name>"
```

## permits

Every permit applied for or approved (WAP, ROL, council), with its dates, permitted hours and how many shifts are booked after it ends.

```
node scripts/traffic.mjs permits
```

## plan-status

Move a plan through draft, submitted, approved and obsolete. Approval needs who approved it and the dates it covers.

```
node scripts/traffic.mjs plan-status <plan> --status=<status> [--by="<who approved>"] [--on=<date>] [--from=<date>] [--to=<date>] --actor="<name>"
```

## plans

Every traffic management plan and guidance scheme not yet obsolete, unapproved first, with the dates it covers and the crew it calls for.

```
node scripts/traffic.mjs plans
```

## prestart

Record a vehicle prestart check, pass or fail with the defects. A driver cannot sign on without a passed prestart in the last 12 hours.

```
node scripts/traffic.mjs prestart <vehicle> --result=pass|fail [--defects="<what>"] [--worker=<worker>] [--shift=<shift>] [--at="<date time>"] --actor="<name>"
```

## roster

The roster: every shift for the next 7 days (or --days=N from --from=date) with crew, vehicles and anything wrong with it. Filter by --job or --worker.

```
node scripts/traffic.mjs roster [--days=<n>] [--from=<date>] [--job=<job>] [--worker=<worker>]
```

## set-rate

Set a client's hourly rate for a role (tc, supervisor, driver) or a vehicle type, with an optional weekend rate.

```
node scripts/traffic.mjs set-rate <client> --item=<item> --rate=<amount> [--weekend=<amount>] --actor="<name>"
```

## set

Change a house rule: max_shift_hours, min_rest_hours, max_week_hours, docket_days, client_notify_hours, warn_days, gst_nz_pct or gst_au_pct.

```
node scripts/traffic.mjs set <key> <value> --actor="<name>"
```

## sign-docket

Record the client signing the docket for a finished shift. Signed hours become billable.

```
node scripts/traffic.mjs sign-docket <shift> --by="<client name>" [--reference=<docket ref>] [--note="<note>"] --actor="<name>"
```

## sign-off

Record a worker finishing a shift (now, or --at) with their break in minutes (default 30). Worked hours are what the docket shows.

```
node scripts/traffic.mjs sign-off <shift> --worker=<worker> [--at="<date time>"] [--break=<minutes>] --actor="<name>"
```

## sign-on

Record a worker starting a shift (now, or --at in job time). Refuses when the law, the plan, the permit or a vehicle says the shift cannot start, or the driver's vehicle has no passed prestart in the last 12 hours.

```
node scripts/traffic.mjs sign-on <shift> --worker=<worker> [--at="<date time>"] --actor="<name>"
```

## tickets

Every active worker's traffic control tickets, soonest to expire first, with the next shift that needs each one. --days=N shows only those expiring within N days.

```
node scripts/traffic.mjs tickets [--days=<n>]
```

## unassign

Take a worker off a shift before they sign on, with the reason.

```
node scripts/traffic.mjs unassign <shift> --worker=<worker> --reason="<reason>" --actor="<name>"
```

## unbilled

Signed crew and vehicle hours not yet on an invoice, by client, at the client's rate (weekend rates and minimum hours applied).

```
node scripts/traffic.mjs unbilled
```

## vehicle-dates

Update a vehicle's registration, inspection (WoF, CoF, roadworthy) or service date after it is renewed or serviced.

```
node scripts/traffic.mjs vehicle-dates <vehicle> [--rego-expires=<date>] [--inspection-expires=<date>] [--service-due=<date>] --actor="<name>"
```

## vehicles

Every active vehicle: registration, inspection (WoF, CoF or roadworthy) and service dates, and the last prestart result.

```
node scripts/traffic.mjs vehicles
```

## weekly-review

Write the Monday review to drafts/ from attention, compliance, shifts short of crew, unsigned dockets and signed work not invoiced.

```
node scripts/traffic.mjs weekly-review
```

## worker-status

Stand a worker down, mark them as left, or make them active again, with the reason. Lists the shifts that now need someone else.

```
node scripts/traffic.mjs worker-status <worker> --status=active|stood-down|left --reason="<reason>" --actor="<name>"
```

## worker

Everything about one worker: tickets, upcoming shifts with any problems, and incidents.

```
node scripts/traffic.mjs worker <worker>
```

## workers

Every worker: home region, employment, status, current tickets, driver licence classes and hours rostered this week.

```
node scripts/traffic.mjs workers
```

