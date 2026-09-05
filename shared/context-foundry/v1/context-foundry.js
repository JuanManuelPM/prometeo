/* Context Foundry v1 — CANDIDATE
   Selects minimal role-relevant context while preserving authority/privacy lineage.
*/
((global)=>{
  'use strict';
  if(global.PrometeoContextFoundry) return;
  const records=new Map();
  const allowedAuthority=new Set(['VERIFIED_EXACT_ARTIFACT','EXPLICIT_HUMAN_DECISION','HUMAN_ACCEPTED_EXACT_CHECKPOINT','CANONICAL_PROTOCOL','VERIFIED_HISTORICAL_RULE','DERIVED_EVIDENCE','INFERENCE','PROPOSAL']);
  const allowedPrivacy=new Set(['PUBLIC','PROJECT','LOCAL']);
  const clone=v=>structuredClone(v);

  function add(record){
    if(!record?.id) throw new Error('Context record id required');
    if(!allowedAuthority.has(record.authority)) throw new Error(`Invalid authority ${record.authority}`);
    if(!allowedPrivacy.has(record.privacy||'PROJECT')) throw new Error(`Invalid privacy ${record.privacy}`);
    const normalized={schema:'prometeo.context-record/v1',privacy:'PROJECT',tags:[],roles:[],sources:[],...clone(record)};
    if(normalized.privacy==='LOCAL') normalized.exportable=false;
    records.set(normalized.id,Object.freeze(normalized));
    return normalized.id;
  }

  function select({role=null,tags=[],ids=[],maxRecords=40,includeAuthority=null}={}){
    const tagSet=new Set(tags); const idSet=new Set(ids);
    const ranking=['VERIFIED_EXACT_ARTIFACT','EXPLICIT_HUMAN_DECISION','HUMAN_ACCEPTED_EXACT_CHECKPOINT','CANONICAL_PROTOCOL','VERIFIED_HISTORICAL_RULE','DERIVED_EVIDENCE','INFERENCE','PROPOSAL'];
    return [...records.values()].filter(r=>{
      if(ids.length && idSet.has(r.id)) return true;
      if(role && r.roles?.length && !r.roles.includes(role) && !r.roles.includes('all')) return false;
      if(tags.length && !r.tags?.some(t=>tagSet.has(t))) return false;
      if(includeAuthority && !includeAuthority.includes(r.authority)) return false;
      return !ids.length || idSet.has(r.id);
    }).sort((a,b)=>ranking.indexOf(a.authority)-ranking.indexOf(b.authority)).slice(0,maxRecords).map(clone);
  }

  function bundle(opts={}){
    const selected=select(opts);
    return Object.freeze({schema:'prometeo.context-bundle/v1',createdAt:new Date().toISOString(),role:opts.role||null,tags:[...(opts.tags||[])],records:selected,lineage:selected.flatMap(r=>r.sources||[])});
  }

  function exportBundle(opts={}){
    const b=bundle(opts);
    const blocked=b.records.filter(r=>r.privacy==='LOCAL'||r.exportable===false);
    if(blocked.length){
      const e=new Error(`LOCAL/non-exportable context selected: ${blocked.map(r=>r.id).join(', ')}`);
      e.code='PROMETEO_LOCAL_EXPORT_BLOCKED'; e.blocked=blocked.map(r=>r.id); throw e;
    }
    return b;
  }

  function clear(){records.clear();}
  global.PrometeoContextFoundry=Object.freeze({version:'1.0.0-candidate',add,select,bundle,exportBundle,clear});
})(typeof globalThis!=='undefined'?globalThis:window);
