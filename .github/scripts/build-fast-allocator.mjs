import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.argv[2] || '.');
const feedPath = path.resolve(process.argv[3] || '/tmp/feed.json');
const efficiencyPath = path.resolve(process.argv[4] || '/tmp/efficiency.json');
const outPath = path.resolve(process.argv[5] || '/tmp/allocator.json');
const now = Date.now();

const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
const efficiency = JSON.parse(fs.readFileSync(efficiencyPath, 'utf8'));
const metabolism = JSON.parse(fs.readFileSync(path.join(root, 'coordination/guide/METABOLISM_POLICY_V1.json'), 'utf8'));
const portfolio = JSON.parse(fs.readFileSync(path.join(root, 'coordination/portfolio/PORTFOLIO.json'), 'utf8'));

const read = rel => { try { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); } catch { return null; } };
const walk = rel => {
  const base = path.join(root, rel);
  if (!fs.existsSync(base)) return [];
  const out=[];
  for (const ent of fs.readdirSync(base,{withFileTypes:true})) {
    const child=path.posix.join(rel,ent.name);
    if(ent.isDirectory()) out.push(...walk(child)); else out.push(child);
  }
  return out;
};
const docs = rel => walk(rel).filter(x=>x.endsWith('.json')).map(p=>({path:p,doc:read(p)})).filter(x=>x.doc);
const time = v => Date.parse(v || '') || 0;
const eventTime = d => time(d?.returned_at||d?.completed_at||d?.heartbeat_at||d?.observed_at||d?.started_at||d?.claimed_at||d?.launched_at||d?.created_at||d?.updated_at||d?.timestamp);
const g = n => String(n).padStart(6,'0');
const uniq = xs => [...new Set(xs.filter(Boolean))].sort((a,b)=>Buffer.from(a).compare(Buffer.from(b)));
const clamp = (min,x,max) => Math.max(min,Math.min(max,x));
const lower = v => String(v??'').toLowerCase();
const sha12 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0,12);
const roleLower = role => role.replace(/^GUIDE_/,'').toLowerCase();

const allJobs=(feed.projects||[]).flatMap(p=>(p.jobs||[]).map(j=>({...j,project_label:p.label})));
const byPriority=(a,b)=>(b.priority||0)-(a.priority||0)||String(a.job_id||a.opportunity_id||a.role_id).localeCompare(String(b.job_id||b.opportunity_id||b.role_id));

function compactPortfolio(j){
  const current=Number(j.pin_generation||0), next=current+1;
  const predecessor=current?`coordination/portfolio/pins/${j.job_id}/G${g(current)}.json`:null;
  return {
    job_id:j.job_id,dedupe_key:j.dedupe_key||null,project_id:j.project_id||null,project_label:j.project_label||null,
    title:j.title||j.job_id,priority:j.priority||0,state:j.state,authority_mode:j.authority_mode||null,
    pin_generation:current,next_generation:next,claim_mode:'PORTFOLIO_PIN_CREATE',
    claim_path:`coordination/portfolio/pins/${j.job_id}/G${g(next)}.json`,
    claim_payload_shape:{
      schema:'prometeo.portfolio-pin/v1',pin_id:`pin-${j.job_id}-G${g(next)}-<worker_id>`,job_id:j.job_id,
      dedupe_key:j.dedupe_key||null,project_id:j.project_id||null,generation:next,worker_id:'<worker_id>',
      claim_id:`claim-${j.job_id}-G${g(next)}-<worker_id>`,claimed_at:'<now_iso>',expires_at:'<now_plus_10m_iso>',
      source_head:feed.source_sha||'<allocator_source_sha>',predecessor_pin_ref_or_null:predecessor,
      predecessor_claim_ref_or_null:null,recovery_basis_or_null:current?{
        allocator_generated_at:feed.generated_at,predecessor_last_signal_at:j.last_signal_at||null,allocator_state:j.state
      }:null
    },
    predecessor_pin_ref:predecessor,last_signal_at:j.last_signal_at||null,post_claim_validate:true
  };
}

const ready=allJobs.filter(j=>['ready','partial'].includes(j.state)).sort(byPriority).map(compactPortfolio).slice(0,40);
const queue_ready=(feed.plans||[]).flatMap(p=>(p.items||[]).filter(i=>i.state==='ready').map(i=>({
  opportunity_id:i.opportunity_id,mission:i.mission,priority:i.priority||0,plan_id:p.id,
  claim_mode:'OPPORTUNITY_CLAIM_CREATE',claim_path:`coordination/opportunities/claims/${i.opportunity_id}.json`,
  claim_payload_shape:{schema:'prometeo.opportunity-claim/v1',worker_id:'<worker_id>',opportunity_id:i.opportunity_id,claimed_at:'<now_iso>'},post_claim_validate:true
}))).sort((a,b)=>b.priority-a.priority).slice(0,30);
const recovery=allJobs.filter(j=>j.state==='replaceable').sort(byPriority).map(compactPortfolio).slice(0,30);

const guideReceipts=docs('coordination/guide/receipts');
const consumedReturns=new Set(guideReceipts.flatMap(r=>Array.isArray(r.doc.consumed_returns)?r.doc.consumed_returns:[]));
const receiptByWork=new Map();
for(const r of guideReceipts){
  const id=r.doc.guide_work_id;
  if(id){ const xs=receiptByWork.get(id)||[]; xs.push(r); receiptByWork.set(id,xs); }
}
const guidePins=docs('coordination/guide/pins');
const heartbeats=docs('coordination/workers/heartbeats');
const hbByWorker=new Map();
for(const h of heartbeats){
  const wid=h.doc.worker_id||h.doc.session_id||h.path.split('/')[3];
  if(!wid)continue;
  const xs=hbByWorker.get(wid)||[];xs.push(h);hbByWorker.set(wid,xs);
}
const beacons=docs('coordination/workers/beacons');
const noAlloc=docs('coordination/workers/no-allocation');

const sig=metabolism.signals||{};
const recentWindow=(sig.recent_launch_window_minutes||10)*60_000;
const recentBeacons=beacons.filter(b=>now-eventTime(b.doc)<=recentWindow);
const recentNoAlloc=noAlloc.filter(n=>now-eventTime(n.doc)<=recentWindow);
const floor=Number(sig.frontier_floor_absolute||8), per=Number(sig.frontier_per_recent_launch||1.5), ceiling=Number(sig.frontier_ceiling||40);
const targetClaimable=clamp(floor,Math.ceil(per*recentBeacons.length),ceiling);
const cleanFrontier=ready.length+queue_ready.length;

const recentReturnWindow=6*60*60_000;
const materialReturnRows=[];
for(const j of allJobs){
  for(const r of (j.returns||[])){
    const rp=r.path||null, rt=eventTime(r);
    const outcome=lower(r.outcome||r.status||r.result);
    if(!rp||!rt||now-rt>recentReturnWindow)continue;
    if(!['done','verified','no_action_needed','superseded','partial','boundary'].some(x=>outcome.includes(x)))continue;
    if(consumedReturns.has(rp))continue;
    materialReturnRows.push({path:rp,time:rt,outcome,job_id:j.job_id});
  }
}
materialReturnRows.sort((a,b)=>b.time-a.time||a.path.localeCompare(b.path));
const unconsumedReturnRefs=uniq(materialReturnRows.slice(0,12).map(x=>x.path));

const recoveryEvidence=uniq(recovery.slice(0,8).map(x=>x.predecessor_pin_ref||`coordination/portfolio/PORTFOLIO.json#job:${x.job_id}`));
const collisionEvidence=uniq(allJobs.flatMap(j=>(j.collisions||[]).map(c=>c.path)).slice(-12));
const partialEvidence=uniq(allJobs.filter(j=>['partial','blocked'].includes(j.state)).flatMap(j=>{
  const r=(j.returns||[]).at(-1);
  return [r?.path,j.source_path||`coordination/portfolio/PORTFOLIO.json#job:${j.job_id}`];
}).slice(0,12));
const unresolvedEvidence=uniq(allJobs.filter(j=>j.state!=='done').sort(byPriority).slice(0,12).map(j=>j.source_path||`coordination/portfolio/PORTFOLIO.json#job:${j.job_id}`));

const youngAge=(sig.young_active_pin_guard_age_minutes||3)*60_000;
const youngActive=(feed.workers||[]).filter(w=>!w.end_at && (w.pin_at||w.job_id) && now-time(w.last_signal_at||w.pin_at||w.start_at||w.first_seen)<=youngAge).length;
const guardMin=Math.max(Number(sig.young_active_pin_guard_minimum||4),Math.ceil(Number(sig.young_active_pin_guard_fraction_of_recent_launches||0.5)*recentBeacons.length));
const overloadGuard=recentBeacons.length>=8 && youngActive>=guardMin;

function existingRoleBusy(role){
  return allJobs.some(j=>j.guide_role===role && ['ready','working','recovery','suspect','partial'].includes(j.state));
}
function rolePinState(roleId){
  const rows=guidePins.filter(p=>p.path.startsWith(`coordination/guide/pins/${roleId}/`)).sort((a,b)=>{
    const ga=Number(a.path.match(/G(\d+)\.json$/)?.[1]||0), gb=Number(b.path.match(/G(\d+)\.json$/)?.[1]||0);
    return ga-gb||eventTime(a.doc)-eventTime(b.doc);
  });
  const latest=rows.at(-1)||null;
  if((receiptByWork.get(roleId)||[]).length)return {terminal:true,active:false,generation:Number(latest?.path.match(/G(\d+)\.json$/)?.[1]||0),latest};
  if(!latest)return {terminal:false,active:false,generation:0,latest:null};
  const wid=latest.doc.worker_id;
  const hb=(hbByWorker.get(wid)||[]).sort((a,b)=>eventTime(a.doc)-eventTime(b.doc)).at(-1)||null;
  const last=Math.max(eventTime(latest.doc),eventTime(hb?.doc));
  return {terminal:false,active:!!last && now-last<10*60_000,generation:Number(latest.path.match(/G(\d+)\.json$/)?.[1]||0),latest};
}
function roleCandidate(role,trigger,evidence,title,mission,priority){
  evidence=uniq(evidence).slice(0,12);
  if(!evidence.length||existingRoleBusy(role))return null;
  const preimage=JSON.stringify({role,trigger,evidence});
  const fingerprint=sha12(preimage), role_id=`guide-${roleLower(role)}-${fingerprint}`;
  const rs=rolePinState(role_id);
  if(rs.terminal||rs.active)return null;
  const next=rs.generation+1, predecessor=rs.generation?`coordination/guide/pins/${role_id}/G${g(rs.generation)}.json`:null;
  return {
    role_id,guide_work_id:role_id,role,trigger,fingerprint,title,mission,priority,evidence,
    state:rs.generation?'replaceable':'ready',generation:rs.generation,next_generation:next,
    claim_mode:'GUIDE_ROLE_PIN_CREATE',claim_path:`coordination/guide/pins/${role_id}/G${g(next)}.json`,
    claim_payload_shape:{
      schema:'prometeo.guide-role-pin/v1',pin_id:`pin-${role_id}-G${g(next)}-<worker_id>`,guide_work_id:role_id,
      role,trigger,generation:next,worker_id:'<worker_id>',claim_id:`claim-${role_id}-G${g(next)}-<worker_id>`,
      claimed_at:'<now_iso>',expires_at:'<now_plus_10m_iso>',source_head:feed.source_sha||'<allocator_source_sha>',
      evidence,predecessor_pin_ref_or_null:predecessor
    },
    post_claim_validate:true
  };
}

const role_ready=[];
if(unconsumedReturnRefs.length>=Number(sig.unconsumed_returns_trigger||3)){
  role_ready.push(roleCandidate('GUIDE_INTEGRATOR','RETURNS_UNCONSUMED',unconsumedReturnRefs,
    'Integrar returns recientes y abrir sus sucesores',
    'Consumí los returns listados, reconciliá duplicados/conflictos, persistí disposición y materializá todos los sucesores seguros actualmente fundados. Después reentrá al allocator.',170));
}
if(cleanFrontier<targetClaimable && unresolvedEvidence.length && !overloadGuard){
  role_ready.push(roleCandidate('GUIDE_PLANNER','FRONTIER_THIN',unresolvedEvidence,
    `Reponer frontier útil (${cleanFrontier}/${targetClaimable})`,
    'Usá los objetivos y pendientes evidenciados para materializar 1–7 trabajos no duplicados de implementación/verificación/integración. Nada de filler ni análisis sin jobs. Después intentá ejecutar o verificar uno.',165));
}
const rescueRefs=uniq([...recoveryEvidence,...collisionEvidence,...(efficiency.status==='REGRESSION'?['coordination/efficiency/RATCHET_BASELINE_V1.json']:[]),...recentNoAlloc.slice(0,4).map(x=>x.path)]);
if(recovery.length>=Number(sig.replaceable_trigger||3) || collisionEvidence.length>=Number(sig.collision_pressure_trigger||3) || efficiency.status==='REGRESSION' || recentNoAlloc.length>=3){
  role_ready.push(roleCandidate('GUIDE_RESCATE','LOW_YIELD',rescueRefs,
    'Rescatar el cuello de producción más multiplicativo',
    'Encontrá el mecanismo común detrás de recovery/colisiones/no-allocation y cambialo durablemente. Preferí compiler/protocolo/CI sobre reparar workers uno por uno; agregá ratchet si es hot path y dejá verificación acotada.',175));
}
if(partialEvidence.length>=Number(sig.partial_loop_trigger||2) || efficiency.status==='REGRESSION'){
  role_ready.push(roleCandidate('GUIDE_CRITIC','PARTIAL_LOOP',uniq([...partialEvidence,...(efficiency.status==='REGRESSION'?['coordination/efficiency/RATCHET_BASELINE_V1.json']:[])]),
    'Atacar un loop parcial o una señal falsa de cierre',
    'Auditá independientemente la ruta débil evidenciada. Si el defecto es solucionable, materializá o implementá el repair/verify mínimo; no devuelvas sólo crítica.',160));
}

const roles=role_ready.filter(Boolean).sort((a,b)=>b.priority-a.priority||a.role_id.localeCompare(b.role_id));
const out={
  schema:'prometeo.fast-allocator/v3',generated_at:feed.generated_at,source_sha:feed.source_sha||null,
  truth_boundary:'COMPILED_EXECUTION_PLUS_LATENT_ROLE_FRONTIER',max_recovery_snapshot_age_seconds:90,
  preferred_order:['ready','queue_ready','role_ready','recovery'],
  counts:{ready:ready.length,queue_ready:queue_ready.length,role_ready:roles.length,recovery:recovery.length},
  ready,queue_ready,role_ready:roles,recovery,
  metabolism:{recent_launches:recentBeacons.length,target_claimable:targetClaimable,clean_frontier:cleanFrontier,overload_guard:overloadGuard,young_active:youngActive,unconsumed_returns:unconsumedReturnRefs.length,recent_no_allocation:recentNoAlloc.length},
  worker_projection:feed.summary?.workers||{},efficiency:{status:efficiency.status,metrics:efficiency.metrics,reasons:efficiency.reasons},diagnostics:feed.diagnostics||{}
};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(`allocator v3 ready=${ready.length} queue=${queue_ready.length} roles=${roles.length} recovery=${recovery.length} target=${targetClaimable} recent=${recentBeacons.length}`);
