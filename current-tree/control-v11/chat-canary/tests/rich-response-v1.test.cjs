'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const moduleCode = fs.readFileSync('current-tree/control-v11/chat-canary/rich-response-v1.js', 'utf8');
const ctx = { console, Date, Math, JSON, Object, Array, String, RegExp, Promise, Error, URL };
ctx.globalThis = ctx;
ctx.window = ctx;
vm.runInContext(moduleCode, vm.createContext(ctx), { filename: 'rich-response-v1.js' });

const api = ctx.PROMETEO_PRIMARY_CHAT_RICH_RESPONSE_V1;
assert.ok(api);

const rich = api.normalizeResponse({
  schema: api.schema,
  response_id: 'resp-c005',
  prose: ['Primero.', 'Segundo.'],
  links: [
    { label: 'seguro', href: 'https://juanmanuelpm.github.io/prometeo/wc/' },
    { label: 'malicioso', href: 'javascript:alert(1)' }
  ],
  widgets: [
    { type: 'details', label: 'detalle', body: 'texto seguro' },
    { type: 'copy_group', label: 'copiar', items: [{ label: 'x', text: 'contenido' }] },
    { type: 'approval', label: 'NO' },
    { type: 'html', body: '<img src=x onerror=alert(1)>' },
    { type: 'link', label: 'local', href: './status.json' }
  ],
  evidence_refs: ['coordination/example.json'],
  unknown_private_field: 'secret'
});

assert.ok(rich);
assert.deepEqual(Array.from(rich.prose), ['Primero.', 'Segundo.']);
assert.equal(rich.links.length, 1);
assert.equal(rich.links[0].label, 'seguro');
assert.ok(rich.widgets.some(x => x.type === 'details'));
assert.ok(rich.widgets.some(x => x.type === 'copy_group'));
assert.ok(rich.widgets.some(x => x.type === 'link'));
assert.equal(rich.widgets.some(x => x.type === 'approval'), false);
assert.equal(rich.widgets.some(x => x.type === 'html'), false);
assert.equal(Object.prototype.hasOwnProperty.call(rich, 'unknown_private_field'), false);
assert.equal(rich.public_safe_projection, true);
assert.equal(rich.raw_private_prompt, false);

const normalizedMessage = api.normalizeMessage({
  message_id: 'm1',
  body_text: 'legacy fallback',
  ui_blocks: [{ type: 'approval' }],
  rich_response: {
    schema: api.schema,
    prose: ['rich body'],
    widgets: [{ type: 'approval' }, { type: 'details', body: 'ok' }]
  }
});
assert.equal(normalizedMessage.body_text, 'rich body');
assert.equal(normalizedMessage.ui_blocks.some(x => x.type === 'approval'), false);
assert.equal(normalizedMessage.ui_blocks.some(x => x.type === 'details'), true);

const invalid = api.normalizeMessage({
  body_text: 'bounded legacy',
  ui_blocks: [{ type: 'approval' }],
  rich_response: { schema: 'bad', widgets: [{ type: 'approval' }] }
});
assert.equal(invalid.rich_response, null);
assert.deepEqual(Array.from(invalid.ui_blocks), []);
assert.equal(invalid.body_text, 'bounded legacy');

console.log('PRIMARY_CHAT_C005_RICH_RESPONSE_V1 PASS');
