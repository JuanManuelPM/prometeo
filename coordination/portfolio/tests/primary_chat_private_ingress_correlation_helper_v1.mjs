import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

const sessionStorage = new MemoryStorage();
const context = { sessionStorage, globalThis: null };
context.globalThis = context;
vm.runInNewContext(fs.readFileSync(new URL('../../../current-tree/control-v11/chat-canary/private-correlation-v1.js', import.meta.url), 'utf8'), context);
const api = context.PROMETEO_PRIMARY_CHAT_PRIVATE_CORRELATION_V1;
assert.equal(api.schema, 'prometeo.primary-chat-private-correlation/v1');
const valid = { work_item_id: 'page-change:pc-1234', return_path: 'coordination/portfolio/returns/page-change/RETURN-pc-1234.json' };
assert.equal(JSON.stringify(api.normalize(valid)), JSON.stringify({ schema: api.schema, ...valid }));
assert.equal(api.normalize({ ...valid, work_item_id: 'bad id with spaces' }), null);
assert.equal(api.normalize({ ...valid, return_path: 'https://example.invalid/private' }), null);
assert.equal(api.normalize({ ...valid, return_path: 'coordination/private/transcript.json' }), null);
const ingress = api.fromIngressResult({ queued: true, ref: valid.return_path, ...valid, private_payload: 'NEVER' });
assert.equal(JSON.stringify(ingress), JSON.stringify({ schema: api.schema, ...valid }));
assert.equal(api.fromIngressResult({ queued: false, ...valid }), null);
assert.equal(api.fromIngressResult({ queued: true, ...valid, ref: 'coordination/portfolio/returns/page-change/OTHER.json' }), null);
const saved = api.save(valid);
assert.equal(JSON.stringify(api.load()), JSON.stringify(saved));
assert.equal(sessionStorage.getItem(api.storage_key).includes('NEVER'), false);
assert.equal(JSON.stringify(api.save(valid)), JSON.stringify(saved));
assert.throws(() => api.save({ ...valid, return_path: 'coordination/portfolio/returns/page-change/RETURN-conflict.json' }), /CORRELATION_CONFLICT/);
assert.throws(() => api.save({ ...valid, work_item_id: 'page-change:other' }), /CORRELATION_CONFLICT/);
sessionStorage.setItem(api.storage_key, '{bad json');
assert.equal(api.load(), null);
api.clear();
assert.equal(sessionStorage.getItem(api.storage_key), null);
assert.deepEqual({ ...api.privacy }, { raw_text_stored: false, transcript_stored: false, credentials_stored: false, token_stored: false });
console.log(JSON.stringify({ schema: 'prometeo.primary-chat-private-correlation-helper-test/v1', overall: 'PASS', checks: 15 }));
