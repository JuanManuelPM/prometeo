(() => {
  'use strict';

  const RUNTIME_URL = '../../../live/runtime.json';
  const FRONTIER_URL = '../../../live/claim-frontier.json';
  const THREAD_URL = '../../../coordination/portfolio/evidence/prometeo-autonomous-growth/CHAT_THREAD_MIRROR_CANARY_V1.json';
  const CONTRACT_URL = '../../../coordination/guide/PRIMARY_CHAT_STATE_COMMUNICATION_CONTRACT_V1.json';
  const POLL_MS = 10000;
  const LIVE_MS = 600000;
  const STALE_MS = 120000;
  const CORE_LIMIT = 6;

  const q = selector => document.querySelector(selector);
  const asDate = value => {
    const d = value ? new Date(value) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  const n = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const lastSignal = worker => worker?.close?.at || worker?.last_event_at || worker?.claim?.at || worker?.routed?.at || worker?.first_event_at || null;
  const terminal = worker => Boolean(worker && (worker.terminal === true || worker?.close?.terminal === true || String(worker.state || '').toUpperCase() === 'CLOSED'));

  async function getJson(url) {
    const response = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP_' + response.status);
    const text = await response.text();
    if (!text.trim()) throw new Error('EMPTY_BODY');
    try { return JSON.parse(text); }
    catch { throw new Error('JSON_PARSE_FAILED'); }
  }

  function rows(thread) {
    return Array.isArray(thread?.messages) ? thread.messages.filter(Boolean) : [];
  }

  function newestMessage(thread, predicate) {
    return rows(thread)
      .filter(predicate)
      .sort((a, b) => (asDate(b.published_at || b.created_at)?.getTime() || 0) - (asDate(a.published_at || a.created_at)?.getTime() || 0))[0] || null;
  }

  function latestResult(thread) {
    return newestMessage(thread, row => Boolean(row.result_ref));
  }

  function latestQa(thread) {
    return newestMessage(thread, row => Boolean(row.qa_status || row.verification_status || row.qa || row.verification));
  }

  function latestHuman(thread) {
    return newestMessage(thread, row => String(row.actor_type || '').toUpperCase() === 'HUMAN');
  }

  function hasHumanDecision(thread) {
    return rows(thread).some(row => row.archived !== true && (
      String(row.status || '').toUpperCase() === 'HUMAN_DECISION_REQUIRED' ||
      /HUMAN_DECISION_REQUIRED/.test(String(row.body_text || ''))
    ));
  }

  function pendingHumanIntent(thread) {
    return rows(thread).filter(row => row.archived !== true &&
      String(row.actor_type || '').toUpperCase() === 'HUMAN' &&
      ['QUEUED','WAITING','PENDING'].includes(String(row.status || '').toUpperCase())
    ).length;
  }

  function freshBlocked(worker, now) {
    const outcome = String(worker?.close?.outcome || worker?.close_outcome || worker?.state || '');
    if (!/CLAIM_TRANSPORT_BLOCKED/.test(outcome)) return false;
    const signal = asDate(lastSignal(worker));
    return Boolean(signal && now - signal.getTime() < LIVE_MS);
  }

  function compile({ runtime, frontier, thread, contract, runtimeError, frontierError, now = Date.now() }) {
    const frontierAt = asDate(frontier?.generated_at);
    const runtimeAt = asDate(runtime?.generated_at);
    const projectionAt = [frontierAt, runtimeAt].filter(Boolean).sort((a, b) => a - b)[0] || null;
    const candidates = Array.isArray(frontier?.candidates) ? frontier.candidates : [];
    const generic = candidates.filter(row => !Array.isArray(row?.required_capabilities) || row.required_capabilities.length === 0).length;
    const specialized = Math.max(0, candidates.length - generic);
    const batchId = runtime?.current_batch || 'POOL-PROD-01';
    const batch = Array.isArray(runtime?.batches) ? runtime.batches.find(row => row && row.batch_id === batchId) : null;
    const workers = Array.isArray(batch?.workers) ? batch.workers : [];
    const liveWorkers = workers.filter(worker => {
      if (terminal(worker)) return false;
      const signal = asDate(lastSignal(worker));
      return Boolean(signal && now - signal.getTime() < LIVE_MS);
    });
    const latestSignal = workers.map(lastSignal).map(asDate).filter(Boolean).sort((a, b) => b - a)[0] || null;
    const human = latestHuman(thread);
    const latestHumanActionAt = asDate(human?.published_at || human?.created_at);
    const claimable = n(frontier?.candidate_count ?? candidates.length);
    const core = Math.min(CORE_LIMIT, claimable);
    const gap = Math.max(0, core - liveWorkers.length);
    const reserve = Math.max(0, liveWorkers.length - core);
    const recovery = candidates.filter(row => String(row?.lane || '').toUpperCase() === 'RECOVERY').length;
    const blocked = workers.filter(worker => freshBlocked(worker, now)).length;
    const projectionAgeSeconds = projectionAt ? Math.max(0, (now - projectionAt.getTime()) / 1000) : Number.POSITIVE_INFINITY;
    const transportInvalid = Boolean(runtimeError || frontierError);
    const stale = transportInvalid || !projectionAt || projectionAgeSeconds > STALE_MS / 1000;
    const input = {
      projection_age_seconds: projectionAgeSeconds,
      last_human_action_at: latestHumanActionAt ? latestHumanActionAt.toISOString() : null,
      human_decision_required: hasHumanDecision(thread),
      claim_transport_blocked_count: blocked,
      pending_human_intent_count: pendingHumanIntent(thread),
      unconsumed_returns_count: n(runtime?.unconsumed_returns_count ?? batch?.unconsumed_returns_count),
      recovery_attention_count: n(runtime?.recovery_attention_count ?? recovery),
      live_worker_count: liveWorkers.length,
      claimable_generic_count: generic,
      claimable_specialized_count: specialized,
      core_demand: core,
      reserve_workers: reserve,
      capacity_gap: gap,
      campaign_complete: runtime?.campaign_complete === true || batch?.campaign_complete === true
    };
    const rules = [
      ['PROJECTION_STALE', stale],
      ['HUMAN_DECISION_REQUIRED', input.human_decision_required],
      ['CLAIM_TRANSPORT_DEGRADED', input.claim_transport_blocked_count > 0],
      ['HUMAN_INTENT_WAITING_NO_CAPACITY', input.pending_human_intent_count > 0 && input.live_worker_count === 0 && input.capacity_gap > 0],
      ['RETURNS_UNCONSUMED', input.unconsumed_returns_count > 0 && input.live_worker_count > 0],
      ['RECOVERY_PRESSURE', input.recovery_attention_count > 0 && input.live_worker_count > 0],
      ['REFILL_N', input.capacity_gap > 0 && claimable > 0],
      ['BUFFER_LOW', input.capacity_gap === 0 && input.reserve_workers <= 3 && input.core_demand > 0],
      ['CAPACITY_OK', input.core_demand > 0 && input.capacity_gap === 0 && input.live_worker_count > 0],
      ['WORKERS_ACTIVE_NO_ACTION', input.live_worker_count > 0],
      ['CAMPAIGN_COMPLETE', input.campaign_complete]
    ];
    const state = rules.find(([, ok]) => ok)?.[0] || 'NO_SAFE_WORK';
    const templates = contract?.templates || {};
    let action = templates[state] || 'ACCIÓN: ninguna';
    action = action.replace('{capacity_gap}', String(gap));
    if (transportInvalid) {
      const parts = [runtimeError ? 'runtime ' + runtimeError : null, frontierError ? 'frontier ' + frontierError : null].filter(Boolean);
      action = 'ACCIÓN: ninguna · proyección inválida (' + parts.join(' · ') + '); no lances capacidad a ciegas.';
    }
    const buffer = gap > 0 ? ('FALTA ' + gap) : reserve > 3 ? ('OK +' + reserve) : (core > 0 ? 'BAJO' : 'SIN DEMANDA');
    const liveness = liveWorkers.length > 0 ? 'VIVO ' + liveWorkers.length : 'SIN MOTOR VIVO';
    return {
      state,
      action,
      projectionAt,
      projectionAgeSeconds,
      batchId,
      input,
      claimable,
      liveWorkers,
      latestSignal,
      latestHumanActionAt,
      latestResult: latestResult(thread),
      latestQa: latestQa(thread),
      buffer,
      liveness,
      runtimeError,
      frontierError
    };
  }

  function styleOnce() {
    if (q('#prometeo-current-first-style-v1')) return;
    const style = document.createElement('style');
    style.id = 'prometeo-current-first-style-v1';
    style.textContent = `
      #prometeo-current-first-v1{margin:2px 2px 8px;padding:16px 14px 14px;border:1px solid #242424;border-radius:16px;background:#070707;color:#eee}
      #prometeo-current-first-v1[data-state="PROJECTION_STALE"]{border-color:#453b25}
      .pc-current-kicker{font:700 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em;color:#777}
      .pc-current-state{margin-top:8px;font-size:26px;line-height:1.02;font-weight:780;letter-spacing:-.045em;overflow-wrap:anywhere}
      .pc-current-action{margin-top:11px;font-size:15px;line-height:1.3;font-weight:720;color:#e9e9e4}
      #prometeo-current-first-v1[data-state="PROJECTION_STALE"] .pc-current-action{color:#d9b45f}
      .pc-current-meta{margin-top:9px;color:#696965;font:9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
      .pc-current-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid #1d1d1d}
      .pc-current-kpi b{display:block;font-size:15px;color:#deded9;overflow-wrap:anywhere}.pc-current-kpi span{display:block;margin-top:3px;color:#5f5f5b;font-size:8px;text-transform:uppercase;letter-spacing:.06em}
      .pc-current-human{margin-top:12px;padding-top:11px;border-top:1px solid #1d1d1d;color:#9c9c97;font-size:10px;line-height:1.45}
      .pc-current-human strong{color:#d0d0cb}
      .pc-current-result{margin-top:10px;font-size:10px;line-height:1.45;color:#8c8c87;overflow-wrap:anywhere}
      .pc-current-result strong{color:#c3c3be}.pc-current-history-label{margin:14px 2px 0;color:#4f4f4c;font:700 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em}
      @media(max-width:560px){#prometeo-current-first-v1{margin-top:0;padding:17px 14px 15px}.pc-current-state{font-size:29px}.pc-current-action{font-size:16px}.pc-current-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
    `;
    document.head.append(style);
  }

  function mount() {
    styleOnce();
    let host = q('#prometeo-current-first-v1');
    if (host) return host;
    const topbar = q('.topbar');
    if (!topbar || !topbar.parentNode) return null;
    host = document.createElement('section');
    host.id = 'prometeo-current-first-v1';
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-label', 'Estado CURRENT de Prometeo');
    topbar.insertAdjacentElement('afterend', host);
    const thread = q('#thread');
    if (thread && !q('.pc-current-history-label')) {
      thread.setAttribute('aria-label', 'Historial de conversación');
      const label = document.createElement('div');
      label.className = 'pc-current-history-label';
      label.textContent = 'HISTORIA · NO ES CURRENT';
      thread.insertAdjacentElement('beforebegin', label);
    }
    return host;
  }

  function metric(value, label) {
    const item = document.createElement('div');
    item.className = 'pc-current-kpi';
    const b = document.createElement('b');
    b.textContent = String(value);
    const s = document.createElement('span');
    s.textContent = label;
    item.append(b, s);
    return item;
  }

  function render(host, view) {
    host.replaceChildren();
    host.dataset.state = view.state;

    const kicker = document.createElement('div');
    kicker.className = 'pc-current-kicker';
    kicker.textContent = 'CURRENT · ' + view.batchId;

    const state = document.createElement('div');
    state.className = 'pc-current-state';
    state.textContent = view.state.replaceAll('_', ' ');

    const action = document.createElement('div');
    action.className = 'pc-current-action';
    action.textContent = view.action;

    const meta = document.createElement('div');
    meta.className = 'pc-current-meta';
    const stamp = view.projectionAt ? view.projectionAt.toISOString() : 'sin timestamp válido';
    const age = Number.isFinite(view.projectionAgeSeconds) ? Math.round(view.projectionAgeSeconds) + 's' : '—';
    meta.textContent = 'proyección ' + stamp + ' · edad ' + age +
      (view.latestSignal ? ' · última señal ' + view.latestSignal.toISOString() : ' · última señal —');

    const grid = document.createElement('div');
    grid.className = 'pc-current-grid';
    grid.append(
      metric(view.input.capacity_gap, 'REFILL_N'),
      metric(view.buffer, 'buffer'),
      metric(view.liveness, 'liveness'),
      metric(view.claimable, 'claimables')
    );

    const human = document.createElement('div');
    human.className = 'pc-current-human';
    const humanAt = view.latestHumanActionAt ? view.latestHumanActionAt.toISOString() : '—';
    human.innerHTML = '<strong>acción humana actual</strong> ' + escapeHtml(view.action) +
      '<br><strong>última acción humana durable</strong> ' + escapeHtml(humanAt);

    const result = document.createElement('div');
    result.className = 'pc-current-result';
    const resultText = view.latestResult?.result_ref || 'sin result_ref visible';
    const qa = view.latestQa?.qa_status || view.latestQa?.verification_status || view.latestQa?.qa || view.latestQa?.verification || 'sin señal QA durable en thread';
    result.innerHTML = '<strong>último resultado</strong> ' + escapeHtml(resultText) +
      '<br><strong>QA</strong> ' + escapeHtml(String(qa));

    host.append(kicker, state, action, meta, grid, human, result);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  async function update() {
    const host = mount();
    if (!host) return;
    const [runtimeR, frontierR, threadR, contractR] = await Promise.allSettled([
      getJson(RUNTIME_URL), getJson(FRONTIER_URL), getJson(THREAD_URL), getJson(CONTRACT_URL)
    ]);
    const runtimeError = runtimeR.status === 'rejected' ? runtimeR.reason?.message || 'LOAD_FAILED' : null;
    const frontierError = frontierR.status === 'rejected' ? frontierR.reason?.message || 'LOAD_FAILED' : null;
    const thread = threadR.status === 'fulfilled' ? threadR.value : { messages: [] };
    const contract = contractR.status === 'fulfilled' ? contractR.value : null;
    const view = compile({
      runtime: runtimeR.status === 'fulfilled' ? runtimeR.value : null,
      frontier: frontierR.status === 'fulfilled' ? frontierR.value : null,
      thread,
      contract,
      runtimeError,
      frontierError
    });
    render(host, view);
  }

  function boot() {
    void update();
    const refresh = q('#refresh');
    if (refresh) refresh.addEventListener('click', () => void update());
    window.setInterval(() => void update(), POLL_MS);
  }

  window.PROMETEO_PRIMARY_CHAT_CURRENT_FIRST_V1 = Object.freeze({ update, compile, mount });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
