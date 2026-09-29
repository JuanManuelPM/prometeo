import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

const index = read('current-tree/control-v11/index.html');
const v11 = read('current-tree/control-v11/v11.js');
const ingressSource = read('current-tree/control-v11/ingress-v1.js');
const pageChangeSource = read('shared/capture/v1/github-change-loop.js');

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function bootIngress(transport = null) {
  const sandbox = {
    console,
    Date,
    Math,
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000009' }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  if (transport) sandbox.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = transport;
  vm.runInNewContext(ingressSource, sandbox, { filename: 'ingress-v1.js' });
  return sandbox;
}

assert.equal(count(index, 'id="commandInputV11"'), 1);
assert.equal(count(index, 'id="commandSendV11"'), 1);
assert.equal(count(index, 'id="commandStateV11"'), 1);
assert.match(v11, /PROMETEO_INGRESS_V1/);
assert.match(v11, /ingress\.submit\(\{page:commandPage\(\),text,kind:'work'\}\)/);
assert.match(v11, /result\?\.queued===true/);

const noTransport = bootIngress();
const noTransportResult = await noTransport.PROMETEO_INGRESS_V1.submit({
  page: { id: 'control-room-v11', title: 'Control Room V11' },
  text: 'private human command',
  kind: 'work'
});
assert.equal(noTransportResult.queued, false);
assert.equal(noTransportResult.status, 'BOUNDARY_AUTH_REQUIRED');
assert.equal(noTransportResult.error, 'AUTH_BRIDGE_REQUIRED');

let transportSeen = null;
const withTransport = bootIngress({
  async submit(payload) {
    transportSeen = payload;
    return {
      schema: 'prometeo.ingress-transport-result/v1',
      status: 'QUEUED',
      ref: 'coordination/page-change/ingress/r009.json',
      queued: true,
      error: null
    };
  }
});
const firstHop = await withTransport.PROMETEO_INGRESS_V1.submit({
  page: {
    id: 'control-room-v11',
    title: 'Control Room V11',
    semantic_context: { private: 'must-not-be-public' }
  },
  text: 'private human command',
  kind: 'work'
});
assert.equal(firstHop.queued, true);
assert.equal(transportSeen.private_payload.text, 'private human command');
assert.equal(JSON.stringify(transportSeen.public_envelope).includes('private human command'), false);
assert.equal(JSON.stringify(transportSeen.public_envelope).includes('must-not-be-public'), false);

const pageChangeModule = await import(
  'data:text/javascript;base64,' + Buffer.from(pageChangeSource).toString('base64')
);
const packet = {
  schema: 'prometeo.execution-packet/v2',
  work_item_id: 'work-r009-001',
  created_at: '2026-09-29T03:00:00Z',
  expires_at: '2026-09-29T04:00:00Z',
  packet_hash: 'a'.repeat(64),
  target: { page_id: 'control-room-v11' },
  authorization: { delivery_mode: 'WORKER_POOL' },
  execution: {
    protocol_id: 'PAGE_CHANGE_WORKER_V1',
    result_submission: {
      github_return_path: 'coordination/executions/work-r009-001/RETURN.json'
    }
  },
  transcript: 'PRIVATE TRANSCRIPT MUST NOT LEAK',
  attachments: [{ name: 'private.txt', signed_url: 'https://private.invalid/?token=secret' }],
  page_memory: { private: true }
};
const publicEnvelope = pageChangeModule.sanitizeExecutionPacketForGitHub(packet, {
  privateContextRef: 'ctx-r009-opaque'
});
assert.equal(publicEnvelope.schema, 'prometeo.page-change-github-envelope/v1');
assert.equal(publicEnvelope.authority.grants_authority, false);
assert.equal(publicEnvelope.authority.owner, 'EXISTING_PAGE_CHANGE_OPPORTUNITY_CLAIM');
assert.equal(JSON.stringify(publicEnvelope).includes('PRIVATE TRANSCRIPT MUST NOT LEAK'), false);
assert.equal(JSON.stringify(publicEnvelope).includes('private.txt'), false);
assert.equal(JSON.stringify(publicEnvelope).includes('token=secret'), false);

const pcSubmission = pageChangeModule.toIngressSubmission(packet, {
  privateContextRef: 'ctx-r009-opaque'
});
assert.equal(pcSubmission.kind, 'PAGE_CHANGE_METADATA_V1');
assert.equal(JSON.parse(pcSubmission.text).schema, 'prometeo.page-change-github-envelope/v1');

const scriptLoaded = /<script[^>]+src=["'][^"']*ingress-v1\.js["']/i.test(index);
const pageChangeLoaded = /github-change-loop\.js/.test(index) || /github-change-loop\.js/.test(v11);
const commandBuildsPacket =
  /prometeo\.execution-packet\/v2/.test(v11) ||
  /PROMETEO_GITHUB_CHANGE_LOOP_V1/.test(v11) ||
  /sanitizeExecutionPacketForGitHub/.test(v11) ||
  /toIngressSubmission/.test(v11);
const ingressBuildsPacket =
  /prometeo\.execution-packet\/v2/.test(ingressSource) ||
  /PROMETEO_GITHUB_CHANGE_LOOP_V1/.test(ingressSource) ||
  /sanitizeExecutionPacketForGitHub/.test(ingressSource);

assert.equal(scriptLoaded, false);
assert.equal(pageChangeLoaded, false);
assert.equal(commandBuildsPacket, false);
assert.equal(ingressBuildsPacket, false);

const report = {
  schema: 'prometeo.multipyramid-r009-test/v1',
  status: 'BOUNDARY_INTEGRATION_GAP',
  component_contracts: 'PASS',
  privacy: 'PASS_FAIL_CLOSED',
  existing_authority_preserved: true,
  blockers: [
    'INGRESS_SCRIPT_NOT_LOADED_BY_V11',
    'COMMAND_TO_EXECUTION_PACKET_BRIDGE_MISSING',
    'AUTHENTICATED_TRANSPORT_EXTERNAL'
  ],
  direction_observed: {
    v11: 'human text -> PROMETEO_INGRESS_V1.submit',
    ingress: 'text -> injected authenticated transport',
    page_change_adapter: 'existing private execution packet -> sanitized metadata -> PROMETEO_INGRESS_V1',
    missing_link: 'No bounded source builds/promotes a private prometeo.execution-packet/v2 from the V11 command path without the external authenticated Page Change service.'
  },
  truth_boundary: 'R009 diagnoses the static integration gap. It does not independently verify this worker\'s S003 primary and does not claim a live wake or authenticated browser-to-GitHub submission.'
};
console.log(JSON.stringify(report));
