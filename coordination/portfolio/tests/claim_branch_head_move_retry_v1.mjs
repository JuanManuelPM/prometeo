import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const wc = read('wc');
const fast = read('coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md');
const baseline = JSON.parse(read('coordination/efficiency/RATCHET_BASELINE_V1.json'));

const fail = msg => { throw new Error(msg); };
const need = (text, needle, where) => { if (!text.includes(needle)) fail(where + ': missing ' + needle); };

for (const [where,text] of [['wc',wc],['fast',fast]]) {
  need(text, 'BRANCH_HEAD_MOVED', where);
  need(text, 'CLAIM_TRANSPORT_UNSTABLE', where);
  need(text, 'CREATE_EXISTS', where);
}
need(wc, 'retry the same exact claim path and payload once', 'wc');
need(wc, 'does NOT consume an authority CREATE attempt', 'wc');
need(fast, 'same exact claim path and byte-identical payload once', 'fast');
need(fast, 'does not consume one of the 3 authority candidate attempts', 'fast');
if (wc.includes('CREATE_EXISTS/CAS_LOST')) fail('wc: legacy collision conflation remains');
if (fast.includes('After 2 `CREATE_EXISTS` / `CAS_LOST` outcomes')) fail('fast: legacy lane conflation remains');

const item = baseline.items.find(x => x.id === 'EFF025');
if (!item) fail('baseline: EFF025 missing');
if (item.required.explicit_ref_head_move_classification !== 'BRANCH_HEAD_MOVED') fail('baseline: classification drift');
if (item.required.same_exact_create_retry_max !== 1) fail('baseline: retry bound drift');
if (item.required.same_path_and_payload_required !== true) fail('baseline: same path/payload guard missing');
if (item.required.head_move_retry_consumes_authority_attempt !== false) fail('baseline: retry must not consume authority attempt');
if (item.required.head_move_counts_as_lane_collision !== false) fail('baseline: head move must not count as lane collision');
if (item.required.pre_read_before_retry_forbidden !== true) fail('baseline: pre-read guard missing');
if (item.required.create_exists_still_collision !== true) fail('baseline: CREATE_EXISTS collision semantics drift');
if (item.required.second_consecutive_head_move !== 'CLAIM_TRANSPORT_UNSTABLE') fail('baseline: unstable classification drift');
if (item.required.transport_unstable_stop_immediately !== true) fail('baseline: unstable stop guard missing');
if (item.required.max_real_authority_attempts !== 3) fail('baseline: authority attempt bound drift');

console.log('CLAIM_BRANCH_HEAD_MOVE_RETRY_PASS');
