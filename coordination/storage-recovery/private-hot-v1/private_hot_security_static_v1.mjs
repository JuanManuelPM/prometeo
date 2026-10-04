import assert from 'node:assert/strict';
import fs from 'node:fs';

const edgePath='coordination/storage-recovery/private-hot-v1/edge-function/index.ts';
const contractPath='coordination/storage-recovery/private-hot-v1/CONTRACT.json';
const schemaPath='coordination/storage-recovery/private-hot-v1/schema.sql';

const edge=fs.readFileSync(edgePath,'utf8');
const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));
const schema=fs.readFileSync(schemaPath,'utf8');

assert.match(edge,/npm:\@supabase\/supabase-js@2\.117\.2/,'supabase-js must be exactly pinned');
assert.match(edge,/PROMETEO_PRIMARY_HOT_WORKSPACE_SECRET_SHA256/,'server-side allowed workspace hash is mandatory');
assert.match(edge,/function\s+workspaceGuardConfigured\s*\(/,'workspace guard helper required');
assert.match(edge,/function\s+timingSafeEqual\s*\(/,'timing-safe comparison helper required');
assert.match(edge,/if\s*\(!workspaceGuardConfigured\(\)\)[\s\S]*WORKSPACE_GUARD_NOT_CONFIGURED/,'missing workspace guard must fail closed');
assert.match(edge,/if\s*\(!timingSafeEqual\(secretHash,\s*WORKSPACE_SECRET_SHA256\)\)[\s\S]*WORKSPACE_AUTH_FAILED/,'random bearer must fail before workspace lookup/create');

const guardAt=edge.indexOf('if (!timingSafeEqual(secretHash, WORKSPACE_SECRET_SHA256))');
const queryAt=edge.indexOf('db.from(WORKSPACES).select("id,secret_hash")');
const insertAt=edge.indexOf('db.from(WORKSPACES).insert({ secret_hash: secretHash })');
assert.ok(guardAt >= 0 && queryAt > guardAt && insertAt > guardAt,'auth guard must precede workspace read/create');

assert.equal(contract.status,'PREPARED_NOT_DEPLOYED_SECURITY_RATCHETED');
assert.equal(contract.security?.fail_closed_if_workspace_guard_missing,true);
assert.equal(contract.security?.deployment_auth_mode,'CUSTOM_AUTH_VERIFY_JWT_FALSE');
assert.match(String(contract.privacy?.workspace_auth||''),/Random bearer secrets cannot self-provision/);
assert.ok(contract.deployment_gate.some(x=>/PROMETEO_PRIMARY_HOT_WORKSPACE_SECRET_SHA256/.test(x)),'deployment must configure workspace hash');
assert.ok(contract.deployment_gate.some(x=>/verify_jwt=false/.test(x)),'deployment auth mode must be explicit');

assert.match(schema,/enable row level security/);
assert.match(schema,/revoke all on public\.prometeo_primary_hot_workspaces_v1 from anon, authenticated/);
assert.match(schema,/revoke all on public\.prometeo_primary_hot_requests_v1 from anon, authenticated/);
assert.doesNotMatch(schema,/create\s+trigger/i,'HOT schema must not add write-on-read or background triggers');

console.log(JSON.stringify({
  schema:'prometeo.private-hot-security-static/v1',
  status:'PASS',
  checks:12,
  authority:'STATIC_SECURITY_RATCHET_ONLY'
}));
