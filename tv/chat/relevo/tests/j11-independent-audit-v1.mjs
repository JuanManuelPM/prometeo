#!/usr/bin/env node
// J11: read-only independent evidence, never a synthetic "second ChatGPT".
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const served=process.argv.includes('--served');
const out='artifacts/j11-independent';
await mkdir(out,{recursive:true});
const report={
  schema:'prometeo.j11.independent-audit/v1',
  mode:served?'public-http-and-source':'checkout-source',
  generated_at_utc:new Date().toISOString(),
  source_ref:'gh-pages',
  facts:[],open_gaps:[],failures:[],result:'UNKNOWN'
};
const pass=(item,value)=>report.facts.push({check:item,value});
const gap=(item,reason)=>report.open_gaps.push({check:item,reason});
const read=async p=>await readFile(p,'utf8');
const isUtc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s));
try {
  const entry=await read('tv/chat/AGENT_ENTRY_V1.md');
  const library=await read('tv/chat/relevo/retomar/IDEAS_ENCARGOS_DE_ALTA_CALIDAD_V1.md');
  const home=await read('tv/chat/relevo/retomar/index.html');
  const projection=JSON.parse(await read('tv/chat/relevo/retomar/reentrada.json'));
  const state=JSON.parse(await read('tv/chat/relevo/STATE_V1.json'));
  assert.ok(entry.includes('AGENT_ENTRY_V1') || entry.includes('reentrada.json'),'Entry source inaccessible');
  assert.ok(library.includes('J11 · Auditor independiente'),'J11 brief absent');
  const projects=projection.projects;
  const receipts=projection.public_receipts;
  assert.ok(Array.isArray(projects)&&Array.isArray(receipts),'Public owner arrays absent');
  assert.ok(projects.length>=6,'Previous projects lost');
  assert.equal(new Set(projects.map(p=>p.id)).size,projects.length,'Duplicate projects');
  for(const id of ['persistencia','facultad','widgets','tv','experiencias','ritmo-estudio']){
    assert.ok(projects.some(p=>p.id===id),'Missing existing project '+id);
  }
  for(const p of projects){
    assert.match(p.source_path,/^[A-Za-z0-9_.\/-]+$/);
    assert.ok(!p.source_path.split('/').includes('..'),'Unsafe source path');
    assert.ok(['gh-pages','main'].includes(p.source_branch),'Unknown source branch');
    if(p.source_branch==='gh-pages')await read(p.source_path);
  }
  pass('owner_projects',projects.map(p=>p.id));
  assert.equal(new Set(receipts.map(r=>r.id)).size,receipts.length,'Duplicate receipts');
  for(const r of receipts){
    assert.ok(projects.some(p=>p.id===r.project_id),'Orphan receipt '+r.id);
    assert.ok(isUtc(r.occurred_at_utc),'Missing verifiable UTC '+r.id);
    assert.ok(Date.parse(r.occurred_at_utc)<=Date.now()+300000,'Future-dated receipt '+r.id);
    assert.match(r.source_url,/^https:\/\/github\.com\/JuanManuelPM\/prometeo\/(?:pull|commit|issues)\/[0-9a-z]+$/,'Non-project evidence URL');
    assert.ok(['REQUEST_CAPTURED','CANDIDATE','TESTED','PUBLISHED','SERVED_VERIFIED','BLOCKED'].includes(r.state));
    if(r.state==='SERVED_VERIFIED'){
      assert.match(r.version_sha,/^[a-f0-9]{40}$/,'Served without blob hash');
      assert.match(r.served_url,/^https:\/\/juanmanuelpm\.github\.io\/prometeo\//,'Served without page URL');
      assert.match(r.proof_url,/^https:\/\/github\.com\/JuanManuelPM\/prometeo\/actions\/runs\/\d+$/,'Served without proof URL');
    }
  }
  pass('valid_project_receipts',receipts.length);
  pass('served_receipts_with_source_sha',receipts.filter(r=>r.state==='SERVED_VERIFIED').map(r=>r.id));
  const rhythm=JSON.parse(await read('projects/ritmo-estudio/PROJECT_V1.json'));
  assert.equal(rhythm.id,'ritmo-estudio');
  for(const k of ['ideas','research','decisions','results','versions','artifacts'])assert.ok(rhythm[k]?.length,k);
  assert.equal(rhythm.verification.browser_public_state,'SERVED_VERIFIED');
  const rhythmHtml=Buffer.from(await readFile('projects/ritmo-estudio/index.html'));
  const rhythmSha=createHash('sha1').update(Buffer.from('blob '+rhythmHtml.length+'\0')).update(rhythmHtml).digest('hex');
  assert.equal(rhythmSha,rhythm.verification.served_artifact_blob_sha,'Owner references different game/project bytes');
  pass('ritmo_artifact_owner_sha',rhythmSha);
  assert.ok(state.last_hop>=8&&Array.isArray(state.history)&&state.history.some(x=>x.hop===8),'Prior hops lost');
  pass('history_hops',state.last_hop);
  assert.ok(home.includes('America/Argentina/Buenos_Aires'),'Argentina formatting missing');
  assert.ok(home.includes('entries.sort((a,b)'),'Newest-first logic missing');
  pass('page_has_argentina_and_sorting_source',true);
  const acks=receipts.filter(r=>r.state==='REQUEST_CAPTURED');
  if(!acks.length)gap('J01_initial_capture','No REQUEST_CAPTURED public receipt found, cannot prove early ACK');
  else pass('initial_receipts',acks.length);
  if(!receipts.some(r=>r.work_id))gap('J02_J03_causal_work_id','No work_id in public receipts; cannot correlate ACK/progress/delivery per task');
  gap('real_chat_A_to_B_to_C','No third real ChatGPT session or concurrent input observed by this CI process; owner recovery is not proof of another chat running');
  gap('private_ingress','Read-only GitHub public catalog does not persist chat-private messages');
  if(served){
    const root='https://juanmanuelpm.github.io/prometeo/';
    for(const file of ['tv/chat/relevo/retomar/index.html','tv/chat/relevo/retomar/reentrada.json','projects/ritmo-estudio/index.html']){
      const expected=Buffer.from(await readFile(file));
      const expectedSha=createHash('sha1').update(Buffer.from('blob '+expected.length+'\0')).update(expected).digest('hex');
      let actual='',status=0;
      for(let attempt=0;attempt<12;attempt++){
        const response=await fetch(root+file+'?j11='+Date.now()+'-'+attempt,{headers:{'Cache-Control':'no-cache'}});
        status=response.status;
        if(status===200){
          const b=Buffer.from(await response.arrayBuffer());
          actual=createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
          if(actual===expectedSha)break;
        }
        if(attempt<11)await new Promise(resolve=>setTimeout(resolve,10000));
      }
      report.facts.push({check:'served_'+file,http_status:status,expected_sha:expectedSha,observed_sha:actual,equal:actual===expectedSha});
      assert.equal(status,200,'Pages HTTP failed '+file);
      assert.equal(actual,expectedSha,'Pages stale or transformed '+file);
    }
  }
  report.result='PASS_WITH_OPEN_GAPS';
}catch(e){
  report.result='FAIL';
  report.failures.push(String(e.stack||e));
  process.exitCode=1;
}finally{
  await writeFile(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.log('J11_AUDIT '+JSON.stringify(report));
}
