/* Prometeo Context Foundry v2.1 — fail-closed selection, privacy lineage, immutable records. */
((global)=>{
 'use strict';if(global.PrometeoContextFoundryV2)return;
 const AUTH=['VERIFIED_EXACT_ARTIFACT','EXPLICIT_HUMAN_DECISION','HUMAN_ACCEPTED_EXACT_CHECKPOINT','CANONICAL_PROTOCOL','VERIFIED_HISTORICAL_RULE','SOURCE_REFERENCE','DERIVED_EVIDENCE','INFERENCE','PROPOSAL','RAW_UNCURATED'];
 const authorityRank=new Map(AUTH.map((x,i)=>[x,i])),HIGH=new Set(AUTH.slice(0,5));
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 const tokens=s=>new Set(String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9_-]+/).filter(x=>x.length>1));
 function overlap(a,b){let n=0;for(const x of a)if(b.has(x))n++;return n}
 function localFreeze(v,seen=new WeakSet()){if(v===null||typeof v!=='object'||seen.has(v))return v;seen.add(v);for(const k of Reflect.ownKeys(v))localFreeze(v[k],seen);return Object.freeze(v)}
 const immutable=v=>global.PrometeoDurable?.immutable?global.PrometeoDurable.immutable(v):localFreeze(structuredClone(v));
 function create({byteRegistry={schema:'prometeo.byte-registry/v1',bytes:[]},index={schema:'prometeo.context-index/v2',records:[]},privacy=global.PrometeoPrivacy,trustedPrivacyReceipts=[]}={}){
  if(!privacy)fail('PROMETEO_FOUNDRY_PRIVACY_REQUIRED','PrometeoPrivacy required');
  const bytes=new Map(),records=new Map(),consumptions=[];
  function registerByte(b){if(!b?.id||!b.digest)fail('PROMETEO_BYTE_FIELDS','Byte record requires id/digest');if(bytes.has(b.id)&&bytes.get(b.id).digest!==b.digest)fail('PROMETEO_BYTE_IDENTITY_CONFLICT',`Byte id ${b.id} digest conflict`);const x={privacy:'LOCAL',...structuredClone(b)};x.privacy=privacy.normalize(x.privacy);bytes.set(x.id,immutable(x));return x.id}
  function registerRecord(r,{sourceRecords=null,declassificationReceipt=null}={}){
   if(!r?.id)fail('PROMETEO_CONTEXT_ID','Context record id required');if(!authorityRank.has(r.authority))fail('PROMETEO_CONTEXT_AUTHORITY',`Invalid authority ${r.authority}`);if(records.has(r.id))fail('PROMETEO_CONTEXT_DUPLICATE',`Duplicate context record ${r.id}`);
   let lineageSources=sourceRecords;if(lineageSources===null)lineageSources=(r.lineage_ids||[]).map(id=>records.get(id)||bytes.get(id)||fail('PROMETEO_CONTEXT_LINEAGE_UNKNOWN',`Unknown lineage id ${id}`));
   let sourcePrivacy;if(lineageSources.length)sourcePrivacy=privacy.derive({sources:lineageSources,requestedPrivacy:r.privacy,declassificationReceipt,trustedReceipts:trustedPrivacyReceipts});else if(r.derived===true)sourcePrivacy=privacy.derive({sources:[{id:`unknown-lineage:${r.id}`,privacy:'LOCAL'}],requestedPrivacy:r.privacy,declassificationReceipt,trustedReceipts:trustedPrivacyReceipts});else sourcePrivacy=privacy.normalize(r.privacy);
   const x={tags:[],roles:[],source_refs:[],lineage_ids:[],superseded_by:[],contradiction_refs:[],currentness:'CURRENT',...structuredClone(r),privacy:sourcePrivacy};records.set(x.id,immutable(x));return x.id;
  }
  for(const b of byteRegistry.bytes||[])registerByte(b);for(const r of index.records||[])registerRecord(r);
  const getRecord=id=>records.has(id)?immutable(records.get(id)):null,getByte=id=>bytes.has(id)?immutable(bytes.get(id)):null;
  function detectConflicts(selected){const byKey=new Map(),conflicts=[];for(const r of selected){if(!r.claim_key||r.currentness!=='CURRENT'||!HIGH.has(r.authority))continue;const a=byKey.get(r.claim_key)||[];a.push(r);byKey.set(r.claim_key,a)}for(const [key,arr] of byKey){const vals=new Map();for(const r of arr)vals.set(JSON.stringify(r.value),(vals.get(JSON.stringify(r.value))||[]).concat(r.id));if(vals.size>1)conflicts.push({claim_key:key,variants:[...vals].map(([value,ids])=>({value:JSON.parse(value),ids}))})}return conflicts}
  function select({query='',role=null,tags=[],ids=[],maxRecords=40,historical=false,target='internal',allowProject=false,allowConflicts=false}={}){
   if(!Number.isInteger(maxRecords)||maxRecords<1)fail('PROMETEO_CONTEXT_BUDGET','maxRecords must be a positive integer',{maxRecords});
   const q=tokens(query),tagSet=new Set(tags),idSet=new Set(ids),explicit=ids.length>0;if(explicit){const missing=ids.filter(id=>!records.has(id));if(missing.length)fail('PROMETEO_CONTEXT_EXPLICIT_MISSING','Explicit context ids are missing',{missing})}
   const scored=[],excluded=[];for(const r of records.values()){
    if(explicit&&!idSet.has(r.id)){excluded.push({id:r.id,reason:'not-explicitly-requested',score:0});continue}
    if(!historical&&(r.currentness!=='CURRENT'||(r.superseded_by||[]).length)){excluded.push({id:r.id,reason:'superseded-or-historical',score:0});continue}
    if(role&&r.roles?.length&&!r.roles.includes(role)&&!r.roles.includes('all')){excluded.push({id:r.id,reason:'role-mismatch',score:0});continue}
    if(target==='external'&&!privacy.canExport(r.privacy,{target,allowProject})){excluded.push({id:r.id,reason:`privacy-${r.privacy.toLowerCase()}`,score:999});continue}
    const rt=tokens([r.text,r.claim,r.title,(r.tags||[]).join(' ')].filter(Boolean).join(' ')),qScore=overlap(q,rt)*10,tagScore=(r.tags||[]).filter(t=>tagSet.has(t)).length*12,roleScore=role&&(r.roles||[]).includes(role)?5:0,idScore=idSet.has(r.id)?100:0,score=idScore+qScore+tagScore+roleScore;
    if(!explicit&&q.size&&score===0){excluded.push({id:r.id,reason:'irrelevant',score:0});continue}if(!explicit&&tagSet.size&&tagScore===0&&qScore===0){excluded.push({id:r.id,reason:'tag-mismatch',score:0});continue}
    scored.push({record:r,score,reason:[idScore&&'explicit-id',qScore&&'query-match',tagScore&&'tag-match',roleScore&&'role-match'].filter(Boolean)});
   }
   scored.sort((a,b)=>b.score-a.score||(authorityRank.get(a.record.authority)-authorityRank.get(b.record.authority))||a.record.id.localeCompare(b.record.id));const chosen=scored.slice(0,maxRecords).map(x=>x.record);if(target==='external')privacy.assertExport(chosen,{target,allowProject});const conflicts=detectConflicts(chosen);if(conflicts.length&&!allowConflicts)fail('PROMETEO_CONTEXT_CONFLICT','High-authority context conflict requires resolution',{conflicts});
   const selected=scored.slice(0,maxRecords).map(x=>({id:x.record.id,score:x.score,why:x.reason,record:structuredClone(x.record)})),cutoff=scored.slice(maxRecords).map(x=>({id:x.record.id,reason:'budget-cutoff',score:x.score})),highExcluded=[...excluded,...cutoff].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,20);
   return immutable({schema:'prometeo.context-selection/v2',query,role,tags:[...tags],target,selected,excluded:highExcluded,conflicts});
  }
  async function consume(selection,{purpose,workItemId=null}={}){const D=global.PrometeoDurable;if(!D)fail('PROMETEO_DURABLE_REQUIRED','PrometeoDurable required');const material={purpose,workItemId,selected:selection.selected.map(x=>x.id),target:selection.target,query:selection.query,role:selection.role,tags:selection.tags},digest=await D.digest(material);const receipt=immutable({schema:'prometeo.context-consumption/v2',id:`CTX-CONSUME-${digest.slice(0,20)}`,digest,purpose,work_item_id:workItemId,selected_ids:material.selected,reopen_handles:selection.selected.map(x=>x.record.reopen_handle).filter(Boolean),privacy:privacy.strongest(selection.selected.map(x=>x.record.privacy)),created_at:new Date().toISOString()});consumptions.push(receipt);return receipt}
  function reopen(id){const r=records.get(id);return r?immutable({id:r.id,handle:r.reopen_handle||null,source_refs:[...(r.source_refs||[])]}):null}
  return Object.freeze({registerByte,registerRecord,getRecord,getByte,select,consume,reopen,listRecords:()=>[...records.values()].map(immutable),listBytes:()=>[...bytes.values()].map(immutable),consumptions:()=>consumptions.map(immutable)});
 }
 global.PrometeoContextFoundryV2=Object.freeze({version:'2.1.0-candidate',create,authorityOrder:Object.freeze([...AUTH])});
})(typeof globalThis!=='undefined'?globalThis:window);
