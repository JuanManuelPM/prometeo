(() => {
  'use strict';

  const WORK_UNIT_ID = 'WU-CHAT-CANARY-DURABLE-MESSAGE-V1';
  const PROJECTION_URL = '../../../coordination/portfolio/derived/INTERACTIVE_WORK_UNITS_V1.json';
  const RUNTIME_URL = '../../../live/runtime.json';
  const FRONTIER_URL = '../../../live/claim-frontier.json';
  const THREAD_URL = '../../../coordination/portfolio/evidence/prometeo-autonomous-growth/CHAT_THREAD_MIRROR_CANARY_V1.json';
  const WAKE_OWNER_REF = 'coordination/jobs/derived/primary-chat-p0-platform-wake-capacity-v1/OWNER.json';
  const STALE_MS = 120000;
  const LIVE_MS = 600000;
  const RESERVE_LOW_THRESHOLD = 3;
  const CORE_LIMIT = 6;

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
    const pct = el('strong', pctValue === null ? '—' : pctValue + '%', 'progress-pct');
    const stage = el('span', wu.current_stage || 'UNKNOWN', 'progress-stage');
    summary.append(dot, pct, stage);

    const inner = el('div', null, 'progress-inner');
    const rail = el('div', null, 'progress-rail');
    const fill = el('div', null, 'progress-fill');
    fill.style.width = Math.max(0, Math.min(100, Number(wu.progress) || 0)) + '%';
    rail.append(fill);

    const steps = Array.isArray(wu.steps) ? wu.steps : [];
    const done = steps.filter(step => step && step.status === 'DONE').length;
    const counts = el('div', done + '/' + steps.length + ' · ' + (wu.status || 'UNKNOWN'), 'progress-counts');
    const list = el('div', null, 'progress-steps');
    for (const step of steps) {
      const row = el('div', null, 'progress-step');
      const state = el('span', step.status === 'DONE' ? '✓' : '·', 'progress-step-state');
      if (step.status === 'DONE') state.classList.add('done');
      row.append(state, el('span', step.name || step.step_id || 'step', 'progress-step-name'), el('span', String(step.weight || 0) + '%', 'progress-step-weight'));
      list.append(row);
    }
    inner.append(rail, counts, list);
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

  function classifyCapacityState(input) {
    const stale = Boolean(input.stale);
    const live = Math.max(0, Number(input.live || 0));
    const claimable = Math.max(0, Number(input.claimable || 0));
    const core = Math.max(0, Number(input.core || 0));
    const reserve = Math.max(0, Number(input.reserve || 0));
    const need = Math.max(0, Number(input.need || 0));
    if (stale) return 'PROJECTION_STALE';
    if (input.humanDecisionRequired) return 'HUMAN_DECISION_REQUIRED';
    if (live === 0 && claimable > 0) return 'NO_CAPACITY_WITH_CLAIMABLE_WORK';
    if (need > 0) return 'REFILL_N';
    if (claimable > 0 && reserve <= RESERVE_LOW_THRESHOLD) return 'BUFFER_LOW';
    if (live > 0) return 'WORKERS_ACTIVE_NO_ACTION';
    if (core === 0 && claimable === 0) return 'WORK_COMPLETE_OR_NO_SAFE_WORK';
    return 'WORK_COMPLETE_OR_NO_SAFE_WORK';
  }

  function scenario(name, input, expected) {
    const actual = classifyCapacityState(input);
    return Object.freeze({ name, expected, actual, pass: actual === expected });
  }

  function runCapacityHarness() {
    const cases = [
      scenario('0 workers + trabajo', {live:0,claimable:4,core:4,reserve:0,need:4}, 'NO_CAPACITY_WITH_CLAIMABLE_WORK'),
      scenario('capacidad suficiente', {live:7,claimable:3,core:3,reserve:4,need:0}, 'WORKERS_ACTIVE_NO_ACTION'),
      scenario('buffer <=3', {live:5,claimable:3,core:3,reserve:2,need:0}, 'BUFFER_LOW'),
      scenario('humano sin acción >1h con trabajo detenido', {live:0,claimable:2,core:2,reserve:0,need:2,humanAgeMs:7200000}, 'NO_CAPACITY_WITH_CLAIMABLE_WORK'),
      scenario('humano recién activo con déficit', {live:2,claimable:5,core:5,reserve:0,need:3,humanAgeMs:30000}, 'REFILL_N'),
      scenario('proyección stale', {stale:true,live:0,claimable:5,core:5,reserve:0,need:5}, 'PROJECTION_STALE'),
      scenario('human decision boundary', {humanDecisionRequired:true,live:4,claimable:2,core:2,reserve:2,need:0}, 'HUMAN_DECISION_REQUIRED'),
      scenario('campaña terminada', {live:0,claimable:0,core:0,reserve:0,need:0}, 'WORK_COMPLETE_OR_NO_SAFE_WORK')
    ];
    return Object.freeze({ total: cases.length, passed: cases.filter(row => row.pass).length, cases });
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

  function capacitySnapshot(runtime, frontier, thread, now = Date.now()) {
    const batchId = runtime?.current_batch || 'POOL-PROD-01';
    const batch = Array.isArray(runtime?.batches) ? runtime.batches.find(row => row && row.batch_id === batchId) : null;
    const workers = Array.isArray(batch?.workers) ? batch.workers : [];
    const live = workers.filter(worker => {
      if (isTerminal(worker)) return false;
      const signal = asDate(lastWorkerSignal(worker));
      return Boolean(signal && now - signal.getTime() < LIVE_MS);
    }).length;
    const claimable = Math.max(0, Number(frontier?.candidate_count || (Array.isArray(frontier?.candidates) ? frontier.candidates.length : 0)));
    const core = Math.min(CORE_LIMIT, claimable);
    const reserve = Math.max(0, live - core);
    const need = Math.max(0, core - live);
    const humanAt = latestHumanAt(thread);
    const runtimeAt = asDate(runtime?.generated_at);
    const frontierAt = asDate(frontier?.generated_at);
    const projectionAt = [runtimeAt, frontierAt].filter(Boolean).sort((a,b)=>a-b)[0] || null;
    const stale = !projectionAt || now - projectionAt.getTime() > STALE_MS;
    const humanAgeMs = humanAt ? now - humanAt.getTime() : null;
    const decision = humanDecisionRequired(thread);
    const state = classifyCapacityState({stale,live,claimable,core,reserve,need,humanDecisionRequired:decision,humanAgeMs});
    return Object.freeze({batchId,live,claimable,core,reserve,need,humanAt:humanAt?.toISOString() || null,humanAgeMs,projectionAt:projectionAt?.toISOString() || null,stale,humanDecisionRequired:decision,state});
  }

  function ageLabel(ms) {
    if (ms === null || ms === undefined || !Number.isFinite(ms)) return 'sin acción humana durable';
    const min = Math.max(0, Math.round(ms / 60000));
    if (min < 60) return 'acción humana hace ' + min + 'm';
    return 'acción humana hace ' + Math.round(min / 60) + 'h';
  }

  function actionText(snapshot) {
    const n = snapshot.need;
    const prefix = snapshot.humanAgeMs !== null && snapshot.humanAgeMs > 3600000 ? 'Volviste. ' : '';
    switch (snapshot.state) {
      case 'PROJECTION_STALE': return 'ACCIÓN: ninguna automática · proyección atrasada; refrescar owners antes de pedir capacidad.';
      case 'HUMAN_DECISION_REQUIRED': return 'ACCIÓN: decisión humana requerida · no rellenar capacidad hasta resolver el boundary.';
      case 'NO_CAPACITY_WITH_CLAIMABLE_WORK': return prefix + 'ACCIÓN: REFILL ' + Math.max(1,n || snapshot.core) + ' · hay trabajo reclamable y 0 workers vivos.';
      case 'REFILL_N': return prefix + 'ACCIÓN: REFILL ' + n + ' · déficit exacto de shells contra demanda core.';
      case 'BUFFER_LOW': return 'ACCIÓN: ninguna inmediata · buffer bajo (' + snapshot.reserve + '); reserva <= ' + RESERVE_LOW_THRESHOLD + '.';
      case 'WORKERS_ACTIVE_NO_ACTION': return 'ACCIÓN: ninguna · ' + snapshot.live + ' worker(s) vivos cubren la demanda observable.';
      default: return 'ACCIÓN: ninguna · trabajo completo o sin trabajo seguro reclamable.';
    }
  }

  function ensureCapacityHost() {
    let host = document.querySelector('[data-primary-chat-capacity-action-v1]');
    if (host) return host;
    const thread = document.getElementById('thread');
    if (!thread || !thread.parentNode) return null;
    host = el('section');
    host.setAttribute('data-primary-chat-capacity-action-v1','');
    host.style.cssText = 'margin:8px 2px 2px;padding:10px 0;border-top:1px solid #202020;border-bottom:1px solid #202020;color:#bdbdb8;font:11px/1.45 ui-sans-serif,system-ui;';
    thread.parentNode.insertBefore(host, thread);
    return host;
  }

  function renderCapacity(host, snapshot, harness) {
    host.replaceChildren();
    host.dataset.state = snapshot.state;
    host.dataset.harness = harness.passed + '/' + harness.total;
    const title = el('div', snapshot.state);
    title.style.cssText = 'font-weight:700;color:#d7d7d2;letter-spacing:.02em;';
    const metrics = el('div', 'Core ' + snapshot.core + ' · Live ' + snapshot.live + ' · Reserve ' + snapshot.reserve + ' · Need ' + snapshot.need + ' · Claimable ' + snapshot.claimable);
    metrics.style.cssText = 'margin-top:3px;color:#777;font-size:10px;';
    const human = el('div', ageLabel(snapshot.humanAgeMs) + ' · última señal durable ' + (snapshot.projectionAt ? new Date(snapshot.projectionAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}) : 'desconocida'));
    human.style.cssText = 'margin-top:3px;color:#666;font-size:9px;';
    const action = el('div', actionText(snapshot));
    action.style.cssText = 'margin-top:6px;color:' + (/REFILL|requerida|atrasada|buffer bajo/i.test(action.textContent) ? '#d9b45f' : '#82d69a') + ';font-weight:650;';
    host.append(title, metrics, human, action);
    host.title = 'Owner: ' + WAKE_OWNER_REF + ' · harness ' + harness.passed + '/' + harness.total;
  }

  async function loadCapacityAction() {
    const host = ensureCapacityHost();
    if (!host) return {ok:false,reason:'CAPACITY_HOST_MISSING'};
    const harness = runCapacityHarness();
    try {
      const [runtime, frontier, thread] = await Promise.all([getJson(RUNTIME_URL), getJson(FRONTIER_URL), getJson(THREAD_URL)]);
      const snapshot = capacitySnapshot(runtime, frontier, thread);
      renderCapacity(host, snapshot, harness);
      return {ok:true,snapshot,harness};
    } catch (error) {
      renderCapacity(host, Object.freeze({state:'PROJECTION_STALE',live:0,claimable:0,core:0,reserve:0,need:0,humanAgeMs:null,projectionAt:null,stale:true}), harness);
      host.title = 'PROJECTION_STALE · ' + (error?.message || 'UNKNOWN') + ' · harness ' + harness.passed + '/' + harness.total;
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
      wakeOwnerRef:WAKE_OWNER_REF,
      reserveLowThreshold:RESERVE_LOW_THRESHOLD,
      classify:classifyCapacityState,
      snapshot:capacitySnapshot,
      runHarness:runCapacityHarness,
      load:loadCapacityAction
    })
  });

  const autoHost = document.getElementById('chat-canary-progress');
  if (autoHost) load(autoHost);
  void loadCapacityAction();
  window.setInterval(() => { void loadCapacityAction(); }, 10000);
})();
