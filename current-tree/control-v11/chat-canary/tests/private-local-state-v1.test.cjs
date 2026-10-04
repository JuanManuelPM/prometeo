'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const inputCode = fs.readFileSync('current-tree/control-v11/chat-canary/input-module-v1.js', 'utf8');

class Storage {
  constructor(seed = {}) { this.map = new Map(Object.entries(seed)); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

class FakeEvent {
  constructor(type) { this.type = type; }
  preventDefault() {}
}

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = String(tag || '').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.style = {};
    this.textContent = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  append(...children) {
    for (const child of children) {
      if (child && typeof child === 'object') child.parentNode = this;
      this.children.push(child);
    }
  }
  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatchEvent(event) {
    for (const fn of this.listeners.get(event.type) || []) fn.call(this, event);
    return true;
  }
}

class FakeDocument {
  createElement(tag) { return new FakeElement(tag, this); }
  querySelector() { return null; }
}

function load(storage) {
  const doc = new FakeDocument();
  let seq = 0;
  const ctx = {
    console, Date, Math, JSON, Object, Array, String, RegExp, Promise, Error, URL,
    localStorage: storage,
    document: doc,
    Event: FakeEvent,
    setInterval: () => null,
    clearInterval: () => {},
    setTimeout: () => null,
    clearTimeout: () => {},
    crypto: { randomUUID: () => 'c002-' + (++seq) }
  };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.runInContext(inputCode, vm.createContext(ctx), { filename: 'input-module-v1.js' });
  return { ctx, doc };
}

(async () => {
  const storage = new Storage();
  let { ctx, doc } = load(storage);
  let root = new FakeElement('div', doc);
  let mounted = ctx.PROMETEO_CHAT_CANARY_INPUT_V1.mount(root, { includeNotesInSubmit: true });
  let { input, note } = mounted.elements;

  input.value = 'borrador que sobrevive recarga';
  input.dispatchEvent(new FakeEvent('input'));
  assert.equal(storage.getItem('prometeo.primary-chat.draft.v1'), 'borrador que sobrevive recarga');
  mounted.destroy();

  ({ ctx, doc } = load(storage));
  root = new FakeElement('div', doc);
  mounted = ctx.PROMETEO_CHAT_CANARY_INPUT_V1.mount(root, { includeNotesInSubmit: true });
  ({ input, note } = mounted.elements);
  assert.equal(input.value, 'borrador que sobrevive recarga');

  input.value = 'nota privada local';
  input.dispatchEvent(new FakeEvent('input'));
  note.dispatchEvent(new FakeEvent('click'));
  assert.equal(storage.getItem('prometeo.primary-chat.draft.v1'), null);
  const notes = JSON.parse(storage.getItem('prometeo.primary-chat.notes.v1'));
  assert.equal(notes.length, 1);
  assert.equal(notes[0].text, 'nota privada local');

  input.value = 'primer mensaje privado';
  input.dispatchEvent(new FakeEvent('input'));
  const first = await mounted.submit();
  assert.equal(first.status, 'LOCAL_DURABLE');
  assert.equal(storage.getItem('prometeo.primary-chat.draft.v1'), null);
  assert.deepEqual(JSON.parse(storage.getItem('prometeo.primary-chat.notes.v1')), []);

  let context = JSON.parse(storage.getItem('prometeo.primary-chat.private-context.v1'));
  assert.equal(context.length, 1);
  assert.equal(context[0].text, 'primer mensaje privado');

  let outbox = JSON.parse(storage.getItem('prometeo.primary-chat.outbox.v1'));
  assert.equal(outbox.length, 1);
  assert.match(outbox[0].text, /NOTAS PRIVADAS:\\n• nota privada local/);
  assert.match(outbox[0].text, /MENSAJE:\\nprimer mensaje privado/);

  input.value = 'segundo mensaje privado';
  input.dispatchEvent(new FakeEvent('input'));
  const second = await mounted.submit();
  assert.equal(second.status, 'LOCAL_DURABLE');

  outbox = JSON.parse(storage.getItem('prometeo.primary-chat.outbox.v1'));
  assert.equal(outbox.length, 2);
  assert.match(outbox[1].text, /CONTEXTO PRIVADO RECIENTE:\\n• primer mensaje privado/);
  assert.match(outbox[1].text, /MENSAJE:\\nsegundo mensaje privado/);

  context = JSON.parse(storage.getItem('prometeo.primary-chat.private-context.v1'));
  assert.equal(context.length, 2);
  assert.equal(context[1].text, 'segundo mensaje privado');

  const meta = ctx.PROMETEO_CHAT_CANARY_INPUT_V1.local_state;
  assert.equal(meta.private_context_max_entries, 8);
  assert.equal(meta.private_context_max_chars, 12000);
  assert.equal(ctx.PROMETEO_CHAT_CANARY_INPUT_V1.privacy.draft_local_only, true);
  assert.equal(ctx.PROMETEO_CHAT_CANARY_INPUT_V1.privacy.private_context_local_only, true);
  assert.equal(JSON.stringify(meta).includes('primer mensaje privado'), false);

  console.log('PRIMARY_CHAT_C002_LOCAL_PRIVATE_STATE_V1 PASS');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
