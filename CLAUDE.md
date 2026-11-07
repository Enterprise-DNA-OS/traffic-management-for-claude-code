# Traffic Management for Claude Code: operating instructions

Claude Code reads this file at the start of every session. It says who this is for, the house rules, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR TRAFFIC MANAGEMENT COMPANY], [TMR registration, prequalification or NZ company number if you hold one]
- **Operator:** [YOUR NAME], [your role: owner, operations manager, allocations]
- **What matters most:** [for example: no crew sets out without an approved plan and permit, nobody works on an expired ticket, every docket signed within two days]

The work is a temporary traffic management company in New Zealand or Australia: clients and their rate cards, jobs with their traffic management plans and road authority permits, shifts and the crew on them, workers and their tickets, vehicles and prestarts, signed dockets, incidents, and invoices for the signed hours.

## Rules

- Read the CLI result before answering. Every answer about a job, shift, worker, vehicle or incident starts with data from `node scripts/traffic.mjs`. Never answer from memory.
- Resolve names first. If the CLI says a name is ambiguous, list the candidates and ask; never pick the first.
- Times are the job's own clock. "20:00" on a Sydney job is 8 pm in Sydney. Write them as `--start="2026-11-09 20:00"`. An end time before the start runs past midnight.
- Before anyone goes on a shift, run `cover` or `check`. If the law says no (no current ticket for the job's state or for New Zealand, a double booking), say why and stop. Never look for a way around it.
- A shift does not start without an approved plan and, where the job needs one, an approved permit covering the date and the hours. `sign-on` refuses; so do you.
- A house rule (rest between shifts, shift length, weekly hours) can be overridden only with a reason the operator gives. Never invent the reason.
- Every write names `--actor`. That is a label in the activity log, not a verified identity.
- Never invent a ticket number, an expiry date, a plan approval, a permit reference or window, a docket signature, an incident detail, a police event number or a regulator reference. Copy them from the card, the permit, the client or the supervisor.
- Never sign a docket for a client. Record it only when the client has signed.
- Never send, call, pay or delete. Notes, reports and invoices are drafts in `drafts/` or documents in `docs-out/`. Recording something as sent does not send it; a person does that.
- The rules in `docs/compliance.md` are records checks, not legal advice. If a rule looks out of date, say so and stop.
- Back up before a schema change. Use a new numbered migration (`/customise`), run `npm test`, and keep real data, exports and credentials out of Git.
- The database owner can bypass every application check. Protect that credential. Row security and revoked public privileges restrict unrelated database roles; a shared installation needs authenticated access.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| The activity log for the last 7 days (or --days=N): who did what. | `/activity` |
| Add a client. The currency follows the country (NZ is NZD, AU is AUD). --min-hours is the fewest hours billed per person per shift (default 4). | `/add-client` |
| Add a job for a client: name, address, region, road authority and PO number. --no-permit when the work needs no road authority permit. | `/add-job` |
| Record a permit application for a job: wap (NZ Work Access Permit), rol (NSW Road Occupancy Licence), council, tcp or other, with its dates and permitted hours. | `/add-permit` |
| Add a traffic management plan or guidance scheme (tmp, tgs, tcp) to a job as a draft, with the dates it covers and the controllers it calls for. A new version of the same reference gets the next version number. | `/add-plan` |
| Add a shift to a job (job time), optionally repeated daily (--repeat=N). An end time before the start runs past midnight. | `/add-shift` |
| Record a traffic control ticket: NZ tmo or stms; AU tc, itcp (TMI in Queensland) or pwztmp, for the state it was issued in. Copy the expiry from the card; a Queensland traffic controller accreditation defaults to 3 years; --no-expiry for a card that carries none. | `/add-ticket` |
| Add a vehicle: ute, tma, vms-trailer, arrow-board or truck, with the licence class to drive it and its registration, inspection and service dates. | `/add-vehicle` |
| Add a worker: home region, employment (employee, casual, subcontractor), pay rate, driver licence classes and expiry. | `/add-worker` |
| Put a vehicle on a shift with its driver. Refuses a vehicle past its registration or inspection, a driver without the licence class, or a driver not on the crew, unless --override names the reason. | `/assign-vehicle` |
| Show what needs a person today: shifts that cannot start (no approved plan or permit, outside the permit hours), crews rostered against the law, double bookings, unfit vehicles and failed prestarts, crew gaps, incidents the regulator or client has not heard about, expired and expiring tickets, house rules broken, unsigned and disputed dockets, vehicle papers due, overdue invoices and permits ending with shifts booked after them. | `/attention` |
| Cancel a shift with the reason. | `/cancel` |
| Every rule a shift breaks now, or would break with a named worker on it in a role (--worker, --role), with the source of each rule. Changes nothing. | `/check` |
| Every client: country, currency, invoice terms, minimum hours, rate card, open jobs and what they owe. | `/clients` |
| Close an incident with its outcome. Refuses until the client has been told and, for a notifiable event, the regulator. | `/close-incident` |
| Check the roster, vehicles and incidents for the next 14 days against the rules in docs/compliance.md: breaches first (law, permit, plan, double bookings), then what to fix before the shift starts, then house rules, each with its source. | `/compliance` |
| Who can take a place on a shift: every active worker in that country checked against tickets for the job's region, double bookings, rest, shift length and weekly hours, those who can first, fewest hours that week first. --role=supervisor for a supervisor, --anywhere to include the other country. Changes nothing. | `/cover` |
| Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Record that the client disputes a docket, with what they say. A disputed docket is not invoiced. | `/dispute-docket` |
| Finished shifts whose docket is unsigned or disputed (--all for every docket), with crew hours and days waiting. | `/dockets` |
| Render site packs, job dockets, incident reports and tax invoices as branded HTML from the records. | `/documents` |
| Draft a note to a client listing the finished shifts waiting on their docket signature, including any they queried. Written to drafts/, never sent. | `/draft-docket-chase` |
| Draft the incident report for the client. Warns at the top if a notifiable event has not been reported. Written to drafts/, never sent. | `/draft-incident-report` |
| Draft a reminder to a worker whose ticket is running out, with the rule that applies in their region. Written to drafts/, never sent. | `/draft-ticket-reminder` |
| Export every record to one JSON file the business owns. | `/export` |
| Put a worker on a shift in a role. Refuses outright with no current ticket for the job's region or a double booking. A house rule (rest, shift length, weekly hours) refuses unless --override names the reason, which is logged. | `/fill` |
| Hours worked by client and job over the last 7 days (or --days=N), and how many are signed off. | `/hours` |
| Bring people, skills (tickets), vehicles or bookings across from Traffio report exports saved as CSV. Dry run first. Import people, then skills, then vehicles, then jobs. | `/import` |
| One incident in full, with its activity. | `/incident` |
| Every incident, newest first, with whether the client and regulator have been told. --open hides closed ones. | `/incidents` |
| The ten questions Traffio's reports do not answer directly: margin per signed hour by job, shifts that cannot legally start, tickets that run out before the last rostered shift, hours waiting on a signature, signed work not invoiced, late sign-ons, incidents per 100 hours, vehicle hours and billing, workers near the weekly limit, and permits ending with shifts booked after them. | `/insights` |
| Raise an invoice for a client from every signed, uninvoiced docket in the period: crew hours at the role rate and vehicle hours at the vehicle rate, weekend rates on Saturday and Sunday, the client's minimum hours, GST (15% NZ, 10% AU). Nothing is invoiced twice. | `/invoice` |
| Record that an invoice was paid. | `/invoice-paid` |
| Record that an invoice was sent. | `/invoice-sent` |
| Every invoice with its standing: not sent, sent, overdue or paid. | `/invoices` |
| Everything about one job: plans, permits and their hours, upcoming shifts with problems, and incidents. | `/job` |
| Change a job's status (quoted, confirmed, completed, cancelled). Cancelling cancels its future shifts with the reason. | `/job-status` |
| Every job with its plan status, permit status and end date, and shifts still to come. | `/jobs` |
| Add a note to the activity log about a job, shift, worker, vehicle or incident. | `/log` |
| Log an incident on a job: when (job time), type, severity, what happened, police event number, injury, and whether it is a notifiable event. The shift on at that time is attached. | `/log-incident` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. | `/new-view` |
| Record that the client was told about an incident (now, or --at). | `/notify-client` |
| Record that a notifiable event was reported to WorkSafe or the state regulator, with the reference they gave. | `/notify-regulator` |
| Shifts short of controllers or a supervisor in the next 14 days (or --days=N), soonest first. | `/open-shifts` |
| Record a permit as approved, refused or cancelled. Approval needs the dates it covers, copied from the permit. | `/permit-status` |
| Every permit applied for or approved (WAP, ROL, council), with its dates, permitted hours and how many shifts are booked after it ends. | `/permits` |
| Move a plan through draft, submitted, approved and obsolete. Approval needs who approved it and the dates it covers. | `/plan-status` |
| Every traffic management plan and guidance scheme not yet obsolete, unapproved first, with the dates it covers and the crew it calls for. | `/plans` |
| Record a vehicle prestart check, pass or fail with the defects. A driver cannot sign on without a passed prestart in the last 12 hours. | `/prestart` |
| The roster: every shift for the next 7 days (or --days=N from --from=date) with crew, vehicles and anything wrong with it. Filter by --job or --worker. | `/roster` |
| Change a house rule: max_shift_hours, min_rest_hours, max_week_hours, docket_days, client_notify_hours, warn_days, gst_nz_pct or gst_au_pct. | `/set` |
| Set a client's hourly rate for a role (tc, supervisor, driver) or a vehicle type, with an optional weekend rate. | `/set-rate` |
| Record the client signing the docket for a finished shift. Signed hours become billable. | `/sign-docket` |
| Record a worker finishing a shift (now, or --at) with their break in minutes (default 30). Worked hours are what the docket shows. | `/sign-off` |
| Record a worker starting a shift (now, or --at in job time). Refuses when the law, the plan, the permit or a vehicle says the shift cannot start, or the driver's vehicle has no passed prestart in the last 12 hours. | `/sign-on` |
| Every active worker's traffic control tickets, soonest to expire first, with the next shift that needs each one. --days=N shows only those expiring within N days. | `/tickets` |
| Take a worker off a shift before they sign on, with the reason. | `/unassign` |
| Signed crew and vehicle hours not yet on an invoice, by client, at the client's rate (weekend rates and minimum hours applied). | `/unbilled` |
| Update a vehicle's registration, inspection (WoF, CoF, roadworthy) or service date after it is renewed or serviced. | `/vehicle-dates` |
| Every active vehicle: registration, inspection (WoF, CoF or roadworthy) and service dates, and the last prestart result. | `/vehicles` |
| Render the read-only dashboards in views.json (this week, the roster, the ticket register, dockets and invoices) as HTML in your brand. | `/view` |
| Write the Monday review to drafts/ from attention, compliance, shifts short of crew, unsigned dockets and signed work not invoiced. | `/weekly-review` |
| Everything about one worker: tickets, upcoming shifts with any problems, and incidents. | `/worker` |
| Stand a worker down, mark them as left, or make them active again, with the reason. Lists the shifts that now need someone else. | `/worker-status` |
| Every worker: home region, employment, status, current tickets, driver licence classes and hours rostered this week. | `/workers` |

If an ask fits nothing here, run `node scripts/traffic.mjs --help`, answer from the records, then propose a new command for it.

## Where things live

- `scripts/traffic.mjs` is the one CLI. `scripts/lib/domain.mjs` holds its rules.
- `supabase/migrations/` is the schema in plain SQL. `v_shift_problems` is every rule a shift can break, in one place: the CLI, the views and the documents all read it. `role_tickets` says which ticket covers which role in each country. `npm run migrate` applies it. `DATABASE_URL` chooses Postgres; unset, it uses PGlite in `.data/`.
- `settings` holds the house rules (`set` changes them). Laws and their sources are in `docs/compliance.md`.
- `views.json` and `documents.json` define the dashboards and documents. `brand.json` is your name, colours and logo.
- `docs/replace-traffio.md` is the switching guide. `docs/cli.md` lists every option.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=traffio&utm_medium=readme
