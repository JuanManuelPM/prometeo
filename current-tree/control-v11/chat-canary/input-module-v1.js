(function installPrometeoChatCanaryInputV1(global) {
  'use strict';

  const SCHEMA = 'prometeo.chat-canary-input/v1';
  const KIND = 'CHAT_CANARY_HUMAN_MESSAGE_V1';
  const MAX_TEXT = 65536;
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

  function validDurableRef(ref) {
    const value = clean(ref, 4096);
    if (!value) return false;
    return (
      /^coordination\//.test(value) ||
      /^https:\/\/github\.com\/JuanManuelPM\/prometeo\//.test(value) ||
      /^https:\/\/api\.github\.com\/repos\/JuanManuelPM\/prometeo\//.test(value)
    );
  }

  function frozenResult(status, queued, ref = null, error = null, clearInput = false) {
    return Object.freeze({
      status,
      queued: queued === true,
      ref,
      error,
      clear_input: clearInput === true
    });
  }

  function activeIngress(explicitIngress) {
    const ingress = explicitIngress || global.PROMETEO_INGRESS_V1;
    return ingress && typeof ingress.submit === 'function' ? ingress : null;
  }

  function transportReady(explicitIngress = null) {
    if (explicitIngress && typeof explicitIngress.submit === 'function') return true;
    const transport = global.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1;
    return Boolean(transport && typeof transport.submit === 'function');
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

  async function submitText({ text, ingress = null, page = DEFAULT_PAGE, kind = KIND } = {}) {
    const raw = text === undefined || text === null ? '' : String(text);
    if (!raw.trim()) {
      return frozenResult('BOUNDARY_INVALID_INPUT', false, null, 'EMPTY_TEXT', false);
    }
    if (raw.length > MAX_TEXT) {
      return frozenResult('BOUNDARY_INVALID_INPUT', false, null, 'TEXT_TOO_LARGE', false);
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
      result = await api.submit(Object.freeze({ text: raw, kind, page }));
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
      if (!validDurableRef(ref)) {
        return frozenResult('BOUNDARY_TRANSPORT_INVALID', false, null, 'DURABLE_REF_REQUIRED', false);
      }
      return frozenResult(status === 'BOUNDARY_TRANSPORT_INVALID' ? 'QUEUED' : status, true, ref, error, true);
    }

    return frozenResult(status, false, validDurableRef(ref) ? ref : null, error, false);
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

    const submit = doc.createElement('button');
    submit.setAttribute('data-prometeo-chat-composer-submit-v1', '');
    submit.type = 'submit';
    submit.textContent = options.submitLabel || 'ENVIAR';

    const status = doc.createElement('div');
    status.setAttribute('data-prometeo-chat-composer-status-v1', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    setStatus(status, '');

    form.append(input, submit);
    root.replaceChildren(form, status);

    let destroyed = false;
    let availabilityTimer = null;

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

    syncAvailability();
    availabilityTimer = global.setInterval ? global.setInterval(syncAvailability, 5000) : null;
    input.addEventListener('focus', syncAvailability);

    async function send() {
      if (destroyed) throw new Error('CHAT_CANARY_COMPOSER_DESTROYED');
      const preserved = input.value;
      if (!syncAvailability()) {
        const blocked = frozenResult('BOUNDARY_AUTH_REQUIRED', false, null, 'AUTH_BRIDGE_REQUIRED', false);
        if (typeof options.onResult === 'function') options.onResult(blocked);
        return blocked;
      }
      submit.disabled = true;
      setStatus(status, 'SUBMITTING · esperando confirmación durable…');
      let result;
      try {
        result = await submitText({
          text: preserved,
          ingress: options.ingress || null,
          page: options.page || DEFAULT_PAGE,
          kind: options.kind || KIND
        });
      } finally {
        syncAvailability();
      }
      if (result.clear_input === true && result.queued === true && validDurableRef(result.ref)) {
        input.value = '';
      } else {
        input.value = preserved;
      }
      setStatus(status, result);
      if (typeof options.onResult === 'function') options.onResult(result);
      return result;
    }

    const onSubmit = event => {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      void send();
    };
    form.addEventListener('submit', onSubmit);

    return Object.freeze({
      schema: SCHEMA,
      elements: Object.freeze({ root, form, input, submit, status }),
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
