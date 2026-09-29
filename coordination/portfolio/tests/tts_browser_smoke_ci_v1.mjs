import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const candidateUrl=process.env.TTS_CANDIDATE_URL||'https://juanmanuelpm.github.io/prometeo/__canary/portfolio-tts-generic-text-surface-v1/';
const outDir=process.env.TTS_BROWSER_SMOKE_OUT||'artifacts/tts-browser-smoke-ci';
fs.mkdirSync(outDir,{recursive:true});

const evidence={
  schema:'prometeo.tts-browser-smoke-ci/v1',
  observed_at:new Date().toISOString(),
  candidate_url:candidateUrl,
  authority_boundary:'browser verification only; no generation click; no generation POST; no Current/Human Accepted/Served promotion',
  viewport:{width:390,height:844},
  requests:[],
  checks:{},
  overall:'RUNNING'
};
const save=()=>fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
const pass=(name,details=true)=>{evidence.checks[name]={result:'PASS',details};save()};
const fail=(name,details)=>{evidence.checks[name]={result:'FAIL',details};save()};

let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:evidence.viewport});
  const page=await context.newPage();

  page.on('request',request=>{
    evidence.requests.push({method:request.method(),url:request.url(),resource_type:request.resourceType()});
    save();
  });
  page.on('pageerror',error=>{
    evidence.page_errors??=[];
    evidence.page_errors.push(String(error?.message||error));
    save();
  });
  page.on('console',message=>{
    if(message.type()==='error'){
      evidence.console_errors??=[];
      evidence.console_errors.push(message.text());
      save();
    }
  });

  const response=await page.goto(candidateUrl,{waitUntil:'networkidle',timeout:45000});
  const status=response?.status()??null;
  evidence.navigation={status,final_url:page.url()};
  assert.equal(status,200,'public TTS candidate must return HTTP 200');
  pass('public_candidate_http',{status,final_url:page.url()});

  const marker=page.getByText('candidate · no current',{exact:true});
  await marker.waitFor({state:'visible'});
  pass('candidate_marker');

  const textarea=page.locator('#text');
  await textarea.waitFor({state:'visible'});
  assert.equal(await textarea.getAttribute('maxlength'),'1800');
  pass('textarea_contract',{id:'text',maxlength:1800});

  const voice=page.locator('#voice');
  await voice.waitFor({state:'visible'});
  const options=await voice.locator('option').evaluateAll(nodes=>nodes.map(node=>({value:node.value,text:(node.textContent||'').trim()})));
  assert.equal(options.length,6,'exactly six voice choices required');
  pass('six_voice_choices',{count:options.length,values:options.map(x=>x.value)});

  const counter=page.locator('#count');
  assert.equal((await counter.textContent())?.trim(),'0 / 1800');
  const generate=page.locator('#go');
  assert.equal(await generate.isDisabled(),true,'Generate must start disabled');
  pass('initial_counter_and_generate_state',{counter:'0 / 1800',generate_disabled:true});

  await textarea.fill('Prueba local de interfaz');
  assert.equal(await generate.isEnabled(),true,'Generate must enable after local text edit');
  assert.equal((await counter.textContent())?.trim(),'24 / 1800');
  pass('local_text_edit',{counter:'24 / 1800',generate_enabled:true});

  await voice.selectOption('vera');
  assert.equal(await voice.inputValue(),'vera');
  pass('voice_selection_without_generation',{selected:'vera'});

  await textarea.fill('x'.repeat(1800));
  assert.equal((await counter.textContent())?.trim(),'1800 / 1800');
  assert.equal((await textarea.inputValue()).length,1800);
  assert.equal(await generate.isEnabled(),true);
  pass('character_limit_boundary',{length:1800,counter:'1800 / 1800'});

  await textarea.fill('');
  assert.equal((await counter.textContent())?.trim(),'0 / 1800');
  assert.equal(await generate.isDisabled(),true);
  pass('clear_restores_disabled_state');

  const posts=evidence.requests.filter(request=>request.method==='POST');
  assert.equal(posts.length,0,'page load, text edits and voice selection must emit zero POST requests');
  pass('zero_generation_posts',{post_count:0,total_requests:evidence.requests.length});

  assert.equal((evidence.page_errors||[]).length,0,'no uncaught page errors allowed');
  pass('no_uncaught_page_errors');
  assert.equal((evidence.console_errors||[]).length,0,'no console errors allowed');
  pass('no_console_errors');

  await page.screenshot({path:path.join(outDir,'candidate-narrow.png'),fullPage:true});
  pass('screenshot_captured',{path:'candidate-narrow.png'});

  evidence.overall='PASS';
  evidence.completed_at=new Date().toISOString();
  save();
  console.log('tts_browser_smoke_ci_v1: PASS');
}catch(error){
  evidence.overall='FAIL';
  evidence.completed_at=new Date().toISOString();
  evidence.error={message:String(error?.message||error),stack:String(error?.stack||'')};
  fail('terminal',evidence.error);
  save();
  console.error(error);
  process.exitCode=1;
}finally{
  if(browser) await browser.close();
}