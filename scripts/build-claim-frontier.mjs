#!/usr/bin/env node
import fs from 'node:fs';

const arr = v => Array.isArray(v) ? v : [];

const KEEP = [
  'job_id','opportunity_id','role_id','guide_work_id','dedupe_key',
  'project_id','scope_project_id','project_label','title','source_path',
  'role','trigger','state_ref','state_revision','priority','state',
  'required_capabilities','claim_mode','claim_path','claim_payload_shape',
  'post_claim_validate','contention_barrier','post_release_claim',
  'release_path','release_payload_shape','timeout_payload_shape',
  'deadline_at','entrant_dir','plan_id','mission'
];

function compactCandidate(item, lane) {
  const out = { lane };
  for (const k of KEEP) if (item?.[k] !== undefined && item?.[k] !== null) out[k] = item[k];
  if (!out.title && out.mission) out.title = String(out.mission).slice(0, 180);
  // Mission is useful only for opportunity-queue candidates that have no durable job file.
  if (out.job_id || out.role_id || out.guide_work_id) delete out.mission;
  return out;
}

function keyOf(x) {
  return x?.claim_path || [x?.lane,x?.job_id,x?.opportunity_id,x?.role_id,x?.guide_work_id].filter(Boolean).join(':');
}

export function buildClaimFrontier(allocator = {}, maxCandidates = 24) {
  const live = [];
  for (const [lane, rows] of [
    ['ready', allocator.ready],
    ['queue_ready', allocator.queue_ready],
    ['role_ready', allocator.role_ready],
    ['recovery', allocator.recovery]
  ]) for (const row of arr(rows)) live.push({ lane, row });

  const byKey = new Map(live.map(({lane,row}) => [keyOf({lane,...row}), {lane,row}]));
  const ordered = [];
  const seen = new Set();

  for (const raw of arr(allocator.batch_candidates)) {
    const lane = raw.lane || 'ready';
    const match = byKey.get(keyOf(raw));
    const row = match?.row || raw;
    const key = keyOf({lane,...row});
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(compactCandidate(row,lane));
  }

  // Preserve a bounded fallback if post-processors introduced a candidate after batch_candidates was built.
  for (const {lane,row} of live) {
    const key = keyOf({lane,...row});
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(compactCandidate(row,lane));
  }

  const candidates = ordered.slice(0, Math.max(1, maxCandidates));
  return {
    schema:'prometeo.claim-frontier/v1',
    generated_at:allocator.generated_at || new Date().toISOString(),
    source_sha:allocator.source_sha || null,
    allocator_schema:allocator.schema || null,
    batch_strategy:allocator.batch_strategy || null,
    preferred_order:arr(allocator.preferred_order),
    candidate_count:candidates.length,
    candidates,
    truth_boundary:'COMPACT_CLAIM_HINT_ONLY_ATOMIC_CREATE_REMAINS_AUTHORITY'
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-claim-frontier.mjs')) {
  const [inPath,outPath] = process.argv.slice(2);
  if (!inPath || !outPath) throw new Error('usage: build-claim-frontier.mjs <allocator.json> <claim-frontier.json>');
  const allocator=JSON.parse(fs.readFileSync(inPath,'utf8'));
  const out=buildClaimFrontier(allocator);
  fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
  process.stdout.write(`claim-frontier ${out.candidate_count} candidates ${fs.statSync(outPath).size} bytes\n`);
}
