#!/usr/bin/env node
import assert from 'node:assert/strict';

const base = 'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/chat-canary/';
async function get(path='') {
  const url = base + path + (path.includes('?') ? '&' : '?') + 'c010=' + Date.now();
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  const text = await response.text();
  assert.equal(response.ok, true, `HTTP ${response.status} for ${url}`);
  return { response, text, url };
}

const page = await get('');
assert.match(page.text, /continuity-capsule-v1\.js/);
assert.match(page.text, /response-request-v1\.js/);
assert.match(page.text, /rich-response-v1\.js/);
assert.match(page.text, /progress-v1\.js/);
assert.match(page.text, /submitResponseRequest/);

const request = await get('response-request-v1.js');
assert.match(request.text, /PROMETEO_PRIMARY_CHAT_RESPONSE_REQUEST_V1/);
assert.match(request.text, /CURRENT_WORK_GRAPH/);
assert.match(request.text, /raw_text_public/);

const rich = await get('rich-response-v1.js');
assert.match(rich.text, /PROMETEO_PRIMARY_CHAT_RICH_RESPONSE_V1/);
assert.match(rich.text, /experiment_stats/);

const continuity = await get('continuity-capsule-v1.js');
assert.match(continuity.text, /PROMETEO_PRIMARY_CHAT_CONTINUITY_V1/);

console.log('PRIMARY_CHAT_INDEPENDENCE_C010_PUBLIC_HTTP_PASS');
console.log(JSON.stringify({
  page_status: page.response.status,
  request_status: request.response.status,
  rich_status: rich.response.status,
  continuity_status: continuity.response.status,
  served_wiring: true
}));
