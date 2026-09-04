/* Compact-state / append-only evidence split for Classes and Student Worlds. */
((global)=>{
 'use strict';if(global.PrometeoEvidenceLog)return;
 function compact(state){
  const s=structuredClone(state),events=[...(s.events||[])];delete s.events;s.evidence_cursor=events.length;return {state:s,events};
 }
 function append(existing,newEvents,{baseCursor=null}={}){
  const out=[...structuredClone(existing||[])];
  if(baseCursor!==null&&out.length!==baseCursor){const e=new Error('Stale evidence cursor');e.code='PROMETEO_EVIDENCE_STALE';throw e}
  for(const ev of newEvents||[])out.push({...structuredClone(ev),evidence_seq:out.length+1});
  return out;
 }
 function rehydrate(compactState,events){return {...structuredClone(compactState),events:structuredClone(events||[])}}
 global.PrometeoEvidenceLog=Object.freeze({version:'1.0.0-candidate',compact,append,rehydrate});
})(typeof globalThis!=='undefined'?globalThis:window);
