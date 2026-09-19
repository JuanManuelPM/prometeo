import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || '.');
const out = path.resolve(process.argv[3] || '/tmp/efficiency.json');
const baselinePath = path.join(root, 'coordination/efficiency/RATCHET_BASELINE_V1.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const activatedIso = baseline.runtime_baseline_activated_at || baseline.updated_at || null;
const activatedAt = Date.parse(activatedIso || 0) || 0;
const eff009 = Array.isArray(baseline.items) ? baseline.items.find(item => item?.id === 'EFF009') : null;
const transportRegressionWindowMinutes = Number(eff009?.required?.claim_transport_blocked_regression_window_minutes || 10);
const transportRegressionWindowMs = Math.max(1, transportRegressionWindowMinutes) * 60_000;
const eff028 = Array.isArray(baseline.items) ? baseline.items.find(item => item?.id === 'EFF028') : null;
const noAllocationRegressionWindowMinutes = Number(eff028?.required?.no_allocation_regression_window_minutes || 10);
const noAllocationRegressionWindowMs = Math.max(1, noAllocationRegressionWindowMinutes) * 60_000;
const eff037 = Array.isArray(baseline.items) ? baseline.items.find(item => item?.id === 'EFF037') : null;
const ttfaRegressionWindowMinutes = Number(eff037?.required?.ttfa_regression_window_minutes || 10);
const ttfaRegressionWindowMs = Math.max(1, ttfaRegressionWindowMinutes) * 60_000;

const read = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const walk = dir => {
  if (!fs.existsSync(dir)) return [];
  const rows=[];
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) rows.push(...walk(p)); else rows.push(p);
  }
  return rows;
};
const time = v => Date.parse(v || '') || 0;
const q = (arr,p) => {
  const a=arr.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length) return null;
  const i=Math.min(a.length-1,Math.max(0,Math.ceil(p*a.length)-1));
  return a[i];
};
const pct = (n,d) => d ? Math.round(n*1000/d)/10 : null;

// Durable measurement clock: Git commit time, not model-authored receipt timestamps.
// One bounded git-log scan centralizes this cost for all workers.
const commitTimes = new Map();
try {
  const raw=execFileSync('git',['-C',root,'log','-500','--format=@@%cI','--name-only','--',
    'coordination/workers/beacons','coordination/workers/no-allocation','coordination/portfolio/pins','coordination/opportunities/claims'],
    {encoding:'utf8',stdio:['ignore','pipe','ignore']});
  let current=null;
  for(const line of raw.split(/\r?\n/)){
    if(line.startsWith('@@')){ current=line.slice(2).trim(); continue; }
    const rel=line.trim();
    if(rel && current && !commitTimes.has(rel)) commitTimes.set(rel,current);
  }
} catch {}
const durableIso=(p,fallback)=>commitTimes.get(path.relative(root,p).replaceAll('\\','/'))||fallback||null;
const durableTime=(p,fallback)=>time(durableIso(p,fallback));

const beaconsDir=path.join(root,'coordination/workers/beacons');
const noAllocDir=path.join(root,'coordination/workers/no-allocation');
const pinsDir=path.join(root,'coordination/portfolio/pins');
const oppClaimsDir=path.join(root,'coordination/opportunities/claims');

const beacons=new Map();
for(const p of walk(beaconsDir).filter(x=>x.endsWith('.json'))){
  const d=read(p); if(!d?.worker_id) continue;
  const launchedIso=durableIso(p,d.launched_at);
  const launched=durableTime(p,d.launched_at);
  if(!launched || launched < activatedAt) continue;
  beacons.set(d.worker_id,{worker_id:d.worker_id,launched_at:launchedIso,declared_launched_at:d.launched_at||null,launched});
}

const firstAuthority=new Map();
const consider=(wid,p,declaredIso,kind,ref)=>{
  if(!wid||!beacons.has(wid)) return;
  const iso=durableIso(p,declaredIso);
  const t=durableTime(p,declaredIso); if(!t) return;
  const prev=firstAuthority.get(wid);
  if(!prev||t<prev.time) firstAuthority.set(wid,{time:t,at:iso,declared_at:declaredIso||null,kind,ref});
};
for(const p of walk(pinsDir).filter(x=>x.endsWith('.json'))){
  const d=read(p); consider(d?.worker_id,p,d?.claimed_at||d?.created_at,'portfolio-pin',path.relative(root,p));
}
for(const p of walk(oppClaimsDir).filter(x=>x.endsWith('.json'))){
  const d=read(p); consider(d?.worker_id||d?.worker,p,d?.claimed_at||d?.created_at,'opportunity-claim',path.relative(root,p));
}

const canonicalNoAllocationReason = d => {
  const reason=String(d?.reason||'').trim();
  if(reason) return reason;
  const outcome=String(d?.outcome||'').trim();
  if(outcome) return outcome;
  return null;
};

const noAlloc=new Map();
for(const p of walk(noAllocDir).filter(x=>x.endsWith('.json'))){
  const d=read(p); if(!d?.worker_id||!beacons.has(d.worker_id)) continue;
  const declared=d.closed_at||d.observed_at||d.completed_at||d.created_at||null;
  const iso=durableIso(p,declared);
  const t=durableTime(p,declared); if(!t) continue;
  noAlloc.set(d.worker_id,{time:t,at:iso,declared_at:declared,ref:path.relative(root,p),reason:canonicalNoAllocationReason(d)});
}

const launches=[...beacons.values()].sort((a,b)=>b.launched-a.launched).slice(0,100).map(b=>{
  const a=firstAuthority.get(b.worker_id)||null;
  const n=noAlloc.get(b.worker_id)||null;
  const ttfa=a?Math.max(0,a.time-b.launched):null;
  const close=!a&&n?Math.max(0,n.time-b.launched):null;
  return {worker_id:b.worker_id,launched_at:b.launched_at,declared_launched_at:b.declared_launched_at,authority_at:a?.at||null,declared_authority_at:a?.declared_at||null,authority_kind:a?.kind||null,authority_ref:a?.ref||null,no_allocation_at:n?.at||null,declared_no_allocation_at:n?.declared_at||null,no_allocation_reason:n?.reason||null,no_allocation_ref:n?.ref||null,time_to_first_authority_ms:ttfa,no_allocation_close_ms:close,state:a?'ALLOCATED':n?'NO_ALLOCATION':'OPEN'};
});

const allocated=launches.filter(x=>x.state==='ALLOCATED');
const closed=launches.filter(x=>x.state==='NO_ALLOCATION');
const ttfa=allocated.map(x=>x.time_to_first_authority_ms);
const noClose=closed.map(x=>x.no_allocation_close_ms);
const sample=allocated.length+closed.length;
const now=Date.now();
const transportBlocked=closed.filter(x=>x.no_allocation_reason==='CLAIM_TRANSPORT_BLOCKED');
const transportBlockedRecent=transportBlocked.filter(x=>{
  const at=time(x.no_allocation_at);
  return at && now-at<=transportRegressionWindowMs;
});
const allocatedRecent=allocated.filter(x=>{
  const at=time(x.authority_at);
  return at && now-at<=ttfaRegressionWindowMs;
});
const ttfaRecent=allocatedRecent.map(x=>x.time_to_first_authority_ms);
const closedRecent=closed.filter(x=>{
  const at=time(x.no_allocation_at);
  return at && now-at<=noAllocationRegressionWindowMs;
});
const noCloseRecent=closedRecent.map(x=>x.no_allocation_close_ms);
const reasonHistogram = rows => rows.reduce((acc,row)=>{
  const reason=String(row?.no_allocation_reason||'UNSPECIFIED');
  acc[reason]=(acc[reason]||0)+1;
  return acc;
},{});
const noAllocationCauseHistogram=reasonHistogram(closed);
const noAllocationCauseHistogramRecent=reasonHistogram(closedRecent);
const recentNoAllocationReceipts=[...closedRecent]
  .sort((a,b)=>time(b.no_allocation_at)-time(a.no_allocation_at) || String(a.worker_id).localeCompare(String(b.worker_id)))
  .slice(0,12)
  .map(row=>({
    reason:String(row.no_allocation_reason||'UNSPECIFIED'),
    ref:row.no_allocation_ref||null,
    worker_id:row.worker_id,
    no_allocation_at:row.no_allocation_at
  }))
  .filter(row=>row.ref);
const noAllocationCauses={
  window_minutes:noAllocationRegressionWindowMinutes,
  recent_total:closedRecent.length,
  cumulative_total:closed.length,
  histogram_recent:noAllocationCauseHistogramRecent,
  histogram_cumulative:noAllocationCauseHistogram,
  recent_receipts:recentNoAllocationReceipts
};
const metrics={
  launches_observed:launches.length,
  resolved_sample:sample,
  allocated:allocated.length,
  no_allocation:closed.length,
  open:launches.filter(x=>x.state==='OPEN').length,
  allocation_rate_percent:pct(allocated.length,sample),
  ttfa_p50_ms:q(ttfa,.5),
  ttfa_p90_ms:q(ttfa,.9),
  ttfa_under_30s_percent:pct(ttfa.filter(x=>x<=30000).length,ttfa.length),
  ttfa_under_90s_percent:pct(ttfa.filter(x=>x<=90000).length,ttfa.length),
  ttfa_recent:allocatedRecent.length,
  ttfa_p50_recent_ms:q(ttfaRecent,.5),
  ttfa_p90_recent_ms:q(ttfaRecent,.9),
  ttfa_under_30s_recent_percent:pct(ttfaRecent.filter(x=>x<=30000).length,ttfaRecent.length),
  ttfa_under_90s_recent_percent:pct(ttfaRecent.filter(x=>x<=90000).length,ttfaRecent.length),
  ttfa_regression_window_minutes:ttfaRegressionWindowMinutes,
  no_allocation_close_p50_ms:q(noClose,.5),
  no_allocation_close_p90_ms:q(noClose,.9),
  no_allocation_under_90s_percent:pct(noClose.filter(x=>x<=90000).length,noClose.length),
  no_allocation_recent:closedRecent.length,
  no_allocation_close_p90_recent_ms:q(noCloseRecent,.9),
  no_allocation_under_90s_recent_percent:pct(noCloseRecent.filter(x=>x<=90000).length,noCloseRecent.length),
  no_allocation_regression_window_minutes:noAllocationRegressionWindowMinutes,
  claim_transport_blocked:transportBlocked.length,
  claim_transport_blocked_recent:transportBlockedRecent.length,
  claim_transport_blocked_regression_window_minutes:transportRegressionWindowMinutes
};

let status='INSUFFICIENT_SAMPLE';
const reasons=[];
if(sample>=5){
  const ttfaBad=metrics.ttfa_p90_recent_ms!=null && metrics.ttfa_p90_recent_ms>90000;
  const closeBad=metrics.no_allocation_close_p90_recent_ms!=null && metrics.no_allocation_close_p90_recent_ms>90000;
  const transportBad=metrics.claim_transport_blocked_recent>=2;
  const ttfaStrong=metrics.ttfa_p50_recent_ms!=null && metrics.ttfa_p50_recent_ms<=30000 && (!metrics.ttfa_p90_recent_ms||metrics.ttfa_p90_recent_ms<=90000);
  const closeStrong=metrics.no_allocation_close_p90_recent_ms==null || metrics.no_allocation_close_p90_recent_ms<=90000;
  if(ttfaBad) reasons.push('TTFA_P90_GT_90S');
  if(closeBad) reasons.push('NO_ALLOCATION_P90_GT_90S');
  if(transportBad) reasons.push('CLAIM_TRANSPORT_BLOCKED_REPEAT');
  status=(ttfaBad||closeBad||transportBad)?'REGRESSION':(ttfaStrong&&closeStrong?'HEALTHY':'WATCH');
}

let rescue=null;
if(status==='REGRESSION'){
  const preimage=JSON.stringify({schema:'prometeo.efficiency-regression/v1',runtime_baseline_activated_at:activatedIso,reasons:[...reasons].sort()});
  const fingerprint=crypto.createHash('sha256').update(preimage).digest('hex').slice(0,12);
  rescue={
    fingerprint,
    dedupe_key:`efficiency:runtime-regression:${fingerprint}:v1`,
    recommended_role:'GUIDE_RESCATE',
    scope:'ONE_SYSTEM_BOTTLENECK_NOT_PER_WORKER',
    instruction:'Prefer compiler/static/CI repair; if reasoning is needed, materialize or claim one deduped rescue job and one bounded verifier.'
  };
}

const snapshot={
  schema:'prometeo.efficiency-runtime/v1',
  generated_at:new Date().toISOString(),
  measurement_clock:'GIT_COMMIT_TIME_PREFERRED',
  baseline_activated_at:activatedIso,
  baseline_updated_at:baseline.updated_at||null,
  status,
  reasons,
  metrics,
  no_allocation_causes:noAllocationCauses,
  rescue,
  latest_launches:launches.slice(0,30),
  privacy:'Derived from durable repository events; no private reasoning traces.'
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(snapshot,null,2)+'\n');
console.log(`efficiency ${status} resolved=${sample} ttfa_p50=${metrics.ttfa_p50_ms} ttfa_p90=${metrics.ttfa_p90_ms}`);
