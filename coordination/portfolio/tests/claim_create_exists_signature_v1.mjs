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
  need(text, 'GITHUB_CONTENTS_CREATE_EXISTS_422_SHA_MISSING', where);
  need(text, '"sha" wasn\'t supplied', where);
  need(text, 'CREATE_EXISTS', where);
  need(text, 'CLAIM_TRANSPORT_AMBIGUOUS', where);
  need(text, 'arbitrary HTTP 422', where);
}

const item = baseline.items.find(x => x.id === 'EFF048');
if (!item) fail('baseline: EFF048 missing');
if (item.required?.exact_signature !== 'GITHUB_CONTENTS_CREATE_EXISTS_422_SHA_MISSING') fail('baseline: signature drift');
if (item.required?.http_status !== 422) fail('baseline: HTTP status drift');
if (item.required?.required_message_fragment !== '"sha" wasn\'t supplied') fail('baseline: message fragment drift');
if (item.required?.classification !== 'CREATE_EXISTS') fail('baseline: classification drift');
if (item.required?.claim_transport_ambiguous_for_exact_signature_forbidden !== true) fail('baseline: ambiguous transport guard missing');
if (item.required?.branch_head_moved_for_exact_signature_forbidden !== true) fail('baseline: branch movement guard missing');
if (item.required?.arbitrary_422_not_auto_collision !== true) fail('baseline: arbitrary 422 guard missing');
if (item.required?.pre_read_before_classification_forbidden !== true) fail('baseline: pre-read guard missing');
if (item.required?.authority_create_attempt_consumed !== true) fail('baseline: attempt accounting drift');

console.log('CLAIM_CREATE_EXISTS_SIGNATURE_PASS');
