#!/usr/bin/env node
/* Post-merge REAL Pages proof. Fetches production bytes and Chromium DOM.
 * On a newer source commit intervening, fail closed rather than inventing served status. */
const assert=require('node:assert/strict');
const {readFile,mkdir,writeFile}=require('node:fs/promises');
const {createHash}=require('node:crypto');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'artifacts/j01-m01-served');
const htmlPath='tv/chat/relevo/retomar/index.html';
const dataPath='tv/chat/relevo/retomar/reentrada.json';
const base='https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/';
const blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const expected={html:blob(await readFile(path.join(root,htmlPath))),registry:blob(await readFile(path.join(root,dataPath)))};
const receipt={schema:'prometeo.j01-m01.served-proof.v1',source_sha:process.env.GITHUB_SHA||'unknown',expected,checks:[],errors:[],state:'NOT_VERIFIED',observed_at_utc:new Date().toISOString()};
await mkdir(out,{recursive:true});
const got=async(url)=>{const r=await fetch(url,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(25000)});return {status:r.status,bytes:Buffer.from(await r.arrayBuffer())}};
let browser;
try{
 let matched=false,served={};
 for(let attempt=0;attempt<36;attempt++){
  const q='?proof='+expected.html.slice(0,9)+'-'+attempt;
  const [h,j]=await Promise.all([got(base+q),got(base+'reentrada.json'+q)]);
  served={page_status:h.status,data_status:j.status,html:blob(h.bytes),registry:blob(j.bytes),attempt};
  if(h.status===200&&j.status===200&&served.html===expected.html&&served.registry===expected.registry){matched=true;break}
  if(attempt<35)await new Promise(resolve=>setTimeout(resolve,10000));
 }
 receipt.source_and_pages=served;
 assert.ok(matched,'PAGES_SOURCE_MISMATCH: no equivalent served HTML+JSON during bounded publication interval');
 receipt.checks.push('Production HTTP HTML+registry 200, Git blob hashes identical to merged checked-out source');
 const registry=JSON.parse((await readFile(path.join(root,dataPath))).toString());
 const actual=registry.public_receipts.filter(r=>r.work_id==='j01-m01-integration-20261010');
 assert.equal(actual.filter(r=>r.state==='REQUEST_CAPTURED').length,1,'Real capture must be unique');
 assert.ok(actual.some(r=>r.state==='CANDIDATE'),'Candidate work history must be preserved');
 assert.ok(actual.every(r=>r.state!=='BLOCKED'),'Unresolved blocked work cannot be claimed served');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [360,390,430,844,1440]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:width<500?2:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const r=await page.goto(base+'?browser='+Date.now()+'-'+width,{waitUntil:'domcontentloaded'});
  assert.equal(r.status(),200);
  await page.waitForFunction(()=>document.querySelector('[data-work-id="j01-m01-integration-20261010"]'),{timeout:20000});
  const item=page.locator('[data-work-id="j01-m01-integration-20261010"]');
  assert.match(await item.innerText(),/Integración J01 \+ M01/);
  assert.match(await item.innerText(),/Argentina/);
  assert.equal(await item.count(),1);
  const geometries=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,projects:document.querySelectorAll('#track .project').length}));
  assert.ok(geometries.scroll<=width+2,'Mobile overflow '+JSON.stringify(geometries));
  assert.ok(geometries.projects>=7,'Lost older projects');
  assert.deepEqual(errors,[],'Uncaught browser exceptions');
  await page.screenshot({path:path.join(out,'served-'+width+'.png'),fullPage:true});
  receipt.checks.push('Public Chromium '+width+'px: actual ACK, dates, seven projects, no overflow, no page errors');
  await page.close();
 }
 receipt.state='SERVED_VERIFIED';receipt.verified_at_utc=new Date().toISOString();
 console.log('PASS PUBLIC J01/M01 SERVED',JSON.stringify({source:receipt.source_sha,served,checks:receipt.checks.length}));
}catch(e){
 receipt.state='BLOCKED';receipt.errors.push(e.stack||String(e));console.error('BLOCKED PUBLIC J01/M01',e.stack||e);process.exitCode=1;
}finally{await browser?.close();await writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));}
