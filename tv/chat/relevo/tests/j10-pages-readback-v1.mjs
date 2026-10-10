// Proof of currently SERVED bytes and a real remote Chromium run, never localhost.
// Source is the latest branch checkout, not PR97's candidate, with bounded retry for Pages propagation.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import path from 'node:path';

const files=['tv/chat/relevo/retomar/index.html',
 'tv/chat/relevo/retomar/j10-editorial.css',
 'tv/chat/relevo/retomar/art/j10-atlas-384.webp.b64'];
const base='https://juanmanuelpm.github.io/prometeo/';
const evidence=path.join(process.cwd(),'artifacts/retomar-pr77-http');
await mkdir(evidence,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected=await Promise.all(files.map(async p=>({path:p,sha256:hash(await readFile(p))})));
let latest=[],matched=false,attempts=0;
for(let i=0;i<10;i++){
 attempts=i+1;
 latest=await Promise.all(expected.map(async source=>{
  try{
   const result=await fetch(base+source.path+'?readback=J10-36e98d83',{
    headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(12000)});
   if(!result.ok)return {path:source.path,status:result.status,matched:false};
   const actual=hash(Buffer.from(await result.arrayBuffer()));
   return {path:source.path,status:result.status,matched:actual===source.sha256,
     source_sha256:source.sha256,served_sha256:actual};
  }catch(e){return {path:source.path,error:String(e),matched:false};}
 }));
 if(latest.every(x=>x.matched)){matched=true;break;}
 if(i<9)await new Promise(resolve=>setTimeout(resolve,6000));
}
const proof={checked_at_utc:new Date().toISOString(),scope:'HTTP_REAL_GITHUB_PAGES',expected,
 pages:latest,attempts,bytes_verified:matched,chromium_verified:false,
 widths:[390,1440],art_decoded:false};
await writeFile(path.join(evidence,'j10-pages-result.json'),JSON.stringify(proof,null,2));
assert.ok(matched,'GitHub Pages bytes do not match latest gh-pages source: '+JSON.stringify(latest));
console.log('J10_PAGES_BYTES_MATCH',attempts,JSON.stringify(latest));

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of proof.widths){
  const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,
    isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+'tv/chat/relevo/retomar/?readback=J10-36e98d83',{
    waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.getElementById('atlasFigure')?.dataset.art==='j10'&&
    document.getElementById('atlasImage')?.naturalWidth===384,null,{timeout:15000});
  await page.waitForFunction(()=>document.querySelectorAll('#track .project').length>=5);
  await page.waitForFunction(()=>{
   const rows=[...document.querySelectorAll('#activityRows article')];
   return rows.length>=5&&rows.every(row=>row.querySelector('time')?.textContent.includes('Argentina'));
  },null,{timeout:30000});
  const state=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth>innerWidth+1,
   mobileScene:getComputedStyle(document.querySelector('.j10-atlas')).display,
   mobileCover:getComputedStyle(document.querySelector('.j10-mobile-cover')).display,
   activity:document.querySelector('#activityTitle').getBoundingClientRect().top,
   activityRows:document.querySelectorAll('#activityRows article').length,
   img:document.getElementById('atlasImage').naturalWidth
  }));
  assert.equal(state.overflow,false,'Horizontal overflow in served Pages at '+width);
  assert.equal(state.mobileScene,width===390?'none':'grid');
  assert.equal(state.mobileCover,width===390?'block':'none');
  assert.equal(state.img,384);
  assert.ok(state.activityRows>=5,'Published activity feed did not load');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(evidence,'j10-pages-'+width+'.png'),fullPage:true});
  console.log('J10_PAGES_CHROMIUM_PASS',width,JSON.stringify(state));
  await context.close();
 }
 proof.chromium_verified=true;proof.art_decoded=true;
 await writeFile(path.join(evidence,'j10-pages-result.json'),JSON.stringify(proof,null,2));
}finally{await browser.close();}
console.log('J10_SERVED_VERIFIED',proof.checked_at_utc);
