import test from 'node:test';
import assert from 'node:assert/strict';
import {projectResidency,auditDealerBindings,readVerifiedPrompt} from '../ui-workspace-v1/widgets/residency-trio/versions/v2/projection.js';
const files=(n,slot)=>Array.from({length:n},(_,i)=>({type:'file',name:`RETURN-${String(i+1).padStart(6,'0')}__worker-${slot}.md`,sha:'a'.repeat(40)}));
test('RETURN index outranks stale top-level or nested counters without proving liveness',()=>{
  const p=projectResidency({worker_id:'w2',first_claim_at:'2026-10-08T02:32:57.704Z',returns_created_confirmed_min:21,status:'PLATFORM_INTERRUPTION'},files(25,'002'),{slot:'002'});
  assert.equal(p.returns_observed,25);assert.equal(p.state_minimum,21);assert.equal(p.canonicality,'DURABLE_RETURN_INDEX');assert.equal(p.rate_evidence_aligned,false);assert.equal(p.live,false);assert.equal(p.status_label,'PLATFORM_INTERRUPTION');
});
test('dealer binding compares complete declarations and rejects ambiguity',()=>{
  assert.equal(auditDealerBindings({dealer_id:'dealer-1'},'Dealer: dealer-10','DEALER=dealer-1').status,'MISMATCH');
  assert.equal(auditDealerBindings({dealer_id:'dealer-1'},'Dealer:\ndealer-1','DEALER=dealer-1').status,'MATCH');
  assert.equal(auditDealerBindings({dealer_id:'dealer-1'},'Dealer: dealer-1\nDealer: dealer-2','DEALER=dealer-1').status,'MISMATCH');
});
test('copy proof pins all sources to one fresh revision and rejects changed prompt',async()=>{
  const sha='c'.repeat(40),urls=[];let prompt='DEALER=dealer-1';
  const fetcher=async url=>{urls.push(url);return {ok:true,json:async()=>({object:{sha}}),text:async()=>url.endsWith('RUN.json')?JSON.stringify({dealer_id:'dealer-1'}):url.endsWith('HANDOFF.md')?'Dealer:\ndealer-1':prompt}};
  const verified=await readVerifiedPrompt(fetcher);assert.equal(verified.revision,sha);assert(urls.slice(1).every(x=>x.includes('/'+sha+'/')));
  prompt='DEALER=dealer-10';await assert.rejects(readVerifiedPrompt(fetcher),/CONTROL_BINDING_MISMATCH/);
});
test('unacquired slot differs from missing source and historical claim',()=>{
  assert.equal(projectResidency({worker_id:null,first_claim_at:null,status:'WAITING'},[],{slot:'003'}).status_label,'NOT_ACQUIRED');
  assert.equal(projectResidency(null,null,{slot:'003'}).status_label,'SOURCE_UNAVAILABLE');
  assert.equal(projectResidency({worker_id:'w1',first_claim_at:'2026-10-08'},null,{slot:'001'}).status_label,'HISTORICAL_CLAIM');
});
test('failed index read retains explicit state minimum instead of zero or exact proof',()=>{
  const p=projectResidency({returns_created:100},null,{slot:'001'});assert.equal(p.returns_observed,100);assert(p.lower_bound);assert.equal(p.canonicality,'STATE_MINIMUM');
});
test('duplicates, another worker and non-blob entries do not inflate count',()=>{
  const a=files(1,'001'),p=projectResidency({},[...a,...a,...files(1,'002'),{name:'RETURN-000002__worker-001.md',type:'dir',sha:'a'.repeat(40)}],{slot:'001'});assert.equal(p.returns_observed,1);
});
test('configuration conflict is detected without exposing opaque dealer identities',()=>{
  const a=auditDealerBindings({dealer_id:'fixture-a'},'Dealer: fixture-b','Dealer: fixture-a');
  assert.equal(a.status,'MISMATCH');assert.equal(JSON.stringify(a).includes('fixture-'),false);assert.equal(auditDealerBindings(null,null,null).status,'UNKNOWN');
});
