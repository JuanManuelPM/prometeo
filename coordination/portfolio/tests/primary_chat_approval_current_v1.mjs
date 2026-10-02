import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../../../current-tree/control-v11/ingress-v1.js', import.meta.url), 'utf8');
const serverSource = fs.readFileSync(new URL('../../../supabase/functions/prometeo-change-loop-v1/index.ts', import.meta.url), 'utf8');
const chatSource = fs.readFileSync(new URL('../../../current-tree/control-v11/chat-canary/index.html', import.meta.url), 'utf8');

assert(serverSource.includes('approval_replay_status'), 'private Page Change owner must expose approval replay status');
assert(serverSource.includes('APPROVAL_REPLAY_CONFLICT'), 'private Page Change owner must fail closed on approval digest conflict');
assert(chatSource.includes('submitApprovedPlan'), 'visible approval control must delegate to PROMETEO_INGRESS_V1.submitApprovedPlan');
assert(chatSource.includes("block.type === 'approval'"), 'Primary Chat must render the explicit approval UI block');

function makeRuntime({ badWake = false, serverReplay = false, serverConflict = false } = {}) {
  const store = new Map([['prometeo.capture.workspace.secret.v2', 'x'.repeat(40)]]);
  const calls = [];
  const localStorage = {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value))
  };
  const response = data => ({ ok: true, status: 200, async json() { return data; } });
  const errorResponse = (status, data) => ({ ok: false, status, async json() { return data; } });
  async function fetch(url, opts = {}) {
    const body = JSON.parse(opts.body || '{}');
    calls.push({ url: String(url), body });
    if (String(url).includes('prometeo-capture')) return response({ ok: true });
    if (String(url).includes('prometeo-change-loop-v1')) {
      if (body.action === 'approval_replay_status') {
        if (serverConflict) return errorResponse(409, { error: 'APPROVAL_REPLAY_CONFLICT' });
        if (serverReplay) {
          return response({
            ok: true,
            status: 'QUEUED_REPLAY',
            replayed: true,
            return_path: 'coordination/executions/WI-SERVER-REPLAY/RETURN.json'
          });
        }
        return response({ ok: true, status: 'NEW_APPROVAL', replayed: false });
      }
      return response({
        ok: true,
        queued_to_worker_pool: true,
        work_item_id: 'WI-TEST-1',
        return_path: 'coordination/executions/WI-TEST-1/RETURN.json'
      });
    }
    if (String(url).includes('worker-lab.vercel.app')) {
      return response(badWake ? {
        schema: 'wrong',
        status: 'QUEUED',
        ref: 'nope',
        queued: true
      } : {
        schema: 'prometeo.ingress-transport-result/v1',
        status: 'QUEUED',
        ref: 'coordination/portfolio/evidence/prometeo-autonomous-growth/primary-chat-wakes/WI-TEST-1.json',
        queued: true,
        error: null
      });
    }
    throw new Error('unexpected url ' + url);
  }
  const context = {
    console,
    fetch,
    localStorage,
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    RegExp,
    Object,
    String,
    Number,
    Promise,
    Error,
    Event: class Event {},
    location: { href: 'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/' },
    crypto: { randomUUID: () => 'rnd' }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.PROMETEO_INGRESS_V1, calls, store };
}

const page = {
  page_id: 'control-v11-chat-canary',
  title: 'Primary Chat',
  project_id: 'prometeo-autonomous-growth',
  target_path: 'current-tree/control-v11/chat-canary/'
};
const digest = 'a'.repeat(64);
const approval = {
  schema: 'prometeo.primary-chat-approval/v1',
  decision: 'APPROVED',
  approval_id: 'APR-001',
  proposal_id: 'PLAN-001',
  proposal_digest: digest,
  approved_at: '2026-10-01T19:20:00Z'
};

// First approval and same-browser replay are idempotent; raw plan text never enters wake metadata.
{
  const { api, calls } = makeRuntime();
  const out = await api.submitApprovedPlan({ text: 'ejecutá el plan aprobado', page, approval });
  assert.equal(out.queued, true);
  assert.equal(out.status, 'QUEUED');
  assert.equal(calls.length, 4);
  assert.equal(calls[0].body.action, 'approval_replay_status');

  const capture = calls[1].body.capture;
  assert.equal(capture.id, 'primary-chat-approval-APR-001');
  assert.equal(capture.metadata.approval_id, 'APR-001');

  const prepared = calls[2].body;
  assert.equal(prepared.human_approved, true);
  assert.equal(prepared.approval.approval_id, 'APR-001');
  assert.equal(prepared.semantic_context.semantic_anchor, `primary-chat-approval:APR-001:${digest}`);

  assert.equal(JSON.stringify(calls[3].body).includes('ejecutá el plan aprobado'), false);
  assert.equal(calls[3].body.approval.approval_id, 'APR-001');

  const replay = await api.submitApprovedPlan({ text: 'ejecutá el plan aprobado', page, approval });
  assert.equal(replay.status, 'QUEUED_REPLAY');
  assert.equal(replay.queued, true);
  assert.equal(calls.length, 4);

  const conflict = await api.submitApprovedPlan({
    text: 'otro plan',
    page,
    approval: { ...approval, proposal_digest: 'b'.repeat(64) }
  });
  assert.equal(conflict.status, 'BOUNDARY_APPROVAL_REPLAY_CONFLICT');
  assert.equal(calls.length, 4);

  const rejected = await api.submitApprovedPlan({
    text: 'no ejecutes',
    page,
    approval: { ...approval, approval_id: 'APR-002', decision: 'REJECTED' }
  });
  assert.equal(rejected.status, 'BOUNDARY_APPROVAL_REJECTED');
  assert.equal(calls.length, 4);

  const ambiguous = await api.submitApprovedPlan({
    text: 'quizá',
    page,
    approval: { ...approval, approval_id: 'APR-003', decision: 'AMBIGUOUS' }
  });
  assert.equal(ambiguous.status, 'BOUNDARY_APPROVAL_REQUIRED');
  assert.equal(calls.length, 4);
}

// A fresh browser/device with no local receipt must reuse the durable server receipt and stop
// before Capture/Page Change materialization or wake.
{
  const { api, calls, store } = makeRuntime({ serverReplay: true });
  assert.equal(store.has('prometeo.primary-chat.approval.v1:APR-001'), false);
  const replay = await api.submitApprovedPlan({ text: 'ejecutá el plan aprobado', page, approval });
  assert.equal(replay.status, 'QUEUED_REPLAY');
  assert.equal(replay.queued, true);
  assert.equal(replay.ref, 'coordination/executions/WI-SERVER-REPLAY/RETURN.json');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.action, 'approval_replay_status');
}

// A fresh browser/device reusing approval_id with another digest must fail closed at the server
// preflight and must not reach Capture/Page Change/wake.
{
  const { api, calls } = makeRuntime({ serverConflict: true });
  const conflict = await api.submitApprovedPlan({
    text: 'otro plan',
    page,
    approval: { ...approval, proposal_digest: 'b'.repeat(64) }
  });
  assert.equal(conflict.status, 'BOUNDARY_APPROVAL_REPLAY_CONFLICT');
  assert.equal(conflict.queued, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.action, 'approval_replay_status');
}

// Wake failure remains fail-closed and never upgrades a non-queued result to queued=true.
{
  const { api, calls } = makeRuntime({ badWake: true });
  const out = await api.submitApprovedPlan({
    text: 'ejecutá',
    page,
    approval: { ...approval, approval_id: 'APR-FAIL', proposal_id: 'PLAN-FAIL' }
  });
  assert.equal(out.status, 'BOUNDARY_PRIVATE_STORAGE_UNAVAILABLE');
  assert.equal(out.queued, false);
  assert.equal(calls.length, 4);
}

console.log('PASS primary_chat_approval_current_v1');
