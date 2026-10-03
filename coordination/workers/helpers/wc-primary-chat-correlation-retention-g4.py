from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


def replace_n(text, old, new, n, label):
    count = text.count(old)
    if count != n:
        raise SystemExit(f"{label}: expected {n} anchors, found {count}")
    return text.replace(old, new)


ingress_path = Path("current-tree/control-v11/ingress-v1.js")
ingress = ingress_path.read_text(encoding="utf-8")

ingress = replace_once(
    ingress,
    """  function result(status, ref = null, queued = false, error = null) {\n    return Object.freeze({ status, ref, queued, error });\n  }\n""",
    """  function result(status, ref = null, queued = false, error = null, correlation = null) {\n    return Object.freeze({ status, ref, queued, error, correlation: normalizeCorrelationEnvelope(correlation) });\n  }\n""",
    "ingress result",
)

clean_anchor = """  function cleanString(value, max = 512) {\n    if (value === undefined || value === null) return null;\n    const text = String(value).trim();\n    if (!text) return null;\n    return text.slice(0, max);\n  }\n"""
correlation_helpers = clean_anchor + """

  const CORRELATION_SCHEMA = 'prometeo.private-ingress-correlation/v1';

  function safeWorkItemId(value) {
    const id = cleanString(value, 160);
    return id && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id) ? id : null;
  }

  function correlationFromReturnPath(returnPath, expectedWorkItemId = null) {
    const path = cleanString(returnPath, 360);
    const match = path && path.match(/^coordination\/executions\/([A-Za-z0-9][A-Za-z0-9._:-]{0,159})\/RETURN\.json$/);
    if (!match) return null;
    const workItemId = safeWorkItemId(match[1]);
    const expected = expectedWorkItemId === null ? workItemId : safeWorkItemId(expectedWorkItemId);
    if (!workItemId || !expected || workItemId !== expected) return null;
    return Object.freeze({ schema: CORRELATION_SCHEMA, work_item_id: workItemId, return_path: path });
  }

  function normalizeCorrelationEnvelope(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const workItemId = safeWorkItemId(value.work_item_id);
    return workItemId ? correlationFromReturnPath(value.return_path, workItemId) : null;
  }
"""
ingress = replace_once(ingress, clean_anchor, correlation_helpers, "ingress helpers")

replay_old = "return Object.freeze({ schema: RESULT_SCHEMA, status: 'QUEUED_REPLAY', ref: replayRef, queued: true, error: null });"
replay_new = """const replayCorrelation = correlationFromReturnPath(replayRef);
              if (!replayCorrelation) throw Object.assign(new Error('APPROVAL_REPLAY_CORRELATION_INVALID'), { code: 'APPROVAL_REPLAY_CORRELATION_INVALID' });
              return Object.freeze({ schema: RESULT_SCHEMA, status: 'QUEUED_REPLAY', ref: replayRef, queued: true, error: null, work_item_id: replayCorrelation.work_item_id, return_path: replayCorrelation.return_path, correlation: replayCorrelation });"""
ingress = replace_n(ingress, replay_old, replay_new, 2, "ingress replay")

wake_old = """          if (!wake || wake.schema !== RESULT_SCHEMA || wake.queued !== true) {
            throw Object.assign(new Error(cleanString(wake && wake.error, 160) || 'WAKE_NOT_QUEUED'), { code: 'WAKE_NOT_QUEUED' });
          }
          return Object.freeze(wake);
"""
wake_new = """          if (!wake || wake.schema !== RESULT_SCHEMA || wake.queued !== true) {
            throw Object.assign(new Error(cleanString(wake && wake.error, 160) || 'WAKE_NOT_QUEUED'), { code: 'WAKE_NOT_QUEUED' });
          }
          const correlation = correlationFromReturnPath(returnPath, workItemId);
          if (!correlation) {
            throw Object.assign(new Error('PRIVATE_CORRELATION_INVALID'), { code: 'PRIVATE_CORRELATION_INVALID' });
          }
          return Object.freeze({ ...wake, work_item_id: correlation.work_item_id, return_path: correlation.return_path, correlation });
"""
ingress = replace_once(ingress, wake_old, wake_new, "ingress wake")

normalize_old = """        const status = cleanString(transportResult.status, 120) || 'UNKNOWN';
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
"""
normalize_new = """        const status = cleanString(transportResult.status, 120) || 'UNKNOWN';
        const ref = cleanString(transportResult.ref, 4096);
        const queued = transportResult.queued === true;
        const error = cleanString(transportResult.error, 240);
        const correlationInput = transportResult.correlation || ((transportResult.work_item_id !== undefined || transportResult.return_path !== undefined) ? transportResult : null);
        const correlation = normalizeCorrelationEnvelope(correlationInput);
        const correlationPresent = correlationInput !== null;
        if (queued && (!validDurableRef(ref) || transportResult.schema !== RESULT_SCHEMA)) {
          normalized = result('BOUNDARY_TRANSPORT_INVALID', null, false, 'TRANSPORT_RESULT_INVALID');
        } else if (correlationPresent && !correlation) {
          normalized = result('BOUNDARY_TRANSPORT_INVALID', null, false, 'PRIVATE_CORRELATION_INVALID');
        } else if (!queued) {
          normalized = result(status, ref && validDurableRef(ref) ? ref : null, false, error, correlation);
        } else {
          normalized = result(status || 'QUEUED', ref, true, error, correlation);
        }
"""
ingress = replace_once(ingress, normalize_old, normalize_new, "ingress normalize")

approval_read_old = """      if (cached.queued === true && validDurableRef(cached.ref)) return result('QUEUED_REPLAY', cached.ref, true, null);
"""
approval_read_new = """      if (cached.queued === true && validDurableRef(cached.ref)) {
        const correlation = normalizeCorrelationEnvelope(cached.correlation);
        if (!correlation) return result('BOUNDARY_APPROVAL_REPLAY_CORRELATION_INVALID', null, false, 'APPROVAL_REPLAY_CORRELATION_INVALID');
        return result('QUEUED_REPLAY', cached.ref, true, null, correlation);
      }
"""
ingress = replace_once(ingress, approval_read_old, approval_read_new, "approval read")

ingress = replace_once(
    ingress,
    """        ref: normalized.ref,\n        queued: true,\n        cached_at: new Date().toISOString(),\n""",
    """        ref: normalized.ref,\n        queued: true,\n        correlation: normalizeCorrelationEnvelope(normalized.correlation),\n        cached_at: new Date().toISOString(),\n""",
    "approval write",
)

ingress = replace_once(
    ingress,
    """    submitApprovedPlan,\n    approval_schema: APPROVAL_SCHEMA,\n""",
    """    submitApprovedPlan,\n    correlation_schema: CORRELATION_SCHEMA,\n    safeWorkItemId,\n    correlationFromReturnPath,\n    normalizeCorrelation: normalizeCorrelationEnvelope,\n    approval_schema: APPROVAL_SCHEMA,\n""",
    "ingress api",
)
ingress_path.write_text(ingress, encoding="utf-8")

input_path = Path("current-tree/control-v11/chat-canary/input-module-v1.js")
module = input_path.read_text(encoding="utf-8")
module = replace_once(
    module,
    """  const MAX_TEXT = 65536;\n  const WORKSPACE_SECRET_KEYS = Object.freeze([\n""",
    """  const MAX_TEXT = 65536;\n  const CORRELATION_SCHEMA = 'prometeo.private-ingress-correlation/v1';\n  const CORRELATION_STORAGE_KEY = 'prometeo.primary-chat.correlation.v1';\n  const WORKSPACE_SECRET_KEYS = Object.freeze([\n""",
    "input constants",
)

helper_block = """

  function safeWorkItemId(value) {
    const id = clean(value, 160);
    return id && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id) ? id : null;
  }

  function normalizeCorrelation(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const workItemId = safeWorkItemId(value.work_item_id);
    const returnPath = clean(value.return_path, 360);
    if (!workItemId || returnPath !== `coordination/executions/${workItemId}/RETURN.json`) return null;
    return Object.freeze({ schema: CORRELATION_SCHEMA, work_item_id: workItemId, return_path: returnPath });
  }

  function readRetainedCorrelation() {
    try {
      if (!global.sessionStorage) return null;
      const raw = global.sessionStorage.getItem(CORRELATION_STORAGE_KEY);
      if (!raw) return null;
      const correlation = normalizeCorrelation(JSON.parse(raw));
      if (!correlation) global.sessionStorage.removeItem(CORRELATION_STORAGE_KEY);
      return correlation;
    } catch {
      try { if (global.sessionStorage) global.sessionStorage.removeItem(CORRELATION_STORAGE_KEY); } catch {}
      return null;
    }
  }

  function retainCorrelation(value) {
    const correlation = normalizeCorrelation(value);
    if (!correlation) return null;
    try {
      if (global.sessionStorage) global.sessionStorage.setItem(CORRELATION_STORAGE_KEY, JSON.stringify(correlation));
    } catch {}
    return correlation;
  }

  function clearRetainedCorrelation() {
    try { if (global.sessionStorage) global.sessionStorage.removeItem(CORRELATION_STORAGE_KEY); } catch {}
  }
"""
marker = "\n\n  function frozenResult(status, queued, ref = null, error = null, clearInput = false) {"
if module.count(marker) != 1:
    raise SystemExit(f"input helper marker drift: {module.count(marker)}")
module = module.replace(marker, helper_block + "\n\n  function frozenResult(status, queued, ref = null, error = null, clearInput = false, correlation = null) {", 1)
module = replace_once(
    module,
    """      clear_input: clearInput === true\n""",
    """      clear_input: clearInput === true,\n      correlation: normalizeCorrelation(correlation)\n""",
    "input frozen result",
)

submit_old = """    const status = clean(result.status, 120) || 'BOUNDARY_TRANSPORT_INVALID';
    const ref = clean(result.ref, 4096);
    const error = clean(result.error, 240);

    if (result.queued === true) {
      if (!validDurableRef(ref)) {
        return frozenResult('BOUNDARY_TRANSPORT_INVALID', false, null, 'DURABLE_REF_REQUIRED', false);
      }
      return frozenResult(status === 'BOUNDARY_TRANSPORT_INVALID' ? 'QUEUED' : status, true, ref, error, true);
    }

    return frozenResult(status, false, validDurableRef(ref) ? ref : null, error, false);
"""
submit_new = """    const status = clean(result.status, 120) || 'BOUNDARY_TRANSPORT_INVALID';
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
module = replace_once(module, submit_old, submit_new, "input submit normalize")
module = replace_once(
    module,
    """    validDurableRef,\n    workspaceLinked,\n""",
    """    validDurableRef,\n    correlation_schema: CORRELATION_SCHEMA,\n    normalizeCorrelation,\n    getRetainedCorrelation: readRetainedCorrelation,\n    retainCorrelation,\n    clearRetainedCorrelation,\n    workspaceLinked,\n""",
    "input api",
)
input_path.write_text(module, encoding="utf-8")

test_path = Path("current-tree/control-v11/chat-canary/tests/correlation-retention-v1.test.cjs")
test_path.parent.mkdir(parents=True, exist_ok=True)
test_path.write_text(r"""'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const ingressCode=fs.readFileSync('current-tree/control-v11/ingress-v1.js','utf8');
const inputCode=fs.readFileSync('current-tree/control-v11/chat-canary/input-module-v1.js','utf8');
class Storage { constructor(seed={}){this.map=new Map(Object.entries(seed));} getItem(k){return this.map.has(k)?this.map.get(k):null;} setItem(k,v){this.map.set(k,String(v));} removeItem(k){this.map.delete(k);} }
const correlation={schema:'prometeo.private-ingress-correlation/v1',work_item_id:'WI-opaque-123',return_path:'coordination/executions/WI-opaque-123/RETURN.json'};
const durableRef=correlation.return_path;
function baseContext(sessionStorage=new Storage()){
  const localStorage=new Storage({'prometeo.capture.workspace.secret.v2':'x'.repeat(40)});
  const ctx={console,Date,Math,JSON,Object,Array,String,RegExp,Promise,Error,URL,TextEncoder,TextDecoder,setTimeout,clearTimeout,setInterval,clearInterval,localStorage,sessionStorage,location:{href:'https://example.invalid/chat'},crypto:{randomUUID:()=> 'req-1'}};
  ctx.globalThis=ctx; ctx.window=ctx; return vm.createContext(ctx);
}
(async()=>{
  const ingressCtx=baseContext();
  ingressCtx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1={submit:async()=>({schema:'prometeo.ingress-transport-result/v1',status:'QUEUED',ref:durableRef,queued:true,error:null,work_item_id:correlation.work_item_id,return_path:correlation.return_path})};
  vm.runInContext(ingressCode,ingressCtx,{filename:'ingress-v1.js'});
  const ingressResult=await ingressCtx.PROMETEO_INGRESS_V1.submit({text:'private test payload never persisted',page:{page_id:'control-v11-chat-canary',title:'canary'}});
  assert.equal(ingressResult.queued,true);
  assert.equal(ingressResult.correlation.work_item_id,correlation.work_item_id);
  assert.equal(ingressResult.correlation.return_path,correlation.return_path);
  ingressCtx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1={submit:async()=>({schema:'prometeo.ingress-transport-result/v1',status:'QUEUED',ref:durableRef,queued:true,error:null,work_item_id:'WI-other',return_path:correlation.return_path})};
  const malformedIngress=await ingressCtx.PROMETEO_INGRESS_V1.submit({text:'x',page:{page_id:'control-v11-chat-canary'}});
  assert.equal(malformedIngress.queued,false); assert.equal(malformedIngress.error,'PRIVATE_CORRELATION_INVALID');
  const sharedSession=new Storage();
  const inputCtx=baseContext(sharedSession);
  const mockIngress={submit:async()=>({status:'QUEUED',queued:true,ref:durableRef,error:null,correlation})};
  inputCtx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1=mockIngress;
  vm.runInContext(inputCode,inputCtx,{filename:'input-module-v1.js'});
  const inputResult=await inputCtx.PROMETEO_CHAT_CANARY_INPUT_V1.submitText({text:'human private text',ingress:mockIngress});
  assert.equal(inputResult.queued,true);
  assert.deepEqual(JSON.parse(sharedSession.getItem('prometeo.primary-chat.correlation.v1')),correlation);
  assert.equal([...sharedSession.map.values()].some(v=>v.includes('human private text')),false);
  const reloadCtx=baseContext(sharedSession); reloadCtx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1=mockIngress;
  vm.runInContext(inputCode,reloadCtx,{filename:'input-module-v1.js#reload'});
  const restored=reloadCtx.PROMETEO_CHAT_CANARY_INPUT_V1.getRetainedCorrelation();
  assert.equal(restored.work_item_id,correlation.work_item_id); assert.equal(restored.return_path,correlation.return_path);
  const replay=await reloadCtx.PROMETEO_CHAT_CANARY_INPUT_V1.submitText({text:'replay',ingress:mockIngress});
  assert.equal(replay.correlation.return_path,durableRef);
  const malformedIngress2={submit:async()=>({status:'QUEUED',queued:true,ref:durableRef,error:null,correlation:{...correlation,return_path:'coordination/executions/OTHER/RETURN.json'}})};
  reloadCtx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1=malformedIngress2;
  const bad=await reloadCtx.PROMETEO_CHAT_CANARY_INPUT_V1.submitText({text:'bad',ingress:malformedIngress2});
  assert.equal(bad.queued,false); assert.equal(bad.error,'PRIVATE_CORRELATION_INVALID');
  assert.equal(reloadCtx.PROMETEO_CHAT_CANARY_INPUT_V1.getRetainedCorrelation().return_path,durableRef);
  sharedSession.setItem('prometeo.primary-chat.correlation.v1',JSON.stringify({work_item_id:'WI-opaque-123',return_path:'coordination/executions/OTHER/RETURN.json'}));
  const malformedReload=baseContext(sharedSession); malformedReload.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1=mockIngress;
  vm.runInContext(inputCode,malformedReload,{filename:'input-module-v1.js#malformed-reload'});
  assert.equal(malformedReload.PROMETEO_CHAT_CANARY_INPUT_V1.getRetainedCorrelation(),null);
  assert.equal(sharedSession.getItem('prometeo.primary-chat.correlation.v1'),null);
  console.log('CORRELATION_RETENTION_V1 PASS');
})().catch(err=>{console.error(err);process.exit(1);});
""", encoding="utf-8")
print("PATCH_HELPER_PASS")
