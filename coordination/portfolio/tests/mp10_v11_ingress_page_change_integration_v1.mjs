import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const read = async rel => readFile(new URL(rel, root), 'utf8');

const [indexHtml, ingressSource, v11Source, githubChangeSource] = await Promise.all([
  read('current-tree/control-v11/index.html'),
  read('current-tree/control-v11/ingress-v1.js'),
  read('current-tree/control-v11/v11.js'),
  read('shared/capture/v1/github-change-loop.js')
]);

const ingressPos = indexHtml.indexOf('<script src="./ingress-v1.js"></script>');
const v11Pos = indexHtml.indexOf('<script type="module" src="./v11.js"></script>');
assert.ok(ingressPos >= 0, 'V11 must load ingress-v1.js');
assert.ok(v11Pos > ingressPos, 'ingress-v1.js must load before v11.js');
assert.match(v11Source, /window\.PROMETEO_INGRESS_V1/);
assert.match(v11Source, /result\?\.queued===true/);

const sandbox = {
  console,
  Date,
  Math,
  crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' }
};
vm.createContext(sandbox);
vm.runInContext(ingressSource, sandbox, { filename: 'ingress-v1.js' });
assert.equal(sandbox.PROMETEO_INGRESS_V1?.schema, 'prometeo.browser-ingress/v1');

const secret = 'PRIVATE HUMAN COMMAND MUST NOT LEAK';
const page = {
  id: 'control-room-v11',
  title: 'Control Room V11',
  href: 'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/',
  transcript: 'PRIVATE TRANSCRIPT MUST NOT LEAK',
  token: 'PRIVATE TOKEN MUST NOT LEAK'
};

const noTransport = await sandbox.PROMETEO_INGRESS_V1.submit({ page, text: secret, kind: 'work' });
assert.equal(noTransport.queued, false);
assert.equal(noTransport.status, 'BOUNDARY_AUTH_REQUIRED');
assert.equal(noTransport.error, 'AUTH_BRIDGE_REQUIRED');

const githubChange = await import('data:text/javascript;base64,' + Buffer.from(githubChangeSource).toString('base64'));
const publicEnvelope = githubChange.sanitizeExecutionPacketForGitHub({
  schema: 'prometeo.execution-packet/v2',
  work_item_id: 'WI-MP10-V11-TEST',
  thread_id: 'PRIVATE-THREAD',
  created_at: '2026-09-29T04:00:00Z',
  expires_at: '2026-10-06T04:00:00Z',
  packet_hash: 'a'.repeat(64),
  target: { page_id: 'control-room-v11', page_title: 'PRIVATE TITLE' },
  intent: { selected_capture_revisions: [{ transcript: secret }] },
  context: { page_memory: { rolling_summary: 'PRIVATE MEMORY' } },
  execution: {
    protocol_id: 'prometeo.agent-execution-protocol:v1',
    result_submission: { github_return_path: 'coordination/executions/WI-MP10-V11-TEST/RETURN.json' }
  },
  authorization: { delivery_mode: 'WORKER_POOL', secret: 'PRIVATE AUTH' }
}, { privateContextRef: 'bridge:WI-MP10-V11-TEST' });
assert.equal(publicEnvelope.authority.grants_authority, false);
const publicEnvelopeText = JSON.stringify(publicEnvelope);
for (const forbidden of [secret, 'PRIVATE-THREAD', 'PRIVATE TITLE', 'PRIVATE MEMORY', 'PRIVATE AUTH']) {
  assert.equal(publicEnvelopeText.includes(forbidden), false, 'public Page Change envelope leaked private data');
}

let publicIngressEnvelope = null;
let pageChangeSubmission = null;
sandbox.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {
  async submit({ public_envelope, private_payload }) {
    publicIngressEnvelope = public_envelope;
    assert.equal(JSON.stringify(public_envelope).includes(secret), false);
    assert.equal(private_payload.text, secret);

    const packet = {
      schema: 'prometeo.execution-packet/v2',
      work_item_id: 'WI-MP10-V11-TEST',
      created_at: '2026-09-29T04:00:00Z',
      expires_at: '2026-10-06T04:00:00Z',
      packet_hash: 'b'.repeat(64),
      target: { page_id: 'control-room-v11' },
      execution: {
        protocol_id: 'prometeo.agent-execution-protocol:v1',
        result_submission: { github_return_path: 'coordination/executions/WI-MP10-V11-TEST/RETURN.json' }
      },
      authorization: { delivery_mode: 'WORKER_POOL' },
      private_command: private_payload.text
    };
    const adapter = githubChange.createGitHubChangeLoopTransport({
      ingress: {
        async submit(payload) {
          pageChangeSubmission = payload;
          assert.equal(payload.kind, 'PAGE_CHANGE_METADATA_V1');
          assert.equal(payload.text.includes(secret), false);
          return {
            status: 'QUEUED',
            queued: true,
            ref: 'coordination/opportunities/claims/page-change-WI-MP10-V11-TEST.json'
          };
        }
      }
    });
    const result = await adapter.submit(packet, { privateContextRef: 'bridge:WI-MP10-V11-TEST' });
    return {
      schema: 'prometeo.ingress-transport-result/v1',
      status: result.status,
      queued: result.queued,
      ref: result.ref,
      error: result.error
    };
  }
};

const queued = await sandbox.PROMETEO_INGRESS_V1.submit({ page, text: secret, kind: 'work' });
assert.equal(queued.queued, true);
assert.equal(queued.ref, 'coordination/opportunities/claims/page-change-WI-MP10-V11-TEST.json');
assert.equal(publicIngressEnvelope.privacy.raw_text_public, false);
assert.equal(Object.hasOwn(publicIngressEnvelope.page, 'transcript'), false);
assert.equal(Object.hasOwn(publicIngressEnvelope.page, 'token'), false);
assert.ok(pageChangeSubmission);
assert.equal(pageChangeSubmission.text.includes(secret), false);

console.log(JSON.stringify({
  schema: 'prometeo.mp10-v11-ingress-page-change-integration-test/v1',
  result: 'PASS',
  checks: {
    ingress_loaded_before_v11: true,
    v11_success_requires_queued_true: true,
    no_transport_fail_closed: true,
    raw_command_not_public: true,
    page_change_public_envelope_grants_authority: false,
    injected_trusted_bridge_compatible: true
  }
}));
