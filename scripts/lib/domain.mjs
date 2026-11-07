// The rules of the traffic management office. scripts/traffic.mjs is a thin shell over run().
// Every write names an actor and leaves a row in the append-only activity log.
// Shift times are wall-clock times where the job is: "2026-11-09 20:00" means 8 pm at the job.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './db.mjs';
import { parseCsv, pick } from './csv.mjs';
import { price as money } from './format.mjs';

export const today = () => new Date().toISOString().slice(0, 10);

export function date(v, label) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  return s;
}

// "2026-11-09 20:00" (or with a T) -> "2026-11-09 20:00:00", a wall-clock time at the job.
export function stamp(v, label) {
  const s = String(v ?? '').trim().replace('T', ' ');
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2})(?::00)?$/);
  if (!m) throw Error(`--${label} must be a date and time like 2026-11-09 20:00`);
  date(m[1], label);
  const h = Number(m[2]);
  const min = Number(m[3]);
  if (h > 23 || min > 59) throw Error(`--${label} has an impossible time`);
  return `${m[1]} ${String(h).padStart(2, '0')}:${m[3]}:00`;
}

export function clock(v, label) {
  const m = String(v ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw Error(`--${label} must be a time like 20:00`);
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

// "62.50" or "$62.50" -> 6250 cents. Never guesses at a blank.
export function cents(v, label) {
  const s = String(v ?? '').replace(/[$,\s]/g, '').replace(/^(NZD|AUD)/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error(`--${label} must be an amount like 62.50`);
  const n = Math.round(parseFloat(s) * 100);
  if (n <= 0) throw Error(`--${label} must be more than zero`);
  return n;
}

function num(v, label, { min = 0, max = Infinity } = {}) {
  const n = Number(v);
  if (v === undefined || v === true || String(v).trim() === '' || !Number.isFinite(n) || n < min || n > max) throw Error(`--${label} must be a number from ${min} to ${max}`);
  return n;
}
function need(flags, ...keys) {
  for (const k of keys) if (flags[k] === undefined || flags[k] === true || String(flags[k]).trim() === '') throw Error(`--${k} is required`);
}
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw Error(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}
const text = (v) => (v === undefined || v === true ? null : String(v).trim() || null);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export const REGIONS = ['NZ', 'NSW', 'ACT', 'VIC', 'TAS', 'QLD', 'SA', 'NT', 'WA'];
const TICKETS = ['tc', 'itcp', 'pwztmp', 'tmo', 'stms'];
const ROLES = ['tc', 'supervisor', 'driver'];
const VEHICLES = ['ute', 'tma', 'vms-trailer', 'arrow-board', 'truck'];
const KINDS = ['errant-vehicle', 'near-miss', 'abuse', 'injury', 'vehicle-damage', 'equipment', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const BLOCKING = ['law', 'clash'];
const START_BLOCKING = ['law', 'clash', 'plan', 'permit', 'vehicle'];

async function tx(db, fn) {
  await db.exec('begin');
  try { const r = await fn(); await db.exec('commit'); return r; } catch (e) { await db.exec('rollback'); throw e; }
}
async function log(db, actor, action, ref, detail) {
  await db.query('insert into activity (actor, action, ref, detail) values ($1,$2,$3,$4)', [actor, action, ref, detail]);
}
function actorOf(flags) {
  need(flags, 'actor');
  return String(flags.actor).trim();
}

// Resolve one record from a code, reference, id prefix or name. Exact (case-insensitive) beats
// partial; more than one partial match lists the candidates and fails.
function choose(rows, term, what, label) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t || t === 'true') throw Error(`Name the ${what.toLowerCase()}`);
  const exact = rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase() === t));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase().includes(t)));
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw Error(`${what} "${term}" not found`);
  throw Error(`"${term}" is ambiguous: ${partial.map((r) => label(r).filter(Boolean).slice(0, 2).join(' / ')).join('; ')}`);
}
export const client = async (db, term) => choose(await db.query('select * from clients order by code'), term, 'Client', (r) => [r.code, r.name, r.id]);
export const worker = async (db, term) => choose(await db.query('select * from workers order by code'), term, 'Worker', (r) => [r.code, r.name, r.id]);
export const job = async (db, term) => choose(await db.query('select j.*, c.code as client, c.currency, c.country from jobs j join clients c on c.id = j.client_id order by j.ref'), term, 'Job', (r) => [r.ref, r.name, r.id]);
export const shift = async (db, term) => choose(await db.query('select * from v_shifts order by starts_at'), term, 'Shift', (r) => [r.ref, r.id]);
const vehicle = async (db, term) => choose(await db.query('select * from vehicles order by code'), term, 'Vehicle', (r) => [r.code, r.rego, r.id]);
const incident = async (db, term) => choose(await db.query('select * from incidents order by ref'), term, 'Incident', (r) => [r.ref, r.id]);
const invoice = async (db, term) => choose(await db.query('select * from invoices order by ref'), term, 'Invoice', (r) => [r.ref, r.id]);
const plan = async (db, term) => choose(await db.query('select p.*, j.ref as job from plans p join jobs j on j.id = p.job_id order by p.ref, p.version'), term, 'Plan', (r) => [`${r.ref} v${r.version}`, r.ref, r.id]);
const permit = async (db, term) => choose(await db.query('select p.*, j.ref as job from permits p join jobs j on j.id = p.job_id order by p.reference'), term, 'Permit', (r) => [r.reference, r.id]);
const setting = async (db, key, dflt) => Number((await db.query('select value from settings where key = $1', [key]))[0]?.value ?? dflt);
const regionNow = async (db, region) => (await db.query('select region_now($1)::text as now', [region]))[0].now.slice(0, 19);

function draftFile(name, body) {
  const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, body);
  return path.relative(process.env.OUTPUT_DIR || REPO_ROOT, file).replace(/\\/g, '/');
}

// ------------------------------------------------------------------ the gate on every roster change

const problemsOf = (db, shiftId) => db.query('select kind, problem, rule, worker_id from v_shift_problems where shift_id = $1 order by kind, problem', [shiftId]);

// Problems the shift would have with this worker on it in this role, worked out inside a savepoint so nothing sticks.
async function probe(db, s, workerId, role) {
  await db.exec('savepoint probe');
  try {
    await db.query('insert into crew (shift_id, worker_id, role) values ($1,$2,$3) on conflict (shift_id, worker_id) do update set role = excluded.role, override_reason = null', [s.id, workerId, role]);
    return (await problemsOf(db, s.id)).filter((p) => p.worker_id === workerId);
  } finally {
    await db.exec('rollback to savepoint probe');
  }
}

// The law and double bookings refuse outright; a house rule refuses unless --override gives the reason.
function gate(problems, f, ref, who) {
  const hard = problems.filter((p) => BLOCKING.includes(p.kind));
  if (hard.length) throw Error(`Refused: ${who} cannot work ${ref}. ${hard.map((p) => `${p.problem} [${p.rule}]`).join('; ')}`);
  const house = problems.filter((p) => p.kind === 'house');
  if (house.length && !text(f.override)) throw Error(`Refused: ${house.map((p) => p.problem).join('; ')}. A house rule can be overridden with --override="<reason>".`);
  return house.length ? text(f.override) : null;
}

// ------------------------------------------------------------------ reads

const ATTENTION_SQL = `
  select case when g.kind in ('plan', 'permit') then 1 when g.kind in ('law', 'clash') then 1 when g.kind in ('vehicle', 'crew') then 2 else 3 end as rank,
         case g.kind when 'plan' then 'cannot start: plan' when 'permit' then 'cannot start: permit' when 'law' then 'rostered against the law'
           when 'clash' then 'double booked' when 'vehicle' then 'vehicle not fit to go' when 'crew' then 'short of crew' else 'house rule broken' end as item,
         g.first_ref as ref,
         g.job || ': ' || g.problem || ', ' || case when g.n = 1 then to_char(g.first_start, 'Dy DD Mon HH24:MI') else g.n || ' shifts from ' || to_char(g.first_start, 'Dy DD Mon') end as detail
    from (select p.kind, p.problem, s.job, count(*)::int as n, min(s.starts_at) as first_start, (array_agg(p.ref order by s.starts_at))[1] as first_ref
          from v_shift_problems p join v_shifts s on s.id = p.shift_id
          where s.ends_at > s.job_now and s.starts_at < s.job_now + case when p.kind in ('law', 'clash') then interval '14 days' else interval '7 days' end
          group by p.kind, p.problem, s.job) g
  union all
  select 2, 'failed prestart, booked again', v.code, v.code || ': ' || v.last_defects || ', next on ' || n.ref || ' ' || to_char(n.starts_at, 'Dy DD Mon HH24:MI')
    from v_vehicles v join lateral (select s.ref, s.starts_at from shift_vehicles sv join v_shifts s on s.id = sv.shift_id
      where sv.vehicle_id = v.id and s.status = 'planned' and s.ends_at > s.job_now order by s.starts_at limit 1) n on true
    where v.failed_last_prestart
  union all
  select 2, 'regulator not notified', ref, job || ': ' || summary from v_incidents where standing = 'regulator not notified'
  union all
  select 2, 'client not told', ref, job || ': ' || summary || ' (' || round(extract(epoch from (region_now(region) - occurred_at)) / 3600.0, 1) || 'h ago)' from v_incidents where standing = 'client not told'
  union all
  select 2, 'ticket expired', worker_code, worker || ': ' || region || ' ' || kind || ' expired ' || expires_on || coalesce(', next shift ' || to_char(next_shift, 'Dy DD Mon HH24:MI'), '')
    from v_tickets t where days_left < 0 and worker_status = 'active'
      and not exists (select 1 from tickets n where n.worker_id = t.worker_id and n.region = t.region and n.kind = t.kind and (n.expires_on is null or n.expires_on > t.expires_on))
  union all
  select 3, 'docket not signed', ref, job || ' ' || to_char(starts_at, 'Dy DD Mon') || ', ' || days_since || ' days ago'
    from v_dockets where docket = 'unsigned' and days_since > setting_num('docket_days')
  union all
  select 3, 'docket disputed', ref, job || ': ' || note from v_dockets where docket = 'disputed'
  union all
  select 3, 'not signed off', c.ref, c.worker || ' on ' || c.job || ' ' || to_char(c.starts_at, 'Dy DD Mon') from v_crew c
    where c.signed_on_at is not null and c.signed_off_at is null and c.ends_at < (select region_now(c.region)) - interval '2 hours'
  union all
  select 4, 'ticket expires soon', worker_code, worker || ': ' || region || ' ' || kind || ' ' || number || ' expires ' || expires_on || ' (' || days_left || ' days)'
    from v_tickets where days_left between 0 and setting_num('warn_days') and worker_status = 'active'
  union all
  select 4, 'vehicle papers due', code, code || ' ' || rego || ': ' || concat_ws(', ',
      case when rego_days <= setting_num('warn_days') then 'registration ' || rego_expires end,
      case when inspection_days <= setting_num('warn_days') then 'inspection ' || inspection_expires end,
      case when service_days <= 0 then 'service overdue since ' || service_due_on end)
    from v_vehicles where active and (rego_days <= setting_num('warn_days') or inspection_days <= setting_num('warn_days') or service_days <= 0)
  union all
  select 4, 'invoice overdue', ref, client || ' ' || currency || ' ' || to_char(total_cents / 100.0, 'FM999,999,990.00') || ' due ' || due_on from v_invoices where standing = 'overdue'
  union all
  select 4, 'permit or plan ends soon', j.ref, x.what || ' ' || x.reference || ' ends ' || x.valid_to || ', shifts booked after it'
    from (select job_id, 'permit' as what, reference, valid_to from permits where status = 'approved'
          union all select job_id, 'plan', ref, valid_to from plans where status = 'approved') x
    join jobs j on j.id = x.job_id
    where x.valid_to between region_now(j.region)::date and region_now(j.region)::date + 7
      and exists (select 1 from shifts s where s.job_id = j.id and s.status = 'planned' and s.starts_at::date > x.valid_to)`;

export const reads = {
  async attention(db) {
    return db.query(`select item, ref, detail from (${ATTENTION_SQL}) a order by rank, item, ref, detail`);
  },
  async roster(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 62 }) : 7;
    const params = [days];
    let where = '';
    if (f.job) { params.push((await job(db, f.job)).id); where += ` and s.job_id = $${params.length}`; }
    if (f.worker) { params.push((await worker(db, f.worker)).id); where += ` and exists (select 1 from crew x where x.shift_id = s.id and x.worker_id = $${params.length})`; }
    const from = f.from ? date(f.from, 'from') : null;
    if (from) params.push(from);
    return db.query(`select s.ref, to_char(s.starts_at, 'Dy DD Mon') as day, to_char(s.starts_at, 'HH24:MI') || '-' || to_char(s.ends_at, 'HH24:MI') as hours,
      s.job, s.client, s.region, coalesce(s.crew, 'NO CREW') as crew, s.vehicles,
      (select string_agg(distinct p.problem, '; ') from v_shift_problems p where p.shift_id = s.id) as problems
      from v_shifts s where s.status = 'planned' and s.starts_at >= ${from ? `$${params.length}::date` : 's.job_now::date'}
        and s.starts_at < ${from ? `$${params.length}::date` : 's.job_now::date'} + $1::int ${where} order by s.starts_at, s.job`, params);
  },
  async 'open-shifts'(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 62 }) : 14;
    return db.query(`select s.ref, s.job, s.client, to_char(s.starts_at, 'Dy DD Mon HH24:MI') as starts, s.planned_hours as hours,
        s.controllers_needed as controllers_needed, s.crew_count as controllers_rostered,
        case when s.supervisor_needed and not exists (select 1 from crew x where x.shift_id = s.id and x.role = 'supervisor') then 'needed' else '' end as supervisor
      from v_shifts s where s.status = 'planned' and s.starts_at > s.job_now and s.starts_at < s.job_now + make_interval(days => $1::int)
        and exists (select 1 from v_shift_problems p where p.shift_id = s.id and p.kind = 'crew') order by s.starts_at`, [days]);
  },
  async check(db, args, f) {
    const s = await shift(db, args[0]);
    if (f.worker) {
      const w = await worker(db, f.worker);
      const role = oneOf(f.role || 'tc', ROLES, 'role');
      await db.exec('begin');
      try {
        return (await probe(db, s, w.id, role)).map(({ kind, problem, rule }) => ({ kind, problem, rule }));
      } finally {
        await db.exec('rollback');
      }
    }
    return (await problemsOf(db, s.id)).map(({ kind, problem, rule }) => ({ kind, problem, rule }));
  },
  async cover(db, args, f) {
    const s = await shift(db, args[0]);
    const role = oneOf(f.role || 'tc', ROLES, 'role');
    const people = await db.query(`select w.id, w.code, w.name, w.home_region,
        coalesce((select sum(o.planned_hours) from crew x join v_shifts o on o.id = x.shift_id where x.worker_id = w.id and o.status = 'planned'
          and date_trunc('week', o.starts_at) = date_trunc('week', $2::timestamp)), 0) as week_hours
      from workers w where w.status = 'active' and not exists (select 1 from crew x where x.shift_id = $1 and x.worker_id = w.id)
        and ($3 or region_country(w.home_region) = $4) order by w.code`, [s.id, s.starts_at, Boolean(f.anywhere), s.country]);
    const out = [];
    await db.exec('begin');
    try {
      for (const p of people) {
        const probs = await probe(db, s, p.id, role);
        const hard = probs.filter((x) => BLOCKING.includes(x.kind));
        const house = probs.filter((x) => x.kind === 'house');
        out.push({ worker: p.name, code: p.code, home: p.home_region, week_hours: Number(p.week_hours),
          verdict: hard.length ? 'cannot' : house.length ? 'needs override' : 'can cover',
          why: [...hard, ...house].map((x) => x.problem).join('; ') });
      }
    } finally {
      await db.exec('rollback');
    }
    const order = { 'can cover': 0, 'needs override': 1, cannot: 2 };
    return out.sort((a, b) => order[a.verdict] - order[b.verdict] || a.week_hours - b.week_hours || a.code.localeCompare(b.code));
  },
  async compliance(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 62 }) : 14;
    const rows = await db.query(`select p.kind, p.rule, count(*)::int as shifts, min(p.ref || ': ' || p.problem) as example
      from v_shift_problems p join v_shifts s on s.id = p.shift_id
      where s.ends_at > s.job_now and s.starts_at < s.job_now + make_interval(days => $1::int) group by p.kind, p.rule`, [days]);
    const inc = await db.query(`select 'law' as kind, 'Notifiable event reported to the regulator as soon as possible (HSWA 2015 s 56 NZ; WHS Act 2011 s 38 AU)' as rule,
      count(*)::int as shifts, min(ref || ': ' || summary) as example from v_incidents where standing = 'regulator not notified' having count(*) > 0`);
    const tix = await db.query(`select 'law' as kind, 'Ticket current for the work (expired tickets still on the books)' as rule, count(*)::int as shifts,
      min(worker || ' ' || region || ' ' || kind || ' expired ' || expires_on) as example from v_tickets where days_left < 0 and worker_status = 'active' and next_shift is not null having count(*) > 0`);
    const rank = { law: 0, permit: 1, plan: 2, clash: 3, vehicle: 4, crew: 5, house: 6 };
    return [...rows, ...inc, ...tix].sort((a, b) => rank[a.kind] - rank[b.kind] || b.shifts - a.shifts)
      .map((r) => ({ severity: ['law', 'permit', 'plan', 'clash'].includes(r.kind) ? 'breach' : r.kind === 'house' ? 'house rule' : 'fix before start', kind: r.kind, count: r.shifts, example: r.example, rule: r.rule }));
  },
  async tickets(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 0, max: 3650 }) : null;
    return db.query(`select worker_code as code, worker, region, kind, number, issued_on, coalesce(expires_on::text, 'no expiry on card') as expires,
        days_left, to_char(next_shift, 'Dy DD Mon HH24:MI') as next_shift
      from v_tickets where worker_status = 'active' and ($1::int is null or days_left <= $1) order by days_left nulls last, worker`, [days]);
  },
  async workers(db) {
    return db.query(`select w.code, w.name, w.home_region as home, w.employment, w.status,
        (select string_agg(t.region || ' ' || t.kind, ', ' order by t.region, t.kind) from tickets t where t.worker_id = w.id and (t.expires_on is null or t.expires_on >= current_date)) as tickets,
        w.licence_classes as driver_classes,
        coalesce((select sum(o.planned_hours) from crew x join v_shifts o on o.id = x.shift_id where x.worker_id = w.id and o.status = 'planned'
          and date_trunc('week', o.starts_at) = date_trunc('week', o.job_now)), 0) as hours_this_week
      from workers w order by w.code`);
  },
  async worker(db, args) {
    const w = await worker(db, args[0]);
    return {
      worker: w,
      tickets: await db.query('select region, kind, number, issued_on, expires_on, days_left from v_tickets where worker_id = $1 order by region, kind', [w.id]),
      shifts: await db.query(`select c.ref, c.job, c.role, to_char(c.starts_at, 'Dy DD Mon HH24:MI') as starts,
          (select string_agg(p.problem, '; ') from v_shift_problems p where p.shift_id = c.shift_id and (p.worker_id = $1 or p.worker_id is null)) as problems
        from v_crew c where c.worker_id = $1 and c.status = 'planned' and c.ends_at > (select region_now(c.region)) order by c.starts_at limit 20`, [w.id]),
      incidents: await db.query('select ref, job, kind, severity, summary, standing from v_incidents where worker_id = $1 order by occurred_at desc', [w.id]),
    };
  },
  async clients(db) {
    return db.query(`select c.code, c.name, c.country, c.currency, c.invoice_days, c.min_hours, c.contact_name as contact,
        (select count(*)::int from jobs j where j.client_id = c.id and j.status = 'confirmed') as open_jobs,
        (select string_agg(r.item || ' ' || to_char(r.rate_cents / 100.0, 'FM9990.00'), ', ' order by r.item) from rates r where r.client_id = c.id) as rates,
        coalesce((select sum(total_cents) from invoices i where i.client_id = c.id and i.paid_on is null), 0) as owed_cents
      from clients c order by c.code`);
  },
  async jobs(db) {
    return db.query(`select j.ref, c.code as client, j.name, j.region, j.status,
        (select string_agg(p.ref || ' v' || p.version || ' ' || p.status, ', ') from plans p where p.job_id = j.id and p.status <> 'obsolete') as plans,
        case when not j.permit_required then 'not needed' else
          coalesce((select string_agg(p.kind || ' ' || p.reference || ' ' || p.status || coalesce(' to ' || p.valid_to, ''), ', ') from permits p where p.job_id = j.id and p.status in ('applied', 'approved')), 'NONE') end as permits,
        (select count(*)::int from v_shifts s where s.job_id = j.id and s.status = 'planned' and s.ends_at > s.job_now) as shifts_ahead
      from jobs j join clients c on c.id = j.client_id order by j.ref`);
  },
  async job(db, args) {
    const j = await job(db, args[0]);
    return {
      job: j,
      plans: await db.query('select ref, kind, version, status, approved_by, approved_on, valid_from, valid_to, controllers, supervisor from plans where job_id = $1 order by ref, version', [j.id]),
      permits: await db.query(`select kind, reference, status, valid_from, valid_to, to_char(window_start, 'HH24:MI') || '-' || to_char(window_end, 'HH24:MI') as hours, conditions from permits where job_id = $1 order by valid_from`, [j.id]),
      shifts: await db.query(`select s.ref, to_char(s.starts_at, 'Dy DD Mon HH24:MI') as starts, s.planned_hours as hours, coalesce(s.crew, 'NO CREW') as crew,
          (select string_agg(distinct p.problem, '; ') from v_shift_problems p where p.shift_id = s.id) as problems
        from v_shifts s where s.job_id = $1 and s.status = 'planned' and s.ends_at > s.job_now order by s.starts_at`, [j.id]),
      incidents: await db.query('select ref, kind, severity, summary, standing from v_incidents where job_id = $1 order by occurred_at desc', [j.id]),
    };
  },
  async plans(db) {
    return db.query(`select p.ref, p.version, j.ref as job, p.kind, p.status, p.approved_by, p.valid_from, p.valid_to, p.controllers, p.supervisor,
        (select count(*)::int from shifts s where s.job_id = j.id and s.status = 'planned' and s.starts_at > region_now(j.region)) as shifts_ahead
      from plans p join jobs j on j.id = p.job_id where p.status <> 'obsolete' order by p.status <> 'approved' desc, p.valid_to`);
  },
  async permits(db) {
    return db.query(`select p.reference, j.ref as job, p.kind, p.status, p.applied_on, p.valid_from, p.valid_to,
        to_char(p.window_start, 'HH24:MI') || '-' || to_char(p.window_end, 'HH24:MI') as hours,
        (select count(*)::int from shifts s where s.job_id = j.id and s.status = 'planned' and s.starts_at > region_now(j.region)
          and (p.valid_to is null or s.starts_at::date > p.valid_to)) as shifts_after_it
      from permits p join jobs j on j.id = p.job_id where p.status in ('applied', 'approved') order by p.status, p.valid_to`);
  },
  async vehicles(db) {
    return db.query(`select code, rego, kind, region, licence_class as class, rego_expires, inspection_expires, service_due_on,
        to_char(last_prestart, 'DD Mon HH24:MI') as last_prestart, case when failed_last_prestart then 'FAILED: ' || last_defects else 'passed' end as prestart
      from v_vehicles where active order by code`);
  },
  async dockets(db, args, f) {
    const all = Boolean(f.all);
    return db.query(`select ref, job, client, to_char(starts_at, 'Dy DD Mon') as day, docket, signed_by, crew_hours, not_signed_off, days_since, note
      from v_dockets where $1 or docket <> 'signed' order by docket desc, starts_at`, [all]);
  },
  async incidents(db, args, f) {
    return db.query(`select ref, job, to_char(occurred_at, 'DD Mon HH24:MI') as occurred, kind, severity, summary, worker, notifiable, standing
      from v_incidents where not $1 or closed_on is null order by occurred_at desc`, [Boolean(f.open)]);
  },
  async incident(db, args) {
    const i = await incident(db, args[0]);
    return {
      incident: (await db.query('select * from v_incidents where id = $1', [i.id]))[0],
      activity: await db.query('select at, actor, action, detail from activity where ref = $1 order by at', [i.ref]),
    };
  },
  async hours(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 366 }) : 7;
    return db.query(`select c.client, c.job, count(distinct c.shift_id)::int as shifts, sum(c.worked_hours) as worked_hours,
        sum(c.worked_hours) filter (where exists (select 1 from dockets d where d.shift_id = c.shift_id and d.signed_by is not null and not d.disputed)) as signed_hours
      from v_crew c where c.worked_hours is not null and c.starts_at >= (select region_now(c.region))::date - $1::int group by c.client, c.job order by c.client, c.job`, [days]);
  },
  async unbilled(db) {
    return db.query(`select client, currency, ref, job, item, to_char(starts_at, 'DD Mon') as day, hours, rate_cents, round(hours * rate_cents) as amount_cents
      from v_unbilled order by client, starts_at, item`);
  },
  async invoices(db) {
    return db.query('select ref, client, period_from, period_to, raised_on, due_on, currency, hours, total_cents, standing from v_invoices order by raised_on desc, ref');
  },
  async activity(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 3650 }) : 7;
    return db.query(`select to_char(at, 'YYYY-MM-DD HH24:MI') as at, actor, action, ref, detail from activity where at > now() - make_interval(days => $1::int) order by id desc limit 200`, [days]);
  },
  async insights(db) {
    return insights(db);
  },
};

export const QUESTIONS = [
  { question: 'Which jobs earn the least per signed hour after crew pay, over the last 28 days?',
    sql: `select c.client, c.job, sum(c.worked_hours) as hours, round(sum(c.worked_hours * coalesce(r.rate_cents, 0)) / nullif(sum(c.worked_hours), 0)) as bill_per_hour_cents,
            round(sum(c.worked_hours * w.pay_rate_cents) / nullif(sum(c.worked_hours), 0)) as pay_per_hour_cents,
            round((sum(c.worked_hours * coalesce(r.rate_cents, 0)) - sum(c.worked_hours * w.pay_rate_cents)) / nullif(sum(c.worked_hours), 0)) as margin_per_hour_cents
          from v_crew c join workers w on w.id = c.worker_id left join rates r on r.client_id = c.client_id and r.item = c.role
          where c.worked_hours is not null and c.starts_at >= current_date - 28 group by c.client, c.job order by margin_per_hour_cents nulls first` },
  { question: 'Which shifts in the next 14 days cannot legally start today, and why?',
    sql: `select p.ref, s.job, to_char(s.starts_at, 'Dy DD Mon HH24:MI') as starts, string_agg(distinct p.kind, ', ') as kinds, string_agg(distinct p.problem, '; ') as problems
          from v_shift_problems p join v_shifts s on s.id = p.shift_id where p.kind in ('law', 'clash', 'plan', 'permit') and s.ends_at > s.job_now and s.starts_at < s.job_now + interval '14 days'
          group by p.ref, s.job, s.starts_at order by s.starts_at` },
  { question: 'Which workers have a ticket that runs out before their last rostered shift in that region?',
    sql: `select worker, region, kind, expires_on, last_shift from v_tickets where expires_on is not null and last_shift is not null and expires_on < last_shift and worker_status = 'active' order by expires_on` },
  { question: 'How many worked hours are waiting on a client signature, by client?',
    sql: `select client, count(*)::int as dockets, sum(crew_hours) as hours, max(days_since) as oldest_days from v_dockets where docket <> 'signed' group by client order by hours desc nulls last` },
  { question: 'How much signed work is not invoiced yet, by client?',
    sql: `select client, currency, count(distinct shift_id)::int as shifts, sum(hours) as hours, round(sum(hours * rate_cents)) as amount_cents from v_unbilled group by client, currency order by amount_cents desc` },
  { question: 'Who signs on late, and by how many minutes on average, over the last 28 days?',
    sql: `select worker, count(*)::int as shifts, count(*) filter (where late_minutes > 5)::int as late, round(avg(late_minutes) filter (where late_minutes > 5)) as avg_late_minutes
          from v_crew where signed_on_at is not null and starts_at >= current_date - 28 group by worker having count(*) filter (where late_minutes > 5) > 0 order by late desc` },
  { question: 'Which jobs have the most incidents per 100 hours worked?',
    sql: `select j.job, j.hours, coalesce(i.n, 0) as incidents, round(100.0 * coalesce(i.n, 0) / nullif(j.hours, 0), 2) as per_100_hours
          from (select job, job_id, sum(worked_hours) as hours from v_crew c join shifts s on s.id = c.shift_id where worked_hours is not null group by job, job_id) j
          left join (select job_id, count(*) as n from incidents group by job_id) i on i.job_id = j.job_id order by per_100_hours desc nulls last` },
  { question: 'How many hours did each vehicle work in the last 28 days, and what did it bill?',
    sql: `select v.code, v.kind, count(*)::int as shifts, sum(s.planned_hours) as hours, coalesce(sum(l.amount_cents), 0) as invoiced_cents
          from shift_vehicles sv join vehicles v on v.id = sv.vehicle_id join v_shifts s on s.id = sv.shift_id left join invoice_lines l on l.shift_id = s.id and l.vehicle_id = v.id
          where s.status = 'planned' and s.starts_at >= current_date - 28 and s.ends_at <= s.job_now group by v.code, v.kind order by hours desc` },
  { question: 'Which workers are within 8 hours of the weekly limit this week?',
    sql: `select w.name, sum(s.planned_hours) as rostered, setting_num('max_week_hours') as limit_hours
          from crew x join v_shifts s on s.id = x.shift_id join workers w on w.id = x.worker_id
          where s.status = 'planned' and date_trunc('week', s.starts_at) = date_trunc('week', s.job_now)
          group by w.name having sum(s.planned_hours) >= setting_num('max_week_hours') - 8 order by rostered desc` },
  { question: 'Which permits end within 14 days while shifts are still booked after them?',
    sql: `select p.reference, j.ref as job, p.kind, p.valid_to, count(s.id)::int as shifts_after
          from permits p join jobs j on j.id = p.job_id join shifts s on s.job_id = j.id and s.status = 'planned' and s.starts_at::date > p.valid_to
          where p.status = 'approved' and p.valid_to <= region_now(j.region)::date + 14 group by p.reference, j.ref, p.kind, p.valid_to order by p.valid_to` },
];

export async function insights(db) {
  const out = [];
  for (const q of QUESTIONS) out.push({ question: q.question, rows: await db.query(q.sql) });
  return out;
}

// ------------------------------------------------------------------ writes

const writes = {
  async 'add-client'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name', 'country');
    const country = oneOf(String(f.country).toUpperCase(), ['NZ', 'AU'], 'country');
    const code = String(f.code).toUpperCase();
    return tx(db, async () => {
      const [c] = await db.query(`insert into clients (code, name, country, currency, contact_name, contact_email, invoice_days, min_hours)
        values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`, [code, String(f.name).trim(), country, country === 'NZ' ? 'NZD' : 'AUD', text(f.contact), text(f.email),
        f['invoice-days'] ? num(f['invoice-days'], 'invoice-days', { max: 120 }) : 20, f['min-hours'] ? num(f['min-hours'], 'min-hours', { max: 12 }) : 4]);
      await log(db, actor, 'add-client', c.code, c.name);
      return c;
    });
  },
  async 'set-rate'(db, args, f) {
    const actor = actorOf(f);
    const c = await client(db, args[0]);
    need(f, 'item', 'rate');
    const item = oneOf(String(f.item), ['tc', 'supervisor', 'driver', ...VEHICLES], 'item');
    const rate = cents(f.rate, 'rate');
    const weekend = f.weekend ? cents(f.weekend, 'weekend') : null;
    return tx(db, async () => {
      await db.query(`insert into rates (client_id, item, rate_cents, weekend_rate_cents) values ($1,$2,$3,$4)
        on conflict (client_id, item) do update set rate_cents = excluded.rate_cents, weekend_rate_cents = excluded.weekend_rate_cents`, [c.id, item, rate, weekend]);
      await log(db, actor, 'set-rate', c.code, `${item} ${money(rate, c.currency)}${weekend ? `, weekend ${money(weekend, c.currency)}` : ''}`);
      return db.query('select item, rate_cents, weekend_rate_cents, $2::text as currency from rates where client_id = $1 order by item', [c.id, c.currency]);
    });
  },
  async 'add-worker'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name', 'region');
    const region = oneOf(String(f.region).toUpperCase(), REGIONS, 'region');
    return tx(db, async () => {
      const [w] = await db.query(`insert into workers (code, name, phone, email, home_region, employment, pay_rate_cents, licence_classes, licence_expires)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`, [String(f.code).toUpperCase(), String(f.name).trim(), text(f.phone), text(f.email), region,
        oneOf(f.employment || 'employee', ['employee', 'casual', 'subcontractor'], 'employment'), f.pay ? cents(f.pay, 'pay') : 0,
        text(f.classes) ? String(f.classes).toUpperCase().replace(/\s/g, '') : '', f['licence-expires'] ? date(f['licence-expires'], 'licence-expires') : null]);
      await log(db, actor, 'add-worker', w.code, `${w.name}, ${w.home_region}, ${w.employment}`);
      return w;
    });
  },
  async 'worker-status'(db, args, f) {
    const actor = actorOf(f);
    const w = await worker(db, args[0]);
    need(f, 'status', 'reason');
    const status = oneOf(f.status, ['active', 'stood-down', 'left'], 'status');
    return tx(db, async () => {
      await db.query('update workers set status = $2 where id = $1', [w.id, status]);
      await log(db, actor, 'worker-status', w.code, `${status}: ${f.reason}`);
      const shifts = await db.query(`select c.ref, c.job, to_char(c.starts_at, 'Dy DD Mon HH24:MI') as starts from v_crew c
        where c.worker_id = $1 and c.status = 'planned' and c.ends_at > (select region_now(c.region)) order by c.starts_at`, [w.id]);
      return { worker: w.name, status, shifts_to_cover: status === 'active' ? [] : shifts };
    });
  },
  async 'add-ticket'(db, args, f) {
    const actor = actorOf(f);
    const w = await worker(db, args[0]);
    need(f, 'region', 'kind', 'number', 'issued');
    const region = oneOf(String(f.region).toUpperCase(), REGIONS, 'region');
    const kind = oneOf(String(f.kind).toLowerCase(), TICKETS, 'kind');
    if ((region === 'NZ') !== ['tmo', 'stms'].includes(kind)) throw Error('New Zealand tickets are tmo or stms; Australian tickets are tc, itcp or pwztmp');
    const issued = date(f.issued, 'issued');
    let expires = f.expires ? date(f.expires, 'expires') : null;
    // Queensland traffic controller accreditation runs 3 years from issue (TMR TCAS) when the card does not say.
    if (!expires && region === 'QLD' && kind === 'tc') expires = addDays(issued, 365 * 3);
    if (!expires && !f['no-expiry']) throw Error('--expires is required (copy it from the card), or --no-expiry when the card carries none');
    return tx(db, async () => {
      const [t] = await db.query(`insert into tickets (worker_id, region, kind, number, issued_on, expires_on) values ($1,$2,$3,$4,$5,$6) returning *`,
        [w.id, region, kind, String(f.number).trim(), issued, expires]);
      await log(db, actor, 'add-ticket', w.code, `${region} ${kind} ${t.number}, expires ${expires || 'never on card'}`);
      return t;
    });
  },
  async 'add-vehicle'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'rego', 'kind', 'region', 'rego-expires');
    return tx(db, async () => {
      const [v] = await db.query(`insert into vehicles (code, rego, kind, region, licence_class, rego_expires, inspection_expires, service_due_on)
        values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`, [String(f.code).toUpperCase(), String(f.rego).toUpperCase(), oneOf(f.kind, VEHICLES, 'kind'),
        oneOf(String(f.region).toUpperCase(), REGIONS, 'region'), text(f.class) ? String(f.class).toUpperCase() : '', date(f['rego-expires'], 'rego-expires'),
        f['inspection-expires'] ? date(f['inspection-expires'], 'inspection-expires') : null, f['service-due'] ? date(f['service-due'], 'service-due') : null]);
      await log(db, actor, 'add-vehicle', v.code, `${v.rego} ${v.kind}`);
      return v;
    });
  },
  async 'vehicle-dates'(db, args, f) {
    const actor = actorOf(f);
    const v = await vehicle(db, args[0]);
    const sets = [];
    const vals = [v.id];
    for (const [flag, col] of [['rego-expires', 'rego_expires'], ['inspection-expires', 'inspection_expires'], ['service-due', 'service_due_on']]) {
      if (f[flag]) { vals.push(date(f[flag], flag)); sets.push(`${col} = $${vals.length}`); }
    }
    if (!sets.length) throw Error('Give --rego-expires, --inspection-expires or --service-due');
    return tx(db, async () => {
      const [r] = await db.query(`update vehicles set ${sets.join(', ')} where id = $1 returning code, rego, rego_expires, inspection_expires, service_due_on`, vals);
      await log(db, actor, 'vehicle-dates', v.code, sets.map((s, i) => `${s.split(' = ')[0]} ${vals[i + 1]}`).join(', '));
      return r;
    });
  },
  async prestart(db, args, f) {
    const actor = actorOf(f);
    const v = await vehicle(db, args[0]);
    need(f, 'result');
    const passed = oneOf(f.result, ['pass', 'fail'], 'result') === 'pass';
    if (!passed) need(f, 'defects');
    const w = f.worker ? await worker(db, f.worker) : null;
    const s = f.shift ? await shift(db, f.shift) : null;
    const at = f.at ? stamp(f.at, 'at') : await regionNow(db, v.region);
    return tx(db, async () => {
      const [p] = await db.query('insert into prestarts (vehicle_id, shift_id, worker_id, done_at, passed, defects) values ($1,$2,$3,$4,$5,$6) returning *',
        [v.id, s?.id || null, w?.id || null, at, passed, text(f.defects)]);
      await log(db, actor, 'prestart', v.code, passed ? 'passed' : `FAILED: ${f.defects}`);
      return p;
    });
  },
  async 'add-job'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'ref', 'client', 'name', 'region');
    const c = await client(db, f.client);
    const region = oneOf(String(f.region).toUpperCase(), REGIONS, 'region');
    if ((region === 'NZ') !== (c.country === 'NZ')) throw Error(`${c.code} is an ${c.country} client; the job region must be in ${c.country}`);
    const ref = String(f.ref).toUpperCase();
    if (!/^J-\d+$/.test(ref)) throw Error('--ref must look like J-2070');
    return tx(db, async () => {
      const [j] = await db.query(`insert into jobs (ref, client_id, name, address, region, road_authority, permit_required, po_number) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
        [ref, c.id, String(f.name).trim(), text(f.address), region, text(f.authority), !f['no-permit'], text(f.po)]);
      await log(db, actor, 'add-job', j.ref, `${c.code}: ${j.name}${j.permit_required ? '' : ' (no permit needed)'}`);
      return j;
    });
  },
  async 'job-status'(db, args, f) {
    const actor = actorOf(f);
    const j = await job(db, args[0]);
    need(f, 'status');
    const status = oneOf(f.status, ['quoted', 'confirmed', 'completed', 'cancelled'], 'status');
    return tx(db, async () => {
      await db.query('update jobs set status = $2 where id = $1', [j.id, status]);
      let cancelled = 0;
      if (status === 'cancelled') {
        need(f, 'reason');
        cancelled = (await db.query(`update shifts set status = 'cancelled', cancel_reason = $2 where job_id = $1 and status = 'planned' and starts_at > region_now($3) returning id`, [j.id, f.reason, j.region])).length;
      }
      await log(db, actor, 'job-status', j.ref, `${status}${f.reason ? `: ${f.reason}` : ''}${cancelled ? `, ${cancelled} shifts cancelled` : ''}`);
      return { job: j.ref, status, shifts_cancelled: cancelled };
    });
  },
  async 'add-plan'(db, args, f) {
    const actor = actorOf(f);
    const j = await job(db, args[0]);
    need(f, 'ref', 'kind');
    const kind = oneOf(String(f.kind).toLowerCase(), ['tmp', 'tgs', 'tcp'], 'kind');
    return tx(db, async () => {
      const [{ v }] = await db.query('select coalesce(max(version), 0) + 1 as v from plans where job_id = $1 and ref = $2', [j.id, String(f.ref).trim()]);
      const [p] = await db.query(`insert into plans (job_id, ref, kind, version, status, valid_from, valid_to, controllers, supervisor) values ($1,$2,$3,$4,'draft',$5,$6,$7,$8) returning *`,
        [j.id, String(f.ref).trim(), kind, v, f.from ? date(f.from, 'from') : null, f.to ? date(f.to, 'to') : null,
          f.controllers ? num(f.controllers, 'controllers', { max: 30 }) : 0, !f['no-supervisor']]);
      await log(db, actor, 'add-plan', j.ref, `${p.ref} v${p.version} (${kind}) drafted`);
      return p;
    });
  },
  async 'plan-status'(db, args, f) {
    const actor = actorOf(f);
    const p = await plan(db, args[0]);
    need(f, 'status');
    const status = oneOf(f.status, ['draft', 'submitted', 'approved', 'obsolete'], 'status');
    const vals = [p.id, status];
    let extra = '';
    if (status === 'approved') {
      need(f, 'by');
      vals.push(String(f.by).trim(), f.on ? date(f.on, 'on') : today());
      extra = ', approved_by = $3, approved_on = $4';
      if (f.from) { vals.push(date(f.from, 'from')); extra += `, valid_from = $${vals.length}`; }
      if (f.to) { vals.push(date(f.to, 'to')); extra += `, valid_to = $${vals.length}`; }
      if (!(f.from || p.valid_from) || !(f.to || p.valid_to)) throw Error('An approved plan needs the dates it covers: --from and --to');
    }
    return tx(db, async () => {
      const [r] = await db.query(`update plans set status = $2${extra} where id = $1 returning ref, version, status, approved_by, approved_on, valid_from, valid_to`, vals);
      await log(db, actor, 'plan-status', p.job, `${p.ref} v${p.version} ${status}${f.by ? ` by ${f.by}` : ''}`);
      return r;
    });
  },
  async 'add-permit'(db, args, f) {
    const actor = actorOf(f);
    const j = await job(db, args[0]);
    need(f, 'kind', 'reference');
    const ws = f['window-start'] ? clock(f['window-start'], 'window-start') : null;
    const we = f['window-end'] ? clock(f['window-end'], 'window-end') : null;
    if (Boolean(ws) !== Boolean(we)) throw Error('Give both --window-start and --window-end, or neither');
    return tx(db, async () => {
      const [p] = await db.query(`insert into permits (job_id, kind, reference, status, applied_on, valid_from, valid_to, window_start, window_end, conditions)
        values ($1,$2,$3,'applied',$4,$5,$6,$7,$8,$9) returning *`, [j.id, oneOf(String(f.kind).toLowerCase(), ['wap', 'rol', 'council', 'tcp', 'other'], 'kind'),
        String(f.reference).trim(), f.applied ? date(f.applied, 'applied') : today(), f.from ? date(f.from, 'from') : null, f.to ? date(f.to, 'to') : null, ws, we, text(f.conditions)]);
      await log(db, actor, 'add-permit', j.ref, `${p.kind} ${p.reference} applied for`);
      return p;
    });
  },
  async 'permit-status'(db, args, f) {
    const actor = actorOf(f);
    const p = await permit(db, args[0]);
    need(f, 'status');
    const status = oneOf(f.status, ['applied', 'approved', 'refused', 'cancelled'], 'status');
    const vals = [p.id, status];
    let extra = '';
    if (f.from) { vals.push(date(f.from, 'from')); extra += `, valid_from = $${vals.length}`; }
    if (f.to) { vals.push(date(f.to, 'to')); extra += `, valid_to = $${vals.length}`; }
    if (status === 'approved' && (!(f.from || p.valid_from) || !(f.to || p.valid_to))) throw Error('An approved permit needs the dates it covers: --from and --to, copied from the permit');
    return tx(db, async () => {
      const [r] = await db.query(`update permits set status = $2${extra} where id = $1 returning reference, kind, status, valid_from, valid_to`, vals);
      await log(db, actor, 'permit-status', p.job, `${p.reference} ${status}`);
      return r;
    });
  },
  async 'add-shift'(db, args, f) {
    const actor = actorOf(f);
    const j = await job(db, args[0]);
    need(f, 'start', 'end');
    const start = stamp(f.start, 'start');
    let end = f.end.includes('-') ? stamp(f.end, 'end') : `${start.slice(0, 10)} ${clock(f.end, 'end')}:00`;
    if (end <= start) end = `${addDays(start.slice(0, 10), 1)} ${end.slice(11)}`;
    const repeat = f.repeat ? num(f.repeat, 'repeat', { min: 1, max: 31 }) : 1;
    const controllers = f.controllers !== undefined ? num(f.controllers, 'controllers', { max: 30 }) : 2;
    return tx(db, async () => {
      const out = [];
      for (let i = 0; i < repeat; i++) {
        const [s] = await db.query(`insert into shifts (job_id, starts_at, ends_at, controllers_needed, supervisor_needed, note) values ($1,$2,$3,$4,$5,$6) returning ref, starts_at, ends_at`,
          [j.id, `${addDays(start.slice(0, 10), i)} ${start.slice(11)}`, `${addDays(end.slice(0, 10), i)} ${end.slice(11)}`, controllers, !f['no-supervisor'], text(f.note)]);
        out.push(s);
        await log(db, actor, 'add-shift', s.ref, `${j.ref} ${s.starts_at.slice(0, 16)} to ${s.ends_at.slice(11, 16)}`);
      }
      return out;
    });
  },
  async fill(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    need(f, 'worker');
    const w = await worker(db, f.worker);
    const role = oneOf(f.role || 'tc', ROLES, 'role');
    if (s.status !== 'planned') throw Error(`${s.ref} is ${s.status}`);
    return tx(db, async () => {
      const override = gate(await probe(db, s, w.id, role), f, s.ref, w.name);
      await db.query('insert into crew (shift_id, worker_id, role, override_reason) values ($1,$2,$3,$4) on conflict (shift_id, worker_id) do update set role = excluded.role, override_reason = excluded.override_reason',
        [s.id, w.id, role, override]);
      await log(db, actor, 'fill', s.ref, `${w.name} as ${role}${override ? ` (override: ${override})` : ''}`);
      const left = (await problemsOf(db, s.id)).map((p) => `${p.kind}: ${p.problem}`);
      return { shift: s.ref, worker: w.name, role, override, still_open: left };
    });
  },
  async unassign(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    need(f, 'worker', 'reason');
    const w = await worker(db, f.worker);
    return tx(db, async () => {
      const gone = await db.query('delete from crew where shift_id = $1 and worker_id = $2 and signed_on_at is null returning role', [s.id, w.id]);
      if (!gone.length) throw Error(`${w.name} is not on ${s.ref}, or has already signed on`);
      await db.query('update shift_vehicles set driver_id = null where shift_id = $1 and driver_id = $2', [s.id, w.id]);
      await log(db, actor, 'unassign', s.ref, `${w.name}: ${f.reason}`);
      return { shift: s.ref, removed: w.name, problems: (await problemsOf(db, s.id)).map((p) => p.problem) };
    });
  },
  async cancel(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    need(f, 'reason');
    if (s.status === 'cancelled') throw Error(`${s.ref} is already cancelled`);
    return tx(db, async () => {
      await db.query(`update shifts set status = 'cancelled', cancel_reason = $2 where id = $1`, [s.id, f.reason]);
      await log(db, actor, 'cancel', s.ref, f.reason);
      return { shift: s.ref, status: 'cancelled', crew_to_tell: s.crew };
    });
  },
  async 'assign-vehicle'(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    need(f, 'vehicle');
    const v = await vehicle(db, f.vehicle);
    const d = f.driver ? await worker(db, f.driver) : null;
    return tx(db, async () => {
      await db.query('insert into shift_vehicles (shift_id, vehicle_id, driver_id) values ($1,$2,$3) on conflict (shift_id, vehicle_id) do update set driver_id = excluded.driver_id', [s.id, v.id, d?.id || null]);
      const probs = (await problemsOf(db, s.id)).filter((p) => p.kind === 'vehicle' && p.problem.includes(v.code) || (d && p.kind === 'vehicle' && p.worker_id === d.id));
      if (probs.length && !f.override) throw Error(`Refused: ${probs.map((p) => `${p.problem} [${p.rule}]`).join('; ')}`);
      await log(db, actor, 'assign-vehicle', s.ref, `${v.code}${d ? ` driven by ${d.name}` : ''}${probs.length ? ` (override: ${f.override})` : ''}`);
      return { shift: s.ref, vehicle: v.code, driver: d?.name || null };
    });
  },
  async 'sign-on'(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    need(f, 'worker');
    const w = await worker(db, f.worker);
    const at = f.at ? stamp(f.at, 'at') : await regionNow(db, s.region);
    const [x] = await db.query('select * from crew where shift_id = $1 and worker_id = $2', [s.id, w.id]);
    if (!x) throw Error(`${w.name} is not on ${s.ref}. Use fill first.`);
    const stop = (await problemsOf(db, s.id)).filter((p) => START_BLOCKING.includes(p.kind) && (p.worker_id === null || p.worker_id === w.id));
    if (stop.length) throw Error(`Refused: ${s.ref} cannot start with ${w.name}. ${stop.map((p) => `${p.problem} [${p.rule}]`).join('; ')}`);
    const vehicles = await db.query(`select v.code from shift_vehicles sv join vehicles v on v.id = sv.vehicle_id where sv.shift_id = $1 and sv.driver_id = $2
      and not exists (select 1 from prestarts p where p.vehicle_id = v.id and p.passed and p.done_at >= $3::timestamp - interval '12 hours')`, [s.id, w.id, at]);
    if (vehicles.length) throw Error(`Refused: no passed prestart in the last 12 hours for ${vehicles.map((v) => v.code).join(', ')}. Record it with prestart first.`);
    return tx(db, async () => {
      await db.query('update crew set signed_on_at = $2 where id = $1', [x.id, at]);
      await log(db, actor, 'sign-on', s.ref, `${w.name} at ${at.slice(0, 16)}`);
      return { shift: s.ref, worker: w.name, signed_on_at: at };
    });
  },
  async 'sign-off'(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    need(f, 'worker');
    const w = await worker(db, f.worker);
    const at = f.at ? stamp(f.at, 'at') : await regionNow(db, s.region);
    const brk = f.break !== undefined ? num(f.break, 'break', { max: 240 }) : 30;
    const [x] = await db.query('select * from crew where shift_id = $1 and worker_id = $2', [s.id, w.id]);
    if (!x?.signed_on_at) throw Error(`${w.name} has not signed on to ${s.ref}`);
    if (at <= x.signed_on_at) throw Error('Sign-off must be after sign-on');
    return tx(db, async () => {
      await db.query('update crew set signed_off_at = $2, break_minutes = $3 where id = $1', [x.id, at, brk]);
      await log(db, actor, 'sign-off', s.ref, `${w.name} at ${at.slice(0, 16)}, ${brk} min break`);
      return (await db.query('select ref, worker, signed_on_at, signed_off_at, break_minutes, worked_hours from v_crew where id = $1', [x.id]))[0];
    });
  },
  async 'sign-docket'(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    need(f, 'by');
    if (s.ends_at > await regionNow(db, s.region)) throw Error(`${s.ref} has not finished yet`);
    const open = await db.query('select worker from v_crew where shift_id = $1 and signed_off_at is null', [s.id]);
    if (open.length) throw Error(`Sign everyone off first: ${open.map((o) => o.worker).join(', ')}`);
    const at = f.at ? stamp(f.at, 'at') : await regionNow(db, s.region);
    return tx(db, async () => {
      await db.query(`insert into dockets (shift_id, signed_by, signed_at, client_ref, disputed, note) values ($1,$2,$3,$4,false,$5)
        on conflict (shift_id) do update set signed_by = excluded.signed_by, signed_at = excluded.signed_at, client_ref = excluded.client_ref, disputed = false, note = excluded.note`,
        [s.id, String(f.by).trim(), at, text(f.reference), text(f.note)]);
      await log(db, actor, 'sign-docket', s.ref, `signed by ${f.by}`);
      return (await db.query('select ref, job, docket, signed_by, crew_hours from v_dockets where shift_id = $1', [s.id]))[0];
    });
  },
  async 'dispute-docket'(db, args, f) {
    const actor = actorOf(f);
    const s = await shift(db, args[0]);
    need(f, 'note');
    return tx(db, async () => {
      await db.query(`insert into dockets (shift_id, disputed, note) values ($1, true, $2)
        on conflict (shift_id) do update set disputed = true, note = excluded.note`, [s.id, String(f.note).trim()]);
      await log(db, actor, 'dispute-docket', s.ref, f.note);
      return { shift: s.ref, docket: 'disputed', note: f.note };
    });
  },
  async 'log-incident'(db, args, f) {
    const actor = actorOf(f);
    const j = await job(db, args[0]);
    need(f, 'kind', 'summary');
    const at = f.at ? stamp(f.at, 'at') : await regionNow(db, j.region);
    const w = f.worker ? await worker(db, f.worker) : null;
    return tx(db, async () => {
      const [s] = await db.query('select id from shifts where job_id = $1 and starts_at <= $2 and ends_at > $2 and status = $3 limit 1', [j.id, at, 'planned']);
      const [i] = await db.query(`insert into incidents (job_id, shift_id, worker_id, occurred_at, kind, severity, summary, detail, police_event, injury, notifiable)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`, [j.id, s?.id || null, w?.id || null, at, oneOf(f.kind, KINDS, 'kind'),
        oneOf(f.severity || 'medium', SEVERITIES, 'severity'), String(f.summary).trim(), text(f.detail), text(f.police), Boolean(f.injury), Boolean(f.notifiable)]);
      await log(db, actor, 'log-incident', i.ref, `${j.ref}: ${i.summary}`);
      return { ...i, next: i.notifiable ? (j.country === 'NZ' ? 'Notify WorkSafe as soon as possible (HSWA 2015 s 56) and keep the site as it is (s 55)' : 'Notify the state WHS regulator immediately (WHS Act 2011 s 38) and keep the site as it is (s 39)') : 'Tell the client' };
    });
  },
  async 'notify-client'(db, args, f) {
    const actor = actorOf(f);
    const i = await incident(db, args[0]);
    const [j] = await db.query('select region from jobs where id = $1', [i.job_id]);
    const at = f.at ? stamp(f.at, 'at') : await regionNow(db, j.region);
    return tx(db, async () => {
      await db.query('update incidents set client_told_at = $2 where id = $1', [i.id, at]);
      await log(db, actor, 'notify-client', i.ref, `client told ${at.slice(0, 16)}`);
      return { incident: i.ref, client_told_at: at };
    });
  },
  async 'notify-regulator'(db, args, f) {
    const actor = actorOf(f);
    const i = await incident(db, args[0]);
    need(f, 'reference');
    if (!i.notifiable) throw Error(`${i.ref} is not marked notifiable`);
    const [j] = await db.query('select region from jobs where id = $1', [i.job_id]);
    const at = f.at ? stamp(f.at, 'at') : await regionNow(db, j.region);
    return tx(db, async () => {
      await db.query('update incidents set regulator_notified_at = $2, regulator_ref = $3 where id = $1', [i.id, at, String(f.reference).trim()]);
      await log(db, actor, 'notify-regulator', i.ref, `regulator reference ${f.reference}`);
      return { incident: i.ref, regulator_notified_at: at, regulator_ref: f.reference };
    });
  },
  async 'close-incident'(db, args, f) {
    const actor = actorOf(f);
    const i = await incident(db, args[0]);
    need(f, 'outcome');
    if (i.notifiable && !i.regulator_notified_at) throw Error(`Refused: ${i.ref} is notifiable and the regulator has not been notified`);
    if (!i.client_told_at) throw Error(`Refused: the client has not been told about ${i.ref}`);
    return tx(db, async () => {
      await db.query('update incidents set closed_on = $2, outcome = $3 where id = $1', [i.id, today(), String(f.outcome).trim()]);
      await log(db, actor, 'close-incident', i.ref, f.outcome);
      return { incident: i.ref, closed_on: today() };
    });
  },
  async invoice(db, args, f) {
    const actor = actorOf(f);
    const c = await client(db, args[0]);
    const to = f.to ? date(f.to, 'to') : today();
    const from = f.from ? date(f.from, 'from') : addDays(to, -30);
    return tx(db, async () => {
      const lines = await db.query('select * from v_unbilled where client_id = $1 and starts_at::date between $2 and $3 order by starts_at, item', [c.id, from, to]);
      if (!lines.length) throw Error(`Nothing signed and uninvoiced for ${c.code} between ${from} and ${to}`);
      const missing = [...new Set(lines.filter((l) => !l.rate_cents).map((l) => l.rate_item))];
      if (missing.length) throw Error(`${c.code} has no rate for ${missing.join(', ')}. Use set-rate first.`);
      const gstPct = await setting(db, c.country === 'NZ' ? 'gst_nz_pct' : 'gst_au_pct', c.country === 'NZ' ? 15 : 10);
      const amounts = lines.map((l) => Math.round(Number(l.hours) * l.rate_cents));
      const sub = amounts.reduce((a, b) => a + b, 0);
      const gst = Math.round(sub * gstPct / 100);
      const hours = lines.filter((l) => l.crew_id).reduce((a, l) => a + Number(l.hours), 0);
      const [inv] = await db.query(`insert into invoices (client_id, period_from, period_to, raised_on, due_on, currency, hours, subtotal_cents, gst_cents, total_cents)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`, [c.id, from, to, today(), addDays(today(), c.invoice_days), c.currency, hours.toFixed(2), sub, gst, sub + gst]);
      for (const [k, l] of lines.entries()) {
        await db.query('insert into invoice_lines (invoice_id, shift_id, crew_id, vehicle_id, description, hours, rate_cents, amount_cents) values ($1,$2,$3,$4,$5,$6,$7,$8)',
          [inv.id, l.shift_id, l.crew_id, l.vehicle_id, `${l.ref} ${l.job} ${l.item}`, l.hours, l.rate_cents, amounts[k]]);
      }
      await log(db, actor, 'invoice', inv.ref, `${c.code} ${from} to ${to}: ${money(inv.total_cents, c.currency)}`);
      return { ref: inv.ref, client: c.code, lines: lines.length, hours: Number(hours.toFixed(2)), subtotal_cents: sub, gst_cents: gst, total_cents: sub + gst, currency: c.currency, due_on: inv.due_on };
    });
  },
  async 'invoice-sent'(db, args, f) {
    const actor = actorOf(f);
    const i = await invoice(db, args[0]);
    return tx(db, async () => {
      await db.query('update invoices set sent_on = $2 where id = $1', [i.id, f.on ? date(f.on, 'on') : today()]);
      await log(db, actor, 'invoice-sent', i.ref, 'recorded as sent');
      return { invoice: i.ref, sent_on: f.on || today() };
    });
  },
  async 'invoice-paid'(db, args, f) {
    const actor = actorOf(f);
    const i = await invoice(db, args[0]);
    return tx(db, async () => {
      await db.query('update invoices set paid_on = $2 where id = $1', [i.id, f.on ? date(f.on, 'on') : today()]);
      await log(db, actor, 'invoice-paid', i.ref, 'recorded as paid');
      return { invoice: i.ref, paid_on: f.on || today() };
    });
  },
  async set(db, args, f) {
    const actor = actorOf(f);
    const [key, value] = args;
    const known = (await db.query('select key from settings order by key')).map((r) => r.key);
    oneOf(key, known, 'setting');
    num(value, key, { min: 0, max: 1000 });
    return tx(db, async () => {
      await db.query('update settings set value = $2 where key = $1', [key, String(value)]);
      await log(db, actor, 'set', key, String(value));
      return db.query('select key, value, note from settings order by key');
    });
  },
  async log(db, args, f) {
    const actor = actorOf(f);
    if (!args[0]) throw Error('Name the job, shift, worker, vehicle or incident');
    need(f, 'note');
    return tx(db, async () => {
      await log(db, actor, 'note', String(args[0]).toUpperCase(), String(f.note).trim());
      return { ref: String(args[0]).toUpperCase(), note: f.note };
    });
  },
};

// ------------------------------------------------------------------ drafts (written to drafts/, never sent)

const drafts = {
  async 'draft-docket-chase'(db, args) {
    const c = await client(db, args[0]);
    const rows = await db.query(`select ref, job, to_char(starts_at, 'Dy DD Mon') as day, to_char(starts_at, 'HH24:MI') || '-' || to_char(ends_at, 'HH24:MI') as hours, crew_hours, docket, note
      from v_dockets where client_id = $1 and docket <> 'signed' order by starts_at`, [c.id]);
    if (!rows.length) throw Error(`${c.code} has no unsigned or disputed dockets`);
    const body = `To: ${c.contact_name || c.name}${c.contact_email ? ` <${c.contact_email}>` : ''}\nSubject: Dockets to sign for ${rows.length} shift${rows.length > 1 ? 's' : ''}\n\nHi ${(c.contact_name || '').split(' ')[0] || 'there'},\n\nThese shifts are finished and waiting on your sign-off so we can invoice them:\n\n${rows.map((r) => `- ${r.ref}, ${r.job}, ${r.day} ${r.hours}, ${r.crew_hours ?? 0} crew hours${r.docket === 'disputed' ? ` (you queried this one: ${r.note})` : ''}`).join('\n')}\n\nReply with the hours you agree and we will close them off.\n\nThanks,\n[YOUR NAME]\n`;
    return { draft: draftFile(`docket-chase-${c.code}-${today()}.md`, body), shifts: rows.length };
  },
  async 'draft-incident-report'(db, args) {
    const i = (await db.query('select * from v_incidents where id = $1', [(await incident(db, args[0])).id]))[0];
    const warn = i.notifiable && !i.regulator_notified_at ? '> WARNING: this is a notifiable event and the regulator HAS NOT been notified. Do that first.\n\n' : '';
    const body = `${warn}# Incident report ${i.ref}\n\n| | |\n|---|---|\n| Job | ${i.job} ${i.job_name} |\n| Client | ${i.client} |\n| When | ${String(i.occurred_at).slice(0, 16)} (job time) |\n| Type | ${i.kind}, ${i.severity} |\n| Worker | ${i.worker || 'not recorded'} |\n| Police event | ${i.police_event || 'none'} |\n| Injury | ${i.injury ? 'yes' : 'no'} |\n| Notifiable | ${i.notifiable ? `yes${i.regulator_ref ? `, regulator reference ${i.regulator_ref}` : ''}` : 'no'} |\n\n## What happened\n\n${i.summary}.\n\n${i.detail || ''}\n\n## What we have done\n\n[From the supervisor's notes. Do not invent actions.]\n`;
    return { draft: draftFile(`incident-${i.ref}.md`, body), regulator_warning: Boolean(warn) };
  },
  async 'draft-ticket-reminder'(db, args) {
    const w = await worker(db, args[0]);
    const t = (await db.query('select * from v_tickets where worker_id = $1 and expires_on is not null order by expires_on limit 1', [w.id]))[0];
    if (!t) throw Error(`${w.name} has no ticket with an expiry date`);
    const rule = t.region === 'NZ' ? 'Existing TTM warrants are recognised until they expire; after that you need the matching NZQA unit standard under the NZGTTM transition.'
      : t.region === 'QLD' ? 'Queensland traffic controller accreditation runs for 3 years and is renewed through an approved renewal course (TMR TCAS).'
      : `You need a current ${t.region} qualification to be rostered on ${t.region} jobs.`;
    const body = `To: ${w.name}${w.phone ? ` (${w.phone})` : ''}\n\nHi ${w.name.split(' ')[0]},\n\nYour ${t.region} ${t.kind.toUpperCase()} ticket ${t.number} ${t.days_left < 0 ? `expired on ${t.expires_on}` : `expires on ${t.expires_on}, ${t.days_left} days from now`}.${t.next_shift ? ` Your next shift in ${t.region} is ${String(t.next_shift).slice(0, 16)}.` : ''} We cannot roster you on that work without it.\n\n${rule}\n\nSend a photo of the new card when you have it and we will update your record.\n\nThanks,\n[YOUR NAME]\n`;
    return { draft: draftFile(`ticket-${w.code}.md`, body), expires_on: t.expires_on };
  },
  async 'weekly-review'(db) {
    const att = await reads.attention(db);
    const comp = await reads.compliance(db, [], {});
    const open = await reads['open-shifts'](db, [], { days: '7' });
    const dk = await reads.dockets(db, [], {});
    const unb = await db.query('select client, currency, round(sum(hours * rate_cents)) as cents from v_unbilled group by client, currency order by client');
    const lines = (rows, fn) => (rows.length ? rows.map(fn).join('\n') : '- none');
    const body = `# Weekly review, ${today()}\n\n## Cannot start or breaks the law\n\n${lines(att.filter((a) => /cannot start|against the law|regulator/.test(a.item)), (a) => `- ${a.item}: ${a.ref} ${a.detail}`)}\n\n## Compliance summary\n\n${lines(comp, (c) => `- ${c.severity}, ${c.kind}: ${c.count} (${c.example})`)}\n\n## Shifts short of crew this week\n\n${lines(open, (o) => `- ${o.ref} ${o.job} ${o.starts}: ${o.controllers_rostered} of ${o.controllers_needed} controllers${o.supervisor ? ', supervisor needed' : ''}`)}\n\n## Dockets not signed\n\n${lines(dk, (d) => `- ${d.ref} ${d.job} ${d.day}: ${d.docket}${d.note ? ` (${d.note})` : ''}`)}\n\n## Signed work not invoiced\n\n${lines(unb, (u) => `- ${u.client}: ${money(Number(u.cents), u.currency)}`)}\n`;
    return { draft: draftFile(`weekly-review-${today()}.md`, body), attention: att.length };
  },
};

// ------------------------------------------------------------------ import from Traffio report exports

// Traffio report exports (People, Person Skills, Vehicles, Job Sheets) are spreadsheets. Save each
// sheet as CSV. Headings vary with the report's columns, so each field accepts several names and
// --map=<file.json> adds your own: { "people": { "code": ["Staff No"] } }.
const MAPS = {
  people: { code: ['Employee ID', 'Employee Number', 'Person ID', 'Code'], name: ['Name', 'Full Name', 'Person'], first: ['First Name'], last: ['Last Name'],
    phone: ['Mobile', 'Phone', 'Mobile Number'], email: ['Email'], region: ['State', 'Region', 'Depot State'], employment: ['Employment Status', 'Employment Type'],
    classes: ['Licence Class', 'Driver Licence Class', 'Licence Classes'], licence_expires: ['Licence Expiry', 'Driver Licence Expiry'] },
  skills: { person: ['Employee ID', 'Person ID', 'Person', 'Name'], skill: ['Skill', 'Skill Name', 'Qualification'], number: ['Number', 'Card Number', 'Licence Number', 'Reference'],
    region: ['State', 'Region', 'Issuing State'], issued: ['Issue Date', 'Issued', 'Date Obtained'], expires: ['Expiry Date', 'Expiry', 'Expires'] },
  vehicles: { code: ['Vehicle ID', 'Fleet Number', 'Code', 'Name'], rego: ['Registration', 'Rego', 'Registration Number'], kind: ['Type', 'Vehicle Type', 'Category'],
    region: ['State', 'Region', 'Depot State'], rego_expires: ['Registration Expiry', 'Rego Expiry'], inspection_expires: ['Inspection Expiry', 'WOF Expiry', 'COF Expiry', 'Roadworthy Expiry'],
    service_due: ['Next Service', 'Service Due'] },
  jobs: { id: ['Booking ID', 'Job ID', 'Booking Number', 'Job Number'], client: ['Client', 'Client Name'], project: ['Project', 'Project Name', 'Job Name'], address: ['Address', 'Location', 'Site Address'],
    region: ['State', 'Region'], start: ['Start', 'Start Date Time', 'Booking Start', 'Date'], start_time: ['Start Time'], end: ['End', 'End Date Time', 'Booking End'], end_time: ['Finish Time', 'End Time'],
    status: ['Status', 'Booking Status'], people: ['People', 'Persons', 'Staff', 'Employees'], vehicles: ['Vehicles', 'Assets'] },
};
const SKILL_KIND = [[/stms|site traffic management supervisor/i, 'stms'], [/tmo|ttm worker|traffic management operative/i, 'tmo'], [/pwztmp|prepare.*plan|traffic management design|tmd\b/i, 'pwztmp'],
  [/itcp|implement|tmi\b|traffic management implement/i, 'itcp'], [/traffic control|stop.?slow|\btc\b/i, 'tc']];
const VEHICLE_KIND = [[/tma|attenuator/i, 'tma'], [/vms|message/i, 'vms-trailer'], [/arrow/i, 'arrow-board'], [/truck|tipper|rigid/i, 'truck'], [/ute|utility|4wd|light/i, 'ute']];

function mapper(kind, mapFile) {
  const base = MAPS[kind];
  if (!mapFile) return base;
  const extra = JSON.parse(readFileSync(mapFile, 'utf8'))[kind] || {};
  return Object.fromEntries(Object.keys(base).map((k) => [k, [...(extra[k] || []), ...base[k]]]));
}
// Traffio exports dates as 07/11/2026 (day first) or 2026-11-07; times as 7:00 or 07:00 AM.
function looseDate(v, label) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return date(`${m[1]}-${m[2]}-${m[3]}`, label);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, label);
  throw Error(`${label} "${s}" is not a date`);
}
function looseTime(v) {
  const m = String(v ?? '').trim().match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3]?.toLowerCase() === 'pm' && h < 12) h += 12;
  if (m[3]?.toLowerCase() === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}
function looseStamp(dv, tv, label) {
  const d = looseDate(dv, label);
  const t = looseTime(tv) || looseTime(String(dv).replace(/^\S+\s*/, ''));
  if (!d || !t) throw Error(`${label} needs a date and a time`);
  return `${d} ${t}:00`;
}

async function importTraffio(db, args, f) {
  const actor = actorOf(f);
  if (args[0] !== 'traffio') throw Error('Usage: import traffio <file.csv> --kind=people|skills|vehicles|jobs');
  if (!args[1]) throw Error('Name the CSV file');
  const kind = oneOf(f.kind, Object.keys(MAPS), 'kind');
  const m = mapper(kind, f.map);
  const rows = parseCsv(readFileSync(args[1], 'utf8'));
  const get = (r, k) => String(pick(r, ...m[k]) ?? '').trim();
  const dry = Boolean(f['dry-run']);
  let added = 0;
  let skipped = 0;
  await db.exec('begin');
  try {
    for (const [i, r] of rows.entries()) {
      const at = `row ${i + 2}`;
      try {
        if (kind === 'people') {
          const code = get(r, 'code');
          const name = get(r, 'name') || [get(r, 'first'), get(r, 'last')].filter(Boolean).join(' ');
          if (!code || !name) throw Error('needs an employee ID and a name');
          const region = (get(r, 'region') || f.region || '').toUpperCase();
          if (!REGIONS.includes(region)) throw Error(`state "${region}" is not one of ${REGIONS.join(', ')} (pass --region)`);
          const emp = /sub/i.test(get(r, 'employment')) ? 'subcontractor' : /casual/i.test(get(r, 'employment')) ? 'casual' : 'employee';
          const res = await db.query(`insert into workers (code, name, phone, email, home_region, employment, licence_classes, licence_expires, external_id)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing returning id`, [code.toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 12), name, get(r, 'phone') || null,
            get(r, 'email') || null, region, emp, get(r, 'classes').toUpperCase().replace(/\s/g, ''), looseDate(get(r, 'licence_expires'), 'licence expiry'), `traffio:${code}`]);
          res.length ? added++ : skipped++;
        } else if (kind === 'skills') {
          const person = get(r, 'person');
          const [w] = await db.query(`select id, home_region from workers where external_id = $1 or upper(code) = upper($2) or lower(name) = lower($2)`, [`traffio:${person}`, person]);
          if (!w) throw Error(`person "${person}" not found (import people first)`);
          const kindOf = SKILL_KIND.find(([re]) => re.test(get(r, 'skill')))?.[1];
          if (!kindOf) { skipped++; continue; }
          const region = (get(r, 'region') || (['tmo', 'stms'].includes(kindOf) ? 'NZ' : w.home_region)).toUpperCase();
          const res = await db.query(`insert into tickets (worker_id, region, kind, number, issued_on, expires_on) values ($1,$2,$3,$4,$5,$6) on conflict do nothing returning id`,
            [w.id, region, kindOf, get(r, 'number') || `${person}-${kindOf}`, looseDate(get(r, 'issued'), 'issue date') || today(), looseDate(get(r, 'expires'), 'expiry')]);
          res.length ? added++ : skipped++;
        } else if (kind === 'vehicles') {
          const code = get(r, 'code');
          const kindOf = VEHICLE_KIND.find(([re]) => re.test(get(r, 'kind')))?.[1] || 'ute';
          const region = (get(r, 'region') || f.region || '').toUpperCase();
          if (!REGIONS.includes(region)) throw Error(`state "${region}" is not one of ${REGIONS.join(', ')} (pass --region)`);
          const rego = looseDate(get(r, 'rego_expires'), 'registration expiry');
          if (!code || !get(r, 'rego') || !rego) throw Error('needs a vehicle ID, registration and registration expiry');
          const res = await db.query(`insert into vehicles (code, rego, kind, region, rego_expires, inspection_expires, service_due_on, external_id)
            values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing returning id`, [code.toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 12), get(r, 'rego').toUpperCase(),
            kindOf, region, rego, looseDate(get(r, 'inspection_expires'), 'inspection expiry'), looseDate(get(r, 'service_due'), 'service due'), `traffio:${code}`]);
          res.length ? added++ : skipped++;
        } else {
          const id = get(r, 'id');
          if (!id) throw Error('needs a booking ID');
          if (/cancel/i.test(get(r, 'status'))) { skipped++; continue; }
          const c = await client(db, get(r, 'client') || f.client);
          const region = (get(r, 'region') || f.region || (c.country === 'NZ' ? 'NZ' : '')).toUpperCase();
          if (!REGIONS.includes(region)) throw Error(`state "${region}" is not one of ${REGIONS.join(', ')} (pass --region)`);
          const project = get(r, 'project') || get(r, 'address') || `Booking ${id}`;
          let [j] = await db.query('select id from jobs where client_id = $1 and lower(name) = lower($2)', [c.id, project]);
          if (!j) {
            const [{ n }] = await db.query(`select coalesce(max(substring(ref from 3)::int), 2000) + 1 as n from jobs`);
            [j] = await db.query(`insert into jobs (ref, client_id, name, address, region, external_id) values ($1,$2,$3,$4,$5,$6) returning id`,
              [`J-${n}`, c.id, project, get(r, 'address') || null, region, `traffio:job:${c.code}:${project.toLowerCase()}`]);
          }
          const start = looseStamp(get(r, 'start'), get(r, 'start_time'), 'start');
          let end = looseStamp(get(r, 'end') || get(r, 'start'), get(r, 'end_time') || get(r, 'end'), 'end');
          if (end <= start) end = `${addDays(start.slice(0, 10), 1)} ${end.slice(11)}`;
          const res = await db.query(`insert into shifts (job_id, starts_at, ends_at, external_id) values ($1,$2,$3,$4) on conflict do nothing returning id`, [j.id, start, end, `traffio:${id}`]);
          if (!res.length) { skipped++; continue; }
          added++;
          for (const p of get(r, 'people').split(/[;|]/).map((x) => x.trim()).filter(Boolean)) {
            const [w] = await db.query('select id from workers where lower(name) = lower($1) or upper(code) = upper($1) or external_id = $2', [p.replace(/\s*\(.*\)$/, ''), `traffio:${p}`]);
            if (!w) throw Error(`person "${p}" not found (import people first)`);
            const role = /supervisor|stms|itcp|tmi/i.test(p) ? 'supervisor' : 'tc';
            await db.query('insert into crew (shift_id, worker_id, role) values ($1,$2,$3) on conflict do nothing', [res[0].id, w.id, role]);
          }
          for (const v of get(r, 'vehicles').split(/[;|]/).map((x) => x.trim()).filter(Boolean)) {
            const [veh] = await db.query('select id from vehicles where upper(code) = upper($1) or upper(rego) = upper($1) or external_id = $2', [v, `traffio:${v}`]);
            if (!veh) throw Error(`vehicle "${v}" not found (import vehicles first)`);
            await db.query('insert into shift_vehicles (shift_id, vehicle_id) values ($1,$2) on conflict do nothing', [res[0].id, veh.id]);
          }
        }
      } catch (e) {
        throw Error(`${at}: ${e.message}. Nothing was imported.`);
      }
    }
    if (!dry) await log(db, actor, 'import', `traffio:${kind}`, `${added} added, ${skipped} skipped from ${path.basename(args[1])}`);
    await db.exec(dry ? 'rollback' : 'commit');
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
  return { kind, rows: rows.length, added, skipped, dry_run: dry };
}

async function exportAll(db, args, f) {
  const tables = ['settings', 'role_tickets', 'clients', 'rates', 'workers', 'tickets', 'vehicles', 'jobs', 'plans', 'permits', 'shifts', 'crew', 'shift_vehicles',
    'prestarts', 'dockets', 'incidents', 'invoices', 'invoice_lines', 'activity'];
  const out = {};
  for (const t of tables) out[t] = await db.query(`select * from ${t}`);
  const file = f.out || path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'exports', `traffic-${today()}.json`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out, null, 2));
  return { file, rows: Object.fromEntries(tables.map((t) => [t, out[t].length])) };
}

const all = { ...reads, ...writes, ...drafts, import: importTraffio, export: exportAll };
export const commands = Object.keys(all).sort();

export async function run(db, command, args = [], flags = {}) {
  const fn = all[command];
  if (!fn) throw Error(`Unknown command "${command}". Commands: ${commands.join(', ')}`);
  return fn(db, args, flags);
}
