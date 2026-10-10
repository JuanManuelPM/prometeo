#!/usr/bin/env node
/* M01 candidate-only Chromium E2E. Synthetic ACKs are explicit fixtures;
 * actual reentrada.json and HTML are served from the checkout. NOT a Pages claim. */
const assert=require('node:assert/strict');
const {readFile,mkdir,stat,writeFile}=require('node:fs/promises');
const {createServer}=require('node:http');
const path=require('node:path');
const {once}=require('node:events');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'artifacts/m01-work-desk');
const original=JSON.parse(require('node:fs').readFileSync(path.join(root,'tv/chat/relevo/retomar/reentrada.json'),'utf8'));
const now=Date.now();
const at=(delta)=>new Date(now+delta).toISOString();
const git='https://github.com/JuanManuelPM/prometeo/pull/96';
const served='https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/';
function receipt(id,work_id,project_id,state,minutes,title,extra={}){
 return {id,work_id,project_id,state,title,summary:'Evento de fixture para '+title,
  occurred_at_utc:at(minutes*60000),source_url:git,...extra};
}
const demo=[
 receipt('m01-ack-alpha','m01-alpha','persistencia','REQUEST_CAPTURED',-65,'Pedido interpretado',{intent_summary:'Probar persistencia y versiones con una entrega real',plan_branches:['Captura','Construcción','Prueba','Publicación']}),
 receipt('m01-candidate-alpha','m01-alpha','persistencia','CANDIDATE',-51,'Primer cambio'),
 receipt('m01-test-alpha','m01-alpha','persistencia','TESTED',-42,'Test de navegador'),
 receipt('m01-served-alpha','m01-alpha','persistencia','SERVED_VERIFIED',-35,'Entrega pública',{version_sha:'1234567890abcdef1234567890abcdef12345678',served_url:served,proof_url:git}),
 receipt('m01-ack-beta','m01-beta','facultad','REQUEST_CAPTURED',-24,'Pedido interpretado',{intent_summary:'Pedido de material académico público'}),
 receipt('m01-block-beta','m01-beta','facultad','BLOCKED',-15,'Bloqueo de dependencia'),
 receipt('m01-ack-gamma','m01-gamma','widgets','REQUEST_CAPTURED',-90,'Pedido interpretado',{intent_summary:'Verificar señal, no inventarla'}),
 receipt('m01-candidate-gamma','m01-gamma','widgets','CANDIDATE',-49,'Candidato guardado',{work_signal:'PROGRESS',work_signal_at_utc:at(-45*60000)}),
 receipt('m01-ack-delta','m01-delta','tv','REQUEST_CAPTURED',-50,'Pedido interpretado',{intent_summary:'Verificar señal real reciente'}),
 receipt('m01-candidate-delta','m01-delta','tv','CANDIDATE',-9,'Candidato informado',{work_signal:'PROGRESS',work_signal_at_utc:at(-4*60000)}),
 receipt('m01-invalid-link','m01-evil','tv','TESTED',-2,'Nunca visible',{source_url:'https://evil.invalid/attack'}),
 receipt('m01-fake-served','m01-gamma','widgets','SERVED_VERIFIED',-1,'Falso servido',{proof_url:git})
];
let fixture={...original,public_receipts:[...(original.public_receipts||[]),...demo]};
const checks=[],errors=[];
const pass=x=>{checks.push(x);console.log('PASS',x)};
let fixtureStatus=200;
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),p=url.pathname;
 if(!p.startsWith('/prometeo/')){res.writeHead(404);return res.end('Not found');}
 if(p==='/prometeo/tv/chat/relevo/retomar/reentrada.json'){
  res.writeHead(fixtureStatus,{'content-type':'application/json','cache-control':'no-store'});
  return res.end(fixtureStatus===200?JSON.stringify(fixture):'{}');
 }
 let relative=decodeURIComponent(p.slice('/prometeo/'.length));
 if(relative.endsWith('/'))relative+='index.html';
 const target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 try{
  if(!(await stat(target)).isFile())throw Error('Not file');
  const bytes=await readFile(target);
  res.writeHead(200,{'content-type':relative.endsWith('.html')?'text/html':relative.endsWith('.css')?'text/css':relative.endsWith('.json')?'application/json':'text/plain','cache-control':'no-store'});
  res.end(bytes);
 }catch(_){res.writeHead(404);res.end('Missing source');}
});
let browser;
(async()=>{
 await mkdir(out,{recursive:true});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const url='http://127.0.0.1:'+server.address().port+'/prometeo/tv/chat/relevo/retomar/';
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [360,390,430,480,844,1440]){
   const ctx=await browser.newContext({viewport:{width,height:width===480?1800:900},deviceScaleFactor:width<=480?2:1,isMobile:width<=480,hasTouch:width<=480});
   const page=await ctx.newPage();
   page.on('pageerror',e=>errors.push(width+': '+e.message));
   await page.route('https://api.github.com/repos/JuanManuelPM/prometeo/**',r=>r.fulfill({status:403,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"message":"Test simulates public GitHub 403"}'}));
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.querySelector('[data-work-id="m01-alpha"]')&&document.querySelectorAll('#track .project').length>=6);
   assert.equal(await page.locator('#track .project').count(),original.projects.length,'Existing project inventory corrupted');
   assert.equal(await page.locator('#track .project img[src$=".svg"]').count(),0,'Rejected geometric cover reinstated');
   const alpha=page.locator('[data-work-id="m01-alpha"]');
   assert.match(await alpha.innerText(),/Resultado servido y verificado/);
   assert.equal(await alpha.locator('.work-phases li[data-verified="true"]').count(),4);
   assert.equal(await page.locator('[data-work-id="m01-beta"] .work-phases li[data-verified="true"]').count(),1,'BLOCKED fabricated progress');
   assert.match(await page.locator('[data-work-id="m01-gamma"] .work-status').innerText(),/Sin señal reciente/);
   assert.match(await page.locator('[data-work-id="m01-delta"] .work-status').innerText(),/Actividad informada recientemente/);
   assert.equal(await page.locator('[data-work-id="m01-evil"]').count(),0,'Malicious source accepted');
   assert.match(await page.locator('[data-work-id="m01-gamma"] .work-status').innerText(),/Sin señal reciente/,'Invalid served receipt accepted');
   assert.match(await page.locator('#workNotify').innerText(),/Activar avisos/);
   const boxes=await page.evaluate(()=>({
    inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
    background:getComputedStyle(document.body).backgroundColor,
    card:document.querySelector('#track .project').getBoundingClientRect().width,
    deskTop:document.getElementById('workDesk').getBoundingClientRect().top,
    activityTop:document.getElementById('activityTitle').getBoundingClientRect().top,
    heights:[...document.querySelectorAll('#workCards article')].map(x=>Math.round(x.getBoundingClientRect().height)),
    actions:[...document.querySelectorAll('#workDesk button')].filter(x=>!x.hidden).map(x=>Math.round(x.getBoundingClientRect().height))
   }));
   assert.equal(boxes.client,width,'Mobile viewport shrunk');
   assert.equal(boxes.background,'rgb(11, 12, 15)','Dark theme regression');
   assert.ok(boxes.scroll<=width+2,'Global horizontal overflow '+JSON.stringify(boxes));
   assert.ok(boxes.deskTop>boxes.activityTop,'Work feed must remain BELOW existing feed');
   assert.ok(boxes.actions.every(x=>x>=44),'Small touch target '+JSON.stringify(boxes.actions));
   if(width<=480)assert.ok(boxes.card>=width*.84,'Project carousel no longer dominant');
   const times=await page.locator('#workCards article').evaluateAll(cards=>cards.map(x=>({
     t:Date.parse(x.querySelector('.work-moment').textContent.split('Última novedad: ')[1]||''),
     str:x.querySelector('.work-moment').textContent
   })));
   assert.ok(times.every(x=>/Argentina/.test(x.str)),'Missing Argentina dates');
   await page.screenshot({path:path.join(out,'m01-'+width+'.png'),fullPage:true});
   pass(width+'px: source groups, causal gates, visual hierarchy, dates and no overflow');
   if(width===390){
    await alpha.locator('summary').click();
    assert.equal(await alpha.locator('.work-history li').count(),4,'Previous events of same work_id lost');
    assert.match(await alpha.innerText(),/Versión servida/);
    await alpha.getByRole('button',{name:/Marcar/}).click();
    assert.match(await page.locator('[data-project="persistencia"] .project-signal').innerText(),/Sin leer:/);
    const one=await page.locator('[data-work-id="m01-alpha"] .work-seen').innerText();
    assert.match(one,/Visto en este dispositivo/);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-work-id="m01-alpha"]'));
    assert.match(await page.locator('[data-work-id="m01-alpha"] .work-seen').innerText(),/Visto en este dispositivo/);
    pass('Local device read state persists and works without server writes');
    await page.locator('#workNotify').click();
    assert.equal(await page.locator('#workNotify').getAttribute('aria-pressed'),'true');
    await page.locator('#workNotify').click();
    assert.equal(await page.locator('#workNotify').getAttribute('aria-pressed'),'false');
    pass('Explicit opt-in/out alerts, OFF by default and no push promises');
    await page.locator('[data-project="facultad"]').click();
    assert.match(page.url(),/#facultad/);
    await page.goBack({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-project="persistencia"]')?.getAttribute('aria-pressed')==='true');
    pass('Existing project Back navigation retained');
    // Change owner projection while page remains open. Preserve older work grouping.
    fixture={...fixture,public_receipts:[...fixture.public_receipts,receipt('m01-test-delta','m01-delta','tv','TESTED',-1,'Pruebas después de señal')]};
    await page.evaluate(()=>refreshWhenVisible());
    await page.waitForFunction(()=>document.querySelector('[data-work-id="m01-delta"] .work-status')?.textContent?.includes('Pruebas registradas'));
    assert.equal(await page.locator('[data-work-id="m01-delta"] .work-history li').count(),2); // details stays collapsed but DOM history exists
    pass('New receipt from independent owner is consumed on same page without duplication');
    fixtureStatus=503;
    await page.evaluate(()=>refreshWhenVisible());
    assert.ok(await page.locator('[data-work-id="m01-delta"]').count(),'Offline refresh lost last valid visible data');
    fixtureStatus=200;
    pass('Offline/HTTP 503 retains last verified catalog');
   }
   await ctx.close();
  }
  assert.equal(errors.length,0,'Page errors: '+errors.join('; '));
  const evidence={type:'M01_CANDIDATE_BROWSER',candidate_only:true,served_verified:false,checks,errors,source:'checked-out branch HTML and registry + clearly synthetic test fixtures',at_utc:new Date().toISOString()};
  await writeFile(path.join(out,'receipt.json'),JSON.stringify(evidence,null,2));
  console.log('M01 CANDIDATE PASS '+checks.length);
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error('M01 CANDIDATE FAIL',e.stack||e);process.exitCode=1});
