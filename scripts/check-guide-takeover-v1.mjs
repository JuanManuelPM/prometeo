import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const takeoverRoot=path.join(root,'coordination','guide','takeovers');
const fail=[];
const note=[];
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){fail.push('invalid/missing '+p);return null}};
const readText=p=>{try{return fs.readFileSync(p,'utf8')}catch(e){fail.push('missing '+p);return ''}};
const dirs=fs.existsSync(takeoverRoot)?fs.readdirSync(takeoverRoot,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name):[];
const finalDirs=dirs.filter(d=>fs.existsSync(path.join(takeoverRoot,d,'30_FINAL.json')));
if(finalDirs.length===0){console.log('GUIDE_TAKEOVER_NO_FINAL_SESSIONS');process.exit(0)}

const allowed=new Set(['PROTOCOL_MUTATION','SYSTEMIC_RESCUE','EXPERIMENT_ACTIVATION','PROJECT_INTEGRATION','PUBLIC_SURFACE_UPDATE','CONTRADICTION_REPAIR','FRONTIER_REPAIR','CHAMPION_PROMOTION_OR_REJECTION']);
const requiredSections=['TAKEOVER','QUÉ CAMBIÓ','SALUD DEL PLAN','PALANCAS DE POTENCIA','PROYECTOS / PÁGINAS','PLAN DE ARCHIVOS / EXPERIMENTOS','LÍMITES REALES','GUIDE BRIEF','GROWTH','RELEVANT PAGES','/wc PROMPT','HUMAN ACTION','NEXT GUIDE CYCLE'];
const requiredHydrated=['mission_id','mission_status','pool_id','worker_protocol_version','compounding_health','campaign_stage','runtime_generated_at','frontier_generated_at','scoreboard_generated_at','leader_score','champion_reproducible','guide_brief_generated_at','previous_visible_response_ref'];
const mission=readJson(path.join(root,'coordination','guide','CURRENT_MISSION_V1.json'))||{};
const wcPrompt=mission?.operating_mode?.invocation||'';
const pageWatch=readJson(path.join(root,'coordination','live','PAGE_WATCH_REGISTRY_V1.json'))||{pages:[]};
const knownPageUrls=new Set((pageWatch.pages||[]).map(x=>x.url).filter(Boolean));

for(const d of finalDirs){
  const base=path.join(takeoverRoot,d);
  const p0=readJson(path.join(base,'00_STARTED.json'));
  const p1=readJson(path.join(base,'10_HYDRATED.json'));
  const p2=readJson(path.join(base,'20_ACTED.json'));
  const p3=readJson(path.join(base,'30_FINAL.json'));
  if(!p0||!p1||!p2||!p3) continue;
  for(const [n,p,phase] of [['00',p0,'00_STARTED'],['10',p1,'10_HYDRATED'],['20',p2,'20_ACTED'],['30',p3,'30_FINAL']]){
    if(p.session_id!==d) fail.push(d+': '+n+' session_id mismatch');
    if(p.phase!==phase) fail.push(d+': '+n+' phase mismatch');
    if(p.canary_id!=='TKV1') fail.push(d+': '+n+' canary_id drift');
  }
  if(p0.trigger_token!=='TAKEOVER CANARY TKV1') fail.push(d+': wrong trigger token');
  if(!String(p0.bootstrap_version||'').includes('1.9')) fail.push(d+': bootstrap version is not v1.9');
  if(!String(p0.human_prompt_literal||'').includes('TAKEOVER CANARY TKV1')) fail.push(d+': literal prompt missing trigger');

  const observed=p1.observed||p1.extracted||{};
  for(const k of requiredHydrated){
    if(observed[k]===undefined||observed[k]===null||observed[k]==='') fail.push(d+': hydrated missing '+k);
  }
  const evidence=Array.isArray(p1.evidence_loaded)?p1.evidence_loaded:[];
  const mustRefs=['coordination/CONTINUITY_HEAD.json','coordination/guide/CURRENT_MISSION_V1.json','coordination/guide/GUIDE_POWER_COMPASS_V1.json','coordination/guide/GROWTH_CAMPAIGN_V1.json','gh-pages:live/runtime.json','gh-pages:live/claim-frontier.json','gh-pages:live/worker-scoreboard.json','gh-pages:guide/brief.json'];
  for(const ref of mustRefs) if(!evidence.some(x=>String(x).includes(ref))) fail.push(d+': hydrated evidence missing '+ref);
  if(p1.previous_visible_response_read!==true) fail.push(d+': previous visible response was not marked read');
  if(observed.previous_visible_response_ref && !evidence.some(x=>String(x).includes(observed.previous_visible_response_ref))) fail.push(d+': previous visible response ref missing from evidence_loaded');
  if(observed.mission_id!==mission.mission_id) fail.push(d+': mission id mismatch');
  if(observed.pool_id!==mission?.operating_mode?.pool_id) fail.push(d+': pool id mismatch');

  const actions=Array.isArray(p2.material_actions)?p2.material_actions:[];
  if(actions.length<1) fail.push(d+': no material action');
  for(const a of actions){
    if(!allowed.has(a.action_type)) fail.push(d+': invalid/non-material action_type '+String(a.action_type));
    if(!Array.isArray(a.changed_refs)||a.changed_refs.length<1) fail.push(d+': action missing changed_refs');
    if(!a.causal_evidence) fail.push(d+': action missing causal_evidence');
  }
  if(p2.status==='NO_SAFE_ACTION') fail.push(d+': NO_SAFE_ACTION cannot yield PASS');

  if(p3.canary_result!=='PASS') fail.push(d+': final result is not PASS');
  const respRef=p3.visible_response_ref;
  if(!respRef) {fail.push(d+': final missing visible_response_ref');continue}
  const respPath=path.join(root,respRef);
  const resp=readText(respPath);
  if(resp.length<3500) fail.push(d+': visible response too short for TKV1 completeness ('+resp.length+' chars)');
  for(const sec of requiredSections) if(!resp.includes(sec)) fail.push(d+': response missing section '+sec);
  if(!resp.includes('https://juanmanuelpm.github.io/prometeo/guide/')) fail.push(d+': response missing Guide Brief');
  if(!resp.includes('https://juanmanuelpm.github.io/prometeo/growth/')) fail.push(d+': response missing Growth');
  if(wcPrompt && !resp.includes(wcPrompt)){
    const stableWorkerPrompt = resp.includes('PROMETEO /wc') && resp.includes('POOL PROD-01') && resp.includes('https://juanmanuelpm.github.io/prometeo/wc/');
    if(!stableWorkerPrompt) fail.push(d+': response missing canonical /wc pool invocation family');
    else note.push(d+': historical response preserves canonical /wc family but differs from later current prompt bytes');
  }

  const levers=Array.isArray(p3.power_levers)?p3.power_levers:[];
  if(levers.length<3) fail.push(d+': fewer than 3 power levers');
  const kinds=new Set(levers.map(x=>x.kind));
  for(const k of ['EXECUTED_NOW','NEAR_TERM','STRUCTURAL_CREATIVE']) if(!kinds.has(k)) fail.push(d+': missing power lever kind '+k);

  const urls=Array.isArray(p3.relevant_page_urls)?p3.relevant_page_urls:[];
  if(urls.length<3) fail.push(d+': fewer than 3 relevant page URLs');
  for(const u of urls){
    if(!resp.includes(u)) fail.push(d+': relevant URL absent from response '+u);
    if(!knownPageUrls.has(u) && !u.includes('/__canary/')) note.push(d+': non-registry relevant URL '+u);
  }

  if(p3.human_action===undefined) fail.push(d+': human_action missing');
  if(!p3.next_guide_cycle) fail.push(d+': next_guide_cycle missing');
  if(!Array.isArray(p3.changed_refs)||p3.changed_refs.length<1) fail.push(d+': final changed_refs missing');
}

if(note.length){for(const x of note) console.log('NOTE '+x)}
if(fail.length){
  console.error('GUIDE_TAKEOVER_TKV1_FAIL');
  for(const x of fail) console.error('- '+x);
  process.exit(1);
}
console.log('GUIDE_TAKEOVER_TKV1_PASS '+finalDirs.join(','));
