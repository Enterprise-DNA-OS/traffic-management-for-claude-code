#!/usr/bin/env node
// npm run demo: a temporary database with the fictional traffic management company, three real command runs, then cleaned up.
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';

const temp = mkdtempSync(path.join(os.tmpdir(), 'traffic-demo-'));
process.env.DATA_DIR = path.join(temp, 'db');
process.env.DATABASE_URL = '';
process.env.OUTPUT_DIR = path.join(temp, 'out');
try {
  const db = await getDb();
  let open;
  try {
    await migrate(db);
    await seed(db);
    // The first Kawau Street shift: booked, no controllers yet.
    [{ ref: open }] = await db.query(`select s.ref from shifts s join jobs j on j.id = s.job_id where j.ref = 'J-2042' order by s.starts_at limit 1`);
  } finally { await db.close(); }
  for (const cmd of [['attention'], ['compliance'], ['cover', open]]) {
    console.log(`\n> node scripts/traffic.mjs ${cmd.join(' ')}`);
    const r = spawnSync(process.execPath, ['scripts/traffic.mjs', ...cmd], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
    process.stdout.write(r.stdout);
    if (r.status !== 0) throw Error(r.stderr);
  }
  console.log('\nDemo PASS. Temporary fictional database removed.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
