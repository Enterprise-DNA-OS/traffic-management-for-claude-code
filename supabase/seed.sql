-- A fictional traffic management company working in New Zealand, New South Wales and Queensland.
-- Every date is relative to today in the job's own time zone, so the demo always has something
-- to say: an expired ticket still rostered, a ticket from the wrong state, a night shift outside
-- the permit's hours, a plan not yet approved, an attenuator that failed its prestart, a docket
-- nobody has signed, an injury the regulator has not heard about, and an overdue invoice.
-- Safe to run twice: every row has a fixed code, reference or seed id.

insert into clients (code, name, country, currency, contact_name, contact_email, invoice_days, min_hours) values
  ('WRC', 'Waitaha Roading Contractors', 'NZ', 'NZD', 'Hemi Walker', 'hemi@waitaha-roading.example', 20, 4),
  ('FBN', 'Fibrelink Networks', 'NZ', 'NZD', 'Grace Liu', 'grace@fibrelink.example', 20, 4),
  ('PCE', 'Parramatta Civil Earthworks', 'AU', 'AUD', 'Mark Daley', 'mark@pce-civil.example', 30, 4),
  ('BCW', 'Bremer Civil Works', 'AU', 'AUD', 'Leanne Ross', 'leanne@bremercivil.example', 7, 4)
on conflict (code) do nothing;

insert into rates (client_id, item, rate_cents, weekend_rate_cents)
select c.id, r.item, r.rate, r.weekend from clients c join (values
  ('WRC', 'tc', 6200, 8500), ('WRC', 'supervisor', 7800, 10500), ('WRC', 'driver', 6200, 8500), ('WRC', 'ute', 2500, null), ('WRC', 'tma', 9500, null),
  ('FBN', 'tc', 6400, 8800), ('FBN', 'supervisor', 8000, 10800), ('FBN', 'ute', 2500, null),
  ('PCE', 'tc', 7400, 9900), ('PCE', 'supervisor', 9200, 12400), ('PCE', 'driver', 7400, 9900), ('PCE', 'ute', 2800, null), ('PCE', 'tma', 12000, null),
  ('BCW', 'tc', 6900, 9300), ('BCW', 'supervisor', 8600, 11600), ('BCW', 'ute', 2600, null), ('BCW', 'vms-trailer', 1800, null)
) as r(client, item, rate, weekend) on r.client = c.code
on conflict (client_id, item) do nothing;

insert into workers (code, name, phone, home_region, employment, pay_rate_cents, licence_classes, licence_expires) values
  ('W-101', 'Mere Tane', '021 555 0101', 'NZ', 'employee', 3600, '1,2', current_date + 900),
  ('W-102', 'Sione Fifita', '021 555 0102', 'NZ', 'employee', 3100, '1', current_date + 700),
  ('W-103', 'Jack Wilson', '021 555 0103', 'NZ', 'casual', 3000, '1', current_date + 400),
  ('W-104', 'Aroha Ngata', '021 555 0104', 'NZ', 'employee', 3700, '1,2', current_date + 1200),
  ('W-105', 'Liam Chen', '021 555 0105', 'NZ', 'casual', 3000, '1', current_date + 800),
  ('W-106', 'Tama Rewi', '021 555 0106', 'NZ', 'casual', 3000, '1', current_date + 900),
  ('W-107', 'Kate Morris', '021 555 0107', 'NZ', 'casual', 3000, '1', current_date + 900),
  ('W-201', 'Tom Reilly', '0400 555 201', 'NSW', 'employee', 4200, 'C', current_date + 600),
  ('W-202', 'Priya Sharma', '0400 555 202', 'NSW', 'employee', 4800, 'C', current_date + 1000),
  ('W-203', 'Daniel Okafor', '0400 555 203', 'NSW', 'subcontractor', 4300, 'C', current_date + 300),
  ('W-204', 'Ben Fraser', '0400 555 204', 'NSW', 'employee', 4400, 'C,MR', current_date + 500),
  ('W-301', 'Kylie Brooks', '0400 555 301', 'QLD', 'employee', 4600, 'C', current_date + 800),
  ('W-302', 'Josh Murray', '0400 555 302', 'QLD', 'casual', 4000, 'C', current_date + 450),
  ('W-303', 'Hamish Grant', '0400 555 303', 'QLD', 'employee', 4000, 'C,MR', current_date + 650)
on conflict (code) do nothing;

insert into tickets (worker_id, region, kind, number, issued_on, expires_on)
select w.id, t.region, t.kind, t.number, current_date + t.issued, case when t.expires is null then null else current_date + t.expires end
from workers w join (values
  ('W-101', 'NZ', 'stms', 'STMS-44120', -700, 400),
  ('W-102', 'NZ', 'tmo', 'TMO-58211', -1085, 10),
  ('W-103', 'NZ', 'tmo', 'TMO-50934', -1100, -5),
  ('W-104', 'NZ', 'stms', 'STMS-47788', -300, 800),
  ('W-105', 'NZ', 'tmo', 'TMO-61002', -200, 900),
  ('W-106', 'NZ', 'tmo', 'TMO-62417', -150, 950),
  ('W-107', 'NZ', 'tmo', 'TMO-49120', -1094, 1),
  ('W-201', 'NSW', 'tc', 'TCWTC-2209871', -400, null),
  ('W-202', 'NSW', 'itcp', 'TCWITCP-2101554', -500, null),
  ('W-203', 'QLD', 'tc', 'TC-QLD-338120', -500, 595),
  ('W-204', 'NSW', 'tc', 'TCWTC-2306612', -250, null),
  ('W-301', 'QLD', 'itcp', 'TMI-QLD-118442', -365, 730),
  ('W-302', 'QLD', 'tc', 'TC-QLD-301876', -1075, 20),
  ('W-303', 'QLD', 'tc', 'TC-QLD-342901', -600, 495)
) as t(code, region, kind, number, issued, expires) on t.code = w.code
on conflict (region, kind, number) do nothing;

insert into vehicles (code, rego, kind, region, licence_class, rego_expires, inspection_expires, service_due_on) values
  ('V-01', 'NTM101', 'ute', 'NZ', '1', current_date + 200, current_date + 120, current_date + 40),
  ('V-02', 'NTM202', 'tma', 'NZ', '2', current_date + 150, current_date - 3, current_date + 25),
  ('V-11', 'TM11AA', 'ute', 'NSW', 'C', current_date + 260, current_date + 300, current_date + 60),
  ('V-12', 'TM12AA', 'tma', 'NSW', 'MR', current_date + 90, current_date + 180, current_date - 6),
  ('V-21', 'TM21QB', 'ute', 'QLD', 'C', current_date + 310, current_date + 200, current_date + 80),
  ('V-22', 'TM22QB', 'vms-trailer', 'QLD', '', current_date + 12, null, current_date + 100)
on conflict (code) do nothing;

insert into jobs (ref, client_id, name, address, region, road_authority, permit_required, po_number)
select j.ref, c.id, j.name, j.address, j.region, j.authority, j.permit, j.po from clients c join (values
  ('J-2041', 'WRC', 'Te Rapa Road watermain, stage 2', 'Te Rapa Road between Bryant Road and Church Road', 'NZ', 'City council', true, 'WRC-PO-8841'),
  ('J-2042', 'FBN', 'Fibre rollout, Kawau Street', 'Kawau Street, full length', 'NZ', 'City council', true, null),
  ('J-2051', 'PCE', 'Church Street lane closure, night works', 'Church Street northbound, kerb lane', 'NSW', 'Transport for NSW', true, 'PCE-55210'),
  ('J-2053', 'PCE', 'Victoria Road kerb and gutter', 'Victoria Road eastbound shoulder', 'NSW', 'Council', false, 'PCE-55233'),
  ('J-2061', 'BCW', 'Brisbane Road resurfacing', 'Brisbane Road, chainage 1.2 to 2.4 km', 'QLD', 'City council', true, null),
  ('J-2062', 'BCW', 'Footpath renewal, Limestone Street', 'Limestone Street west side', 'QLD', 'City council', true, null)
) as j(ref, client, name, address, region, authority, permit, po) on j.client = c.code
on conflict (ref) do nothing;

insert into plans (job_id, ref, kind, version, status, approved_by, approved_on, valid_from, valid_to, controllers, supervisor)
select j.id, p.ref, p.kind, 1, p.status, p.by, case when p.status = 'approved' then current_date - 20 end,
       current_date + p.from_d, current_date + p.to_d, p.controllers, true
from jobs j join (values
  ('J-2041', 'TMP-WRC-0412', 'tmp', 'approved', 'Council TTM engineer', -30, 40, 2),
  ('J-2042', 'TMP-FBN-0077', 'tmp', 'submitted', null, 0, 30, 2),
  ('J-2051', 'TGS-PCE-1180', 'tgs', 'approved', 'Mark Daley (PCE)', -14, 30, 2),
  ('J-2053', 'TGS-PCE-1192', 'tgs', 'approved', 'Mark Daley (PCE)', -2, 20, 1),
  ('J-2061', 'TGS-BCW-0315', 'tgs', 'approved', 'Leanne Ross (BCW)', -30, 30, 2),
  ('J-2062', 'TGS-BCW-0322', 'tgs', 'approved', 'Leanne Ross (BCW)', 0, 30, 2)
) as p(job, ref, kind, status, by, from_d, to_d, controllers) on p.job = j.ref
on conflict (job_id, ref, version) do nothing;

insert into permits (job_id, kind, reference, status, applied_on, valid_from, valid_to, window_start, window_end, conditions)
select j.id, p.kind, p.ref, p.status, current_date - 25, case when p.status = 'approved' then current_date + p.from_d end,
       case when p.status = 'approved' then current_date + p.to_d end, p.ws::time, p.we::time, p.conditions
from jobs j join (values
  ('J-2041', 'wap', 'WAP-2026-11873', 'approved', -30, 40, '09:00', '15:00', 'No lane closure outside 9 am to 3 pm. Keep the bus stop open.'),
  ('J-2042', 'wap', 'WAP-2026-12011', 'approved', 0, 30, '09:00', '15:30', 'Footpath to stay open on one side.'),
  ('J-2051', 'rol', 'ROL-2614402', 'approved', -14, 3, '20:00', '05:00', 'Activate each shift on the ROL system. One lane open at all times.'),
  ('J-2061', 'council', 'RCP-26-0918', 'approved', -30, 30, '06:00', '15:00', null),
  ('J-2062', 'council', 'RCP-26-1044', 'applied', null, null, null, null, null)
) as p(job, kind, ref, status, from_d, to_d, ws, we, conditions) on p.job = j.ref
on conflict (job_id, kind, reference) do nothing;

-- Shifts: S-1xxx refs, one per job per day, built from each job's own "today".
insert into shifts (ref, job_id, starts_at, ends_at, controllers_needed, supervisor_needed, note, external_id)
select 'S-' || (g.base + g.d + 20), j.id,
       (region_now(j.region)::date + g.d) + g.starts::time,
       (region_now(j.region)::date + g.d + case when g.ends::time <= g.starts::time then 1 else 0 end) + g.ends::time,
       g.need, g.sup, g.note, 'seed:' || j.ref || ':' || g.d
from jobs j join (
  select 'J-2041' as job, 1100 as base, d, '09:00' as starts, '15:00' as ends, 2 as need, true as sup, null as note from generate_series(-7, 7) d
  union all select 'J-2042', 1200, d, '09:00', '15:00', 2, true, null from generate_series(1, 5) d
  union all select 'J-2051', 1300, d, case when d = 2 then '19:00' else '20:00' end, '04:00', 2, true,
                   case when d = 2 then 'Client asked for an early set-up' end from generate_series(-6, 5) d
  union all select 'J-2053', 1500, d, '07:00', '15:30', 1, false, null from generate_series(1, 1) d
  union all select 'J-2061', 1600, d, '06:00', '14:30', 2, true, null from generate_series(-14, 7) d
  union all select 'J-2062', 1700, d, '07:00', '15:00', 2, true, null from generate_series(3, 4) d
) g on g.job = j.ref
where g.job in ('J-2051', 'J-2053') or extract(isodow from region_now(j.region)::date + g.d) < 6
on conflict (external_id) do nothing;

-- Crew.
insert into crew (shift_id, worker_id, role)
select s.id, w.id, c.role from shifts s join jobs j on j.id = s.job_id join (values
  ('J-2041', 'W-101', 'supervisor'), ('J-2041', 'W-102', 'tc'), ('J-2041', 'W-103', 'tc'), ('J-2041', 'W-105', 'driver'),
  ('J-2042', 'W-104', 'supervisor'),
  ('J-2051', 'W-202', 'supervisor'), ('J-2051', 'W-201', 'tc'), ('J-2051', 'W-203', 'tc'), ('J-2051', 'W-204', 'driver'),
  ('J-2053', 'W-201', 'tc'),
  ('J-2061', 'W-301', 'supervisor'), ('J-2061', 'W-302', 'tc'), ('J-2061', 'W-303', 'tc')
) as c(job, worker, role) on c.job = j.ref join workers w on w.code = c.worker
where s.external_id like 'seed:%'
on conflict (shift_id, worker_id) do nothing;

-- Vehicles and their drivers.
insert into shift_vehicles (shift_id, vehicle_id, driver_id)
select s.id, v.id, w.id from shifts s join jobs j on j.id = s.job_id join (values
  ('J-2041', 'V-01', 'W-101'), ('J-2041', 'V-02', 'W-105'),
  ('J-2051', 'V-11', 'W-202'), ('J-2051', 'V-12', 'W-204'),
  ('J-2061', 'V-21', 'W-301'), ('J-2061', 'V-22', 'W-303')
) as a(job, vehicle, driver) on a.job = j.ref join vehicles v on v.code = a.vehicle join workers w on w.code = a.driver
where s.external_id like 'seed:%'
on conflict (shift_id, vehicle_id) do nothing;

-- Finished shifts: everyone signed on and off. Jack Wilson runs late.
update crew x set signed_on_at = s.starts_at + make_interval(mins => case when w.code = 'W-103' then 12 + (extract(day from s.starts_at)::int % 3) * 7 else 0 end),
                  signed_off_at = s.ends_at, break_minutes = 30
from shifts s join jobs j on j.id = s.job_id, workers w
where x.shift_id = s.id and w.id = x.worker_id and s.ends_at <= region_now(j.region) and s.external_id like 'seed:%' and x.signed_on_at is null;

-- Dockets: the client signs most of them. The last two on Te Rapa Road are unsigned, one PCE night is disputed.
insert into dockets (shift_id, signed_by, signed_at, client_ref, disputed, note)
select s.id,
       case when j.ref = 'J-2051' and s.ref = (select min(s2.ref) from shifts s2 where s2.job_id = j.id and s2.ends_at <= region_now(j.region) and s2.starts_at >= region_now(j.region) - interval '3 days') then null
            else c.contact_name end,
       case when j.ref = 'J-2051' and s.ref = (select min(s2.ref) from shifts s2 where s2.job_id = j.id and s2.ends_at <= region_now(j.region) and s2.starts_at >= region_now(j.region) - interval '3 days') then null
            else s.ends_at + interval '30 minutes' end,
       null,
       j.ref = 'J-2051' and s.ref = (select min(s2.ref) from shifts s2 where s2.job_id = j.id and s2.ends_at <= region_now(j.region) and s2.starts_at >= region_now(j.region) - interval '3 days'),
       case when j.ref = 'J-2051' and s.ref = (select min(s2.ref) from shifts s2 where s2.job_id = j.id and s2.ends_at <= region_now(j.region) and s2.starts_at >= region_now(j.region) - interval '3 days')
            then 'Client says the crew packed up at 03:00, not 04:00' end
from shifts s join jobs j on j.id = s.job_id join clients c on c.id = j.client_id
where s.external_id like 'seed:%' and s.ends_at <= region_now(j.region)
  and not (j.ref = 'J-2041' and s.starts_at >= region_now(j.region)::date - 4)
on conflict (shift_id) do nothing;

-- Last fortnight's Brisbane Road invoice: raised, sent, and now overdue.
insert into invoices (ref, client_id, period_from, period_to, raised_on, due_on, currency, hours, subtotal_cents, gst_cents, total_cents, sent_on)
select 'INV-1001', c.id, current_date - 14, current_date - 9, current_date - 8, current_date - 1, 'AUD', 0, 0, 0, 0, current_date - 8
from clients c where c.code = 'BCW'
on conflict (ref) do nothing;

insert into invoice_lines (invoice_id, shift_id, crew_id, vehicle_id, description, hours, rate_cents, amount_cents)
select i.id, u.shift_id, u.crew_id, u.vehicle_id, u.ref || ' ' || u.item, u.hours, u.rate_cents, round(u.hours * u.rate_cents)
from invoices i, v_unbilled u
where i.ref = 'INV-1001' and u.client = 'BCW' and u.starts_at::date between i.period_from and i.period_to
  and not exists (select 1 from invoice_lines l where l.invoice_id = i.id);

update invoices i set hours = t.hours, subtotal_cents = t.sub, gst_cents = round(t.sub * 0.10), total_cents = t.sub + round(t.sub * 0.10)
from (select invoice_id, sum(hours) filter (where crew_id is not null) as hours, sum(amount_cents) as sub from invoice_lines group by invoice_id) t
where t.invoice_id = i.id and i.ref = 'INV-1001' and i.subtotal_cents = 0;

-- Prestarts: the NSW attenuator failed last night, and is booked again tonight.
insert into prestarts (vehicle_id, shift_id, worker_id, done_at, passed, defects)
select v.id, null, w.id, (region_now(v.region)::date - 1) + p.at::time, p.passed, p.defects
from vehicles v join (values
  ('V-01', 'W-101', '08:30', true, null),
  ('V-12', 'W-204', '19:30', false, 'Left brake light out on the attenuator frame'),
  ('V-21', 'W-301', '05:30', true, null)
) as p(vehicle, worker, at, passed, defects) on p.vehicle = v.code join workers w on w.code = p.worker
where not exists (select 1 from prestarts x where x.vehicle_id = v.id);

-- Incidents.
insert into incidents (ref, job_id, shift_id, worker_id, occurred_at, kind, severity, summary, detail, police_event, injury, notifiable, client_told_at)
select i.ref, j.id, s.id, w.id, (region_now(j.region)::date + i.d) + i.at::time, i.kind, i.severity, i.summary, i.detail, i.police, i.injury, i.notifiable,
       case when i.told_after is null then null else (region_now(j.region)::date + i.d) + i.at::time + make_interval(hours => i.told_after) end
from jobs j join (values
  ('INC-11', 'J-2041', -3, '10:40', 'W-102', 'errant-vehicle', 'high', 'Car drove through the stop-slow point and into the coned area',
   'Silver hatchback ignored the STOP bat at the northern end, drove 40 m through the work area and left. Nobody hurt. Plate recorded.', 'P061377410', false, false, 2),
  ('INC-12', 'J-2051', -2, '01:30', 'W-201', 'injury', 'critical', 'Controller struck by a passing truck''s side mirror',
   'Mirror struck Tom Reilly on the right shoulder at the taper. Ambulance called; admitted to hospital overnight for observation.', 'E 512 884 102', true, true, 3),
  ('INC-13', 'J-2061', -2, '07:15', 'W-302', 'abuse', 'medium', 'Motorist threatened the controller at the stop-slow point',
   'Driver got out of a ute, swore at Josh Murray and threatened to run the bat over. Drove off when the supervisor walked up.', null, false, false, null)
) as i(ref, job, d, at, worker, kind, severity, summary, detail, police, injury, notifiable, told_after) on i.job = j.ref
join workers w on w.code = i.worker
left join shifts s on s.job_id = j.id and s.starts_at <= (region_now(j.region)::date + i.d) + i.at::time and s.ends_at > (region_now(j.region)::date + i.d) + i.at::time
on conflict (ref) do nothing;

insert into activity (actor, action, ref, detail)
select 'Seed', a.action, a.ref, a.detail from (values
  ('seed', 'demo', 'Fictional traffic management company loaded'),
  ('note', 'J-2051', 'Client confirmed night works continue past the ROL end date; a ROL extension is still to be applied for'),
  ('note', 'W-103', 'Jack says his TMO card renewal is booked but has not shown it')
) as a(action, ref, detail)
where not exists (select 1 from activity where actor = 'Seed');
