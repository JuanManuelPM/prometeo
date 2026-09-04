/* Prometeo Persistence v1.1 — CANDIDATE
   Durable browser-side state with namespaced keys, schema/version, staged CAS writes
   and migration hooks. Receipts exposed here are diagnostic/session evidence;
   the durable authority ledger is a Part 2 responsibility.
*/
((global)=>{
  'use strict';
  if(global.PrometeoPersistence) return;
  const PREFIX='prometeo.v1';
  const receipts=[];
  const memory=new Map();
  const migrations=new Map();
  let storageResolved=false,storageRef=null;
  const now=()=>new Date().toISOString();
  const key=(namespace,id)=>`${PREFIX}:${namespace}:${id}`;
  const err=(code,message,detail={})=>Object.assign(new Error(message),{code,detail});
  const storage=()=>{
    if(storageResolved)return storageRef;
    storageResolved=true;
    try{const s=global.localStorage;const probe=`${PREFIX}:probe`;s.setItem(probe,'1');s.removeItem(probe);storageRef=s;}catch{storageRef=null;}
    return storageRef;
  };
  const readRaw=k=>{const s=storage();if(s){const v=s.getItem(k);if(v!==null)return v;}return memory.get(k)??null;};
  const writeRaw=(k,v)=>{const s=storage();if(s){s.setItem(k,v);return'localStorage';}memory.set(k,v);return'memory';};
  const removeRaw=k=>{const s=storage();if(s)s.removeItem(k);memory.delete(k);};
  const receipt=r=>{const out=Object.freeze({...r,at:r.at||now()});receipts.push(out);return out;};
  function parseEnvelope(namespace,id,raw){
    if(raw===null)return null;let envelope;
    try{envelope=JSON.parse(raw);}catch{throw err('PROMETEO_STATE_CORRUPT',`Corrupt state ${namespace}/${id}`);}
    if(!envelope||envelope.schema!=='prometeo.persisted-state/v1'||envelope.namespace!==namespace||envelope.id!==id)throw err('PROMETEO_STATE_ENVELOPE_INVALID',`Invalid state envelope ${namespace}/${id}`);
    return envelope;
  }
  function registerMigration(namespace,fromVersion,toVersion,fn){if(typeof fn!=='function')throw new Error('Migration must be a function');migrations.set(`${namespace}:${fromVersion}->${toVersion}`,fn);}
  function migrate(namespace,envelope,targetVersion){
    let out=structuredClone(envelope),guard=0,seen=new Set([String(out.version)]);
    while(String(out.version)!==String(targetVersion)){
      if(++guard>50)throw err('PROMETEO_MIGRATION_CYCLE','Migration cycle');
      const directKey=`${namespace}:${out.version}->${targetVersion}`;
      let edge=directKey,fn=migrations.get(directKey),to=String(targetVersion);
      if(!fn){
        const candidates=[...migrations.entries()].filter(([k])=>k.startsWith(`${namespace}:${out.version}->`));
        if(!candidates.length)throw err('PROMETEO_MIGRATION_MISSING',`No migration for ${namespace} ${out.version} -> ${targetVersion}`);
        if(candidates.length>1)throw err('PROMETEO_MIGRATION_AMBIGUOUS',`Ambiguous migration from ${namespace} ${out.version}`,{edges:candidates.map(([k])=>k)});
        [edge,fn]=candidates[0];to=edge.split('->')[1];
      }
      if(seen.has(String(to)))throw err('PROMETEO_MIGRATION_CYCLE','Migration cycle',{to});
      seen.add(String(to));out={...out,version:to,data:fn(structuredClone(out.data)),migratedAt:now()};
    }
    return out;
  }
  function readRecord(namespace,id,{version=null,defaultValue=null}={}){
    const envelope=parseEnvelope(namespace,id,readRaw(key(namespace,id)));
    if(!envelope)return defaultValue===null?null:{data:structuredClone(defaultValue),revision:0,version:version||null,privacy:null,meta:{},backend:storage()?'localStorage':'memory'};
    const resolved=version&&String(envelope.version)!==String(version)?migrate(namespace,envelope,String(version)):envelope;
    return {data:structuredClone(resolved.data),revision:Number(envelope.revision)||0,version:String(resolved.version),storedVersion:String(envelope.version),privacy:envelope.privacy||'LOCAL',meta:structuredClone(envelope.meta||{}),backend:storage()?'localStorage':'memory'};
  }
  function read(namespace,id,options={}){const r=readRecord(namespace,id,options);return r?structuredClone(r.data):(options.defaultValue??null);}
  function stage(namespace,id,data,{version='1',privacy='LOCAL',baseRevision=null,meta={}}={}){
    const txId=`tx-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    const current=parseEnvelope(namespace,id,readRaw(key(namespace,id)));const currentRevision=Number(current?.revision)||0;
    if(baseRevision!=null&&currentRevision!==Number(baseRevision))throw err('PROMETEO_STALE_STATE_WRITE',`Stale write ${namespace}/${id}: expected ${baseRevision}, current ${currentRevision}`,{expected:Number(baseRevision),current:currentRevision});
    const envelope={schema:'prometeo.persisted-state/v1',namespace,id,version:String(version),privacy,baseRevision:currentRevision,revision:currentRevision+1,stagedAt:now(),data:structuredClone(data),meta:{...meta}};
    writeRaw(key('staging',txId),JSON.stringify(envelope));receipt({type:'STATE_STAGE',txId,namespace,id,version:String(version),baseRevision:currentRevision,revision:envelope.revision,privacy});
    return Object.freeze({txId,namespace,id,baseRevision:currentRevision,revision:envelope.revision,version:String(version),privacy});
  }
  function commit(tx){
    const raw=readRaw(key('staging',tx.txId));if(!raw)throw err('PROMETEO_STAGE_MISSING','Missing staged transaction');
    const envelope=JSON.parse(raw);
    if(envelope.namespace!==tx.namespace||envelope.id!==tx.id||Number(envelope.revision)!==Number(tx.revision))throw err('PROMETEO_STAGE_IDENTITY_MISMATCH','Staged transaction identity mismatch');
    const current=parseEnvelope(envelope.namespace,envelope.id,readRaw(key(envelope.namespace,envelope.id)));const currentRevision=Number(current?.revision)||0;
    if(currentRevision!==Number(envelope.baseRevision)){
      receipt({type:'STATE_COMMIT_REJECTED_STALE',txId:tx.txId,namespace:tx.namespace,id:tx.id,expectedBaseRevision:Number(envelope.baseRevision),currentRevision});
      throw err('PROMETEO_STALE_STATE_COMMIT',`Stale commit ${tx.namespace}/${tx.id}: based on ${envelope.baseRevision}, current ${currentRevision}`,{expectedBaseRevision:Number(envelope.baseRevision),currentRevision});
    }
    envelope.committedAt=now();const backend=writeRaw(key(envelope.namespace,envelope.id),JSON.stringify(envelope));removeRaw(key('staging',tx.txId));
    return receipt({type:'STATE_COMMIT',txId:tx.txId,namespace:tx.namespace,id:tx.id,baseRevision:envelope.baseRevision,revision:tx.revision,version:tx.version,privacy:tx.privacy,backend});
  }
  function write(namespace,id,data,options={}){return commit(stage(namespace,id,data,options));}
  function remove(namespace,id,{baseRevision=null}={}){const current=parseEnvelope(namespace,id,readRaw(key(namespace,id)));const revision=Number(current?.revision)||0;if(baseRevision!=null&&revision!==Number(baseRevision))throw err('PROMETEO_STALE_STATE_REMOVE','Stale remove',{expected:Number(baseRevision),current:revision});removeRaw(key(namespace,id));return receipt({type:'STATE_REMOVE',namespace,id,revision});}
  function getReceipts(){return receipts.map(x=>({...x}));}
  function status(){return Object.freeze({version:'1.1.0-candidate',backend:storage()?'localStorage':'memory',receiptDurability:'SESSION_DIAGNOSTIC_ONLY_PART2_LEDGER_PENDING'});}
  global.PrometeoPersistence=Object.freeze({version:'1.1.0-candidate',read,readRecord,stage,commit,write,remove,registerMigration,getReceipts,status});
})(typeof globalThis!=='undefined'?globalThis:window);
