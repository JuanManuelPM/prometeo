#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TARGET_URL=process.env.ALUMNOS_JOSE_V11_URL||'https://juanmanuelpm.github.io/prometeo/candidates/jose-v11-reviewable-preview/';
const MATERIAL_PATH=process.env.ALUMNOS_JOSE_V11_MATERIAL||'coordination/workstreams/jose-study-design-20260911/material/PROMETEO_JOSE_RECOVERY_ENGINE_V11.html.gz.b64';
const EXPECTED_BYTES=Number(process.env.ALUMNOS_JOSE_V11_BYTES||69235);
const EXPECTED_SHA256=process.env.ALUMNOS_JOSE_V11_SHA256||'0cf9a40fb53e977dccb40c9755d668a3ee922ccd61883f19229bb4a113139a05';
const OUT_DIR=process.env.ALUMNOS_JOSE_V11_ARTIFACT_DIR||'artifacts/alumnos-jose-v11-browser-ci';
const VIEWS=[
  {id:'desktop',viewport:{width:1365,height:900},isMobile:false,hasTouch:false},
  {id:'narrow',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
const TOPICS=[
  {id:'simultaneous-equations',re:/sistemas|simult[aá]neas|ecuaciones/i},
  {id:'factorisation',re:/factor/i},
  {id:'quadratics',re:/cuadr[aá]tic/i},
  {id:'index-laws',re:/[ií]ndice|exponent|potenc/i}
];

async function verifyLocalMaterial(){
  const encoded=(await readFile(MATERIAL_PATH,'utf8')).trim();
  const raw=gunzipSync(Buffer.from(encoded,'base64'));
  return {
    path:MATERIAL_PATH,
    decoded_bytes:raw.length,
    sha256:createHash('sha256').update(raw).digest('hex'),
    pass:raw.length===EXPECTED_BYTES&&createHash('sha256').update(raw).digest('hex')===EXPECTED_SHA256
  };
}

async function findRuntimeFrame(page){
  const frames=page.frames().filter(frame=>frame!==page.mainFrame());
  return frames[0]||page.mainFrame();
}

async function smokeTopics(frame){
  const results=[];
  for(const topic of TOPICS){
    const loc=frame.getByText(topic.re).first();
    const count=await loc.count();
    const item={topic:topic.id,count,visible:false,clicked:false,practice_signal:false};
    if(count){
      item.visible=await loc.isVisible().catch(()=>false);
      if(item.visible){
        await loc.click({timeout:5000}).catch(()=>{});
        item.clicked=true;
        await frame.waitForTimeout(150);
        item.practice_signal=await frame.locator('[data-level], [data-exercise], [data-practice], .level, [class*="practice" i], [class*="exercise" i]').count()>0;
      }
    }
    results.push(item);
  }
  return results;
}

async function scrollAndDragProbe(frame){
  return frame.evaluate(() => {
    const all=[...document.querySelectorAll('*')];
    const el=all.find(node=>{
      const s=getComputedStyle(node);
      return node.scrollHeight>node.clientHeight+24 && /(auto|scroll)/.test(s.overflowY);
    });
    if(!el)return {applicable:false};
    const before=el.scrollTop;
    el.scrollTop=Math.min(el.scrollTop+120,el.scrollHeight-el.clientHeight);
    const after=el.scrollTop;
    el.scrollTop=before;
    el.setAttribute('data-wc-scroll-probe','1');
    return {applicable:true,before,after,programmatic_scroll:after>before};
  });
}

async function runView(browser,view,material){
  const context=await browser.newContext({viewport:view.viewport,isMobile:view.isMobile,hasTouch:view.hasTouch,locale:'es-AR'});
  const page=await context.newPage();
  const runtime={page_errors:[],console_errors:[],request_failures:[]};
  page.on('pageerror',e=>runtime.page_errors.push(e?.message||String(e)));
  page.on('console',m=>{if(m.type()==='error')runtime.console_errors.push(m.text())});
  page.on('requestfailed',r=>runtime.request_failures.push({url:r.url(),error:r.failure()?.errorText||'request_failed'}));
  const result={view:view.id,viewport:view.viewport,runtime,material_gate:material,criteria:{},topics:[]};
  try{
    const response=await page.goto(TARGET_URL,{waitUntil:'domcontentloaded',timeout:30000});
    result.navigation_http_status=response?.status()??null;
    result.final_url=page.url();
    result.criteria.navigation_http_ok=result.navigation_http_status===200;
    result.criteria.local_material_exact=material.pass;
    if(result.navigation_http_status!==200){
      result.boundary_code=`CANDIDATE_HTTP_${result.navigation_http_status??'NO_RESPONSE'}`;
      return result;
    }

    try{
      await page.waitForFunction(() => /VERIFICADO/i.test(document.body?.innerText||''),null,{timeout:90000});
      result.criteria.runtime_gate_verified=true;
    }catch{
      result.criteria.runtime_gate_verified=false;
      result.boundary_code='RUNTIME_VERIFICADO_NOT_REACHED';
      return result;
    }

    const frame=await findRuntimeFrame(page);
    result.runtime_frame_url=frame.url();
    result.topics=await smokeTopics(frame);
    result.criteria.four_topic_surfaces=result.topics.length===4&&result.topics.every(item=>item.visible&&item.clicked&&item.practice_signal);

    const scroll=await scrollAndDragProbe(frame);
    result.scroll_probe=scroll;
    result.criteria.scroll_geometry=scroll.applicable&&scroll.programmatic_scroll;
    if(scroll.applicable){
      const probe=frame.locator('[data-wc-scroll-probe="1"]');
      const box=await probe.boundingBox().catch(()=>null);
      if(box){
        const before=await probe.evaluate(el=>el.scrollTop);
        await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
        await page.mouse.wheel(0,180);
        await frame.waitForTimeout(100);
        const afterWheel=await probe.evaluate(el=>el.scrollTop);
        result.wheel_probe={before,after:afterWheel,pass:afterWheel!==before};
        await page.mouse.move(box.x+box.width/2,box.y+box.height*0.75);
        await page.mouse.down();
        await page.mouse.move(box.x+box.width/2,box.y+box.height*0.25,{steps:6});
        await page.mouse.up();
        await frame.waitForTimeout(100);
        const afterDrag=await probe.evaluate(el=>el.scrollTop);
        result.drag_probe={before:afterWheel,after:afterDrag,pass:afterDrag!==afterWheel};
      }
    }
    result.criteria.wheel_trackpad_equivalent=result.wheel_probe?.pass===true;
    result.criteria.grab_drag=result.drag_probe?.pass===true;

    const eraser=frame.getByRole('button',{name:/borr|eraser|goma/i}).first();
    const undo=frame.getByRole('button',{name:/deshacer|undo/i}).first();
    const eraserCount=await eraser.count();
    const undoCount=await undo.count();
    result.r07={eraser_count:eraserCount,undo_count:undoCount,applicable:eraserCount>0||undoCount>0};
    if(!result.r07.applicable){
      result.criteria.r07_pressed_only_and_undo='NOT_APPLICABLE';
    }else{
      result.r07.eraser_visible=eraserCount?await eraser.isVisible().catch(()=>false):false;
      result.r07.undo_visible=undoCount?await undo.isVisible().catch(()=>false):false;
      result.criteria.r07_pressed_only_and_undo=result.r07.eraser_visible&&result.r07.undo_visible;
    }

    result.criteria.no_uncaught_page_errors=runtime.page_errors.length===0;
    await page.screenshot({path:path.join(OUT_DIR,`${view.id}.png`),fullPage:true});
  }catch(error){
    result.fatal_error=error?.stack||error?.message||String(error);
    try{await page.screenshot({path:path.join(OUT_DIR,`${view.id}-fatal.png`),fullPage:true})}catch{}
  }finally{
    result.pass=!result.fatal_error
      && result.criteria.navigation_http_ok===true
      && result.criteria.local_material_exact===true
      && result.criteria.runtime_gate_verified===true
      && result.criteria.four_topic_surfaces===true
      && result.criteria.scroll_geometry===true
      && result.criteria.wheel_trackpad_equivalent===true
      && result.criteria.grab_drag===true
      && result.criteria.no_uncaught_page_errors===true
      && (result.criteria.r07_pressed_only_and_undo===true||result.criteria.r07_pressed_only_and_undo==='NOT_APPLICABLE');
    await context.close();
  }
  return result;
}

async function main(){
  await mkdir(OUT_DIR,{recursive:true});
  const material=await verifyLocalMaterial();
  const evidence={
    schema:'prometeo.alumnos-jose-v11-browser-ci/v1',
    generated_at:new Date().toISOString(),
    authority:'TECHNICAL_CANDIDATE_VERIFICATION_ONLY_NO_V11_CURRENT_CATALOG_LINEAGE_HUMAN_ACCEPTED_OR_SERVED_MUTATION',
    target_url:TARGET_URL,
    expected:{decoded_bytes:EXPECTED_BYTES,sha256:EXPECTED_SHA256},
    local_material:material,
    views:[],
    status:'PENDING'
  };
  try{
    const browser=await chromium.launch({headless:true});
    try{
      for(const view of VIEWS)evidence.views.push(await runView(browser,view,material));
    }finally{await browser.close()}
  }catch(error){evidence.browser_launch_error=error?.stack||error?.message||String(error)}
  evidence.status=material.pass&&evidence.views.length===2&&evidence.views.every(view=>view.pass)?'PASS':'BOUNDARY';
  evidence.boundaries=[...new Set(evidence.views.map(view=>view.boundary_code).filter(Boolean))];
  await writeFile(path.join(OUT_DIR,'evidence.json'),JSON.stringify(evidence,null,2)+'\n','utf8');
  console.log(JSON.stringify(evidence,null,2));
  process.exit(evidence.status==='PASS'?0:1);
}

await main();
