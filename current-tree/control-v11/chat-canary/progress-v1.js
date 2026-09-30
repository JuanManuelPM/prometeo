(() => {
  'use strict';

  const WORK_UNIT_ID = 'WU-CHAT-CANARY-DURABLE-MESSAGE-V1';
  const PROJECTION_URL = '../../../coordination/portfolio/derived/INTERACTIVE_WORK_UNITS_V1.json';

  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  function traffic(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'COMPLETED') return { label: 'VERDE', glyph: '●', tone: '#91c99b' };
    if (value === 'FAILED') return { label: 'ROJO', glyph: '●', tone: '#d98282' };
    return { label: 'ÁMBAR', glyph: '●', tone: '#d0ae6b' };
  }

  function render(host, wu) {
    host.replaceChildren();
    host.setAttribute('data-work-unit-id', WORK_UNIT_ID);
    host.setAttribute('data-progress-source', 'INTERACTIVE_WORK_UNITS_V1');

    const wrap = node('section', null, 'chat-canary-progress-v1');
    Object.assign(wrap.style, {
      borderTop: '1px solid #292f36',
      marginTop: '16px',
      paddingTop: '14px',
      fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'
    });

    const top = node('div');
    Object.assign(top.style, {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) auto',
      gap: '12px',
      alignItems: 'end'
    });

    const titleBox = node('div');
    const eyebrow = node('div', 'WORK UNIT · DURABLE', null);
    Object.assign(eyebrow.style, {
      color: '#747e89',
      fontSize: '8px',
      letterSpacing: '.1em'
    });
    const stage = node('div', wu.current_stage || 'UNKNOWN');
    Object.assign(stage.style, {
      marginTop: '4px',
      fontSize: '12px',
      fontWeight: '800',
      overflowWrap: 'anywhere'
    });
    titleBox.append(eyebrow, stage);

    const pct = node('strong', Number.isFinite(Number(wu.progress)) ? Math.round(Number(wu.progress)) + '%' : '—');
    Object.assign(pct.style, { fontSize: '25px', lineHeight: '1' });
    top.append(titleBox, pct);

    const rail = node('div');
    Object.assign(rail.style, {
      height: '7px',
      border: '1px solid #343b43',
      borderRadius: '999px',
      marginTop: '10px',
      overflow: 'hidden',
      background: '#0d0f12'
    });
    const fill = node('div');
    const progress = Math.max(0, Math.min(100, Number(wu.progress) || 0));
    Object.assign(fill.style, {
      width: progress + '%',
      height: '100%',
      background: '#d8d8d2'
    });
    rail.append(fill);

    const steps = Array.isArray(wu.steps) ? wu.steps : [];
    const done = steps.filter(step => step && step.status === 'DONE').length;
    const light = traffic(wu.status);
    const summary = node('div');
    Object.assign(summary.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      marginTop: '9px',
      color: '#858e99',
      fontSize: '8px'
    });
    const lightEl = node('span', light.glyph + ' ' + light.label);
    lightEl.style.color = light.tone;
    summary.append(
      lightEl,
      node('span', done + '/' + steps.length + ' pasos DONE'),
      node('span', 'último progreso: ' + (wu.last_progress_at || 'desconocido'))
    );

    const list = node('div');
    Object.assign(list.style, { display: 'grid', gap: '5px', marginTop: '11px' });
    for (const step of steps) {
      const row = node('div');
      Object.assign(row.style, {
        display: 'grid',
        gridTemplateColumns: '54px minmax(0,1fr) auto',
        gap: '8px',
        alignItems: 'baseline',
        borderTop: '1px solid #20252b',
        paddingTop: '6px',
        fontSize: '8px'
      });
      const state = node('span', step.status || 'UNKNOWN');
      state.style.color = step.status === 'DONE' ? '#91c99b' : '#8b949f';
      row.append(
        state,
        node('span', step.name || step.step_id || 'step'),
        node('span', String(step.weight || 0) + '%')
      );
      list.append(row);
    }

    const boundary = node('div', 'Fuente: INTERACTIVE_WORK_UNITS_V1 · observabilidad, no autoridad/liveness.');
    Object.assign(boundary.style, {
      marginTop: '10px',
      color: '#606a74',
      fontSize: '7px',
      lineHeight: '1.5'
    });

    wrap.append(top, rail, summary, list, boundary);
    host.append(wrap);
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
      return { ok: true, work_unit_id: WORK_UNIT_ID, progress: wu.progress, current_stage: wu.current_stage };
    } catch (error) {
      host.replaceChildren(node('div', 'Progreso durable no disponible: ' + (error?.message || 'UNKNOWN')));
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
