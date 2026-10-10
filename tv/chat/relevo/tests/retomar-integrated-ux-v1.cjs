#!/usr/bin/env node
/* Human mobile acceptance: actual candidate HTML, owner JSON and PR78 original SVG over HTTP.
   GitHub API is 403-controlled; owner relay history comes from checkout (not fake messages).
   The source on this stacked PR may lag gh-pages latest: do not call it deployed/served. */
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir,stat,writeFile}=require('node:fs/promises');
const path=require('node:path');
const {once}=require('node:events');
const {chromium}=require('playwright');
const root=process.cwd(),dir=path.join(root,'artifacts/retomar-integrated-ux');
const checks=[],errors=[];
const record=(x)=>{checks.push(x);console.log('PASS',x)};
(async()=>{
await mkdir(dir,{recursive:true});
const owner=JSON.parse(await readFile(path.join(root,'tv/chat/relevo/STATE_V1.json'),'utf8'));
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(!pathname.startsWith('/prometeo/')){res.writeHead(404);return res.end('Not found');}
 let p=decodeURIComponent(pathname.slice('/prometeo/'.length));if(p.endsWith('/'))p+='index.html';
 const target=path.resolve(root,p);
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 try{if(!(await stat(target)).isFile())throw Error('Not a file');
 const buffer=await readFile(target),mime=p.endsWith('.html')?'text/html':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':'text/plain';
 res.writeHead(200,{'content-type':mime+'; charset=utf-8','cache-control':'no-store'});res.end(buffer);}catch{res.writeHead(404);res.end('Not found');}
});
let browser;
try{
server.listen(0,'127.0.0.1');await once(server,'listening');
const url='http://127.0.0.1:'+server.address().port+'/prometeo/tv/chat/relevo/retomar/';
browser=await chromium.launch({headless:true,args:['--no-sandbox']});
for(const width of [360,390,430,844,1440]){
 const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(width+':'+e.message));
 await page.route('https://api.github.com/repos/JuanManuelPM/prometeo/**',r=>r.fulfill({status:403,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"message":"No auth in this test"}'}));
 const nav=await page.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(nav.status(),200);
 await page.waitForFunction(()=>document.querySelectorAll('#track .project').length===5);
 await page.waitForFunction(()=>document.querySelectorAll('#activityRows article').length>0);
 assert.equal(await page.locator('h1').innerText(),'Proyectos');
 assert.equal(await page.locator('.intro').count(),0,'PowerPoint explanation remains');
 assert.equal(await page.locator('#track img').count(),3,'Original art covers absent');
 assert.ok(await page.locator('#track img').evaluateAll(nodes=>nodes.every(img=>img.complete&&img.naturalWidth>0)),'Covers failed HTTP');
 assert.equal(await page.locator('#track .project').count(),5);
 const text=await page.locator('#activityRows').innerText();
 assert.ok(text.includes('Relevo '+owner.last_hop),'Source history not represented');
 assert.ok(text.includes('Argentina'),'Missing AR timestamps');
 assert.ok(!(await page.locator('.evidence-drawer').evaluate(el=>el.open)),'Technical details dominate home');
 const numbers=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,rail:document.querySelector('#track').scrollWidth,client:document.querySelector('#track').clientWidth,card:document.querySelector('.project').getBoundingClientRect().width,activityY:document.querySelector('#activityTitle').getBoundingClientRect().top,meta:parseFloat(getComputedStyle(document.querySelector('.carddate')).fontSize)}));
 assert.equal(numbers.width,width,'Viewport scaled incorrectly');
 assert.ok(numbers.scroll<=width+1,'Global horizontal overflow: '+JSON.stringify(numbers));
 assert.ok(numbers.meta>=14,'Metadata too small');
 if(width===390){const visible=numbers.client/(numbers.card+12);
 assert.ok(visible>=1.2&&visible<=1.6,'Expected approx 1.2–1.5 cards, saw '+visible);
 assert.ok(numbers.activityY<850,'No activity in first screen');}
 await page.screenshot({path:path.join(dir,'integrated-'+width+'.png'),fullPage:true});
 record(width+'px: real HTTP + PR78 art + source activity + mobile hierarchy');
 if(width===390){
  await page.getByRole('button',{name:'Facultad'}).click();
  assert.match(page.url(),/#facultad$/);
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-project="persistencia"]')?.getAttribute('aria-pressed')==='true');
  await page.goForward({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-project="facultad"]')?.getAttribute('aria-pressed')==='true');
  record('Browser Back/Forward restores project without a second UI');
  await page.locator('.evidence-drawer summary').click();
  await page.waitForFunction(()=>document.querySelector('#liveProofRows').textContent.includes('NO VERIFICADOS'));
  record('Technical source evidence is expandable and GitHub 403 visible without fake release');
  // Cold cross-chat recovery using actual public owner bytes, not a fabricated fixture.
  // UI remains localhost candidate and is NOT mislabelled as the published version.
  const liveResponse=await fetch('https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/STATE_V1.json',{headers:{'cache-control':'no-cache'}});
  assert.equal(liveResponse.status,200,'Cannot fetch REAL owner for cross-chat recovery');
  const liveState=await liveResponse.json();
  assert.ok(liveState.last_hop>=5&&liveState.history.length>=5,'Real public owner has lost HOP5');
  assert.ok(liveState.history.some(e=>e.hop===5&&typeof e.episode_ref==='string'),'HOP5 lacks durable owner receipt');
  await page.route('**/prometeo/tv/chat/relevo/STATE_V1.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(liveState)}));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(hop=>document.querySelector('#activityRows')?.textContent?.includes('Relevo '+hop),liveState.last_hop);
  await page.locator('#track [data-project="persistencia"]').click();
  await page.waitForFunction(n=>document.querySelectorAll('#relayRows a').length===n,Math.min(8,liveState.history.length));
  assert.equal(await page.locator('#relayRows a').count(),Math.min(8,liveState.history.length));
  await page.screenshot({path:path.join(dir,'cold-crosschat-live-owner-390.png'),fullPage:true});
  record('REAL gh-pages STATE HOP'+liveState.last_hop+' recovered into candidate via owner HTTP body');

 }
 await context.close();
}
assert.deepEqual(errors,[],'Uncaught JS errors');
record('No browser exceptions');
} finally{
 await browser?.close();server.close();await once(server,'close');
 await writeFile(path.join(dir,'result.json'),JSON.stringify({status:errors.length?'FAIL':'PASS',scope:'HTTP_LOCAL_CANDIDATE',source_history_hop:owner.last_hop,real_chat_responses:false,pages_published:false,viewports:[360,390,430,844,1440],checks,errors},null,2));
}
console.log('INTEGRATED_VISUAL_BROWSER_PASS',checks.length);
})().catch(e=>{console.error(e);process.exitCode=1});
