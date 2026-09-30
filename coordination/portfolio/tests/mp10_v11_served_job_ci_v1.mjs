#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const publicUrl=process.env.V11_PUBLIC_URL||'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/';
const outDir=process.env.V11_JOB_CI_OUT||'artifacts/mp10-v11-served-job-ci';
const propagationMs=Number(process.env.V11_PROPAGATION_MS||180000);
const indexPath='current-tree/control-v11/index.html';
const scriptPath='current-tree/control-v11/v11.js';
const safeText='CANARY_PUBLIC_SAFE_V11_JOB_CI';
fs.mkdirSync(outDir,{recursive:true});

const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const evidence={
  schema:'prometeo.mp10-v11-served-job-ci/v1',
  observed_at:new Date().toISOString(),
  public_url:publicUrl,
  authority:'TECHNICAL_SERVED_BROWSER_VERIFICATION_ONLY',
  authenticated_transport_certified:false,
  fresh_worker_wake_certified:false,
  views:[],
  overall:'RUNNING'
};
const save=()=>fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');

async function wait200(request){
  const deadline=Date.now()+propagationMs;
  let last=null;
  do{
    const u=new URL(publicUrl);u.searchParams.set('_v11_job_ci',Date.now());
    last=await request.get(u.href,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache'}});
    if(last.status()===200)return last;
    await new Promise(r=>setTimeout(r,5000));
  }while(Date.now()<deadline);
  return last;
}
async function activate(page,id){
  const clicked=await page.evaluate(view=>{
    const tab=document.querySelector('.tab[data-view="'+view+'"]');
    if(!tab)return false;
    tab.click(); return true;
  },id);
  await page.waitForTimeout(100);
  const state=await page.evaluate(view=>{
    const active=[...document.querySelectorAll('.view.on')].map(x=>x.id);
    return {active,ok:active.length===1&&active[0]===view};
  },id);
  return {clicked,...state};
}
async function runViewport(browser,id,viewport){
  const context=await browser.newContext({viewport,locale:'es-AR'});
  const page=await context.newPage();
  const runtime={page_errors:[],console_errors:[],request_failures:[],websockets:[]};
  page.on('pageerror',e=>runtime.page_errors.push(String(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')runtime.console_errors.push(m.text())});
  page.on('requestfailed',r=>runtime.request_failures.push({url:r.url(),error:r.failure()?.errorText||'failed'}));
  page.on('websocket',ws=>runtime.websockets.push(ws.url()));
  const row={id,viewport,runtime,checks:{},status:'RUNNING'};
  try{
    const nav=await page.goto(publicUrl+'?_v11_job_browser='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(nav?.status(),200);
    await page.waitForTimeout(1800);
    row.checks.navigation_http_200=true;

    for(const sel of ['#commandInputV11','#commandSendV11','#commandStateV11']) {
      assert.equal(await page.locator(sel).count(),1,sel+' missing');
    }
    row.checks.command_dom=true;
    row.checks.ingress_api=await page.evaluate(()=>Boolean(window.PROMETEO_INGRESS_V1&&typeof window.PROMETEO_INGRESS_V1.submit==='function'));
    assert.equal(row.checks.ingress_api,true);
    row.checks.auth_transport_absent=await page.evaluate(()=>!window.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1);
    assert.equal(row.checks.auth_transport_absent,true);

    const semanticViews=['proyectos','espacios','trabajo','historial','estadisticas','organismo'];
    row.semantic_views={};
    for(const view of semanticViews){
      row.semantic_views[view]=await activate(page,view);
      assert.equal(row.semantic_views[view].clicked,true,'missing tab '+view);
      assert.equal(row.semantic_views[view].ok,true,'view not isolated '+view);
    }
    row.checks.separate_views=true;

    await activate(page,'trabajo');
    const input=page.locator('#commandInputV11');
    await input.fill(safeText);
    const postsBefore=runtime.request_failures.length;
    await page.locator('#commandSendV11').click();
    await page.waitForTimeout(250);
    row.command={
      state:await page.locator('#commandStateV11').getAttribute('data-state'),
      text:await page.locator('#commandStateV11').innerText(),
      input:await input.inputValue()
    };
    assert.equal(row.command.state,'boundary');
    assert.equal(row.command.input,safeText);
    assert.match(row.command.text,/No quedó en cola|Ingreso falló cerrado|texto se conserva/i);
    assert.doesNotMatch(row.command.text,/En cola durable/i);
    row.checks.command_truthful_fail_closed=true;
    row.command.request_failures_before=postsBefore;
    row.command.request_failures_after=runtime.request_failures.length;

    await activate(page,'espacios');
    await page.waitForFunction(()=>document.querySelectorAll('#previewGridV11 article,#previewGridV11 [data-preview-state]').length>0,null,{timeout:15000});
    const preview=await page.evaluate(()=>{
      const root=document.getElementById('previewGridV11');
      const images=[...root.querySelectorAll('img')].map(i=>new URL(i.getAttribute('src')||'',location.href).pathname);
      return {
        cards:root.querySelectorAll('article,[data-preview-state]').length,
        images,
        live_embeds:root.querySelectorAll('iframe,object,embed,video').length
      };
    });
    row.preview=preview;
    assert.ok(preview.cards>0);
    assert.ok(preview.images.length>0);
    assert.ok(preview.images.every(p=>p.includes('/current-tree/control-v11/previews/')));
    assert.equal(preview.live_embeds,0);
    assert.equal(await page.locator('iframe').count(),0);
    row.checks.static_preview_only=true;

    await activate(page,'proyectos');
    await page.waitForFunction(()=>Boolean(document.getElementById('projects')?.innerText.trim()),null,{timeout:15000});
    row.project_context=await page.evaluate(()=>{
      const root=document.getElementById('projects');
      const text=root?.innerText||'';
      return {
        visible:Boolean(document.getElementById('proyectos')?.classList.contains('on')),
        context_section:/Contextos recientes/i.test(text),
        context_count:root?.querySelectorAll('.context').length||0,
        text:text.slice(0,5000)
      };
    });
    assert.equal(row.project_context.visible,true);
    assert.equal(row.project_context.context_section,true);
    assert.doesNotMatch(row.project_context.text,/undefined|null\\s+eventos|NaN/i);
    row.checks.project_context_truthful=true;

    await activate(page,'estadisticas');
    await page.waitForTimeout(350);
    row.stats=await page.evaluate(async()=>{
      let api=null;
      try{api=window.PROMETEO_STATS_V1?await window.PROMETEO_STATS_V1.load():null}catch(e){api={status:'THREW',error:String(e?.message||e)}}
      return {
        api_status:String(api?.status||'UNKNOWN'),
        api_source:api?.source||null,
        text:(document.getElementById('stats')?.innerText||'').slice(0,5000)
      };
    });
    assert.notEqual(row.stats.api_status,'THREW');
    assert.ok(row.stats.text.trim().length>0);
    assert.doesNotMatch(row.stats.text,/NaN|undefined|null\s+unidades/i);
    row.checks.stats_truthful=true;

    if(id==='narrow'){
      row.layout=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}));
      assert.ok(row.layout.scrollWidth<=row.layout.innerWidth+2);
      row.checks.no_horizontal_overflow=true;
    }else row.checks.no_horizontal_overflow=true;

    assert.equal(runtime.page_errors.length,0);
    row.checks.no_page_errors=true;
    assert.equal(runtime.websockets.length,0);
    row.checks.no_websockets=true;
    await page.screenshot({path:path.join(outDir,id+'.png'),fullPage:true});
    row.status='PASS';
  }catch(error){
    row.status='FAIL';
    row.error={message:String(error?.message||error),stack:String(error?.stack||'')};
    try{await page.screenshot({path:path.join(outDir,id+'-fail.png'),fullPage:true})}catch{}
  }finally{
    await context.close();
  }
  return row;
}

let browser;
try{
  browser=await chromium.launch({headless:true});
  const pre=await browser.newContext();
  const publicResponse=await wait200(pre.request);
  assert.equal(publicResponse?.status(),200,'served V11 must be HTTP 200');
  const servedIndex=await publicResponse.body();
  const sourceIndex=fs.readFileSync(indexPath);
  const servedScriptResponse=await pre.request.get(new URL('./v11.js',publicUrl).href,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache'}});
  assert.equal(servedScriptResponse.status(),200);
  const servedScript=await servedScriptResponse.body();
  const sourceScript=fs.readFileSync(scriptPath);
  evidence.served_identity={
    index:{served_sha256:sha256(servedIndex),source_sha256:sha256(sourceIndex),match:sha256(servedIndex)===sha256(sourceIndex)},
    v11_js:{served_sha256:sha256(servedScript),source_sha256:sha256(sourceScript),match:sha256(servedScript)===sha256(sourceScript)}
  };
  assert.equal(evidence.served_identity.index.match,true,'served index != checked out source');
  assert.equal(evidence.served_identity.v11_js.match,true,'served v11.js != checked out source');
  await pre.close();

  evidence.views.push(await runViewport(browser,'desktop',{width:1365,height:900}));
  evidence.views.push(await runViewport(browser,'narrow',{width:390,height:844}));
  evidence.overall=evidence.views.every(v=>v.status==='PASS')?'PASS':'FAIL';
}catch(error){
  evidence.overall='FAIL';
  evidence.fatal={message:String(error?.message||error),stack:String(error?.stack||'')};
}finally{
  if(browser)await browser.close();
  save();
}
console.log(JSON.stringify(evidence,null,2));
process.exit(evidence.overall==='PASS'?0:1);
