#!/usr/bin/env node
'use strict';
/* Real V6 engine from Experimentos gh-pages acting on the actual Prometeo page
 * served via HTTP from exact checkout. NO synthetic window-lab fixture.
 * No application publication or GitHub mutation.
 */
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir,writeFile,stat}=require('node:fs/promises');
const {once}=require('node:events');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd(),artifacts=path.join(root,'artifacts/retomar-v6-real');
const steps=[
'demo-engine-v4/demo-engine-v3-base.js',
'demo-engine-v4/demo-engine-v4.js',
'demo-engine-v5/viewport.js',
'demo-engine-v5/annotation.js',
'demo-engine-v5/camera.js',
'demo-engine-v5/audio.js',
'demo-engine-v5/page-inspector.js',
'demo-engine-v5/recipe.js',
'demo-engine-v5/demo-engine-v5.js',
'demo-engine-v6/audio-v6.js',
'demo-engine-v6/viewport-authority.js',
'demo-engine-v6/annotation-v6.js',
'demo-engine-v6/demo-engine-v6.js'
];
const engineRoot='https://juanmanuelpm.github.io/Experimentos/';
const report={suite:'prometeo.pr79.experimentos.demo-engine-v6.real-page',runtime:engineRoot,
  document:'tv/chat/relevo/retomar/index.html',source_kind:'CHECKOUT_HTTP',production_served:false,
  targets:['projects.rail','projects.facultad','projects.persistencia','activity.feed'],
  steps:[],issues:[],views:[],status:'NOT_RUN'};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1'),pathname=decodeURIComponent(u.pathname);
  if(!pathname.startsWith('/prometeo/')){res.writeHead(404);return res.end();}
  let file=pathname.slice('/prometeo/'.length);
  if(file.endsWith('/'))file+='index.html';
  const absolute=path.resolve(root,file);
  if(!absolute.startsWith(root+path.sep)||!(await stat(absolute)).isFile()){res.writeHead(404);return res.end();}
  const mime=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.json')?'application/json':'text/plain';
  res.writeHead(200,{'content-type':mime+'; charset=utf-8','cache-control':'no-store'});res.end(await readFile(absolute));
 }catch{res.writeHead(404);res.end();}
});
async function run(){
 await mkdir(artifacts,{recursive:true});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 let browser;
 try {
  const owner=JSON.parse(await readFile(path.join(root,'tv/chat/relevo/STATE_V1.json'),'utf8'));
  assert.ok(owner.history.length>=4);
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1});
   const page=await context.newPage(),pageErrors=[];
   page.on('pageerror',e=>pageErrors.push(e.message));
   await page.route('https://api.github.com/repos/JuanManuelPM/prometeo/**',route=>
     route.fulfill({status:403,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{}'}));
   const response=await page.goto(base+'/prometeo/tv/chat/relevo/retomar/',{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.querySelectorAll('#track [data-demo-id]').length===5);
   await page.waitForFunction(()=>document.querySelectorAll('#activityRows article').length>=4);
   for(const asset of steps){
    // Load actual V3-V6 scripts from the ORIGINAL remote engine, in dependency order.
    await page.addScriptTag({url:engineRoot+asset});
   }
   assert.ok(await page.evaluate(()=>typeof window.DemoEngineV6==='function'),'Original V6 runtime not loaded');
   const result=await page.evaluate(async()=>{
     const root=document.querySelector('main.app');
     root.setAttribute('data-demo-stage','');
     root.style.position='relative';
     for(const [element,attr] of [
       ['div','data-demo-focus'],['div','data-demo-pointer'],
       ['div','data-demo-caption'],['div','data-demo-kicker']
     ]){
       const node=document.createElement(element);node.setAttribute(attr,'');
       if(attr==='data-demo-pointer'){
         node.style.cssText='position:absolute;z-index:1000;width:32px;height:32px;border:3px solid #111111;border-radius:50%;pointer-events:none;';
         node.hidden=true;
       }else if(attr==='data-demo-focus'){
         node.style.cssText='position:absolute;z-index:998;border:2px solid #111111;pointer-events:none;';
         node.hidden=true;
       }else{node.hidden=true;}
       root.append(node);
     }
     const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
     svg.setAttribute('data-demo-annotation-surface','');
     svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
     root.append(svg);
     const engine=new DemoEngineV6(root,{title:'Prometeo pruebas V6',steps:[]},{
       preset:'SHOWCASE',abortOnHuman:false,audio:{enabled:false,textVoice:false}
     });
     engine.setRecipe({demo:'Proyectos reales de Prometeo',preset:'SHOWCASE',steps:[
       {show:'projects.rail',method:'look',hold:140},
       {activate:'projects.facultad'},
       {showResult:'projects.facultad',method:'look',hold:140},
       {activate:'projects.persistencia'},
       {show:'activity.feed',method:'look',hold:140}
     ]});
     const manifest=engine.inspectPage();
     const missing=['projects.rail','projects.facultad','projects.persistencia','activity.feed'].filter(
       target=>!manifest.targets.some(x=>x.id===target)
     );
     if(missing.length)throw Error('Missing REAL page targets: '+missing.join(','));
     await engine.play(0);
     const receipts=engine.observer.export(),audit=engine.qualityAudit();
     return {events:receipts.map(r=>({type:r.type,action:r.action,target:r.target,owner:r.owner,message:r.message,code:r.code})),
       manifest:manifest.targets.filter(x=>['projects.rail','projects.facultad','projects.persistencia','activity.feed'].includes(x.id)),
       issue_codes:audit.issues.map(x=>x.code),issue_details:audit.issues,audit_pass:audit.pass,
       final_selected:root.querySelector('[data-demo-id="projects.persistencia"]')?.getAttribute('aria-pressed'),
       last_hop:root.querySelector('#activityRows').textContent.includes('Relevo 4'),
       viewport_owner:root.dataset.viewportOwner,
       v6_runtime:engine.constructor.name};
   });
   assert.equal(result.v6_runtime,'DemoEngineV6');
   assert.equal(result.final_selected,'true','V6 actions did not change real project state');
   assert.ok(result.events.some(e=>e.type==='run_complete'),'No complete runtime receipt');
   assert.ok(result.events.filter(e=>e.type==='click').length>=2,'Missing real click receipts');
   assert.ok(result.events.some(e=>e.type==='viewport_authority'&&e.owner==='ENGINE'));
   assert.equal(result.viewport_owner,'FREE');
   assert.ok(result.last_hop,'Lost persisted actual history');
   console.log('V6_QUALITY_DETAILS',width,JSON.stringify(result.issue_details));
   assert.deepEqual(result.issue_codes,[],'V6 quality issues');
   assert.deepEqual(pageErrors,[],'Uncaught browser errors');
   await page.screenshot({path:path.join(artifacts,'real-engine-v6-'+width+'.png'),fullPage:true});
   report.views.push({width,ok:true,v6_receipts:result.events.length,manifest:result.manifest,engine_version:result.v6_runtime});
   report.steps.push({width,events:result.events,quality:result.issue_codes});
   console.log('V6_REAL_PAGE_PASS',width,'receipts='+result.events.length);
   await context.close();
  }
  report.status='PASS';
 }finally{await browser?.close();}
}
run().catch(err=>{report.status='FAIL';report.issues.push(String(err.stack||err));console.error(err);process.exitCode=1;})
.finally(async()=>{
 await writeFile(path.join(artifacts,'result.json'),JSON.stringify(report,null,2));
 server.close();await once(server,'close');
});
