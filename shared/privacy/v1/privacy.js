/* Prometeo Privacy Boundary v1.1 — fail-closed inheritance and ledger-anchored declassification. */
((global)=>{
 'use strict';if(global.PrometeoPrivacy)return;
 const LEVELS=['PUBLIC','PROJECT','LOCAL'];const rank=new Map(LEVELS.map((x,i)=>[x,i]));
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 function normalize(p,{unknownDefault='LOCAL'}={}){const v=p||unknownDefault;if(!rank.has(v))fail('PROMETEO_PRIVACY_CLASS','Invalid privacy',{privacy:v});return v}
 function strongest(values){return values.map(v=>normalize(v)).sort((a,b)=>rank.get(b)-rank.get(a))[0]||'LOCAL'}
 function inherited(records){return strongest((records||[]).map(r=>r.privacy))}
 function trustedMap(input){if(input instanceof Map)return input;const m=new Map();for(const r of input||[])if(r?.id)m.set(r.id,r.hash||null);return m}
 function validateDeclassification(receipt,{from,to,sourceIds=[],trustedReceipts=[]}={}){
  from=normalize(from);to=normalize(to);if(rank.get(to)>=rank.get(from))return true;
  if(!receipt||receipt.type!=='PRIVACY_DECLASSIFICATION'||receipt.human_approved!==true)fail('PROMETEO_PRIVACY_DECLASS_RECEIPT','Explicit human-approved declassification receipt required');
  if(!receipt.id||!receipt.hash)fail('PROMETEO_PRIVACY_DECLASS_UNTRUSTED','Declassification receipt requires durable id/hash');
  const trusted=trustedMap(trustedReceipts);if(trusted.get(receipt.id)!==receipt.hash)fail('PROMETEO_PRIVACY_DECLASS_UNTRUSTED','Declassification receipt is not anchored in the trusted ledger',{id:receipt.id});
  if(receipt.from!==from||receipt.to!==to)fail('PROMETEO_PRIVACY_DECLASS_MISMATCH','Declassification receipt mismatch');
  const have=new Set(receipt.source_ids||[]);for(const id of sourceIds)if(!have.has(id))fail('PROMETEO_PRIVACY_DECLASS_SOURCE','Receipt missing source',{id});return true;
 }
 function derive({sources,requestedPrivacy=null,declassificationReceipt=null,trustedReceipts=[]}){
  const sourcePrivacy=inherited(sources||[]),requested=normalize(requestedPrivacy||sourcePrivacy);
  if(rank.get(requested)<rank.get(sourcePrivacy))validateDeclassification(declassificationReceipt,{from:sourcePrivacy,to:requested,sourceIds:(sources||[]).map(s=>s.id).filter(Boolean),trustedReceipts});
  return requested;
 }
 function canExport(privacy,{target='external',allowProject=false}={}){privacy=normalize(privacy);if(target!=='external')return true;if(privacy==='PUBLIC')return true;if(privacy==='PROJECT')return allowProject===true;return false}
 function assertExport(records,opts={}){const blocked=(records||[]).filter(r=>!canExport(r.privacy,opts));if(blocked.length)fail('PROMETEO_PRIVACY_EXPORT_BLOCKED','Privacy policy blocks export',{ids:blocked.map(r=>r.id),privacy:blocked.map(r=>r.privacy)});return true}
 function redactedChild(source,{id,privacy='PROJECT',receipt,redaction,trustedReceipts=[]}){const target=normalize(privacy);validateDeclassification(receipt,{from:normalize(source.privacy),to:target,sourceIds:[source.id],trustedReceipts});const out={id,privacy:target,lineage:[source.id],redaction,source_mutated:false};return global.PrometeoDurable?.immutable?global.PrometeoDurable.immutable(out):Object.freeze(out)}
 global.PrometeoPrivacy=Object.freeze({version:'1.1.0-candidate',LEVELS:Object.freeze([...LEVELS]),normalize,strongest,inherited,validateDeclassification,derive,canExport,assertExport,redactedChild});
})(typeof globalThis!=='undefined'?globalThis:window);
