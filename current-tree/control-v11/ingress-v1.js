(function installPrometeoIngressV1(global) {
  'use strict';

  const SCHEMA = 'prometeo.browser-ingress/v1';
  const REQUEST_SCHEMA = 'prometeo.browser-ingress-request/v1';
  const RESULT_SCHEMA = 'prometeo.ingress-transport-result/v1';
  const APPROVAL_SCHEMA = 'prometeo.primary-chat-approval/v1';
  const APPROVED_PLAN_KIND = 'PRIMARY_CHAT_APPROVED_PLAN_V1';
  const APPROVAL_CACHE_PREFIX = 'prometeo.primary-chat.approval.v1:';
  const MAX_TEXT = 65536;
  const REQUEST_TIMEOUT_MS = 7000;
  const CAPTURE_ENDPOINT = 'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-capture';
  const CHANGE_LOOP_ENDPOINT = 'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-change-loop-v1';
  const WAKE_ENDPOINT = 'https://worker-lab.vercel.app/api/prometeo-ingress';
  const WORKSPACE_SECRET_KEYS = Object.freeze([
    'prometeo.capture.workspace.secret.v2',
    'prometeo.capture.workspace.secret.v1'
  ]);
  const SAFE_PAGE_KEYS = Object.freeze([
    'id','page_id','title','href','public_url','surface_id','project_id',
    'authority_status','target_path','source_identity','served_identity'
  ]);

  let activeSubmitPromise = null;
  let activeSubmitKey = null;

  function result(status, ref = null, queued = false, error = null) {
    return Object.freeze({ status, ref, queued, error });
  }

  function cleanString(value, max = 512) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    if (!text) return null;
    return text.slice(0, max);
  }

  function publicPage(page) {
    if (!page || typeof page !== 'object' || Array.isArray(page)) return Object.freeze({});
    const out = {};
    for (const key of SAFE_PAGE_KEYS) {
      const value = cleanString(page[key], key === 'href' || key === 'public_url' ? 2048 : 512);
      if (value !== null) out[key] = value;
    }
    return Object.freeze(out);
  }

  function requestId() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    } catch {}
    return 'ing-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
  }

  function workspaceSecret() {
    for (const key of WORKSPACE_SECRET_KEYS) {
      try {
        const value = global.localStorage && global.localStorage.getItem(key);
        if (value && value.length >= 32) return value;
      } catch {}
    }
    return '';
  }

  function isExplicitCanary(text) {
    return /^CANARY:\s*/i.test(String(text || '').trim());
  }

  function safeApprovalId(value, max = 120) {
    const text = cleanString(value, max);
    return text && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text) ? text : null;
  }

  function normalizeApproval(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return Object.freeze({ ok: false, status: 'BOUNDARY_APPROVAL_REQUIRED', error: 'APPROVAL_REQUIRED', approval: null });
    }
    const decision = String(value.decision || '').trim().toUpperCase();
    if (decision !== 'APPROVED') {
      return Object.freeze({
        ok: false,
        status: decision === 'REJECTED' ? 'BOUNDARY_APPROVAL_REJECTED' : 'BOUNDARY_APPROVAL_REQUIRED',
        error: decision === 'REJECTED' ? 'APPROVAL_REJECTED' : 'APPROVAL_NOT_EXPLICIT',
        approval: null
      });
    }
    const approvalId = safeApprovalId(value.approval_id);
    const proposalId = safeApprovalId(value.proposal_id);
    const proposalDigest = cleanString(value.proposal_digest, 64);
    const approvedAtMs = Date.parse(String(value.approved_at || ''));
    if (!approvalId || !proposalId || !proposalDigest || !/^[a-f0-9]{64}$/i.test(proposalDigest) || !Number.isFinite(approvedAtMs)) {
      return Object.freeze({ ok: false, status: 'BOUNDARY_APPROVAL_INVALID', error: 'APPROVAL_ENVELOPE_INVALID', approval: null });
    }
    return Object.freeze({
      ok: true,
      status: 'APPROVED',
      error: null,
      approval: Object.freeze({
        schema: APPROVAL_SCHEMA,
        decision: 'APPROVED',
        approval_id: approvalId,
        proposal_id: proposalId,
        proposal_digest: proposalDigest.toLowerCase(),
        approved_at: new Date(approvedAtMs).toISOString()
      })
    });
  }

  function approvalAnchor(approval) {
    return approval ? 'primary-chat-approval:' + approval.approval_id + ':' + approval.proposal_digest : null;
  }

  function approvalCacheKey(approval) {
    return APPROVAL_CACHE_PREFIX + approval.approval_id;
  }

  function removeObsoleteBootstrap() {
    if (!global.document) return;
    const remove = () => {
      global.document.querySelectorAll('[data-prometeo-emergency-bootstrap-publication-v1]').forEach(node => node.remove());
    };
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', remove, { once: true });
    else global.setTimeout(remove, 0);
  }

  function clearComposerImmediately() {
    if (!global.document) return;
    const input = global.document.querySelector('[data-prometeo-chat-composer-input-v1]');
    if (!input || typeof input.value !== 'string') return;
    input.value = '';
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
  }

  function optimisticStart(text, localId) {
    if (!global.document) return null;
    const thread = global.document.getElementById('thread');
    if (!thread) return null;
    const article = global.document.createElement('article');
    article.className = 'msg human';
    article.setAttribute('data-local-ingress-id', localId);
    article.setAttribute('data-local-ingress-state', 'sending');

    const main = global.document.createElement('div');
    main.className = 'msg-main';
    const meta = global.document.createElement('div');
    meta.className = 'meta';
    const actor = global.document.createElement('span');
    actor.className = 'actor';
    actor.textContent = 'vos';
    const state = global.document.createElement('span');
    state.setAttribute('data-local-ingress-state-label', '');
    state.textContent = 'enviando…';
    meta.append(actor, state);
    const body = global.document.createElement('div');
    body.className = 'body';
    body.textContent = text;
    main.append(meta, body);
    article.append(main);
    thread.append(article);
    try { article.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch {}
    return article;
  }

  function optimisticFinish(article, transportResult) {
    if (!article) return;
    const label = article.querySelector('[data-local-ingress-state-label]');
    const queued = Boolean(transportResult && transportResult.queued === true);
    article.setAttribute('data-local-ingress-state', queued ? 'queued' : 'failed');
    if (label) label.textContent = queued ? 'enviado' : 'no enviado';
  }

  async function postJson(url, body, secret = '', timeoutMs = REQUEST_TIMEOUT_MS) {
    const headers = { 'Content-Type': 'application/json' };
    if (secret) headers.Authorization = 'Bearer ' + secret;
    const controller = typeof global.AbortController === 'function' ? new global.AbortController() : null;
    const timer = controller && global.setTimeout ? global.setTimeout(() => controller.abort(), timeoutMs) : null;
    let response;
    try {
      response = await global.fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        headers,
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined
      });
    } catch (error) {
      const out = new Error(error && error.name === 'AbortError' ? 'REQUEST_TIMEOUT' : (error && error.message) || 'FETCH_FAILED');
      out.code = error && error.name === 'AbortError' ? 'REQUEST_TIMEOUT' : cleanString(error && (error.code || error.name), 120) || 'FETCH_FAILED';
      throw out;
    } finally {
      if (timer && global.clearTimeout) global.clearTimeout(timer);
    }
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(cleanString(data && (data.error || data.message), 240) || ('HTTP_' + response.status));
      error.code = cleanString(data && data.error, 120) || ('HTTP_' + response.status);
      throw error;
    }
    return data || {};
  }

  async function publicCanaryFallback(envelope, text) {
    return await postJson(WAKE_ENDPOINT, {
      schema: 'prometeo.primary-chat-public-canary-submit/v1',
      public_canary: true,
      public_envelope: envelope,
      private_payload: { text }
    }, '', 7000);
  }

  function captureIdFor(requestIdValue) {
    const safe = String(requestIdValue || '').replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 120);
    return 'primary-chat-' + (safe || Date.now().toString(36));
  }

  function installDefaultTransport() {
    const existing = global.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1;
    if (existing && typeof existing.submit === 'function') return existing;
    if (typeof global.fetch !== 'function') return null;

    const transport = Object.freeze({
      schema: 'prometeo.page-change-github-wake-transport/v4',
      mode: 'PRIVATE_BY_DEFAULT_EXPLICIT_CANARY_PUBLIC_FALLBACK',
      endpoint: WAKE_ENDPOINT,
      async submit(payload = {}) {
        const envelope = payload.public_envelope;
        const privatePayload = payload.private_payload;
        const text = privatePayload && typeof privatePayload.text === 'string' ? privatePayload.text.trim() : '';
        const page = envelope && envelope.page && typeof envelope.page === 'object' ? envelope.page : {};
        const pageId = cleanString(page.page_id || page.id, 160);
        const canary = isExplicitCanary(text);
        const approvalState = envelope && envelope.kind === APPROVED_PLAN_KIND ? normalizeApproval(envelope.approval) : null;
        const approval = approvalState && approvalState.ok ? approvalState.approval : null;
        if (!envelope || envelope.schema !== REQUEST_SCHEMA || !text || !pageId) {
          return Object.freeze({ schema: RESULT_SCHEMA, status: 'BOUNDARY_INVALID_INPUT', ref: null, queued: false, error: 'TRANSPORT_INPUT_INVALID' });
        }
        if (envelope.kind === APPROVED_PLAN_KIND && !approval) {
          return Object.freeze({ schema: RESULT_SCHEMA, status: approvalState.status, ref: null, queued: false, error: approvalState.error });
        }

        if (canary) {
          try { return Object.freeze(await publicCanaryFallback(envelope, text)); }
          catch (error) {
            return Object.freeze({
              schema: RESULT_SCHEMA,
              status: 'BOUNDARY_TRANSPORT_FAILED',
              ref: null,
              queued: false,
              error: cleanString(error && (error.code || error.message), 180) || 'CANARY_FALLBACK_FAILED'
            });
          }
        }

        const secret = workspaceSecret();
        if (!secret) {
          return Object.freeze({ schema: RESULT_SCHEMA, status: 'BOUNDARY_AUTH_REQUIRED', ref: null, queued: false, error: 'WORKSPACE_NOT_LINKED' });
        }

        try {
          const createdMs = Number.isFinite(Date.parse(envelope.created_at)) ? Date.parse(envelope.created_at) : Date.now();
          const captureId = captureIdFor(envelope.request_id);
          await postJson(CAPTURE_ENDPOINT, {
            action: 'sync_capture',
            capture: {
              id: captureId,
              page_id: pageId,
              created: createdMs,
              transcript: text,
              transcript_revision: 1,
              status: 'pending',
              source_path: cleanString(page.target_path, 320),
              source_href: cleanString(page.href || page.public_url || (global.location && global.location.href), 2048),
              source_title: cleanString(page.title, 300) || 'Prometeo · Primary Chat',
              metadata: {
                source_kind: approval ? 'HUMAN_PRIMARY_CHAT_APPROVED_PLAN' : 'HUMAN_PRIMARY_CHAT',
                source_surface: 'PRIMARY_CHAT',
                request_id: cleanString(envelope.request_id, 160),
                chat_object_id: 'chat-object-prometeo-chat-control-main',
                ...(approval ? {
                  approval_id: approval.approval_id,
                  proposal_id: approval.proposal_id,
                  proposal_digest: approval.proposal_digest,
                  approved_at: approval.approved_at
                } : {})
              },
              page: {
                source_repo: 'JuanManuelPM/prometeo',
                source_entrypoint: cleanString(page.target_path, 320),
                public_url: cleanString(page.href || page.public_url || (global.location && global.location.href), 2048)
              }
            }
          }, secret);

          const prepared = await postJson(CHANGE_LOOP_ENDPOINT, {
            action: 'prepare_execution',
            page_id: pageId,
            page_title: cleanString(page.title, 300) || 'Prometeo · Primary Chat',
            source_href: cleanString(page.href || page.public_url || (global.location && global.location.href), 2048),
            served_identity: cleanString(page.served_identity, 160),
            baseline: {},
            semantic_context: {
              surface_id: cleanString(page.surface_id, 120) || 'current-tree-control-v11-chat-canary',
              project_id: cleanString(page.project_id, 120) || 'prometeo-autonomous-growth',
              target_path: cleanString(page.target_path, 300) || 'current-tree/control-v11/chat-canary/',
              ...(approval ? { semantic_anchor: approvalAnchor(approval) } : {})
            },
            ...(approval ? { approval } : {}),
            delivery_mode: 'WORKER_POOL',
            intent: 'WORK_PAGE',
            human_approved: approval ? true : envelope.kind !== APPROVED_PLAN_KIND
          }, secret);

          const workItemId = cleanString(prepared.work_item_id, 160);
          const returnPath = cleanString(prepared.return_path, 360);
          if (!prepared.queued_to_worker_pool || !workItemId || !returnPath) {
            throw Object.assign(new Error('PAGE_CHANGE_PREPARE_INVALID'), { code: 'PAGE_CHANGE_PREPARE_INVALID' });
          }

          const wake = await postJson(WAKE_ENDPOINT, {
            schema: 'prometeo.primary-chat-page-change-wake/v1',
            work_item_id: workItemId,
            page_id: pageId,
            return_path: returnPath,
            ...(approval ? {
              approval: {
                schema: APPROVAL_SCHEMA,
                approval_id: approval.approval_id,
                proposal_id: approval.proposal_id,
                proposal_digest: approval.proposal_digest
              }
            } : {})
          });
          if (!wake || wake.schema !== RESULT_SCHEMA || wake.queued !== true) {
            throw Object.assign(new Error(cleanString(wake && wake.error, 160) || 'WAKE_NOT_QUEUED'), { code: 'WAKE_NOT_QUEUED' });
          }
          return Object.freeze(wake);
        } catch (error) {
          return Object.freeze({
            schema: RESULT_SCHEMA,
            status: 'BOUNDARY_PRIVATE_STORAGE_UNAVAILABLE',
            ref: null,
            queued: false,
            error: cleanString(error && (error.code || error.message || error.name), 180) || 'PRIVATE_TRANSPORT_FAILED'
          });
        }
      }
    });
    global.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = transport;
    return transport;
  }

  removeObsoleteBootstrap();
  installDefaultTransport();

  function activeTransport() {
    const t = global.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 || installDefaultTransport();
    return t && typeof t.submit === 'function' ? t : null;
  }

  function validDurableRef(ref) {
    const value = cleanString(ref, 4096);
    if (!value) return false;
    return (
      /^coordination\//.test(value) ||
      /^https:\/\/github\.com\/JuanManuelPM\/prometeo\//.test(value) ||
      /^https:\/\/api\.github\.com\/repos\/JuanManuelPM\/prometeo\//.test(value)
    );
  }

  function readApprovalReceipt(approval) {
    try {
      const raw = global.localStorage && global.localStorage.getItem(approvalCacheKey(approval));
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || cached.approval_id !== approval.approval_id) return null;
      if (cached.proposal_digest !== approval.proposal_digest) {
        return result('BOUNDARY_APPROVAL_REPLAY_CONFLICT', null, false, 'APPROVAL_ID_REUSED_FOR_DIFFERENT_PROPOSAL');
      }
      if (cached.queued === true && validDurableRef(cached.ref)) return result('QUEUED_REPLAY', cached.ref, true, null);
    } catch {}
    return null;
  }

  function writeApprovalReceipt(approval, normalized) {
    if (!approval || !normalized || normalized.queued !== true || !validDurableRef(normalized.ref)) return;
    try {
      if (!global.localStorage) return;
      global.localStorage.setItem(approvalCacheKey(approval), JSON.stringify({
        schema: 'prometeo.primary-chat-approval-receipt-index/v1',
        approval_id: approval.approval_id,
        proposal_id: approval.proposal_id,
        proposal_digest: approval.proposal_digest,
        ref: normalized.ref,
        queued: true,
        cached_at: new Date().toISOString(),
        authority: 'INDEX_ONLY_DURABLE_AUTHORITY_REMAINS_CURRENT'
      }));
    } catch {}
  }

  function submitInternal(input = {}, approval = null) {
    const text = cleanString(input.text, MAX_TEXT);
    const kind = approval ? APPROVED_PLAN_KIND : (cleanString(input.kind, 64) || 'work');
    if (!text) return Promise.resolve(result('BOUNDARY_INVALID_INPUT', null, false, 'EMPTY_TEXT'));
    if (String(input.text).length > MAX_TEXT) return Promise.resolve(result('BOUNDARY_INVALID_INPUT', null, false, 'TEXT_TOO_LARGE'));

    const submitKey = approval ? 'approval:' + approval.approval_id + ':' + approval.proposal_digest : 'text:' + text;
    if (activeSubmitPromise) {
      if (activeSubmitKey === submitKey) return activeSubmitPromise;
      return Promise.resolve(result('BOUNDARY_SUBMIT_IN_FLIGHT', null, false, 'WAIT_FOR_CURRENT_SUBMIT'));
    }

    const transport = activeTransport();
    if (!transport) return Promise.resolve(result('BOUNDARY_AUTH_REQUIRED', null, false, 'INGRESS_TRANSPORT_UNAVAILABLE'));

    const requestIdValue = approval ? 'approval-' + approval.approval_id : requestId();
    const explicitCanary = isExplicitCanary(text);
    const public_envelope = Object.freeze({
      schema: REQUEST_SCHEMA,
      request_id: requestIdValue,
      created_at: approval ? approval.approved_at : new Date().toISOString(),
      kind,
      page: publicPage(input.page),
      ...(approval ? { approval } : {}),
      privacy: Object.freeze({
        raw_text_public: false,
        credentials_public: false,
        public_payload_class: explicitCanary ? 'EXPLICIT_PUBLIC_CANARY_FALLBACK_AUTHORIZED' : 'SANITIZED_METADATA_ONLY',
        explicit_public_canary_fallback_allowed: explicitCanary,
        explicit_public_canary_may_publish_raw_text: explicitCanary
      })
    });
    const private_payload = Object.freeze({ text });
    const optimistic = optimisticStart(text, requestIdValue);
    clearComposerImmediately();

    activeSubmitKey = submitKey;
    const run = (async () => {
      let transportResult;
      try {
        transportResult = await transport.submit(Object.freeze({ public_envelope, private_payload }));
      } catch (error) {
        transportResult = result('BOUNDARY_TRANSPORT_FAILED', null, false, cleanString(error && (error.code || error.name), 120) || 'TRANSPORT_ERROR');
      }

      let normalized;
      if (!transportResult || typeof transportResult !== 'object') {
        normalized = result('BOUNDARY_TRANSPORT_INVALID', null, false, 'TRANSPORT_RESULT_INVALID');
      } else {
        const status = cleanString(transportResult.status, 120) || 'UNKNOWN';
        const ref = cleanString(transportResult.ref, 4096);
        const queued = transportResult.queued === true;
        const error = cleanString(transportResult.error, 240);
        if (queued && (!validDurableRef(ref) || transportResult.schema !== RESULT_SCHEMA)) {
          normalized = result('BOUNDARY_TRANSPORT_INVALID', null, false, 'TRANSPORT_RESULT_INVALID');
        } else if (!queued) {
          normalized = result(status, ref && validDurableRef(ref) ? ref : null, false, error);
        } else {
          normalized = result(status || 'QUEUED', ref, true, error);
        }
      }

      if (approval) writeApprovalReceipt(approval, normalized);
      optimisticFinish(optimistic, normalized);
      return normalized;
    })();

    activeSubmitPromise = run.finally(() => {
      activeSubmitPromise = null;
      activeSubmitKey = null;
    });
    return activeSubmitPromise;
  }

  function submit(input = {}) {
    return submitInternal(input, null);
  }

  function submitApprovedPlan(input = {}) {
    const state = normalizeApproval(input.approval);
    if (!state.ok) return Promise.resolve(result(state.status, null, false, state.error));
    const replay = readApprovalReceipt(state.approval);
    if (replay) return Promise.resolve(replay);
    return submitInternal(input, state.approval);
  }

  global.PROMETEO_INGRESS_V1 = Object.freeze({
    schema: SCHEMA,
    submit,
    submitApprovedPlan,
    approval_schema: APPROVAL_SCHEMA,
    approved_plan_kind: APPROVED_PLAN_KIND,
    transport_schema: RESULT_SCHEMA,
    default_transport_mode: 'PRIVATE_BY_DEFAULT_EXPLICIT_CANARY_PUBLIC_FALLBACK',
    privacy: Object.freeze({
      raw_text_public: false,
      raw_text_public_default: false,
      explicit_public_canary_prefix: 'CANARY:',
      explicit_public_canary_requires_prefix: true,
      raw_text_private_owner: 'prometeo-change-loop-v1',
      credentials_public: false,
      browser_embedded_repository_token: false,
      github_wake_payload: 'SANITIZED_METADATA_ONLY',
      approval_public_fields: Object.freeze(['approval_id','proposal_id','proposal_digest','approved_at','decision'])
    })
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
