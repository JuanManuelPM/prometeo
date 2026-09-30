import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/agent-runtime-v3.yml','utf8');

assert.doesNotMatch(
  workflow,
  /- ['"]coordination\/\*\*['"]/,
  'Agent Runtime publish must not rebuild for every coordination write'
);

for(const required of [
  "coordination/NOW.json",
  "coordination/DELTA_FEED.json",
  "coordination/AGENT_RUNTIME.json",
  "coordination/EXECUTION_PROFILES.json",
  "coordination/GLOBAL_AGENT_CONSTITUTION_V1.md",
  "coordination/network/workers/**",
  "coordination/workstreams/**",
  "catalog/pages.json",
  "scripts/build-agent-runtime.mjs",
  "scripts/agent-network-lib.mjs",
  "scripts/augment-agent-runtime-v4.mjs"
]){
  assert.ok(workflow.includes(`- '${required}'`), `missing runtime trigger dependency: ${required}`);
}

assert.match(
  workflow,
  /node tests\/agent-runtime-publish-trigger-scope-v1\.test\.mjs/,
  'workflow must execute its trigger-scope regression'
);

console.log('AGENT_RUNTIME_TRIGGER_SCOPE_PASS');
