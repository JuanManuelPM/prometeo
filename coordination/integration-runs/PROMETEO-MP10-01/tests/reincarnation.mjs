import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../');

function read(rel){
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function json(rel){
  return JSON.parse(read(rel));
}
const results=[];
function check(id, ok, evidence){
  results.push({id,status:ok?'PASS':'FAIL',evidence});
}

const configText=read('current-tree/control-v11/config-v1.js');
const dataLayerText=read('current-tree/control-v11/data-layer.js');
const contextIndex=json('coordination/project-context-v1/INDEX.json');
const closure=json('coordination/storage-recovery/github-native-v1/CLOSURE_PACK_CONTRACT.json');
const fresh=json('coordination/workers/WORKER_FRESH_LAUNCH_POLICY_V1.json');

check(
  'github_candidate_sources_named',
  configText.includes("sourcePreference:Object.freeze(['rpc','github','last-good'])") &&
  configText.includes("githubRawBase:") &&
  configText.includes("githubPagesBase:"),
  'V11 config explicitly names rpc -> github -> last-good and GitHub raw/pages bases.'
);

check(
  'rpc_path_preserved',
  configText.includes("rpcBase:") && configText.includes("pageChangeEndpoint:"),
  'Legacy live RPC/Page Change endpoints remain present; the candidate does not falsely delete them.'
);

check(
  'data_layer_abi_preserved',
  dataLayerText.includes("window.PROMETEO_DATA_V11={load,refresh,readCache}") &&
  dataLayerText.includes("async function githubFallback"),
  'PROMETEO_DATA_V11 ABI is intact and GitHub fallback code exists.'
);

check(
  'unknown_not_zero',
  dataLayerText.includes("observed_at:null") &&
  dataLayerText.includes("status:'unavailable'") &&
  dataLayerText.includes("status:'last-good'"),
  'Unavailable/stale source state uses explicit status/null timestamps instead of synthetic numeric zero.'
);

check(
  'project_context_non_authoritative',
  contextIndex.projection_status==='NON_AUTHORITATIVE_PROJECTION' &&
  typeof contextIndex.authority_boundary==='string' &&
  contextIndex.projects.every(p=>p.context_ref && p.source_ref && p.source_updated_at),
  'Project context is an orientation projection with source refs/freshness, not a truth owner.'
);

const configuredLower='coordination/project-context-v1/index.json';
const actualUpper='coordination/project-context-v1/INDEX.json';
check(
  'configured_project_context_path_exists_exactly',
  fs.existsSync(path.join(root, configuredLower)),
  fs.existsSync(path.join(root, configuredLower))
    ? configuredLower+' exists.'
    : configuredLower+' is missing while '+actualUpper+' exists; GitHub case-sensitive delivery would not resolve the configured target.'
);

check(
  'closure_pack_cannot_restore_liveness',
  closure.export_mode==='ALLOWLIST_FAIL_CLOSED' &&
  String(closure.authority_boundary||'').includes('does not own') &&
  String(closure.authority_boundary||'').includes('liveness'),
  'Closure packs are compact public evidence only and explicitly do not own liveness.'
);

check(
  'fresh_worker_identity_required',
  fresh.fresh_identity?.atomic_uniqueness_gate?.includes('CREATE coordination/workers/beacons/') &&
  fresh.fresh_identity?.freeze_after_success===true &&
  Array.isArray(fresh.replay_guards) &&
  fresh.replay_guards.some(x=>x.includes('historical evidence only')),
  'A reincarnated worker must CREATE its own fresh beacon; historical RETURN/exam evidence cannot become current liveness.'
);

const historicalLivenessRestored = !results.find(r=>r.id==='fresh_worker_identity_required')?.status==='PASS';
const pass=results.every(r=>r.status==='PASS');
const report={
  schema:'prometeo.reincarnation-static-test/v1',
  run_id:'PROMETEO-MP10-01',
  reallocation_slot:'R008',
  pass,
  orientation_ready:pass,
  historical_liveness_restored:false,
  results
};
console.log(JSON.stringify(report,null,2));
if(!pass)process.exitCode=1;
