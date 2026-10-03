import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function walk(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function iso(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function rel(root, p) {
  return path.relative(root, p).split(path.sep).join('/');
}

function clean(value, max = 240) {
  if (value === undefined || value === null) return null;
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}

function pushIfRecent(list, row, cutoff) {
  const t = Date.parse(row.at || row.start_at || row.end_at || 0);
  if (Number.isFinite(t) && t >= cutoff) list.push(row);
}

export function compileActivityTimeline(runtime, root, nowIso = new Date().toISOString(), days = 8) {
  const generatedAt = iso(nowIso) || new Date().toISOString();
  const nowMs = Date.parse(generatedAt);
  const cutoff = nowMs - Math.max(1, Number(days) || 8) * 86400000;
  const spans = [];
  const events = [];
  const seenWorkers = new Set();

  // Finite RUN plans are durable intent, never evidence that a worker launched or worked.
  for (const p of walk(path.join(root, 'coordination', 'launch-packets')).filter(x => path.basename(x) === 'PACKET.json')) {
    const d = readJson(p);
    if (!d?.run_id || d?.timeline_projection?.visible_on_cycle_page !== true) continue;
    const start = iso(d.timeline_projection.planned_start_at || d.planned_start_at);
    const boundary = iso(d.timeline_projection.human_observation_boundary_at || start);
    if (!start || !boundary || Date.parse(boundary) < cutoff) continue;
    const ref = rel(root, p);
    spans.push({
      id: `run-plan:${d.run_id}`,
      actor_kind: 'run_plan',
      actor_id: d.run_id,
      batch_id: d.batch_id || null,
      start_at: start,
      end_at: boundary,
      last_activity_at: iso(d.created_at) || start,
      status: 'PLANNED',
      evidence_level: 'DURABLE_RUN_PACKET',
      expected_workers: Number(d.expected_workers || d.expected_human_launches || 0),
      refs: [ref]
    });
    for (const slot of Array.isArray(d.slots) ? d.slots : []) {
      pushIfRecent(events, {
        id: `planned:${d.run_id}:${slot.slot_id}`,
        type: 'PLANNED',
        actor_kind: 'run_plan',
        actor_id: d.run_id,
        at: start,
        batch_id: d.batch_id || null,
        work_id: slot.slot_id || null,
        label: clean(`${slot.slot_alias || slot.slot_id || 'slot'} · ${slot.title || slot.objective_id || 'planned work'}`, 180),
        evidence_level: 'DURABLE_RUN_PACKET',
        refs: [ref]
      }, cutoff);
    }
  }

  for (const batch of Array.isArray(runtime?.batches) ? runtime.batches : []) {
    for (const worker of Array.isArray(batch?.workers) ? batch.workers : []) {
      if (!worker?.worker_id) continue;
      const launchedAt = iso(worker.first_event_at || worker?.claim?.at || worker?.started?.at);
      const startedAt = iso(worker?.started?.at);
      const start = launchedAt || startedAt;
      const last = iso(worker.last_event_at || worker?.close?.at || start);
      const closeAt = iso(worker?.close?.at);
      if (!start || Date.parse(last || start) < cutoff) continue;
      const terminal = worker?.state === 'CLOSED' || worker?.close?.terminal === true;
      const fresh = Boolean(last) && nowMs - Date.parse(last) < 10 * 60 * 1000;
      const observedWorking = Boolean(startedAt && fresh && Date.parse(last) >= Date.parse(startedAt));
      const resultRef = worker?.close?.result_ref_or_null || null;
      const status = terminal ? (resultRef ? 'RESULT' : 'CLOSED') : (observedWorking ? 'OBSERVED_WORKING' : (fresh ? 'LAUNCHED' : 'STALE'));
      spans.push({
        id: `worker:${worker.worker_id}`,
        actor_kind: 'worker',
        actor_id: worker.worker_id,
        batch_id: batch.batch_id || null,
        start_at: start,
        end_at: terminal ? (closeAt || last) : (observedWorking ? generatedAt : last),
        last_activity_at: last,
        status,
        lifecycle_phase: status,
        evidence_level: 'DURABLE_RUNTIME',
        productive_units: Number(worker.productive_units || 0),
        state: worker.state || null,
        refs: [
          worker?.repo?.beacon_ref,
          worker?.repo?.exam_ref,
          resultRef
        ].filter(Boolean)
      });
      pushIfRecent(events, {
        id: `launched:${worker.worker_id}`,
        type: 'LAUNCHED',
        actor_kind: 'worker',
        actor_id: worker.worker_id,
        at: start,
        batch_id: batch.batch_id || null,
        evidence_level: 'DURABLE_RUNTIME',
        refs: [worker?.repo?.beacon_ref].filter(Boolean)
      }, cutoff);
      if (startedAt) {
        pushIfRecent(events, {
          id: `working:${worker.worker_id}:${startedAt}`,
          type: 'OBSERVED_WORKING',
          actor_kind: 'worker',
          actor_id: worker.worker_id,
          at: startedAt,
          batch_id: batch.batch_id || null,
          evidence_level: 'DURABLE_STARTED_SIGNAL',
          refs: [worker?.repo?.beacon_ref].filter(Boolean)
        }, cutoff);
      }
      if (terminal && resultRef) {
        pushIfRecent(events, {
          id: `result:${worker.worker_id}:${closeAt || last}`,
          type: 'RESULT',
          actor_kind: 'worker',
          actor_id: worker.worker_id,
          at: closeAt || last,
          batch_id: batch.batch_id || null,
          evidence_level: 'DURABLE_RESULT_REF',
          refs: [resultRef]
        }, cutoff);
      }
      seenWorkers.add(worker.worker_id);
    }
  }

  // E9 exams are a durable fallback when a historical worker is outside runtime's compact batch window.
  for (const p of walk(path.join(root, 'coordination', 'workers', 'exams')).filter(x => x.endsWith('.json'))) {
    const d = readJson(p);
    if (!d?.worker_id || seenWorkers.has(d.worker_id)) continue;
    const start = iso(d.started_at_or_null || d.started_at || d.launched_at);
    const end = iso(d.closed_at || d.audit_completed_at || d.updated_at);
    if (!start || !end || Date.parse(end) < cutoff) continue;
    spans.push({
      id: `worker:${d.worker_id}`,
      actor_kind: 'worker',
      actor_id: d.worker_id,
      batch_id: d.batch_id || d.pool_id || d.run_id || null,
      start_at: start,
      end_at: end,
      last_activity_at: end,
      status: 'CLOSED',
      lifecycle_phase: 'CLOSED',
      evidence_level: 'DURABLE_E9',
      productive_units: Number(d.productive_units || d.productive_slots || 0),
      state: 'CLOSED',
      refs: [rel(root, p)]
    });
  }

  for (const p of walk(path.join(root, 'coordination', 'chat-sessions')).filter(x => path.basename(x) === 'JOURNAL.json')) {
    const d = readJson(p);
    const entries = Array.isArray(d?.entries) ? d.entries : [];
    const times = entries.map(e => iso(e?.created_at)).filter(Boolean).sort();
    if (!times.length || Date.parse(times.at(-1)) < cutoff) continue;
    const sessionId = d.session_id || path.basename(path.dirname(p));

    // This is deliberately an observation envelope, not a claim that the AI was continuously active.
    spans.push({
      id: `ai-session:${sessionId}`,
      actor_kind: 'ai_session',
      actor_id: sessionId,
      start_at: times[0],
      end_at: times.at(-1),
      last_activity_at: times.at(-1),
      status: 'OBSERVED_ENVELOPE',
      evidence_level: 'JOURNAL_CHECKPOINTS_ONLY',
      refs: [rel(root, p)]
    });

    for (const entry of entries) {
      const at = iso(entry?.created_at);
      if (!at) continue;
      pushIfRecent(events, {
        id: `human:${sessionId}:${entry.entry_id || at}`,
        type: 'HUMAN_PROMPT_CHECKPOINT',
        actor_kind: 'human',
        actor_id: 'human',
        at,
        session_id: sessionId,
        label: clean(entry.human_intent_summary, 180) || 'interacción humana',
        privacy: 'PUBLIC_SANITIZED_SUMMARY_ALREADY_DURABLE',
        raw_text_included: false,
        evidence_level: 'JOURNAL_SUMMARY_ONLY',
        refs: [`${rel(root, p)}${entry.entry_id ? `#${entry.entry_id}` : ''}`]
      }, cutoff);

      pushIfRecent(events, {
        id: `ai:${sessionId}:${entry.entry_id || at}`,
        type: 'AI_JOURNAL_CHECKPOINT',
        actor_kind: 'ai_session',
        actor_id: sessionId,
        at,
        label: clean(entry.assistant_conclusion, 180) || 'checkpoint IA',
        evidence_level: 'JOURNAL_CHECKPOINT',
        refs: [`${rel(root, p)}${entry.entry_id ? `#${entry.entry_id}` : ''}`]
      }, cutoff);
    }
  }

  for (const p of walk(path.join(root, 'coordination', 'portfolio', 'returns')).filter(x => x.endsWith('.json'))) {
    const d = readJson(p);
    if (!d) continue;
    const at = iso(d.returned_at || d.created_at || d.completed_at || d.updated_at);
    if (!at) continue;
    const actorId = d.worker_id || 'worker';
    const ref = rel(root, p);
    pushIfRecent(events, {
      id: `result:${ref}`,
      type: 'RESULT',
      actor_kind: 'worker',
      actor_id: actorId,
      at,
      project_id: d.project_id || null,
      work_id: d.job_id || d.work_id || null,
      outcome: clean(d.outcome || d.status || d.state, 80),
      productive_unit_counted: d.productive_unit_counted === true,
      evidence_level: 'DURABLE_ARTIFACT',
      refs: [ref]
    }, cutoff);

    const verifiedAt = iso(d.verified_at || d?.verification?.verified_at);
    const verificationRef = d.verification_ref || d?.verification?.ref || null;
    if (verifiedAt && verificationRef) {
      pushIfRecent(events, {
        id: `verified:${ref}`,
        type: 'VERIFIED',
        actor_kind: 'worker',
        actor_id: actorId,
        at: verifiedAt,
        work_id: d.job_id || d.work_id || null,
        evidence_level: 'EXPLICIT_VERIFICATION_REF',
        refs: [ref, verificationRef]
      }, cutoff);
    }

    const consumedAt = iso(d.consumed_at || d?.integration?.consumed_at);
    const consumer = clean(d.consumer || d.consumed_by || d?.integration?.consumer, 120);
    if (consumedAt && consumer) {
      pushIfRecent(events, {
        id: `consumed:${ref}`,
        type: 'CONSUMED',
        actor_kind: 'worker',
        actor_id: actorId,
        at: consumedAt,
        work_id: d.job_id || d.work_id || null,
        consumer,
        evidence_level: 'EXPLICIT_CONSUMER_REF',
        refs: [ref]
      }, cutoff);
    }
  }

  for (const p of walk(path.join(root, 'coordination', 'guide', 'receipts')).filter(x => x.endsWith('.json'))) {
    const d = readJson(p);
    if (!d) continue;
    const at = iso(d.created_at || d.completed_at || d.updated_at);
    if (!at) continue;
    pushIfRecent(events, {
      id: `guide_receipt:${rel(root, p)}`,
      type: 'GUIDE_RECEIPT',
      actor_kind: 'guide',
      actor_id: d.guide_id || d.role || 'guide',
      at,
      project_id: d.project_id || null,
      work_id: d.guide_work_id || d.work_id || null,
      outcome: clean(d.status || d.state, 80),
      evidence_level: 'DURABLE_ARTIFACT',
      refs: [rel(root, p)]
    }, cutoff);
  }

  spans.sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at) || a.id.localeCompare(b.id));
  events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));

  const promptCount = events.filter(e => e.type === 'HUMAN_PROMPT_CHECKPOINT').length;
  const workerCount = spans.filter(s => s.actor_kind === 'worker').length;
  const aiSessionCount = spans.filter(s => s.actor_kind === 'ai_session').length;
  const plannedRunCount = spans.filter(s => s.actor_kind === 'run_plan').length;

  return {
    schema: 'prometeo.activity-timeline/v1',
    generated_at: generatedAt,
    source_sha: process.env.GITHUB_SHA || null,
    window_days: days,
    cycle: {
      seconds: 1800,
      human_burst_seconds: 300,
      anchor: 'LOCAL_CLOCK_:00_AND_:30',
      meaning: 'Human observation cadence only; worker lifetime is not capped by cycle boundary.'
    },
    coverage: {
      worker_pipeline: 'DURABLE_RUNTIME_PLUS_E9',
      finite_run_plans: 'DURABLE_PACKET_PLANNED_ONLY',
      lifecycle: 'PLANNED_LAUNCHED_OBSERVED_WORKING_RESULT_VERIFIED_CONSUMED_WITH_EXPLICIT_EVIDENCE_BOUNDARIES',
      guide_and_returns: 'DURABLE_POINT_EVENTS',
      prometeo_chat_sessions: 'JOURNAL_CHECKPOINTS_AND_SANITIZED_HUMAN_INTENT_SUMMARIES',
      raw_prompt_text_public: false,
      arbitrary_external_ai_sessions: 'UNOBSERVED_UNTIL_RECORDER_ADAPTER_EXISTS',
      liveness_rule: 'OBSERVED_WORKING requires a durable started signal plus fresh activity; old ACTIVE labels alone never imply liveness.'
    },
    counts: {
      spans: spans.length,
      events: events.length,
      workers: workerCount,
      ai_sessions: aiSessionCount,
      planned_runs: plannedRunCount,
      human_prompt_checkpoints: promptCount
    },
    spans,
    events,
    truth_boundary: 'PUBLIC_OBSERVABILITY_PROJECTION_ONLY; PLANNED != LAUNCHED != OBSERVED_WORKING; RESULT != VERIFIED != CONSUMED; canonical authority remains existing Work Graph/Worker Bus/durable owners.'
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runtimePath = process.argv[2];
  const root = process.argv[3];
  const outPath = process.argv[4] || 'activity-timeline.json';
  if (!runtimePath || !root) throw new Error('usage: node build-activity-timeline.mjs <runtime.json> <repo-root> [out.json]');
  const runtime = readJson(runtimePath) || {};
  const out = compileActivityTimeline(runtime, root);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
}
