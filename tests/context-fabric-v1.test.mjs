import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertPublicSafe,buildContextFabric,compileContext,parseArtifact,validateFabric,sha256} from '../scripts/context-fabric-lib.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const fixture=path.join(here,'fixtures/context-fabric/repo');
const config={schema:'prometeo.context-fabric-config/v1',generator_version:'test/v1',query_plan_version:'TEST-Q0-Q10',include_roots:['coordination'],allowed_extensions:['.json','.md'],default_privacy_class:'PUBLIC_COORDINATION_ONLY',default_allowed_privacy:['PUBLIC_COORDINATION_ONLY'],default_budget:{max_selected_files:3,hard_max_selected_files:8},role_kernel_refs:{worker:['coordination/GLOBAL_AGENT_CONSTITUTION_V1.md']},authority_rules:[{path:'coordination/GLOBAL_AGENT_CONSTITUTION_V1.md',class:'GOVERNING_CONTRACT'}]};

// 1 deterministic build and valid hashes.
const a=buildContextFabric({repoRoot:fixture,config,sourceHead:'HEAD-1'}); const b=buildContextFabric({repoRoot:fixture,config,sourceHead:'HEAD-1'});
assert.equal(a.buildState.index_hash,b.buildState.index_hash); assert.deepEqual(a,b); assert.equal(validateFabric(a).ok,true);

// 2 durable identity survives rename; path fallback would not.
{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cf-id-')); fs.mkdirSync(path.join(tmp,'coordination'));
 fs.writeFileSync(path.join(tmp,'coordination/a.json'),JSON.stringify({artifact_id:'SAME-ID',privacy_class:'PUBLIC_COORDINATION_ONLY'}));
 const x=parseArtifact({repoRoot:tmp,relPath:'coordination/a.json',sourceHead:'H',config}); fs.renameSync(path.join(tmp,'coordination/a.json'),path.join(tmp,'coordination/b.json'));
 const y=parseArtifact({repoRoot:tmp,relPath:'coordination/b.json',sourceHead:'H',config}); assert.equal(x.artifact_id,y.artifact_id); assert.match(x.identity_basis,/artifact:SAME-ID/);
}

// 3 sparse graph derives explicit contradiction/dependency, never inferred semantic edges.
assert.ok(a.graph.edges.some(e=>e.edge_type==='CONTRADICTS' && e.dst_ref==='coordination/current.json'));
assert.ok(a.graph.edges.some(e=>e.edge_type==='DEPENDS_ON' && e.dst_ref==='coordination/current.json'));

// 4 public compilation excludes private artifact even when lexically attractive.
const compiled=compileContext({inventory:a.inventory,graph:a.graph,buildState:a.buildState,config,actorRole:'worker',mission:'Context Fabric secret super relevant authority project-x',projectId:'project-x',requiredRefs:['coordination/dependency.json'],expectedSourceHead:'HEAD-1',maxFiles:3});
assert.ok(!compiled.receipt.selected_artifacts.some(x=>x.path==='coordination/private.json'));
assert.equal(compiled.receipt.selection_provenance,'AUTOMATED_CONTEXT_COMPILER');

// 5 mandatory closure cannot be budget-pruned: kernel + required dependency + DEPENDS_ON current + CONTRADICTS candidate.
const tight=compileContext({inventory:a.inventory,graph:a.graph,buildState:a.buildState,config,actorRole:'worker',mission:'worker authority',requiredRefs:['coordination/dependency.json'],expectedSourceHead:'HEAD-1',maxFiles:1});
const paths=new Set(tight.receipt.selected_artifacts.map(x=>x.path));
for(const p of ['coordination/GLOBAL_AGENT_CONSTITUTION_V1.md','coordination/dependency.json','coordination/current.json','coordination/candidate.json']) assert.ok(paths.has(p),`mandatory missing ${p}`);
assert.equal(tight.receipt.budget.budget_exceeded_by_mandatory,true);

// 6 contradictions are surfaced, not merely both files selected.
assert.ok(tight.receipt.contradictions.some(x=>x.target_ref==='coordination/current.json'));

// 7 stale index fails closed.
assert.throws(()=>compileContext({inventory:a.inventory,graph:a.graph,buildState:a.buildState,config,mission:'x',expectedSourceHead:'HEAD-2'}),/STALE_INDEX_FAIL_CLOSED/);

// 8 receipt has hashes, explicit omissions/budget/provenance and deterministic id.
assert.match(compiled.receipt.index_hash,/^[0-9a-f]{64}$/); assert.ok(Array.isArray(compiled.receipt.omitted_but_available_refs)); assert.ok(compiled.receipt.candidate_counts); const compiled2=compileContext({inventory:a.inventory,graph:a.graph,buildState:a.buildState,config,actorRole:'worker',mission:'Context Fabric secret super relevant authority project-x',projectId:'project-x',requiredRefs:['coordination/dependency.json'],expectedSourceHead:'HEAD-1',maxFiles:3}); assert.equal(compiled.receipt.receipt_id,compiled2.receipt.receipt_id);

// 9 content mutation changes deterministic index hash.
{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cf-mut-')); fs.cpSync(fixture,tmp,{recursive:true}); const p=path.join(tmp,'coordination/candidate.json'); fs.appendFileSync(p,'\n'); const changed=buildContextFabric({repoRoot:tmp,config,sourceHead:'HEAD-1'}); assert.notEqual(changed.buildState.index_hash,a.buildState.index_hash);
}

// 10 mandatory closure fails closed if it exceeds the hard cap.
{ const tiny={...config,default_budget:{max_selected_files:1,hard_max_selected_files:2}}; assert.throws(()=>compileContext({inventory:a.inventory,graph:a.graph,buildState:a.buildState,config:tiny,actorRole:'worker',mission:'x',requiredRefs:['coordination/dependency.json'],expectedSourceHead:'HEAD-1'}),/MANDATORY_CLOSURE_EXCEEDS_HARD_BUDGET/); }

// 11 no generated/vector/database dependency in P1 implementation contract.
const source=fs.readFileSync(path.join(here,'../scripts/context-fabric-lib.mjs'),'utf8'); assert.ok(!/pgvector|embedding_provider|openai/i.test(source)); assert.equal(sha256('x').length,64);

// 12 privacy guard detects secret-shaped object fields but does not reject harmless vocabulary tokens.
assert.equal(assertPublicSafe({search_tokens:['password','access_token'],note:'documentation only'}),true);
assert.throws(()=>assertPublicSafe({password:'secret'}),/PUBLIC_CONTEXT_PRIVACY_VIOLATION/);
assert.throws(()=>assertPublicSafe({authorization:'Bearer abc'}),/PUBLIC_CONTEXT_PRIVACY_VIOLATION/);

console.log(JSON.stringify({ok:true,tests:12,contract:'context-fabric-lite-p1',index_hash:a.buildState.index_hash,selected:tight.receipt.file_count},null,2));
