import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const publicUrl=process.env.V11_PUBLIC_URL||'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/';
const previewManifestUrl=new URL('./previews/manifest.json',publicUrl).href;
const projectContextUrl=new URL('../../coordination/project-context-v1/INDEX.json',publicUrl).href;
const statsUrl=new URL('../../coordination/analytics/control-room-stats-v1/latest.json',publicUrl).href;
const outDir=path.resolve('artifacts/mp10-v11-served-e2e-focused');
fs.mkdirSync(outDir,{recursive:true});
const evidence={schema:'prometeo.mp10-v11-served-e2e-focused/v1',public_url:publicUrl,checks:{},page_errors:[],console_errors:[],requests:[],authenticated_transport:{state:'BOUNDARY_NOT_EXERCISED',pass:false,reason:'Focused verifier does not possess authenticated Page Change credentials or fresh-worker wake authority.'}};
const failures=[];
const check=(name,ok,details={})=>{evidence.checks[name]={result:ok?'PASS':'FAIL',details};if(!ok)failures.push(name)};
const browser=await chromium.launch({headless:true});
try{
  const desktop=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await desktop.newPage();
  page.on('pageerror',e=>evidence.page_errors.push(String(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')evidence.console_errors.push(m.text())});
  page.on('request',r=>evidence.requests.push({method:r.method(),url:r.url(),resource_type:r.resourceType()}));
  const response=await page.goto(publicUrl,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(2500);
  check('public_v11_http_200',response?.status()===200,{status:response?.status()??null,url:page.url()});

  await page.evaluate(()=>{document.querySelector('.tab[data-view="trabajo"]')?.click()});
  await page.waitForTimeout(250);
  const command=page.locator('#commandInputV11'),send=page.locator('#commandSendV11'),state=page.locator('#commandStateV11');
  const present=await command.isVisible().catch(()=>false)&&await send.isVisible().catch(()=>false);
  let commandDetails={present};
  if(present){
    const maxlength=await command.getAttribute('maxlength');
    const button=((await send.textContent())||'').trim();
    const initial=((await state.textContent())||'').trim();
    const postsBefore=evidence.requests.filter(r=>r.method==='POST').length;
    await command.fill('verificación CI enfocada · no enviar');
    await page.waitForTimeout(350);
    const postsAfter=evidence.requests.filter(r=>r.method==='POST').length;
    const edited=((await state.textContent())||'').trim();
    commandDetails={present,maxlength,button,initial,edited,posts_before:postsBefore,posts_after:postsAfter};
    check('command_dom_fail_closed',maxlength==='6000'&&button==='HACER'&&!/queued|en cola|enviando/i.test(initial)&&!/queued|en cola|enviando/i.test(edited)&&postsBefore===postsAfter,commandDetails);
  }else check('command_dom_fail_closed',false,commandDetails);

  const iframeCount=await page.locator('iframe').count();
  const request=desktop.request;
  const fetchJson=async url=>{const r=await request.get(url,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache'}});let json=null,error=null;try{json=await r.json()}catch(e){error=String(e)}return{status:r.status(),json,error}};
  const preview=await fetchJson(previewManifestUrl);
  const rows=Array.isArray(preview.json?.surfaces)?preview.json.surfaces:[];
  check('static_previews_no_live_iframe',iframeCount===0&&preview.status===200&&preview.json?.schema==='prometeo.static-preview-manifest/v1'&&rows.length>0&&rows.every(x=>x.state!=='AVAILABLE'||String(x.preview_path||'').endsWith('.png')),{iframe_count:iframeCount,status:preview.status,schema:preview.json?.schema||null,surface_count:rows.length,error:preview.error});

  const project=await fetchJson(projectContextUrl),projects=Array.isArray(project.json?.projects)?project.json.projects:[];
  check('project_context_truthful',project.status===200&&project.json?.schema==='prometeo.project-context-index/v1'&&project.json?.projection_status==='NON_AUTHORITATIVE_PROJECTION'&&Number.isInteger(project.json?.project_count)&&project.json.project_count===projects.length,{status:project.status,schema:project.json?.schema||null,projection_status:project.json?.projection_status||null,project_count:project.json?.project_count??null,rows:projects.length});

  const stats=await fetchJson(statsUrl),truth=Array.isArray(stats.json?.truth_boundaries)?stats.json.truth_boundaries:[];
  check('stats_truthful',stats.status===200&&stats.json?.schema==='prometeo.control-room-stats/v1'&&stats.json?.authority==='OBSERVABILITY_ONLY'&&truth.some(x=>String(x).includes('Missing evidence is unknown')),{status:stats.status,schema:stats.json?.schema||null,authority:stats.json?.authority||null,truth_boundaries:truth});

  const html=await page.content();
  const secretMarkers=['SUPABASE_SERVICE_ROLE_KEY','service_role_secret','BEGIN PRIVATE KEY','Authorization: Bearer '];
  const exposed=secretMarkers.filter(x=>html.includes(x));
  check('no_obvious_public_secret_markers',exposed.length===0,{scanned_markers:secretMarkers,exposed});

  const narrow=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const np=await narrow.newPage();
  const nr=await np.goto(publicUrl,{waitUntil:'domcontentloaded',timeout:45000});
  await np.waitForTimeout(2000);
  const geometry=await np.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}));
  check('narrow_layout',nr?.status()===200&&geometry.scrollWidth<=geometry.innerWidth+2&&geometry.bodyScrollWidth<=geometry.innerWidth+2,{status:nr?.status()??null,viewport:{width:390,height:844},geometry});
  await np.screenshot({path:path.join(outDir,'v11-narrow.png'),fullPage:true});
  await narrow.close();

  await page.screenshot({path:path.join(outDir,'v11-desktop.png'),fullPage:true});
  check('page_errors_empty',evidence.page_errors.length===0,{count:evidence.page_errors.length,errors:evidence.page_errors});
  evidence.overall=failures.length?'FAIL':'PASS';
  evidence.failures=failures;
  evidence.completed_at=new Date().toISOString();
  fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  if(failures.length) process.exitCode=1;
}finally{await browser.close()}
