import {validateCapture} from './capture-core.js';

const DB_NAME='prometeo-capture';
const DB_VERSION=1;
const CAPTURES='captures';
const REVISIONS='revisions';
const META='meta';
const LEGACY_DB='prometeo-global-notes';
const fail=(code,message,detail={})=>{const e=new Error(message);e.code=code;e.detail=detail;throw e};
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
const txDone=tx=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});

export class CaptureStore{
  constructor({name=DB_NAME}={}){this.name=name;this.dbPromise=null}
  async db(){
    if(this.dbPromise)return this.dbPromise;
    if(!globalThis.indexedDB)fail('PROMETEO_CAPTURE_IDB','IndexedDB unavailable');
    this.dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(this.name,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(CAPTURES)){
          const s=db.createObjectStore(CAPTURES,{keyPath:'id'});
          s.createIndex('created_at','created_at');
          s.createIndex('page_id','page_id');
          s.createIndex('processing_state','processing_state');
          s.createIndex('sync_state','sync_state');
          s.createIndex('archive_state','archive_state');
        }
        if(!db.objectStoreNames.contains(REVISIONS)){
          const s=db.createObjectStore(REVISIONS,{keyPath:['capture_id','revision']});
          s.createIndex('capture_id','capture_id');
        }
        if(!db.objectStoreNames.contains(META))db.createObjectStore(META,{keyPath:'key'});
      };
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    return this.dbPromise;
  }
  async putCapture(capture){
    validateCapture(capture);const db=await this.db();const tx=db.transaction([CAPTURES,REVISIONS],'readwrite');
    const flattened={...structuredClone(capture),page_id:capture.immutable_creation.context.page_id||null};
    tx.objectStore(CAPTURES).put(flattened);
    for(const r of capture.revisions||[])tx.objectStore(REVISIONS).put(structuredClone(r));
    await txDone(tx);return capture;
  }
  async getCapture(id){const db=await this.db();const tx=db.transaction(CAPTURES,'readonly');return request(tx.objectStore(CAPTURES).get(String(id)))}
  async listCaptures({page_id=null,includeArchived=false}={}){
    const db=await this.db();const tx=db.transaction(CAPTURES,'readonly');let all=await request(tx.objectStore(CAPTURES).getAll());
    if(page_id)all=all.filter(x=>x.page_id===page_id);
    if(!includeArchived)all=all.filter(x=>x.archive_state==='ACTIVE');
    return all.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  }
  async listQueue(){const all=await this.listCaptures({includeArchived:false});return all.filter(x=>['SAVED_LOCAL','QUEUED','MODEL_LOADING','TRANSCRIBING'].includes(x.processing_state)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))}
  async setMeta(key,value){const db=await this.db();const tx=db.transaction(META,'readwrite');tx.objectStore(META).put({key:String(key),value:structuredClone(value),updated_at:new Date().toISOString()});await txDone(tx);return value}
  async getMeta(key,defaultValue=null){const db=await this.db();const tx=db.transaction(META,'readonly');const row=await request(tx.objectStore(META).get(String(key)));return row?row.value:defaultValue}
  async deleteTombstoned(id){const c=await this.getCapture(id);if(!c)return false;if(c.archive_state!=='TOMBSTONED')fail('PROMETEO_CAPTURE_DELETE_ACTIVE','Only tombstoned Capture may be physically removed',{id});const db=await this.db();const tx=db.transaction([CAPTURES,REVISIONS],'readwrite');tx.objectStore(CAPTURES).delete(id);const idx=tx.objectStore(REVISIONS).index('capture_id');const keys=await request(idx.getAllKeys(id));for(const k of keys)tx.objectStore(REVISIONS).delete(k);await txDone(tx);return true}
  close(){this.dbPromise?.then(db=>db.close()).catch(()=>{});this.dbPromise=null}

  async importLegacyOnce({convert}={}){
    const marker=await this.getMeta('legacy.prometeo-global-notes.imported',null);if(marker)return {imported:0,already:true};
    if(typeof convert!=='function')return {imported:0,skipped:true};
    let legacy=[];
    try{legacy=await readLegacyNotes()}catch{}
    let imported=0;
    for(const note of legacy){const capture=await convert(note);if(!capture)continue;await this.putCapture(capture);imported++}
    await this.setMeta('legacy.prometeo-global-notes.imported',{at:new Date().toISOString(),count:imported,source_db:LEGACY_DB});
    return {imported,already:false};
  }
}

async function readLegacyNotes(){
  if(!globalThis.indexedDB)return [];
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(LEGACY_DB);
    req.onerror=()=>reject(req.error);
    req.onupgradeneeded=()=>{try{req.transaction.abort()}catch{};resolve([])};
    req.onsuccess=async()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('notes')){db.close();resolve([]);return}
      try{const tx=db.transaction('notes','readonly');const rows=await request(tx.objectStore('notes').getAll());db.close();resolve(rows||[])}catch(e){db.close();reject(e)}
    };
  });
}

export const CaptureStoreContract=Object.freeze({DB_NAME,DB_VERSION,stores:[CAPTURES,REVISIONS,META],legacy_source:LEGACY_DB});
