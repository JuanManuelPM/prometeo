(function installPrometeoPrimaryChatRichResponseV1(global) {
  'use strict';

  const SCHEMA = 'prometeo.primary-chat-rich-response/v1';
  const SAFE_WIDGET_TYPES = Object.freeze([
    'link',
    'details',
    'copy_group',
    'experiment_stats',
    'work_unit_progress',
    'run_progress'
  ]);
  const MAX = Object.freeze({
    prose_paragraphs: 24,
    prose_paragraph_chars: 4000,
    prose_total_chars: 24000,
    links: 16,
    widgets: 12,
    label_chars: 180,
    href_chars: 2048,
    details_body_chars: 8000,
    copy_items: 8,
    copy_item_chars: 8000,
    copy_total_chars: 24000,
    metrics: 12,
    ref_chars: 512
  });

  function cleanString(value, max, { trim = true } = {}) {
    if (typeof value !== 'string') return null;
    let out = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    if (trim) out = out.trim();
    if (!out) return null;
    return out.slice(0, Math.max(1, Number(max) || 1));
  }

  function safeHref(value) {
    const href = cleanString(value, MAX.href_chars);
    if (!href) return null;
    if (/^https?:\/\/[^\s]+$/i.test(href)) return href;
    if (/^(?:\/(?!\/)|\.\.?\/|#)[^\s]*$/.test(href)) return href;
    return null;
  }

  function safePrometeoDataHref(value) {
    const href = safeHref(value);
    if (!href) return null;
    if (/^(?:\/(?!\/)|\.\.?\/|#)/.test(href)) return href;
    return /^https:\/\/juanmanuelpm\.github\.io\/prometeo\//i.test(href) ? href : null;
  }

  function normalizeProse(value) {
    const source = Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []);
    const paragraphs = [];
    let total = 0;
    for (const raw of source.slice(0, MAX.prose_paragraphs)) {
      const text = cleanString(raw, MAX.prose_paragraph_chars, { trim: true });
      if (!text) continue;
      const remaining = MAX.prose_total_chars - total;
      if (remaining <= 0) break;
      const bounded = text.slice(0, remaining);
      paragraphs.push(bounded);
      total += bounded.length;
    }
    return Object.freeze(paragraphs);
  }

  function normalizeLink(input) {
    if (!input || typeof input !== 'object') return null;
    const href = safeHref(input.href);
    if (!href) return null;
    return Object.freeze({
      label: cleanString(input.label, MAX.label_chars) || 'abrir',
      href
    });
  }

  function normalizeMetrics(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.freeze({});
    const out = {};
    for (const [key, raw] of Object.entries(value).slice(0, MAX.metrics)) {
      const label = cleanString(key, 100);
      if (!label) continue;
      if (!['string','number','boolean'].includes(typeof raw)) continue;
      const metric = cleanString(String(raw), 180);
      if (metric !== null) out[label] = metric;
    }
    return Object.freeze(out);
  }

  function normalizeCopyItems(value) {
    if (!Array.isArray(value)) return Object.freeze([]);
    const out = [];
    let total = 0;
    for (const item of value.slice(0, MAX.copy_items)) {
      if (!item || typeof item !== 'object') continue;
      const text = cleanString(item.text, MAX.copy_item_chars, { trim: false });
      if (!text) continue;
      const remaining = MAX.copy_total_chars - total;
      if (remaining <= 0) break;
      const bounded = text.slice(0, remaining);
      out.push(Object.freeze({
        label: cleanString(item.label, MAX.label_chars) || 'texto',
        text: bounded,
        ...(cleanString(item.button_label, 80) ? { button_label: cleanString(item.button_label, 80) } : {})
      }));
      total += bounded.length;
    }
    return Object.freeze(out);
  }

  function normalizeWidget(block) {
    if (!block || typeof block !== 'object') return null;
    const type = cleanString(block.type, 64);
    if (!type || !SAFE_WIDGET_TYPES.includes(type)) return null;

    if (type === 'link') {
      const link = normalizeLink(block);
      return link ? Object.freeze({ type, ...link }) : null;
    }

    if (type === 'details') {
      const body = cleanString(block.body, MAX.details_body_chars, { trim: false });
      if (!body) return null;
      return Object.freeze({
        type,
        label: cleanString(block.label, MAX.label_chars) || 'ver más',
        body
      });
    }

    if (type === 'copy_group') {
      const items = normalizeCopyItems(block.items);
      if (!items.length) return null;
      return Object.freeze({
        type,
        label: cleanString(block.label, MAX.label_chars) || 'copiar',
        items,
        ...(cleanString(block.copy_all_label, 100) ? { copy_all_label: cleanString(block.copy_all_label, 100) } : {}),
        ...(cleanString(block.note, 500) ? { note: cleanString(block.note, 500) } : {})
      });
    }

    if (type === 'experiment_stats') {
      const metrics = normalizeMetrics(block.metrics);
      if (!Object.keys(metrics).length) return null;
      return Object.freeze({
        type,
        label: cleanString(block.label, MAX.label_chars) || 'estadísticas',
        metrics,
        ...(cleanString(block.note, 500) ? { note: cleanString(block.note, 500) } : {})
      });
    }

    if (type === 'work_unit_progress') {
      return Object.freeze({
        type,
        ...(cleanString(block.label, MAX.label_chars) ? { label: cleanString(block.label, MAX.label_chars) } : {})
      });
    }

    if (type === 'run_progress') {
      const statusUrl = block.status_url == null ? null : safePrometeoDataHref(block.status_url);
      const labUrl = block.lab_url == null ? null : safePrometeoDataHref(block.lab_url);
      const runtimeUrl = block.runtime_url == null ? null : safePrometeoDataHref(block.runtime_url);
      if ((block.status_url != null && !statusUrl) || (block.lab_url != null && !labUrl) || (block.runtime_url != null && !runtimeUrl)) return null;
      const out = {
        type,
        ...(cleanString(block.label, MAX.label_chars) ? { label: cleanString(block.label, MAX.label_chars) } : {}),
        ...(cleanString(block.run_id, 160) ? { run_id: cleanString(block.run_id, 160) } : {}),
        ...(cleanString(block.batch_id, 160) ? { batch_id: cleanString(block.batch_id, 160) } : {}),
        ...(statusUrl ? { status_url: statusUrl } : {}),
        ...(labUrl ? { lab_url: labUrl } : {}),
        ...(runtimeUrl ? { runtime_url: runtimeUrl } : {})
      };
      const expected = Number(block.expected_workers);
      const target = Number(block.resident_target);
      const poll = Number(block.poll_ms);
      if (Number.isInteger(expected) && expected > 0 && expected <= 1000) out.expected_workers = expected;
      if (Number.isInteger(target) && target > 0 && target <= 20) out.resident_target = target;
      if (Number.isFinite(poll)) out.poll_ms = Math.max(10000, Math.min(120000, Math.round(poll)));
      return Object.freeze(out);
    }

    return null;
  }

  function normalizeResponse(input) {
    if (!input || typeof input !== 'object' || input.schema !== SCHEMA) return null;
    const prose = normalizeProse(input.prose);
    const links = Object.freeze((Array.isArray(input.links) ? input.links : [])
      .slice(0, MAX.links)
      .map(normalizeLink)
      .filter(Boolean));
    const widgets = Object.freeze((Array.isArray(input.widgets) ? input.widgets : [])
      .slice(0, MAX.widgets)
      .map(normalizeWidget)
      .filter(Boolean));
    if (!prose.length && !links.length && !widgets.length) return null;
    const evidenceRefs = Object.freeze((Array.isArray(input.evidence_refs) ? input.evidence_refs : [])
      .slice(0, 24)
      .map(value => cleanString(value, MAX.ref_chars))
      .filter(Boolean));
    return Object.freeze({
      schema: SCHEMA,
      ...(cleanString(input.response_id, 160) ? { response_id: cleanString(input.response_id, 160) } : {}),
      ...(cleanString(input.request_id, 160) ? { request_id: cleanString(input.request_id, 160) } : {}),
      ...(cleanString(input.generated_at, 64) ? { generated_at: cleanString(input.generated_at, 64) } : {}),
      prose,
      links,
      widgets,
      evidence_refs: evidenceRefs,
      public_safe_projection: true,
      raw_private_prompt: false
    });
  }

  function toUiBlocks(response) {
    if (!response || response.schema !== SCHEMA) return Object.freeze([]);
    const blocks = [];
    for (const link of response.links || []) blocks.push(Object.freeze({ type: 'link', label: link.label, href: link.href }));
    for (const widget of response.widgets || []) blocks.push(widget);
    return Object.freeze(blocks);
  }

  function normalizeMessage(message) {
    if (!message || typeof message !== 'object' || !Object.prototype.hasOwnProperty.call(message, 'rich_response')) return message;
    const rich = normalizeResponse(message.rich_response);
    if (!rich) {
      return Object.freeze({
        ...message,
        rich_response: null,
        ui_blocks: Object.freeze([]),
        body_text: cleanString(message.body_text, MAX.prose_total_chars, { trim: false }) || ''
      });
    }
    return Object.freeze({
      ...message,
      body_kind: 'TEXT',
      body_text: rich.prose.join('\n\n'),
      ui_blocks: toUiBlocks(rich),
      rich_response: rich
    });
  }

  global.PROMETEO_PRIMARY_CHAT_RICH_RESPONSE_V1 = Object.freeze({
    schema: SCHEMA,
    safe_widget_types: SAFE_WIDGET_TYPES,
    limits: MAX,
    safeHref,
    normalizeResponse,
    normalizeWidget,
    normalizeMessage,
    toUiBlocks,
    privacy: Object.freeze({
      raw_private_prompt_public: false,
      unknown_fields_forwarded: false
    }),
    authority: Object.freeze({
      scheduler: false,
      queue: false,
      current: false,
      human_approval: false
    })
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
