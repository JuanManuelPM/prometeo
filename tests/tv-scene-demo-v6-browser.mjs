// Executable real-page proof. Imports the ORIGINAL V6 browser scripts from
// JuanManuelPM/Experimentos, never recreates a synthetic Window Lab.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const root=process.env.V6_ASSET_ROOT || '/tmp/prometeo-original-demo-engine';
const base=process.env.SCENE_BASE || 'http://127.0.0.1:4173';
const originalFiles=[
 'demo-engine-v4/demo-engine-v3-base.js',
 'demo-engine-v4/demo-engine-v4.js',
 'demo-engine-v4/pointer-assets.js',
 'demo-engine-v4/gesture-assets.js',
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
const fixture={schema:'prometeo.tv-public-scene/v1',revision:10,label:'PROMETEO',title:'Escena válida real',items:[{title:'Tarjeta conservada',text:'Visible en DOM real'}]};
const bad={...fixture,revision:11,title:'Escena que no debe mostrarse',items:[null]};
const recovered={...fixture,revision:12,title:'Escena recuperada real',items:[{title:'Tarjeta recuperada',text:'Recuperación visible'}]};
const output=process.env.DEMO_REPORT_DIR || '/tmp/prometeo-scene-v6-report';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={schema:'prometeo.demo-engine-v6.real-scene-report/v1',origin:'JuanManuelPM/Experimentos:gh-pages',tested_page:'tv/chat/scene/index.html',engine:'DemoEngineV6',proofs:[],status:'NOT_RUN'};
const viewports=[{name:'wide',width:1440,height:900},{name:'narrow',width:900,height:700},{name:'mobile',width:390,height:844}];
try {
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}});
    const page=await context.newPage();
    const pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
    let state=fixture;
    await page.route(/\/tv\/chat\/scene\/scene\.json(?:\?.*)?$/,async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(state)}));
    await page.addInitScript(()=>{
      const original=window.setInterval.bind(window);
      window.setInterval=(fn,ms,...args)=>{
        if(ms===15000){window.__scenePoll=()=>fn(...args);return 421;}
        return original(fn,ms,...args);
      };
    });
    await page.goto(base+'/tv/chat/scene/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#state')?.textContent?.includes('revisión 10'));
    assert.equal(await page.locator('#items article').count(),1);
    state=bad;
    await page.evaluate(()=>window.__scenePoll());
    assert.equal(await page.locator('#title').textContent(),'Escena válida real');
    assert.equal(await page.locator('#items article').count(),1);
    assert.match(await page.locator('#state').textContent(),/SCENE_ITEM_INVALID/);
    // The engine is mounted over the EXISTING page DOM, never a substituted scene.
    await page.evaluate(()=>{
      document.body.setAttribute('data-demo-stage','');
      const layer=document.createElement('div');
      layer.setAttribute('data-demo-controls','');
      layer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483000';
      layer.innerHTML='<div data-demo-pointer hidden style="position:absolute;width:24px;height:24px;pointer-events:none"><img data-demo-pointer-img alt="" width="24" height="24"></div><div data-demo-focus hidden style="position:absolute;outline:2px solid white"></div><div data-demo-spotlight hidden></div><div data-demo-comment hidden></div><div data-demo-caption hidden></div><svg data-demo-annotation-surface style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>';
      document.body.appendChild(layer);
    });
    for(const path of originalFiles){
      const body=await readFile(root+'/'+path,'utf8');
      assert.ok(body.length>100,'missing original source '+path);
      await page.addScriptTag({content:body});
    }
    async function demo(phase){
      const data=await page.evaluate(async()=>{
        const engine=new window.DemoEngineV6(document.body,{title:'PROOF REAL SCENE',steps:[]},{abortOnHuman:false,audio:{textVoice:false,volume:0}});
        engine.setRecipe({demo:'PR72 escena real RED→GREEN',preset:'SHOWCASE',steps:[
          {show:'#title',method:'look',hold:50},
          {show:'#items article',method:'look',hold:50},
          {showResult:'#state',method:'look',hold:50}
        ]});
        const required=['#title','#items article','#state'];
        for(const selector of required)if(!engine.target(selector))throw Error('V6_TARGET_NOT_FOUND '+selector);
        await engine.play();
        return {engineClass:engine.constructor.name,events:engine.observer.export(),quality:engine.qualityIssues};
      });
      assert.equal(data.engineClass,'DemoEngineV6');
      assert.ok(data.events.some(e=>e.type==='run_complete'),'V6 did not complete');
      assert.ok(!data.events.some(e=>e.type==='run_error'),'V6 threw run_error');
      const steps=data.events.filter(e=>e.type==='step_end'&&e.action==='showV5');
      assert.equal(steps.length,3,'V6 did not demonstrate every real selector');
      assert.equal(data.events.filter(e=>e.type==='viewport_authority'&&e.owner==='ENGINE').length,1);
      assert.equal(data.events.filter(e=>e.type==='viewport_authority'&&e.owner==='FREE').length,1);
      await page.screenshot({path:output+'/'+vp.name+'-'+phase+'.png',fullPage:true});
      report.proofs.push({viewport:vp.name,phase,engine:data.engineClass,targets:steps.map(e=>e.target),run_complete:true,pageErrors:[...pageErrors],quality:data.quality});
    }
    await demo('invalid-preserved');
    state=recovered;
    await page.evaluate(()=>window.__scenePoll());
    assert.equal(await page.locator('#title').textContent(),'Escena recuperada real');
    assert.equal(await page.locator('#items h2').textContent(),'Tarjeta recuperada');
    await demo('valid-recovered');
    assert.deepEqual(pageErrors,[],'uncaught real-page browser errors');
    await context.close();
  }
  report.status='PASS_AUTOMATED_REAL_DOM';
} catch(error){
  report.status='FAIL';
  report.error=String(error?.stack||error);
  throw error;
} finally {
  await writeFile(output+'/DEMO_REPORT.json',JSON.stringify(report,null,2)+'\n');
  await browser.close();
  console.log(JSON.stringify({status:report.status,proofs:report.proofs.map(p=>({viewport:p.viewport,phase:p.phase,targets:p.targets}))}));
}
