/* Prometeo Persistence v1 — CANDIDATE
   Durable browser-side state with namespaced keys, schema/version, staged writes,
   migration hooks and append-only receipts. It never upgrades HUMAN_ACCEPTED.
*/
((global)=>{
  'use strict';
  if(global.PrometeoPersistence) return;

  const PREFIX='prometeo.v1';
  const receipts=[];
  const memory=new Map();
  const migrations=new Map();

  const now=()=>new Date().toISOString();
  const key=(namespace,id)=>`${PREFIX}:${namespace}:${id}`;
  const storage=()=>{
    try{
      const s=global.localStorage;
      const probe=`${PREFIX}:probe`;
      s.setItem(probe,'1'); s.removeItem(probe); return s;
    }catch{return null;}
  };
  const readRaw=k=>{
    const s=storage();
    if(s){ const v=s.getItem(k); if(v!==null) return v; }
    return memory.get(k)??null;
  };
  const writeRaw=(k,v)=>{
    const s=storage();
    if(s){s.setItem(k,v); return 'localStorage';}
    memory.set(k,v); return 'memory';
  };
  const removeRaw=k=>{const s=storage(); if(s)s.removeItem(k); memory.delete(k);};

  function registerMigration(namespace,fromVersion,toVersion,fn){
    if(typeof fn!=='function') throw new Error('Migration must be a function');
    migrations.set(`${namespace}:${fromVersion}->${toVersion}`,fn);
  }

  function migrate(namespace,envelope,targetVersion){
    let out=envelope;
    let guard=0;
    while(out.version!==targetVersion){
      if(++guard>50) throw new Error('Migration cycle');
      const candidates=[...migrations.entries()].filter(([k])=>k.startsWith(`${namespace}:${out.version}->`));
      if(!candidates.length) throw new Error(`No migration for ${namespace} ${out.version} -> ${targetVersion}`);
      const [edge,fn]=candidates[0];
      const to=edge.split('->')[1];
      out={...out,version:to,data:fn(structuredClone(out.data)),migratedAt:now()};
    }
    return out;
  }

  function read(namespace,id,{version=null,defaultValue=null}={}){
    const raw=readRaw(key(namespace,id));
    if(raw===null) return defaultValue;
    let envelope;
    try{envelope=JSON.parse(raw);}catch{throw new Error(`Corrupt state ${namespace}/${id}`);}
    if(!envelope || envelope.schema!=='prometeo.persisted-state/v1') throw new Error(`Invalid state envelope ${namespace}/${id}`);
    if(version && envelope.version!==version) envelope=migrate(namespace,envelope,version);
    return structuredClone(envelope.data);
  }

  function stage(namespace,id,data,{version='1',privacy='LOCAL',baseRevision=null,meta={}}={}){
    const txId=`tx-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    const currentRaw=readRaw(key(namespace,id));
    let current=null;
    if(currentRaw){try{current=JSON.parse(currentRaw);}catch{}}
    const revision=(current?.revision||0)+1;
    if(baseRevision!=null && current?.revision!==baseRevision){
      const e=new Error(`Stale write ${namespace}/${id}: expected ${baseRevision}, current ${current?.revision??0}`);
      e.code='PROMETEO_STALE_STATE_WRITE'; throw e;
    }
    const envelope={
      schema:'prometeo.persisted-state/v1',namespace,id,version,privacy,revision,
      stagedAt:now(),data:structuredClone(data),meta:{...meta}
    };
    writeRaw(key('staging',txId),JSON.stringify(envelope));
    receipts.push({type:'STATE_STAGE',txId,namespace,id,version,revision,privacy,at:now()});
    return Object.freeze({txId,namespace,id,revision,version,privacy});
  }

  function commit(tx){
    const raw=readRaw(key('staging',tx.txId));
    if(!raw){const e=new Error('Missing staged transaction');e.code='PROMETEO_STAGE_MISSING';throw e;}
    const envelope=JSON.parse(raw);
    if(envelope.namespace!==tx.namespace||envelope.id!==tx.id||envelope.revision!==tx.revision){
      const e=new Error('Staged transaction identity mismatch');e.code='PROMETEO_STAGE_IDENTITY_MISMATCH';throw e;
    }
    envelope.committedAt=now();
    const backend=writeRaw(key(envelope.namespace,envelope.id),JSON.stringify(envelope));
    removeRaw(key('staging',tx.txId));
    const receipt={type:'STATE_COMMIT',txId:tx.txId,namespace:tx.namespace,id:tx.id,revision:tx.revision,version:tx.version,privacy:tx.privacy,backend,at:now()};
    receipts.push(receipt);
    return Object.freeze(receipt);
  }

  function write(namespace,id,data,options={}){return commit(stage(namespace,id,data,options));}
  function remove(namespace,id){removeRaw(key(namespace,id)); receipts.push({type:'STATE_REMOVE',namespace,id,at:now()});}
  function getReceipts(){return receipts.map(x=>({...x}));}

  global.PrometeoPersistence=Object.freeze({version:'1.0.0-candidate',read,stage,commit,write,remove,registerMigration,getReceipts});
})(typeof globalThis!=='undefined'?globalThis:window);
