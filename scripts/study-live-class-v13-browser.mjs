import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.QA_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1280,height:820}});
  const page=await context.newPage();
  await page.setContent('<!doctype html><html><head><meta name="theme-color" content="#111326"></head><body><div id="app"></div><div class="top"></div></body></html>');
  await page.addScriptTag({content:`
    var U='https://example.invalid',TRANSCRIBE=U+'/transcribe';
    var renderSession=function(){},cleanupRoom=function(){},toggleBreak=function(){},finishRecording=function(){},renderChunks=function(){},renderFullTranscript=function(){},fullText=function(){return''},transcribeJob=async function(){},updateFullDoc=async function(){};
    var sliceTimer=null,recLive=false,recPaused=false,stream=null,previewText='',room=null,roomClient=null,part=1,seq=0,rec=null,recPieces=[],sliceStarted=0,recStarted=Date.now(),chunks=[],notes=[],transQueue=[];
    var st={profile:{id:'qa',name:'QA',color:'#D8D1FF'},sessions:{}},view='library';
    var pickMime=function(){return''},putAudio=async function(){},pumpTranscription=function(){},broadcast=function(){},stopRecognition=function(){},updateRecUI=function(){},renderParts=function(){},setActivity=function(){},save=function(){},toast=function(){};
    var clientFor=function(){return{from:function(){return{select:function(){return this},eq:function(){return this},order:async function(){return{data:[],error:null}},upsert:async function(){return{}},update:function(){return this}}}}};
    var ms=function(v){const s=Math.floor((v||0)/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
    var esc=function(s){return String(s??'')},openDB=async function(){throw new Error('unused')},renderNotes=function(){};
  `});
  await page.addScriptTag({url:base+'/pages/study-library/study-v13-class-ready.js'});
  await page.waitForFunction(()=>window.__studyClassV13?.capture?.overlapMs===5000);
  const result=await page.evaluate(()=>{
    const api=window.__studyClassV13;
    const list=[
      {status:'ready',participant_id:'u',participant_name:'Colo',segment_no:1,seq:1,start_ms:0,end_ms:20000,overlap_ms:0,transcript:'La teoría cognitiva estudia la memoria de trabajo'},
      {status:'ready',participant_id:'u',participant_name:'Colo',segment_no:1,seq:2,start_ms:15000,end_ms:35000,overlap_ms:5000,transcript:'la memoria de trabajo y la atención selectiva'}
    ];
    const text=api.fullTextFromChunks(list);api.applyTheme('crema');
    return {capture:api.capture,text,bg:document.documentElement.style.getPropertyValue('--bg'),ink:document.documentElement.style.getPropertyValue('--ink'),prompt:api.prompt('https://example.com/t','study',true)};
  });
  assert.deepEqual(result.capture,{windowMs:20000,stepMs:15000,overlapMs:5000,version:'overlap-v1'});
  assert.match(result.text,/memoria de trabajo y la atención selectiva/);
  assert.equal((result.text.match(/memoria de trabajo/g)||[]).length,1);
  assert.equal(result.bg,'#F5DABF');assert.equal(result.ink,'#6C151E');
  assert.match(result.prompt,/dudoso\/inaudible/);assert.match(result.prompt,/puede seguir creciendo/);

  const share=await context.newPage();
  await share.route('https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-transcript-share-v1**',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,share:{title:'Clase QA',course_id:'modelos',class_date:'2026-09-11',transcript:'PARTE 1 · QA · 00:00\nTexto íntegro de prueba.',shared_notes:'Nota compartida.',created_at:'2026-09-11T10:00:00Z',expires_at:'2026-10-11T10:00:00Z'}})}));
  await share.goto(base+'/pages/study-library/transcript-share.html?s=qa',{waitUntil:'networkidle'});
  await share.getByRole('heading',{name:'Clase QA'}).waitFor();
  assert.match(await share.locator('[data-panel="transcript"]').innerText(),/Texto íntegro de prueba/);
  await share.getByRole('button',{name:'notas compartidas'}).click();
  assert.match(await share.locator('[data-panel="notes"]').innerText(),/Nota compartida/);
  const before=await share.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  await share.locator('#theme').click();
  const after=await share.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  assert.notEqual(before,after);
  const html=await fs.readFile('pages/study-library/transcript-share.html','utf8');
  assert.match(html,/chatgpt\.com\/\?prompt=/);assert.match(html,/noindex,nofollow/);
  await share.screenshot({path:'qa-artifacts/live-transcript-share-mobile.png',fullPage:true});
  console.log(JSON.stringify({ok:true,capture:result.capture,theme:[result.bg,result.ink]}));
} finally { await browser.close(); }
