import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const ROOT=process.cwd();
const REL='pages/lab/jose-study-design-20260911/PROMETEO_JOSE_RECOVERY_ENGINE_V12_MAP_REFINEMENT_CANDIDATE.html';
const EXPECTED_CANDIDATE_BLOB='8f22dd9e0079dab7174eaba784a0d6c793e0ac90';
const EXPECTED_V11_SHA256='0cf9a40fb53e977dccb40c9755d668a3ee922ccd61883f19229bb4a113139a05';
const OUT=process.env.JOSE_V12_ARTIFACT_DIR||'artifacts/jose-v12-map-runtime-browser-verify';
const TIMEOUT=Number(process.env.JOSE_V12_TIMEOUT_MS||45000);
const PORT=18765;
const URL='http://127.0.0.1:'+PORT+'/candidate.html';

await fs.mkdir(OUT,{recursive:true});
const candidateBytes=await fs.readFile(path.join(ROOT,REL));
const gitHeader=Buffer.from('blob '+candidateBytes.length+'\0');
const candidateBlob=crypto.createHash('sha1').update(gitHeader).update(candidateBytes).digest('hex');

const result={
 schema:'prometeo.jose-v12-map-runtime-browser-result/v1',
 target_url:URL,
 checked_at:new Date().toISOString(),
 outcome:'FAIL',
 candidate:{path:REL,expected_blob:EXPECTED_CANDIDATE_BLOB,observed_blob:candidateBlob},
 v11:{expected_sha256:EXPECTED_V11_SHA256,status_text:null,sha_gate:null},
 topic_menu:{expected:['Index Laws','Factorization','Quadratics','Simultaneous Equations'],observed:[]},
 map:{topic_selected:null,rail_descriptor:null,level_count:null,round_count:null,status_text:null},
 ab_toggle:{initial:null,v11_intact:null,v12_restored:null},
 checks:[],
 console_errors:[],
 page_errors:[]
};
const add=(name,status,evidence=null)=>result.checks.push({name,status,evidence});
const must=(condition,name,evidence,code=name)=>{
 if(!condition){add(name,'FAIL',evidence);const e=new Error(code);e.failureCode=code;throw e;}
 add(name,'PASS',evidence);
};

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
 const u=new globalThis.URL(req.url,'http://127.0.0.1');
 if(u.pathname!=='/candidate.html'){res.writeHead(404,{'content-type':'text/plain'});res.end('not found');return;}
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
 res.end(candidateBytes);
});
await new Promise((resolve,reject)=>server.listen(PORT,'127.0.0.1',err=>err?reject(err):resolve()));

let browser,terminal;
try{
 must(candidateBlob===EXPECTED_CANDIDATE_BLOB,'exact-current-candidate-blob',{expected:EXPECTED_CANDIDATE_BLOB,observed:candidateBlob});

 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();
 page.on('console',m=>{if(m.type()==='error')result.console_errors.push(m.text())});
 page.on('pageerror',e=>result.page_errors.push(String(e?.message||e)));

 const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:TIMEOUT});
 must(Boolean(response)&&response.status()===200,'candidate-local-http',{status:response?.status()??null});

 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('V11 SHA-256 PASS'),{timeout:TIMEOUT});
 result.v11.status_text=await page.locator('#status').innerText();
 result.v11.sha_gate='PASS';
 must(!await page.locator('#fatal').evaluate(el=>el.classList.contains('show')),'v11-sha256-runtime-gate',{status:result.v11.status_text,expected_sha256:EXPECTED_V11_SHA256});

 const frame=page.frames().find(f=>f.parentFrame()===page.mainFrame()&&f.url()==='about:srcdoc');
 must(Boolean(frame),'v11-srcdoc-frame-present',{frames:page.frames().map(f=>f.url())});
 await frame.locator('body').waitFor({state:'visible',timeout:TIMEOUT});

 result.topic_menu.observed=await frame.locator('body').evaluate((body,names)=>{
   const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
   return names.filter(name=>Array.from(body.querySelectorAll('*')).some(el=>visible(el)&&(el.textContent||'').trim()===name));
 },result.topic_menu.expected);
 must(result.topic_menu.observed.length===4,'four-topic-course-menu-preserved',{observed:result.topic_menu.observed});

 const clicked=await frame.locator('body').evaluate((body,name)=>{
   const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
   const matches=Array.from(body.querySelectorAll('*')).filter(el=>visible(el)&&(el.textContent||'').trim()===name);
   if(!matches.length)return null;
   matches.sort((a,b)=>a.children.length-b.children.length || a.getBoundingClientRect().width-b.getBoundingClientRect().width);
   const el=matches[0];
   el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
   return {tag:el.tagName,id:el.id||null,className:typeof el.className==='string'?el.className:null,text:(el.textContent||'').trim()};
 },'Index Laws');
 must(Boolean(clicked),'topic-local-map-entry-click',{clicked});
 result.map.topic_selected='Index Laws';

 await page.waitForFunction(()=>/niveles/.test(document.querySelector('#status')?.textContent||''),{timeout:TIMEOUT});
 await page.waitForTimeout(350);
 result.map.status_text=await page.locator('#status').innerText();
 const observedMap=await frame.locator('html').evaluate(root=>{
   const rail=root.querySelector('[data-prometeo-v12-rail]');
   const levels=Array.from(root.querySelectorAll('[data-prometeo-v12-level]'));
   const rounds=Array.from(root.querySelectorAll('[data-prometeo-v12-round]'));
   const descriptor=rail?rail.tagName.toLowerCase()+(rail.id?'#'+rail.id:'')+(typeof rail.className==='string'&&rail.className.trim()?'.'+rail.className.trim().split(/\s+/).slice(0,3).join('.'):''):null;
   return {rail_descriptor:descriptor,level_count:levels.length,round_count:rounds.length,v12_on:root.classList.contains('prometeo-v12-on')};
 });
 Object.assign(result.map,{rail_descriptor:observedMap.rail_descriptor,level_count:observedMap.level_count,round_count:observedMap.round_count});
 must(Boolean(observedMap.rail_descriptor),'topic-local-rail-detected',observedMap);
 must(observedMap.level_count===12,'topic-local-12-levels',{level_count:observedMap.level_count,status:result.map.status_text});
 must(result.topic_menu.observed.length===4&&observedMap.level_count===12,'topics-not-flattened-into-one-rail',{course_topics:result.topic_menu.observed.length,topic_local_levels:observedMap.level_count,round_count:observedMap.round_count});
 add('round-count-recorded','PASS',{round_count:observedMap.round_count,status:result.map.status_text});

 const toggle=page.locator('#toggle');
 must(!(await toggle.isDisabled()),'ab-toggle-enabled',{text:await toggle.innerText()});
 result.ab_toggle.initial={button_text:await toggle.innerText(),v12_on:observedMap.v12_on,status:result.map.status_text};
 await toggle.click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('V12 apagado'),{timeout:TIMEOUT});
 const off=await frame.locator('html').evaluate(root=>({v12_on:root.classList.contains('prometeo-v12-on'),body_visible:Boolean(root.querySelector('body'))}));
 result.ab_toggle.v11_intact={...off,button_text:await toggle.innerText(),status:await page.locator('#status').innerText()};
 must(!off.v12_on&&off.body_visible,'ab-toggle-v11-intact-available',result.ab_toggle.v11_intact);

 await toggle.click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('V12 activo'),{timeout:TIMEOUT});
 const on=await frame.locator('html').evaluate(root=>({v12_on:root.classList.contains('prometeo-v12-on')}));
 result.ab_toggle.v12_restored={...on,button_text:await toggle.innerText(),status:await page.locator('#status').innerText()};
 must(on.v12_on,'ab-toggle-v12-restored',result.ab_toggle.v12_restored);

 await page.screenshot({path:path.join(OUT,'jose-v12-index-laws.png'),fullPage:true});
 must(result.console_errors.length===0,'no-console-errors',result.console_errors);
 must(result.page_errors.length===0,'no-page-errors',result.page_errors);
 result.outcome='PASS';
}catch(e){
 terminal=e;
 result.failure_code=e?.failureCode||e?.message||'VERIFY_FAILED';
}finally{
 result.finished_at=new Date().toISOString();
 await fs.writeFile(path.join(OUT,'result.json'),JSON.stringify(result,null,2)+'\n','utf8');
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(()=>resolve()));
}
console.log(JSON.stringify(result,null,2));
if(terminal)process.exitCode=1;
