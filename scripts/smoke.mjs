#!/usr/bin/env node
// npm test: a temporary database, the demo company, every command exercised, then cleaned up.
// Set TEST_DATABASE_URL to run the same checks against an empty Postgres database instead of PGlite.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, reads, commands, QUESTIONS, cents, stamp, date, clock } from './lib/domain.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'traffic-test-'));
process.env.DATA_DIR = path.join(root, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = path.join(root, 'out');

let db;
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const fails = async (fn, re, msg) => { await assert.rejects(fn, re, msg); checks++; };
const call = (cmd, args = [], f = {}) => run(db, cmd, args, f);
const A = { actor: 'Test' };
const one = async (sql, p = []) => (await db.query(sql, p))[0];
// A wall-clock date at a region, n days from that region's today.
const day = async (region, n) => (await one(`select (region_now($1)::date + $2::int)::text as d`, [region, n])).d;
const firstShift = async (job, extra = '') => (await one(`select s.ref from shifts s join jobs j on j.id = s.job_id where j.ref = $1 ${extra} order by s.starts_at limit 1`, [job])).ref;

try {
  db = await getDb();
  await migrate(db);
  eq((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  const shiftsOnce = (await one('select count(*)::int as n from shifts')).n;
  await seed(db);
  eq((await one('select count(*)::int as n from shifts')).n, shiftsOnce, 'seed is idempotent (shifts)');
  eq((await one('select count(*)::int as n from workers')).n, 14, 'seed is idempotent (workers)');
  eq((await one('select count(*)::int as n from activity')).n, 3, 'seed activity written once');
  eq((await one('select count(*)::int as n from invoice_lines')).n > 0, true, 'seed invoice has lines');
  ok(shiftsOnce > 40, 'a month of shifts');

  const kawau = await firstShift('J-2042');
  const teRapa = await firstShift('J-2041', `and s.starts_at > region_now('NZ')`);
  const church = await firstShift('J-2051', `and s.starts_at > region_now('NSW')`);

  // Every read runs.
  for (const cmd of Object.keys(reads)) {
    const a = { cover: [kawau], check: [teRapa], worker: ['Jack'], job: ['J-2051'], incident: ['INC-12'] }[cmd] || [];
    ok(await call(cmd, a, {}), `read ${cmd}`);
  }
  eq(QUESTIONS.length, 10, 'ten questions');
  const ins = await call('insights');
  eq(ins.length, 10);
  ok(ins.every((q) => Array.isArray(q.rows)), 'every question returns rows');
  ok(ins[1].rows.length > 0 && ins[2].rows.some((r) => r.worker === 'Jack Wilson'), 'questions find the demo problems');

  // Parsing is strict.
  eq(cents('62.50', 'x'), 6250);
  eq(cents('$1,200', 'x'), 120000);
  assert.throws(() => cents('12.345', 'x'), /amount/); checks++;
  assert.throws(() => cents('0', 'x'), /more than zero/); checks++;
  eq(stamp('2026-11-09 6:05', 'x'), '2026-11-09 06:05:00');
  eq(stamp('2026-11-09T20:00', 'x'), '2026-11-09 20:00:00');
  eq(clock('5:30', 'x'), '05:30');
  assert.throws(() => stamp('2026-11-09 25:00', 'x'), /impossible/); checks++;
  assert.throws(() => stamp('09/11/2026', 'x'), /date and time/); checks++;
  assert.throws(() => date('2026-02-30', 'x'), /date/); checks++;
  assert.throws(() => clock('24:00', 'x'), /time/); checks++;

  // Time zones and the permit window.
  const z = await one(`select region_zone('NZ') as nz, region_zone('QLD') as qld, region_zone('XX') as bad, region_country('NSW') as au, region_country('NZ') as nzc,
    window_fits('2026-11-09 21:00', '2026-11-10 04:30', '20:00', '05:00') as night_in, window_fits('2026-11-09 19:00', '2026-11-10 04:00', '20:00', '05:00') as early,
    window_fits('2026-11-10 01:00', '2026-11-10 06:00', '20:00', '05:00') as late, window_fits('2026-11-09 09:00', '2026-11-09 15:00', '09:00', '15:00') as day_exact,
    window_fits('2026-11-09 09:00', '2026-11-09 15:00', null, null) as no_window`);
  eq(z.nz, 'Pacific/Auckland'); eq(z.qld, 'Australia/Brisbane'); eq(z.bad, null); eq(z.au, 'AU'); eq(z.nzc, 'NZ');
  eq(z.night_in, true, 'overnight window holds a night shift'); eq(z.early, false, 'a 7 pm start is outside 8 pm to 5 am');
  eq(z.late, false, 'a 6 am finish is outside the window'); eq(z.day_exact, true); eq(z.no_window, true);

  // The demo company says what it should.
  const attention = await call('attention');
  const has = (item, re) => attention.some((r) => r.item === item && (!re || re.test(`${r.ref} ${r.detail}`)));
  ok(has('rostered against the law', /Jack Wilson/), 'expired NZ ticket still rostered');
  ok(has('rostered against the law', /Daniel Okafor/), 'Queensland ticket on a NSW job');
  ok(has('cannot start: permit', /outside the permitted hours/), 'early start outside the ROL window');
  ok(has('cannot start: permit', /J-2051: no approved permit/), 'nights booked past the ROL');
  ok(has('cannot start: permit', /J-2062/), 'permit applied for, not approved');
  ok(has('cannot start: plan', /J-2042/), 'plan submitted, not approved');
  ok(has('short of crew', /J-2042/), 'no controllers on Kawau Street');
  ok(has('vehicle not fit to go', /class 2/), 'driver without the class');
  ok(has('vehicle not fit to go', /inspection/), 'TMA past its CoF');
  ok(has('failed prestart, booked again', /V-12/), 'failed prestart');
  ok(has('regulator not notified', /INC-12/), 'notifiable injury not reported');
  ok(has('client not told', /INC-13/), 'client not told within the window');
  ok(has('ticket expired', /W-103/), 'expired ticket');
  ok(has('ticket expires soon', /W-102/), 'ticket expiring soon');
  ok(has('house rule broken', /rest/), 'rest between shifts');
  ok(has('docket not signed'), 'unsigned docket');
  ok(has('docket disputed'), 'disputed docket');
  ok(has('invoice overdue', /INV-1001/), 'overdue invoice');
  ok(has('permit or plan ends soon', /ROL-2614402/), 'ROL ends with shifts after it');
  ok(has('vehicle papers due', /V-22/), 'registration due');

  // Compliance cites its rules, law first.
  const comp = await call('compliance');
  eq(comp[0].kind, 'law', 'law first');
  ok(comp.some((c) => /SafeWork NSW/.test(c.rule)) && comp.some((c) => /NZGTTM/.test(c.rule)) && comp.some((c) => /s 38/.test(c.rule)), 'rules cited');

  // Cover ranks and changes nothing.
  const crewBefore = (await one('select count(*)::int as n from crew')).n;
  const cover = await call('cover', [kawau]);
  eq(cover[0].worker, 'Tama Rewi', 'the free, ticketed controller first');
  eq(cover[0].verdict, 'can cover');
  ok(cover.find((c) => c.worker === 'Kate Morris').verdict === 'cannot', 'a ticket ending before the shift cannot cover');
  ok(cover.find((c) => c.worker === 'Sione Fifita').why.includes('also on'), 'double booking spotted');
  ok(!cover.some((c) => c.worker === 'Tom Reilly'), 'other country left out by default');
  ok((await call('cover', [kawau], { anywhere: true })).some((c) => c.worker === 'Tom Reilly'), '--anywhere includes everyone');
  eq((await one('select count(*)::int as n from crew')).n, crewBefore, 'cover changes nothing');
  const chk = await call('check', [kawau], { worker: 'Kate', role: 'tc' });
  ok(chk.some((c) => c.kind === 'law'), 'check with a worker probes');
  eq((await one('select count(*)::int as n from crew')).n, crewBefore, 'check changes nothing');

  // Fill: the law refuses, a house rule needs a reason.
  await fails(async () => call('fill', [kawau], { ...A, worker: 'Kate Morris' }), /Refused: Kate Morris.*no current traffic controller ticket/);
  await fails(async () => call('fill', [kawau], { ...A, worker: 'Sione' }), /Refused.*also on/);
  await fails(async () => call('fill', [kawau], { ...A, worker: 'Tom Reilly' }), /no current traffic controller ticket for NZ/);
  eq((await one('select count(*)::int as n from crew')).n, crewBefore, 'refused fills leave nothing behind');
  const filled = await call('fill', [kawau], { ...A, worker: 'Tama' });
  eq(filled.role, 'tc');
  ok(filled.still_open.some((p) => /plan/.test(p)), 'fill reports what is still open');
  await call('set', ['max_shift_hours', '5'], A);
  await fails(async () => call('fill', [kawau], { ...A, worker: 'W-107' }), /Refused/);
  await call('add-ticket', ['Kate'], { ...A, region: 'NZ', kind: 'tmo', number: 'TMO-70001', issued: await day('NZ', 0), expires: await day('NZ', 1000) });
  await fails(async () => call('fill', [kawau], { ...A, worker: 'W-107' }), /max_shift_hours|over 5.*override/);
  const ov = await call('fill', [kawau], { ...A, worker: 'W-107', override: 'Client approved a long day in writing' });
  eq(ov.override, 'Client approved a long day in writing');
  ok((await one(`select count(*)::int as n from activity where action = 'fill' and detail like '%override%'`)).n === 1, 'override logged');
  await call('set', ['max_shift_hours', '12'], A);
  await fails(async () => call('set', ['nonsense', '1'], A), /--setting/);

  // Tickets: NZ and AU kinds, Queensland's 3 years, an expiry is required unless the card has none.
  await fails(async () => call('add-ticket', ['Tama'], { ...A, region: 'NZ', kind: 'tc', number: 'X', issued: '2026-01-01', expires: '2027-01-01' }), /New Zealand tickets/);
  await fails(async () => call('add-ticket', ['Tama'], { ...A, region: 'NSW', kind: 'tc', number: 'X', issued: '2026-01-01' }), /--expires is required/);
  const nsw = await call('add-ticket', ['Tama'], { ...A, region: 'NSW', kind: 'tc', number: 'TCWTC-9', issued: '2026-01-01', 'no-expiry': true });
  eq(nsw.expires_on, null, 'a SafeWork NSW card with no expiry');
  const qld = await call('add-ticket', ['Tama'], { ...A, region: 'QLD', kind: 'tc', number: 'TC-QLD-9', issued: '2026-01-01' });
  eq(qld.expires_on, '2028-12-31', 'QLD accreditation defaults to 3 years');
  await fails(async () => db.query(`insert into tickets (worker_id, region, kind, number, issued_on, expires_on) select id, 'QLD', 'tc', 'LONG', '2026-01-01', '2030-01-01' from workers limit 1`), /check|violates/i);

  // Plans and permits: approval needs dates; approving clears the problem.
  const kawauPlan = await call('plan-status', ['TMP-FBN-0077'], { ...A, status: 'approved', by: 'Council TTM engineer' });
  eq(kawauPlan.status, 'approved');
  ok(!(await call('check', [kawau])).some((p) => p.kind === 'plan'), 'approved plan clears the problem');
  await fails(async () => call('permit-status', ['RCP-26-1044'], { ...A, status: 'approved' }), /--from and --to/);
  const lime = await firstShift('J-2062');
  ok((await call('check', [lime])).some((p) => p.kind === 'permit'), 'permit applied for is not enough');
  await call('permit-status', ['RCP-26-1044'], { ...A, status: 'approved', from: await day('QLD', 0), to: await day('QLD', 30) });
  ok(!(await call('check', [lime])).some((p) => p.kind === 'permit'), 'approved permit, no window, clears it');
  const extra = await call('add-permit', ['J-2051'], { ...A, kind: 'rol', reference: 'ROL-2614999', from: await day('NSW', 4), to: await day('NSW', 10), 'window-start': '20:00', 'window-end': '05:00' });
  eq(extra.status, 'applied');
  await fails(async () => call('add-permit', ['J-2051'], { ...A, kind: 'rol', reference: 'R', 'window-start': '20:00' }), /both/);
  const lateNight = await firstShift('J-2051', `and s.starts_at::date > (select valid_to from permits where reference = 'ROL-2614402')`);
  ok((await call('check', [lateNight])).some((p) => p.kind === 'permit'), 'night past the ROL end');
  await call('permit-status', ['ROL-2614999'], { ...A, status: 'approved' });
  ok(!(await call('check', [lateNight])).some((p) => p.kind === 'permit'), 'extension clears it');

  // Jobs and shifts.
  await fails(async () => call('add-job', [], { ...A, ref: 'J-3000', client: 'WRC', name: 'X', region: 'QLD' }), /NZ client/);
  const nj = await call('add-job', [], { ...A, ref: 'J-3000', client: 'BCW', name: 'Warrego Highway shoulder', region: 'QLD', 'no-permit': true });
  eq(nj.permit_required, false);
  await call('add-plan', ['J-3000'], { ...A, ref: 'TGS-BCW-0400', kind: 'tgs', controllers: '1' });
  await fails(async () => call('plan-status', ['TGS-BCW-0400'], { ...A, status: 'approved', by: 'Leanne Ross' }), /dates/);
  await call('plan-status', ['TGS-BCW-0400'], { ...A, status: 'approved', by: 'Leanne Ross', from: await day('QLD', 0), to: await day('QLD', 20) });
  const d3 = await day('QLD', 10);
  const added = await call('add-shift', ['J-3000'], { ...A, start: `${d3} 22:00`, end: '06:00', repeat: '2', controllers: '1', 'no-supervisor': true });
  eq(added.length, 2);
  eq(added[0].ends_at.slice(0, 10), await day('QLD', 11), 'an end before the start runs past midnight');
  ok(/^S-3\d{3}$/.test(added[0].ref), 'new shifts take the next reference');
  await call('fill', [added[0].ref], { ...A, worker: 'Hamish Grant' });
  eq((await call('check', [added[0].ref])).length, 0, 'a fully legal shift has no problems');
  await call('unassign', [added[0].ref], { ...A, worker: 'Hamish', reason: 'Swapped with day shift' });
  ok((await call('check', [added[0].ref])).some((p) => p.kind === 'crew'), 'unassign reopens it');
  await fails(async () => call('cancel', [added[1].ref], A), /--reason/);
  await call('cancel', [added[1].ref], { ...A, reason: 'Client postponed' });
  eq((await one('select status from shifts where ref = $1', [added[1].ref])).status, 'cancelled');

  // Vehicles: assign refuses an unfit vehicle; prestart and sign-on.
  await fails(async () => call('assign-vehicle', [added[0].ref], { ...A, vehicle: 'V-02' }), /inspection|Refused/);
  await call('vehicle-dates', ['V-02'], { ...A, 'inspection-expires': await day('NZ', 180) });
  ok(!(await call('attention')).some((r) => r.item === 'vehicle not fit to go' && /inspection/.test(r.detail)), 'new CoF date clears the inspection problem');
  await call('add-vehicle', [], { ...A, code: 'V-31', rego: 'TM31ZZ', kind: 'ute', region: 'QLD', class: 'C', 'rego-expires': await day('QLD', 200) });
  await call('fill', [added[0].ref], { ...A, worker: 'Hamish Grant' });
  await call('assign-vehicle', [added[0].ref], { ...A, vehicle: 'V-31', driver: 'Hamish' });
  const qStart = `${d3} 22:00`;
  await fails(async () => call('sign-on', [added[0].ref], { ...A, worker: 'Hamish', at: qStart }), /prestart/);
  await call('prestart', ['V-31'], { ...A, result: 'pass', worker: 'Hamish', at: `${d3} 21:40` });
  await fails(async () => call('prestart', ['V-31'], { ...A, result: 'fail' }), /--defects/);
  const on = await call('sign-on', [added[0].ref], { ...A, worker: 'Hamish', at: qStart });
  eq(on.signed_on_at, `${d3} 22:00:00`);
  await fails(async () => call('sign-on', [teRapa], { ...A, worker: 'Jack Wilson' }), /Refused.*no current traffic controller ticket/);
  await fails(async () => call('sign-on', [kawau], { ...A, worker: 'Mere Tane' }), /not on/);
  await fails(async () => call('sign-off', [added[0].ref], { ...A, worker: 'Hamish', at: `${d3} 21:00` }), /after sign-on/);
  const offd = await call('sign-off', [added[0].ref], { ...A, worker: 'Hamish', at: `${await day('QLD', 11)} 06:10`, break: '30' });
  eq(Number(offd.worked_hours), 7.67, 'worked hours less the break');
  await fails(async () => call('sign-docket', [added[0].ref], { ...A, by: 'Leanne Ross' }), /not finished/);

  // Dockets: unsigned holds the invoice back; signing releases it.
  const unsigned = (await call('dockets')).find((d) => d.docket === 'unsigned' && d.client === 'WRC');
  const beforeUnbilled = (await db.query(`select * from v_unbilled where client = 'WRC'`)).length;
  await call('sign-docket', [unsigned.ref], { ...A, by: 'Hemi Walker', reference: 'WRC-D-551' });
  ok((await db.query(`select * from v_unbilled where client = 'WRC'`)).length > beforeUnbilled, 'a signed docket becomes billable');
  const disputed = (await call('dockets')).find((d) => d.docket === 'disputed');
  ok(!(await db.query('select 1 from v_unbilled where ref = $1', [disputed.ref])).length, 'a disputed docket is not billed');
  await call('dispute-docket', [unsigned.ref], { ...A, note: 'Client queries the TMA hours' });
  ok(!(await db.query('select 1 from v_unbilled where ref = $1', [unsigned.ref])).length, 'disputing pulls it back');
  await call('sign-docket', [unsigned.ref], { ...A, by: 'Hemi Walker' });

  // Invoices: to the cent, GST by country, minimum hours, never twice.
  const pce = await call('invoice', ['PCE'], { ...A, from: await day('NSW', -30), to: await day('NSW', 0) });
  const expect = await one(`select round(sum(round(l.hours * l.rate_cents))) as s from invoice_lines l join invoices i on i.id = l.invoice_id where i.ref = $1`, [pce.ref]);
  eq(pce.subtotal_cents, Number(expect.s));
  eq(pce.gst_cents, Math.round(pce.subtotal_cents * 0.10), 'AU GST 10%');
  eq(pce.total_cents, pce.subtotal_cents + pce.gst_cents);
  await fails(async () => call('invoice', ['PCE'], { ...A, from: await day('NSW', -30), to: await day('NSW', 0) }), /Nothing signed and uninvoiced/);
  const wrc = await call('invoice', ['WRC'], { ...A, from: await day('NZ', -30), to: await day('NZ', 0) });
  eq(wrc.gst_cents, Math.round(wrc.subtotal_cents * 0.15), 'NZ GST 15%');
  const min = await one(`select min(l.hours)::float as h from invoice_lines l join invoices i on i.id = l.invoice_id where i.ref = $1`, [wrc.ref]);
  ok(min.h >= 4, 'no line under the client minimum');
  await call('invoice-sent', [wrc.ref], A);
  await call('invoice-paid', ['INV-1001'], A);
  ok(!(await call('attention')).some((r) => r.ref === 'INV-1001'), 'paid invoice drops off');
  await fails(async () => db.query(`insert into invoice_lines (invoice_id, shift_id, crew_id, description, hours, rate_cents, amount_cents) select invoice_id, shift_id, crew_id, 'dup', 1, 1, 1 from invoice_lines where crew_id is not null limit 1`), /duplicate|unique/i);
  await call('set-rate', ['FBN'], { ...A, item: 'tma', rate: '95', weekend: '120' });
  ok((await one(`select r.rate_cents from rates r join clients c on c.id = r.client_id where c.code = 'FBN' and r.item = 'tma'`)).rate_cents === 9500, 'rate set');

  // Incidents: notifiable events and the order things close in.
  const inc = await call('log-incident', ['J-2041'], { ...A, kind: 'injury', severity: 'high', summary: 'Controller fell over a cone base', injury: true, notifiable: true, worker: 'Sione' });
  ok(/WorkSafe/.test(inc.next), 'NZ notifiable points at WorkSafe');
  const auInc = await call('log-incident', ['J-2061'], { ...A, kind: 'near-miss', summary: 'Truck braked late at the taper' });
  eq(auInc.next, 'Tell the client');
  await fails(async () => call('close-incident', [inc.ref], { ...A, outcome: 'x' }), /regulator/);
  await fails(async () => call('notify-regulator', [auInc.ref], { ...A, reference: 'x' }), /not marked notifiable/);
  await call('notify-regulator', [inc.ref], { ...A, reference: 'WS-445120' });
  await fails(async () => call('close-incident', [inc.ref], { ...A, outcome: 'x' }), /client/);
  await call('notify-client', [inc.ref], A);
  eq((await call('close-incident', [inc.ref], { ...A, outcome: 'Cone bases swapped for low-profile ones' })).incident, inc.ref);
  ok((await call('incident', [inc.ref])).activity.length >= 4, 'incident history');

  // Workers, clients, settings and notes.
  const wk = await call('add-worker', [], { ...A, code: 'W-401', name: 'Ella Park', region: 'WA', classes: 'c, mr', pay: '41' });
  eq(wk.licence_classes, 'C,MR');
  const st = await call('worker-status', ['Jack'], { ...A, status: 'stood-down', reason: 'Ticket expired' });
  ok(st.shifts_to_cover.length > 0, 'standing down lists the shifts to cover');
  ok((await call('check', [teRapa])).some((p) => /stood-down/.test(p.problem)), 'a stood-down worker is flagged');
  await call('add-client', [], { ...A, code: 'ZZC', name: 'Zed Civil', country: 'AU', 'min-hours': '3' });
  await fails(async () => call('add-client', [], { ...A, code: 'ZZD', name: 'Zed', country: 'UK' }), /--country/);
  await call('job-status', ['J-3000'], { ...A, status: 'cancelled', reason: 'Client lost the contract' });
  eq((await one(`select count(*)::int as n from shifts s join jobs j on j.id = s.job_id where j.ref = 'J-3000' and s.status = 'planned' and s.starts_at > region_now('QLD')`)).n, 0, 'cancelling a job cancels its future shifts');

  // Drafts land in drafts/ and send nothing.
  for (const [cmd, a] of [['draft-docket-chase', ['PCE']], ['draft-incident-report', ['INC-12']], ['draft-ticket-reminder', ['Sione']], ['weekly-review', []]]) {
    const r = await call(cmd, a, {});
    ok(r.draft && existsSync(path.join(process.env.OUTPUT_DIR, r.draft)), `${cmd} wrote ${r.draft}`);
  }
  ok(/HAS NOT been notified/.test(readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', 'incident-INC-12.md'), 'utf8')), 'incident draft warns');
  ok(/NZGTTM/.test(readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', 'ticket-W-102.md'), 'utf8')), 'NZ reminder cites the transition');
  ok(/03:00/.test(readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', `docket-chase-PCE-${new Date().toISOString().slice(0, 10)}.md`), 'utf8')), 'docket chase names the dispute');

  // Import from Traffio report exports: dry run, atomic, repeat rows skipped.
  const ex = path.join(REPO_ROOT, 'examples', 'traffio');
  const dry = await call('import', ['traffio', path.join(ex, 'people.csv')], { ...A, kind: 'people', 'dry-run': true });
  ok(dry.dry_run && dry.added === 3, 'dry run counts');
  eq((await one(`select count(*)::int as n from workers where external_id like 'traffio:%'`)).n, 0, 'dry run keeps nothing');
  eq((await call('import', ['traffio', path.join(ex, 'people.csv')], { ...A, kind: 'people' })).added, 3);
  const sk = await call('import', ['traffio', path.join(ex, 'skills.csv')], { ...A, kind: 'skills' });
  eq(sk.added, 4, 'four tickets; first aid skipped'); eq(sk.skipped, 1);
  eq((await one(`select kind from tickets where number = 'TMI-QLD-120771'`)).kind, 'itcp', 'TMI maps to itcp');
  eq((await call('import', ['traffio', path.join(ex, 'vehicles.csv')], { ...A, kind: 'vehicles' })).added, 2);
  eq((await one(`select kind from vehicles where code = 'TMA-32'`)).kind, 'tma');
  const jb = await call('import', ['traffio', path.join(ex, 'job-sheets.csv')], { ...A, kind: 'jobs' });
  eq(jb.added, 2, 'two bookings; the cancelled one skipped');
  eq((await one(`select role from crew x join workers w on w.id = x.worker_id join shifts s on s.id = x.shift_id where s.external_id = 'traffio:B-90011' and w.name = 'Ruby Hale'`)).role, 'supervisor');
  eq((await one(`select ends_at from shifts where external_id = 'traffio:B-90012'`)).ends_at, '2026-11-17 14:30:00', '2:30 PM read as 14:30');
  eq((await call('import', ['traffio', path.join(ex, 'job-sheets.csv')], { ...A, kind: 'jobs' })).skipped, 3, 'a second import skips repeats');
  const bad = path.join(root, 'bad.csv');
  writeFileSync(bad, 'Booking ID,Client,Project,State,Start,Start Time,Finish Time,People\nX1,Bremer Civil Works,Test,QLD,20/11/2026,7:00,15:00,\nX2,Bremer Civil Works,Test,QLD,20/11/2026,7:00,15:00,Nobody Here\n');
  const before = (await one('select count(*)::int as n from shifts')).n;
  await fails(async () => call('import', ['traffio', bad], { ...A, kind: 'jobs' }), /row 3: person "Nobody Here" not found.*Nothing was imported/);
  eq((await one('select count(*)::int as n from shifts')).n, before, 'a bad row stops the whole file');
  await fails(async () => call('import', ['traffio', bad], { ...A, kind: 'payroll' }), /--kind/);

  // Export, activity, and the log cannot be rewritten.
  const exp = await call('export', [], {});
  ok(existsSync(exp.file) && exp.rows.shifts > 0, 'export writes every table');
  ok((await call('activity', [], { days: '1' })).length > 20, 'activity log fills');
  await fails(async () => db.query('update activity set detail = $1', ['rewritten']), /append-only/);
  await fails(async () => db.query('delete from activity'), /append-only/);
  await fails(async () => call('log', [], { ...A, note: 'x' }), /Name the/);
  ok(await call('log', ['J-2041'], { ...A, note: 'Bus stop moved 20 m north' }), 'notes');

  // Database guards beyond the CLI.
  await fails(async () => db.query(`update shifts set ends_at = starts_at where ref = $1`, [kawau]), /check|violates/i);
  await fails(async () => db.query(`insert into tickets (worker_id, region, kind, number, issued_on) select id, 'NSW', 'stms', 'Z', current_date from workers limit 1`), /check|violates/i);
  await fails(async () => db.query(`insert into clients (code, name, country, currency) values ('ZZ', 'Z', 'NZ', 'AUD')`), /check|violates/i);
  await fails(async () => db.query(`update plans set status = 'approved', approved_by = null where ref = 'TMP-WRC-0412'`), /check|violates/i);
  await fails(async () => call('nonsense'), /Unknown command/);

  // The CLI shell, views and documents.
  const env = { ...process.env };
  const cli = (a) => spawnSync(process.execPath, ['scripts/traffic.mjs', ...a], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  const h = cli(['--help']);
  eq(h.status, 0); ok(h.stdout.includes('cover'), 'help lists commands');
  const j = cli(['tickets', '--json']);
  eq(j.status, 0); ok(Array.isArray(JSON.parse(j.stdout)), 'json output');
  const t = cli(['attention']);
  eq(t.status, 0); ok(t.stdout.includes('regulator not notified'), 'human output');
  const u = cli(['attention', '--bogus']);
  eq(u.status, 1); ok(u.stderr.includes('Unknown option'), 'unknown option refused');
  const v = spawnSync(process.execPath, ['scripts/view.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(v.status, 0, v.stderr);
  const views = JSON.parse(readFileSync(path.join(REPO_ROOT, 'views.json'), 'utf8'));
  for (const vw of views) ok(existsSync(path.join(process.env.OUTPUT_DIR, 'views', `${vw.name}.html`)), `view ${vw.name}`);
  const page = readFileSync(path.join(process.env.OUTPUT_DIR, 'views', 'week.html'), 'utf8');
  ok(!page.includes('TODO') && page.includes('Needs attention'), 'week view rendered');
  const d = spawnSync(process.execPath, ['scripts/docs.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(d.status, 0, d.stderr);
  const docs = JSON.parse(readFileSync(path.join(REPO_ROOT, 'documents.json'), 'utf8'));
  for (const doc of docs) ok(readdirSync(path.join(process.env.OUTPUT_DIR, 'docs-out', doc.name)).length > 0, `document ${doc.name}`);
  const { page: renderPage, table: renderTable } = await import('./lib/render.mjs');
  const html = renderPage({ title: 'T', subtitle: '<script>alert(1)</script>', sections: [{ title: 'S', html: renderTable([{ name: '<b>x</b>' }]) }] });
  ok(!html.includes('<script>alert') && html.includes('&lt;script&gt;') && html.includes('&lt;b&gt;'), 'HTML is escaped');

  // Every command has a recipe, and every recipe names a real command.
  const recipes = readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, ''));
  const special = ['customise', 'new-view', 'view', 'documents'];
  for (const c of commands) ok(recipes.includes(c), `/${c} has a recipe`);
  for (const r of recipes) ok(commands.includes(r) || special.includes(r), `/${r} drives a real command`);
  const claude = readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
  for (const r of recipes) ok(claude.includes(`/${r}\``), `CLAUDE.md routes /${r}`);
  ok(!claude.includes('TODO(author)') && !readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8').includes('TODO(author)'), 'no TODO(author) left');

  console.log(`PASS: ${checks} checks (${db.mode})`);
} finally {
  await db?.close();
  rmSync(root, { recursive: true, force: true });
}
