(function installPrometeoChatCanaryInputV1(global) {
  'use strict';

  const SCHEMA = 'prometeo.chat-canary-input/v1';
  const KIND = 'CHAT_CANARY_HUMAN_MESSAGE_V1';
  const MAX_TEXT = 65536;
  const CLIENT_SUBMIT_TIMEOUT_MS = 32000;
  const FLIGHT_KEY = 'prometeo.control.flight.v1';
  const FLIGHT_MAX = 1000;
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

  function recoverPendingRequestId() {
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
      root.setAttribute('data-transport-ready', ready ? 'true' : 'false');
      submit.disabled = !ready;
      submit.setAttribute('aria-disabled', ready ? 'false' : 'true');
      submit.title = ready ? 'Enviar' : 'No enviado: falta bridge privado autenticado';
      if (!ready) {
        setStatus(status, 'SOLO BORRADOR · NO ENVIADO · falta bridge privado autenticado');
      } else if (status.textContent.includes('SOLO BORRADOR') || status.textContent.includes('BOUNDARY_AUTH_REQUIRED')) {
        setStatus(status, '');
      }
      return ready;
    }

    recordFlight('COMPOSER_MOUNT', { request_id: pendingRequestId });
    syncAvailability();
    if (pendingRequestId && transportReady(options.ingress || null)) {
      setStatus(status, 'RECOVERY READY · ' + pendingRequestId + ' · el próximo RESPONDER reutiliza este request');
    }
    availabilityTimer = global.setInterval ? global.setInterval(syncAvailability, 5000) : null;
    input.addEventListener('focus', syncAvailability);

    async function send() {
      if (destroyed) throw new Error('CHAT_CANARY_COMPOSER_DESTROYED');
      const preserved = input.value;
      if (!preserved.trim()) {
        const blocked = frozenResult('BOUNDARY_INVALID_INPUT', false, null, 'EMPTY_TEXT', false);
        setStatus(status, blocked);
        return blocked;
      }
      if (!syncAvailability()) {
        const blocked = frozenResult('BOUNDARY_AUTH_REQUIRED', false, null, 'AUTH_BRIDGE_REQUIRED', false);
        if (typeof options.onResult === 'function') options.onResult(blocked);
        return blocked;
      }

      if (!pendingRequestId) pendingRequestId = newRequestId();
      const requestId = pendingRequestId;
      const startedAt = Date.now();
      recordFlight('RESPONDER_CLICK', { request_id: requestId, text_length: preserved.length });
      recordFlight('SUBMIT_STARTED', { request_id: requestId, stage: 'CLIENT' });

      submit.disabled = true;
      recheck.hidden = true;
      setStatus(status, 'SUBMITTING · ' + requestId + ' · esperando confirmación durable…');

      let result;
      let timeoutTimer = null;
      const textForSubmit = (options.includeNotesInSubmit === false ? '' : noteContext()) + preserved;
      try {
        const submitPromise = typeof options.submitter === 'function'
          ? options.submitter({
              text: textForSubmit,
              inputApi: api,
              page: options.page || DEFAULT_PAGE,
              request_id: requestId
            })
          : submitText({
              text: textForSubmit,
              ingress: options.ingress || null,
              page: options.page || DEFAULT_PAGE,
              kind: options.kind || KIND,
              request_id: requestId
            });

        const clientTimeout = new Promise(resolve => {
          timeoutTimer = global.setTimeout ? global.setTimeout(() => resolve(
            frozenResult(
              'BOUNDARY_CLIENT_TIMEOUT',
              false,
              null,
              'CLIENT_SUBMIT_TIMEOUT',
              false,
              null,
              { request_id: requestId, stage: 'CLIENT', ambiguous: true }
            )
          ), CLIENT_SUBMIT_TIMEOUT_MS) : null;
        });

        result = await Promise.race([Promise.resolve(submitPromise), clientTimeout]);
      } catch (error) {
        result = frozenResult(
          'BOUNDARY_CLIENT_EXCEPTION',
          false,
          null,
          clean(error && (error.code || error.name || error.message), 240) || 'CLIENT_EXCEPTION',
          false,
          null,
          { request_id: requestId, stage: 'CLIENT', ambiguous: true }
        );
      } finally {
        if (timeoutTimer && global.clearTimeout) global.clearTimeout(timeoutTimer);
        syncAvailability();
      }

      recordFlight('SUBMIT_RESULT', {
        request_id: requestId,
        stage: result && result.stage,
        status: result && result.status,
        elapsed_ms: Date.now() - startedAt
      });

      if (result && result.request_id) pendingRequestId = result.request_id;

      if (result && result.ambiguous === true && pendingRequestId) {
        const ingressApi = options.ingress || global.PROMETEO_INGRESS_V1;
        if (ingressApi && typeof ingressApi.requestStatus === 'function') {
          recordFlight('STATUS_AUTO_CHECK_START', { request_id: pendingRequestId });
          try {
            const recovered = await ingressApi.requestStatus({
              request_id: pendingRequestId,
              page: options.page || DEFAULT_PAGE
            });
            recordFlight('STATUS_AUTO_CHECK_RESULT', {
              request_id: pendingRequestId,
              status: recovered && recovered.status
            });
            if (recovered && recovered.queued === true && recovered.ref) result = recovered;
          } catch (error) {
            recordFlight('STATUS_AUTO_CHECK_ERROR', {
              request_id: pendingRequestId,
              status: clean(error && (error.code || error.name || error.message), 120)
            });
          }
        }
      }

      if (result && result.queued === true && validDurableRef(result.ref)) {
        input.value = '';
        recordFlight('QUEUED_CONFIRMED', { request_id: pendingRequestId || requestId, status: result.status });
        pendingRequestId = null;
        if (options.includeNotesInSubmit !== false) writeNotes([]);
      } else {
        input.value = preserved;
        recheck.hidden = !(result && result.ambiguous === true && pendingRequestId);
      }
      setStatus(status, result);
      if (typeof options.onResult === 'function') options.onResult(result);
      return result;
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
      const ingressApi = options.ingress || global.PROMETEO_INGRESS_V1;
      if (!pendingRequestId || !ingressApi || typeof ingressApi.requestStatus !== 'function') return;
      recheck.disabled = true;
      setStatus(status, 'COMPROBANDO · ' + pendingRequestId);
      recordFlight('STATUS_CHECK_START', { request_id: pendingRequestId });
      const out = await ingressApi.requestStatus({ request_id:pendingRequestId, page:options.page || DEFAULT_PAGE });
      recordFlight('STATUS_CHECK_RESULT', { request_id: pendingRequestId, status: out && out.status });
      recheck.disabled = false;
      if (out && out.queued === true && out.ref) {
        const correlationApi = await ensurePrivateCorrelationApi();
        const corr = correlationApi ? correlationApi.fromIngressResult(out) : null;
        if (corr) try { correlationApi.save(corr); } catch {}
        input.value = '';
        pendingRequestId = null;
        recheck.hidden = true;
        if (options.includeNotesInSubmit !== false) writeNotes([]);
        setStatus(status, 'QUEUED · confirmado después del timeout');
        if (typeof options.onResult === 'function') options.onResult(out);
        return;
      }
      recheck.hidden = false;
      setStatus(status, (out?.status || 'UNKNOWN') + ' · ' + (out?.request_state || 'sin confirmación') + ' · ' + pendingRequestId);
      if (typeof options.onResult === 'function') options.onResult(out);
    });

    const onSubmit = event => {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      void send();
    };
    form.addEventListener('submit', onSubmit);

    return Object.freeze({
      schema: SCHEMA,
      elements: Object.freeze({ root, form, input, note, submit, recheck, status }),
      submit: send,
      destroy() {
        destroyed = true;
        form.removeEventListener('submit', onSubmit);
        input.removeEventListener('focus', syncAvailability);
        if (availabilityTimer && global.clearInterval) global.clearInterval(availabilityTimer);
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
    mount,
    privacy: Object.freeze({
      raw_text_public: false,
      credentials_public: false,
      embedded_repository_token: false
    })
  });

  global.PROMETEO_CHAT_CANARY_INPUT_V1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);

(function loadPrometeoCurrentFirstProjectionV1(global) {
  'use strict';
  const doc = global && global.document;
  if (!doc || global.PROMETEO_PRIMARY_CHAT_CURRENT_FIRST_V1) return;
  const selector = 'script[data-prometeo-current-first-loader-v1]';
  if (doc.querySelector(selector)) return;
  const script = doc.createElement('script');
  script.src = './current-first-v1.js';
  script.async = false;
  script.setAttribute('data-prometeo-current-first-loader-v1', '');
  doc.head.append(script);
})(typeof globalThis !== 'undefined' ? globalThis : window);
