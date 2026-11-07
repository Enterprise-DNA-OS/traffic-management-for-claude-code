# Rules and sources

`/compliance` checks the records against these rules. Each row says where the rule comes from, what a breach looks like in the data, and where it is checked. Laws and road authority requirements are checked as such; house rules are the business's own limits, changed with `set`, and are never reported as law.

Nothing here is legal advice. It records the rules the operator has asked the system to enforce. Traffic management rules change by state, by road authority and, in New Zealand, through the move from CoPTTM to the NZGTTM. If a rule changes, update this page and the check together (`/customise`), then run `npm test`.

## Tickets and who may do the work

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| A traffic controller or supervisor holds a ticket for the state or country the job is in, current from the shift's start to its end | Each jurisdiction's scheme, below | A crew member in role `tc` or `supervisor` with no ticket in `role_tickets` for that role, issued for the job's region and not expired by the shift's end date | `v_shift_problems` (law); `fill`, `sign-on` refuse |
| New South Wales: traffic control work needs a SafeWork NSW Traffic Control Work Training Card, in one of three types: traffic controller, implement traffic control plans, prepare a work zone traffic management plan | Service NSW, Get a traffic control work training card; SafeWork NSW has issued the cards since 1 July 2020 | A NSW shift with a worker whose only ticket is from another state | `v_shift_problems`; the demo has a Queensland ticket on a NSW night job |
| Queensland: traffic controller accreditation is issued for 3 years and renewed through approved training | Transport and Main Roads, Traffic Controller Accreditation Scheme | An accreditation recorded longer than 3 years (refused by the database); one expired with shifts after it | `tickets` check constraint; `add-ticket` defaults 3 years from issue |
| New Zealand: temporary traffic management moves from CoPTTM to the risk-based NZ Guide to Temporary Traffic Management. NZTA stopped issuing most TTM warrants (TMO, STMS) from 1 November 2024; equivalent NZQA unit standards replace them, and existing warrants are recognised until they expire | NZTA, NZGTTM and CoPTTM training and assessment pages; council NZGTTM transition notices | An NZ shift with a worker whose `tmo` or `stms` ticket has expired | `v_shift_problems`; `draft-ticket-reminder` cites the transition |
| A supervisor (ITCP holder in Australia, STMS in New Zealand) is on site when the plan or booking calls for one | The approved TMP or TGS for the job | A shift with `supervisor_needed` and no crew member in role `supervisor` | `v_shift_problems` (crew) |

Which ticket covers which role is data, in `role_tickets`. AU: `tc` or `itcp` for a traffic controller, `itcp` for a supervisor. NZ: `tmo` or `stms` for a controller, `stms` for a supervisor. A state that issues no card of its own: record the unit of competency against that state. Change the mapping with `/customise`.

## Plans and permits

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| Work is set out only to an approved traffic management plan or guidance scheme | NZGTTM (NZ); the road authority's conditions and AGTTM (AU); councils state that work does not start without an approved TMP | A shift on a day not covered by an approved plan for the job | `v_shift_problems` (plan); `sign-on` refuses |
| New Zealand: work in the road corridor needs a Work Access Permit, issued by the corridor manager after a Corridor Access Request. Applying is not authority to start | National Code of Practice for Utility Operators' Access to Transport Corridors; council CAR pages (for example Whangārei, Gisborne, Southland) | A shift on a job needing a permit with no approved WAP covering the date | `v_shift_problems` (permit); `sign-on` refuses |
| New South Wales: a Road Occupancy Licence is needed for any activity likely to affect traffic flow on a state road; approved shifts are switched on and off on the ROL system | Transport for NSW, Road occupancy licences | A shift outside the ROL's dates, or outside its permitted hours | `v_shift_problems` (permit, with `window_fits`) |
| The permit's hours are kept: a window like 20:00 to 05:00 runs overnight | The permit's own conditions | A shift starting before or finishing after the window | `window_fits()`; the demo's 7 pm early start is refused |

## Vehicles

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| A vehicle on the road is registered, and its warrant or certificate of fitness (NZ), roadworthy or heavy vehicle inspection (AU) is current | Land Transport Act 1998 (NZ); each state's road transport law | A shift with a vehicle whose `rego_expires` or `inspection_expires` is before the shift ends | `v_shift_problems` (vehicle); `assign-vehicle` refuses |
| The driver holds the licence class for the vehicle, current on the day | Driver licensing law in each country and state | A driver whose `licence_classes` lacks the vehicle's class, or whose licence has ended | `v_shift_problems` (vehicle) |
| A driver does a prestart and the vehicle passes before it goes out | House rule, and most clients' conditions | A driver signing on with no passed prestart in the last 12 hours; a vehicle whose last prestart failed, booked again | `sign-on` refuses; `/attention` |

## Incidents

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| A notifiable event (a death, a notifiable injury or illness, or a notifiable incident) is reported to the regulator as soon as possible, and the site is kept as it is | Health and Safety at Work Act 2015 (NZ) ss 23 to 25, 55 and 56; Work Health and Safety Act 2011 (AU model law, as enacted in each state) ss 35 to 39 | An incident marked notifiable with no regulator notification recorded | `v_incidents` (regulator not notified); `/attention`; `close-incident` refuses |
| A record of each notifiable event is kept for at least 5 years | HSWA 2015 s 57 (NZ); WHS Act 2011 s 38(7) (AU) | Not a breach the data can show. The `incidents` table and the append-only `activity` log keep it; nothing in the CLI deletes an incident | `activity` trigger refuses updates and deletes |

## Sources

Checked 7 November 2026.

- Service NSW, traffic control work training card: https://www.service.nsw.gov.au/referral/get-a-traffic-control-work-training-card
- TMR, Traffic Controller Accreditation Scheme: https://www.tmr.qld.gov.au/business-industry/accreditations/traffic-controller-accreditation-scheme
- TMR, Traffic Management Registration Scheme (companies working on state-controlled roads, registration up to 3 years): https://www.tmr.qld.gov.au/business-industry/business-with-us/approved-products-and-suppliers/traffic-engineering-and-road-safety/traffic-management-registration-scheme
- NZTA, CoPTTM training and assessment: https://nzta2.cwp.govt.nz/roads-and-rail/code-of-practice-for-temporary-traffic-management/training-and-assessment
- NZTA, rolling out the NZGTTM: https://nzta2.cwp.govt.nz/roads-and-rail/new-zealand-guide-to-temporary-traffic-management/rolling-out-the-nzgttm
- Transport for NSW, road occupancy licences: https://www.transport.nsw.gov.au/operations/roads-and-waterways/business-and-industry/road-occupancy-licences
- Whangārei District Council, Work Access Permits: https://www.wdc.govt.nz/Services/Roads-and-Transportation/Permits-Approvals/Apply-for-Work-Access-Permit
- Gisborne District Council, Corridor Access Request: https://www.gdc.govt.nz/services/roads/corridor-access-request
- HSWA 2015: https://www.legislation.govt.nz/act/public/2015/0070/latest/
- Model WHS Act: https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws

## House rules (change them with `set`)

| Setting | Default | What it checks | Why |
|---|---|---|---|
| `max_shift_hours` | 12 | Longest single shift | Fatigue. Set your own and your award's or agreement's |
| `min_rest_hours` | 10 | Hours between the end of one shift and the start of the next | Fatigue, the common cause of night-to-day roster errors |
| `max_week_hours` | 60 | Hours rostered in one week (Monday to Sunday) | Fatigue and overtime cost |
| `docket_days` | 2 | Days after a shift for the client to sign its docket before it is chased | Cash flow: unsigned dockets are uninvoiced hours |
| `client_notify_hours` | 24 | Hours to tell the client about an incident on their job | Most client contracts set a reporting window; put yours here |
| `warn_days` | 30 | How far ahead to warn about tickets, registrations and inspections | Time to book a renewal course or an inspection |
| `gst_nz_pct`, `gst_au_pct` | 15, 10 | GST on invoices | GST rates |

A house rule can be overridden on a crew placement with `--override="<reason>"`. The reason is stored and written to the activity log. The law, the plan and the permit cannot be overridden.
