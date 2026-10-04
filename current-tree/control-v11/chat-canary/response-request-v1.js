(function installPrometeoPrimaryChatResponseRequestV1(global) {
  'use strict';

  const SCHEMA = 'prometeo.primary-chat-response-request/v1';
  const PREFIX = 'PROMETEO_RESPONSE_REQUEST_V1 ';
  const KIND = 'PRIMARY_CHAT_RESPONSE_REQUEST_V1';
  const PRIORITY = 'HIGH';
  const TRIGGER = 'EXPLICIT_HUMAN_RESPONDER_ACTION';
  const ROUTING = 'CURRENT_WORK_GRAPH';
  const MAX_TEXT = 65536;
  const TARGETS = Object.freeze({
    requested_candidate_count: 4,
    requested_exam_count: 2,
    requested_synthesizer_count: 1,
    human_routing_actions_target: 0
  });

  function clean(value, max = 512) {
    if (value === undefined || value === null) return null;
    const out = String(value).trim();
    return out ? out.slice(0, max) : null;
  }

  function requestId() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') {
        return 'rr-' + global.crypto.randomUUID();
      }
    } catch {}
    return 'rr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function buildEnvelope(options = {}) {
    const id = clean(options.request_id, 160) || requestId();
    const createdMs = Date.parse(String(options.created_at || ''));
    return Object.freeze({
      schema: SCHEMA,
      request_id: id,
      created_at: Number.isFinite(createdMs) ? new Date(createdMs).toISOString() : new Date().toISOString(),
      request_class: 'ANSWER',
      priority: PRIORITY,
      priority_trigger: TRIGGER,
      routing: ROUTING,
      ...TARGETS,
      counts_are_targets_not_claims: true,
      actual_worker_returns_required_for_multi_worker_claim: true,
      private_payload_only: true,
      raw_text_public: false,
      scheduler_authority: false,
      queue_authority: false,
      current_authority: false
    });
  }

  function encodePrivate(text, options = {}) {
    const raw = text === undefined || text === null ? '' : String(text);
    if (!raw.trim()) throw new Error('EMPTY_TEXT');
    if (raw.length > MAX_TEXT) throw new Error('TEXT_TOO_LARGE');
    const envelope = buildEnvelope(options);
    return PREFIX + JSON.stringify(envelope) + '\n' + raw;
  }

  function parsePrivate(value) {
    const raw = value === undefined || value === null ? '' : String(value);
    const newline = raw.indexOf('\n');
    if (newline <= PREFIX.length || !raw.startsWith(PREFIX)) return null;
    let envelope;
    try { envelope = JSON.parse(raw.slice(PREFIX.length, newline)); }
    catch { return null; }
    if (!envelope || envelope.schema !== SCHEMA) return null;
    if (envelope.priority !== PRIORITY || envelope.priority_trigger !== TRIGGER || envelope.routing !== ROUTING) return null;
    if (envelope.counts_are_targets_not_claims !== true || envelope.actual_worker_returns_required_for_multi_worker_claim !== true) return null;
    if (envelope.private_payload_only !== true || envelope.raw_text_public !== false) return null;
    const text = raw.slice(newline + 1);
    if (!text.trim()) return null;
    return Object.freeze({ envelope: Object.freeze({ ...envelope }), text });
  }

  function publicProjection(envelope) {
    if (!envelope || envelope.schema !== SCHEMA) return null;
    return Object.freeze({
      schema: 'prometeo.primary-chat-response-request-public-projection/v1',
      request_id: clean(envelope.request_id, 160),
      created_at: clean(envelope.created_at, 64),
      request_class: 'ANSWER',
      priority: PRIORITY,
      priority_trigger: TRIGGER,
      routing: ROUTING,
      requested_candidate_count: TARGETS.requested_candidate_count,
      requested_exam_count: TARGETS.requested_exam_count,
      requested_synthesizer_count: TARGETS.requested_synthesizer_count,
      human_routing_actions_target: TARGETS.human_routing_actions_target,
      counts_are_targets_not_claims: true,
      raw_text_public: false,
      authority: 'SANITIZED_DERIVED_REQUEST_ONLY'
    });
  }

  async function submitResponseRequest({ text, inputApi = null, page = null, request_id = null, created_at = null } = {}) {
    const api = inputApi || global.PROMETEO_CHAT_CANARY_INPUT_V1;
    if (!api || typeof api.submitText !== 'function') {
      return Object.freeze({ status: 'BOUNDARY_INGRESS_REQUIRED', queued: false, ref: null, error: 'CHAT_CANARY_INPUT_REQUIRED' });
    }
    let privateText;
    try { privateText = encodePrivate(text, { request_id, created_at }); }
    catch (error) {
      return Object.freeze({ status: 'BOUNDARY_INVALID_INPUT', queued: false, ref: null, error: clean(error && error.message, 120) || 'INVALID_RESPONSE_REQUEST' });
    }
    return await api.submitText(Object.freeze({
      text: privateText,
      kind: KIND,
      request_id: envelope.request_id,
      ...(page ? { page } : {})
    }));
  }

  global.PROMETEO_PRIMARY_CHAT_RESPONSE_REQUEST_V1 = Object.freeze({
    schema: SCHEMA,
    prefix: PREFIX,
    kind: KIND,
    priority: PRIORITY,
    priority_trigger: TRIGGER,
    routing: ROUTING,
    targets: TARGETS,
    max_text: MAX_TEXT,
    buildEnvelope,
    encodePrivate,
    parsePrivate,
    publicProjection,
    submitResponseRequest,
    privacy: Object.freeze({ raw_text_public: false, private_payload_only: true }),
    authority: Object.freeze({ scheduler: false, queue: false, current: false })
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
