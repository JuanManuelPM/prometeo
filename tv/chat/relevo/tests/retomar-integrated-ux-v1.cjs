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
const catalog=JSON.parse(await readFile(path.join(root,'tv/chat/relevo/retomar/reentrada.json'),'utf8'));
const initialProjectCount=catalog.projects.length;
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
for(const width of [360,390,430,480,844,1440]){
 const context=await browser.newContext({viewport:{width,height:width===480?1800:850},deviceScaleFactor:width<=480?2:1,isMobile:width<=480,hasTouch:width<=480});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(width+':'+e.message));
 await page.route('https://api.github.com/repos/JuanManuelPM/prometeo/**',r=>r.fulfill({status:403,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"message":"No auth in this test"}'}));
 const nav=await page.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(nav.status(),200);
 await page.waitForFunction(n=>document.querySelectorAll('#track .project').length===n,initialProjectCount);
 await page.waitForFunction(()=>document.querySelectorAll('#activityRows article').length>0);
 assert.equal(await page.locator('h1').innerText(),'Proyectos');
 assert.match(await page.locator('.entry-note').innerText(),/cualquier chat de este Proyecto/);
 assert.match(await page.locator('.entry-note').innerText(),/audio transcripto/);
 assert.match(await page.locator('#watchStatus').innerText(),/Consulta cada minuto/);
 assert.equal(await page.locator('.intro').count(),0,'PowerPoint explanation remains');
 // J10: verify the real served-by-localhost illustration bytes decode before any visual claim.
 await page.waitForFunction(()=>document.querySelector('#atlasFigure')?.dataset.art==='j10'&&
   document.querySelector('.j10-mobile-cover')?.complete&&document.querySelector('.j10-mobile-cover')?.naturalWidth===384);
 assert.equal(await page.locator('#track img').count(),2,'Exactly two original raster covers: PR88 and J10');
 const newArt=await page.locator('#atlasImage').evaluate(img=>({w:img.naturalWidth,h:img.naturalHeight,loaded:img.complete}));
 assert.deepEqual(newArt,{w:384,h:256,loaded:true},'J10 illustration missing or corrupt');
 const presentation=await page.evaluate(()=>({
   atlas:getComputedStyle(document.querySelector('.j10-atlas')).display,
   cover:getComputedStyle(document.querySelector('.j10-mobile-cover')).display
 }));
 assert.equal(presentation.atlas,width<=720?'none':'grid','Editorial scene should not crowd mobile');
 assert.equal(presentation.cover,width<=720?'block':'none','One illustrative project, no duplicate art');
 record(width+'px: J10 original illustrated WebP decodes, responsive presentation, no SVG geometry');
 assert.equal(await page.locator('#track .cover-lettering').count(),initialProjectCount-1,'All non-raster projects need typographic covers');
 assert.equal(await page.locator('#track img[src$=".svg"]').count(),0,'Rejected geometric SVG cover returned');
 assert.ok(await page.locator('#track img').evaluateAll(nodes=>nodes.every(img=>img.complete&&img.naturalWidth>0)),'Covers failed HTTP');
 assert.equal(await page.locator('#track .project').count(),initialProjectCount);
 // FEATURE-01..04: real PR88 owner data appears on the SAME HOP8 page,
 // never promoted into a fictitious served redesign or synthetic chat timeline.
 await page.waitForFunction(()=>!document.querySelector('#workArchive')?.hidden);
 const dossier=page.locator('#workArchive');
 assert.match(await dossier.innerText(),/Archivo Habitado/);
 assert.equal(await dossier.locator('.work-expanded').count(),1,'Dossier research must be collapsible');
 assert.equal(await dossier.locator('.work-expanded').evaluate(el=>el.open),false,'Long research hides by default');
 await dossier.locator('.work-expanded summary').click();
 assert.match(await dossier.innerText(),/Ciudad Isométrica/);
 assert.match(await dossier.innerText(),/Observatorio Monumental/);
 assert.match(await dossier.innerText(),/NO está publicado ni aprobado/);
 assert.match(await dossier.innerText(),/256 × 171/);
 assert.match(await dossier.innerText(),/hora desconocida/);
 assert.match(await dossier.innerText(),/14:29/);
 assert.match(await dossier.innerText(),/14:33/);
 assert.ok(!(await dossier.innerText()).includes('Pedido enviado a las'),'Never invent audio request timestamp');
 assert.equal(await dossier.locator('.work-alt').count(),3);
 await page.waitForFunction(()=>{const im=document.querySelector('#workArchive .work-art img');return im&&im.complete&&im.naturalWidth===256&&im.naturalHeight===171});
 assert.equal(await dossier.locator('a[href="https://github.com/JuanManuelPM/prometeo/pull/88"]').count(),1);
 assert.equal(await page.locator('#track .project').count(),initialProjectCount,'Candidate creates duplicate top-level project');
 assert.match(await page.locator('#activityRows').innerText(),/Archivo Habitado/);
 const pos=await page.evaluate(()=>({activity:document.querySelector('#activityTitle').getBoundingClientRect().top,archive:document.querySelector('#workArchive').getBoundingClientRect().top}));
 assert.ok(pos.activity<pos.archive,'Project activity must remain above the long archive');
 record(width+'px: genuine PR88 1-bit PNG + three research options + truthful candidate and Argentina timeline');
 const text=await page.locator('#activityRows').innerText();
 assert.ok(text.includes('Relevo '+owner.last_hop),'Source history not represented');
 assert.ok(text.includes('Argentina'),'Missing AR timestamps');
 assert.ok(!(await page.locator('.evidence-drawer').evaluate(el=>el.open)),'Technical details dominate home');
 const activityCheck=await page.locator('#activityRows article').evaluateAll(rows=>rows.map(row=>({
    at:Date.parse(row.dataset.occurredAt),
    text:row.querySelector('time')?.textContent||'',
    font:parseFloat(getComputedStyle(row.querySelector('strong')).fontSize),
    meta:parseFloat(getComputedStyle(row.querySelector('time')).fontSize)
 })));
 assert.ok(activityCheck.length>=5,'Missing real activity');
 const viewport=await page.evaluate(()=>({
   inner:innerWidth,client:document.documentElement.clientWidth,visual:visualViewport?.width,
   zoom:visualViewport?.scale,docScroll:document.documentElement.scrollWidth,
   bg:getComputedStyle(document.body).backgroundColor,
   mainFont:parseFloat(getComputedStyle(document.body).fontSize),
   card:document.querySelector('#track .project').getBoundingClientRect().width,
   coverFont:parseFloat(getComputedStyle(document.querySelector('.cover-lettering')).fontSize),
   mobile:matchMedia('(max-width:639px)').matches
 }));
 assert.equal(viewport.inner,width,'Viewport meta has desktop-shrunk the mobile page');
 assert.equal(viewport.client,width,'CSS layout viewport differs from requested width');
 assert.ok(Math.abs(viewport.visual-width)<2,'Visual viewport unexpectedly shrunk');
 assert.ok(Math.abs(viewport.zoom-1)<.01,'Unexpected page zoom');
 assert.equal(viewport.bg,'rgb(11, 12, 15)','Old LIGHT theme still overrides dark');
 assert.ok(viewport.mainFont>=18,'Global font is still miniature');
 assert.ok(viewport.docScroll<=width+1,'Global overflow outside project rail');
 if(width<=480){
   assert.ok(viewport.mobile,'Mobile media query did not match');
   assert.ok(viewport.card>=width*.84,'One dominant card is not large enough');
   assert.ok(viewport.coverFont>=40,'Typographic cover too small');
   assert.ok(activityCheck.every(e=>e.font>=22&&e.meta>=17),'Activity text/date still miniature');
 }
 const covers=await page.locator('#track .cover-lettering').evaluateAll(nodes=>nodes.map(n=>({
   text:n.textContent,visible:n.clientWidth,scroll:n.scrollWidth,
   lines:getComputedStyle(n).whiteSpace,font:parseFloat(getComputedStyle(n).fontSize)
 })));
 assert.ok(covers.every(e=>e.lines==='nowrap'&&e.scroll<=e.visible+1),'Project title cropped/wrapped: '+JSON.stringify(covers));
 assert.equal(await page.locator('#track .project[aria-pressed="true"]').first().evaluate(el=>getComputedStyle(el).outlineStyle),'none','Selected project has double ring');
 record(width+'px: no orphan letters, clipped titles or double selection outline');
 record(width+'px: ACTUAL visual/CSS viewport, zoom, dark background and computed text sizes');
 assert.ok(activityCheck.every(e=>Number.isFinite(e.at)&&/Argentina/.test(e.text)),'Each visible activity must include a true Argentina date');
 assert.ok(activityCheck.every((e,i)=>i===0||activityCheck[i-1].at>=e.at),'Activity must be newest-first');
 if(width<=480){
   assert.ok(activityCheck.every(e=>e.font>=18&&e.meta>=14),'Mobile feed text too small');
   assert.ok(await page.locator('#track .project').first().evaluate(el=>el.getBoundingClientRect().width>=innerWidth*.78),'Mobile project cards too tiny');
   assert.ok(await page.locator('#track').evaluate(el=>el.scrollWidth>el.clientWidth),'Projects must swipe horizontally');
 }
 record(width+'px: mobile readable type, full Argentina dates, activity descending, horizontal project rail');
 const numbers=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,rail:document.querySelector('#track').scrollWidth,client:document.querySelector('#track').clientWidth,card:document.querySelector('.project').getBoundingClientRect().width,activityY:document.querySelector('#activityTitle').getBoundingClientRect().top,meta:parseFloat(getComputedStyle(document.querySelector('.carddate')).fontSize)}));
 assert.equal(numbers.width,width,'Viewport scaled incorrectly');
 assert.ok(numbers.scroll<=width+1,'Global horizontal overflow: '+JSON.stringify(numbers));
 assert.ok(numbers.meta>=14,'Metadata too small');
 if(width===390){const visible=numbers.client/(numbers.card+12);
 assert.ok(visible>=1.08&&visible<=1.3,'Expected one dominant mobile project with a peek of the next card, saw '+visible);
 assert.ok(numbers.activityY<850,'No activity in first screen');}
 await page.screenshot({path:path.join(dir,'integrated-'+width+'.png'),fullPage:true});
 record(width+'px: real HTTP + authentic raster/typographic covers + source activity + mobile hierarchy');
 if(width===390){
  await page.getByRole('button',{name:'Facultad'}).click();
  assert.match(page.url(),/#facultad$/);
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-project="persistencia"]')?.getAttribute('aria-pressed')==='true');
  await page.waitForFunction(()=>{
    const rail=document.querySelector('#track')?.getBoundingClientRect();
    const selected=document.querySelector('[data-project="persistencia"]')?.getBoundingClientRect();
    return rail&&selected&&selected.left>=rail.left-2&&selected.right<=rail.right+2;
  },null,{timeout:5000});
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
  // This is an explicitly synthetic FUTURE owner event: proving refresh behavior,
  // never claiming a second human chat actually submitted it.
  const nextHop=liveState.last_hop+1;
  const future={...liveState,last_hop:nextHop,history:[...liveState.history,{
   hop:nextHop,date_utc:'2026-10-10T03:00:00.000Z',
   result:'FUTURE_PUBLIC_FIXTURE_NOT_REAL_CHAT',
   lesson:'Evento público sintético exclusivo del test de actualizaciones',
   episode_ref:'tv/chat/relevo/episodes/TEST-FUTURE-OWNER-ONLY.md'
  }]};
  await page.route('**/prometeo/tv/chat/relevo/STATE_V1.json*',route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify(future)}));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(hop=>document.querySelector('#activityRows')?.textContent.includes('Relevo '+hop),nextHop);
  assert.match(await page.locator('#watchStatus').innerText(),/Consulta cada minuto/);
  await page.waitForFunction(hop=>document.querySelector('#relayRows')?.textContent.includes('Salto '+hop),nextHop,{timeout:5000});
  assert.ok((await page.locator('#relayRows').textContent()).includes('Salto '+nextHop),
   'Selected project did not receive fresh public owner state');
  record('SIMULATED future owner event appears on same OPEN page via focus without reload (NOT a real chat)');
  await page.route('**/prometeo/tv/chat/relevo/STATE_V1.json*',route=>route.abort('failed'));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>document.querySelector('#watchStatus')?.textContent.includes('Relevo sin actualizar'));
  assert.match(await page.locator('#activityRows').innerText(),new RegExp('Relevo '+nextHop));
  record('Offline refresh preserves last verified display with truthful stale status');
  // The same open URL must discover a project added by ANOTHER chat to the
  // existing public projection. This future project is explicitly a fixture,
  // NOT evidence that another chat actually created a product.
  const registry=JSON.parse(await readFile(path.join(root,'tv/chat/relevo/retomar/reentrada.json'),'utf8'));
  const extraProject={id:'laboratorio',label:'Laboratorio',tag:'Proyecto',
   description:'Proyecto de prueba sintético, exclusivo del test local',
   link:'/prometeo/tv/chat/relevo/retomar/',
   source_path:'tv/chat/relevo/STATE_V1.json',source_branch:'gh-pages'};
  const testReceipt={id:'fixture-lab-20261010',project_id:'laboratorio',state:'CANDIDATE',
   title:'Entrega sintética verificable sólo en test',
   summary:'No proviene de un chat real ni acredita publicación.',
   occurred_at_utc:'2026-10-10T14:00:00.000Z',
   source_url:'https://github.com/JuanManuelPM/prometeo/pull/83'};
  const extended={...registry,projects:[...registry.projects,extraProject],
   public_receipts:[...(registry.public_receipts||[]),testReceipt]};
  await page.route('**/prometeo/tv/chat/relevo/retomar/reentrada.json*',r=>r.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify(extended)}));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(n=>document.querySelectorAll('#track .project').length===n,initialProjectCount+1);
  await page.waitForFunction(()=>document.querySelector('[data-project="persistencia"]')?.getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('[data-project="persistencia"]').getAttribute('aria-pressed'),'true',
   'Current Persistencia selection lost when public registry changed');
  await page.waitForFunction(()=>document.querySelector('#activityRows')?.textContent?.includes('Entrega sintética verificable sólo en test'));
  assert.match(await page.locator('#activityRows').innerText(),/Recibo público · Cambio candidato/);
  record('SIMULATED per-project candidate receipt is visible with truthful status and GitHub owner');
  assert.equal(await page.locator('[data-project="persistencia"]').count(),1,
   'Concurrent old project vanished');
  await page.locator('[data-project="laboratorio"]').click();
  assert.match(page.url(),/#laboratorio$/);
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-project="persistencia"]')?.getAttribute('aria-pressed')==='true');
  record('SIMULATED new project appears without reload; existing projects and Back selection survive');
  // An invalid projection must never discard a previously verified catalog.
  await page.route('**/prometeo/tv/chat/relevo/retomar/reentrada.json*',r=>r.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({...extended,
     projects:[...extended.projects,extraProject]})}));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('No se pudo comprobar el catálogo'));
  assert.equal(await page.locator('#track .project').count(),initialProjectCount+1);
  record('Malformed/duplicate registry rejected; previously loaded projects remain available');

 }
 await context.close();
}
assert.deepEqual(errors,[],'Uncaught JS errors');
record('No browser exceptions');
} finally{
 await browser?.close();server.close();await once(server,'close');
 await writeFile(path.join(dir,'result.json'),JSON.stringify({status:errors.length?'FAIL':'PASS',scope:'HTTP_LOCAL_CANDIDATE',source_history_hop:owner.last_hop,real_chat_responses:false,pages_published:false,viewports:[360,390,430,480,844,1440],checks,errors},null,2));
}
console.log('INTEGRATED_VISUAL_BROWSER_PASS',checks.length);
})().catch(e=>{console.error(e);process.exitCode=1});
