import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const out = path.resolve(process.argv[3] || '/tmp/efficiency.json');
const baselinePath = path.join(root, 'coordination/efficiency/RATCHET_BASELINE_V1.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const activatedAt = Date.parse(baseline.updated_at || 0) || 0;

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

const beaconsDir=path.join(root,'coordination/workers/beacons');
const noAllocDir=path.join(root,'coordination/workers/no-allocation');
const pinsDir=path.join(root,'coordination/portfolio/pins');
const oppClaimsDir=path.join(root,'coordination/opportunities/claims');

const beacons=new Map();
for(const p of walk(beaconsDir).filter(x=>x.endsWith('.json'))){
  const d=read(p); if(!d?.worker_id) continue;
  const launched=time(d.launched_at);
  if(launched < activatedAt) continue;
  beacons.set(d.worker_id,{worker_id:d.worker_id,launched_at:d.launched_at,launched});
}

const firstAuthority=new Map();
const consider=(wid,iso,kind,ref)=>{
  if(!wid||!beacons.has(wid)) return;
  const t=time(iso); if(!t) return;
  const prev=firstAuthority.get(wid);
  if(!prev||t<prev.time) firstAuthority.set(wid,{time:t,at:iso,kind,ref});
};
for(const p of walk(pinsDir).filter(x=>x.endsWith('.json'))){
  const d=read(p); consider(d?.worker_id,d?.claimed_at||d?.created_at,'portfolio-pin',path.relative(root,p));
}
for(const p of walk(oppClaimsDir).filter(x=>x.endsWith('.json'))){
  const d=read(p); consider(d?.worker_id||d?.worker,d?.claimed_at||d?.created_at,'opportunity-claim',path.relative(root,p));
}

const noAlloc=new Map();
for(const p of walk(noAllocDir).filter(x=>x.endsWith('.json'))){
  const d=read(p); if(!d?.worker_id||!beacons.has(d.worker_id)) continue;
  const t=time(d.observed_at||d.completed_at||d.created_at); if(!t) continue;
  noAlloc.set(d.worker_id,{time:t,at:d.observed_at||d.completed_at||d.created_at,ref:path.relative(root,p)});
}

const launches=[...beacons.values()].sort((a,b)=>b.launched-a.launched).slice(0,100).map(b=>{
  const a=firstAuthority.get(b.worker_id)||null;
  const n=noAlloc.get(b.worker_id)||null;
  const ttfa=a?Math.max(0,a.time-b.launched):null;
  const close=!a&&n?Math.max(0,n.time-b.launched):null;
  return {worker_id:b.worker_id,launched_at:b.launched_at,authority_at:a?.at||null,authority_kind:a?.kind||null,authority_ref:a?.ref||null,no_allocation_at:n?.at||null,time_to_first_authority_ms:ttfa,no_allocation_close_ms:close,state:a?'ALLOCATED':n?'NO_ALLOCATION':'OPEN'};
});

const allocated=launches.filter(x=>x.state==='ALLOCATED');
const closed=launches.filter(x=>x.state==='NO_ALLOCATION');
const ttfa=allocated.map(x=>x.time_to_first_authority_ms);
const noClose=closed.map(x=>x.no_allocation_close_ms);
const sample=allocated.length+closed.length;
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
  no_allocation_close_p50_ms:q(noClose,.5),
  no_allocation_close_p90_ms:q(noClose,.9),
  no_allocation_under_90s_percent:pct(noClose.filter(x=>x<=90000).length,noClose.length)
};

let status='INSUFFICIENT_SAMPLE';
const reasons=[];
if(sample>=5){
  const ttfaBad=metrics.ttfa_p90_ms!=null && metrics.ttfa_p90_ms>90000;
  const closeBad=metrics.no_allocation_close_p90_ms!=null && metrics.no_allocation_close_p90_ms>90000;
  const ttfaStrong=metrics.ttfa_p50_ms!=null && metrics.ttfa_p50_ms<=30000 && (!metrics.ttfa_p90_ms||metrics.ttfa_p90_ms<=90000);
  const closeStrong=metrics.no_allocation_close_p90_ms==null || metrics.no_allocation_close_p90_ms<=90000;
  if(ttfaBad) reasons.push('TTFA_P90_GT_90S');
  if(closeBad) reasons.push('NO_ALLOCATION_P90_GT_90S');
  status=(ttfaBad||closeBad)?'REGRESSION':(ttfaStrong&&closeStrong?'HEALTHY':'WATCH');
}

const snapshot={
  schema:'prometeo.efficiency-runtime/v1',
  generated_at:new Date().toISOString(),
  baseline_activated_at:new Date(activatedAt).toISOString(),
  status,
  reasons,
  metrics,
  latest_launches:launches.slice(0,30),
  privacy:'Derived only from durable coordination timestamps; no private reasoning traces.'
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(snapshot,null,2)+'\n');
console.log(`efficiency ${status} resolved=${sample} ttfa_p50=${metrics.ttfa_p50_ms} ttfa_p90=${metrics.ttfa_p90_ms}`);
