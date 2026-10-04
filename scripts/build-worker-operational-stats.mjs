#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arr = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const isoMs = value => {
  const ms = Date.parse(value || '');
  return Number.isFinite(ms) ? ms : null;
};
const firstIso = values => {
  const rows = values.filter(Boolean).map(value => ({value, ms: isoMs(value)})).filter(row => row.ms != null).sort((a,b) => a.ms-b.ms);
  return rows[0]?.value ?? null;
};
const lastIso = values => {
  const rows = values.filter(Boolean).map(value => ({value, ms: isoMs(value)})).filter(row => row.ms != null).sort((a,b) => b.ms-a.ms);
  return rows[0]?.value ?? null;
};
const delta = (later, earlier) => {
  const a = isoMs(later), b = isoMs(earlier);
  return a == null || b == null || a < b ? null : a-b;
};
const uniq = values => [...new Set(arr(values).filter(Boolean).map(String))].sort();

function walk(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const p = path.join(dir,ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && ent.name.endsWith('.json')) out.push(p);
  }
  return out;
}
function readJson(p) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }
function ref(root,p) { return path.relative(root,p).split(path.sep).join('/'); }
function fact(value, refs=[]) {
  return value == null || value === ''
    ? {kind:'unknown', value:null, evidence_refs:[]}
    : {kind:'durable_fact', value, evidence_refs:uniq(refs)};
}
function metric(value, formula, refs=[]) {
  return value == null
    ? {kind:'unknown', value:null, formula, evidence_refs:[]}
    : {kind:'derived_metric', value, formula, evidence_refs:uniq(refs)};
}
function eventId(kind, doc, sourceRef) {
  return text(doc?.return_id || doc?.receipt_id || doc?.claim_id || doc?.pin_id || doc?.collision_id || doc?.event_id || doc?.id) || `${kind}:${sourceRef}`;
}
function eventAt(kind, doc) {
  const keys = {
    beacon:['launched_at','created_at'],
    pin:['claimed_at','created_at'],
    started:['started_at','created_at'],
    return:['returned_at','completed_at','created_at'],
    exam:['audit_completed_at','completed_at','closed_at','created_at'],
    collision:['observed_at','created_at'],
    no_allocation:['observed_at','created_at','updated_at'],
    guide_receipt:['consumed_at','verified_at','completed_at','returned_at','created_at']
  }[kind] || ['created_at','updated_at'];
  return firstIso(keys.map(key => doc?.[key]));
}
function workId(doc) {
  return text(doc?.job_id || doc?.work_id || doc?.guide_job_id || doc?.mission_id || doc?.task_id) || null;
}
function campaignId(doc) {
  return text(doc?.campaign_id || doc?.run_id || doc?.batch_id || doc?.pool_id) || null;
}

export function collectOperationalEvidence(root) {
  const specs = [
    ['beacon','coordination/workers/beacons'],
    ['pin','coordination/portfolio/pins'],
    ['pin','coordination/guide/pins'],
    ['started','coordination/workers/started'],
    ['return','coordination/portfolio/returns'],
    ['guide_receipt','coordination/guide/receipts'],
    ['exam','coordination/workers/exams'],
    ['collision','coordination/portfolio/collisions'],
    ['no_allocation','coordination/workers/no-allocation']
  ];
  const seen = new Set();
  const events = [];
  let duplicatesSuppressed = 0;
  for (const [kind, rel] of specs) {
    for (const p of walk(path.join(root,rel))) {
      const doc = readJson(p);
      if (!doc) continue;
      const sourceRef = ref(root,p);
      const id = eventId(kind,doc,sourceRef);
      const dedupe = `${kind}:${id}`;
      if (seen.has(dedupe)) { duplicatesSuppressed += 1; continue; }
      seen.add(dedupe);
      events.push({kind,id,ref:sourceRef,doc,at:eventAt(kind,doc)});
    }
  }
  return {events,duplicates_suppressed:duplicatesSuppressed};
}

function runtimeDiagnostics(root) {
  const candidates = [path.join(root,'live','runtime.json'), path.join(root,'runtime.json')];
  const p = candidates.find(fs.existsSync);
  const runtime = p ? readJson(p) : null;
  const byWorker = new Map();
  for (const batch of arr(runtime?.batches)) {
    for (const worker of arr(batch?.workers)) {
      if (!worker?.worker_id) continue;
      byWorker.set(worker.worker_id, {
        label: text(worker.state) || null,
        last_event_at: worker.last_event_at || worker.first_event_at || null,
        source_ref: p ? ref(root,p) : null,
        authoritative_for_liveness: false
      });
    }
  }
  return byWorker;
}

function beaconIncarnations(events) {
  const byWorker = new Map();
  for (const event of events.filter(row => row.kind === 'beacon' && row.doc?.worker_id)) {
    const workerId = event.doc.worker_id;
    const rows = byWorker.get(workerId) || [];
    rows.push(event);
    byWorker.set(workerId,rows);
  }
  for (const rows of byWorker.values()) rows.sort((a,b) => (isoMs(a.at)??0)-(isoMs(b.at)??0));
  return byWorker;
}

function chooseIncarnation(workerId, at, incarnations) {
  const rows = incarnations.get(workerId) || [];
  if (!rows.length) return null;
  const eventMs = isoMs(at);
  if (eventMs == null) return rows[rows.length-1];
  let chosen = rows[0];
  for (const row of rows) {
    const launched = isoMs(row.at);
    if (launched != null && launched <= eventMs) chosen = row;
    else break;
  }
  return chosen;
}

function recordKey(workerId, incarnation, jobId) {
  const nonce = text(incarnation?.doc?.launch_nonce) || 'unknown-launch';
  return `${workerId}::${nonce}::${jobId || 'unknown-work'}`;
}

export function buildOperationalStats(root, nowIso=new Date().toISOString()) {
  const collected = collectOperationalEvidence(root);
  const runtime = runtimeDiagnostics(root);
  const incarnations = beaconIncarnations(collected.events);
  const records = new Map();
  const workerReincarnations = [];

  for (const [workerId, rows] of incarnations.entries()) {
    if (rows.length > 1) workerReincarnations.push({worker_id:workerId, beacon_refs:rows.map(row=>row.ref), count:rows.length});
  }

  for (const event of collected.events) {
    const workerId = text(event.doc?.worker_id);
    if (!workerId) continue;
    const incarnation = chooseIncarnation(workerId,event.at,incarnations);
    const job = workId(event.doc) || workId(incarnation?.doc) || null;
    const key = recordKey(workerId,incarnation,job);
    if (!records.has(key)) records.set(key,{worker_id:workerId, incarnation, job_id:job, events:[]});
    records.get(key).events.push(event);
  }

  const output = [...records.values()].map(row => {
    const events = row.events;
    const byKind = kind => events.filter(event => event.kind===kind);
    const beacon = row.incarnation || byKind('beacon')[0] || null;
    const pins = byKind('pin');
    const starts = byKind('started');
    const returns = byKind('return');
    const exams = byKind('exam');
    const guideReceipts = byKind('guide_receipt');
    const collisions = byKind('collision');
    const noalloc = byKind('no_allocation');
    const allRefs = uniq(events.map(event=>event.ref));

    const eligibleAt = firstIso(events.map(event=>event.doc?.eligible_at || event.doc?.compiled_at || event.doc?.materialized_at));
    const claimedAt = firstIso(pins.map(event=>event.doc?.claimed_at || event.at));
    const startedAt = firstIso(starts.map(event=>event.doc?.started_at || event.at));
    const returnedAt = lastIso(returns.map(event=>event.doc?.returned_at || event.at));
    const consumedAt = lastIso([
      ...returns.map(event=>event.doc?.consumed_at),
      ...guideReceipts.map(event=>event.doc?.consumed_at)
    ]);
    const verifiedAt = lastIso([
      ...returns.map(event=>event.doc?.verified_at || event.doc?.verification?.verified_at),
      ...guideReceipts.map(event=>event.doc?.verified_at || event.doc?.verification?.verified_at)
    ]);
    const closedAt = lastIso([
      ...exams.map(event=>event.doc?.exit_audit_v1?.audit_completed_at || event.doc?.audit_completed_at || event.doc?.completed_at || event.at),
      ...returns.map(event=>event.doc?.closed_at)
    ]);
    const runtimeLabel = runtime.get(row.worker_id) || null;
    const outcome = text(returns.at(-1)?.doc?.outcome || guideReceipts.at(-1)?.doc?.outcome || exams.at(-1)?.doc?.final_state) || null;
    const boundary = text(
      noalloc.at(-1)?.doc?.classification || noalloc.at(-1)?.doc?.reason || noalloc.at(-1)?.doc?.outcome ||
      returns.at(-1)?.doc?.boundary_class || exams.at(-1)?.doc?.exit_audit_v1?.exit_reason
    ) || null;
    const requiredCaps = uniq([
      ...pins.flatMap(event=>arr(event.doc?.required_capabilities)),
      ...starts.flatMap(event=>arr(event.doc?.required_capabilities)),
      ...returns.flatMap(event=>arr(event.doc?.required_capabilities))
    ]);
    const mismatch = noalloc.some(event => /CAPABILITY/i.test(text(event.doc?.classification || event.doc?.reason || event.doc?.outcome)));
    const childRefs = uniq(returns.flatMap(event=>[
      ...arr(event.doc?.spawn_candidates),
      ...arr(event.doc?.created_jobs),
      ...arr(event.doc?.child_refs)
    ]).map(value => typeof value === 'string' ? value : value?.ref || value?.job_id).filter(Boolean));
    const parentRef = text(
      returns.find(event=>event.doc?.parent_ref)?.doc?.parent_ref ||
      starts.find(event=>event.doc?.parent_ref)?.doc?.parent_ref ||
      pins.find(event=>event.doc?.predecessor_pin_ref_or_null)?.doc?.predecessor_pin_ref_or_null
    ) || null;
    const corrections = returns.reduce((n,event)=>n + arr(event.doc?.post_compile_corrections).length,0);
    const repairs = returns.reduce((n,event)=>n + arr(event.doc?.local_repairs || event.doc?.repairs).length,0);
    const humanRoundTrips = returns.reduce((n,event)=>n + Number(event.doc?.human_round_trips || 0),0)
      + exams.reduce((n,event)=>n + Number(event.doc?.exit_audit_v1?.human_round_trips || 0),0);
    const retries = collisions.length + noalloc.filter(event=>/RACE|RETRY|COLLISION/i.test(text(event.doc?.classification || event.doc?.reason || event.doc?.outcome))).length;
    const campaign = campaignId(beacon?.doc) || campaignId(pins[0]?.doc) || campaignId(starts[0]?.doc) || null;
    const launchNonce = text(beacon?.doc?.launch_nonce) || null;
    const identityConflict = (incarnations.get(row.worker_id)||[]).length > 1;
    const workerModel = text(beacon?.doc?.worker_model || beacon?.doc?.model || starts[0]?.doc?.worker_model) || null;
    const variant = text(beacon?.doc?.variant || starts[0]?.doc?.variant || pins[0]?.doc?.variant) || null;

    return {
      record_id: recordKey(row.worker_id,beacon,row.job_id),
      worker_id: row.worker_id,
      job_id: row.job_id,
      launch_nonce: launchNonce,
      campaign_id: campaign,
      root_objective: fact(text(returns[0]?.doc?.root_objective || starts[0]?.doc?.root_objective) || null, allRefs),
      mission: fact(text(returns[0]?.doc?.mission_id || starts[0]?.doc?.mission_id || row.job_id) || null, allRefs),
      block: fact(row.job_id, allRefs),
      parent_ref: fact(parentRef, allRefs),
      child_refs: childRefs.length ? {kind:'durable_fact',value:childRefs,evidence_refs:allRefs} : {kind:'unknown',value:null,evidence_refs:[]},
      worker_model: fact(workerModel, beacon?[beacon.ref]:[]),
      variant: fact(variant, beacon?[beacon.ref]:[]),
      identity_conflict: identityConflict,
      lifecycle: {
        eligible_at: fact(eligibleAt, allRefs),
        claimed_at: fact(claimedAt, pins.map(event=>event.ref)),
        started_at: fact(startedAt, starts.map(event=>event.ref)),
        returned_at: fact(returnedAt, returns.map(event=>event.ref)),
        consumed_at: fact(consumedAt, [...returns,...guideReceipts].map(event=>event.ref)),
        verified_at: fact(verifiedAt, [...returns,...guideReceipts].map(event=>event.ref)),
        closed_at: fact(closedAt, exams.map(event=>event.ref))
      },
      metrics: {
        wall_latency_ms: metric(delta(returnedAt,startedAt || claimedAt),'returned_at - (started_at || claimed_at)',allRefs),
        claim_latency_ms: metric(delta(claimedAt,eligibleAt),'claimed_at - eligible_at',allRefs),
        fan_in_latency_ms: metric(delta(closedAt,consumedAt),'closed_at - consumed_at',allRefs),
        retries: metric(retries,'collision receipts + retry/race no-allocation receipts',allRefs),
        collisions: metric(collisions.length,'count(collision receipts)',collisions.map(event=>event.ref)),
        capability_mismatch: metric(mismatch?1:0,'presence of explicit capability mismatch boundary',noalloc.map(event=>event.ref)),
        local_repairs: metric(repairs,'sum(durable local repair markers)',returns.map(event=>event.ref)),
        child_yield: metric(childRefs.length,'count(unique durable child refs)',returns.map(event=>event.ref)),
        human_round_trips: metric(humanRoundTrips,'sum(explicit human_round_trips only)',allRefs),
        post_compile_corrections: metric(corrections,'sum(explicit post_compile_corrections only)',returns.map(event=>event.ref))
      },
      boundary_class: fact(boundary, [...noalloc,...returns,...exams].map(event=>event.ref)),
      verified_outcome: fact(verifiedAt ? outcome : null, [...returns,...guideReceipts].map(event=>event.ref)),
      required_capabilities: requiredCaps.length ? {kind:'durable_fact',value:requiredCaps,evidence_refs:allRefs} : {kind:'unknown',value:null,evidence_refs:[]},
      runtime_label_diagnostic: runtimeLabel ? {...runtimeLabel, stale_active_label_ignored:/^(ACTIVE|PARKED)$/i.test(runtimeLabel.label||'')} : null,
      liveness_authoritative: false,
      evidence_refs: allRefs
    };
  }).sort((a,b)=>String(a.worker_id).localeCompare(String(b.worker_id)) || String(a.record_id).localeCompare(String(b.record_id)));

  const known = key => output.filter(row => row.lifecycle?.[key]?.kind === 'durable_fact').length;
  return {
    schema:'prometeo.worker-operational-stats/v1',
    generated_at:nowIso,
    authority:'NON_AUTHORITATIVE_DERIVED_ANALYTICS',
    truth_boundary:'Rebuildable analytical projection from durable repository evidence. Never routing, liveness, claim, acceptance, promotion or CURRENT authority.',
    source_policy:{
      durable_fact:'Value copied from a durable artifact with evidence_refs.',
      derived_metric:'Mechanical calculation over durable facts; formula is explicit.',
      unknown:'Evidence absent or not safely observable; value remains null.',
      runtime_active_parked:'Diagnostic label only; never promoted to liveness.'
    },
    signal_inventory:{
      existing:['worker beacons','portfolio/guide pins','worker STARTED refs','portfolio returns','Guide receipts','E9 exams/exit_audit_v1','collision receipts','no-allocation boundaries','optional runtime labels as diagnostics'],
      derived:['wall latency','claim latency when eligible_at exists','fan-in latency when consumed/closed exist','retry/collision counts','capability mismatch marker','local repair count','child yield','human round trips when explicitly recorded','post-compile corrections when explicitly recorded'],
      known_timestamp_counts:{eligible:known('eligible_at'),claimed:known('claimed_at'),started:known('started_at'),returned:known('returned_at'),consumed:known('consumed_at'),verified:known('verified_at'),closed:known('closed_at')},
      concrete_gaps:['worker model/variant are unknown unless durably emitted','eligible/consumed/verified timestamps remain unknown when producers do not emit them','causal effects cannot be inferred from this passive projection']
    },
    quality:{duplicates_suppressed:collected.duplicates_suppressed,worker_reincarnations:workerReincarnations},
    causal_policy:'Historical correlations may motivate a dedicated RUN/benchmark; they do not establish causal claims.',
    records:output
  };
}

export function runCli(argv=process.argv.slice(2)) {
  const [root='.', outPath='-'] = argv;
  const result = buildOperationalStats(path.resolve(root));
  const body = `${JSON.stringify(result,null,2)}\n`;
  if (outPath === '-') process.stdout.write(body);
  else fs.writeFileSync(outPath,body);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { runCli(); }
  catch (error) { process.stderr.write(`${error?.stack || error}\n`); process.exitCode=1; }
}
