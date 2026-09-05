/* Persistent append-only evidence over Part 1 CAS persistence. */
((global)=>{
 'use strict';if(global.PrometeoPersistentEvidence)return;
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 function create(namespace,id,{privacy='LOCAL'}={}){
   const P=global.PrometeoPersistence;if(!P)fail('PROMETEO_EVIDENCE_PERSISTENCE','PrometeoPersistence required');
   const rec=P.readRecord(namespace,id,{version:'1',defaultValue:{events:[]}});
   let revision=rec?.revision||0,events=[...(rec?.data?.events||[])];
   function append(newEvents){
     const before=[...events],start=events.length;
     const additions=(newEvents||[]).map((ev,i)=>({...structuredClone(ev),evidence_seq:start+i+1}));
     const next=[...events,...additions];
     try{const receipt=P.write(namespace,id,{events:next},{version:'1',privacy,baseRevision:revision,meta:{kind:'append-only-evidence'}});events=next;revision=receipt.revision;return additions;}
     catch(e){events=before;throw e}
   }
   function reload(){const r=P.readRecord(namespace,id,{version:'1',defaultValue:{events:[]}});events=[...(r?.data?.events||[])];revision=r?.revision||0;return {events:structuredClone(events),revision}}
   return Object.freeze({append,reload,list:()=>structuredClone(events),status:()=>({namespace,id,revision,count:events.length})});
 }
 global.PrometeoPersistentEvidence=Object.freeze({version:'1.0.0-candidate',create});
})(typeof globalThis!=='undefined'?globalThis:window);
