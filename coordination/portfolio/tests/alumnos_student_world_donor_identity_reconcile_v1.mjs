#!/usr/bin/env node
import assert from 'node:assert/strict';

const OWNER='JuanManuelPM';
const REPO='prometeo';
const BRANCH='gh-pages';
const CANARY_PATH='__canary/portfolio-alumnos-student-world-live-route-bridge-v1/index.html';
const DONOR_PATH='pages/PROMETEO_STUDENT_WORLD_MAP_FIXED_OPEN_ME.html';
const GUARDED_BASELINE='a2f7a16beaf2d6c44556c87434bccfc4cb168b50';
const OBSERVED_DONOR='fa069bf02362243afd5cf04676de8cf2b2fc852c';

function classify(observed,expected){
  if(!observed)return 'UNVERIFIED';
  return observed===expected?'MATCH':'DRIFT';
}

async function githubContents(path){
  const response=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,{
    cache:'no-store',headers:{Accept:'application/vnd.github+json','User-Agent':'prometeo-donor-identity-regression'}
  });
  assert.equal(response.status,200,`GitHub contents HTTP ${response.status} for ${path}`);
  return response.json();
}

const [canary,donor]=await Promise.all([githubContents(CANARY_PATH),githubContents(DONOR_PATH)]);
const html=Buffer.from(canary.content||'','base64').toString('utf8');
const expected=html.match(/const EXPECTED_DONOR_BLOB='([0-9a-f]{40})'/)?.[1]||null;
const authority=html.match(/<meta name="prometeo-authority" content="([^"]+)"/)?.[1]||null;

const checks={
  baseline_guard_unchanged: expected===GUARDED_BASELINE,
  guarded_baseline_matches_itself: classify(GUARDED_BASELINE,expected)==='MATCH',
  observed_live_donor_remains_drift: donor.sha===OBSERVED_DONOR && classify(donor.sha,expected)==='DRIFT',
  unrelated_fixture_is_drift: classify('0000000000000000000000000000000000000000',expected)==='DRIFT',
  empty_fixture_is_unverified: classify('',expected)==='UNVERIFIED',
  candidate_only_authority: authority==='CANDIDATE_NOT_CURRENT_NOT_SERVED'
};

for(const [name,ok] of Object.entries(checks))assert.equal(ok,true,name);

console.log(JSON.stringify({
  schema:'prometeo.alumnos-student-world-donor-identity-reconcile-regression/v1',
  status:'PASS',
  decision:'KEEP_GUARD_UNCHANGED_UNTIL_INTENTIONAL_SUCCESSOR_IS_DURABLY_PROVEN',
  guarded_baseline:GUARDED_BASELINE,
  observed_donor:donor.sha,
  canary_blob:canary.sha,
  checks
},null,2));
