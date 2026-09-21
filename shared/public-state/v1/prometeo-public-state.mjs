/* Prometeo Public State v1 — isolated contract prototype. No production I/O. */
const ENTRY_SCHEMA='prometeo.public-state-entry/v1';
const VISIBILITIES=new Set(['workspace','channel','public_anonymous']);
const KEY_RE=/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/;
const CHANNEL_RE=/^[a-z][a-z0-9-]{0,62}$/;
const SOURCE_RE=/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)*\/v[1-9][0-9]*$/;
const MAX_VALUE_BYTES=16*1024;
const clone=v=>v==null?v:structuredClone(v);
const aid=a=>`${a.workspaceId}\u0000${a.channel}\u0000${a.key}`;
const digest=v=>JSON.stringify(v);
const uuid=()=>globalThis.crypto?.randomUUID?.()||`ps-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class PublicStateError extends Error{
  constructor(code,detail=null){super(code);this.name='PublicStateError';this.code=code;this.detail=detail;}
}

export function normalizeAddress({workspaceId,channel='home',key}={}){
  workspaceId=String(workspaceId||'').trim(); channel=String(channel).trim(); key=String(key||'').trim();
  if(!workspaceId) throw new PublicStateError('WORKSPACE_REQUIRED');
  if(!CHANNEL_RE.test(channel)) throw new PublicStateError('CHANNEL_INVALID',{channel});
  if(!KEY_RE.test(key)||key.length>240) throw new PublicStateError('KEY_INVALID',{key});
  return {workspaceId,channel,key};
}

export function validateProjection(input={}){
  const address=normalizeAddress(input), source=String(input.source||'').trim(), sourceVersion=Number(input.sourceVersion);
  const visibility=String(input.visibility||'workspace'), historyMode=String(input.historyMode||'none');
  if(!SOURCE_RE.test(source)) throw new PublicStateError('SOURCE_INVALID',{source});
  if(!Number.isSafeInteger(sourceVersion)||sourceVersion<1) throw new PublicStateError('SOURCE_VERSION_INVALID');
  if(!VISIBILITIES.has(visibility)) throw new PublicStateError('VISIBILITY_INVALID',{visibility});
  if(!['none','changes'].includes(historyMode)) throw new PublicStateError('HISTORY_MODE_INVALID',{historyMode});
  if(visibility==='public_anonymous'&&input.publicSafe!==true) throw new PublicStateError('PUBLIC_SAFE_ASSERTION_REQUIRED');
  if(new TextEncoder().encode(JSON.stringify(input.value)).byteLength>MAX_VALUE_BYTES) throw new PublicStateError('VALUE_TOO_LARGE');
  if(input.expiresAt!=null&&Number.isNaN(Date.parse(String(input.expiresAt)))) throw new PublicStateError('EXPIRES_AT_INVALID');
  return {...address,value:clone(input.value),source,sourceVersion,visibility,historyMode,
    schemaId:input.schemaId==null?null:String(input.schemaId),
    expiresAt:input.expiresAt==null?null:new Date(input.expiresAt).toISOString(),
    provenance:input.provenance&&typeof input.provenance==='object'&&!Array.isArray(input.provenance)?clone(input.provenance):{}};
}

export function createMemoryStore(){
  const entries=new Map(), outbox=new Map();
  return {
    getEntry:async a=>clone(entries.get(aid(a))||null),
    putEntry:async(a,e)=>(entries.set(aid(a),clone(e)),clone(e)),
    enqueue:async op=>(outbox.set(op.operationId,clone(op)),clone(op)),
    pending:async()=>[...outbox.values()].map(clone).sort((a,b)=>a.enqueuedAt.localeCompare(b.enqueuedAt)),
    remove:async id=>{outbox.delete(id);}
  };
}

export function createMemoryTransport({online=true}={}){
  const entries=new Map(), operations=new Map(), listeners=new Map(), events=[]; let connected=online;
  const ensure=()=>{if(!connected) throw new PublicStateError('OFFLINE');};
  const emit=(a,e)=>{for(const fn of listeners.get(aid(a))||[]) fn(clone(e));};
  return {
    setOnline:v=>{connected=Boolean(v);},
    get:async a=>(ensure(),clone(entries.get(aid(a))||null)),
    publish:async op=>{
      ensure();
      if(operations.has(op.operationId)) return clone(operations.get(op.operationId));
      const k=aid(op), cur=entries.get(k)||null;
      if(cur){
        if(cur.source!==op.source) throw new PublicStateError('SOURCE_OWNER_CONFLICT');
        if(op.expectedVersion!=null&&op.expectedVersion!==cur.version) throw new PublicStateError('VERSION_CONFLICT');
        if(op.sourceVersion<cur.source_version) throw new PublicStateError('STALE_SOURCE_VERSION');
        if(op.sourceVersion===cur.source_version){
          if(digest(op.value)!==digest(cur.value_json)) throw new PublicStateError('SOURCE_VERSION_CONFLICT');
          operations.set(op.operationId,cur); return clone(cur);
        }
      } else if(op.expectedVersion!=null&&op.expectedVersion!==0) throw new PublicStateError('VERSION_CONFLICT');
      const now=new Date().toISOString(), entry={schema:ENTRY_SCHEMA,workspace_id:op.workspaceId,channel:op.channel,key:op.key,
        value_json:clone(op.value),version:(cur?.version||0)+1,source:op.source,source_version:op.sourceVersion,
        schema_id:op.schemaId,visibility:op.visibility,history_mode:op.historyMode,operation_id:op.operationId,
        source_updated_at:op.sourceUpdatedAt,updated_at:now,expires_at:op.expiresAt,provenance:clone(op.provenance||{})};
      entries.set(k,entry); operations.set(op.operationId,entry);
      if(op.historyMode==='changes') events.push({schema:'prometeo.public-state-event/v1',event_id:op.operationId,
        workspace_id:op.workspaceId,channel:op.channel,key:op.key,value_json:clone(op.value),version:entry.version,
        source:op.source,source_version:op.sourceVersion,schema_id:op.schemaId,visibility:op.visibility,
        operation_id:op.operationId,occurred_at:now,expires_at:op.expiresAt,provenance:clone(op.provenance||{})});
      emit(op,entry); return clone(entry);
    },
    subscribe:(a,fn)=>{ensure();const k=aid(a);if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(fn);return()=>listeners.get(k)?.delete(fn);},
    eventsFor:async a=>events.filter(e=>e.workspace_id===a.workspaceId&&e.channel===a.channel&&e.key===a.key).map(clone)
  };
}

export function createPrometeoPublicState({workspaceId,store,transport,registry={},now=()=>new Date().toISOString()}={}){
  if(!workspaceId) throw new PublicStateError('WORKSPACE_REQUIRED');
  if(!store||!transport) throw new PublicStateError('ADAPTERS_REQUIRED');
  const subscribers=new Map(), remoteUnsub=new Map();
  const expired=e=>Boolean(e?.expires_at&&Date.parse(e.expires_at)<=Date.now());
  const spec=(c,k)=>registry[`${c}:${k}`]||registry[k]||null;
  const authorize=p=>{const s=spec(p.channel,p.key);if(!s)return;
    if(s.source&&s.source!==p.source) throw new PublicStateError('SOURCE_NOT_AUTHORIZED');
    if(s.channels&&!s.channels.includes(p.channel)) throw new PublicStateError('CHANNEL_NOT_AUTHORIZED');
    if(s.visibilities&&!s.visibilities.includes(p.visibility)) throw new PublicStateError('VISIBILITY_NOT_AUTHORIZED');
    if(typeof s.validate==='function'&&!s.validate(p.value)) throw new PublicStateError('VALUE_SCHEMA_INVALID');};
  const notify=(a,e)=>{for(const r of subscribers.get(aid(a))||[]){if(r.v===e.version&&digest(r.x)===digest(e.value_json))continue;
    r.v=e.version;r.x=clone(e.value_json);r.fn(expired(e)?null:clone(e.value_json),clone(e));}};

  async function getEntry(key,{channel='home',localOnly=false}={}){
    const a=normalizeAddress({workspaceId,channel,key}), local=await store.getEntry(a);
    if(localOnly) return local&&!expired(local)?local:null;
    try{const remote=await transport.get(a);if(remote)await store.putEntry(a,remote);return remote&&!expired(remote)?remote:(local&&!expired(local)?local:null);}
    catch(e){if(e?.code==='OFFLINE')return local&&!expired(local)?local:null;throw e;}
  }
  async function get(key,options={}){const e=await getEntry(key,options);return e?clone(e.value_json):null;}
  async function flushOne(op){
    try{const e=await transport.publish(op);await store.putEntry(op,e);await store.remove(op.operationId);notify(op,e);return e;}
    catch(error){if(error?.code==='OFFLINE')return null;throw error;}
  }
  async function publish(key,value,options={}){
    const p=validateProjection({workspaceId,channel:options.channel,key,value,source:options.source,sourceVersion:options.sourceVersion,
      visibility:options.visibility,historyMode:options.historyMode,schemaId:options.schemaId,expiresAt:options.expiresAt,
      publicSafe:options.publicSafe,provenance:options.provenance}); authorize(p);
    const op={...p,operationId:String(options.operationId||uuid()),expectedVersion:options.expectedVersion==null?null:Number(options.expectedVersion),
      sourceUpdatedAt:String(options.sourceUpdatedAt||now()),enqueuedAt:now()};
    const optimistic={schema:ENTRY_SCHEMA,workspace_id:workspaceId,channel:p.channel,key:p.key,value_json:clone(p.value),version:0,
      source:p.source,source_version:p.sourceVersion,schema_id:p.schemaId,visibility:p.visibility,history_mode:p.historyMode,
      operation_id:op.operationId,source_updated_at:op.sourceUpdatedAt,updated_at:op.enqueuedAt,expires_at:p.expiresAt,
      provenance:clone(p.provenance),sync:'queued'};
    await store.putEntry(op,optimistic);await store.enqueue(op);notify(op,optimistic);return await flushOne(op)||optimistic;
  }
  async function flush(){const out=[];for(const op of await store.pending()){const e=await flushOne(op);out.push({operationId:op.operationId,synced:Boolean(e),entry:e});if(!e)break;}return out;}
  async function attach(a){const k=aid(a);if(remoteUnsub.has(k))return;
    try{remoteUnsub.set(k,transport.subscribe(a,e=>{store.putEntry(a,e).then(()=>notify(a,e)).catch(()=>notify(a,e));}));}
    catch(e){if(e?.code!=='OFFLINE')throw e;}}
  async function subscribe(key,fn,{channel='home',emitCurrent=true}={}){
    if(typeof fn!=='function')throw new PublicStateError('LISTENER_REQUIRED'); const a=normalizeAddress({workspaceId,channel,key}),k=aid(a);
    if(!subscribers.has(k))subscribers.set(k,new Set());const r={fn,v:null,x:undefined};subscribers.get(k).add(r);await attach(a);
    if(emitCurrent){const e=await getEntry(key,{channel});if(e)notify(a,e);}
    return()=>{subscribers.get(k)?.delete(r);if(subscribers.get(k)?.size===0){subscribers.delete(k);remoteUnsub.get(k)?.();remoteUnsub.delete(k);}};
  }
  async function reconnect(){await flush();for(const k of subscribers.keys()){if(remoteUnsub.has(k))continue;const [ws,channel,key]=k.split('\u0000'),a={workspaceId:ws,channel,key};
    try{const e=await transport.get(a);if(e){await store.putEntry(a,e);notify(a,e);}await attach(a);}catch(error){if(error?.code!=='OFFLINE')throw error;}}}
  return Object.freeze({publish,get,getEntry,subscribe,flush,reconnect});
}

export const PrometeoPublicStateContract=Object.freeze({schema:'prometeo.public-state-client/v1',defaultChannel:'home',maxValueBytes:MAX_VALUE_BYTES,visibilities:[...VISIBILITIES]});
