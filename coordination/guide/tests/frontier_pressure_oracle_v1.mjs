import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(process.argv[2] || join(here, 'frontier_pressure_oracle_v1.json'));
const actualPath = process.argv[3] ? resolve(process.argv[3]) : null;
const oracle = JSON.parse(await readFile(fixturePath, 'utf8'));

const clamp = (min, value, max) => Math.max(min, Math.min(value, max));
const errors = [];

for (const scenario of oracle.scenarios || []) {
  const ids = new Set((scenario.input?.recent_beacons || []).map(x => x.worker_id));
  const target = clamp(8, Math.ceil(1.5 * ids.size), 40);
  if (scenario.expected?.distinct_recent_launches !== ids.size) {
    errors.push(`${scenario.id}: distinct_recent_launches fixture mismatch`);
  }
  if (scenario.expected?.target_claimable !== target) {
    errors.push(`${scenario.id}: target_claimable fixture mismatch; expected static=${scenario.expected?.target_claimable} formula=${target}`);
  }
}

if (actualPath) {
  const actual = JSON.parse(await readFile(actualPath, 'utf8'));
  const actualById = new Map((actual.scenarios || []).map(x => [x.id, x.output || x.expected || x]));
  for (const scenario of oracle.scenarios || []) {
    const got = actualById.get(scenario.id);
    if (!got) {
      errors.push(`${scenario.id}: missing from actual snapshot`);
      continue;
    }
    const expected = scenario.expected;
    for (const key of ['distinct_recent_launches','target_claimable','effective_live_owners','claimable_useful_work','replaceable_count']) {
      if (got[key] !== expected[key]) errors.push(`${scenario.id}: ${key} expected ${expected[key]} got ${got[key]}`);
    }
    for (const [trigger, value] of Object.entries(expected.triggers || {})) {
      if (got.triggers?.[trigger] !== value) errors.push(`${scenario.id}: trigger ${trigger} expected ${value} got ${got.triggers?.[trigger]}`);
    }
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, fixture: fixturePath, actual: actualPath, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  fixture: fixturePath,
  scenarios: oracle.scenarios.length,
  mode: actualPath ? 'oracle-vs-actual' : 'oracle-self-check'
}, null, 2));
