import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const feedPath=path.resolve(process.argv[3]||'/tmp/feed.json');
const feed=JSON.parse(fs.readFileSync(feedPath,'utf8'));
const now=Date.now();
const ACTIVE_MS=6*60_000, REPLACE_MS=10*60_000;

const read=p=>{try{return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))}catch{return null}};
const walk=rel=>{const base=path.join(root,rel);if(!fs.existsSync(base))return[];let out=[];for(const e of fs.readdirSync(base,{withFileTypes:true})){const r=path.posix.join(rel,e.name);out=e.isDirectory()?out.concat(walk(r)):out.concat(r)}return out};
const docs=rel=>walk(rel).filter(x=>x.endsWith('.json')).map(p=>({path:p,doc:read(p)})).filter(x=>x.doc);
const t=v=>Date.parse(v||'')||0;
const timeOf=d=>d?.returned_at||d?.completed_at||d?.heartbeat_at||d?.observed_at||d?.recorded_at||d?.started_at||d?.claimed_at||d?.created_at||d?.updated_at||d?.timestamp||null;
const latestIso=values=>values.filter(Boolean).sort((a,b)=>t(a)-t(b)).at(-1)||null;
const roleTask=role=>({GUIDE_PLANNER:'Planificando próximo trabajo',GUIDE_INTEGRATOR:'Integrando resultados',GUIDE_RESCATE:'Rescatando un cuello de producción',GUIDE_CRITIC:'Revisando una ruta débil',GUIDE_STEWARD:'Integrando publicación'})[role]||'Trabajo de Guide';
const baDay=iso=>{const d=new Date(iso||0);if(Number.isNaN(d.getTime()))return null;const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return`${o.year}-${o.month}-${o.day}`};
const median=nums=>{const a=nums.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:Math.round((a[m-1]+a[m])/2)};

const pins=docs('coordination/guide/pins').filter(r=>r.doc?.schema==='prometeo.guide-role-pin/v1');
const receipts=docs('coordination/guide/receipts');
const heartbeats=docs('coordination/workers/heartbeats');
const hbByWorker=new Map();
for(const row of heartbeats){const wid=row.doc.worker_id||row.doc.session_id;if(!wid)continue;const a=hbByWorker.get(wid)||[];a.push(row);hbByWorker.set(wid,a)}
for(const a of hbByWorker.values())a.sort((x,y)=>t(timeOf(x.doc))-t(timeOf(y.doc)));

const receiptFor=(workId,wid,claimed)=>receipts
  .filter(r=>r.doc?.guide_work_id===workId && (!r.doc.worker_id||r.doc.worker_id===wid) && t(timeOf(r.doc))>=t(claimed))
  .sort((a,b)=>t(timeOf(a.doc))-t(timeOf(b.doc)))[0]||null;

const workers=new Map((feed.workers||[]).map(w=>[w.worker_id,{...w,assignments:Array.isArray(w.assignments)?[...w.assignments]:[]} ]));
let roleAssignments=0;
for(const pin of pins.sort((a,b)=>t(timeOf(a.doc))-t(timeOf(b.doc)))){
  const d=pin.doc,wid=d.worker_id;if(!wid)continue;
  const claimed=d.claimed_at||timeOf(d),workId=d.guide_work_id||null,receipt=receiptFor(workId,wid,claimed);
  const hb=(hbByWorker.get(wid)||[]).at(-1)||null;
  const end=receipt?timeOf(receipt.doc):null;
  const lastSignal=latestIso([claimed,timeOf(hb?.doc),end]);
  const age=lastSignal?Math.max(0,now-t(lastSignal)):Infinity;
  let status=end?'done':age>=REPLACE_MS?'replaceable':age>=ACTIVE_MS?'suspect':'working';
  const assignment={key:`guide:${pin.path}`,worker_id:wid,kind:'guide',status,task:roleTask(d.role),project:'Guide',job_id:workId,pin_at:claimed,start_at:claimed,end_at:end,result:receipt?.doc?.intervention||receipt?.doc?.diagnosis||receipt?.doc?.remaining_boundary||null,source:pin.path,role:d.role,trigger:d.trigger};
  let w=workers.get(wid);
  if(!w){w={worker_id:wid,first_seen:claimed,status,task:assignment.task,project:'Guide',job_id:workId,pin_at:claimed,start_at:claimed,end_at:end,result:assignment.result,last_signal_at:lastSignal,recovery_at:!end&&lastSignal?new Date(t(lastSignal)+REPLACE_MS).toISOString():null,duration_ms:claimed?(end?t(end):now)-t(claimed):null,assignment_count:0,collision_count:0,assignments:[]};workers.set(wid,w)}
  if(!w.assignments.some(a=>a.key===assignment.key)){w.assignments.push(assignment);w.assignment_count=(w.assignment_count||0)+1;roleAssignments++}
  const currentStart=t(w.pin_at||w.start_at||w.first_seen), roleStart=t(claimed);
  if(roleStart>=currentStart){
    Object.assign(w,{status,task:assignment.task,project:'Guide',job_id:workId,pin_at:claimed,start_at:claimed,end_at:end,result:assignment.result,last_signal_at:latestIso([w.last_signal_at,lastSignal]),recovery_at:!end&&lastSignal?new Date(t(lastSignal)+REPLACE_MS).toISOString():null,duration_ms:claimed?(end?t(end):now)-t(claimed):null});
  } else {
    w.last_signal_at=latestIso([w.last_signal_at,lastSignal]);
  }
}

feed.workers=[...workers.values()].sort((a,b)=>t(b.first_seen)-t(a.first_seen));
feed.summary=feed.summary||{};
feed.summary.workers={seen:feed.workers.length,working:feed.workers.filter(w=>['working','recovery'].includes(w.status)).length,suspect:feed.workers.filter(w=>w.status==='suspect').length,replaceable:feed.workers.filter(w=>['replaceable','silent'].includes(w.status)).length,allocating:feed.workers.filter(w=>w.status==='allocating').length,finished:feed.workers.filter(w=>!!w.end_at).length,collisions:feed.workers.reduce((n,w)=>n+(w.collision_count||0),0),guide_role_assignments:roleAssignments};
const hm=new Map();
for(const w of feed.workers){const day=baDay(w.first_seen);if(!day)continue;const h=hm.get(day)||{date:day,seen:0,finished:0,replaceable:0,collisions:0,durations:[],worker_ids:[]};h.seen++;if(w.end_at)h.finished++;if(['replaceable','silent'].includes(w.status))h.replaceable++;h.collisions+=w.collision_count||0;if(w.end_at&&Number.isFinite(w.duration_ms))h.durations.push(w.duration_ms);h.worker_ids.push(w.worker_id);hm.set(day,h)}
feed.history=[...hm.values()].map(h=>({date:h.date,seen:h.seen,finished:h.finished,replaceable:h.replaceable,collisions:h.collisions,median_duration_ms:median(h.durations),worker_ids:h.worker_ids})).sort((a,b)=>b.date.localeCompare(a.date));
feed.diagnostics={...(feed.diagnostics||{}),guide_role_assignments_projected:roleAssignments};
fs.writeFileSync(feedPath,JSON.stringify(feed,null,2)+'\n');
console.log(`live role projection: ${roleAssignments}`);
