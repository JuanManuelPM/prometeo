import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

const w=read('w');
const wc=read('wc');
const runtime=read('scripts/build-worker-runtime.mjs');
const policy=json('coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json');
const baseline=json('coordination/efficiency/RATCHET_BASELINE_V1.json');

for(const needle of [
  'BATCH <batch_id> EXPECTED <n>',
  'batch_id=<batch_id>',
  'expected_workers=<n>',
  'pool_id=null',
  'source=/w',
  'do NOT change batch_id/expected_workers/pool_id'
]) assert.ok(w.includes(needle),'stable /w missing '+needle);

assert.ok(wc.includes('If the HUMAN MESSAGE includes `BATCH <batch_id> EXPECTED <n>`'));
assert.ok(runtime.includes('missing_expected'));
assert.ok(runtime.includes('d.expected_workers'));
assert.ok(runtime.includes('d.batch_id'));

assert.equal(policy.launch_envelope.status,'ACTIVE_BINDING');
assert.equal(policy.launch_envelope.first_beacon_rule.includes('batch_id'),true);
assert.equal(policy.launch_envelope.refill_rule.includes('missing_expected'),true);
assert.equal(policy.launch_envelope.no_inference.includes('no durable beacon'),true);

const eff067=baseline.items.find(x=>x.id==='EFF067');
assert.ok(eff067,'EFF067 missing');
assert.equal(eff067.required.stable_surface,'/w');
assert.equal(eff067.required.identical_prompt_within_batch,true);
assert.equal(eff067.required.runtime_missing_expected,true);
assert.equal(eff067.required.exact_refill_only,true);
assert.equal(eff067.required.refill_reuses_same_batch_id,true);
assert.equal(eff067.required.no_cause_inference_for_missing_beacon,true);
assert.equal(eff067.required.rolling_pool_preserved,true);

console.log('WORKER_PRODUCTION_BATCH_ENVELOPE_V1_PASS');
