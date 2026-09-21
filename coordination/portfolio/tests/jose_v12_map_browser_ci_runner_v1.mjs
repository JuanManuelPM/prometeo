import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const target=process.env.JOSE_V12_TARGET_URL||'http://127.0.0.1:8000/pages/lab/jose-study-design-20260911/PROMETEO_JOSE_RECOVERY_ENGINE_V12_MAP_REFINEMENT_CANDIDATE.html';
const outDir=process.env.JOSE_V12_OUT||'artifacts/jose-v12-map-browser-ci';
const candidatePath='pages/lab/jose-study-design-20260911/PROMETEO_JOSE_RECOVERY_ENGINE_V12_MAP_REFINEMENT_CANDIDATE.html';
const expectedDigest='0cf9a40fb53e977dccb40c9755d668a3ee922ccd61883f19229bb4a113139a05';
const expectedSourceCommit='158357fe4e1cb672e4574d9ebe6f317b9418a30f';

fs.mkdirSync(outDir,{recursive:true});
const evidence={
  schema:'prometeo.jose-v12-map-browser-ci-evidence/v1',
  observed_at:new Date().toISOString(),
  target,
  candidate_path:candidatePath,
  browser:'chromium-playwright',
  authority_boundary:'technical verification only; no Current/Human Accepted/Served promotion',
  expected_v11_sha256:expectedDigest,
  expected_source_commit:expectedSourceCommit,
  checks:{},
  console_errors:[],
  page_errors:[],
  overall:'RUNNING'
};
const save=()=>fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
const pass=(name,details=true)=>{evidence.checks[name]={result:'PASS',details};save()};
const fail=(name,details)=>{evidence.checks[name]={result:'FAIL',details};save()};

const candidateHtml=fs.readFileSync(candidatePath,'utf8');
evidence.candidate_sha256=crypto.createHash('sha256').update(candidateHtml).digest('hex');
const digestLiteral=(candidateHtml.match(/const EXPECTED_SHA256='([0-9a-f]{64})'/)||[])[1];
const sourceCommitLiteral=(candidateHtml.match(/const SOURCE_COMMIT='([0-9a-f]{40})'/)||[])[1];
assert.equal(digestLiteral,expectedDigest,'candidate must keep the pinned V11 SHA-256 gate');
assert.equal(sourceCommitLiteral,expectedSourceCommit,'candidate must keep the immutable V11 source commit');
pass('static_pin_contract',{
  expected_v11_sha256:digestLiteral,
  source_commit:sourceCommitLiteral,
  candidate_sha256:evidence.candidate_sha256
});

let browser;
let page;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  page=await context.newPage();
  page.on('pageerror',error=>{evidence.page_errors.push(String(error));save()});
  page.on('console',msg=>{if(msg.type()==='error'){evidence.console_errors.push(msg.text());save()}});

  await page.goto(target,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(
    ()=>document.querySelector('#status')?.textContent?.includes('V11 SHA-256 PASS'),
    null,
    {timeout:30000}
  );
  assert.equal(await page.locator('#fatal').evaluate(el=>el.classList.contains('show')),false,'candidate must not fail closed');
  const gateStatus=(await page.locator('#status').textContent()||'').trim();
  pass('runtime_v11_sha256_gate',{status:gateStatus,expected_v11_sha256:expectedDigest});

  const deadline=Date.now()+20000;
  let previewFrame=null;
  while(Date.now()<deadline){
    previewFrame=page.frames().find(frame=>frame.parentFrame()===page.mainFrame())||null;
    if(previewFrame){
      try{
        await previewFrame.locator('body').waitFor({state:'attached',timeout:1000});
        const text=(await previewFrame.locator('body').innerText()).trim();
        if(text) break;
      }catch{}
    }
    await page.waitForTimeout(150);
  }
  assert.ok(previewFrame,'V11 srcdoc iframe must be available');

  const topicLabels=[
    'Index Laws','Factorization','Quadratics','Simultaneous Equations',
    'Índices','Factorización','Cuadráticas','Ecuaciones simultáneas'
  ];
  const bodyText=await previewFrame.locator('body').innerText();
  const chosenLabel=topicLabels.find(label=>bodyText.toLocaleLowerCase('es').includes(label.toLocaleLowerCase('es')));
  assert.ok(chosenLabel,'course menu must expose at least one known algebra topic');

  const textMatches=previewFrame.getByText(chosenLabel,{exact:false});
  let clicked=false;
  for(let i=0;i<await textMatches.count();i++){
    const node=textMatches.nth(i);
    if(!(await node.isVisible().catch(()=>false))) continue;
    await node.click({force:true});
    clicked=true;
    break;
  }
  assert.equal(clicked,true,'a visible topic entry must be clickable');
  evidence.selected_topic=chosenLabel;
  save();

  await page.waitForFunction(
    ()=>/V12 activo/.test(document.querySelector('#status')?.textContent||'') &&
        /rondas/.test(document.querySelector('#status')?.textContent||'') &&
        !/esperando mapa/.test(document.querySelector('#status')?.textContent||''),
    null,
    {timeout:20000}
  );

  const v12Status=(await page.locator('#status').textContent()||'').trim();
  const counts=await previewFrame.evaluate(()=>({
    rails:document.querySelectorAll('[data-prometeo-v12-rail]').length,
    levels:document.querySelectorAll('[data-prometeo-v12-level]').length,
    rounds:document.querySelectorAll('[data-prometeo-v12-round]').length,
    v12_on:document.documentElement.classList.contains('prometeo-v12-on')
  }));
  assert.equal(counts.v12_on,true,'V12 style class must be active after entering the topic map');
  assert.equal(counts.rails,1,'exactly one topic-local rail must be detected');
  assert.equal(counts.levels,12,'topic-local map must expose 12 levels');
  assert.equal(counts.rounds,3,'topic-local map must expose 3 rounds');
  pass('topic_local_map_runtime',{topic:chosenLabel,status:v12Status,...counts});
  await page.screenshot({path:path.join(outDir,'v12-topic-map.png'),fullPage:true});

  const toggle=page.locator('#toggle');
  assert.equal(await toggle.isEnabled(),true,'A/B toggle must become enabled after map detection');
  await toggle.click();
  await page.waitForFunction(
    ()=>/V12 apagado/.test(document.querySelector('#status')?.textContent||''),
    null,
    {timeout:5000}
  );
  const v11Status=(await page.locator('#status').textContent()||'').trim();
  const v11State=await previewFrame.evaluate(()=>({
    v12_on:document.documentElement.classList.contains('prometeo-v12-on'),
    rails:document.querySelectorAll('[data-prometeo-v12-rail]').length,
    levels:document.querySelectorAll('[data-prometeo-v12-level]').length,
    rounds:document.querySelectorAll('[data-prometeo-v12-round]').length,
    body_visible:!!document.body && getComputedStyle(document.body).display!=='none'
  }));
  assert.equal(v11State.v12_on,false,'V11 A/B state must remove the V12 style class');
  assert.equal(v11State.body_visible,true,'V11 must remain rendered and reachable');
  assert.equal(v11State.levels,12,'V11 intact state must preserve the same topic-local level structure');
  pass('v11_ab_reachable',{status:v11Status,...v11State});
  await page.screenshot({path:path.join(outDir,'v11-intact.png'),fullPage:true});

  evidence.overall='PASS';
  evidence.completed_at=new Date().toISOString();
  save();
  console.log('jose_v12_map_browser_ci_runner_v1: PASS');
}catch(error){
  evidence.overall='FAIL';
  evidence.completed_at=new Date().toISOString();
  evidence.error={message:String(error?.message||error),stack:String(error?.stack||'')};
  fail('terminal',evidence.error);
  try{
    if(page) await page.screenshot({path:path.join(outDir,'failure.png'),fullPage:true});
  }catch{}
  save();
  console.error(error);
  process.exitCode=1;
}finally{
  if(browser) await browser.close();
}
