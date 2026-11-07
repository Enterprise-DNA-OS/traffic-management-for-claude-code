<h1 align="center">Traffic Management for Claude Code</h1>

<p align="center">
  <strong>The open-source traffic management system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Traffio data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=traffio">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/traffio?utm_source=github&utm_medium=readme&utm_campaign=traffio">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-traffio">Instead of Traffio</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Traffic Management for Claude Code does the job you pay Traffio for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Traffio dashboard cannot.

Traffio prices on the higher of your scheduled vehicles, scheduled staff or bookings. Up to 120 staff is A$1,860 a month (A$22,320 a year); up to 600 staff is A$5,580 a month (A$66,960 a year) ([traffio.com.au/pricing](https://www.traffio.com.au/pricing), checked 7 November 2026). Every controller you hire moves you toward the next tier. Here the database is yours, and a new controller or a new ute costs nothing.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=traffio).

It covers a temporary traffic management company in New Zealand or Australia, from 20 controllers to several hundred: clients and their rate cards, jobs with their traffic management plans and road authority permits, shifts and crews, workers and their tickets, vehicles and prestarts, signed dockets, incidents and invoices. Every shift is checked before anyone sets out: a current ticket for the state or country of the job (a SafeWork NSW card in New South Wales, TMR accreditation in Queensland, a TMO or STMS warrant or its unit standard in New Zealand), an approved plan, an approved permit covering the date and the permitted hours (a WAP in New Zealand, an ROL on NSW state roads), a supervisor where the plan calls for one, and a registered, inspected vehicle with a licensed driver and a passed prestart.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/traffic-management-for-claude-code.git
cd traffic-management-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`. Try `/compliance`, `/cover` on a shift short of crew, and `/insights` next.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Shifts that cannot start (no approved plan or permit, outside the permit hours), crews rostered against the law, unfit vehicles and failed prestarts, crew gaps, incidents the regulator or client has not heard about, tickets, dockets, vehicle papers and overdue invoices |
| `/compliance` | The next 14 days checked against the rules in [docs/compliance.md](docs/compliance.md), breaches first, each with its source |
| `/cover` | Who can take a place on a shift: tickets for the job's region, other bookings, rest, shift length and weekly hours, best first. Changes nothing |
| `/fill` | Put a worker on a shift. The law refuses outright; a house rule needs a reason, which is logged |
| `/roster` | The next 7 days, every shift with crew, vehicles and anything wrong with it |
| `/sign-on` | Refuses a start without a current ticket, an approved plan and permit, a fit vehicle and a passed prestart |
| `/tickets` | Every ticket, soonest to expire first, with the next shift that needs it |
| `/permits` | Every WAP, ROL and council permit, with its hours and the shifts booked after it ends |
| `/dockets` | Finished shifts waiting on the client's signature, or disputed |
| `/invoice` | Invoice signed dockets at the client's rates, weekend rates and minimum hours applied, GST by country, never twice |
| `/log-incident` | Log an incident; a notifiable event points straight at WorkSafe or the state regulator |
| `/weekly-review` | The Monday review, written to `drafts/` |
| `/draft-docket-chase` | A note to a client listing the dockets waiting on them |
| `/draft-incident-report` | The incident report for the client, with a warning if the regulator has not been told |
| `/draft-ticket-reminder` | A reminder to a worker whose ticket is running out, with the rule for their region |
| `/insights` | The ten questions below |

The working commands: `/add-client`, `/set-rate`, `/add-worker`, `/worker-status`, `/add-ticket`, `/add-vehicle`, `/vehicle-dates`, `/prestart`, `/add-job`, `/job-status`, `/add-plan`, `/plan-status`, `/add-permit`, `/permit-status`, `/add-shift`, `/unassign`, `/cancel`, `/assign-vehicle`, `/sign-off`, `/sign-docket`, `/dispute-docket`, `/notify-client`, `/notify-regulator`, `/close-incident`, `/invoice-sent`, `/invoice-paid`, `/set`, `/log`. The reads: `/open-shifts`, `/check`, `/workers`, `/worker`, `/clients`, `/jobs`, `/job`, `/plans`, `/vehicles`, `/incidents`, `/incident`, `/hours`, `/unbilled`, `/invoices`, `/activity`. Plus `/import`, `/export`, `/view`, `/documents`, `/new-view` and `/customise`. 65 commands in all; [docs/cli.md](docs/cli.md) lists every option.

Names match case-insensitively. A partial name or code works when it is unique; when it is not, the command lists the candidates and stops.

## The gates

- `/fill` and `/sign-on` refuse a worker without a ticket for the role, issued for the job's state or for New Zealand and current to the end of the shift, and a worker already booked somewhere else at the same time.
- `/sign-on` refuses a shift with no approved plan for the day, no approved permit for the day where the job needs one, or a start or finish outside the permit's hours (an 8 pm to 5 am ROL refuses a 7 pm set-up). It refuses a driver whose vehicle is unregistered, past its WoF, CoF or inspection, needs a licence class they do not hold, or has no passed prestart in the last 12 hours.
- House rules (10 hours rest, 12-hour shifts, 60 hours a week, all changeable with `/set`) refuse unless `--override` gives a reason. The reason goes in the activity log.
- `/add-ticket` sets a Queensland traffic controller accreditation to 3 years from issue when the card does not say. The database refuses one longer than 3 years.
- `/invoice` bills only dockets the client has signed, never a disputed one, and never the same hours twice.
- `/close-incident` refuses until the client has been told and, for a notifiable event, until the regulator has been notified.

The software records and checks; the operator decides. It is not legal advice, and it sends nothing.

## Bring your Traffio data

Export people, their skills, vehicles and the Job Sheets report from Traffio, save each as CSV, then import them in that order, dry run first:

```bash
node scripts/traffic.mjs import traffio people.csv --kind=people --region=QLD --actor="Your name" --dry-run
node scripts/traffic.mjs import traffio skills.csv --kind=skills --actor="Your name" --dry-run
node scripts/traffic.mjs import traffio vehicles.csv --kind=vehicles --region=QLD --actor="Your name" --dry-run
node scripts/traffic.mjs import traffio job-sheets.csv --kind=jobs --actor="Your name" --dry-run
```

The [switching guide](docs/replace-traffio.md) covers the headings it reads, `--map` for reports with other headings, what comes across and what does not. Imports are atomic: repeat rows are skipped and one bad row stops the whole file.

## Ten questions answered from your records

`/insights` runs all ten today.

1. Which jobs earn the least per signed hour after crew pay, over the last 28 days?
2. Which shifts in the next 14 days cannot legally start today, and why?
3. Which workers have a ticket that runs out before their last rostered shift in that region?
4. How many worked hours are waiting on a client signature, by client?
5. How much signed work is not invoiced yet, by client?
6. Who signs on late, and by how many minutes on average, over the last 28 days?
7. Which jobs have the most incidents per 100 hours worked?
8. How many hours did each vehicle work in the last 28 days, and what did it bill?
9. Which workers are within 8 hours of the weekly limit this week?
10. Which permits end within 14 days while shifts are still booked after them?

## Your first hour: ten things to ask for

1. What needs my attention today?
2. Who can cover the Kawau Street shift on Monday?
3. Is anyone booked this fortnight on an expired ticket or a ticket from the wrong state?
4. The council approved TMP-FBN-0077 today. Record it.
5. Add tonight's Church Street night shift, 8 pm to 4 am, with Priya as supervisor.
6. The attenuator failed its prestart: left brake light out. Log it.
7. Log a car driving through the stop-slow point on Te Rapa Road at 10.40, police event P061377410.
8. Chase Parramatta Civil for last week's dockets.
9. Invoice Bremer Civil Works for the fortnight.
10. Put our business name, logo and company number on the dockets and invoices through `/customise`.

## Verification

`npm test` runs every command on a temporary database with the demo company: migrations, repeatable seed data, each region's own time zone, overnight permit windows, tickets by state and role, Queensland's 3-year accreditation, NSW cards without an expiry, NZ tickets lapsing before a shift, double bookings, rest, shift length and weekly hours, cover ranking that changes nothing, overrides logged, refused placements leaving nothing behind, plan and permit approval, vehicle registration, inspection, licence class and prestarts, sign-on refusals, signed and disputed dockets, invoices to the cent with weekend rates, minimum hours, GST by country and never twice, the incident notification order, Traffio imports with dry run, repeats and rollback, drafts, export, the append-only activity log, database checks, views, documents and escaped HTML. Set `TEST_DATABASE_URL` to run the same checks on an empty Postgres database.

Read the [operating rules](CLAUDE.md), the [rules and sources](docs/compliance.md), the [selection evidence](docs/research.md) and [why there is no front end](docs/why-no-front-end.md).

## Architecture

```
traffic-management-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Traffic Management for Claude Code for your business, migrates your Traffio data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=traffio)
- Read more: [enterprisedna.co/omni/instead-of/traffio](https://enterprisedna.co/omni/instead-of/traffio?utm_source=github&utm_medium=readme&utm_campaign=traffio)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
