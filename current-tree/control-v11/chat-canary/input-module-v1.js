(function installPrometeoChatCanaryInputV1(global) {
  'use strict';

  const SCHEMA = 'prometeo.chat-canary-input/v1';
  const KIND = 'CHAT_CANARY_HUMAN_MESSAGE_V1';
  const MAX_TEXT = 65536;
  const CLIENT_SUBMIT_TIMEOUT_MS = 32000;
  const FLIGHT_KEY = 'prometeo.control.flight.v1';
  const FLIGHT_MAX = 1000;
  const OUTBOX_KEY = 'prometeo.primary-chat.outbox.v1';
  const OUTBOX_MAX = 10;
  const OUTBOX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const BREAKER_KEY = 'prometeo.primary-chat.storage-breaker.v1';
  const BREAKER_COOLDOWN_MS = 5 * 60 * 1000;
  const OUTBOX_RETRY_INTERVAL_MS = 60 * 1000;
  const PRIVATE_CORRELATION_SCHEMA = 'prometeo.primary-chat-private-correlation/v1';
  const WORKSPACE_SECRET_KEYS = Object.freeze([
    'prometeo.capture.workspace.secret.v2',
    'prometeo.capture.workspace.secret.v1'
  ]);
  const DEFAULT_PAGE = Object.freeze({
    id: 'chat-canary',
    page_id: 'control-v11-chat-canary',
    title: 'Prometeo · Chat canary',
    surface_id: 'current-tree-control-v11-chat-canary',
    project_id: 'prometeo-autonomous-growth',
    target_path: 'current-tree/control-v11/chat-canary/'
  });
  const DOM_CONTRACT = Object.freeze({
    root: '[data-prometeo-chat-composer-v1]',
    form: 'form[data-prometeo-chat-composer-form-v1]',
    input: 'textarea[data-prometeo-chat-composer-input-v1]',
    submit: 'button[data-prometeo-chat-composer-submit-v1]',
    status: '[data-prometeo-chat-composer-status-v1]'
  });
  const BOOTSTRAP_PUBLICATION = Object.freeze({
    schema: 'prometeo.primary-chat-bootstrap-publication/v1',
    publication_id: 'PRIMARY-CHAT-EMERGENCY-INGRESS-BOOTSTRAP-20261001T0235Z',
    privacy: 'PUBLIC_SANITIZED_CANARY',
    status: 'HUMAN_DECISION_REQUIRED',
    human_summary: 'Autorización extraordinaria de una sola vez para restaurar el ingreso privado/autenticado de Primary Chat reutilizando CURRENT, Work Graph, /wc y el pipeline existentes; sin publicar texto privado ni credenciales y sin crear scheduler, queue, CURRENT, provider, worker family o persistence authority paralelos.',
    result_summary: 'S04 quedó READY y enlazada. El browser ingress ya valida durable ref y falla cerrado. No existe un backend HTTPS autenticado reutilizable: worker-lab y capture-lab están servidos como superficies estáticas, y el connector Vercel disponible no expone deployment write operativo ni configuración de secrets. Un transport real necesita una credencial GitHub de escritura almacenada sólo server-side antes de poder devolver queued=true.',
    human_action: 'En Vercel, completá el setup serverless de worker-lab y guardá una credencial GitHub restringida a JuanManuelPM/prometeo con Contents: Read and write como environment secret server-side. No pegues la credencial en ChatGPT ni en el repo.',
    evidence_ref: 'coordination/chat-sessions/CHAT-PROMETEO-MAXCAP-20261001T022700Z-S04/JOURNAL.json#J002'
  });

  function clean(value, max = 4096) {
    if (value === undefined || value === null) return null;
    const out = String(value).trim();
    return out ? out.slice(0, max) : null;
  }

  function newRequestId() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') {
        return 'primary-chat-' + global.crypto.randomUUID();
      }
    } catch {}
    return 'primary-chat-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function recordFlight(event, detail = {}) {
    const row = Object.freeze({
      at: new Date().toISOString(),
      surface: 'primary-chat',
      widget: 'chat',
      event: clean(event, 80) || 'UNKNOWN',
      request_id: clean(detail.request_id, 160),
      stage: clean(detail.stage, 40),
      status: clean(detail.status, 120),
      text_length: Number.isFinite(detail.text_length) ? detail.text_length : null,
      elapsed_ms: Number.isFinite(detail.elapsed_ms) ? detail.elapsed_ms : null
    });
    try {
      const parsed = JSON.parse(global.localStorage?.getItem(FLIGHT_KEY) || '[]');
      const rows = Array.isArray(parsed) ? parsed.slice(-(FLIGHT_MAX - 1)) : [];
      rows.push(row);
      global.localStorage?.setItem(FLIGHT_KEY, JSON.stringify(rows));
    } catch {}
    return row;
  }

  function readFlight() {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem(FLIGHT_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(-FLIGHT_MAX) : [];
    } catch {
      return [];
    }
  }

  function readOutbox() {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem(OUTBOX_KEY) || '[]');
      const now = Date.now();
      return (Array.isArray(parsed) ? parsed : []).filter(row => {
        if (!row || typeof row.request_id !== 'string' || typeof row.text !== 'string') return false;
        const at = Date.parse(String(row.created_at || ''));
        return Number.isFinite(at) && now - at <= OUTBOX_MAX_AGE_MS;
      }).slice(-OUTBOX_MAX);
    } catch {
      return [];
    }
  }

  function writeOutbox(rows) {
    try {
      global.localStorage?.setItem(OUTBOX_KEY, JSON.stringify(rows.slice(-OUTBOX_MAX)));
      return true;
    } catch {
      return false;
    }
  }

  function saveOutbox(entry) {
    const rows = readOutbox().filter(row => row.request_id !== entry.request_id);
    rows.push(entry);
    return writeOutbox(rows) ? entry : null;
  }

  function removeOutbox(requestId) {
    const rows = readOutbox();
    const next = rows.filter(row => row.request_id !== requestId);
    return writeOutbox(next);
  }

  function readBreaker() {
    try {
      const value = JSON.parse(global.localStorage?.getItem(BREAKER_KEY) || 'null');
      if (!value || !Number.isFinite(Number(value.open_until))) return null;
      if (Date.now() >= Number(value.open_until)) {
        global.localStorage?.removeItem(BREAKER_KEY);
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }

  function openBreaker(reason, requestId = null) {
    const value = {
      opened_at: new Date().toISOString(),
      open_until: Date.now() + BREAKER_COOLDOWN_MS,
      reason: clean(reason, 180) || 'STORAGE_DEGRADED',
      request_id: clean(requestId, 160)
    };
    try { global.localStorage?.setItem(BREAKER_KEY, JSON.stringify(value)); } catch {}
    recordFlight('STORAGE_BREAKER_OPEN', { request_id: requestId, status: value.reason });
    return value;
  }

  function closeBreaker() {
    try { global.localStorage?.removeItem(BREAKER_KEY); } catch {}
  }

  function isStorageBoundary(result) {
    const status = clean(result && result.status, 120) || '';
    const stage = clean(result && result.stage, 40) || '';
    const error = clean(result && result.error, 180) || '';
    return status === 'BOUNDARY_PRIVATE_STORAGE_UNAVAILABLE'
      || status === 'BOUNDARY_CAPTURE_TIMEOUT'
      || (stage === 'CAPTURE' && /REQUEST_TIMEOUT|INTERNAL_ERROR|STORAGE/i.test(error));
  }

  function recoverPendingRequestId() {
    const pending = readOutbox();
    if (pending.length) return pending[pending.length - 1].request_id;
    const rows = readFlight();
    const now = Date.now();
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];
      if (!row || row.event !== 'RESPONDER_CLICK' || !row.request_id) continue;
      const at = Date.parse(String(row.at || ''));
      if (!Number.isFinite(at) || now - at > 2 * 60 * 60 * 1000) return null;
      const resolved = rows.slice(i + 1).some(next =>
        next && next.request_id === row.request_id && next.event === 'QUEUED_CONFIRMED'
      );
      return resolved ? null : row.request_id;
    }
    return null;
  }

  function validDurableRef(ref) {
    const value = clean(ref, 4096);
    if (!value) return false;
    return (
      /^coordination\//.test(value) ||
      /^https:\/\/github\.com\/JuanManuelPM\/prometeo\//.test(value) ||
      /^https:\/\/api\.github\.com\/repos\/JuanManuelPM\/prometeo\//.test(value)
    );
  }

  let privateCorrelationLoadPromise = null;

  function privateCorrelationApi() {
    const api = global.PROMETEO_PRIMARY_CHAT_PRIVATE_CORRELATION_V1;
    return api && api.schema === PRIVATE_CORRELATION_SCHEMA && typeof api.normalize === 'function' && typeof api.fromIngressResult === 'function' && typeof api.save === 'function' && typeof api.load === 'function' ? api : null;
  }

  function privateCorrelationScriptUrl() {
    try {
      const doc = global.document;
      const current = doc && doc.currentScript && doc.currentScript.src;
      if (current) return new URL('./private-correlation-v1.js', current).href;
    } catch {}
    return './private-correlation-v1.js';
  }

  function ensurePrivateCorrelationApi() {
    const ready = privateCorrelationApi();
    if (ready) return Promise.resolve(ready);
    if (privateCorrelationLoadPromise) return privateCorrelationLoadPromise;
    const doc = global.document;
    if (!doc || typeof doc.createElement !== 'function') return Promise.resolve(null);
    privateCorrelationLoadPromise = new Promise(resolve => {
      const selector = 'script[data-prometeo-primary-chat-private-correlation-v1]';
      let script = typeof doc.querySelector === 'function' ? doc.querySelector(selector) : null;
      const finish = () => resolve(privateCorrelationApi());
      if (!script) {
        script = doc.createElement('script');
        script.setAttribute('data-prometeo-primary-chat-private-correlation-v1', '');
        script.src = privateCorrelationScriptUrl();
        script.async = false;
        script.addEventListener('load', finish, { once: true });
        script.addEventListener('error', () => resolve(null), { once: true });
        const parent = doc.head || doc.documentElement || doc.body;
        if (!parent || typeof parent.appendChild !== 'function') return resolve(null);
        parent.appendChild(script);
      } else if (privateCorrelationApi()) {
        finish();
      } else {
        script.addEventListener('load', finish, { once: true });
        script.addEventListener('error', () => resolve(null), { once: true });
      }
    });
    return privateCorrelationLoadPromise;
  }

  function normalizeCorrelation(value) {
    const api = privateCorrelationApi();
    return api ? api.normalize(value) : null;
  }

  function readRetainedCorrelation() {
    const api = privateCorrelationApi();
    return api ? api.load() : null;
  }

  function retainCorrelation(value) {
    const api = privateCorrelationApi();
    if (!api) return null;
    try { return api.save(value); } catch { return null; }
  }

  function clearRetainedCorrelation() {
    const api = privateCorrelationApi();
    if (api) api.clear();
  }

  function frozenResult(status, queued, ref = null, error = null, clearInput = false, correlation = null, meta = null) {
    return Object.freeze({
      status,
      queued: queued === true,
      ref,
      error,
      clear_input: clearInput === true,
      correlation: normalizeCorrelation(correlation),
      ...(meta && typeof meta === 'object' ? meta : {})
    });
  }

  function activeIngress(explicitIngress) {
    const ingress = explicitIngress || global.PROMETEO_INGRESS_V1;
    return ingress && typeof ingress.submit === 'function' ? ingress : null;
  }

  function workspaceLinked() {
    for (const key of WORKSPACE_SECRET_KEYS) {
      try {
        const value = global.localStorage && global.localStorage.getItem(key);
        if (value && value.length >= 32) return true;
      } catch {}
    }
    return false;
  }

  function transportReady(explicitIngress = null) {
    const transport = global.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1;
    const hasTransport = explicitIngress && explicitIngress === transport
      ? typeof explicitIngress.submit === 'function'
      : Boolean(transport && typeof transport.submit === 'function');
    return hasTransport && workspaceLinked();
  }

  function publishBootstrapRecord(root, doc) {
    if (!root || !root.parentNode || !doc) return null;
    const selector = '[data-prometeo-emergency-bootstrap-publication-v1]';
    const existing = doc.querySelector(selector);
    if (existing) return existing;

    const section = doc.createElement('section');
    section.setAttribute('data-prometeo-emergency-bootstrap-publication-v1', '');
    section.setAttribute('data-status', BOOTSTRAP_PUBLICATION.status);
    section.style.border = '1px solid currentColor';
    section.style.padding = '12px';
    section.style.margin = '12px 0';

    const title = doc.createElement('strong');
    title.textContent = 'BOOTSTRAP TEMPORAL · ' + BOOTSTRAP_PUBLICATION.status;

    const human = doc.createElement('p');
    human.textContent = 'HUMANO · PUBLIC_SANITIZED_CANARY: ' + BOOTSTRAP_PUBLICATION.human_summary;

    const result = doc.createElement('p');
    result.textContent = 'PROMETEO: ' + BOOTSTRAP_PUBLICATION.result_summary;

    const action = doc.createElement('p');
    action.textContent = 'ÚNICA ACCIÓN: ' + BOOTSTRAP_PUBLICATION.human_action;

    const evidence = doc.createElement('code');
    evidence.textContent = BOOTSTRAP_PUBLICATION.evidence_ref;

    section.append(title, human, result, action, evidence);
    root.parentNode.insertBefore(section, root);
    return section;
  }

  async function submitText({ text, ingress = null, page = DEFAULT_PAGE, kind = KIND, request_id = null } = {}) {
    const raw = text === undefined || text === null ? '' : String(text);
    if (!raw.trim()) {
      return frozenResult('BOUNDARY_INVALID_INPUT', false, null, 'EMPTY_TEXT', false);
    }
    if (raw.length > MAX_TEXT) {
      return frozenResult('BOUNDARY_INVALID_INPUT', false, null, 'TEXT_TOO_LARGE', false);
    }

    const correlationApi = await ensurePrivateCorrelationApi();
    if (!correlationApi) {
      return frozenResult('BOUNDARY_TRANSPORT_INVALID', false, null, 'PRIVATE_CORRELATION_HELPER_REQUIRED', false);
    }

    const api = activeIngress(ingress);
    if (!api) {
      return frozenResult('BOUNDARY_AUTH_REQUIRED', false, null, 'INGRESS_API_REQUIRED', false);
    }
    if (!transportReady(ingress)) {
      return frozenResult('BOUNDARY_AUTH_REQUIRED', false, null, 'AUTH_BRIDGE_REQUIRED', false);
    }

    let result;
    try {
      result = await api.submit(Object.freeze({ text: raw, kind, page, ...(request_id ? { request_id } : {}) }));
    } catch (error) {
      const code = clean(error && (error.code || error.name || error.message), 240) || 'TRANSPORT_ERROR';
      return frozenResult('BOUNDARY_TRANSPORT_FAILED', false, null, code, false);
    }

    if (!result || typeof result !== 'object') {
      return frozenResult('BOUNDARY_TRANSPORT_INVALID', false, null, 'TRANSPORT_RESULT_INVALID', false);
    }

    const status = clean(result.status, 120) || 'BOUNDARY_TRANSPORT_INVALID';
    const ref = clean(result.ref, 4096);
    const error = clean(result.error, 240);

    if (result.queued === true) {
      const correlation = correlationApi.fromIngressResult(result);
      if (!correlation || ref !== correlation.return_path) {
        return frozenResult('BOUNDARY_TRANSPORT_INVALID', false, null, 'PRIVATE_CORRELATION_INVALID', false);
      }
      let retained;
      try { retained = correlationApi.save(correlation); }
      catch (correlationError) {
        return frozenResult('BOUNDARY_TRANSPORT_INVALID', false, null, clean(correlationError && correlationError.message, 120) || 'PRIVATE_CORRELATION_SAVE_FAILED', false);
      }
      return frozenResult(status === 'BOUNDARY_TRANSPORT_INVALID' ? 'QUEUED' : status, true, retained.return_path, error, true, retained, { request_id: clean(result.request_id,160) || request_id || null, ambiguous:false });
    }

    return frozenResult(status, false, validDurableRef(ref) ? ref : null, error, false, null, { request_id: clean(result.request_id,160) || request_id || null, stage: clean(result.stage,40), ambiguous: result.ambiguous === true });
  }

  function setStatus(element, resultOrLabel) {
    if (!element) return;
    if (typeof resultOrLabel === 'string') {
      element.textContent = resultOrLabel;
      return;
    }
    const result = resultOrLabel || {};
    const bits = [result.status || 'BOUNDARY'];
    if (result.error) bits.push(result.error);
    if (result.queued === true && result.ref) bits.push(result.ref);
    element.textContent = bits.join(' · ');
  }

  function mount(root, options = {}) {
    if (!root || typeof root.append !== 'function') {
      throw new Error('CHAT_CANARY_COMPOSER_ROOT_REQUIRED');
    }
    const doc = root.ownerDocument || global.document;
    if (!doc || typeof doc.createElement !== 'function') {
      throw new Error('CHAT_CANARY_DOCUMENT_REQUIRED');
    }

    publishBootstrapRecord(root, doc);
    root.setAttribute('data-prometeo-chat-composer-v1', '');

    const form = doc.createElement('form');
    form.setAttribute('data-prometeo-chat-composer-form-v1', '');
    form.noValidate = true;

    const input = doc.createElement('textarea');
    input.setAttribute('data-prometeo-chat-composer-input-v1', '');
    input.name = 'message';
    input.rows = Number.isFinite(options.rows) ? options.rows : 3;
    input.maxLength = MAX_TEXT;
    input.autocomplete = 'off';
    input.placeholder = options.placeholder || 'Escribí un mensaje…';

    const note = doc.createElement('button');
    note.setAttribute('data-prometeo-chat-composer-note-v1', '');
    note.type = 'button';
    note.textContent = options.noteLabel || 'NOTA';

    const submit = doc.createElement('button');
    submit.setAttribute('data-prometeo-chat-composer-submit-v1', '');
    submit.type = 'submit';
    submit.textContent = options.submitLabel || 'RESPONDER';

    const recheck = doc.createElement('button');
    recheck.setAttribute('data-prometeo-chat-composer-recheck-v1', '');
    recheck.type = 'button';
    recheck.textContent = 'COMPROBAR';
    recheck.hidden = true;

    const status = doc.createElement('div');
    status.setAttribute('data-prometeo-chat-composer-status-v1', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    setStatus(status, '');

    form.append(input, note, submit, recheck);
    root.replaceChildren(form, status);

    let destroyed = false;
    let availabilityTimer = null;
    let outboxRetryTimer = null;
    let flushingOutbox = false;
    let pendingRequestId = recoverPendingRequestId();
    const notesKey = options.notesKey || 'prometeo.primary-chat.notes.v1';

    function readNotes() {
      try { const v = JSON.parse(global.localStorage?.getItem(notesKey) || '[]'); return Array.isArray(v) ? v.filter(x=>x&&typeof x.text==='string').slice(-50) : []; } catch { return []; }
    }
    function writeNotes(rows) { try { global.localStorage?.setItem(notesKey, JSON.stringify(rows.slice(-50))); } catch {} }
    function noteContext() { const rows=readNotes(); return rows.length ? 'NOTAS PRIVADAS:\n' + rows.map(x=>'• '+x.text).join('\n') + '\n\nMENSAJE:\n' : ''; }


    function syncAvailability() {
      if (destroyed) return false;
      const ready = transportReady(options.ingress || null);
      const pending = readOutbox();
      const breaker = readBreaker();
      root.setAttribute('data-transport-ready', ready ? 'true' : 'false');
      root.setAttribute('data-local-outbox-pending', String(pending.length));
      root.setAttribute('data-storage-breaker-open', breaker ? 'true' : 'false');
      submit.disabled = false;
      submit.setAttribute('aria-disabled', 'false');
      submit.title = ready && !breaker
        ? 'Guardar localmente y enviar'
        : 'Guardar localmente; el envío remoto seguirá cuando vuelva el transporte';
      if (pending.length && breaker) {
        const latest = pending[pending.length - 1];
        setStatus(status, 'LOCAL_DURABLE · STORAGE_DEGRADED · ' + latest.request_id + ' · reintento remoto suspendido');
      } else if (pending.length && !ready) {
        const latest = pending[pending.length - 1];
        setStatus(status, 'LOCAL_DURABLE · ' + latest.request_id + ' · esperando transporte remoto');
      } else if (!pending.length && !ready) {
        setStatus(status, 'LOCAL READY · el próximo RESPONDER se guarda primero en este navegador');
      } else if (status.textContent.includes('SOLO BORRADOR') || status.textContent.includes('BOUNDARY_AUTH_REQUIRED')) {
        setStatus(status, '');
      }
      return ready;
    }

    recordFlight('COMPOSER_MOUNT', { request_id: pendingRequestId });
    syncAvailability();
    if (readOutbox().length) {
      const latest = readOutbox().slice(-1)[0];
      setStatus(status, 'LOCAL_DURABLE · ' + latest.request_id + ' · recuperación automática pendiente');
    }
    availabilityTimer = global.setInterval ? global.setInterval(syncAvailability, 5000) : null;
    input.addEventListener('focus', syncAvailability);

    async function remoteSubmitEntry(entry) {
      const submitter = typeof options.submitter === 'function'
        ? options.submitter
        : payload => submitText({
            text: payload.text,
            ingress: options.ingress || null,
            page: payload.page || options.page || DEFAULT_PAGE,
            kind: options.kind || KIND,
            request_id: payload.request_id
          });
      return await submitter({
        text: entry.text,
        inputApi: api,
        page: options.page || DEFAULT_PAGE,
        request_id: entry.request_id
      });
    }

    async function flushPendingOutbox({ interactive = false } = {}) {
      if (destroyed || flushingOutbox) return null;
      const pending = readOutbox();
      if (!pending.length) {
        closeBreaker();
        syncAvailability();
        return null;
      }
      if (!transportReady(options.ingress || null) || readBreaker()) {
        syncAvailability();
        return null;
      }

      flushingOutbox = true;
      let last = null;
      try {
        const entry = pending[0];
        recordFlight('OUTBOX_FLUSH_START', { request_id: entry.request_id, stage: 'REMOTE' });
        try {
          last = await remoteSubmitEntry(entry);
        } catch (error) {
          last = frozenResult(
            'BOUNDARY_CLIENT_EXCEPTION',
            false,
            null,
            clean(error && (error.code || error.name || error.message), 240) || 'CLIENT_EXCEPTION',
            false,
            null,
            { request_id: entry.request_id, stage: 'CLIENT', ambiguous: true }
          );
        }
        recordFlight('OUTBOX_FLUSH_RESULT', {
          request_id: entry.request_id,
          stage: last && last.stage,
          status: last && last.status
        });

        if (last && last.queued === true && validDurableRef(last.ref)) {
          removeOutbox(entry.request_id);
          closeBreaker();
          recordFlight('QUEUED_CONFIRMED', { request_id: entry.request_id, status: last.status });
          const remaining = readOutbox();
          pendingRequestId = remaining.length ? remaining[remaining.length - 1].request_id : null;
          setStatus(status, remaining.length
            ? 'QUEUED · ' + entry.request_id + ' · quedan ' + remaining.length + ' local(es)'
            : 'QUEUED · ' + entry.request_id);
          if (typeof options.onResult === 'function') options.onResult(last);
          return last;
        }

        if (isStorageBoundary(last)) {
          openBreaker((last && (last.status || last.error)) || 'STORAGE_DEGRADED', entry.request_id);
          setStatus(status, 'LOCAL_DURABLE · STORAGE_DEGRADED · ' + entry.request_id + ' · sin acción humana');
          if (typeof options.onResult === 'function') options.onResult(Object.freeze({
            ...last,
            status: 'LOCAL_DURABLE_STORAGE_DEGRADED',
            remote_status: last && last.status,
            request_id: entry.request_id,
            local_durable: true
          }));
          return last;
        }

        setStatus(status, 'LOCAL_DURABLE · REMOTE_PENDING · ' + entry.request_id);
        if (interactive && typeof options.onResult === 'function') {
          options.onResult(Object.freeze({
            ...(last || {}),
            status: 'LOCAL_DURABLE_REMOTE_PENDING',
            remote_status: last && last.status,
            request_id: entry.request_id,
            local_durable: true
          }));
        }
        return last;
      } finally {
        flushingOutbox = false;
        syncAvailability();
      }
    }

    async function send() {
      if (destroyed) throw new Error('CHAT_CANARY_COMPOSER_DESTROYED');
      const preserved = input.value;
      if (!preserved.trim()) {
        const blocked = frozenResult('BOUNDARY_INVALID_INPUT', false, null, 'EMPTY_TEXT', false);
        setStatus(status, blocked);
        return blocked;
      }

      const requestId = newRequestId();
      pendingRequestId = requestId;
      const createdAt = new Date().toISOString();
      const textForSubmit = (options.includeNotesInSubmit === false ? '' : noteContext()) + preserved;
      const localEntry = Object.freeze({
        schema: 'prometeo.primary-chat-local-outbox/v1',
        request_id: requestId,
        created_at: createdAt,
        text: textForSubmit,
        page_id: clean((options.page || DEFAULT_PAGE).page_id || (options.page || DEFAULT_PAGE).id, 160),
        kind: options.kind || KIND
      });

      if (!saveOutbox(localEntry)) {
        const blocked = frozenResult(
          'BOUNDARY_LOCAL_OUTBOX_UNAVAILABLE',
          false,
          null,
          'LOCAL_STORAGE_WRITE_FAILED',
          false,
          null,
          { request_id: requestId, stage: 'LOCAL' }
        );
        setStatus(status, blocked);
        recordFlight('LOCAL_OUTBOX_FAILED', { request_id: requestId, status: blocked.status });
        if (typeof options.onResult === 'function') options.onResult(blocked);
        return blocked;
      }

      recordFlight('RESPONDER_CLICK', { request_id: requestId, text_length: preserved.length });
      recordFlight('LOCAL_OUTBOX_SAVED', { request_id: requestId, stage: 'LOCAL', status: 'LOCAL_DURABLE' });

      input.value = '';
      if (options.includeNotesInSubmit !== false) writeNotes([]);
      try { input.dispatchEvent(new Event('input', { bubbles:true })); } catch {}
      setStatus(status, 'LOCAL_DURABLE · ' + requestId + ' · intentando entrega remota…');

      if (!transportReady(options.ingress || null)) {
        const localOnly = frozenResult(
          'LOCAL_DURABLE',
          false,
          null,
          'REMOTE_TRANSPORT_UNAVAILABLE',
          true,
          null,
          { request_id: requestId, stage: 'LOCAL', local_durable: true }
        );
        setStatus(status, 'LOCAL_DURABLE · ' + requestId + ' · esperando transporte remoto');
        if (typeof options.onResult === 'function') options.onResult(localOnly);
        return localOnly;
      }

      if (readBreaker()) {
        const deferred = frozenResult(
          'LOCAL_DURABLE_STORAGE_DEGRADED',
          false,
          null,
          'STORAGE_BREAKER_OPEN',
          true,
          null,
          { request_id: requestId, stage: 'LOCAL', local_durable: true }
        );
        setStatus(status, 'LOCAL_DURABLE · STORAGE_DEGRADED · ' + requestId + ' · sin acción humana');
        if (typeof options.onResult === 'function') options.onResult(deferred);
        return deferred;
      }

      const result = await flushPendingOutbox({ interactive: true });
      return result || frozenResult(
        'LOCAL_DURABLE_REMOTE_PENDING',
        false,
        null,
        'REMOTE_PENDING',
        true,
        null,
        { request_id: requestId, stage: 'LOCAL', local_durable: true }
      );
    }

    note.addEventListener('click', () => {
      const value = input.value.trim();
      if (!value) return;
      const rows = readNotes();
      rows.push({ at: new Date().toISOString(), text: value });
      writeNotes(rows);
      input.value = '';
      try { input.dispatchEvent(new Event('input', { bubbles:true })); } catch {}
      setStatus(status, 'NOTA LOCAL · guardada · no creó trabajo');
      recordFlight('NOTE_SAVED', { text_length: value.length });
      if (typeof options.onNote === 'function') options.onNote(Object.freeze({ at:new Date().toISOString(), text:value, count:rows.length }));
    });

    recheck.addEventListener('click', async () => {
      recheck.disabled = true;
      closeBreaker();
      await flushPendingOutbox({ interactive: true });
      recheck.disabled = false;
      recheck.hidden = readOutbox().length === 0;
    });

    const onSubmit = event => {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      void send();
    };
    form.addEventListener('submit', onSubmit);
    outboxRetryTimer = global.setInterval
      ? global.setInterval(() => { void flushPendingOutbox({ interactive: false }); }, OUTBOX_RETRY_INTERVAL_MS)
      : null;
    if (readOutbox().length) {
      global.setTimeout?.(() => { void flushPendingOutbox({ interactive: false }); }, 1500);
    }

    return Object.freeze({
      schema: SCHEMA,
      elements: Object.freeze({ root, form, input, note, submit, recheck, status }),
      submit: send,
      destroy() {
        destroyed = true;
        form.removeEventListener('submit', onSubmit);
        input.removeEventListener('focus', syncAvailability);
        if (availabilityTimer && global.clearInterval) global.clearInterval(availabilityTimer);
        if (outboxRetryTimer && global.clearInterval) global.clearInterval(outboxRetryTimer);
      }
    });
  }

  const api = Object.freeze({
    schema: SCHEMA,
    ingress_schema: 'prometeo.browser-ingress/v1',
    expected_transport_global: 'PROMETEO_GITHUB_INGRESS_TRANSPORT_V1',
    kind: KIND,
    max_text: MAX_TEXT,
    dom_contract: DOM_CONTRACT,
    default_page: DEFAULT_PAGE,
    bootstrap_publication: BOOTSTRAP_PUBLICATION,
    validDurableRef,
    correlation_schema: PRIVATE_CORRELATION_SCHEMA,
    ensurePrivateCorrelationApi,
    normalizeCorrelation,
    getRetainedCorrelation: readRetainedCorrelation,
    retainCorrelation,
    clearRetainedCorrelation,
    workspaceLinked,
    transportReady,
    submitText,
    outbox: Object.freeze({
      key: OUTBOX_KEY,
      read: readOutbox,
      remove: removeOutbox,
      breaker: readBreaker
    }),
    mount,
    privacy: Object.freeze({
      raw_text_public: false,
      credentials_public: false,
      embedded_repository_token: false
    })
  });

  global.PROMETEO_CHAT_CANARY_INPUT_V1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
