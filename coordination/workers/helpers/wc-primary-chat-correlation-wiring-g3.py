from pathlib import Path
import subprocess

ROOT = Path('.')
INGRESS = ROOT / 'current-tree/control-v11/ingress-v1.js'
INPUT = ROOT / 'current-tree/control-v11/chat-canary/input-module-v1.js'
TEST = ROOT / 'current-tree/control-v11/chat-canary/tests/correlation-retention-v1.test.cjs'


def one(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {n}')
    return text.replace(old, new, 1)

# Guard against silently overwriting unrelated concurrent edits.
for path in (INGRESS, INPUT):
    latest = subprocess.check_output(['git', 'log', '-1', '--format=%H', '--', str(path)], text=True).strip()
    if latest != '229388bef586407d0b34ebd4dffa7d02d3d97d6e':
        raise SystemExit(f'HEAD_DRIFT {path}: latest={latest}')

# Recover the coherent ingress half that G2 prepared and then reverted after its paired write was blocked.
with INGRESS.open('wb') as fh:
    subprocess.run(
        ['git', 'show', '1769f50be1310d41735d66d6468bc84e74b9b6bd:current-tree/control-v11/ingress-v1.js'],
        check=True,
        stdout=fh,
    )

text = INPUT.read_text(encoding='utf-8')
text = one(
    text,
    "  const CORRELATION_SCHEMA = 'prometeo.private-ingress-correlation/v1';\n  const CORRELATION_STORAGE_KEY = 'prometeo.primary-chat.correlation.v1';\n",
    "  const PRIVATE_CORRELATION_SCHEMA = 'prometeo.primary-chat-private-correlation/v1';\n",
    'input correlation constants',
)

start = text.index('  function safeWorkItemId(value) {')
end = text.index('  function frozenResult(', start)
helper_block = r'''  let privateCorrelationLoadPromise = null;

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

'''
text = text[:start] + helper_block + text[end:]

validation_anchor = """    if (raw.length > MAX_TEXT) {
      return frozenResult('BOUNDARY_INVALID_INPUT', false, null, 'TEXT_TOO_LARGE', false);
    }

    const api = activeIngress(ingress);
"""
validation_replacement = """    if (raw.length > MAX_TEXT) {
      return frozenResult('BOUNDARY_INVALID_INPUT', false, null, 'TEXT_TOO_LARGE', false);
    }

    const correlationApi = await ensurePrivateCorrelationApi();
    if (!correlationApi) {
      return frozenResult('BOUNDARY_TRANSPORT_INVALID', false, null, 'PRIVATE_CORRELATION_HELPER_REQUIRED', false);
    }

    const api = activeIngress(ingress);
"""
text = one(text, validation_anchor, validation_replacement, 'input helper gate')

old_result = """    const status = clean(result.status, 120) || 'BOUNDARY_TRANSPORT_INVALID';
    const ref = clean(result.ref, 4096);
    const error = clean(result.error, 240);
    const correlationInput = result.correlation || ((result.work_item_id !== undefined || result.return_path !== undefined) ? result : null);
    const correlation = normalizeCorrelation(correlationInput);
    const correlationPresent = correlationInput !== null;

    if (correlationPresent && !correlation) {
      return frozenResult('BOUNDARY_TRANSPORT_INVALID', false, null, 'PRIVATE_CORRELATION_INVALID', false);
    }

    if (result.queued === true) {
      if (!validDurableRef(ref)) {
        return frozenResult('BOUNDARY_TRANSPORT_INVALID', false, null, 'DURABLE_REF_REQUIRED', false);
      }
      if (correlation) retainCorrelation(correlation);
      return frozenResult(status === 'BOUNDARY_TRANSPORT_INVALID' ? 'QUEUED' : status, true, ref, error, true, correlation);
    }

    return frozenResult(status, false, validDurableRef(ref) ? ref : null, error, false, correlation);
"""
new_result = """    const status = clean(result.status, 120) || 'BOUNDARY_TRANSPORT_INVALID';
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
      return frozenResult(status === 'BOUNDARY_TRANSPORT_INVALID' ? 'QUEUED' : status, true, retained.return_path, error, true, retained);
    }

    return frozenResult(status, false, validDurableRef(ref) ? ref : null, error, false, null);
"""
text = one(text, old_result, new_result, 'input result normalization')

text = one(
    text,
    """    correlation_schema: CORRELATION_SCHEMA,\n    normalizeCorrelation,\n    getRetainedCorrelation: readRetainedCorrelation,\n    retainCorrelation,\n    clearRetainedCorrelation,\n""",
    """    correlation_schema: PRIVATE_CORRELATION_SCHEMA,\n    ensurePrivateCorrelationApi,\n    normalizeCorrelation,\n    getRetainedCorrelation: readRetainedCorrelation,\n    retainCorrelation,\n    clearRetainedCorrelation,\n""",
    'input api',
)
INPUT.write_text(text, encoding='utf-8')

TEST.parent.mkdir(parents=True, exist_ok=True)
TEST.write_text(r'''\'use strict\';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const helperCode = fs.readFileSync('current-tree/control-v11/chat-canary/private-correlation-v1.js','utf8');
const ingressCode = fs.readFileSync('current-tree/control-v11/ingress-v1.js','utf8');
const inputCode = fs.readFileSync('current-tree/control-v11/chat-canary/input-module-v1.js','utf8');
class Storage {
  constructor(seed={}) { this.map = new Map(Object.entries(seed)); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k,v) { this.map.set(k,String(v)); }
  removeItem(k) { this.map.delete(k); }
}
const workItemId = 'page-change:pc-1234';
const returnPath = 'coordination/portfolio/returns/page-change/RETURN-pc-1234.json';
function context(sessionStorage = new Storage()) {
  const localStorage = new Storage({'prometeo.capture.workspace.secret.v2':'x'.repeat(40)});
  const ctx = {console,Date,Math,JSON,Object,Array,String,RegExp,Promise,Error,URL,TextEncoder,TextDecoder,setTimeout,clearTimeout,setInterval,clearInterval,localStorage,sessionStorage,location:{href:'https://example.invalid/chat'},crypto:{randomUUID:()=> 'req-1'}};
  ctx.globalThis = ctx; ctx.window = ctx; return vm.createContext(ctx);
}
function load(ctx, code, name) { vm.runInContext(code, ctx, {filename:name}); }
function queued(id=workItemId, path=returnPath) {
  return {schema:'prometeo.ingress-transport-result/v1',status:'QUEUED',ref:path,queued:true,error:null,work_item_id:id,return_path:path};
}
(async()=>{
  const shared = new Storage();
  const ctx = context(shared);
  load(ctx, helperCode, 'private-correlation-v1.js');
  ctx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued()};
  load(ctx, ingressCode, 'ingress-v1.js');
  load(ctx, inputCode, 'input-module-v1.js');

  const ingress = await ctx.PROMETEO_INGRESS_V1.submit({text:'private payload never retained',page:{page_id:'control-v11-chat-canary'}});
  assert.equal(ingress.queued,true);
  assert.equal(ingress.work_item_id,workItemId);
  assert.equal(ingress.return_path,returnPath);
  assert.equal(ingress.ref,returnPath);

  const first = await ctx.PROMETEO_CHAT_CANARY_INPUT_V1.submitText({text:'human private text',ingress:ctx.PROMETEO_INGRESS_V1});
  assert.equal(first.queued,true);
  assert.equal(first.correlation.work_item_id,workItemId);
  assert.equal(first.correlation.return_path,returnPath);
  const helper = ctx.PROMETEO_PRIMARY_CHAT_PRIVATE_CORRELATION_V1;
  const rawStored = shared.getItem(helper.storage_key);
  assert.ok(rawStored);
  assert.equal(rawStored.includes('human private text'),false);
  assert.equal(rawStored.includes('private payload never retained'),false);

  const replay = await ctx.PROMETEO_CHAT_CANARY_INPUT_V1.submitText({text:'same pair replay',ingress:ctx.PROMETEO_INGRESS_V1});
  assert.equal(replay.queued,true);
  assert.equal(replay.correlation.return_path,returnPath);
  assert.equal(shared.getItem(helper.storage_key),rawStored);

  const reload = context(shared);
  load(reload, helperCode, 'private-correlation-v1.js#reload');
  reload.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued()};
  load(reload, inputCode, 'input-module-v1.js#reload');
  const restored = reload.PROMETEO_CHAT_CANARY_INPUT_V1.getRetainedCorrelation();
  assert.equal(restored.work_item_id,workItemId);
  assert.equal(restored.return_path,returnPath);

  ctx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued('page-change:other', returnPath)};
  const mismatch = await ctx.PROMETEO_INGRESS_V1.submit({text:'mismatch',page:{page_id:'control-v11-chat-canary'}});
  assert.equal(mismatch.queued,false);
  assert.ok(String(mismatch.error||'').includes('PRIVATE_CORRELATION'));
  assert.equal(shared.getItem(helper.storage_key),rawStored);

  ctx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued(workItemId,'coordination/executions/page-change:pc-1234/RETURN.json')};
  const wrongAuthority = await ctx.PROMETEO_INGRESS_V1.submit({text:'wrong authority',page:{page_id:'control-v11-chat-canary'}});
  assert.equal(wrongAuthority.queued,false);
  assert.ok(String(wrongAuthority.error||'').includes('PRIVATE_CORRELATION'));
  assert.equal(shared.getItem(helper.storage_key),rawStored);

  assert.equal(ctx.PROMETEO_CHAT_CANARY_INPUT_V1.correlation_schema,'prometeo.primary-chat-private-correlation/v1');
  console.log('PRIMARY_CHAT_PRIVATE_CORRELATION_WIRING_V1 PASS');
})().catch(err=>{console.error(err);process.exit(1);});
'''.replace("\\'use strict\\';", "'use strict';"), encoding='utf-8')
print('PATCH_G3_PASS')
