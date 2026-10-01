#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { deriveHumanTimeLedger } from './human-time-ledger-v1.mjs';

const arr = value => Array.isArray(value) ? value : [];
const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const iso = value => Number.isFinite(Date.parse(value || '')) ? new Date(Date.parse(value)).toISOString() : null;

function walkJson(root, rel) {
  const base = path.join(root, rel);
  if (!fs.existsSync(base)) return [];
  const out = [];
  const visit = (dir, prefix) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes:true })) {
      const abs = path.join(dir, ent.name);
      const child = path.posix.join(prefix, ent.name);
      if (ent.isDirectory()) visit(abs, child);
      else if (ent.name.endsWith('.json')) {
        const doc = readJson(abs);
        if (doc) out.push({ path:child, doc });
      }
    }
  };
  visit(base, rel);
  return out;
}

export function authorityGateEvents(rows = []) {
  const events = [];
  for (const row of rows) {
    const d = row?.doc || {};
    if (d.schema !== 'prometeo.portfolio-authority-gate/v1' || !d.job_id) continue;
    const openedAt = iso(d.opened_at || d.boundary_returned_at);
    if (!openedAt) continue;
    const correlationId = `authority-gate:${d.job_id}`;
    events.push({
      type:'HUMAN_ACTION_REQUIRED',
      at:openedAt,
      boundary_id:correlationId,
      correlation_id:correlationId,
      classification:'NECESSARY_HUMAN_GATE',
      required_action:d.required_authority?.requirement || d.required_authority?.kind || 'human authority required',
      evidence_ref:row.path,
      source_ref:row.path
    });
    const satisfiedAt = iso(d.satisfied_at_or_null);
    if (satisfiedAt && d.satisfied_by_evidence_ref_or_null) {
      events.push({
        type:'boundary_cleared',
        at:satisfiedAt,
        boundary_id:correlationId,
        correlation_id:correlationId,
        evidence_ref:d.satisfied_by_evidence_ref_or_null,
        source_ref:row.path
      });
    }
  }
  return events;
}

export function workerSignalEvents(rows = []) {
  return rows.flatMap(row => {
    const d = row?.doc || {};
    const at = iso(d.returned_at || d.completed_at || d.started_at || d.claimed_at || d.launched_at || d.created_at);
    if (!at) return [];
    return [{
      type:'WORKER_SIGNAL',
      at,
      correlation_id:`worker:${d.worker_id || d.session_id || 'unknown'}:${row.path}`,
      evidence_ref:row.path,
      source_ref:row.path
    }];
  });
}

export function canonicalizeHumanEvents(events = []) {
  const seen = new Map();
  const orphanEvents = [];
  const openKeys = new Set();
  const output = [];
  for (const raw of [...events].sort((a,b)=>Date.parse(a.at||0)-Date.parse(b.at||0))) {
    const correlationId = raw.correlation_id || raw.boundary_id || `event:${raw.type}:${raw.at}:${raw.evidence_ref || raw.source_ref || 'unbound'}`;
    const event = { ...raw, correlation_id:correlationId, evidence_ref:raw.evidence_ref || raw.source_ref || null };
    const dedupeKey = `${event.type}|${correlationId}|${event.at}|${event.evidence_ref || ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.set(dedupeKey, true);
    if (event.type === 'HUMAN_ACTION_REQUIRED') openKeys.add(event.boundary_id || correlationId);
    if ((event.type === 'HUMAN_ACTION_OBSERVED' || event.type === 'boundary_cleared') && !openKeys.has(event.boundary_id || correlationId)) {
      orphanEvents.push({
        correlation_id:correlationId,
        type:event.type,
        at:event.at,
        evidence_ref:event.evidence_ref,
        reason:'CLOSE_WITHOUT_MATCHING_OPEN_IN_VISIBLE_EVENT_SET'
      });
      continue;
    }
    if (event.type === 'HUMAN_ACTION_OBSERVED' || event.type === 'boundary_cleared') openKeys.delete(event.boundary_id || correlationId);
    output.push(event);
  }
  return { events:output, orphan_events:orphanEvents, duplicate_events_merged:events.length-output.length-orphanEvents.length };
}

export function buildHumanTimeProjection({ events = [], asOf }) {
  const canonical = canonicalizeHumanEvents(events);
  const ledger = deriveHumanTimeLedger(canonical.events, { asOf });
  const pending = ledger.primary_chat.pending_human_actions.map(item => ({
    ...item,
    correlation_id:item.boundary_id,
    evidence_ref:canonical.events.find(event => event.type === 'HUMAN_ACTION_REQUIRED' && event.boundary_id === item.boundary_id)?.evidence_ref || null
  }));
  const evidenceRefs = [...new Set(canonical.events.map(event=>event.evidence_ref).filter(Boolean))];
  return {
    schema:'prometeo.human-time-ledger-projection/v1',
    generated_at:asOf,
    primary_chat:{ ...ledger.primary_chat, pending_human_actions:pending },
    scale_readiness:ledger.scale_readiness,
    human_touch_budget:ledger.human_touch_budget,
    orphan_events:canonical.orphan_events,
    duplicate_events_merged:canonical.duplicate_events_merged,
    evidence_refs:evidenceRefs,
    event_count:canonical.events.length,
    truth_boundary:'Projection from durable public-safe event metadata only; no private payload, presence inference, guessed human effort, or scheduling authority.'
  };
}

export function applyHumanTimeLedger(feed, root, asOf = null) {
  const generatedAt = iso(asOf || feed?.generated_at || new Date().toISOString()) || new Date().toISOString();
  const gates = walkJson(root, 'coordination/portfolio/authority-gates');
  const workerRows = [
    ...walkJson(root, 'coordination/workers/started'),
    ...walkJson(root, 'coordination/portfolio/returns'),
    ...walkJson(root, 'coordination/guide/receipts')
  ];
  const projection = buildHumanTimeProjection({ events:[...authorityGateEvents(gates), ...workerSignalEvents(workerRows)], asOf:generatedAt });
  return {
    ...feed,
    human_time_ledger:projection,
    primary_chat:{ ...(feed?.primary_chat || {}), ...projection.primary_chat },
    scale_readiness:{ ...(feed?.scale_readiness || {}), ...projection.scale_readiness },
    human_touch_budget:projection.human_touch_budget
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const [feedPath, root='.', outPath=feedPath] = argv;
  if (!feedPath) throw new Error('usage: apply-human-time-ledger.mjs <feed.json> [repo-root] [out.json]');
  const feed = readJson(feedPath);
  if (!feed) throw new Error(`cannot read feed ${feedPath}`);
  const next = applyHumanTimeLedger(feed, path.resolve(root));
  fs.writeFileSync(outPath, `${JSON.stringify(next, null, 2)}\n`);
  process.stdout.write(`human-time-ledger events=${next.human_time_ledger.event_count} pending=${next.primary_chat.pending_human_actions.length} orphans=${next.human_time_ledger.orphan_events.length}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { runCli(); } catch (error) { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; }
}
