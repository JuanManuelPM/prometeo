const DB_NAME='prometeo-global-notes';
const DB_VERSION=1;
const STORE='notes';
let dbPromise;

function openDB(){
  if(dbPromise) return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)){
        const s=db.createObjectStore(STORE,{keyPath:'id'});
        s.createIndex('created','created');
        s.createIndex('sourcePath','sourcePath');
        s.createIndex('status','status');
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}

function request(req){
  return new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

export async function listNotes(){
  const db=await openDB();
  const tx=db.transaction(STORE,'readonly');
  return (await request(tx.objectStore(STORE).getAll())||[]).sort((a,b)=>b.created-a.created);
}

export async function putNote(note){
  const db=await openDB();
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put(note);
  return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve(note);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
}

export async function removeNote(id){
  const db=await openDB();
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).delete(id);
  return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
}

export async function getNote(id){
  const db=await openDB();
  const tx=db.transaction(STORE,'readonly');
  return request(tx.objectStore(STORE).get(id));
}
