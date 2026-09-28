#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||'.';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const edge=read('supabase/functions/prometeo-change-loop-v1/index.ts');
const apply=read('scripts/apply-page-change-frontier.mjs');
const compact=read('scripts/build-claim-frontier.mjs');
const fast=read('coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md');
const wc=read('wc');
const builder=read('coordination/workspaces/PAGE_CHANGE_WORKER_PROTOCOL_V1.md');
const verifier=read('coordination/workspaces/PAGE_CHANGE_VERIFIER_PROTOCOL_V1.md');

const must=(label,source,needle)=>{
  if(!source.includes(needle))throw new Error('PAGE_CHANGE_VERIFY_FAIL '+label);
};

must('builder-work-pool-self-cert-fenced',edge,"builderSelfCertified=deliveryMode==='WORKER_POOL'&&['VERIFIED','SERVED'].includes(requestedStatus)");
must('builder-self-cert-downgrades',edge,"const status=builderSelfCertified?'CANDIDATE_READY':requestedStatus");
must('builder-detail-requires-independent',edge,"independent_verification_required:deliveryMode==='WORKER_POOL'&&status==='CANDIDATE_READY'");
must('builder-protocol-candidate-cap',builder,"builder's highest truthful success status is `CANDIDATE_READY`");

must('frontier-candidate-ready',edge,".in('status',['READY','CANDIDATE_READY'])");
must('verify-kind',edge,"kind:'PAGE_CHANGE_VERIFY'");
must('verify-protocol',edge,"source_path:PAGE_CHANGE_VERIFIER_PROTOCOL");
must('verify-browser-capability',edge,"'representative_javascript_browser'");
must('verify-builder-excluded',edge,"forbidden_worker_ids:[builderWorkerId]");
must('verify-separate-claim',edge,"opportunityId='page-change-verify-'+p.work_item_id");
must('verify-separate-result',edge,"verifyPath='coordination/executions/'+p.work_item_id+'/VERIFY.json'");

must('apply-keeps-exclusion',apply,"forbidden_worker_ids:uniq(item.forbidden_worker_ids).slice(0,16)");
must('compact-keeps-exclusion',compact,"'forbidden_worker_ids'");
must('preclaim-skip-law',fast,'current worker_id is listed, that candidate is INELIGIBLE');
must('canonical-bootstrap-preclaim-exclusion',wc,'INDEPENDENCE EXCLUSION BEFORE CLAIM');
must('canonical-bootstrap-no-claim-when-forbidden',wc,'do NOT CREATE its claim/PIN/barrier entrant');

must('verification-schema',edge,"verification.schema!=='prometeo.verification-result/v1'");
must('verification-verdicts',edge,"['PASS','FAIL','BLOCKED'].includes(verdict)");
must('verification-distinct-workers',edge,"builderWorkerId===verifierWorkerId");
must('verification-claim-identity',edge,"String(verification.builder_worker_id||'')!==builderWorkerId");
must('verification-pass-only-promotes',edge,"const nextStatus=verdict==='PASS'?'VERIFIED':'CANDIDATE_READY'");
must('verification-updates-packet-pass',edge,"update({status:'VERIFIED'})");
must('execution-status-ingests-verifier',edge,'result=await maybeGitHubVerification(p,result)');

must('verifier-readonly',verifier,'The verifier is read-only with respect to the product candidate.');
must('verifier-no-product-edit',verifier,'edit the product/source target');
must('verifier-visual-evidence-law',verifier,'A visual PASS requires actual visual/browser evidence.');
must('verifier-pass-law',verifier,'backend may upgrade the Page Change result from `CANDIDATE_READY` to `VERIFIED`');

console.log('PAGE_CHANGE_INDEPENDENT_VERIFY_PASS');
