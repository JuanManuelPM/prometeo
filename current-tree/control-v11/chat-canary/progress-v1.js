(() => {
  'use strict';

  const WORK_UNIT_ID = 'WU-CHAT-CANARY-DURABLE-MESSAGE-V1';
  const PROJECTION_URL = '../../../coordination/portfolio/derived/INTERACTIVE_WORK_UNITS_V1.json';
  const RUNTIME_URL = '../../../live/runtime.json';
  const FRONTIER_URL = '../../../live/claim-frontier.json';
  const THREAD_URL = '../../../coordination/portfolio/evidence/prometeo-autonomous-growth/CHAT_THREAD_MIRROR_CANARY_V1.json';
  const CONTRACT_URL = '../../../coordination/guide/PRIMARY_CHAT_STATE_COMMUNICATION_CONTRACT_V1.json';
  const WAKE_OWNER_REF = 'coordination/jobs/derived/primary-chat-p0-platform-wake-capacity-v1/OWNER.json';
  const STALE_MS = 120000;
  const LIVE_MS = 600000;
  const RESERVE_LOW_THRESHOLD = 3;
  const CORE_LIMIT = 6;
  const QA_STATUSES = new Set(['QA_PENDING','QA_PASS','QA_REPAIR_IN_PROGRESS','QA_BLOCKED','READY_TO_PROMOTE']);

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function tone(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'COMPLETED') return { glyph: '●', color: '#82d69a' };
    if (value === 'FAILED') return { glyph: '●', color: '#ff7676' };
    return { glyph: '●', color: '#d9b45f' };
  }

  function render(host, wu) {
    host.replaceChildren();
    host.setAttribute('data-work-unit-id', WORK_UNIT_ID);
    host.setAttribute('data-progress-source', 'INTERACTIVE_WORK_UNITS_V1');
    const details = el('details', null, 'prometeo-progress-widget');
    const summary = el('summary');
    const light = tone(wu.status);
    const dot = el('span', light.glyph, 'progress-dot');
    dot.style.color = light.color;
    const pctValue = Number.isFinite(Number(wu.progress)) ? Math.round(Number(wu.progress)) : null;
    summary.append(dot, el('strong', pctValue === null ? '—' : pctValue + '%', 'progress-pct'), el('span', wu.current_stage || 'UNKNOWN', 'progress-stage'));
    const inner = el('div', null, 'progress-inner');
    const rail = el('div', null, 'progress-rail');
    const fill = el('div', null, 'progress-fill');
    fill.style.width = Math.max(0, Math.min(100, Number(wu.progress) || 0)) + '%';
    rail.append(fill);
    const steps = Array.isArray(wu.steps) ? wu.steps : [];
    const done = steps.filter(step => step && step.status === 'DONE').length;
    const list = el('div', null, 'progress-steps');
    for (const step of steps) {
      const row = el('div', null, 'progress-step');
      const state = el('span', step.status === 'DONE' ? '✓' : '·', 'progress-step-state');
      if (step.status === 'DONE') state.classList.add('done');
      row.append(state, el('span', step.name || step.step_id || 'step', 'progress-step-name'), el('span', String(step.weight || 0) + '%', 'progress-step-weight'));
      list.append(row);
    }
    inner.append(rail, el('div', done + '/' + steps.length + ' · ' + (wu.status || 'UNKNOWN'), 'progress-counts'), list);
    details.append(summary, inner);
    host.append(details);
  }

  async function load(hostOrSelector) {
    const host = typeof hostOrSelector === 'string' ? document.querySelector(hostOrSelector) : hostOrSelector;
    if (!host) return { ok: false, reason: 'HOST_MISSING' };
    try {
      const response = await fetch(PROJECTION_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const projection = await response.json();
      const wu = Array.isArray(projection.work_units) ? projection.work_units.find(row => row && row.work_unit_id === WORK_UNIT_ID) : null;
      if (!wu) throw new Error('WORK_UNIT_MISSING');
      render(host, wu);
      return { ok: true, work_unit_id: WORK_UNIT_ID, progress: wu.progress, current_stage: wu.current_stage, status: wu.status };
    } catch (error) {
      host.replaceChildren(el('span', 'progreso no disponible', 'progress-error'));
      return { ok: false, reason: error?.message || 'UNKNOWN' };
    }
  }

  function asDate(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  }

  function lastWorkerSignal(worker) {
    return worker?.close?.at || worker?.last_event_at || worker?.claim?.at || worker?.routed?.at || worker?.first_event_at || null;
  }

  function isTerminal(worker) {
    return Boolean(worker && (worker.terminal === true || worker?.close?.terminal === true || String(worker.state || '').toUpperCase() === 'CLOSED'));
  }

  function isFreshClaimTransportBlock(worker, now = Date.now()) {
    const outcome = String(worker?.close?.outcome || worker?.close_outcome || worker?.state || '');
    if (!/CLAIM_TRANSPORT_BLOCKED/.test(outcome)) return false;
    const signal = asDate(worker?.close?.at || worker?.last_event_at || worker?.claim?.at || worker?.first_event_at);
    return Boolean(signal && now - signal.getTime() < LIVE_MS);
  }

  const n = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

  function compileContractState(input, contract, cfg = {}) {
    const staleThresholdSeconds = Number(cfg.projection_stale_threshold_seconds || STALE_MS / 1000);
    const reserveLowThreshold = Number(cfg.reserve_low_threshold ?? RESERVE_LOW_THRESHOLD);
    const rules = [
      ['PROJECTION_STALE', n(input.projection_age_seconds) > staleThresholdSeconds],
      ['HUMAN_DECISION_REQUIRED', input.human_decision_required === true],
      ['CLAIM_TRANSPORT_DEGRADED', n(input.claim_transport_blocked_count) > 0],
      ['HUMAN_INTENT_WAITING_NO_CAPACITY', n(input.pending_human_intent_count) > 0 && n(input.live_worker_count) === 0 && n(input.capacity_gap) > 0],
      ['RETURNS_UNCONSUMED', n(input.unconsumed_returns_count) > 0 && n(input.live_worker_count) > 0],
      ['RECOVERY_PRESSURE', n(input.recovery_attention_count) > 0 && n(input.live_worker_count) > 0],
      ['REFILL_N', n(input.capacity_gap) > 0 && (n(input.claimable_generic_count) + n(input.claimable_specialized_count)) > 0],
      ['BUFFER_LOW', n(input.capacity_gap) === 0 && n(input.reserve_workers) <= reserveLowThreshold && n(input.core_demand) > 0],
      ['CAPACITY_OK', n(input.core_demand) > 0 && n(input.capacity_gap) === 0 && n(input.live_worker_count) > 0],
      ['WORKERS_ACTIVE_NO_ACTION', n(input.live_worker_count) > 0],
      ['CAMPAIGN_COMPLETE', input.campaign_complete === true]
    ];
    const state = rules.find(([,ok]) => ok)?.[0] || 'NO_SAFE_WORK';
    const allowed = Array.isArray(contract?.state_precedence) ? new Set(contract.state_precedence) : null;
    return !allowed || allowed.has(state) ? state : 'NO_SAFE_WORK';
  }

  function classifyCapacityState(input) {
    const compat = {
      projection_age_seconds: input.stale ? STALE_MS / 1000 + 1 : 0,
      human_decision_required: Boolean(input.humanDecisionRequired),
      claim_transport_blocked_count: n(input.claimTransportBlockedCount),
      pending_human_intent_count: n(input.pendingHumanIntentCount),
      unconsumed_returns_count: n(input.unconsumedReturnsCount),
      recovery_attention_count: n(input.recoveryAttentionCount),
      live_worker_count: n(input.live),
      claimable_generic_count: n(input.claimable),
      claimable_specialized_count: 0,
      core_demand: n(input.core),
      reserve_workers: n(input.reserve),
      capacity_gap: n(input.need),
      campaign_complete: Boolean(input.campaignComplete)
    };
    return compileContractState(compat, null);
  }

  function scenario(name, input, expected) {
    const actual = classifyCapacityState(input);
    return Object.freeze({ name, expected, actual, pass: actual === expected });
  }

  function explicitQa(thread) {
    const rows = Array.isArray(thread?.messages) ? thread.messages : [];
    const found = rows.map(row => {
      const status = String(row?.qa_status || row?.metadata?.qa_status || row?.qa?.status || row?.metadata?.qa?.status || '').toUpperCase();
      if (!QA_STATUSES.has(status)) return null;
      const at = asDate(row?.qa_updated_at || row?.metadata?.qa_updated_at || row?.qa?.updated_at || row?.published_at || row?.created_at);
      if (!at) return null;
      return {
        status,
        at: at.toISOString(),
        artifact_ref: row?.artifact_ref || row?.metadata?.artifact_ref || row?.qa?.artifact_ref || null,
        version_ref: row?.version_ref || row?.metadata?.version_ref || row?.qa?.version_ref || null,
        evidence_ref: row?.qa_evidence_ref || row?.metadata?.qa_evidence_ref || row?.qa?.evidence_ref || null
      };
    }).filter(Boolean).sort((a,b)=>new Date(b.at)-new Date(a.at));
    return found[0] || null;
  }

  function workerRows(workers, now = Date.now()) {
    return workers.map(worker => {
      const signal = asDate(lastWorkerSignal(worker));
      if (!signal) return null;
      const terminal = isTerminal(worker);
      return {
        worker_id: worker?.worker_id || worker?.id || worker?.agent_id || 'worker',
        terminal,
        state: terminal ? String(worker?.close?.outcome || worker?.state || 'CLOSED') : String(worker?.state || worker?.stage || 'LIVE'),
        last_signal_at: signal.toISOString(),
        age_seconds: Math.max(0, Math.round((now - signal.getTime()) / 1000)),
        result_ref: worker?.close?.result_ref || worker?.result_ref || worker?.return_ref || null
      };
    }).filter(Boolean).sort((a,b)=>new Date(b.last_signal_at)-new Date(a.last_signal_at));
  }

  function runCapacityHarness() {
    const cases = [
      scenario('0 workers + trabajo', {live:0,claimable:4,core:4,reserve:0,need:4}, 'REFILL_N'),
      scenario('capacidad suficiente', {live:7,claimable:3,core:3,reserve:4,need:0}, 'CAPACITY_OK'),
      scenario('buffer <=3', {live:5,claimable:3,core:3,reserve:2,need:0}, 'BUFFER_LOW'),
      scenario('humano sin acción >1h con trabajo detenido', {live:0,claimable:2,core:2,reserve:0,need:2,pendingHumanIntentCount:1}, 'HUMAN_INTENT_WAITING_NO_CAPACITY'),
      scenario('humano recién activo con déficit', {live:2,claimable:5,core:5,reserve:0,need:3}, 'REFILL_N'),
      scenario('proyección stale', {stale:true,live:0,claimable:5,core:5,reserve:0,need:5}, 'PROJECTION_STALE'),
      scenario('human decision boundary', {humanDecisionRequired:true,live:4,claimable:2,core:2,reserve:2,need:0}, 'HUMAN_DECISION_REQUIRED'),
      scenario('claim transport blocked', {claimTransportBlockedCount:1,live:4,claimable:2,core:2,reserve:2,need:0}, 'CLAIM_TRANSPORT_DEGRADED'),
      scenario('returns unconsumed', {unconsumedReturnsCount:2,live:4,claimable:2,core:2,reserve:2,need:0}, 'RETURNS_UNCONSUMED'),
      scenario('returns sin worker vivo pide refill', {unconsumedReturnsCount:2,live:0,claimable:4,core:4,reserve:0,need:4}, 'REFILL_N'),
      scenario('recovery pressure', {recoveryAttentionCount:2,live:4,claimable:2,core:2,reserve:2,need:0}, 'RECOVERY_PRESSURE'),
      scenario('recovery sin worker vivo pide refill', {recoveryAttentionCount:2,live:0,claimable:4,core:4,reserve:0,need:4}, 'REFILL_N'),
      scenario('campaña terminada explícita', {live:0,claimable:0,core:0,reserve:0,need:0,campaignComplete:true}, 'CAMPAIGN_COMPLETE')
    ];
    const freshnessNow = Date.parse('2026-10-01T22:45:00Z');
    const freshnessCases = [
      {name:'block reciente cuenta', pass:isFreshClaimTransportBlock({close:{outcome:'CLAIM_TRANSPORT_BLOCKED',at:'2026-10-01T22:44:00Z'}}, freshnessNow) === true},
      {name:'block histórico no envenena estado actual', pass:isFreshClaimTransportBlock({close:{outcome:'CLAIM_TRANSPORT_BLOCKED',at:'2026-10-01T22:20:00Z'}}, freshnessNow) === false},
      {name:'terminal no cuenta como live', pass:workerRows([{worker_id:'done',terminal:true,last_event_at:'2026-10-01T22:44:30Z'}],freshnessNow)[0]?.terminal === true},
      {name:'QA sólo sale de campo durable explícito', pass:explicitQa({messages:[{body_text:'QA_PASS no debe inferirse desde prose',published_at:'2026-10-01T22:44:00Z'},{qa_status:'QA_PASS',qa_updated_at:'2026-10-01T22:44:30Z'}]})?.status === 'QA_PASS'}
    ].map(row => Object.freeze({...row, expected:true, actual:row.pass}));
    const all = [...cases, ...freshnessCases];
    return Object.freeze({ total: all.length, passed: all.filter(row => row.pass).length, cases: all });
  }

  async function getJson(url) {
    const response = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), {cache:'no-store'});
    if (!response.ok) throw new Error('HTTP_' + response.status + '_' + url);
    return response.json();
  }

  function latestHumanAt(thread) {
    const rows = Array.isArray(thread?.messages) ? thread.messages : [];
    const times = rows.filter(row => row && String(row.actor_type || '').toUpperCase() === 'HUMAN')
      .map(row => asDate(row.published_at || row.created_at)).filter(Boolean).sort((a,b)=>b-a);
    return times[0] || null;
  }

  function humanDecisionRequired(thread) {
    const rows = Array.isArray(thread?.messages) ? thread.messages : [];
    return rows.some(row => row && row.archived !== true && (
      String(row.status || '').toUpperCase() === 'HUMAN_DECISION_REQUIRED' ||
      /HUMAN_DECISION_REQUIRED/.test(String(row.body_text || ''))
    ));
  }

  function pendingHumanIntentCount(thread) {
    const rows = Array.isArray(thread?.messages) ? thread.messages : [];
    return rows.filter(row => row && row.archived !== true && String(row.actor_type || '').toUpperCase() === 'HUMAN' && ['QUEUED','WAITING','PENDING'].includes(String(row.status || '').toUpperCase())).length;
  }

  function stateInput(runtime, frontier, thread, now = Date.now()) {
    const batchId = runtime?.current_batch || 'POOL-PROD-01';
    const batch = Array.isArray(runtime?.batches) ? runtime.batches.find(row => row && row.batch_id === batchId) : null;
    const workers = Array.isArray(batch?.workers) ? batch.workers : [];
    const rows = workerRows(workers, now);
    const live = rows.filter(row => !row.terminal && row.age_seconds * 1000 < LIVE_MS).length;
    const candidates = Array.isArray(frontier?.candidates) ? frontier.candidates : [];
    const generic = candidates.filter(row => !Array.isArray(row?.required_capabilities) || row.required_capabilities.length === 0).length;
    const specialized = Math.max(0, candidates.length - generic);
    const claimable = Math.max(0, Number(frontier?.candidate_count ?? candidates.length));
    const core = Math.min(CORE_LIMIT, claimable);
    const reserve = Math.max(0, live - core);
    const need = Math.max(0, core - live);
    const runtimeAt = asDate(runtime?.generated_at);
    const frontierAt = asDate(frontier?.generated_at);
    const projectionAt = [runtimeAt, frontierAt].filter(Boolean).sort((a,b)=>a-b)[0] || null;
    const projectionAgeSeconds = projectionAt ? Math.max(0, (now - projectionAt.getTime()) / 1000) : STALE_MS / 1000 + 1;
    const humanAt = latestHumanAt(thread);
    const blocked = workers.filter(worker => isFreshClaimTransportBlock(worker, now)).length;
    const recovery = candidates.filter(row => String(row?.lane || row?.candidate_type || '').toUpperCase() === 'RECOVERY').length;
    const explicitComplete = runtime?.campaign_complete === true || batch?.campaign_complete === true;
    const lastFinished = rows.find(row => row.terminal) || null;
    return Object.freeze({
      batchId,
      input: Object.freeze({
        last_human_action_at: humanAt?.toISOString() || null,
        last_worker_signal_at: rows[0]?.last_signal_at || null,
        live_worker_count: live,
        claimable_generic_count: generic,
        claimable_specialized_count: specialized,
        core_demand: core,
        reserve_workers: reserve,
        capacity_gap: need,
        unconsumed_returns_count: n(runtime?.unconsumed_returns_count ?? batch?.unconsumed_returns_count),
        recovery_attention_count: n(runtime?.recovery_attention_count ?? recovery),
        projection_age_seconds: projectionAgeSeconds,
        human_decision_required: humanDecisionRequired(thread),
        pending_human_intent_count: pendingHumanIntentCount(thread),
        claim_transport_blocked_count: n(runtime?.claim_transport_blocked_count ?? blocked),
        campaign_complete: explicitComplete,
        last_return_at: runtime?.last_return_at ?? batch?.last_return_at ?? null,
        last_visible_result_at: runtime?.last_visible_result_at ?? thread?.generated_at ?? null
      }),
      projectionAt: projectionAt?.toISOString() || null,
      humanAt: humanAt?.toISOString() || null,
      humanAgeMs: humanAt ? Math.max(0, now - humanAt.getTime()) : null,
      recentWorkers: rows.slice(0, 4),
      lastFinished,
      qa: explicitQa(thread)
    });
  }

  function capacitySnapshot(runtime, frontier, thread, contract = null, now = Date.now()) {
    const derived = stateInput(runtime, frontier, thread, now);
    const state = compileContractState(derived.input, contract);
    return Object.freeze({
      batchId: derived.batchId,
      live: derived.input.live_worker_count,
      claimable: derived.input.claimable_generic_count + derived.input.claimable_specialized_count,
      core: derived.input.core_demand,
      reserve: derived.input.reserve_workers,
      need: derived.input.capacity_gap,
      humanAt: derived.humanAt,
      humanAgeMs: derived.humanAgeMs,
      projectionAt: derived.projectionAt,
      stale: state === 'PROJECTION_STALE',
      humanDecisionRequired: derived.input.human_decision_required,
      state,
      recentWorkers: derived.recentWorkers,
      lastFinished: derived.lastFinished,
      lastReturnAt: derived.input.last_return_at,
      lastVisibleResultAt: derived.input.last_visible_result_at,
      qa: derived.qa,
      contractInput: derived.input
    });
  }

  function ageLabel(ms) {
    if (ms === null || ms === undefined || !Number.isFinite(ms)) return 'acción humana: desconocida';
    const min = Math.max(0, Math.round(ms / 60000));
    if (min < 60) return 'acción humana hace ' + min + 'm';
    return 'acción humana hace ' + Math.round(min / 60) + 'h';
  }

  function compactAge(seconds) {
    if (!Number.isFinite(Number(seconds))) return '—';
    const value = Math.max(0, Number(seconds));
    if (value < 60) return Math.round(value) + 's';
    if (value < 3600) return Math.round(value / 60) + 'm';
    return Math.round(value / 3600) + 'h';
  }

  function projectionLabel(value) {
    const date = asDate(value);
    if (!date) return 'proyección desconocida';
    return 'proyección ' + date.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function actionText(snapshot, contract) {
    const template = contract?.templates?.[snapshot.state];
    if (template) return String(template).replace('{capacity_gap}', String(snapshot.need));
    switch (snapshot.state) {
      case 'CLAIM_TRANSPORT_DEGRADED': return 'ACCIÓN: ninguna · claim transport degradado; recovery/owner decide reintento.';
      case 'HUMAN_INTENT_WAITING_NO_CAPACITY': return 'MANDÁ ' + snapshot.need + ' /wc/';
      case 'RETURNS_UNCONSUMED': return 'ACCIÓN: ninguna · returns pendientes de integración.';
      case 'RECOVERY_PRESSURE': return 'ACCIÓN: ninguna · recovery pendiente; CURRENT/owner compatible lo toma.';
      case 'NO_SAFE_WORK': return 'ACCIÓN: ninguna · sin trabajo seguro demostrable.';
      default: return snapshot.state;
    }
  }

  function ensureCapacityHost() {
    let host = document.querySelector('[data-primary-chat-capacity-action-v1]');
    if (host) return host;
    const thread = document.getElementById('thread');
    if (!thread || !thread.parentNode) return null;
    host = el('section');
    host.setAttribute('data-primary-chat-capacity-action-v1','');
    host.setAttribute('aria-label','Estado CURRENT de Prometeo');
    host.style.cssText = 'margin:4px 2px 20px;padding:14px 0 16px;border-top:1px solid #2b2b2b;border-bottom:1px solid #2b2b2b;color:#bdbdb8;font:12px/1.45 ui-sans-serif,system-ui;min-height:170px;';
    thread.parentNode.insertBefore(host, thread);
    return host;
  }

  function renderWorkerSignals(snapshot) {
    const wrap = el('div');
    wrap.style.cssText = 'display:grid;gap:5px;margin-top:12px;padding-top:10px;border-top:1px solid #171717;';
    const title = el('div','SEÑALES RECIENTES');
    title.style.cssText = 'font-size:8px;letter-spacing:.12em;color:#5f5f5b;font-weight:700;';
    wrap.append(title);
    const rows = Array.isArray(snapshot.recentWorkers) ? snapshot.recentWorkers : [];
    if (!rows.length) {
      const empty = el('div','sin señales de worker disponibles');
      empty.style.cssText = 'color:#5f5f5b;font-size:10px;';
      wrap.append(empty);
      return wrap;
    }
    for (const row of rows.slice(0,3)) {
      const line = el('div');
      line.style.cssText = 'display:grid;grid-template-columns:9px minmax(0,1fr) auto;gap:7px;align-items:center;';
      const dot = el('span','●');
      dot.style.cssText = 'font-size:8px;color:' + (row.terminal ? '#777' : row.age_seconds * 1000 < LIVE_MS ? '#82d69a' : '#d9b45f') + ';';
      const main = el('span', row.worker_id + ' · ' + row.state);
      main.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8a8a86;font:9px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;';
      const age = el('span',compactAge(row.age_seconds));
      age.style.cssText = 'color:#60605c;font-size:9px;';
      line.append(dot,main,age);
      wrap.append(line);
    }
    return wrap;
  }

  function renderCapacity(host, snapshot, harness, contract) {
    host.replaceChildren();
    host.dataset.state = snapshot.state;
    host.dataset.contract = contract?.schema || 'UNAVAILABLE';
    host.dataset.authority = contract?.authority || 'NON_AUTHORITATIVE_DERIVED_PROJECTION';
    host.dataset.harness = harness.passed + '/' + harness.total;
    if (snapshot.qa?.status) host.dataset.qaStatus = snapshot.qa.status;
    else delete host.dataset.qaStatus;

    const head = el('div');
    head.style.cssText = 'display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;';
    const eyebrow = el('strong','CURRENT');
    eyebrow.style.cssText = 'font-size:9px;letter-spacing:.15em;color:#d7d7d2;';
    const projected = el('span',projectionLabel(snapshot.projectionAt));
    projected.style.cssText = 'color:#666;font-size:9px;';
    head.append(eyebrow,projected);

    const title = el('div', snapshot.state);
    title.style.cssText = 'margin-top:7px;font-size:clamp(20px,5.5vw,28px);line-height:1.05;font-weight:760;color:#ecece8;letter-spacing:-.035em;overflow-wrap:anywhere;';

    const action = el('div', actionText(snapshot, contract));
    const pending = ['PROJECTION_STALE','HUMAN_DECISION_REQUIRED','CLAIM_TRANSPORT_DEGRADED','HUMAN_INTENT_WAITING_NO_CAPACITY','RETURNS_UNCONSUMED','RECOVERY_PRESSURE','REFILL_N','BUFFER_LOW','NO_SAFE_WORK'].includes(snapshot.state);
    action.style.cssText = 'margin-top:9px;color:' + (pending ? '#d9b45f' : '#82d69a') + ';font-size:14px;line-height:1.35;font-weight:720;';

    const metrics = el('div');
    metrics.style.cssText = 'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:13px;';
    for (const [label,value] of [['LIVE',snapshot.live],['NEED',snapshot.need],['CLAIM',snapshot.claimable],['RESERVE',snapshot.reserve]]) {
      const item = el('div');
      const v = el('div',value);
      v.style.cssText = 'font-size:17px;font-weight:730;color:#d3d3cf;line-height:1;';
      const l = el('div',label);
      l.style.cssText = 'margin-top:3px;font-size:7px;letter-spacing:.1em;color:#565652;';
      item.append(v,l);
      metrics.append(item);
    }

    const context = el('div', ageLabel(snapshot.humanAgeMs));
    context.style.cssText = 'margin-top:9px;color:#61615d;font-size:9px;';

    host.append(head,title,action,metrics,context);

    if (snapshot.lastFinished || snapshot.lastReturnAt) {
      const last = snapshot.lastFinished;
      const line = el('div');
      line.style.cssText = 'margin-top:11px;padding-top:9px;border-top:1px solid #171717;color:#777;font-size:9px;line-height:1.4;overflow-wrap:anywhere;';
      const ref = last?.result_ref || null;
      line.textContent = 'ÚLTIMO TERMINADO · ' + (last?.worker_id || 'worker') + (last?.last_signal_at ? ' · ' + projectionLabel(last.last_signal_at).replace('proyección ','') : '') + (ref ? ' · ' + ref : snapshot.lastReturnAt ? ' · return ' + snapshot.lastReturnAt : '');
      host.append(line);
    }

    if (snapshot.qa) {
      const qa = el('div','QA ' + snapshot.qa.status + (snapshot.qa.version_ref ? ' · ' + snapshot.qa.version_ref : ''));
      const qaPending = ['QA_PENDING','QA_REPAIR_IN_PROGRESS','QA_BLOCKED'].includes(snapshot.qa.status);
      qa.style.cssText = 'margin-top:9px;color:' + (qaPending ? '#d9b45f' : '#82d69a') + ';font-size:10px;font-weight:700;overflow-wrap:anywhere;';
      qa.title = [snapshot.qa.artifact_ref,snapshot.qa.evidence_ref].filter(Boolean).join(' · ');
      host.append(qa);
    }

    host.append(renderWorkerSignals(snapshot));

    const history = el('div','HISTORIA ↓');
    history.style.cssText = 'margin-top:14px;padding-top:9px;border-top:1px solid #202020;color:#50504d;font-size:8px;font-weight:700;letter-spacing:.12em;';
    host.append(history);

    host.title = 'Projection only · owner: ' + WAKE_OWNER_REF + ' · contract ' + (contract?.schema || 'unavailable') + ' · harness ' + harness.passed + '/' + harness.total;
  }

  async function loadCapacityAction() {
    const host = ensureCapacityHost();
    if (!host) return {ok:false,reason:'CAPACITY_HOST_MISSING'};
    const harness = runCapacityHarness();
    try {
      const [runtime, frontier, thread, contract] = await Promise.all([getJson(RUNTIME_URL), getJson(FRONTIER_URL), getJson(THREAD_URL), getJson(CONTRACT_URL)]);
      if (contract?.schema !== 'prometeo.primary-chat-state-communication-contract/v1') throw new Error('STATE_CONTRACT_INCOMPATIBLE');
      const snapshot = capacitySnapshot(runtime, frontier, thread, contract);
      renderCapacity(host, snapshot, harness, contract);
      return {ok:true,snapshot,harness,contract:contract.schema};
    } catch (error) {
      const snapshot = Object.freeze({state:'PROJECTION_STALE',live:0,claimable:0,core:0,reserve:0,need:0,humanAgeMs:null,projectionAt:null,stale:true,recentWorkers:[],lastFinished:null,lastReturnAt:null,qa:null});
      renderCapacity(host, snapshot, harness, null);
      host.title = 'PROJECTION_STALE · ' + (error?.message || 'UNKNOWN') + ' · projection only · harness ' + harness.passed + '/' + harness.total;
      return {ok:false,reason:error?.message || 'UNKNOWN',harness};
    }
  }

  window.PrometeoChatCanaryProgress = Object.freeze({
    workUnitId: WORK_UNIT_ID,
    projectionUrl: PROJECTION_URL,
    load,
    capacity: Object.freeze({
      runtimeUrl:RUNTIME_URL,
      frontierUrl:FRONTIER_URL,
      threadUrl:THREAD_URL,
      contractUrl:CONTRACT_URL,
      wakeOwnerRef:WAKE_OWNER_REF,
      reserveLowThreshold:RESERVE_LOW_THRESHOLD,
      classify:classifyCapacityState,
      compileContractState,
      snapshot:capacitySnapshot,
      explicitQa,
      workerRows,
      runHarness:runCapacityHarness,
      load:loadCapacityAction
    })
  });

  const autoHost = document.getElementById('chat-canary-progress');
  if (autoHost) load(autoHost);
  void loadCapacityAction();
  window.setInterval(() => { void loadCapacityAction(); }, 10000);
})();
