import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const TARGET='https://juanmanuelpm.github.io/prometeo/__canary/portfolio-alumnos-student-world-live-route-bridge-v1/';
const DONOR='https://juanmanuelpm.github.io/prometeo/pages/PROMETEO_STUDENT_WORLD_MAP_FIXED_OPEN_ME.html';
const JOSE_STUDY='https://juanmanuelpm.github.io/jose-study/';
const JOSE_ALGEBRA='https://juanmanuelpm.github.io/prometeo/pages/JOSE_RECUPERACION_ALGEBRA_FINAL.html';
const EXPECTED_CANARY_BLOB='35133e9a92ad7014b3ef3cfa46be15e36e4d4266';
const EXPECTED_DONOR_BLOB='a2f7a16beaf2d6c44556c87434bccfc4cb168b50';
const CANARY_API='https://api.github.com/repos/JuanManuelPM/prometeo/contents/__canary/portfolio-alumnos-student-world-live-route-bridge-v1/index.html?ref=gh-pages';
const DONOR_API='https://api.github.com/repos/JuanManuelPM/prometeo/contents/pages/PROMETEO_STUDENT_WORLD_MAP_FIXED_OPEN_ME.html?ref=gh-pages';
const OUT=process.env.ALUMNOS_BRIDGE_ARTIFACT_DIR||'artifacts/alumnos-student-world-live-route-bridge-browser-verify';
const TIMEOUT=Number(process.env.ALUMNOS_BRIDGE_TIMEOUT_MS||45000);

await fs.mkdir(OUT,{recursive:true});
const result={
 schema:'prometeo.alumnos-student-world-live-route-bridge-browser-result/v1',
 target_url:TARGET,
 checked_at:new Date().toISOString(),
 outcome:'FAIL',
 checks:[],
 source_identity:{expected_blob:EXPECTED_CANARY_BLOB,observed_blob:null,classification:null,served_sha256:null},
 donor:{expected_blob:EXPECTED_DONOR_BLOB,observed_blob:null,classification:null,src:null,frame_url:null},
 destinations:{},
 console_errors:[],
 page_errors:[]
};
const add=(name,status,evidence=null)=>result.checks.push({name,status,evidence});
const must=(cond,name,evidence,code=name)=>{if(!cond){add(name,'FAIL',evidence);const e=new Error(code);e.failureCode=code;throw e;} add(name,'PASS',evidence);};
let browser,page,terminal;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 page=await context.newPage();
 page.on('console',m=>{if(m.type()==='error')result.console_errors.push(m.text())});
 page.on('pageerror',e=>result.page_errors.push(String(e?.message||e)));

 const response=await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:TIMEOUT});
 must(Boolean(response)&&response.status()<400,'public-canary-document',{status:response?.status()??null,final_url:page.url()});

 const served=await response.body();
 result.source_identity.served_sha256=crypto.createHash('sha256').update(served).digest('hex');

 const canaryApi=await context.request.get(CANARY_API,{headers:{Accept:'application/vnd.github+json'}});
 must(canaryApi.ok(),'canary-github-contents-api',{status:canaryApi.status()});
 result.source_identity.observed_blob=(await canaryApi.json()).sha||null;
 result.source_identity.classification=result.source_identity.observed_blob===EXPECTED_CANARY_BLOB?'MATCH':'DRIFT';
 add('canary-source-identity',result.source_identity.classification==='MATCH'?'PASS':'PASS_WITH_REPORTED_DRIFT',{expected:EXPECTED_CANARY_BLOB,observed:result.source_identity.observed_blob,served_sha256:result.source_identity.served_sha256});

 await page.waitForSelector('#routeToggle',{state:'visible',timeout:TIMEOUT});
 await page.waitForSelector('#world',{state:'attached',timeout:TIMEOUT});
 result.donor.src=await page.locator('#world').getAttribute('src');
 must(result.donor.src===DONOR,'donor-route-pinned',{expected:DONOR,observed:result.donor.src});

 await page.waitForFunction(url=>Array.from(document.querySelectorAll('iframe')).some(f=>f.src===url),DONOR,{timeout:TIMEOUT});
 const frame=page.frames().find(f=>f.url()===DONOR)||await page.locator('#world').contentFrame();
 if(frame){
   await frame.locator('body').waitFor({state:'visible',timeout:TIMEOUT});
   result.donor.frame_url=frame.url();
 }
 must(Boolean(frame)&&result.donor.frame_url===DONOR,'embedded-student-world-rendered',{frame_url:result.donor.frame_url});

 const donorApi=await context.request.get(DONOR_API,{headers:{Accept:'application/vnd.github+json'}});
 must(donorApi.ok(),'donor-github-contents-api',{status:donorApi.status()});
 result.donor.observed_blob=(await donorApi.json()).sha||null;
 result.donor.classification=result.donor.observed_blob===EXPECTED_DONOR_BLOB?'MATCH':'DRIFT';
 add('donor-source-identity',result.donor.classification==='MATCH'?'PASS':'PASS_WITH_REPORTED_DRIFT',{expected:EXPECTED_DONOR_BLOB,observed:result.donor.observed_blob});

 await page.waitForFunction(()=>['MATCH','DRIFT','UNVERIFIED'].includes(document.querySelector('#donorState')?.textContent||''),{timeout:TIMEOUT});
 add('in-page-donor-guard','PASS',{state:await page.locator('#donorState').innerText(),title:await page.locator('#donorState').getAttribute('title')});

 const toggle=page.locator('#routeToggle'),routes=page.locator('#routes');
 await toggle.click();
 await page.waitForFunction(()=>document.querySelector('#routes')?.classList.contains('open'));
 must(await toggle.getAttribute('aria-expanded')==='true','route-rail-open',{aria_expanded:await toggle.getAttribute('aria-expanded')});
 await toggle.click();
 await page.waitForFunction(()=>!document.querySelector('#routes')?.classList.contains('open'));
 must(await toggle.getAttribute('aria-expanded')==='false','route-rail-close',{aria_expanded:await toggle.getAttribute('aria-expanded')});
 await toggle.click();
 await page.waitForFunction(()=>document.querySelector('#routes')?.classList.contains('open'));
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('#routes')?.classList.contains('open'));
 must(await toggle.getAttribute('aria-expanded')==='false','route-rail-escape-close',{aria_expanded:await toggle.getAttribute('aria-expanded')});

 async function viewportCheck(width,height,label){
   await page.setViewportSize({width,height});
   await toggle.click();
   await page.waitForFunction(()=>document.querySelector('#routes')?.classList.contains('open'));
   await page.waitForTimeout(250);
   const geom=await page.evaluate(()=>{
     const t=document.querySelector('#routeToggle').getBoundingClientRect();
     const r=document.querySelector('#routes').getBoundingClientRect();
     return {innerWidth,innerHeight,toggle:{left:t.left,right:t.right,top:t.top,bottom:t.bottom,width:t.width,height:t.height},routes:{left:r.left,right:r.right,width:r.width},aria:document.querySelector('#routeToggle').getAttribute('aria-expanded')};
   });
   const inside=geom.toggle.left>=-1&&geom.toggle.right<=geom.innerWidth+1&&geom.toggle.top>=-1&&geom.toggle.bottom<=geom.innerHeight+1;
   const attached=Math.abs(geom.toggle.right-geom.routes.left)<=2;
   must(inside&&attached,`resize-${label}-control-not-stranded`,geom);
   await page.screenshot({path:path.join(OUT,`${label}.png`),fullPage:true});
   await page.keyboard.press('Escape');
 }
 await viewportCheck(360,780,'mobile-360x780');
 await viewportCheck(1280,800,'desktop-1280x800');

 const links=await page.locator('#routes a.route').evaluateAll(as=>as.map(a=>({href:a.href,text:(a.textContent||'').replace(/\s+/g,' ').trim()})));
 must(links.some(x=>x.href===JOSE_STUDY)&&links.some(x=>x.href===JOSE_ALGEBRA),'navigation-targets-exact',links);
 for(const [name,url] of [['jose_study',JOSE_STUDY],['jose_algebra',JOSE_ALGEBRA]]){
   const r=await context.request.get(url,{timeout:TIMEOUT});
   result.destinations[name]={url,status:r.status(),final_url:r.url()};
   must(r.status()<400,`navigation-${name}-resolves`,result.destinations[name]);
 }

 const authority=await page.locator('meta[name="prometeo-authority"]').getAttribute('content');
 must(authority==='CANDIDATE_NOT_CURRENT_NOT_SERVED','candidate-only-authority',{authority});

 result.outcome='PASS';
}catch(e){
 terminal=e;
 result.failure_code=e?.failureCode||e?.message||'VERIFY_FAILED';
}finally{
 result.finished_at=new Date().toISOString();
 await fs.writeFile(path.join(OUT,'result.json'),JSON.stringify(result,null,2)+'\n','utf8');
 if(browser)await browser.close();
}
console.log(JSON.stringify(result,null,2));
if(terminal)process.exitCode=1;
