import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(path,extras={}){
  if(path instanceof URL) path=path.pathname;
  const context={console,structuredClone,setTimeout,clearTimeout,Date,Math,...extras};
  context.globalThis=context;context.window=context;
  vm.createContext(context);vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});return context;
}

// Persistence: staged identity + stale revision + fallback memory.
{
  const c=load(new URL('../shared/runtime/persistence/v1/persistence.js',import.meta.url));
  const P=c.PrometeoPersistence;
  assert.equal(P.read('class','x',{defaultValue:null}),null);
  const tx=P.stage('class','x',{n:1},{version:'1'}); const r=P.commit(tx);assert.equal(r.revision,1);
  assert.equal(P.read('class','x').n,1);
  assert.throws(()=>P.stage('class','x',{n:2},{baseRevision:0}),e=>e.code==='PROMETEO_STALE_STATE_WRITE');
  P.write('class','x',{n:2},{baseRevision:1});assert.equal(P.read('class','x').n,2);
}

// Context Foundry: authority order + LOCAL fail-closed export.
{
  const c=load(new URL('../shared/context-foundry/v1/context-foundry.js',import.meta.url)); const F=c.PrometeoContextFoundry;
  F.add({id:'accepted',authority:'HUMAN_ACCEPTED_EXACT_CHECKPOINT',privacy:'PROJECT',tags:['nav'],roles:['all'],sources:['sha:x']});
  F.add({id:'guess',authority:'INFERENCE',privacy:'PROJECT',tags:['nav'],roles:['all']});
  assert.deepEqual(Array.from(F.select({tags:['nav']}).map(x=>x.id)),['accepted','guess']);
  F.add({id:'secret',authority:'EXPLICIT_HUMAN_DECISION',privacy:'LOCAL',tags:['private'],roles:['all']});
  assert.throws(()=>F.exportBundle({tags:['private']}),e=>e.code==='PROMETEO_LOCAL_EXPORT_BLOCKED');
}

// Classes: answer, hint, postpone and unlock without fake progress.
{
  const c=load(new URL('../shared/classes/v1/class-engine.js',import.meta.url)); const C=c.PrometeoClasses;
  const rt=C.create({id:'c1',topics:[{id:'t1',title:'T',exercises:[{id:'e1',prompt:'1+1',correctAnswer:'2',hints:['x']},{id:'e2',prompt:'2+2',correctAnswer:'4'},{id:'e3',prompt:'3+3',correctAnswer:'6'}]}]});
  let s=rt.getState();assert.equal(s.exercises.e1.status,'AVAILABLE');assert.equal(s.exercises.e2.status,'LOCKED');
  rt.dispatch({type:'HINT',exerciseId:'e1'});rt.dispatch({type:'ANSWER',exerciseId:'e1',answer:'9'});assert.equal(rt.progress().done,0);
  rt.dispatch({type:'ANSWER',exerciseId:'e1',answer:'2'});s=rt.getState();assert.equal(s.exercises.e2.status,'AVAILABLE');
  rt.dispatch({type:'POSTPONE',exerciseId:'e2'});s=rt.getState();assert.equal(s.exercises.e3.status,'AVAILABLE');assert.equal(rt.progress().done,1);
}

// Student World: prerequisites are semantic, coordinates irrelevant.
{
  const c=load(new URL('../shared/student-world/v1/student-world.js',import.meta.url));const W=c.PrometeoStudentWorld;
  const rt=W.create({id:'w1',nodes:[{id:'a',title:'A'},{id:'b',title:'B',requires:['a']},{id:'c',title:'C',requires:['b']}]});
  assert.equal(rt.getState().status.b.state,'LOCKED');
  rt.dispatch({type:'COMPLETE',nodeId:'a'});assert.equal(rt.getState().status.b.state,'AVAILABLE');
  rt.dispatch({type:'ENTER',nodeId:'b'});rt.dispatch({type:'COMPLETE',nodeId:'b'});assert.equal(rt.getState().status.c.state,'AVAILABLE');
}

console.log(JSON.stringify({ok:true,engines:['persistence','context-foundry','classes','student-world']},null,2));
