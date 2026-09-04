/* Prometeo Privacy Boundary v1 — privacy is inherited lineage, not a display label. */
((global)=>{
 'use strict';if(global.PrometeoPrivacy)return;
 const LEVELS=['PUBLIC','PROJECT','LOCAL'];const rank=new Map(LEVELS.map((x,i)=>[x,i]));
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 function normalize(p,{unknownDefault='LOCAL'}={}){const v=p||unknownDefault;if(!rank.has(v))fail('PROMETEO_PRIVACY_CLASS','Invalid privacy',{privacy:v});return v}
 function strongest(values){return values.map(v=>normalize(v)).sort((a,b)=>rank.get(b)-rank.get(a))[0]||'LOCAL'}
 function inherited(records){return strongest((records||[]).map(r=>r.privacy))}
 function validateDeclassification(receipt,{from,to,sourceIds=[]}={}){
  from=normalize(from);to=normalize(to);
  if(rank.get(to)>=rank.get(from))return true;
  if(!receipt||receipt.type!=='PRIVACY_DECLASSIFICATION'||receipt.human_approved!==true)fail('PROMETEO_PRIVACY_DECLASS_RECEIPT','Explicit human-approved declassification receipt required');
  if(receipt.from!==from||receipt.to!==to)fail('PROMETEO_PRIVACY_DECLASS_MISMATCH','Declassification receipt mismatch');
  const have=new Set(receipt.source_ids||[]);for(const id of sourceIds)if(!have.has(id))fail('PROMETEO_PRIVACY_DECLASS_SOURCE','Receipt missing source',{id});
  return true;
 }
 function derive({sources,requestedPrivacy=null,declassificationReceipt=null}){
  const sourcePrivacy=inherited(sources||[]);
  const requested=normalize(requestedPrivacy||sourcePrivacy);
  if(rank.get(requested)<rank.get(sourcePrivacy))validateDeclassification(declassificationReceipt,{from:sourcePrivacy,to:requested,sourceIds:(sources||[]).map(s=>s.id).filter(Boolean)});
  return requested;
 }
 function canExport(privacy,{target='external',allowProject=true}={}){
  privacy=normalize(privacy);
  if(privacy==='LOCAL')return false;
  if(privacy==='PROJECT'&&!allowProject)return false;
  return true;
 }
 function assertExport(records,opts={}){
  const blocked=(records||[]).filter(r=>!canExport(r.privacy,opts));
  if(blocked.length)fail('PROMETEO_PRIVACY_EXPORT_BLOCKED','Privacy policy blocks export',{ids:blocked.map(r=>r.id),privacy:blocked.map(r=>r.privacy)});
  return true;
 }
 function redactedChild(source,{id,privacy='PROJECT',receipt,redaction}) {
  const target=normalize(privacy);validateDeclassification(receipt,{from:normalize(source.privacy),to:target,sourceIds:[source.id]});
  return Object.freeze({id,privacy:target,lineage:[source.id],redaction,source_mutated:false});
 }
 global.PrometeoPrivacy=Object.freeze({version:'1.0.0-candidate',LEVELS:Object.freeze([...LEVELS]),normalize,strongest,inherited,derive,canExport,assertExport,redactedChild});
})(typeof globalThis!=='undefined'?globalThis:window);
