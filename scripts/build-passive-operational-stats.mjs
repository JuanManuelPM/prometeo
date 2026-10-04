const TS_KEYS = ['eligible_at','claimed_at','started_at','returned_at','consumed_at','verified_at','closed_at'];
const ID_KEYS = ['root_objective','mission_id','block_id','parent_id','worker_id','worker_model','variant','boundary_class','verified_outcome'];
const COUNT_TYPES = {
  RETRY: 'retries',
  CLAIM_COLLISION: 'collisions',
  CAPABILITY_MISMATCH: 'capability_mismatch',
  LOCAL_REPAIR: 'local_repairs',
  CHILD_RETURN: 'child_yield',
  HUMAN_ROUND_TRIP: 'human_round_trips',
  POST_COMPILE_CORRECTION: 'post_compile_corrections'
};

export const PASSIVE_STATS_SCHEMA = 'prometeo.passive-operational-stats/v1';
export const PASSIVE_STATS_AUTHORITY = 'NON_AUTHORITATIVE_DERIVED_PROJECTION';

const arr = v => Array.isArray(v) ? v : [];
const nstr = v => typeof v === 'string' && v.trim() ? v.trim() : null;
const ts = v => {
  const s = nstr(v);
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};
const sourceRef = r => nstr(r?.source_ref) || nstr(r?.evidence_ref) || nstr(r?.path) || nstr(r?.event_id) || 'inline-evidence';
const fact = (value, refs=[]) => value === null || value === undefined || value === ''
  ? {status:'UNKNOWN', value:null, source_refs:[]}
  : {status:'FACT', value, source_refs:[...new Set(refs.filter(Boolean))].sort()};
const derived = (value, formula, refs=[]) => value === null || value === undefined
  ? {status:'UNKNOWN', value:null, formula, source_refs:[]}
  : {status:'DERIVED', value, formula, source_refs:[...new Set(refs.filter(Boolean))].sort()};
const msBetween = (a,b) => {
  const am = a ? Date.parse(a) : NaN;
  const bm = b ? Date.parse(b) : NaN;
  return Number.isFinite(am) && Number.isFinite(bm) && bm >= am ? bm - am : null;
};
const stableFingerprint = r => JSON.stringify({
  event_id:r?.event_id ?? null,
  source_ref:sourceRef(r),
  type:String(r?.type || r?.evidence_type || 'UNKNOWN').toUpperCase(),
  job_id:r?.job_id ?? null,
  mission_id:r?.mission_id ?? null,
  block_id:r?.block_id ?? null,
  worker_id:r?.worker_id ?? null,
  launch_nonce:r?.launch_nonce ?? null,
  generation:r?.generation ?? null,
  at:r?.at ?? r?.timestamp ?? r?.claimed_at ?? r?.started_at ?? r?.returned_at ?? null
});

function pickFact(records, key, campaign={}) {
  if (key === 'root_objective' && nstr(campaign.root_objective)) return fact(campaign.root_objective, [campaign.source_ref].filter(Boolean));
  for (const r of records) {
    const value = key.endsWith('_at') ? ts(r?.[key]) : nstr(r?.[key]);
    if (value) return fact(value, [sourceRef(r)]);
  }
  return fact(null);
}

function eventAt(r) {
  for (const key of TS_KEYS) {
    const value = ts(r?.[key]);
    if (value) return value;
  }
  return ts(r?.at) || ts(r?.timestamp);
}

function unitKey(r) {
  return nstr(r?.job_id) || nstr(r?.block_id) || nstr(r?.mission_id) || 'unscoped';
}

function latestLifecycleEvidence(records) {
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const r = records[i];
    if (['HEARTBEAT','STARTED','RETURN','CLOSED'].includes(String(r?.type || r?.evidence_type || '').toUpperCase())) return r;
  }
  return null;
}

export function compilePassiveOperationalStats(input={}) {
  const campaign = input?.campaign && typeof input.campaign === 'object' ? input.campaign : {};
  const seen = new Set();
  const duplicateEvidence = [];
  const unique = [];
  for (const raw of arr(input.records)) {
    if (!raw || typeof raw !== 'object') continue;
    const fp = stableFingerprint(raw);
    if (seen.has(fp)) { duplicateEvidence.push(sourceRef(raw)); continue; }
    seen.add(fp);
    unique.push(raw);
  }

  const groups = new Map();
  for (const r of unique) {
    const key = unitKey(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const units = [...groups.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([key, records]) => {
    records.sort((a,b) => String(eventAt(a) || '').localeCompare(String(eventAt(b) || '')) || sourceRef(a).localeCompare(sourceRef(b)));
    const facts = {};
    for (const keyName of ID_KEYS) facts[keyName] = pickFact(records, keyName, campaign);
    for (const keyName of TS_KEYS) facts[keyName] = pickFact(records, keyName, campaign);

    const runtimeLabels = [...new Set(records.filter(r => String(r?.type || r?.evidence_type).toUpperCase() === 'RUNTIME').map(r => nstr(r?.runtime_status)).filter(Boolean))].sort();
    facts.runtime_labels_observed = fact(runtimeLabels.length ? runtimeLabels : null, records.filter(r => String(r?.type || r?.evidence_type).toUpperCase() === 'RUNTIME').map(sourceRef));
    const livenessEvidence = latestLifecycleEvidence(records);
    facts.liveness = livenessEvidence ? fact(String(livenessEvidence.type || livenessEvidence.evidence_type).toUpperCase(), [sourceRef(livenessEvidence)]) : fact(null);

    const counters = Object.fromEntries(Object.values(COUNT_TYPES).map(name => [name, 0]));
    const counterRefs = Object.fromEntries(Object.values(COUNT_TYPES).map(name => [name, []]));
    for (const r of records) {
      const name = COUNT_TYPES[String(r?.type || r?.evidence_type || '').toUpperCase()];
      if (name) { counters[name] += 1; counterRefs[name].push(sourceRef(r)); }
    }
    const metrics = {
      claim_latency_ms: derived(msBetween(facts.eligible_at.value, facts.claimed_at.value), 'claimed_at - eligible_at', [...facts.eligible_at.source_refs, ...facts.claimed_at.source_refs]),
      wall_latency_ms: derived(msBetween(facts.started_at.value, facts.closed_at.value || facts.returned_at.value), '(closed_at || returned_at) - started_at', [...facts.started_at.source_refs, ...facts.closed_at.source_refs, ...facts.returned_at.source_refs]),
      fan_in_latency_ms: derived(msBetween(facts.returned_at.value, facts.consumed_at.value), 'consumed_at - returned_at', [...facts.returned_at.source_refs, ...facts.consumed_at.source_refs])
    };
    for (const [name,count] of Object.entries(counters)) metrics[name] = derived(count, `count(${name})`, counterRefs[name]);

    const incarnations = [...new Map(records.filter(r => nstr(r?.worker_id)).map(r => {
      const id = `${r.worker_id}::${nstr(r.launch_nonce) || 'unknown-nonce'}`;
      return [id, {worker_id:r.worker_id, launch_nonce:nstr(r.launch_nonce), source_refs:[sourceRef(r)]}];
    })).values()];

    return {
      unit_id:key,
      evidence_refs:[...new Set(records.map(sourceRef))].sort(),
      facts,
      metrics,
      worker_incarnations:incarnations,
      evidence_count:records.length
    };
  });

  const existingSignals = [...new Set(unique.map(r => String(r?.type || r?.evidence_type || 'UNKNOWN').toUpperCase()))].sort();
  const unknownFields = [...new Set(units.flatMap(u => Object.entries(u.facts).filter(([,v]) => v.status === 'UNKNOWN').map(([k]) => k)))].sort();
  return {
    schema:PASSIVE_STATS_SCHEMA,
    authority:PASSIVE_STATS_AUTHORITY,
    generated_from:{campaign_id:nstr(campaign.campaign_id), source_refs:[...new Set([campaign.source_ref, ...unique.map(sourceRef)].filter(Boolean))].sort()},
    policy:{runtime_active_is_liveness:false, correlation_is_causation:false, missing_evidence:'UNKNOWN_NOT_INFERRED', benchmark_reserved_for_causal_questions:true},
    signals:{existing:existingSignals, derived:['latencies','event_counts','deduplication','worker_incarnations'], concrete_gaps:unknownFields},
    duplicate_evidence_ignored:[...new Set(duplicateEvidence)].sort(),
    units
  };
}

import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export function runCli(argv=process.argv.slice(2)) {
  const [inputPath, outputPath] = argv;
  if (!inputPath || !outputPath) throw new Error('usage: build-passive-operational-stats.mjs <evidence.json> <projection.json>');
  const input = JSON.parse(fs.readFileSync(inputPath,'utf8'));
  const output = compilePassiveOperationalStats(input);
  fs.writeFileSync(outputPath, `${JSON.stringify(output,null,2)}\n`);
  process.stdout.write(`passive-stats ${output.schema} units=${output.units.length} authority=${output.authority}\n`);
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { runCli(); } catch (error) { process.stderr.write(`${error?.stack || error}\n`); process.exitCode=1; }
}
