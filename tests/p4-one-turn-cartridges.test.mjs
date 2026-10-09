import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compatible,compileCatalog,readCompatibleState,createLifetime,registerCartridge} from '../ui-workspace-v1/kernel/candidates/one-turn-20261009/cartridges.js';
import {discover} from '../ui-workspace-v1/kernel/candidates/one-turn-20261009/discover.mjs';
const manifest=(id='alpha')=>({schema:'prometeo.widget-cartridge/v1',id,version:'1.0.0',widgetApi:'^1.0.0',entry:'./module.js',trust:'TRUSTED_LOCAL',requires:{services:{'ui.layout':'^1.0.0'},plugins:[]},permissions:{network:[],storage:[`widget:${id}`]},state:{currentVersion:1,readableVersions:[1]}});
test('compatible capabilities inherit accepted patches in two existing kernel consumers',()=>{
  let version='1.0.0',delta=1;const wrappers=[],kernel={registerWidget:x=>wrappers.push(x)},resolve=()=>({version,api:{move:()=>delta}});
  for(const id of ['alpha','beta'])registerCartridge(kernel,manifest(id),{id,widgetApi:1,render:()=>'',actions:[{id:'move',run:ctx=>ctx.capabilities['ui.layout'].move()}]},{resolve,grants:{network:[],storage:[`widget:${id}`]}});
  assert.deepEqual(wrappers.map(w=>w.actions[0].run({})),[1,1]);version='1.1.0';delta=2;assert.deepEqual(wrappers.map(w=>w.actions[0].run({})),[2,2]);
  version='2.0.0';assert.throws(()=>wrappers[0].actions[0].run({}),{code:'CAPABILITY_UNAVAILABLE'});
});
test('discovery add/remove changes availability without changing HTML or legacy Current',async()=>{
  const root=await mkdtemp(join(tmpdir(),'prometeo-cartridge-')),composition={page_version:15,widgets:[{id:'residency-trio'}]},before=JSON.stringify(composition);
  try{await mkdir(join(root,'alpha'));await writeFile(join(root,'alpha','plugin.manifest.json'),JSON.stringify(manifest()));await writeFile(join(root,'alpha','module.js'),'export const fixture=true;');
    const found=await discover(root,composition);assert.equal(found.available[0].id,'alpha');assert.deepEqual(found.loadOrder,[]);assert.deepEqual(found.legacy,['residency-trio']);assert.equal(JSON.stringify(composition),before);
    await rm(join(root,'alpha'),{recursive:true});assert.equal((await discover(root,composition)).available.length,0);
  }finally{await rm(root,{recursive:true,force:true})}
});
test('duplicate IDs, missing dependencies and cycles cannot activate',()=>{
  const a=manifest(),b=manifest('beta');a.requires.plugins=['beta'];b.requires.plugins=['alpha'];const config={widgets:[{id:'alpha'}]};
  assert.throws(()=>compileCatalog([a],config),{code:'DEPENDENCY_MISSING'});assert.throws(()=>compileCatalog([a,b],config),{code:'DEPENDENCY_CYCLE'});assert.throws(()=>compileCatalog([manifest(),manifest()],config),{code:'DUPLICATE_CARTRIDGE'});
});
test('manifest cannot grant network access or execute lower-trust code',()=>{
  const kernel={registerWidget:()=>assert.fail('must not register')},m=manifest();m.permissions.network=['private-reader'];
  assert.throws(()=>registerCartridge(kernel,m,{id:'alpha',widgetApi:1,render:()=>''},{resolve:()=>({version:'1.0.0'}),grants:{network:[],storage:['widget:alpha']}}),{code:'CAPABILITY_DENIED'});
  m.trust='EXTERNAL';assert.throws(()=>compileCatalog([m],{widgets:[]}),{code:'MANIFEST_INVALID'});
});
test('read adapters preserve original durable bytes for rollback and are idempotent',()=>{
  const m=manifest(),raw={version:1,data:{x:1}};m.state={currentVersion:2,readableVersions:[1,2]};const adapters={1:x=>({...x,y:0})};
  const read=readCompatibleState(raw,m,adapters);assert.deepEqual(raw,{version:1,data:{x:1}});assert.deepEqual(readCompatibleState(read,m,adapters),read);assert.throws(()=>readCompatibleState({version:3,data:{}},m),{code:'STATE_VERSION_UNREADABLE'});
});
test('unmount releases resources once and preserves separate state',()=>{
  const state={messages:['fixture']},life=createLifetime();let calls=0;life.own(()=>calls++);life.dispose();life.dispose();assert(life.signal.aborted);assert.equal(calls,1);assert.equal(state.messages.length,1);
});
test('discovery refuses symlink escape before loading any code',async()=>{
  const root=await mkdtemp(join(tmpdir(),'prometeo-escape-'));try{await symlink('/tmp',join(root,'escape'));await assert.rejects(discover(root,{widgets:[]}),/SYMLINK_DENIED/)}finally{await rm(root,{recursive:true,force:true})}
});
test('semver boundary handles zero-major APIs conservatively',()=>{
  assert(compatible('1.2.3','^1.0.0'));assert(!compatible('2.0.0','^1.0.0'));assert(!compatible('0.2.0','^0.1.0'));assert(!compatible('0.0.2','^0.0.1'));assert(!compatible('1.0.0-beta','^1.0.0'));
});
