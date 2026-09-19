import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EVENT_PREFIX = 'PROMETEO_EVENT ';
const ALLOWED = new Set(['ROUTED','CLAIM_RESULT','CLOSE']);

function walk(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const p = path.join(dir,ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
function readJson(p) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }

const NON_PRODUCTIVE_OUTCOME_RE = /(NO_ACTION|ROUTE_ABORTED|BOUNDARY|STALE|TRANSPORT|CANCELLED|CANCELED|CLAIM_LOST|CREATE_EXISTS|NO_ALLOCATION)/;
const CONTROL_ONLY_PREFIXES = [
  'coordination/portfolio/pins/',
  'coordination/portfolio/claims/',
  'coordination/guide/pins/',
  'coordination/workers/beacons/',
  'coordination/workers/started/',
  'coordination/workers/heartbeats/',
  'coordination/workers/no-allocation/'
];
function asArray(value) { return Array.isArray(value) ? value : []; }
function repoRef(root,p) { return path.relative(root,p).split(path.sep).join('/'); }
function productiveUnit(row, kind, ref) {
  const d=row||{};
  if (!d.worker_id || d.productive_unit_counted === false) return null;
  const at=d.returned_at||d.created_at||d.completed_at||d.updated_at||null;
  if (d.productive_unit_counted === true) return {ref,kind,at,basis:'EXPLICIT_RECEIPT_MARKER'};
  const outcome=String(d.outcome||d.status||d.state||'').toUpperCase();
  if (NON_PRODUCTIVE_OUTCOME_RE.test(outcome)) return null;
  const materialPaths=asArray(d.changed_paths).filter(p=>p && !CONTROL_ONLY_PREFIXES.some(prefix=>String(p).startsWith(prefix)));
  const frontierChanges=asArray(d.created_jobs).filter(Boolean).length + asArray(d.spawn_candidates).filter(Boolean).length;
  const integrations=asArray(d.consumed_returns).filter(Boolean).length;
  const verification=asArray(d.tests).filter(Boolean).length > 0 &&
    (/(DONE|COMPLETE|COMPLETED|PASS|PASSED|SUCCESS|VERIFIED|RETURNED)/.test(outcome) || kind==='guide-receipt');
  if (!materialPaths.length && !frontierChanges && !integrations && !verification) return null;
  return {ref,kind,at,basis:'DURABLE_RECEIPT_EVIDENCE'};
}

export function parseEventComment(comment) {
  const body = String(comment?.body || '');
  let raw = null;
  const line = body.split(/\r?\n/).find(x=>x.trim().startsWith(EVENT_PREFIX));
  if (line) raw = line.trim().slice(EVENT_PREFIX.length);
  if (!raw) {
    const m = body.match(/PROMETEO_EVENT[\s\S]*?```(?:json)?\s*([\s\S]*?)```/i);
    if (m) raw = m[1].trim();
  }
  if (!raw) return null;
  try {
    const e = JSON.parse(raw);
    if (e?.schema !== 'prometeo.worker-event/v1') return null;
    if (!ALLOWED.has(e.event)) return null;
    if (!e.worker_id || !e.batch_id) return null;
    return {
      ...e,
      server_created_at: comment.created_at || null,
      github_comment_id: comment.id ?? null,
      github_comment_url: comment.html_url || comment.url || null
    };
  } catch { return null; }
}

function repoEvidence(root) {
  const beacons = new Map(), pins = new Map(), noalloc = new Map(), exams = new Map(), beaconDocs = [], productiveByWorker = new Map();
  const launchClaims = new Map(), reallocationClaims = new Map(), benchmarkReceipts = new Map(), runPackets = new Map();
  if (!root) return {beacons,pins,noalloc,exams,beaconDocs,productiveByWorker,launchClaims,reallocationClaims,benchmarkReceipts,runPackets};

  for (const p of walk(path.join(root,'coordination','workers','beacons'))) {
    const d=readJson(p); if (d?.worker_id) {
      const ref=path.relative(root,p).split(path.sep).join('/');
      beacons.set(d.worker_id,ref);
      beaconDocs.push({path:ref,doc:d});
    }
  }
  for (const p of walk(path.join(root,'coordination','launch-packets')).filter(x=>x.endsWith('.json'))) {
    const d=readJson(p); if (!d) continue;
    const ref=repoRef(root,p);
    if (path.basename(p)==='PACKET.json' && d.run_id) {
      runPackets.set(d.run_id,{doc:d,ref});
      continue;
    }
    if (!d.worker_id || !d.run_id || !d.slot_id) continue;
    const row={doc:d,ref};
    if (ref.includes('/reallocation-claims/')) reallocationClaims.set(d.worker_id,row);
    else if (ref.includes('/claims/')) launchClaims.set(d.worker_id,row);
  }
  for (const p of walk(path.join(root,'coordination','workers','benchmark-receipts')).filter(x=>x.endsWith('.json'))) {
    const d=readJson(p); if (d?.worker_id) benchmarkReceipts.set(d.worker_id,{doc:d,ref:repoRef(root,p)});
  }
  for (const base of [
    path.join(root,'coordination','portfolio','pins'),
    path.join(root,'coordination','guide','pins')
  ]) for (const p of walk(base)) {
    const d=readJson(p); if (d?.worker_id) {
      const arr=pins.get(d.worker_id)||[];
      arr.push(path.relative(root,p).split(path.sep).join('/')); pins.set(d.worker_id,arr);
    }
  }
  for (const p of walk(path.join(root,'coordination','workers','no-allocation'))) {
    const d=readJson(p); if (d?.worker_id) noalloc.set(d.worker_id,repoRef(root,p));
  }
  for (const p of walk(path.join(root,'coordination','workers','exams')).filter(x=>x.endsWith('.json'))) {
    const d=readJson(p); if (d?.worker_id) exams.set(d.worker_id,repoRef(root,p));
  }
  for (const [base,kind] of [
    [path.join(root,'coordination','portfolio','returns'),'portfolio-return'],
    [path.join(root,'coordination','guide','receipts'),'guide-receipt']
  ]) for (const p of walk(base).filter(x=>x.endsWith('.json'))) {
    const d=readJson(p);
    const unit=productiveUnit(d,kind,repoRef(root,p));
    if (!unit) continue;
    const units=productiveByWorker.get(d.worker_id)||[];
    units.push(unit);
    productiveByWorker.set(d.worker_id,units);
  }
  for (const units of productiveByWorker.values()) {
    units.sort((a,b)=>Date.parse(a.at||0)-Date.parse(b.at||0)||String(a.ref).localeCompare(String(b.ref)));
  }
  return {beacons,pins,noalloc,exams,beaconDocs,productiveByWorker,launchClaims,reallocationClaims,benchmarkReceipts,runPackets};
}

export function compileRuntime(comments, root=null, nowIso=new Date().toISOString()) {
  const events=(comments||[]).map(parseEventComment).filter(Boolean)
    .sort((a,b)=>Date.parse(a.server_created_at||0)-Date.parse(b.server_created_at||0));
  const repo=repoEvidence(root);
  const batches=new Map();

  for (const e of events) {
    if (!batches.has(e.batch_id)) batches.set(e.batch_id,{batch_id:e.batch_id,expected_workers:null,events:[],workers:new Map(),first_event_at:null,last_event_at:null});
    const b=batches.get(e.batch_id);
    b.events.push(e);
    if (Number.isFinite(Number(e.expected_workers)) && Number(e.expected_workers)>0) b.expected_workers=Math.max(b.expected_workers||0,Number(e.expected_workers));
    b.first_event_at ||= e.server_created_at;
    b.last_event_at = e.server_created_at || b.last_event_at;
    if (!b.workers.has(e.worker_id)) b.workers.set(e.worker_id,{worker_id:e.worker_id,events:[],first_event_at:e.server_created_at,last_event_at:e.server_created_at});
    const w=b.workers.get(e.worker_id); w.events.push(e); w.last_event_at=e.server_created_at||w.last_event_at;
  }

  // Beacon is the first durable proof that a launched chat reached Prometeo.
  // Telemetry is best-effort, so missing Issue comments must not erase a real worker.
  for (const row of repo.beaconDocs || []) {
    const d=row.doc||{};
    if (!d.worker_id || !d.batch_id) continue;
    if (!batches.has(d.batch_id)) batches.set(d.batch_id,{batch_id:d.batch_id,expected_workers:null,events:[],workers:new Map(),first_event_at:null,last_event_at:null});
    const b=batches.get(d.batch_id);
    if (Number.isFinite(Number(d.expected_workers)) && Number(d.expected_workers)>0) b.expected_workers=Math.max(b.expected_workers||0,Number(d.expected_workers));
    const at=d.launched_at||d.created_at||d.timestamp||null;
    if (at && (!b.first_event_at || Date.parse(at)<Date.parse(b.first_event_at))) b.first_event_at=at;
    if (at && (!b.last_event_at || Date.parse(at)>Date.parse(b.last_event_at))) b.last_event_at=at;
    if (!b.workers.has(d.worker_id)) b.workers.set(d.worker_id,{worker_id:d.worker_id,events:[],first_event_at:at,last_event_at:at});
    else {
      const w=b.workers.get(d.worker_id);
      if (at && (!w.first_event_at || Date.parse(at)<Date.parse(w.first_event_at))) w.first_event_at=at;
      if (at && (!w.last_event_at || Date.parse(at)>Date.parse(w.last_event_at))) w.last_event_at=at;
    }
  }

  const compiled=[...batches.values()].map(b=>{
    const workers=[...b.workers.values()].map(w=>{
      const routed=[...w.events].reverse().find(e=>e.event==='ROUTED')||null;
      const claim=[...w.events].reverse().find(e=>e.event==='CLAIM_RESULT')||null;
      const close=[...w.events].reverse().find(e=>e.event==='CLOSE')||null;
      const pinRefs=repo.pins.get(w.worker_id)||[];
      const launchClaim=repo.launchClaims.get(w.worker_id)||null;
      const reallocationClaim=repo.reallocationClaims.get(w.worker_id)||null;
      const benchmarkReceipt=repo.benchmarkReceipts.get(w.worker_id)||null;
      const rawOutcome=String(claim?.outcome||'').toUpperCase();
      const normalizedOutcome=['WON','WIN','CLAIM_WON'].includes(rawOutcome)?'WON':(rawOutcome||null);
      const attemptRows=Array.isArray(claim?.attempts)?claim.attempts:[];
      const outcomeRows=Array.isArray(claim?.outcomes)?claim.outcomes:[];
      const attemptCount=Number.isFinite(Number(claim?.authority_attempts))?Number(claim.authority_attempts):
        Number.isFinite(Number(claim?.attempts))?Number(claim.attempts):
        attemptRows.length?attemptRows.length:
        outcomeRows.length?outcomeRows.length:0;
      const explicitCollisions=Number(claim?.collisions||0);
      const arrayCollisions=
        attemptRows.filter(x=>['CREATE_EXISTS','CAS_LOST','COLLISION'].includes(String(x?.outcome||'').toUpperCase())).length
        + outcomeRows.filter(x=>['CREATE_EXISTS','CAS_LOST','COLLISION'].includes(String(x||'').toUpperCase())).length;
      const collisionCount=explicitCollisions+arrayCollisions+
        (!explicitCollisions&&!arrayCollisions&&rawOutcome.includes('COLLISION')?Math.max(1,attemptCount):0);
      const authorityWon=pinRefs.length>0 || normalizedOutcome==='WON' || !!launchClaim;
      const productiveUnits=repo.productiveByWorker.get(w.worker_id)||[];
      const productiveCount=productiveUnits.length;
      const productiveChainState=productiveCount>=8?'HARD_CAP_REACHED':productiveCount>=6?'TARGET_REACHED':productiveCount>=3?'CHECKPOINT_REACHED':'BUILDING';
      const examRef=repo.exams.get(w.worker_id)||null;
      const isPool=String(b.batch_id||'').startsWith('POOL-');
      const terminalClose=!!close && (!isPool || !!examRef);
      const state=terminalClose?'CLOSED':authorityWon?(claim?.started?'ACTIVE':'OWNED'):claim?'CLAIM_RESOLVED':routed?'ROUTED':'BEACONED';
      const anomalies=[];
      if (isPool && close && !examRef) anomalies.push('POOL_CLOSE_WITHOUT_TERMINAL_EXAM');
      if (normalizedOutcome==='WON' && root && !pinRefs.length) anomalies.push('CLAIM_WON_WITHOUT_REPO_PIN');
      if (pinRefs.length && normalizedOutcome!=='WON') anomalies.push('REPO_PIN_WITHOUT_CANONICAL_WON_EVENT');
      if (close?.outcome==='NO_ALLOCATION' && root && !repo.noalloc.has(w.worker_id)) anomalies.push('NO_ALLOCATION_EVENT_WITHOUT_REPO_RECEIPT');
      return {
        worker_id:w.worker_id,state,first_event_at:w.first_event_at,last_event_at:w.last_event_at,
        run_id:launchClaim?.doc?.run_id||benchmarkReceipt?.doc?.run_id||null,
        slot_id:launchClaim?.doc?.slot_id||benchmarkReceipt?.doc?.slot_id||null,
        evolution_variant:launchClaim?.doc?.evolution_variant||benchmarkReceipt?.doc?.evolution_variant||null,
        reallocation_slot_id:reallocationClaim?.doc?.slot_id||benchmarkReceipt?.doc?.reallocation_slot_id||null,
        primary_complete:benchmarkReceipt?.doc?.primary_complete===true,
        reallocation_complete:benchmarkReceipt?.doc?.reallocation_complete===true,
        routed:routed?{lane:routed.lane||null,candidate_id:routed.candidate_id||null,candidate_title:routed.candidate_title||null,at:routed.server_created_at}:null,
        claim:claim?{outcome:normalizedOutcome,raw_outcome:claim.outcome||null,attempts:attemptCount,collisions:collisionCount,candidate_id:claim.candidate_id||claim.job_id||claim.guide_work_id||null,authority_ref_or_null:claim.authority_ref_or_null||claim.pin_ref||claim.claim_path||null,started:!!claim.started,at:claim.server_created_at}:null,
        repo:{beacon_ref:repo.beacons.get(w.worker_id)||null,pin_refs:pinRefs,no_allocation_ref:repo.noalloc.get(w.worker_id)||null,exam_ref:examRef,launch_slot_ref:launchClaim?.ref||null,reallocation_slot_ref:reallocationClaim?.ref||null,benchmark_receipt_ref:benchmarkReceipt?.ref||null},
        authority_won:authorityWon,
        productive_units:productiveCount,
        productive_chain_state:productiveChainState,
        productive_unit_refs:productiveUnits.slice(-8).map(unit=>unit.ref),
        close:close?{outcome:close.outcome||null,job_id_or_null:close.job_id_or_null||close.job_id||close.guide_work_id||null,result_ref_or_null:close.result_ref_or_null||close.return_ref||close.receipt_ref||null,at:close.server_created_at,terminal:terminalClose}:null,
        anomalies
      };
    }).sort((a,b)=>Date.parse(a.first_event_at||0)-Date.parse(b.first_event_at||0));

    const summary={
      expected:b.expected_workers,
      observed:workers.length,
      beaconed:workers.filter(w=>w.repo?.beacon_ref).length,
      telemetry_observed:workers.filter(w=>w.routed||w.claim||w.close).length,
      missing_expected:b.expected_workers==null?null:Math.max(0,b.expected_workers-workers.length),
      extra_observed:b.expected_workers==null?null:Math.max(0,workers.length-b.expected_workers),
      routed:workers.filter(w=>w.routed).length,
      claim_attempts:workers.reduce((n,w)=>n+(w.claim?.attempts||0),0),
      pin_won:workers.filter(w=>w.authority_won).length,
      collisions:workers.reduce((n,w)=>n+(w.claim?.collisions||0),0),
      started:workers.filter(w=>w.claim?.started).length,
      closed:workers.filter(w=>w.state==='CLOSED').length,
      active:workers.filter(w=>w.state==='ACTIVE').length,
      productive_units_total:workers.reduce((n,w)=>n+(w.productive_units||0),0),
      productive_units_max:workers.reduce((n,w)=>Math.max(n,w.productive_units||0),0),
      workers_at_checkpoint:workers.filter(w=>(w.productive_units||0)>=3).length,
      workers_at_target:workers.filter(w=>(w.productive_units||0)>=6).length,
      workers_at_hard_cap:workers.filter(w=>(w.productive_units||0)>=8).length,
      anomalies:workers.reduce((n,w)=>n+w.anomalies.length,0)
    };
    return {batch_id:b.batch_id,expected_workers:b.expected_workers,first_event_at:b.first_event_at,last_event_at:b.last_event_at,summary,workers};
  }).sort((a,b)=>Date.parse(b.last_event_at||0)-Date.parse(a.last_event_at||0));

  const launchRuns=[...repo.runPackets.entries()].map(([runId,p])=>{
    const primary=[...repo.launchClaims.values()].filter(x=>x.doc?.run_id===runId);
    const realloc=[...repo.reallocationClaims.values()].filter(x=>x.doc?.run_id===runId);
    const receipts=[...repo.benchmarkReceipts.values()].filter(x=>x.doc?.run_id===runId);
    const beacons=(repo.beaconDocs||[]).filter(x=>x.doc?.run_id===runId);
    const primaryByWorker=new Map();
    for(const x of primary){
      const arr=primaryByWorker.get(x.doc.worker_id)||[]; arr.push(x); primaryByWorker.set(x.doc.worker_id,arr);
    }
    const slotsTotal=Array.isArray(p.doc?.slots)?p.doc.slots.length:0;
    const claimedIds=new Set(primary.map(x=>x.doc.slot_id).filter(Boolean));
    const reallocationTotal=Array.isArray(p.doc?.reallocation_slots)?p.doc.reallocation_slots.length:0;
    const reallocationClaimedIds=new Set(realloc.map(x=>x.doc.slot_id).filter(Boolean));
    return {
      run_id:runId,
      status:p.doc?.status||null,
      packet_ref:p.ref,
      slots_total:slotsTotal,
      slots_claimed:claimedIds.size,
      slots_unclaimed:Math.max(0,slotsTotal-claimedIds.size),
      reallocation_slots_total:reallocationTotal,
      reallocation_slots_claimed:reallocationClaimedIds.size,
      workers_beaconed:new Set(beacons.map(x=>x.doc.worker_id)).size,
      primary_complete:new Set(receipts.filter(x=>x.doc?.primary_complete===true).map(x=>x.doc.worker_id)).size,
      reallocation_complete:new Set(receipts.filter(x=>x.doc?.reallocation_complete===true).map(x=>x.doc.worker_id)).size,
      workers_with_multiple_primary_slots:[...primaryByWorker.entries()].filter(([,xs])=>xs.length>1).map(([wid])=>wid),
      duplicate_primary_slot_ids:primary.map(x=>x.doc.slot_id).filter((id,i,a)=>id&&a.indexOf(id)!==i),
      exact_denominator:true
    };
  }).sort((a,b)=>a.run_id.localeCompare(b.run_id));
  const named=compiled.filter(b=>b.batch_id!=='UNBATCHED' && !b.batch_id.startsWith('SYNTH-'));
  return {
    schema:'prometeo.worker-runtime/v1',
    generated_at:nowIso,
    source:{type:'github_issue_comments_plus_repo_evidence',issue_number:22,authority:false,measurement_clock:'GITHUB_COMMENT_SERVER_TIME_PLUS_BEACON_DECLARED_TIME',productive_units:'DURABLE_PORTFOLIO_RETURNS_PLUS_GUIDE_RECEIPTS'},
    current_batch:(named[0]||null)?.batch_id||null,
    batches:compiled.slice(0,20),
    launch_runs:launchRuns,
    event_count:events.length,
    truth_boundary:'OBSERVABILITY_ONLY_GITHUB_PINS_REMAIN_AUTHORITY'
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const commentsPath=process.argv[2], root=process.argv[3]||null, outPath=process.argv[4]||'runtime.json';
  if (!commentsPath) throw new Error('usage: node build-worker-runtime.mjs <comments.json> [repo-root] [out.json]');
  const comments=JSON.parse(fs.readFileSync(commentsPath,'utf8'));
  fs.writeFileSync(outPath,JSON.stringify(compileRuntime(comments,root),null,2)+'\n');
}
