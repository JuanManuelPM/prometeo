/* PrometeoDB v1 — local-first browser persistence.
   Foundation only: production surfaces do not own this DB until an explicit migration activates them.

   Design rules:
   - IndexedDB is the durable local database.
   - Behavior history is append-only: corrections are new events, never destructive edits.
   - Derived daily state and graphs are projections, never second sources of truth.
   - Migrations must be additive, idempotent and rollback-safe.
   - No network dependency. Future sync layers consume this API; they do not replace it.
*/
(function(root){
  'use strict';

  const SCHEMA='prometeo.local-db/v1';
  const DB_NAME='prometeo.local';
  const DB_VERSION=1;
  const STORE={
    META:'meta',
    KV:'kv',
    BEHAVIOR:'behavior_events',
    SNAPSHOTS:'snapshots'
  };
  const connections=new Map();

  const nowISO=()=>new Date().toISOString();
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const uuid=()=>root.crypto?.randomUUID?.()||`pdb-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function req(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
    });
  }

  function txDone(tx){
    return new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve();
      tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
      tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));
    });
  }

  function ensureIndex(store,name,keyPath,options){
    if(!store.indexNames.contains(name))store.createIndex(name,keyPath,options);
  }

  function upgrade(db,oldVersion){
    if(oldVersion<1){
      const meta=db.createObjectStore(STORE.META,{keyPath:'key'});
      ensureIndex(meta,'updated_at','updated_at',{unique:false});

      const kv=db.createObjectStore(STORE.KV,{keyPath:'key'});
      ensureIndex(kv,'updated_at','updated_at',{unique:false});

      const behavior=db.createObjectStore(STORE.BEHAVIOR,{keyPath:'id'});
      ensureIndex(behavior,'tracker_date',['tracker_id','date'],{unique:false});
      ensureIndex(behavior,'tracker_id','tracker_id',{unique:false});
      ensureIndex(behavior,'date','date',{unique:false});
      ensureIndex(behavior,'created_at','created_at',{unique:false});

      const snapshots=db.createObjectStore(STORE.SNAPSHOTS,{keyPath:'id'});
      ensureIndex(snapshots,'created_at','created_at',{unique:false});
      ensureIndex(snapshots,'kind','kind',{unique:false});
    }
  }

  async function open(options={}){
    const name=String(options.name||DB_NAME);
    if(connections.has(name))return connections.get(name);
    const promise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in root)){
        reject(new Error('IndexedDB is not available in this browser'));
        return;
      }
      const request=root.indexedDB.open(name,DB_VERSION);
      request.onupgradeneeded=()=>upgrade(request.result,request.oldVersion||0);
      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>{db.close();connections.delete(name)};
        resolve(db);
      };
      request.onerror=()=>reject(request.error||new Error('Unable to open PrometeoDB'));
      request.onblocked=()=>reject(new Error('PrometeoDB upgrade is blocked by another open tab'));
    });
    connections.set(name,promise);
    try{return await promise}catch(error){connections.delete(name);throw error}
  }

  async function storeTx(storeName,mode,work,options={}){
    const db=await open(options);
    const tx=db.transaction(storeName,mode);
    const store=tx.objectStore(storeName);
    const value=await work(store,tx);
    await txDone(tx);
    return value;
  }

  function normalizeBehaviorEvent(input={}){
    const trackerId=String(input.tracker_id||'').trim();
    const date=String(input.date||'').trim();
    const state=String(input.state||'').trim();
    if(!trackerId)throw new TypeError('behavior event requires tracker_id');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new TypeError('behavior event requires date YYYY-MM-DD');
    if(!state)throw new TypeError('behavior event requires state');
    const createdAt=String(input.created_at||nowISO());
    return {
      id:String(input.id||uuid()),
      schema:'prometeo.behavior-event/v1',
      tracker_id:trackerId,
      date,
      state,
      source:String(input.source||'manual'),
      created_at:createdAt,
      supersedes_id:input.supersedes_id?String(input.supersedes_id):null,
      metadata:input.metadata&&typeof input.metadata==='object'?clone(input.metadata):{}
    };
  }

  async function appendBehaviorEvent(input,options={}){
    const event=normalizeBehaviorEvent(input);
    await storeTx(STORE.BEHAVIOR,'readwrite',store=>req(store.add(event)),options);
    return clone(event);
  }

  async function behaviorEvents(filters={},options={}){
    const db=await open(options);
    const tx=db.transaction(STORE.BEHAVIOR,'readonly');
    const store=tx.objectStore(STORE.BEHAVIOR);
    let rows;
    if(filters.tracker_id&&filters.date){
      rows=await req(store.index('tracker_date').getAll([String(filters.tracker_id),String(filters.date)]));
    }else if(filters.tracker_id){
      rows=await req(store.index('tracker_id').getAll(String(filters.tracker_id)));
    }else if(filters.date){
      rows=await req(store.index('date').getAll(String(filters.date)));
    }else{
      rows=await req(store.getAll());
    }
    await txDone(tx);
    let result=rows||[];
    if(filters.from)result=result.filter(x=>x.date>=filters.from);
    if(filters.to)result=result.filter(x=>x.date<=filters.to);
    result.sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(String(b.id)));
    if(Number.isFinite(filters.limit)&&filters.limit>=0)result=result.slice(-filters.limit);
    return clone(result);
  }

  async function dailyBehaviorState(trackerId,date,options={}){
    const rows=await behaviorEvents({tracker_id:trackerId,date},options);
    const latest=rows[rows.length-1]||null;
    return latest?{state:latest.state,event:latest}:null;
  }

  async function putKV(key,value,options={}){
    const row={key:String(key),value:clone(value),updated_at:nowISO()};
    await storeTx(STORE.KV,'readwrite',store=>req(store.put(row)),options);
    return clone(row.value);
  }

  async function getKV(key,fallback=null,options={}){
    const row=await storeTx(STORE.KV,'readonly',store=>req(store.get(String(key))),options);
    return row?clone(row.value):fallback;
  }

  async function setMeta(key,value,options={}){
    const row={key:String(key),value:clone(value),updated_at:nowISO()};
    await storeTx(STORE.META,'readwrite',store=>req(store.put(row)),options);
    return clone(row.value);
  }

  async function getMeta(key,fallback=null,options={}){
    const row=await storeTx(STORE.META,'readonly',store=>req(store.get(String(key))),options);
    return row?clone(row.value):fallback;
  }

  async function createSnapshot(payload,options={}){
    const row={
      id:String(options.id||uuid()),
      schema:'prometeo.local-snapshot/v1',
      kind:String(options.kind||'manual'),
      created_at:String(options.created_at||nowISO()),
      payload:clone(payload)
    };
    await storeTx(STORE.SNAPSHOTS,'readwrite',store=>req(store.add(row)),options);
    return clone(row);
  }

  async function listSnapshots(options={}){
    const rows=await storeTx(STORE.SNAPSHOTS,'readonly',store=>req(store.getAll()),options);
    return clone((rows||[]).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))));
  }

  async function exportAll(options={}){
    const db=await open(options);
    const out={schema:SCHEMA,db_version:DB_VERSION,exported_at:nowISO(),stores:{}};
    for(const name of Object.values(STORE)){
      const tx=db.transaction(name,'readonly');
      out.stores[name]=await req(tx.objectStore(name).getAll());
      await txDone(tx);
    }
    return clone(out);
  }

  function close(options={}){
    const name=String(options.name||DB_NAME);
    const pending=connections.get(name);
    connections.delete(name);
    if(pending)Promise.resolve(pending).then(db=>db.close()).catch(()=>{});
  }

  function deleteTestDatabase(name){
    const safe=String(name||'');
    if(!safe.startsWith('prometeo.test.'))return Promise.reject(new Error('Only prometeo.test.* databases may be deleted through this API'));
    close({name:safe});
    return new Promise((resolve,reject)=>{
      const request=root.indexedDB.deleteDatabase(safe);
      request.onsuccess=()=>resolve(true);
      request.onerror=()=>reject(request.error||new Error('Unable to delete test database'));
      request.onblocked=()=>reject(new Error('Test database deletion blocked'));
    });
  }

  root.PrometeoDB=Object.freeze({
    schema:SCHEMA,
    version:DB_VERSION,
    name:DB_NAME,
    stores:Object.freeze({...STORE}),
    open,
    appendBehaviorEvent,
    behaviorEvents,
    dailyBehaviorState,
    putKV,
    getKV,
    setMeta,
    getMeta,
    createSnapshot,
    listSnapshots,
    exportAll,
    close,
    deleteTestDatabase
  });
})(typeof window!=='undefined'?window:globalThis);
