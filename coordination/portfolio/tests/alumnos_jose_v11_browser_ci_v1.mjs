#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TARGET_URL=process.env.ALUMNOS_JOSE_V11_URL||'https://juanmanuelpm.github.io/prometeo/candidates/jose-v11-reviewable-preview/';
const MATERIAL_PATH=process.env.ALUMNOS_JOSE_V11_MATERIAL||'coordination/workstreams/jose-study-design-20260911/material/PROMETEO_JOSE_RECOVERY_ENGINE_V11.html.gz.b64';
const EXPECTED_BYTES=Number(process.env.ALUMNOS_JOSE_V11_BYTES||69235);
const EXPECTED_SHA256=process.env.ALUMNOS_JOSE_V11_SHA256||'0cf9a40fb53e977dccb40c9755d668a3ee922ccd61883f19229bb4a113139a05';
const EXPECTED_BLOB_SHA1=process.env.ALUMNOS_JOSE_V11_BLOB_SHA1||'a58f325e24686a0dfc1f7606a30aed74b1b31a9c';
const OUT_DIR=process.env.ALUMNOS_JOSE_V11_ARTIFACT_DIR||'artifacts/alumnos-jose-v11-browser-ci';
const MATERIAL_ONLY=process.argv.includes('--material-only')||process.env.ALUMNOS_JOSE_V11_MATERIAL_ONLY==='1';
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

function gitBlobSha1(bytes){
  return createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`,'utf8')).update(bytes).digest('hex');
}

function normalizeStoredBase64(text){
  const escapedNewlineTokens=(text.match(/\\r\\n|\\n|\\r/g)||[]).length;
  const withoutEscapedNewlines=text.replace(/\\r\\n|\\n|\\r/g,'');
  const withoutWhitespace=withoutEscapedNewlines.replace(/\s+/g,'');
  return {
    encoded:withoutWhitespace,
    escaped_newline_tokens:escapedNewlineTokens,
    removed_whitespace_chars:withoutEscapedNewlines.length-withoutWhitespace.length,
    invalid_chars:[...new Set(withoutWhitespace.match(/[^A-Za-z0-9+/=]/g)||[])],
    base64_shape:/^[A-Za-z0-9+/]*={0,2}$/.test(withoutWhitespace)
  };
}

async function verifyLocalMaterial(){
  const stored=await readFile(MATERIAL_PATH);
  const rawText=stored.toString('utf8').trim();
  const normalized=normalizeStoredBase64(rawText);
  const result={
    path:MATERIAL_PATH,
    stored_bytes:stored.length,
    stored_sha256:createHash('sha256').update(stored).digest('hex'),
    git_blob_sha1:gitBlobSha1(stored),
    expected_git_blob_sha1:EXPECTED_BLOB_SHA1,
    blob_identity_match:gitBlobSha1(stored)===EXPECTED_BLOB_SHA1,
    escaped_newline_tokens:normalized.escaped_newline_tokens,
    removed_whitespace_chars:normalized.removed_whitespace_chars,
    invalid_chars:normalized.invalid_chars,
    base64_shape_after_normalization:normalized.base64_shape,
    normalized_base64_chars:normalized.encoded.length,
    expected_decoded_bytes:EXPECTED_BYTES,
    expected_sha256:EXPECTED_SHA256,
    pass:false
  };
  if(!normalized.base64_shape){
    result.boundary_code='MATERIAL_BASE64_INVALID_AFTER_NORMALIZATION';
    return result;
  }
  try{
    const compressed=Buffer.from(normalized.encoded,'base64');
    result.compressed_bytes=compressed.length;
    result.compressed_sha256=createHash('sha256').update(compressed).digest('hex');
    const raw=gunzipSync(compressed);
    result.decoded_bytes=raw.length;
    result.sha256=createHash('sha256').update(raw).digest('hex');
    result.pass=raw.length===EXPECTED_BYTES&&result.sha256===EXPECTED_SHA256;
    if(!result.pass) result.boundary_code='MATERIAL_IDENTITY_MISMATCH';
  }catch(error){
    result.boundary_code='MATERIAL_GZIP_INVALID';
    result.decode_error={name:error?.name||'Error',code:error?.code||null,message:error?.message||String(error)};
  }
  return result;
}

async function writeEvidence(evidence){
  await mkdir(OUT_DIR,{recursive:true});
  await writeFile(path.join(OUT_DIR,'evidence.json'),JSON.stringify(evidence,null,2)+'\n','utf8');
  console.log(JSON.stringify(evidence,null,2));
}

async function smokeTopics(frame){
  const results=[];
  for(const topic of TOPICS){
    const loc=frame.getByText(topic.re).first();
    const count=await loc.count().catch(()=>0);
    const item={topic:topic.id,count,visible:false,clicked:false,practice_signal:false};
    if(count){
      item.visible=await loc.isVisible().catch(()=>false);
      if(item.visible){
        await loc.click({timeout:5000}).catch(()=>{});
        item.clicked=true;
        await frame.waitForTimeout(150);
        item.practice_signal=(await frame.locator('[data-level], [data-exercise], [data-practice], .level, [class*="practice" i], [class*="exercise" i]').count().catch(()=>0))>0;
      }
    }
    item.pass=item.visible&&item.clicked&&item.practice_signal;
    results.push(item);
  }
  return results;
}

async function findRuntimeFrame(page){
  const candidates=page.frames().filter(frame=>frame!==page.mainFrame());
  for(const frame of candidates){
    const text=await frame.locator('body').innerText({timeout:1500}).catch(()=>'');
    if(TOPICS.filter(t=>t.re.test(text)).length>=2)return frame;
  }
  return candidates[0]||page.mainFrame();
}

async function interactionProbe(frame,page){
  const scroll=await frame.evaluate(()=>{
    const all=[...document.querySelectorAll('*')];
    const el=all.find(node=>{
      const s=getComputedStyle(node);
      return node.scrollHeight>node.clientHeight+24&&/(auto|scroll)/.test(s.overflowY);
    });
    if(!el)return {applicable:false,pass:false,reason:'no-scrollable-surface'};
    const before=el.scrollTop;
    el.scrollTop=Math.min(el.scrollTop+120,el.scrollHeight-el.clientHeight);
    const after=el.scrollTop;
    el.scrollTop=before;
    el.setAttribute('data-wc-scroll-probe','1');
    return {applicable:true,before,after,pass:after!==before};
  }).catch(error=>({applicable:false,pass:false,error:error?.message||String(error)}));

  const out={scroll};
  if(scroll.applicable){
    const probe=frame.locator('[data-wc-scroll-probe="1"]');
    const box=await probe.boundingBox().catch(()=>null);
    if(box){
      const before=await probe.evaluate(el=>el.scrollTop);
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
      await page.mouse.wheel(0,180);
      await frame.waitForTimeout(100);
      const afterWheel=await probe.evaluate(el=>el.scrollTop);
      out.wheel={before,after:afterWheel,pass:afterWheel!==before};
      await page.mouse.move(box.x+box.width/2,box.y+box.height*0.75);
      await page.mouse.down();
      await page.mouse.move(box.x+box.width/2,box.y+box.height*0.25,{steps:6});
      await page.mouse.up();
      await frame.waitForTimeout(100);
      const afterDrag=await probe.evaluate(el=>el.scrollTop);
      out.grab_drag={before:afterWheel,after:afterDrag,pass:afterDrag!==afterWheel};
    }
  }

  const eraser=frame.getByRole('button',{name:/borr|eraser|goma/i}).first();
  const undo=frame.getByRole('button',{name:/deshacer|undo/i}).first();
  const eraserCount=await eraser.count().catch(()=>0);
  const undoCount=await undo.count().catch(()=>0);
  out.r07={eraser_count:eraserCount,undo_count:undoCount,applicable:eraserCount>0||undoCount>0};
  if(!out.r07.applicable){
    out.r07.pass=true;
    out.r07.reason='not-exposed-by-candidate';
  }else{
    out.r07.eraser_visible=eraserCount?await eraser.isVisible().catch(()=>false):false;
    out.r07.undo_visible=undoCount?await undo.isVisible().catch(()=>false):false;
    out.r07.pass=out.r07.eraser_visible&&out.r07.undo_visible;
  }
  return out;
}

async function runView(browser,view,material){
  const context=await browser.newContext({viewport:view.viewport,isMobile:view.isMobile,hasTouch:view.hasTouch,locale:'es-AR'});
  const page=await context.newPage();
  const runtime={page_errors:[],console_errors:[],request_failures:[]};
  page.on('pageerror',e=>runtime.page_errors.push(e?.message||String(e)));
  page.on('console',m=>{if(m.type()==='error')runtime.console_errors.push(m.text())});
  page.on('requestfailed',r=>runtime.request_failures.push({url:r.url(),error:r.failure()?.errorText||'request_failed'}));
  const result={view:view.id,viewport:view.viewport,runtime,criteria:{},topics:[]};
  try{
    const response=await page.goto(TARGET_URL,{waitUntil:'domcontentloaded',timeout:30000});
    result.navigation_http_status=response?.status()??null;
    result.final_url=page.url();
    result.criteria.navigation_http_ok=result.navigation_http_status===200;
    result.criteria.local_material_exact=material.pass===true;
    if(result.navigation_http_status!==200){
      result.boundary_code=`CANDIDATE_HTTP_${result.navigation_http_status??'NO_RESPONSE'}`;
      return result;
    }
    try{
      await page.waitForFunction(()=>/VERIFICADO/i.test(document.body?.innerText||''),null,{timeout:90000});
      result.criteria.runtime_gate_verified=true;
    }catch{
      result.criteria.runtime_gate_verified=false;
      result.boundary_code='RUNTIME_VERIFICADO_NOT_REACHED';
      return result;
    }
    const frame=await findRuntimeFrame(page);
    result.runtime_frame_url=frame.url();
    result.topics=await smokeTopics(frame);
    result.criteria.four_topic_surfaces=result.topics.length===4&&result.topics.every(x=>x.pass);
    result.interactions=await interactionProbe(frame,page);
    result.criteria.scroll_geometry=result.interactions.scroll?.pass===true;
    result.criteria.wheel_trackpad_equivalent=result.interactions.wheel?.pass===true;
    result.criteria.grab_drag=result.interactions.grab_drag?.pass===true;
    result.criteria.r07_pressed_only_and_undo=result.interactions.r07?.pass===true;
    result.criteria.no_uncaught_page_errors=runtime.page_errors.length===0;
    await page.screenshot({path:path.join(OUT_DIR,`${view.id}.png`),fullPage:true});
  }catch(error){
    result.fatal_error=error?.stack||error?.message||String(error);
    try{await page.screenshot({path:path.join(OUT_DIR,`${view.id}-fatal.png`),fullPage:true})}catch{}
  }finally{
    const c=result.criteria;
    result.pass=!result.fatal_error&&c.navigation_http_ok===true&&c.local_material_exact===true&&c.runtime_gate_verified===true&&c.four_topic_surfaces===true&&c.scroll_geometry===true&&c.wheel_trackpad_equivalent===true&&c.grab_drag===true&&c.r07_pressed_only_and_undo===true&&c.no_uncaught_page_errors===true;
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
    mode:MATERIAL_ONLY?'MATERIAL_ONLY':'REPRESENTATIVE_BROWSER',
    target_url:TARGET_URL,
    expected:{decoded_bytes:EXPECTED_BYTES,sha256:EXPECTED_SHA256,git_blob_sha1:EXPECTED_BLOB_SHA1},
    local_material:material,
    views:[],
    status:'PENDING',
    boundaries:[]
  };

  if(!material.pass){
    evidence.status='BOUNDARY';
    evidence.boundaries=[material.boundary_code||'MATERIAL_GATE_FAILED'];
    evidence.browser_execution='NOT_EXECUTED_SOURCE_GATE_FAILED';
    await writeEvidence(evidence);
    process.exit(1);
  }
  if(MATERIAL_ONLY){
    evidence.status='SOURCE_PASS';
    evidence.browser_execution='DEFERRED_TO_REPRESENTATIVE_BROWSER_STEP';
    await writeEvidence(evidence);
    process.exit(0);
  }

  try{
    const { chromium }=await import('playwright');
    const browser=await chromium.launch({headless:true});
    try{for(const view of VIEWS)evidence.views.push(await runView(browser,view,material))}
    finally{await browser.close()}
  }catch(error){evidence.browser_launch_error=error?.stack||error?.message||String(error)}
  evidence.status=material.pass&&evidence.views.length===2&&evidence.views.every(view=>view.pass)?'PASS':'BOUNDARY';
  evidence.boundaries=[...new Set([
    ...evidence.views.map(view=>view.boundary_code).filter(Boolean),
    ...(evidence.browser_launch_error?['BROWSER_LAUNCH_FAILED']:[])
  ])];
  await writeEvidence(evidence);
  process.exit(evidence.status==='PASS'?0:1);
}

await main();
