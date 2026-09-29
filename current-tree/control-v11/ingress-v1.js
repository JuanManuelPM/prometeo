(function installPrometeoIngressV1(global) {
  'use strict';

  const SCHEMA = 'prometeo.browser-ingress/v1';
  const REQUEST_SCHEMA = 'prometeo.browser-ingress-request/v1';
  const RESULT_SCHEMA = 'prometeo.ingress-transport-result/v1';
  const MAX_TEXT = 65536;
  const SAFE_PAGE_KEYS = Object.freeze([
    'id','page_id','title','href','public_url','surface_id','project_id',
    'authority_status','target_path','source_identity','served_identity'
  ]);

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
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 14);
    return 'ing-' + stamp + '-' + rand;
  }

  function activeTransport() {
    const t = global.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1;
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

  async function submit(input = {}) {
    const text = cleanString(input.text, MAX_TEXT);
    const kind = cleanString(input.kind, 64) || 'work';
    if (!text) return result('BOUNDARY_INVALID_INPUT', null, false, 'EMPTY_TEXT');
    if (String(input.text).length > MAX_TEXT) {
      return result('BOUNDARY_INVALID_INPUT', null, false, 'TEXT_TOO_LARGE');
    }

    const transport = activeTransport();
    if (!transport) {
      return result('BOUNDARY_AUTH_REQUIRED', null, false, 'AUTH_BRIDGE_REQUIRED');
    }

    const public_envelope = Object.freeze({
      schema: REQUEST_SCHEMA,
      request_id: requestId(),
      created_at: new Date().toISOString(),
      kind,
      page: publicPage(input.page),
      privacy: Object.freeze({
        raw_text_public: false,
        credentials_public: false,
        public_payload_class: 'SANITIZED_METADATA_ONLY'
      })
    });
    const private_payload = Object.freeze({ text });

    let transportResult;
    try {
      transportResult = await transport.submit(Object.freeze({
        public_envelope,
        private_payload
      }));
    } catch (error) {
      const code = cleanString(error && (error.code || error.name), 120) || 'TRANSPORT_ERROR';
      return result('BOUNDARY_TRANSPORT_FAILED', null, false, code);
    }

    if (!transportResult || typeof transportResult !== 'object') {
      return result('BOUNDARY_TRANSPORT_INVALID', null, false, 'TRANSPORT_RESULT_INVALID');
    }

    const status = cleanString(transportResult.status, 120) || 'UNKNOWN';
    const ref = cleanString(transportResult.ref, 4096);
    const queued = transportResult.queued === true;
    const error = cleanString(transportResult.error, 240);

    if (queued && (!validDurableRef(ref) || transportResult.schema !== RESULT_SCHEMA)) {
      return result('BOUNDARY_TRANSPORT_INVALID', null, false, 'TRANSPORT_RESULT_INVALID');
    }
    if (!queued) return result(status, ref && validDurableRef(ref) ? ref : null, false, error);

    return result(status || 'QUEUED', ref, true, error);
  }

  const api = Object.freeze({
    schema: SCHEMA,
    submit,
    transport_schema: RESULT_SCHEMA,
    privacy: Object.freeze({
      raw_text_public: false,
      credentials_public: false,
      browser_embedded_repository_token: false
    })
  });

  global.PROMETEO_INGRESS_V1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
