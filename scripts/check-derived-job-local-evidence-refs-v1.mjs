#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const target='coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-primary-chat-served-ingress-parity-repair-v1.json';
const localPrefixes=['.github/','coordination/','current-tree/','scripts/','tests/','docs/','live/','wc/','api/','assets/'];

export function localEvidencePath(ref){
  const raw=String(ref||'').trim();
  if(!raw || /^(?:https?:\/\/|git@|urn:)/i.test(raw)) return null;
  let path=raw.replace(/#[^#]*$/,'');
  path=path.replace(/@[0-9a-f]{40}$/i,'');
  return localPrefixes.some(prefix=>path.startsWith(prefix)) ? path : null;
}

export function validateLocalEvidenceRefs(job, exists=fs.existsSync){
  const missing=[];
  for(const ref of job?.evidence||[]){
    const path=localEvidencePath(ref);
    if(path && !exists(path)) missing.push({ref,path});
  }
  return {ok:missing.length===0,missing};
}

const job=JSON.parse(fs.readFileSync(target,'utf8'));
const result=validateLocalEvidenceRefs(job);
assert.equal(result.ok,true,`missing local evidence refs: ${JSON.stringify(result.missing)}`);
assert.equal(job.evidence.includes('.github/workflows/publish-primary-chat-canary.yml'),false,'nonexistent publication owner ref must stay removed');
assert.equal(localEvidencePath('https://example.invalid/evidence.json'),null,'external URL must not be treated as repository-local');
assert.equal(localEvidencePath('GitHub Actions run 123'),null,'logical receipt labels must not be treated as repository-local');
assert.equal(localEvidencePath('coordination/example.json@0123456789abcdef0123456789abcdef01234567'),'coordination/example.json','commit-qualified local refs must resolve to their repository path');
const negative=validateLocalEvidenceRefs({evidence:['.github/workflows/definitely-missing-prometeo-regression-fixture.yml']},()=>false);
assert.equal(negative.ok,false,'missing local repository path must be detected');
assert.equal(negative.missing[0].path,'.github/workflows/definitely-missing-prometeo-regression-fixture.yml');

console.log(JSON.stringify({
  schema:'prometeo.derived-job-local-evidence-ref-regression/v1',
  status:'PASS',
  target,
  checked_local_refs:(job.evidence||[]).map(localEvidencePath).filter(Boolean),
  external_refs_ignored:true,
  missing_local_fixture_detected:true
},null,2));
