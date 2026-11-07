-- Traffic Management for Claude Code: a temporary traffic management business in plain tables.
-- Clients and their rate cards, jobs with their plans and permits, shifts and the crew on them,
-- workers and their tickets, vehicles and prestarts, signed dockets, incidents, invoices,
-- and an append-only activity log.
-- Shift times are wall-clock times where the job is (timestamp without time zone); region_zone()
-- turns a job's region into its time zone, so "now" is always the job's own now.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function region_zone(region text) returns text language sql immutable as $$
  select case region
    when 'NZ' then 'Pacific/Auckland' when 'NSW' then 'Australia/Sydney' when 'ACT' then 'Australia/Sydney'
    when 'VIC' then 'Australia/Melbourne' when 'TAS' then 'Australia/Hobart' when 'QLD' then 'Australia/Brisbane'
    when 'SA' then 'Australia/Adelaide' when 'NT' then 'Australia/Darwin' when 'WA' then 'Australia/Perth'
  end
$$;

create or replace function region_country(region text) returns text language sql immutable as $$
  select case when region = 'NZ' then 'NZ' when region_zone(region) is not null then 'AU' end
$$;

create or replace function region_now(region text) returns timestamp language sql stable as $$
  select (now() at time zone region_zone(region))
$$;

-- Does a shift sit inside a permit's daily window? A window that ends at or before it starts
-- runs overnight (20:00 to 05:00). No window means any time of day.
create or replace function window_fits(starts timestamp, ends timestamp, wstart time, wend time) returns boolean
language plpgsql immutable as $$
declare
  ws timestamp;
  dur interval;
begin
  if wstart is null or wend is null then return true; end if;
  dur := case when wend > wstart then wend - wstart else (wend - wstart) + interval '24 hours' end;
  ws := starts::date + wstart;
  if ws > starts then ws := ws - interval '1 day'; end if;
  return ends <= ws + dur;
end $$;

-- House rules: the business's own limits, changed with `set`. Laws live in docs/compliance.md.
create table settings (
  key text primary key,
  value text not null,
  note text not null default ''
);

insert into settings (key, value, note) values
  ('max_shift_hours', '12', 'Longest single shift, in hours'),
  ('min_rest_hours', '10', 'Hours between the end of one shift and the start of the next'),
  ('max_week_hours', '60', 'Hours rostered in one week, Monday to Sunday'),
  ('docket_days', '2', 'Days after a shift ends for the client to sign the docket'),
  ('client_notify_hours', '24', 'Hours to tell the client about an incident on their job'),
  ('warn_days', '30', 'Days ahead to warn about tickets, registrations and inspections'),
  ('gst_nz_pct', '15', 'GST on New Zealand invoices'),
  ('gst_au_pct', '10', 'GST on Australian invoices');

-- Which ticket lets a person work a role, by country. The rule is data: /customise changes it.
-- AU: tc = traffic controller (stop-slow bat), itcp = implement traffic control plans
--     (TMI in Queensland), pwztmp = prepare a work zone traffic management plan.
-- NZ: tmo = traffic controller or TTM worker, stms = site traffic management supervisor.
create table role_tickets (
  role text not null check (role in ('tc', 'supervisor', 'planner')),
  country text not null check (country in ('NZ', 'AU')),
  kind text not null,
  primary key (role, country, kind)
);

insert into role_tickets (role, country, kind) values
  ('tc', 'AU', 'tc'), ('tc', 'AU', 'itcp'),
  ('supervisor', 'AU', 'itcp'),
  ('planner', 'AU', 'pwztmp'),
  ('tc', 'NZ', 'tmo'), ('tc', 'NZ', 'stms'),
  ('supervisor', 'NZ', 'stms'),
  ('planner', 'NZ', 'stms');

create table clients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  name text not null check (length(trim(name)) > 0),
  country text not null check (country in ('NZ', 'AU')),
  currency text not null check (currency in ('NZD', 'AUD')),
  contact_name text,
  contact_email text,
  invoice_days int not null default 20 check (invoice_days between 0 and 120),
  -- The fewest hours billed per person per shift (a 4-hour call-out minimum is common).
  min_hours numeric(4,2) not null default 4 check (min_hours >= 0 and min_hours <= 12),
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((country = 'NZ' and currency = 'NZD') or (country = 'AU' and currency = 'AUD'))
);

-- A client's rate card: an hourly rate per role or vehicle type, with an optional weekend rate.
create table rates (
  client_id uuid not null references clients(id),
  item text not null check (item in ('tc', 'supervisor', 'driver', 'ute', 'tma', 'vms-trailer', 'arrow-board', 'truck')),
  rate_cents int not null check (rate_cents > 0),
  weekend_rate_cents int check (weekend_rate_cents is null or weekend_rate_cents > 0),
  primary key (client_id, item)
);

create table workers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  name text not null check (length(trim(name)) > 0),
  phone text,
  email text,
  home_region text not null check (region_zone(home_region) is not null),
  employment text not null default 'employee' check (employment in ('employee', 'casual', 'subcontractor')),
  pay_rate_cents int not null default 0 check (pay_rate_cents >= 0),
  -- Driver licence classes held (NZ 1, 2, 4, 5; AU C, LR, MR, HR, HC) and when the licence ends.
  licence_classes text not null default '',
  licence_expires date,
  status text not null default 'active' check (status in ('active', 'stood-down', 'left')),
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A ticket is valid in the region it was issued for. No expiry means the card carries none.
create table tickets (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id),
  region text not null check (region_zone(region) is not null),
  kind text not null check (kind in ('tc', 'itcp', 'pwztmp', 'tmo', 'stms')),
  number text not null check (length(trim(number)) > 0),
  issued_on date not null,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region, kind, number),
  check (expires_on is null or expires_on > issued_on),
  check ((region = 'NZ') = (kind in ('tmo', 'stms'))),
  -- Queensland traffic controller accreditation is issued for 3 years (TMR TCAS).
  check (region <> 'QLD' or kind <> 'tc' or expires_on is not null and expires_on <= issued_on + interval '3 years')
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  rego text not null unique,
  kind text not null check (kind in ('ute', 'tma', 'vms-trailer', 'arrow-board', 'truck')),
  region text not null check (region_zone(region) is not null),
  licence_class text not null default '',
  rego_expires date not null,
  -- WoF or CoF in New Zealand, a roadworthy or heavy vehicle inspection in Australia.
  inspection_expires date,
  service_due_on date,
  active boolean not null default true,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique check (ref ~ '^J-[0-9]+$'),
  client_id uuid not null references clients(id),
  name text not null check (length(trim(name)) > 0),
  address text,
  region text not null check (region_zone(region) is not null),
  road_authority text,
  -- Most road work needs the road authority's permit (a WAP in NZ, an ROL on NSW state roads).
  permit_required boolean not null default true,
  po_number text,
  status text not null default 'confirmed' check (status in ('quoted', 'confirmed', 'completed', 'cancelled')),
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The traffic management plan or guidance scheme the crew sets out from.
create table plans (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  ref text not null check (length(trim(ref)) > 0),
  kind text not null check (kind in ('tmp', 'tgs', 'tcp')),
  version int not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'obsolete')),
  approved_by text,
  approved_on date,
  valid_from date,
  valid_to date,
  -- What the plan says the site needs on every shift.
  controllers int not null default 0 check (controllers between 0 and 30),
  supervisor boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, ref, version),
  check (status <> 'approved' or (approved_on is not null and approved_by is not null and valid_from is not null and valid_to is not null)),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

-- The road authority's permission: WAP (NZ), ROL (NSW state roads), a council permit, and so on.
create table permits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  kind text not null check (kind in ('wap', 'rol', 'council', 'tcp', 'other')),
  reference text not null check (length(trim(reference)) > 0),
  status text not null default 'applied' check (status in ('applied', 'approved', 'refused', 'cancelled')),
  applied_on date,
  valid_from date,
  valid_to date,
  window_start time,
  window_end time,
  conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, kind, reference),
  check (status <> 'approved' or (valid_from is not null and valid_to is not null)),
  check (valid_to is null or valid_from is null or valid_to >= valid_from),
  check ((window_start is null) = (window_end is null))
);

create sequence shift_ref start 3001;
create table shifts (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('S-' || nextval('shift_ref')),
  job_id uuid not null references jobs(id),
  starts_at timestamp not null,
  ends_at timestamp not null,
  controllers_needed int not null default 2 check (controllers_needed between 0 and 30),
  supervisor_needed boolean not null default true,
  status text not null default 'planned' check (status in ('planned', 'cancelled')),
  cancel_reason text,
  note text,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours'),
  check (status <> 'cancelled' or cancel_reason is not null)
);

create table crew (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id),
  worker_id uuid not null references workers(id),
  role text not null check (role in ('tc', 'supervisor', 'driver')),
  signed_on_at timestamp,
  signed_off_at timestamp,
  break_minutes int not null default 0 check (break_minutes between 0 and 240),
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, worker_id),
  check (signed_off_at is null or (signed_on_at is not null and signed_off_at > signed_on_at))
);

create table shift_vehicles (
  shift_id uuid not null references shifts(id),
  vehicle_id uuid not null references vehicles(id),
  driver_id uuid references workers(id),
  primary key (shift_id, vehicle_id)
);

create table prestarts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  shift_id uuid references shifts(id),
  worker_id uuid references workers(id),
  done_at timestamp not null,
  passed boolean not null,
  defects text,
  created_at timestamptz not null default now(),
  check (passed or defects is not null)
);

-- The client's sign-off on the hours worked: the docket is what gets invoiced.
create table dockets (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null unique references shifts(id),
  signed_by text,
  signed_at timestamp,
  client_ref text,
  disputed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (disputed or signed_by is not null),
  check (not disputed or note is not null)
);

create sequence incident_ref start 71;
create table incidents (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('INC-' || nextval('incident_ref')),
  job_id uuid not null references jobs(id),
  shift_id uuid references shifts(id),
  worker_id uuid references workers(id),
  occurred_at timestamp not null,
  kind text not null check (kind in ('errant-vehicle', 'near-miss', 'abuse', 'injury', 'vehicle-damage', 'equipment', 'other')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  summary text not null check (length(trim(summary)) > 0),
  detail text,
  police_event text,
  injury boolean not null default false,
  notifiable boolean not null default false,
  regulator_ref text,
  regulator_notified_at timestamp,
  client_told_at timestamp,
  closed_on date,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closed_on is null or outcome is not null),
  check (regulator_notified_at is null or notifiable)
);

create sequence invoice_ref start 2201;
create table invoices (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('INV-' || nextval('invoice_ref')),
  client_id uuid not null references clients(id),
  period_from date not null,
  period_to date not null,
  raised_on date not null,
  due_on date not null,
  currency text not null check (currency in ('NZD', 'AUD')),
  hours numeric(9,2) not null default 0,
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  gst_cents bigint not null check (gst_cents >= 0),
  total_cents bigint not null check (total_cents = subtotal_cents + gst_cents),
  sent_on date,
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_to >= period_from)
);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id),
  shift_id uuid not null references shifts(id),
  crew_id uuid unique references crew(id),
  vehicle_id uuid references vehicles(id),
  description text not null,
  hours numeric(6,2) not null check (hours > 0),
  rate_cents int not null check (rate_cents > 0),
  amount_cents bigint not null check (amount_cents >= 0),
  unique (shift_id, vehicle_id),
  check ((crew_id is null) <> (vehicle_id is null))
);

create table activity (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  ref text,
  detail text
);

create or replace function activity_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'activity is append-only';
end $$;
create trigger activity_no_update before update or delete on activity for each row execute function activity_append_only();

do $$
declare t text;
begin
  foreach t in array array['clients', 'workers', 'tickets', 'vehicles', 'jobs', 'plans', 'permits', 'shifts', 'crew', 'dockets', 'incidents', 'invoices'] loop
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
  foreach t in array array['settings', 'role_tickets', 'clients', 'rates', 'workers', 'tickets', 'vehicles', 'jobs', 'plans', 'permits', 'shifts', 'crew',
    'shift_vehicles', 'prestarts', 'dockets', 'incidents', 'invoices', 'invoice_lines', 'activity'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public', t);
  end loop;
end $$;

create index on shifts (job_id, starts_at);
create index on crew (worker_id);
create index on tickets (worker_id);
create index on incidents (job_id);

-- ------------------------------------------------------------------ views

create or replace function setting_num(k text) returns numeric language sql stable as $$
  select value::numeric from settings where key = k
$$;

create view v_shifts as
select s.id, s.ref, s.job_id, j.ref as job, j.name as job_name, j.region, region_country(j.region) as country,
       c.id as client_id, c.code as client, c.currency, s.starts_at, s.ends_at,
       round(extract(epoch from (s.ends_at - s.starts_at)) / 3600.0, 2) as planned_hours,
       s.controllers_needed, s.supervisor_needed, s.status, s.note,
       region_now(j.region) as job_now,
       (select count(*)::int from crew x where x.shift_id = s.id and x.role = 'tc') as crew_count,
       (select string_agg(w.name || ' (' || x.role || ')', ', ' order by x.role desc, w.name) from crew x join workers w on w.id = x.worker_id where x.shift_id = s.id) as crew,
       (select string_agg(v.code, ', ' order by v.code) from shift_vehicles sv join vehicles v on v.id = sv.vehicle_id where sv.shift_id = s.id) as vehicles,
       case
         when s.status = 'cancelled' then 'cancelled'
         when s.ends_at <= region_now(j.region) then 'done'
         when s.starts_at <= region_now(j.region) then 'on now'
         else 'upcoming'
       end as standing
from shifts s join jobs j on j.id = s.job_id join clients c on c.id = j.client_id;

create view v_crew as
select x.id, x.shift_id, s.ref, x.worker_id, w.code as worker_code, w.name as worker, x.role, s.job, s.region, s.client, s.client_id,
       s.starts_at, s.ends_at, s.status, s.standing, x.signed_on_at, x.signed_off_at, x.break_minutes, x.override_reason,
       case when x.signed_off_at is not null
         then round(greatest(extract(epoch from (x.signed_off_at - x.signed_on_at)) / 3600.0 - x.break_minutes / 60.0, 0), 2) end as worked_hours,
       case when x.signed_on_at is not null then round(extract(epoch from (x.signed_on_at - s.starts_at)) / 60.0) end as late_minutes
from crew x join v_shifts s on s.id = x.shift_id join workers w on w.id = x.worker_id;

create view v_tickets as
select t.id, t.worker_id, w.code as worker_code, w.name as worker, w.status as worker_status, t.region, t.kind, t.number,
       t.issued_on, t.expires_on,
       case when t.expires_on is not null then t.expires_on - region_now(t.region)::date end as days_left,
       (select min(c.starts_at) from v_crew c where c.worker_id = t.worker_id and c.region = t.region and c.status = 'planned' and c.ends_at > c.starts_at and c.standing = 'upcoming') as next_shift,
       (select max(c.ends_at)::date from v_crew c where c.worker_id = t.worker_id and c.region = t.region and c.status = 'planned' and c.standing = 'upcoming') as last_shift
from tickets t join workers w on w.id = t.worker_id;

-- Every rule a shift breaks, in one place. kind: law, permit, plan, crew, vehicle, clash, house.
create view v_shift_problems as
with s as (select * from v_shifts where status = 'planned'),
x as (select x.*, w.name as worker, w.status as worker_status, w.licence_classes, w.licence_expires from crew x join workers w on w.id = x.worker_id)
-- No ticket for the role, valid in the job's region, current to the end of the shift.
select s.id as shift_id, s.ref, x.worker_id, 'law' as kind,
       'no current ' || (case x.role when 'tc' then 'traffic controller' else 'supervisor' end) || ' ticket for ' || s.region || ' (' || x.worker || ')' as problem,
       case when s.country = 'NZ' then 'NZGTTM and CoPTTM: TTM work by a qualified person; warrants recognised to expiry'
            when s.region = 'QLD' then 'TMR Traffic Controller Accreditation Scheme (3-year accreditation)'
            when s.region = 'NSW' then 'SafeWork NSW traffic control work training card'
            else 'State traffic control qualification for ' || s.region end as rule
from s join x on x.shift_id = s.id
where x.role in ('tc', 'supervisor')
  and not exists (
    select 1 from tickets t join role_tickets r on r.kind = t.kind and r.role = x.role and r.country = s.country
    where t.worker_id = x.worker_id and t.region = s.region and t.issued_on <= s.starts_at::date
      and (t.expires_on is null or t.expires_on >= s.ends_at::date))
union all
select s.id, s.ref, x.worker_id, 'law', x.worker || ' is ' || x.worker_status, 'A stood-down or departed worker is not rostered'
from s join x on x.shift_id = s.id where x.worker_status <> 'active'
union all
-- Work starts only inside an approved plan.
select s.id, s.ref, null, 'plan', 'no approved traffic management plan for the shift date',
       'Work only to an approved TMP or TGS (NZGTTM; AGTTM and the road authority)'
from s where not exists (select 1 from plans p where p.job_id = s.job_id and p.status = 'approved' and p.valid_from <= s.starts_at::date and p.valid_to >= s.starts_at::date)
union all
-- And inside the road authority's permit, its dates and its hours.
select s.id, s.ref, null, 'permit',
       case when not exists (select 1 from permits p where p.job_id = s.job_id and p.status = 'approved' and p.valid_from <= s.starts_at::date and p.valid_to >= s.starts_at::date)
            then 'no approved permit for the shift date'
            else 'outside the permitted hours (' || (select string_agg(to_char(p.window_start, 'HH24:MI') || '-' || to_char(p.window_end, 'HH24:MI'), ', ') from permits p where p.job_id = s.job_id and p.status = 'approved' and p.valid_from <= s.starts_at::date and p.valid_to >= s.starts_at::date) || ')' end,
       case when s.country = 'NZ' then 'Work Access Permit from the corridor manager before work starts (CAR and WAP, National Code of Practice)'
            when s.region = 'NSW' then 'Road Occupancy Licence for work affecting traffic on a state road (Transport for NSW)'
            else 'The road authority''s permit for the job' end
from s join jobs j on j.id = s.job_id
where j.permit_required and not exists (
  select 1 from permits p where p.job_id = s.job_id and p.status = 'approved' and p.valid_from <= s.starts_at::date and p.valid_to >= s.starts_at::date
    and window_fits(s.starts_at, s.ends_at, p.window_start, p.window_end))
union all
-- The plan's crew: enough controllers and a supervisor.
select s.id, s.ref, null, 'crew', 'needs ' || greatest(s.controllers_needed, coalesce(pl.controllers, 0)) || ' controllers, has ' || s.crew_count,
       'The approved plan sets the crew; the booking asks for ' || s.controllers_needed
from s left join lateral (select max(p.controllers) as controllers from plans p where p.job_id = s.job_id and p.status = 'approved') pl on true
where s.crew_count < greatest(s.controllers_needed, coalesce(pl.controllers, 0))
union all
select s.id, s.ref, null, 'crew', 'no supervisor on the crew', 'The plan or booking needs an ITCP holder (AU) or STMS (NZ) on site'
from s where s.supervisor_needed and not exists (select 1 from crew x where x.shift_id = s.id and x.role = 'supervisor')
union all
-- Vehicles: registration and inspection current, the driver licensed for it and on the crew.
select s.id, s.ref, sv.driver_id, 'vehicle', v.code || ' registration ends ' || v.rego_expires, 'A vehicle on the road is registered'
from s join shift_vehicles sv on sv.shift_id = s.id join vehicles v on v.id = sv.vehicle_id where v.rego_expires < s.ends_at::date
union all
select s.id, s.ref, sv.driver_id, 'vehicle', v.code || ' inspection ends ' || v.inspection_expires,
       case when s.country = 'NZ' then 'Warrant or certificate of fitness current' else 'Roadworthy or heavy vehicle inspection current' end
from s join shift_vehicles sv on sv.shift_id = s.id join vehicles v on v.id = sv.vehicle_id where v.inspection_expires < s.ends_at::date
union all
select s.id, s.ref, null, 'vehicle', v.code || ' has no driver', 'Every vehicle on a shift has a named driver'
from s join shift_vehicles sv on sv.shift_id = s.id join vehicles v on v.id = sv.vehicle_id where sv.driver_id is null
union all
select s.id, s.ref, w.id, 'vehicle', w.name || ' does not hold class ' || v.licence_class || ' for ' || v.code, 'Driver licensed for the vehicle class'
from s join shift_vehicles sv on sv.shift_id = s.id join vehicles v on v.id = sv.vehicle_id join workers w on w.id = sv.driver_id
where v.licence_class <> '' and not (v.licence_class = any (string_to_array(replace(w.licence_classes, ' ', ''), ',')))
union all
select s.id, s.ref, w.id, 'vehicle', w.name || ' driver licence ends ' || w.licence_expires, 'Driver licence current'
from s join shift_vehicles sv on sv.shift_id = s.id join workers w on w.id = sv.driver_id where w.licence_expires < s.ends_at::date
union all
select s.id, s.ref, sv.driver_id, 'vehicle', 'driver of ' || v.code || ' is not on the crew', 'The driver is rostered on the shift'
from s join shift_vehicles sv on sv.shift_id = s.id join vehicles v on v.id = sv.vehicle_id
where sv.driver_id is not null and not exists (select 1 from crew x where x.shift_id = s.id and x.worker_id = sv.driver_id)
union all
-- One person, one place at a time.
select s.id, s.ref, x.worker_id, 'clash', x.worker || ' is also on ' || o.ref || ' (' || to_char(o.starts_at, 'DD Mon HH24:MI') || ')', 'One person, one job at a time'
from s join x on x.shift_id = s.id join crew x2 on x2.worker_id = x.worker_id and x2.shift_id <> s.id join v_shifts o on o.id = x2.shift_id
where o.status = 'planned' and o.starts_at < s.ends_at and o.ends_at > s.starts_at
union all
-- House rules, overridden only with a recorded reason.
select s.id, s.ref, x.worker_id, 'house', 'shift is ' || s.planned_hours || ' hours, over ' || setting_num('max_shift_hours'), 'House rule max_shift_hours'
from s join x on x.shift_id = s.id where s.planned_hours > setting_num('max_shift_hours') and x.override_reason is null
union all
select s.id, s.ref, x.worker_id, 'house',
       x.worker || ' has ' || round(extract(epoch from (s.starts_at - p.ends_at)) / 3600.0, 1) || ' hours rest after ' || p.ref,
       'House rule min_rest_hours (fatigue)'
from s join x on x.shift_id = s.id
join lateral (select o.ref, o.ends_at from crew x2 join v_shifts o on o.id = x2.shift_id
              where x2.worker_id = x.worker_id and o.status = 'planned' and o.id <> s.id and o.ends_at <= s.starts_at
              order by o.ends_at desc limit 1) p on true
where s.starts_at - p.ends_at < make_interval(hours => setting_num('min_rest_hours')::int) and x.override_reason is null
union all
select s.id, s.ref, x.worker_id, 'house', x.worker || ' is rostered ' || wk.hours || ' hours that week', 'House rule max_week_hours'
from s join x on x.shift_id = s.id
join lateral (select sum(o.planned_hours) as hours from crew x2 join v_shifts o on o.id = x2.shift_id
              where x2.worker_id = x.worker_id and o.status = 'planned' and date_trunc('week', o.starts_at) = date_trunc('week', s.starts_at)) wk on true
where wk.hours > setting_num('max_week_hours') and x.override_reason is null;

create view v_dockets as
select s.id as shift_id, s.ref, s.job, s.client, s.client_id, s.region, s.starts_at, s.ends_at, s.job_now,
       d.signed_by, d.signed_at, d.client_ref, coalesce(d.disputed, false) as disputed, d.note,
       case when d.disputed then 'disputed' when d.signed_by is not null then 'signed' else 'unsigned' end as docket,
       (select sum(c.worked_hours) from v_crew c where c.shift_id = s.id) as crew_hours,
       (select count(*)::int from crew c where c.shift_id = s.id and c.signed_off_at is null) as not_signed_off,
       round(extract(epoch from (s.job_now - s.ends_at)) / 86400.0, 1) as days_since
from v_shifts s left join dockets d on d.shift_id = s.id
where s.status = 'planned' and s.ends_at <= s.job_now;

create view v_incidents as
select i.*, j.ref as job, j.name as job_name, j.region, c.code as client, sh.ref as shift, w.name as worker,
       case
         when i.closed_on is not null then 'closed'
         when i.notifiable and i.regulator_notified_at is null then 'regulator not notified'
         when i.client_told_at is null and region_now(j.region) > i.occurred_at + make_interval(hours => setting_num('client_notify_hours')::int) then 'client not told'
         when i.client_told_at is null then 'client to be told'
         else 'open'
       end as standing,
       round(extract(epoch from (i.client_told_at - i.occurred_at)) / 3600.0, 1) as hours_to_tell_client
from incidents i join jobs j on j.id = i.job_id join clients c on c.id = j.client_id
left join shifts sh on sh.id = i.shift_id left join workers w on w.id = i.worker_id;

-- Billable lines: signed crew hours (at least the client's minimum) and vehicle hours, not yet invoiced.
create view v_unbilled as
select c.client_id, c.client, s.currency, c.shift_id, c.ref, c.job, c.id as crew_id, null::uuid as vehicle_id,
       c.worker || ' (' || c.role || ')' as item, c.role as rate_item, c.starts_at,
       greatest(c.worked_hours, cl.min_hours) as hours,
       case when extract(isodow from c.starts_at) >= 6 then coalesce(r.weekend_rate_cents, r.rate_cents) else r.rate_cents end as rate_cents
from v_crew c join v_shifts s on s.id = c.shift_id join clients cl on cl.id = c.client_id
join dockets d on d.shift_id = c.shift_id and d.signed_by is not null and not d.disputed
left join rates r on r.client_id = c.client_id and r.item = c.role
where c.worked_hours is not null and not exists (select 1 from invoice_lines l where l.crew_id = c.id)
union all
select s.client_id, s.client, s.currency, s.id, s.ref, s.job, null, v.id, v.code || ' ' || v.kind, v.kind, s.starts_at,
       greatest(s.planned_hours, cl.min_hours),
       case when extract(isodow from s.starts_at) >= 6 then coalesce(r.weekend_rate_cents, r.rate_cents) else r.rate_cents end
from v_shifts s join shift_vehicles sv on sv.shift_id = s.id join vehicles v on v.id = sv.vehicle_id join clients cl on cl.id = s.client_id
join dockets d on d.shift_id = s.id and d.signed_by is not null and not d.disputed
left join rates r on r.client_id = s.client_id and r.item = v.kind
where s.status = 'planned' and not exists (select 1 from invoice_lines l where l.shift_id = s.id and l.vehicle_id = v.id);

create view v_invoices as
select i.*, c.code as client, c.name as client_name,
       case when i.paid_on is not null then 'paid'
            when i.sent_on is null then 'not sent'
            when i.due_on < current_date then 'overdue'
            else 'sent' end as standing
from invoices i join clients c on c.id = i.client_id;

create view v_vehicles as
select v.*, v.rego_expires - region_now(v.region)::date as rego_days, v.inspection_expires - region_now(v.region)::date as inspection_days,
       v.service_due_on - region_now(v.region)::date as service_days,
       (select max(p.done_at) from prestarts p where p.vehicle_id = v.id) as last_prestart,
       (select p.defects from prestarts p where p.vehicle_id = v.id order by p.done_at desc limit 1) as last_defects,
       (select not p.passed from prestarts p where p.vehicle_id = v.id order by p.done_at desc limit 1) as failed_last_prestart
from vehicles v;
