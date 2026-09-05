import fs from 'node:fs';
import crypto from 'node:crypto';

const RECEIPT_ID='R-P3-13-BOUNDARY-0010';
const NAV_BLOB='7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418';
const TESTED_COMMIT='b199b91f9cbac36df4f6ef5b75489c33737b89a4';
const PREVIEW_RUN=33904917598;
function stable(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(stable).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'}
function digest(v){return crypto.createHash('sha256').update(typeof v==='string'?v:stable(v)).digest('hex')}
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'))}
function writeJson(p,v){fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n')}

const ledger=fs.readFileSync('receipts/ledger.jsonl','utf8').trim().split(/\n+/).filter(Boolean).map(JSON.parse);
if(ledger.some(r=>r.id===RECEIPT_ID))process.exit(0);
let prev='GENESIS';for(const r of ledger){if(r.prev_hash!==prev)throw new Error(`broken ledger at ${r.id}`);const b=structuredClone(r);delete b.hash;const h=digest(b);if(h!==r.hash)throw new Error(`bad hash ${r.id}`);prev=r.hash}
if(ledger.at(-1)?.id!=='R-P3-12-FREEZE-0009')throw new Error('P3-12 receipt must be ledger frontier');

const scope={
  schema:'prometeo.p3-13-acceptance-scope/v1',
  gate:'P3-13_HUMAN_VISUAL_ACCEPTANCE',
  status:'HUMAN_DECISION_REQUIRED',
  release_blocked:true,
  scopes:{
    navigator:{artifact:'navigator-v53-visible',source_identity:`gitblob:${NAV_BLOB}`,visual_change:false,status:'PRIOR_HUMAN_SELECTED_VISIBLE_BASE_REUSED_EXACT_BYTES',note:'No new visual acceptance is invented; this only records that the candidate navigator is byte-identical to the previously selected visible V53 base.'},
    calendar:{artifact:'calendar',change:'pages/calendar/app-04-finance.js optional legacy baseRateLabel reference',visual_redesign:false,runtime_change:true,status:'PENDING_EXPLICIT_HUMAN_ACCEPTANCE',evidence:'P3-04..12 browser run proves zero console/page errors after repair, but automated evidence cannot substitute for human visual acceptance.'},
    adriana:{artifact:'arte-adriana',visual_change:false,status:'UNCHANGED_CURRENT_PRODUCT'},
    backstage:{visible_surface:false,status:'AUTOMATED_GATES_PASS_NON_VISUAL'},
    whole_release:{status:'NOT_HUMAN_ACCEPTED'}
  },
  preview_attempt:{workflow_run:PREVIEW_RUN,provider:'Vercel isolated canary project',status:'FAIL_CLOSED_NO_REPOSITORY_VERCEL_TOKEN',deployment_created:false,alias_mutated:false,production_mutated:false},
  next_required_human_decision:'Accept or reject the tested Calendar candidate visual surface. Acceptance must be explicit; a dot alone is not interpreted as visual approval unless the user has been shown the candidate and the established dot contract explicitly maps it to acceptance.',
  post_acceptance_gates:['P3-14','P3-15','P3-16','P3-17','P3-18','P3-19','P3-20']
};
writeJson('coordination/P3_13_ACCEPTANCE_SCOPE.json',scope);

const receipt={schema:'prometeo.receipt/v1',id:RECEIPT_ID,type:'P3_13_HUMAN_BOUNDARY_EVALUATION',operation_id:'OP-P3-13',work_item_id:'PENDING-PART3-001',actor:'single-worker',model:null,base_artifact:`gitcommit:${TESTED_COMMIT}`,source_digests:[`gitblob:${NAV_BLOB}`,'receipt:R-P3-12-FREEZE-0009',`github-actions:${PREVIEW_RUN}:fail-closed-before-deploy`],files_changed:['coordination/P3_13_ACCEPTANCE_SCOPE.json','state/CURRENT_GRAPH.json','state/PENDING.json','receipts/ledger.jsonl'],output_digests:['state:P3-13-HUMAN-DECISION-REQUIRED'],tests:['P3_04_12_PASS_INHERITED','V53_EXACT_BYTES_PASS','CANARY_ATTEMPT_FAIL_CLOSED_NO_DEPLOYMENT'],privacy_decisions:['NO_LOCAL_EXPORT','NO_PRODUCTION_DEPLOY','NO_WHOLE_RELEASE_ACCEPTANCE_CLAIM'],candidate_identity:`gitcommit:${TESTED_COMMIT}`,acceptance_identity:null,served_identity:null,rollback_refs:['receipt:R-P3-12-FREEZE-0009'],timestamp:new Date().toISOString(),claim:'P3-13 evaluated strictly. The V53 navigator remains exact to the previously human-selected visible base, but Calendar contains a new runtime repair and the whole release is not Human Accepted. Post-acceptance gates remain blocked. The isolated Vercel preview attempt failed closed before deployment because no repository VERCEL_TOKEN was configured.',prev_hash:prev};receipt.hash=digest(receipt);ledger.push(receipt);fs.writeFileSync('receipts/ledger.jsonl',ledger.map(JSON.stringify).join('\n')+'\n');

const current=readJson('state/CURRENT_GRAPH.json');if(current.revision!==8)throw new Error(`Expected revision 8, got ${current.revision}`);current.revision=9;current.artifacts['navigator-v53-visible'].state='PRIOR_HUMAN_SELECTED_VISIBLE_BASE';current.active_workstream={branch:'candidate/prometeo-final-20260904',phase:'PART3_P3_13_HUMAN_BOUNDARY',status:'BLOCKED_EXPLICIT_CALENDAR_VISUAL_ACCEPTANCE',parent_commit:current.active_workstream.parent_commit,materialized_commit:TESTED_COMMIT};current.last_durable_receipt=RECEIPT_ID;writeJson('state/CURRENT_GRAPH.json',current);

const pending=readJson('state/PENDING.json');const item=pending.items.find(x=>x.id==='PENDING-PART3-001');if(!item)throw new Error('Pending item missing');item.state='BLOCKED_HUMAN_DECISION';item.blocker='P3-13 requires explicit human acceptance of the tested Calendar candidate. Navigator V53 is exact to the prior selected base; Calendar runtime repair is new.';item.next_action='Show the tested Calendar candidate visual evidence to the user. If explicitly accepted, record acceptance bound to the exact candidate identity and continue P3-14..P3-20. If rejected, repair on the candidate branch and rerun P3-04..P3-12 as needed. Do not move production pointers before acceptance.';item.source_frontier.p3_13_boundary_receipt=RECEIPT_ID;item.source_frontier.p3_13_boundary_receipt_hash=receipt.hash;item.source_frontier.p3_13_preview_attempt_run=PREVIEW_RUN;writeJson('state/PENDING.json',pending);
console.log(JSON.stringify({ok:true,status:scope.status,receipt:RECEIPT_ID,hash:receipt.hash,current_revision:9,release_blocked:true}));
