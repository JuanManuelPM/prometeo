import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const BASE='http://127.0.0.1:8765/experiments/emblem-001-pulso/index.html?test=1';
const OUT='experiments/emblem-001-pulso/validation/j12-ci';
const RUNTIME='/tmp/pulso-v6-runtime/';
const assets=['demo-engine-v4/demo-engine-v3-base.js','demo-engine-v4/demo-engine-v4.js','demo-engine-v4/pointer-assets.js','demo-engine-v4/gesture-assets.js','demo-engine-v5/viewport.js','demo-engine-v5/annotation.js','demo-engine-v5/camera.js','demo-engine-v5/audio.js','demo-engine-v5/page-inspector.js','demo-engine-v5/recipe.js','demo-engine-v5/demo-engine-v5.js','demo-engine-v6/audio-v6.js','demo-engine-v6/viewport-authority.js','demo-engine-v6/annotation-v6.js','demo-engine-v6/demo-engine-v6.js'];
await fs.mkdir(OUT,{recursive:true});
let failed=false;const records=[];const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const v of [{width:390,height:844,name:'v6-portrait'},{width:1440,height:900,name:'v6-desktop'}]){
 const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(60000);
 const rec={viewport:v.name,errors:[],checks:[],quality:[]};records.push(rec);
 page.on('pageerror',e=>rec.errors.push(e.message));
 const check=(name,test,extra)=>{rec.checks.push({name,ok:!!test});assert.ok(test,name+': '+JSON.stringify(extra))};
 try{
 await page.goto(BASE,{waitUntil:'load'});
 await page.waitForFunction(()=>window.__PULSO_TEST__?.artReady?.()===true);
 await page.evaluate(()=>{
  const app=document.querySelector('.app');const root=document.createElement('div');root.id='j12-v6-harness';root.className='j12-v6-harness';
  root.innerHTML=`<main data-demo-stage class="j12-stage"><div data-demo-page-scroll class="j12-scroll"><div data-demo-camera class="j12-camera"></div></div><svg data-demo-motion-svg class="j12-overlay"><path data-demo-trace-path hidden></path><path data-demo-trail hidden></path></svg><svg data-demo-annotation-surface class="j12-overlay"></svg><div data-demo-focus hidden></div><div data-demo-comment hidden></div><div data-demo-spotlight hidden></div><div data-demo-click-layer></div><div data-demo-wheel hidden></div><div data-demo-measure hidden></div><div data-demo-action-hud hidden></div><div data-demo-gesture hidden><img data-demo-gesture-img alt=""></div><div data-demo-pointer hidden><img data-demo-pointer-img alt=""></div></main><footer data-demo-controls><span data-demo-kicker>J12</span><span data-demo-caption></span><span data-demo-counter></span></footer>`;
  document.body.prepend(root);root.querySelector('[data-demo-camera]').append(app);
  document.querySelector('#play').setAttribute('data-demo-id','pulso.start');
  document.querySelector('#pause').setAttribute('data-demo-id','pulso.pause');
  document.querySelector('#resume').setAttribute('data-demo-id','pulso.resume');
  document.querySelector('#restart').setAttribute('data-demo-id','pulso.restart');
  document.querySelector('#blueScore').setAttribute('data-demo-id','pulso.score');
  const st=document.createElement('style');st.textContent='.j12-v6-harness{position:relative;width:100%;min-height:100vh}.j12-stage{position:relative;min-height:calc(100vh - 35px);overflow:hidden}.j12-scroll{position:relative;min-height:calc(100vh - 35px);overflow:auto}.j12-camera{position:relative;transform-origin:center center}[data-demo-pointer],[data-demo-focus],[data-demo-comment],[data-demo-gesture],[data-demo-spotlight]{position:absolute;z-index:50;pointer-events:none}[data-demo-pointer]{width:48px;height:48px}[data-demo-pointer-img]{width:100%;height:100%}.j12-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:45}[data-demo-controls]{position:relative;min-height:28px;font:12px system-ui;color:#e6f4ec;display:flex;gap:14px;justify-content:center}';document.head.append(st);
 });
 for(const asset of assets)await page.addScriptTag({path:RUNTIME+asset});
 const run=await page.evaluate(async()=>{
  if(typeof DemoEngineV6!=='function')throw Error('DemoEngineV6 missing');
  const root=document.getElementById('j12-v6-harness');const raw=window.DEMO_ENGINE_V4_POINTERS||{};
  const pointers={arrow:{src:raw.arrow,hotspot:[9,8],size:48},hand:{src:raw.hand,hotspot:[22,5],size:48}};
  const engine=new DemoEngineV6(root,{title:'J12 PULSO · DEMO',steps:[]},{preset:'FAST',pointerAssets:pointers,abortOnHuman:false,audio:{enabled:false}});
  const bounds=[];const originalAudit=engine._auditOverlayBounds.bind(engine);
  engine._auditOverlayBounds=(name,el)=>{const br=el?.getBoundingClientRect(),bs=engine.ui.stage.getBoundingClientRect();bounds.push({name,pointer:br&&{x:br.x,y:br.y,w:br.width,h:br.height},stage:{x:bs.x,y:bs.y,w:bs.width,h:bs.height},mode:el?.style.position});originalAudit(name,el);};
  engine.setRecipe({demo:'J12 · PULSO',preset:'FAST',steps:[
    {show:'pulso.start',method:'look',hold:120},
    {activate:'pulso.start'},
    {show:'pulso.score',method:'look',hold:180},
    {activate:'pulso.pause'},
    {activate:'pulso.resume'},
    {activate:'pulso.restart'},
    {showResult:'pulso.score',method:'look',hold:180}
  ]});
  engine.setSpeed(2.5);
  await engine.play(0);
  const q=engine.qualityAudit(),events=engine.observer.export();
  return {quality:q,actions:events.filter(x=>x.type==='click').map(x=>x.target),events:events.length,phase:window.__PULSO_TEST__.snapshot().phase,recipeSteps:engine.script.steps.length,bounds:bounds.slice(0,16)};
 });
 rec.quality=run.quality.issues;rec.actions=run.actions;rec.events=run.events;rec.bounds=run.bounds;
 check('V6 actual engine executes full semantic recipe',run.recipeSteps>=7,run);
 check('V6 clicked real game start',run.actions.includes('pulso.start'),run.actions);
 check('V6 clicked real pause',run.actions.includes('pulso.pause'),run.actions);
 check('V6 clicked real resume',run.actions.includes('pulso.resume'),run.actions);
 check('V6 clicked real restart',run.actions.includes('pulso.restart'),run.actions);
 check('V6 real game remains playable',run.phase==='playing',run.phase);
 check('V6 quality gate',run.quality.pass,run.quality);
 check('no page exceptions',rec.errors.length===0,rec.errors);
 await page.screenshot({path:OUT+'/'+v.name+'-v6.png'});
 }catch(e){failed=true;rec.failure=String(e.stack||e);await page.screenshot({path:OUT+'/'+v.name+'-FAILED.png'}).catch(()=>{});}
 await ctx.close();
}
}finally{await browser.close();await fs.writeFile(OUT+'/v6-report.json',JSON.stringify({status:failed?'FAIL':'PASS',records},null,2));}
console.log(JSON.stringify({status:failed?'FAIL':'PASS',records:records.map(x=>({viewport:x.viewport,checks:x.checks.length,failure:x.failure,actions:x.actions,quality:x.quality,bounds:x.bounds?.slice(0,5)}))}));
if(failed)process.exitCode=1;
