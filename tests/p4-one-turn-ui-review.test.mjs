import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// A small DOM double exercises composer state using the actual change-loop module.
// It does not establish representative browser or private-backend verification.
class Element {
  constructor() {
    this.handlers = {}; this.dataset = {}; this.value = ''; this.textContent = '';
    this.classes = new Set();
    this.classList = {
      toggle: (name, value = !this.classes.has(name)) => value ? this.classes.add(name) : this.classes.delete(name),
      add: name => this.classes.add(name), remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name)
    };
  }
  set innerHTML(value) { this.html = value; this.composer = value.includes('id="pclText"') ? new Element() : null; }
  get innerHTML() { return this.html || ''; }
  setAttribute() {}
  addEventListener(type, handler) { this.handlers[type] = handler; }
  querySelector(selector) {
    if (selector === '#pclText') return this.composer;
    if (selector === '[data-act="text"]') return this.send ??= new Element();
    return this.parts?.[selector] || null;
  }
}

async function mount(t, adapterOverrides = {}) {
  const root = new Element(), body = new Element();
  root.parts = Object.fromEntries(['.pcl-title', '.pcl-meta', '.pcl-rec-dock', '.pcl-toast'].map(k => [k, new Element()]));
  root.parts['.pcl-body'] = body;
  const globals = {
    document: {getElementById: () => null, createElement: type => type === 'section' ? root : new Element(), head: {append() {}}, body: {append() {}}, activeElement: null},
    addEventListener: () => {}, setTimeout: () => 0, setInterval: () => 0,
    cancelAnimationFrame: () => {}, requestAnimationFrame: () => 0,
  };
  const previous = Object.fromEntries(Object.keys(globals).map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, {value, writable: true, configurable: true});
  t.after(() => {for (const [key, descriptor] of Object.entries(previous)) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]; delete globalThis.__PROMETEO_CHANGE_LOOP__;});
  const client = {
    hasWorkspace: () => true, executionStatus: async () => ({}),
    detail: async () => ({capabilities: {one_turn_ingress: 1}}), syncPage: async () => ({}),
    overview: async () => ({threads: []}), claimTranscription: async () => ({}),
  };
  const adapter = {recordingState: () => ({active: false}), listLocalNotes: async () => [], ...adapterOverrides};
  const source = await fs.readFile(new URL('../shared/capture/v1/change-loop.js', import.meta.url), 'utf8');
  const module = await import('data:text/javascript;base64,' + Buffer.from(source + '\n//' + crypto.randomUUID()).toString('base64'));
  const api = module.mountPageChangeLoop({client, adapter});
  const send = () => root.handlers.click({target: {closest: () => ({dataset: {act: 'text'}, classList: {contains: () => false}})}});
  return {api, body, root, send};
}

test('closing and reopening preserves an unsent composer draft', async t => {
  const {api, body} = await mount(t);
  await api.open({id: 'page-a'}); body.composer.value = 'unsent draft';
  api.close(); await api.open({id: 'page-a'});
  assert.equal(body.composer.value, 'unsent draft');
});

test('page draft remains scoped when opening a result for another page', async t => {
  const {api, body} = await mount(t);
  await api.open({id: 'page-a'}); body.composer.value = 'draft for A';
  await api.openResult({id: 'page-b'}, '', {markSeen: false});
  assert.equal(body.composer.value, '');
  await api.open({id: 'page-a'});
  assert.equal(body.composer.value, 'draft for A');
});

test('successful recovery clears the pending request and allows a new input', async t => {
  let requestId, calls = 0;
  const {api, body, send} = await mount(t, {
    submitOneTurn: async input => {
      requestId = input.request_id; calls++;
      if (calls === 1) throw new Error('temporary dispatch outage');
      return {state: 'QUEUED', input_receipt: {durable: true}};
    },
    recoverOneTurn: async () => requestId ? [{request_id: requestId, state: 'QUEUED'}] : [],
  });
  await api.open({id: 'page-a'}); body.composer.value = 'first request'; await send();
  api.close(); await api.open({id: 'page-a'});
  body.composer.value = 'second request'; await send();
  assert.equal(calls, 2);
  assert.equal(body.composer.value, '');
});

test('typing while a request is pending preserves the later unsent input', async t => {
  let resolve;
  const {api, body, send} = await mount(t, {submitOneTurn: () => new Promise(r => {resolve = r;})});
  await api.open({id: 'page-a'}); body.composer.value = 'submitted input';
  const saving = send(); body.composer.value = 'new input typed while sending';
  resolve({state: 'QUEUED', input_receipt: {durable: true}}); await saving;
  assert.equal(body.composer.value, 'new input typed while sending');
});
