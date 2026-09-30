import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const siteRoot=process.argv[2] ? path.resolve(process.argv[2]) : null;
const worker='prod01-20260929T2257-03-229ca3deaf7e';
const bundlePath=path.join(root,'coordination/portfolio/evidence/portfolio-worker-pre-guide-finalizer-v2/GUIDE_RESPONSE_PREP_BUNDLE_V2-'+worker+'.json');
const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
const prompt=fs.readFileSync(path.join(root,'coordination/workers/POOL_PROD01_PROMPT.txt'),'utf8');
const critic=JSON.parse(fs.readFileSync(path.join(root,'coordination/portfolio/evidence/portfolio-worker-pre-guide-critic-v2/CRITIC_RESULT-'+worker+'.json'),'utf8'));

assert.equal(bundle.schema,'prometeo.guide-response-prep-bundle/v2');
assert.equal(bundle.status,'READY_CANDIDATE_NON_AUTHORITY');
assert.equal(bundle.worker_id,worker);
assert.equal(bundle.exact_single_wc_prompt,prompt,'exact_single_wc_prompt must equal canonical POOL_PROD01_PROMPT bytes');
assert.ok(bundle.exact_single_wc_prompt.includes('CONTINUIDAD_RESIDENTE=1'));
assert.ok(bundle.exact_single_wc_prompt.includes('cada RETURN no terminal continúa directo con E8/SUBMIT_NEXT'));

assert.equal(critic.status,'NEEDS_FIXES');
assert.deepEqual(
  bundle.required_fixes_applied.map(x=>x.id).sort(),
  ['RF01_CANONICAL_PROMPT_DRIFT','RF02_FRONTIER_SNAPSHOT_STALE','RF03_MACRO_COMPARISON_STATE_ADVANCED'].sort()
);
assert.ok(bundle.required_fixes_applied.every(x=>x.status==='APPLIED'));
assert.equal(bundle.contaminated_v1_evidence_used,false);
assert.equal(bundle.promotions.worker_pipeline,false);
assert.equal(bundle.promotions.current,false);
assert.equal(bundle.promotions.served,false);
assert.equal(bundle.promotions.human_accepted,false);
assert.equal(bundle.promotions.macro_variant,false);

assert.equal(bundle.recommended_worker_count,0);
assert.deepEqual(bundle.worker_count_rationale.ordinary_no_capability_portfolio_candidates,[]);
assert.equal(bundle.worker_count_rationale.ordinary_capability_bound_count,6);
assert.equal(bundle.worker_count_rationale.guide_role_count,4);
assert.match(bundle.what_human_does_now,/NONE for generic \/wc replenishment/i);
assert.match(bundle.compact_answer_draft.text,/0 jobs portfolio ordinarios compatibles/i);

const macro=bundle.verified_done.find(x=>x.item==='Independent macro-batch comparison');
assert.equal(macro.status,'VERIFIED_INCONCLUSIVE');
assert.ok(bundle.open_boundaries.some(x=>x.item==='Macro-batch promotion'&&x.status==='BOUNDARY'));

if(siteRoot){
  const frontier=JSON.parse(fs.readFileSync(path.join(siteRoot,'live/claim-frontier.json'),'utf8'));
  assert.equal(frontier.generated_at,bundle.sources.fresh_frontier.generated_at);
  assert.equal(frontier.source_sha,bundle.sources.fresh_frontier.source_sha);
  assert.equal(frontier.candidate_count,bundle.worker_count_rationale.candidate_count);

  const candidates=frontier.candidates||[];
  const ordinary=candidates.filter(c=>c.lane!=='role_ready');
  const ordinaryNoCap=ordinary.filter(c=>(c.required_capabilities||[]).length===0);
  const ordinaryCap=ordinary.filter(c=>(c.required_capabilities||[]).length>0);
  const roles=candidates.filter(c=>c.lane==='role_ready');

  assert.equal(ordinaryNoCap.length,0);
  assert.equal(ordinaryCap.length,6);
  assert.equal(roles.length,4);
  assert.equal(bundle.recommended_worker_count,ordinaryNoCap.length);
}

console.log(JSON.stringify({
  ok:true,
  worker,
  recommended_worker_count:bundle.recommended_worker_count,
  frontier_generated_at:bundle.sources.fresh_frontier.generated_at,
  fixes:bundle.required_fixes_applied.map(x=>x.id),
  contaminated_v1_evidence_used:bundle.contaminated_v1_evidence_used
}));
