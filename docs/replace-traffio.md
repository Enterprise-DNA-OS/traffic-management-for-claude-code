# Moving off Traffio

Traffio keeps your people, their skills, vehicles and bookings, and exports them through its reports (Reports in the sidebar, then a report, then export). This guide brings that history across in an afternoon. Do a test run first: every import takes `--dry-run`, shows what it would add, and keeps nothing.

## 1. Export from Traffio

Save each of these as CSV (open the export in Excel or Sheets and save as CSV if it comes out as a spreadsheet):

| File | Where in Traffio | What it carries |
|---|---|---|
| `people.csv` | A people list or person report | Employee ID, name, mobile, email, state, employment status, driver licence class and expiry |
| `skills.csv` | Person skills (the skills and documents on each person) | Employee ID, skill name, card number, state, issue and expiry dates |
| `vehicles.csv` | A vehicle report | Vehicle ID, registration, type, state, registration, inspection and service dates |
| `job-sheets.csv` | Booking and jobs reports: Job Sheets | Booking ID, client, project, address, state, start and finish, status, people and vehicles on the booking |

`examples/traffio/` has one of each in this shape. Your report's headings may differ; see step 3.

## 2. Add your clients and rates

Traffio's clients and rate schedules hold matrices this does not copy blindly. Add each client and the rates you actually charge:

```bash
node scripts/traffic.mjs add-client --code=BCW --name="Bremer Civil Works" --country=AU --invoice-days=14 --min-hours=4 --actor="Your name"
node scripts/traffic.mjs set-rate BCW --item=tc --rate=69 --weekend=93 --actor="Your name"
```

## 3. Import, in this order

```bash
node scripts/traffic.mjs import traffio people.csv --kind=people --region=QLD --actor="Your name" --dry-run
node scripts/traffic.mjs import traffio skills.csv --kind=skills --actor="Your name" --dry-run
node scripts/traffic.mjs import traffio vehicles.csv --kind=vehicles --region=QLD --actor="Your name" --dry-run
node scripts/traffic.mjs import traffio job-sheets.csv --kind=jobs --actor="Your name" --dry-run
```

Read the counts, then run each again without `--dry-run`.

- `--region` fills the state when a row has none.
- Each field accepts several heading names (see `MAPS` in `scripts/lib/domain.mjs`). If your report uses others, write a map file and pass `--map=map.json`: `{ "people": { "code": ["Staff No"] }, "jobs": { "id": ["Docket No"] } }`.
- Dates are read as day first (07/11/2026) or as 2026-11-07. Times as 7:00, 07:00 or 7:00 AM.
- Skills become tickets when the name says what they are: STMS, TMO or TTM worker, traffic controller, implement traffic control plans or TMI, prepare a work zone plan. Other skills (first aid, white card) are skipped and counted.
- A booking's people column takes names or employee IDs separated by `;`. A name followed by `(supervisor)` goes on as supervisor.
- Cancelled bookings are skipped. Repeat rows are skipped, so running a file twice is safe.
- One bad row stops the whole file, with the row number, and nothing from that file is kept.

## 4. Check what came across

```bash
node scripts/traffic.mjs tickets
node scripts/traffic.mjs compliance
node scripts/traffic.mjs attention
```

Every imported shift goes through the same checks as a new one. Anyone booked without a current ticket for the job's state shows on day one.

## What comes across, and what does not

| Comes across | Does not |
|---|---|
| People, employee IDs, contact details, licence classes | Payroll and award calculations (keep your payroll system) |
| Tickets from skills, with numbers and dates | Skill documents and photos (keep the export) |
| Vehicles with registration, inspection and service dates | Odometer history, fuel cards |
| Bookings as jobs and shifts, with crew and vehicles | Signed docket images and form submissions (keep the export) |
| | Rate schedule matrices (set the rates you charge with `set-rate`) |
| | Plans and permits (add the current ones with `add-plan` and `add-permit`) |

Enterprise DNA maps your own exports, rate matrices and plan register as part of a customised version.
