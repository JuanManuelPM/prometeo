import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const readJson=async path=>JSON.parse(await readFile(new URL(`../${path}`,import.meta.url),'utf8'));

const [current,lineage,capabilities,manifest,authority]=await Promise.all([
  readJson('state/CURRENT_GRAPH.json'),
  readJson('lineage/LINEAGE_GRAPH.json'),
  readJson('lineage/CAPABILITY_REGISTRY.json'),
  readJson('navigator/MANIFEST.json'),
  readJson('coordination/PART1_AUTHORITY.json')
]);

const v23=current.artifacts['navigator-v23-physics'];
const v53=current.artifacts['navigator-v53-visible'];
const served=current.artifacts['p3-served-release'];

assert.equal(current.revision,17,'R04 authority guard must be reviewed if Current Graph schema/state advances materially');
assert.equal(v23.state,'HUMAN_ACCEPTED');
assert.equal(v23.source,'sha256:f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398');
assert.equal(current.pointers.human_accepted_physics.artifact_id,'navigator-v23-physics');

assert.equal(v53.state,'PRIOR_HUMAN_SELECTED_VISIBLE_BASE');
assert.equal(v53.source,'gitblob:7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418');
assert.equal(current.pointers.visible_frontend_current.artifact_id,'navigator-v53-visible');

assert.equal(served.state,'SERVED');
assert.equal(current.pointers.served_current.artifact_id,'p3-served-release');
assert.equal(served.navigator_identity,'sha256:31a19bb574957b84d0543b335d8f493bb025912a0cac548ea8c8ecbd6189fbfd');

assert.notEqual(current.pointers.visible_frontend_current.artifact_id,current.pointers.human_accepted_physics.artifact_id,'Visible Current and Human Accepted physics must remain separate authorities');
assert.notEqual(current.pointers.served_current.artifact_id,current.pointers.human_accepted_physics.artifact_id,'Served and Human Accepted physics must not collapse');

assert.equal(manifest.schema,'prometeo.reconstruction-candidate/v1');
assert.equal(manifest.status,'CANDIDATE_NOT_HUMAN_ACCEPTED');
assert.equal(manifest.baseline.filename,'PROMETEO_V50_VERTICAL_X_LOCK_RIGHTMOST_SEAL.html');
assert.equal(manifest.baseline.sha256,'85968e5ccdea0b56ac37ee77a3e1e0562c9e65c8218c11e6d2eb0b6e6605b187');
assert.equal(manifest.baseline.preserved,true);
assert.match(manifest.promotion,/Do not replace HUMAN_ACCEPTED_BASELINE until explicit human acceptance/);

assert.equal(authority.visible_frontend.git_blob_sha,'7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418');
assert.equal(authority.visible_frontend.mutation_policy_part1,'BYTE_IDENTICAL; adapters only');
assert.equal(authority.physics_oracle.sha256,'f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398');
assert.match(authority.physics_oracle.scope,/not visible-product current/);
assert.match(authority.design_system.mount_policy,/OPT_IN/);
assert.match(authority.design_system.mount_policy,/do not attach Touch-First V2 or Material V2 globally/);
assert.equal(authority.shell_authority.visible_shell,'V53 native .terminal + .terminal-frame + .return-tooth');

const node=id=>lineage.nodes.find(item=>item.id===id);
const edge=(from,to)=>lineage.edges.find(item=>item.from===from&&item.to===to);
const v23Node=node('navigator-v23-physics');
const v53Node=node('navigator-v53-visible');
assert.ok(v23Node&&v53Node,'Navigator authority nodes must remain in Lineage Graph');
assert.equal(v23Node.authority,'HUMAN_ACCEPTED_EXACT_CHECKPOINT');
assert.equal(v23Node.role,'PHYSICS_ORACLE_AND_ROLLBACK_DONOR');
assert.deepEqual(v23Node.human_accepted_scope,['folder-stack-physics']);
assert.equal(v53Node.role,'CANONICAL_VISIBLE_FRONTEND_BASE');
assert.deepEqual(v53Node.human_accepted_scope,[]);
const visibleEdge=edge('navigator-v53-visible','navigator-v23-physics');
assert.ok(visibleEdge,'V53 -> V23 scoped supersession edge must remain explicit');
assert.equal(visibleEdge.scope,'visible_frontend_only');
assert.match(visibleEdge.note,/Does not supersede V23 physics-oracle scope/);

const cap=id=>capabilities.capabilities.find(item=>item.id===id);
const visibleCap=cap('navigation.visible_frontend');
const physicsCap=cap('navigation.folder_stack_physics');
assert.ok(visibleCap&&physicsCap);
assert.equal(visibleCap.best_known,'navigator-v53-visible');
assert.equal(visibleCap.human_accepted,null);
assert.equal(visibleCap.rollback_donor,'navigator-v23-physics');
assert.equal(physicsCap.best_known,'navigator-v23-physics');
assert.equal(physicsCap.human_accepted,'navigator-v23-physics');

console.log(JSON.stringify({
  ok:true,
  guard:'spatial-navigator-r04-authority',
  v23:'HUMAN_ACCEPTED_PHYSICS_ONLY',
  v50:'PRESERVED_RECONSTRUCTION_BASE_ONLY',
  v53:'VISIBLE_BASE',
  served:'DISTINCT_RELEASE_STATE'
},null,2));
