import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-fanin-'));
fs.mkdirSync(path.join(repo, 'scripts'), {recursive:true});
fs.mkdirSync(path.join(repo, 'coordination/portfolio/returns/lane-a'), {recursive:true});
fs.mkdirSync(path.join(repo, 'coordination/portfolio/returns/lane-b'), {recursive:true});
fs.mkdirSync(path.join(repo, 'coordination/portfolio/contracts'), {recursive:true});
for (const file of ['return-fanin-judge-closer-lib.mjs','materialize-return-fanin-judge-closer.mjs']) {
  fs.copyFileSync(new URL(`../../../scripts/${file}`, import.meta.url), path.join(repo, 'scripts', file));
}
const write = (rel, value) => { const file=path.join(repo,rel); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file, JSON.stringify(value,null,2)+'\n'); };
const campaign='C-MAT';
const a={schema:'prometeo.portfolio-return/v1',return_id:'A',campaign_id:campaign,project_id:'p',job_id:'lane-a',lane:'lane-a',generation:2,worker_id:'w',returned_at:'2026-10-02T19:00:00Z',outcome:'DONE'};
const b={...a,return_id:'B',job_id:'lane-b',lane:'lane-b'};
write('coordination/portfolio/returns/lane-a/A.json',a); write('coordination/portfolio/returns/lane-b/B.json',b);
const contract={schema:'prometeo.campaign-judge-contract/v1',campaign_id:campaign,project_id:'p',required_lanes:['lane-a','lane-b'],return_refs:['coordination/portfolio/returns/lane-a/A.json','coordination/portfolio/returns/lane-b/B.json']};
write('coordination/portfolio/contracts/C-MAT.json',contract);
const run=()=>spawnSync(process.execPath,['scripts/materialize-return-fanin-judge-closer.mjs','coordination/portfolio/contracts/C-MAT.json'],{cwd:repo,encoding:'utf8'});
let first=run(); assert.equal(first.status,0,first.stderr); const result=JSON.parse(first.stdout); assert.equal(result.status,'CLOSED');
const out=path.join(repo,'coordination/portfolio/evidence/p/campaigns/C-MAT');
const close1=fs.readFileSync(path.join(out,'CLOSE.json'),'utf8');
const projection=JSON.parse(fs.readFileSync(path.join(out,'PRIMARY_CHAT_PROJECTION.json'),'utf8')); assert.equal(projection.privacy,'PUBLIC_SANITIZED_REFERENCES_ONLY'); assert.equal(projection.status,'CLOSED'); assert.equal('returns' in projection,false);
const stale={...b,return_id:'B-STALE',generation:1,returned_at:'2026-10-02T20:00:00Z',outcome:'FAIL'}; write('coordination/portfolio/returns/lane-b/B-STALE.json',stale); contract.return_refs.push('coordination/portfolio/returns/lane-b/B-STALE.json'); write('coordination/portfolio/contracts/C-MAT.json',contract);
let second=run(); assert.equal(second.status,0,second.stderr); const close2=fs.readFileSync(path.join(out,'CLOSE.json'),'utf8'); assert.equal(close2,close1,'closed campaign must remain byte-stable after late/stale return');
const verdict=JSON.parse(fs.readFileSync(path.join(out,'VERDICT.json'),'utf8')); assert.equal(verdict.status,'PASS'); assert.equal(verdict.evidence.find(x=>x.lane==='lane-b').generation,2,'stale generation must not displace current evidence');
const unknown={...a,return_id:'A-UNKNOWN',generation:3,returned_at:'2026-10-02T21:00:00Z',outcome:'SUCCESS'}; write('coordination/portfolio/returns/lane-a/A-UNKNOWN.json',unknown); contract.return_refs.push('coordination/portfolio/returns/lane-a/A-UNKNOWN.json'); write('coordination/portfolio/contracts/C-MAT.json',contract); let third=run(); assert.equal(third.status,0,third.stderr); const verdict3=JSON.parse(fs.readFileSync(path.join(out,'VERDICT.json'),'utf8')); assert.equal(verdict3.status,'INCOMPLETE','unknown SUCCESS must fail closed under current outcome semantics');
assert.equal(fs.readFileSync(path.join(out,'CLOSE.json'),'utf8'),close1,'later nonterminal evidence cannot reopen a valid close');
console.log('RETURN_FANIN_MATERIALIZER_V1_PASS');
