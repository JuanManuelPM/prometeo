import assert from 'node:assert/strict';
import { classifyProjectGuideFrontier } from '../../../scripts/build-fast-allocator.mjs';

const derived = id => `coordination/portfolio/derived/prometeo-live/${id}.json`;
const mesh = { project_frontier_baseline_capabilities:['repository_test_runtime'] };

{
  const terminal='portfolio-live-reproduction-metric-provenance-v1';
  const browser='portfolio-live-mobile-pin-lineage-narrow-browser-verify-v1';
  const publish='portfolio-live-real-page-publication-roundtrip-canary-v1';
  const state={
    frontier_refs:[derived(terminal),derived(browser),derived(publish)]
  };
  const jobs=[
    {job_id:terminal,source_path:derived(terminal),state:'done',required_capabilities:[]},
    {job_id:browser,source_path:derived(browser),state:'ready',required_capabilities:['representative_javascript_browser']},
    {job_id:publish,source_path:derived(publish),state:'ready',required_capabilities:['browser_network_navigation_to_github_pages','representative_javascript_browser']}
  ];
  const result=classifyProjectGuideFrontier(state,jobs,mesh);
  assert.equal(result.counts.terminal,1);
  assert.equal(result.counts.capability_requirement,2);
  assert.equal(result.effective_count,0);
  assert.deepEqual(result.terminal_refs,[derived(terminal)]);
}

{
  const a='ordinary-a';
  const b='ordinary-b';
  const state={frontier_refs:[derived(a),derived(b)]};
  const jobs=[
    {job_id:a,source_path:derived(a),state:'ready',required_capabilities:[]},
    {job_id:b,source_path:derived(b),state:'working',required_capabilities:['repository_test_runtime']}
  ];
  const result=classifyProjectGuideFrontier(state,jobs,mesh);
  assert.equal(result.counts.executable,1);
  assert.equal(result.counts.active,1);
  assert.equal(result.effective_count,2);
  assert.equal(result.counts.capability_requirement,0);
}

{
  const missing='missing-job';
  const state={frontier_refs:[derived(missing)]};
  const result=classifyProjectGuideFrontier(state,[],mesh);
  assert.equal(result.counts.missing,1);
  assert.equal(result.effective_count,0);
}

console.log('PROJECT_GUIDE_EFFECTIVE_FRONTIER_PASS');
