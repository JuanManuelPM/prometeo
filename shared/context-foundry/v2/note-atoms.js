((global)=>{
 'use strict';if(global.PrometeoNoteAtomsV2)return;
 const PRIV=new Set(['PUBLIC','PROJECT','LOCAL']);
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 function validateAll(atoms){
  const ids=new Set();const byClaim=new Map();
  for(const a of atoms){
   if(!a.id||ids.has(a.id))fail('PROMETEO_ATOM_ID','Missing/duplicate atom id',{id:a.id});ids.add(a.id);
   if(!a.claim_key||!a.claim||!a.authority)fail('PROMETEO_ATOM_FIELDS',`Atom ${a.id} missing required fields`);
   if(!PRIV.has(a.privacy))fail('PROMETEO_ATOM_PRIVACY',`Atom ${a.id} invalid privacy`);
   (byClaim.get(a.claim_key)||byClaim.set(a.claim_key,[]).get(a.claim_key)).push(a);
  }
  for(const [key,list] of byClaim){
   const current=list.filter(a=>a.currentness==='CURRENT');
   const vals=new Set(current.map(a=>JSON.stringify(a.value)));
   if(current.length>1&&vals.size>1)fail('PROMETEO_ATOM_CURRENT_CONFLICT',`Conflicting current atoms for ${key}`,{ids:current.map(a=>a.id)});
  }
  return {ok:true,count:ids.size};
 }
 function append(atoms,atom){
   validateAll(atoms);if(atoms.some(a=>a.id===atom.id))fail('PROMETEO_ATOM_ID','Duplicate atom id');
   const out=[...structuredClone(atoms),structuredClone(atom)];validateAll(out);return out;
 }
 global.PrometeoNoteAtomsV2=Object.freeze({version:'2.0.0-candidate',validateAll,append});
})(typeof globalThis!=='undefined'?globalThis:window);
