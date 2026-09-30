(() => {
  'use strict';

  const WORK_UNIT_ID = 'WU-CHAT-CANARY-DURABLE-MESSAGE-V1';
  const PROJECTION_URL = '../../../coordination/portfolio/derived/INTERACTIVE_WORK_UNITS_V1.json';

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
      row.append(
        state,
        el('span', step.name || step.step_id || 'step', 'progress-step-name'),
        el('span', String(step.weight || 0) + '%', 'progress-step-weight')
      );
      list.append(row);
    }

    inner.append(rail, counts, list);
    details.append(summary, inner);
    host.append(details);
  }

  async function load(hostOrSelector) {
    const host = typeof hostOrSelector === 'string'
      ? document.querySelector(hostOrSelector)
      : hostOrSelector;
    if (!host) return { ok: false, reason: 'HOST_MISSING' };

    try {
      const response = await fetch(PROJECTION_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const projection = await response.json();
      const wu = Array.isArray(projection.work_units)
        ? projection.work_units.find(row => row && row.work_unit_id === WORK_UNIT_ID)
        : null;
      if (!wu) throw new Error('WORK_UNIT_MISSING');
      render(host, wu);
      return {
        ok: true,
        work_unit_id: WORK_UNIT_ID,
        progress: wu.progress,
        current_stage: wu.current_stage,
        status: wu.status
      };
    } catch (error) {
      host.replaceChildren(el('span', 'progreso no disponible', 'progress-error'));
      return { ok: false, reason: error?.message || 'UNKNOWN' };
    }
  }

  window.PrometeoChatCanaryProgress = Object.freeze({
    workUnitId: WORK_UNIT_ID,
    projectionUrl: PROJECTION_URL,
    load
  });

  const autoHost = document.getElementById('chat-canary-progress');
  if (autoHost) load(autoHost);
})();
