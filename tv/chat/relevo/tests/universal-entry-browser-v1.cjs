#!/usr/bin/env node
'use strict';
/* Candidate actual DOM over localhost HTTP, mock 403 ONLY for GitHub public APIs. */
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,stat,mkdir,writeFile}=require('node:fs/promises');
const {once}=require('node:events');
const path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd(),dir=path.join(root,'artifacts/universal-entry');
const results={scope:'CANDIDATE_CHECKOUT_HTTP',release:'NOT_PUBLISHED',fixture:'GitHub REST 403 simulation; no chat execution',views:[],failures:[]};
const server=createServer(async(req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(!p.startsWith('/prometeo/')){res.writeHead(404);return res.end();}
  let relative=p.substring('/prometeo/'.length);
  if(relative.endsWith('/'))relative+='index.html';
  const abs=path.resolve(root,relative);
  if(!abs.startsWith(root+path.sep)||!(await stat(abs)).isFile())throw Error('Missing');
  const type=relative.endsWith('.mjs')?'text/javascript':relative.endsWith('.js')?'text/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.json')?'application/json':relative.endsWith('.svg')?'image/svg+xml':'text/html';
  res.writeHead(200,{'content-type':type+'; charset=utf-8','cache-control':'no-store'});
  res.end(await readFile(abs));
 }catch{res.writeHead(404);res.end();}
});
(async()=>{
 await mkdir(dir,{recursive:true});server.listen(0,'127.0.0.1');await once(server,'listening');
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [360,390,844,1440]){
   const context=await browser.newContext({viewport:{width,height:850},hasTouch:width<500,isMobile:width<500,deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   const apiStatus=width===390?404:width===844?429:403;
   await page.route('https://api.github.com/repos/JuanManuelPM/prometeo/**',route=>route.fulfill({status:apiStatus,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:'{}'}));
   const response=await page.goto('http://127.0.0.1:'+server.address().port+'/prometeo/tv/chat/relevo/retomar/',{waitUntil:'networkidle'});
   assert.equal(response.status(),200);
   const mount=page.locator('#universalEntryMount');
   await mount.locator('[data-demo-id="universal.route.a"]').waitFor();
   assert.equal(await mount.locator('[data-demo-id="universal.graph"]').count(),1);
   assert.equal(await page.locator('#track .project').count(),5,'existing projects preserved');
   await mount.locator('[data-demo-id="universal.route.b"]').click();
   assert.match(await mount.locator('[data-demo-id="universal.summary"]').innerText(),/ninguna declarada/);
   assert.match(await mount.locator('[data-demo-id="universal.steps"]').innerText(),/Respuesta fundada/);
   assert.ok(!(await mount.locator('[data-demo-id="universal.steps"]').innerText()).includes('Ejecución'));
   await mount.locator('[data-demo-id="universal.route.e"]').click();
   assert.match(await mount.locator('[data-demo-id="universal.summary"]').innerText(),/referente, hardware, acción/);
   await mount.locator('[data-demo-id="universal.route.a"]').click();
   const svg=mount.locator('[data-demo-id="universal.graph"]'),before=await svg.getAttribute('viewBox');
   await mount.getByRole('button',{name:'Acercar'}).click();
   assert.notEqual(await svg.getAttribute('viewBox'),before,'zoom changes real SVG');
   await mount.getByRole('button',{name:'Ver todo'}).click();
   await mount.locator('[data-demo-id="universal.steps"]').getByRole('button',{name:/Verificación independiente/}).click();
   assert.match(await mount.locator('[data-demo-id="universal.details"]').innerText(),/Verificación independiente/);
   await mount.getByRole('button',{name:/Modo: humano/}).click();
   assert.match(await mount.locator('[data-demo-id="universal.details"]').innerText(),/Permisos/);
   await svg.focus();
   await page.keyboard.press('Home');
   assert.notEqual(await svg.getAttribute('viewBox'),before,'Home keyboard reset supported');
   await mount.getByRole('button',{name:/Arquitectura: actual/}).click();
   assert.match(await mount.getByRole('button',{name:/Arquitectura: evolución/}).innerText(),/evolución/);
   const bodyWidth=await page.evaluate(()=>document.body.scrollWidth);
   assert.ok(bodyWidth<=width+12,'unexpected horizontal overflow '+bodyWidth+' at '+width);
   assert.deepEqual(errors,[],'no page errors');
   await page.screenshot({path:path.join(dir,'universal-entry-'+width+'.png'),fullPage:true});
   results.views.push({width,ok:true,errors:errors.length,http:response.status(),zoom:true,route:'a,b,e',apiStatus,legacy_projects:5});
   await context.close();
  }
  results.status='PASS';console.log('UNIVERSAL_ENTRY_BROWSER_PASS',JSON.stringify(results.views));
 }catch(err){results.status='FAIL';results.failures.push(String(err.stack||err));console.error('UNIVERSAL_ENTRY_BROWSER_FAIL',err);process.exitCode=1;}
 finally{await writeFile(path.join(dir,'report.json'),JSON.stringify(results,null,2));await browser?.close();server.close();}
})();
