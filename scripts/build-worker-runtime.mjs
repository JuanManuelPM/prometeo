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
  const beacons = new Map(), pins = new Map(), noalloc = new Map();
  if (!root) return {beacons,pins,noalloc};

  for (const p of walk(path.join(root,'coordination','workers','beacons'))) {
    const d=readJson(p); if (d?.worker_id) beacons.set(d.worker_id,path.relative(root,p).split(path.sep).join('/'));
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
    const d=readJson(p); if (d?.worker_id) noalloc.set(d.worker_id,path.relative(root,p).split(path.sep).join('/'));
  }
  return {beacons,pins,noalloc};
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

  const compiled=[...batches.values()].map(b=>{
    const workers=[...b.workers.values()].map(w=>{
      const routed=[...w.events].reverse().find(e=>e.event==='ROUTED')||null;
      const claim=[...w.events].reverse().find(e=>e.event==='CLAIM_RESULT')||null;
      const close=[...w.events].reverse().find(e=>e.event==='CLOSE')||null;
      const pinRefs=repo.pins.get(w.worker_id)||[];
      const state=close?'CLOSED':claim?.outcome==='WON'?(claim.started?'ACTIVE':'OWNED'):claim?'CLAIM_RESOLVED':routed?'ROUTED':'SEEN';
      const anomalies=[];
      if (claim?.outcome==='WON' && root && !pinRefs.length) anomalies.push('CLAIM_WON_WITHOUT_REPO_PIN');
      if (pinRefs.length && claim?.outcome!=='WON') anomalies.push('REPO_PIN_WITHOUT_CLAIM_WON_EVENT');
      if (close?.outcome==='NO_ALLOCATION' && root && !repo.noalloc.has(w.worker_id)) anomalies.push('NO_ALLOCATION_EVENT_WITHOUT_REPO_RECEIPT');
      return {
        worker_id:w.worker_id,state,first_event_at:w.first_event_at,last_event_at:w.last_event_at,
        routed:routed?{lane:routed.lane||null,candidate_id:routed.candidate_id||null,candidate_title:routed.candidate_title||null,at:routed.server_created_at}:null,
        claim:claim?{outcome:claim.outcome||null,attempts:Number(claim.attempts||0),candidate_id:claim.candidate_id||null,authority_ref_or_null:claim.authority_ref_or_null||null,started:!!claim.started,at:claim.server_created_at}:null,
        close:close?{outcome:close.outcome||null,job_id_or_null:close.job_id_or_null||null,result_ref_or_null:close.result_ref_or_null||null,at:close.server_created_at}:null,
        repo:{beacon_ref:repo.beacons.get(w.worker_id)||null,pin_refs:pinRefs,no_allocation_ref:repo.noalloc.get(w.worker_id)||null},
        anomalies
      };
    }).sort((a,b)=>Date.parse(a.first_event_at||0)-Date.parse(b.first_event_at||0));

    const summary={
      expected:b.expected_workers,
      observed:workers.length,
      missing_expected:b.expected_workers==null?null:Math.max(0,b.expected_workers-workers.length),
      routed:workers.filter(w=>w.routed).length,
      claim_attempts:workers.reduce((n,w)=>n+(w.claim?.attempts||0),0),
      pin_won:workers.filter(w=>w.claim?.outcome==='WON').length,
      collisions:workers.filter(w=>String(w.claim?.outcome||'').includes('COLLISION')).length,
      started:workers.filter(w=>w.claim?.outcome==='WON'&&w.claim?.started).length,
      closed:workers.filter(w=>w.close).length,
      active:workers.filter(w=>w.state==='ACTIVE').length,
      anomalies:workers.reduce((n,w)=>n+w.anomalies.length,0)
    };
    return {batch_id:b.batch_id,expected_workers:b.expected_workers,first_event_at:b.first_event_at,last_event_at:b.last_event_at,summary,workers};
  }).sort((a,b)=>Date.parse(b.last_event_at||0)-Date.parse(a.last_event_at||0));

  const named=compiled.filter(b=>b.batch_id!=='UNBATCHED' && !b.batch_id.startsWith('SYNTH-'));
  return {
    schema:'prometeo.worker-runtime/v1',
    generated_at:nowIso,
    source:{type:'github_issue_comments',issue_number:22,authority:false,measurement_clock:'GITHUB_COMMENT_SERVER_TIME'},
    current_batch:(named[0]||null)?.batch_id||null,
    batches:compiled.slice(0,20),
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
