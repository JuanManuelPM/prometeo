import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const norm=v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export const normPath=v=>String(v??'').replace(/\\/g,'/').replace(/^\.\//,'').replace(/\/+/g,'/');
export const uniq=xs=>[...new Set((xs||[]).filter(x=>x!==null&&x!==undefined&&String(x)).map(String))];
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
export const sha256=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(canon(v))).digest('hex');
export const tokenize=v=>uniq(norm(v).match(/[a-z0-9_.:/-]{2,}/g)||[]);

export function assertPublicSafe(v){
  const t=JSON.stringify(v).toLowerCase();
  for(const x of ['"service_role":','"service_role_key":','"password":','"access_token":','"refresh_token":','"authorization":"bearer ','"authorization": "bearer ']) if(t.includes(x)) throw new Error(`PUBLIC_CONTEXT_PRIVACY_VIOLATION:${x}`);
  return true;
}

export function durableIdentity(obj,rel){
  const fields=[['artifact_id','artifact'],['run_id','run'],['queue_id','queue'],['workstream_id','workstream'],['chat_object_id','chat-object'],['claim_id','claim'],['return_id','return']];
  for(const [k,p] of fields) if(typeof obj?.[k]==='string'&&obj[k].trim()) return {identity_basis:`${p}:${obj[k].trim()}`,identity_source_field:k};
  if(typeof obj?.opportunity_id==='string'&&/claim/i.test(String(obj.schema||''))) return {identity_basis:`claim:${obj.opportunity_id}`,identity_source_field:'opportunity_id'};
  return {identity_basis:`path:${normPath(rel)}`,identity_source_field:null};
}

const val=(o,ks,d=null)=>{for(const k of ks) if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='') return o[k];return d;};
const ptr=s=>String(s).replace(/~/g,'~0').replace(/\//g,'~1');
function refs(v,p='',key='',out=[]){
  if(Array.isArray(v)){v.forEach((x,i)=>refs(x,`${p}/${i}`,key,out));return out;}
  if(v&&typeof v==='object'){for(const [k,x] of Object.entries(v)) refs(x,`${p}/${ptr(k)}`,k,out);return out;}
  if(typeof v!=='string') return out;
  const k=norm(key), refKey=k.endsWith('_ref')||k.endsWith('_refs')||['depends_on','dependencies','needs','blocks','blockers','contradicts','supersedes','derived_from','basis','source_refs','read_scope','write_scope'].includes(k);
  const repo=/^(coordination|scripts|tests|agent-runtime|\.well-known)\//.test(v), durable=/^(O-|RUN-|Q-|WI-|P-|GEN-|A-|E-|CR-|project-|chat-object-)/.test(v);
  if(refKey||repo||durable) out.push({key,value:normPath(v),pointer:p||'/'});
  return out;
}
function edgeType(k=''){
  k=norm(k); if(['depends_on','dependencies','needs'].includes(k))return'DEPENDS_ON'; if(k.includes('block'))return'BLOCKS'; if(k.includes('contradict'))return'CONTRADICTS'; if(k.includes('supersed'))return'SUPERSEDES'; if(k.includes('derived_from')||k==='basis')return'DERIVED_FROM'; if(k.includes('claim_ref'))return'CLAIM_FOR'; if(k.includes('run_ref'))return'RUN_FOR'; if(k.includes('return_ref'))return'RETURN_FOR'; if(k.includes('current'))return'CURRENT_FOR'; return'REFERENCES';
}
function markdown(text){
  const o={}; for(const k of ['Status','State','Owner','Schema','Authority','Privacy']){const m=text.match(new RegExp(`^${k}:\\s*(.+)$`,'mi'));if(m)o[k.toLowerCase()]=m[1].trim();}
  const r=[]; for(const m of text.matchAll(/(?:^|[\s`"'(])((?:coordination|scripts|tests|agent-runtime|\.well-known)\/[A-Za-z0-9_./*+-]+)/g)) r.push({key:'markdown_ref',value:normPath(m[1].replace(/[),.;:`]+$/,'')),pointer:'/text'});
  return {obj:o,title:(text.match(/^#\s+(.+)$/m)||[])[1]||null,refs:r};
}
function ruleClass(rel,rules=[],fallback='UNRESOLVED'){
  for(const r of rules){const exact=r.path&&normPath(rel)===normPath(r.path),prefix=r.path_prefix&&normPath(rel).startsWith(normPath(r.path_prefix));if(exact||prefix)return String(r.class).toUpperCase();} return fallback;
}
export function parseArtifact({repoRoot,relPath,sourceHead='UNKNOWN',config={}}){
  const content=fs.readFileSync(path.join(repoRoot,relPath),'utf8'),ext=path.extname(relPath).toLowerCase(); let obj=null,title=null,outRefs=[],warnings=[];
  if(ext==='.json'){try{obj=JSON.parse(content);outRefs=refs(obj);title=val(obj,['title','name']);}catch(e){warnings.push(`INVALID_JSON:${e.message}`);}}
  else if(ext==='.md'||ext==='.txt'){const m=markdown(content);obj=m.obj;title=m.title;outRefs=m.refs;}
  const id=durableIdentity(obj,relPath), artifact_id=`A-${sha256(id.identity_basis).slice(0,16)}`;
  const ids=uniq(['artifact_id','run_id','queue_id','workstream_id','chat_object_id','claim_id','return_id','project_id','opportunity_id','work_item_id'].map(k=>typeof obj?.[k]==='string'?obj[k]:null));
  const privacy=String(val(obj,['privacy_class','privacy'],ruleClass(relPath,config.privacy_rules,config.default_privacy_class||'PUBLIC_COORDINATION_ONLY'))).toUpperCase();
  const authority=String(val(obj,['authority_class','authority'],ruleClass(relPath,config.authority_rules,'UNRESOLVED'))).toUpperCase();
  const search=[relPath,title,val(obj,['schema','$schema']),val(obj,['status','state']),...ids,content.slice(0,20000)].filter(Boolean).join('\n');
  return {schema:'prometeo.context-artifact/v1',artifact_id,...id,path:normPath(relPath),namespace_id:normPath(relPath).split('/').slice(0,config.namespace_depth||2).join('/'),kind:ext.slice(1)||'text',content_hash:sha256(content),metadata_hash:sha256({title,ids,outRefs,status:val(obj,['status','state'])}),source_head:sourceHead,status:String(val(obj,['status','state'],'UNKNOWN')).toUpperCase(),authority_class:authority,privacy_class:privacy,project_ids:uniq([val(obj,['project_id'])]),durable_ids:ids,outbound_refs:outRefs,extraction_warnings:warnings,token_estimate:Math.ceil(content.length/4),search_tokens:tokenize(search).sort()};
}

function files(root,rel,config,out=[]){
  const abs=path.join(root,rel); if(!fs.existsSync(abs))return out;
  for(const e of fs.readdirSync(abs,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const c=normPath(path.join(rel,e.name));if((config.exclude_path_prefixes||[]).some(x=>c===normPath(x)||c.startsWith(normPath(x)+'/')))continue;if(e.isDirectory())files(root,c,config,out);else if((config.allowed_extensions||['.json','.md','.txt','.mjs','.js']).includes(path.extname(e.name).toLowerCase())&&fs.statSync(path.join(root,c)).size<=Number(config.max_file_bytes||1e6))out.push(c);} return out;
}
export function scanRepository(root,config={}){return uniq((config.include_roots||['coordination','scripts','tests']).flatMap(r=>files(root,normPath(r),config,[]))).sort();}
export function deriveEdges(arts=[]){
  const byPath=new Map(arts.map(a=>[a.path,a])),byDur=new Map();for(const a of arts)for(const id of a.durable_ids||[])if(!byDur.has(id))byDur.set(id,a);
  const out=[];for(const a of arts)for(const r of a.outbound_refs||[]){const d=byPath.get(normPath(r.value))||byDur.get(r.value);const e={schema:'prometeo.context-edge/v1',src_id:a.artifact_id,edge_type:edgeType(r.key),dst_ref:r.value,dst_id:d?.artifact_id||null,evidence_ref:a.path,evidence_pointer:r.pointer,source_head:a.source_head};e.edge_id=`E-${sha256([e.src_id,e.edge_type,e.dst_ref,e.evidence_ref,e.evidence_pointer].join('|')).slice(0,16)}`;out.push(e);}return out.sort((a,b)=>a.edge_id.localeCompare(b.edge_id));
}
export function buildContextFabric({repoRoot,config,sourceHead='UNKNOWN'}){
  const artifacts=scanRepository(repoRoot,config).map(relPath=>parseArtifact({repoRoot,relPath,sourceHead,config})).sort((a,b)=>a.path.localeCompare(b.path)),edges=deriveEdges(artifacts),config_hash=sha256(config);
  const inventory={schema:'prometeo.context-inventory/v1',source_head:sourceHead,generator_version:config.generator_version,artifacts},graph={schema:'prometeo.context-graph/v1',source_head:sourceHead,edges};
  const ns={};for(const a of artifacts)(ns[a.namespace_id]??=[]).push(a);const namespaces=Object.keys(ns).sort().map(namespace_id=>({namespace_id,artifact_ids:ns[namespace_id].map(x=>x.artifact_id).sort(),merkle_hash:sha256(ns[namespace_id].map(x=>[x.artifact_id,x.content_hash,x.metadata_hash]).sort())}));
  const namespaceIndex={schema:'prometeo.context-namespace-index/v1',source_head:sourceHead,namespaces},inventory_hash=sha256(inventory),graph_hash=sha256(graph),namespace_hash=sha256(namespaceIndex),index_hash=sha256({sourceHead,config_hash,inventory_hash,graph_hash,namespace_hash});
  const buildState={schema:'prometeo.context-build-state/v1',generator_version:config.generator_version,config_hash,source_head:sourceHead,inventory_hash,graph_hash,namespace_hash,index_hash,file_count:artifacts.length,edge_count:edges.length};return{inventory,graph,namespaceIndex,buildState};
}
const allowed=(a,classes)=>new Set((classes||['PUBLIC_COORDINATION_ONLY','PUBLIC']).map(x=>String(x).toUpperCase())).has(String(a.privacy_class).toUpperCase());
function score(a,q){const h=new Set(a.search_tokens||[]);let s=0;for(const t of q){if(h.has(t))s++;if(norm(a.path).includes(t))s+=2;}for(const id of a.durable_ids||[])if(q.includes(norm(id)))s+=10;return s+(a.authority_class!=='UNRESOLVED'?0.25:0);}
const HARD=new Set(['DEPENDS_ON','BLOCKS','CONTRADICTS','SUPERSEDES','CURRENT_FOR']);
export function compileContext({inventory,graph,buildState,config,actorRole='worker',mission='',projectId=null,rootId=null,opportunityId=null,runId=null,requiredRefs=[],allowedPrivacy=null,maxFiles=null,expectedSourceHead=null}){
  if(!inventory||!graph||!buildState)throw new Error('CONTEXT_INDEX_INCOMPLETE');if(expectedSourceHead&&buildState.source_head!==expectedSourceHead)throw new Error(`STALE_INDEX_FAIL_CLOSED:${buildState.source_head}!=${expectedSourceHead}`);if(inventory.source_head!==buildState.source_head||graph.source_head!==buildState.source_head)throw new Error('STALE_INDEX_COMPONENT_MISMATCH');
  const arts=inventory.artifacts||[],byPath=new Map(arts.map(a=>[a.path,a])),byId=new Map(arts.map(a=>[a.artifact_id,a])),classes=allowedPrivacy||config.default_allowed_privacy,eligible=arts.filter(a=>allowed(a,classes)),reasons=new Map(),mandatory=new Set();
  const add=(a,r,m=false)=>{if(!a)return;(reasons.get(a.artifact_id)||reasons.set(a.artifact_id,new Set()).get(a.artifact_id)).add(r);if(m)mandatory.add(a.artifact_id);};
  const kernels=config.role_kernel_refs?.[actorRole]||config.role_kernel_refs?.default||[];for(const r of [...kernels,...requiredRefs])add(byPath.get(normPath(r)),kernels.includes(r)?'Q1_ROLE_KERNEL':'Q2_REQUIRED_REF',true);if(projectId)for(const a of eligible)if((a.project_ids||[]).includes(projectId))add(a,'Q4_PROJECT_MATCH');
  const q=tokenize([mission,projectId,rootId,opportunityId,runId].filter(Boolean).join(' ')),ranked=eligible.map(a=>({a,score:score(a,q)})).filter(x=>x.score>0).sort((x,y)=>y.score-x.score||x.a.path.localeCompare(y.a.path));for(const x of ranked)add(x.a,`Q5_LEXICAL:${x.score.toFixed(2)}`);
  const queue=[...mandatory],seen=new Set(queue);while(queue.length){const id=queue.shift();for(const e of graph.edges||[]){let a=null;if(e.src_id===id&&HARD.has(e.edge_type)&&e.dst_id)a=byId.get(e.dst_id);else if(e.edge_type==='CONTRADICTS'&&e.dst_id===id)a=byId.get(e.src_id);if(!a||!allowed(a,classes))continue;add(a,`Q6_HARD_CLOSURE:${e.edge_type}`,true);if(!seen.has(a.artifact_id)){seen.add(a.artifact_id);queue.push(a.artifact_id);}}}
  const max=Number(maxFiles||config.default_budget?.max_selected_files||12),hardMax=Number(config.default_budget?.hard_max_selected_files||Math.max(max,64));if(mandatory.size>hardMax)throw new Error(`MANDATORY_CLOSURE_EXCEEDS_HARD_BUDGET:${mandatory.size}>${hardMax}`);
  const selected=[...mandatory].sort().map(id=>byId.get(id)).filter(Boolean),selectedIds=new Set(selected.map(a=>a.artifact_id));for(const {a} of ranked){if(selectedIds.has(a.artifact_id))continue;if(selected.length>=max)break;selected.push(a);selectedIds.add(a.artifact_id);}for(const a of eligible.sort((a,b)=>a.path.localeCompare(b.path))){if(selectedIds.has(a.artifact_id)||!reasons.has(a.artifact_id)||selected.length>=max)continue;selected.push(a);selectedIds.add(a.artifact_id);}
  const omitted=ranked.filter(x=>!selectedIds.has(x.a.artifact_id)).slice(0,25).map(x=>({path:x.a.path,artifact_id:x.a.artifact_id,reason:'BUDGET_OPTIONAL',score:x.score})),sel=selected.map(a=>({path:a.path,artifact_id:a.artifact_id,content_hash:a.content_hash,metadata_hash:a.metadata_hash,authority_class:a.authority_class,privacy_class:a.privacy_class,token_estimate:a.token_estimate,mandatory:mandatory.has(a.artifact_id),selection_reasons:[...(reasons.get(a.artifact_id)||[])].sort()}));
  const contradictions=(graph.edges||[]).filter(e=>e.edge_type==='CONTRADICTS'&&selectedIds.has(e.src_id)&&(!e.dst_id||selectedIds.has(e.dst_id))).map(e=>({source_id:e.src_id,target_id:e.dst_id,target_ref:e.dst_ref,evidence_ref:e.evidence_ref}));
  const core={actor_role:actorRole,mission,project_id_or_null:projectId,root_or_chat_object_or_null:rootId,opportunity_id_or_null:opportunityId,run_id_or_null:runId,source_head:buildState.source_head,config_hash:buildState.config_hash,index_hash:buildState.index_hash,query_plan_version:config.query_plan_version||'CF-LITE-P1-Q0-Q10',selection_provenance:'AUTOMATED_CONTEXT_COMPILER',mandatory_closure:[...mandatory].sort(),selected_artifacts:sel,omitted_but_available_refs:omitted,authority_labels:sel.map(x=>({path:x.path,authority_class:x.authority_class})),contradictions,freshness:{source_head:buildState.source_head,index_hash:buildState.index_hash,validated:true},token_estimate:sel.reduce((n,x)=>n+x.token_estimate,0),file_count:sel.length,budget:{max_selected_files:max,hard_max_selected_files:hardMax,mandatory_count:mandatory.size,budget_exceeded_by_mandatory:mandatory.size>max},candidate_counts:{eligible:eligible.length,lexical:ranked.length,mandatory:mandatory.size,omitted_ranked:omitted.length}};
  const receipt={schema:'prometeo.context-receipt/v1',receipt_id:`CR-${sha256(core).slice(0,16)}`,...core};assertPublicSafe(receipt);return{workingSet:{schema:'prometeo.context-working-set/v1',receipt_id:receipt.receipt_id,source_head:buildState.source_head,index_hash:buildState.index_hash,artifacts:sel},receipt};
}
export function validateFabric({inventory,graph,buildState}){const errors=[];if(inventory?.schema!=='prometeo.context-inventory/v1')errors.push('BAD_INVENTORY_SCHEMA');if(graph?.schema!=='prometeo.context-graph/v1')errors.push('BAD_GRAPH_SCHEMA');if(buildState?.schema!=='prometeo.context-build-state/v1')errors.push('BAD_BUILD_STATE_SCHEMA');if(inventory?.source_head!==buildState?.source_head||graph?.source_head!==buildState?.source_head)errors.push('SOURCE_HEAD_MISMATCH');const ids=new Set();for(const a of inventory?.artifacts||[]){if(ids.has(a.artifact_id))errors.push(`DUPLICATE_ARTIFACT_ID:${a.artifact_id}`);ids.add(a.artifact_id);}return{ok:!errors.length,errors};}
