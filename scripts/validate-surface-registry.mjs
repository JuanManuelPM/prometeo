import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const REQUIRED_SURFACE_IDS=Object.freeze(['control-plan','prometeo-mobile','facultad-digital','alumnos-teacher']);
const ROUTE_STATES=new Set(['KNOWN','UNRESOLVED']);

export function normalizeAlias(value){
  return String(value??'').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
}

const nonEmpty=v=>typeof v==='string'&&v.trim().length>0;
const arr=v=>Array.isArray(v);

function isHttpsUrl(value){
  try{return new URL(value).protocol==='https:'}catch{return false}
}

export function validateSurfaceRegistry(registry){
  const errors=[];
  const warnings=[];
  const fail=(code,path,message)=>errors.push({code,path,message});
  const warn=(code,path,message)=>warnings.push({code,path,message});

  if(!registry||typeof registry!=='object')return {ok:false,errors:[{code:'REGISTRY_OBJECT_REQUIRED',path:'$',message:'registry must be an object'}],warnings,summary:null};
  if(registry.schema!=='prometeo.surface-registry-candidate/v1')fail('BAD_SCHEMA','schema','expected prometeo.surface-registry-candidate/v1');
  if(registry.status!=='CANDIDATE')fail('AUTHORITY_PROMOTION','status','registry must remain CANDIDATE');
  if(registry.authority?.class!=='CANDIDATE_ONLY_NO_PROMOTION')fail('AUTHORITY_CLASS','authority.class','candidate-only authority required');
  if(registry.authority?.promotion_authority!=='NONE')fail('PROMOTION_AUTHORITY','authority.promotion_authority','registry has no promotion authority');
  if(registry.route_policy?.no_guessing!==true)fail('NO_GUESSING_POLICY','route_policy.no_guessing','must be true');
  if(registry.route_policy?.known_requires_exact_evidence!==true)fail('ROUTE_EVIDENCE_POLICY','route_policy.known_requires_exact_evidence','must be true');
  if(!arr(registry.source_refs)||registry.source_refs.length===0)fail('SOURCE_REFS','source_refs','at least one durable source ref required');
  if(!arr(registry.surfaces))fail('SURFACES_ARRAY','surfaces','surfaces must be an array');

  const surfaces=arr(registry.surfaces)?registry.surfaces:[];
  const ids=new Set();
  const aliasOwners=new Map();
  for(const [i,s] of surfaces.entries()){
    const p=`surfaces[${i}]`;
    if(!nonEmpty(s?.surface_id)){fail('SURFACE_ID',`${p}.surface_id`,'stable surface_id required');continue}
    if(ids.has(s.surface_id))fail('DUPLICATE_SURFACE_ID',`${p}.surface_id`,s.surface_id);
    ids.add(s.surface_id);
    if(!nonEmpty(s.title))fail('TITLE',`${p}.title`,'title required');
    if(!arr(s.aliases)||s.aliases.length===0)fail('ALIASES',`${p}.aliases`,'at least one alias required');
    const ownAliases=new Set();
    for(const [j,a] of (s.aliases||[]).entries()){
      const n=normalizeAlias(a);
      if(!n){fail('EMPTY_ALIAS',`${p}.aliases[${j}]`,'alias cannot be empty');continue}
      if(ownAliases.has(n))warn('REDUNDANT_ALIAS',`${p}.aliases[${j}]`,`normalized alias already exists on ${s.surface_id}: ${n}`);
      ownAliases.add(n);
      const prior=aliasOwners.get(n);
      if(prior&&prior!==s.surface_id)fail('CROSS_SURFACE_ALIAS_COLLISION',`${p}.aliases[${j}]`,`${n} already belongs to ${prior}`);
      else aliasOwners.set(n,s.surface_id);
    }

    if(!nonEmpty(s.root?.project_id))fail('PROJECT_POINTER',`${p}.root.project_id`,'project_id required');
    if(!nonEmpty(s.root?.project_index_ref))fail('PROJECT_INDEX_POINTER',`${p}.root.project_index_ref`,'project index ref required');
    if(!arr(s.root?.workstream_ids))fail('WORKSTREAM_POINTERS',`${p}.root.workstream_ids`,'workstream_ids must be an array');

    const route=s.public_route;
    if(!route||!ROUTE_STATES.has(route.state))fail('ROUTE_STATE',`${p}.public_route.state`,'must be KNOWN or UNRESOLVED');
    else if(route.state==='UNRESOLVED'){
      if(route.url!==null)fail('GUESSED_ROUTE',`${p}.public_route.url`,'UNRESOLVED route url must be null');
      if(route.page_id!==null)fail('GUESSED_PAGE_ID',`${p}.public_route.page_id`,'UNRESOLVED page_id must be null');
      if(!nonEmpty(route.reason))fail('UNRESOLVED_REASON',`${p}.public_route.reason`,'reason required');
      if(!arr(route.evidence_refs)||route.evidence_refs.length===0)fail('ROUTE_EVIDENCE',`${p}.public_route.evidence_refs`,'truth-recovery/evidence ref required');
    }else if(route.state==='KNOWN'){
      if(!isHttpsUrl(route.url))fail('KNOWN_ROUTE_URL',`${p}.public_route.url`,'KNOWN route requires exact https URL');
      if(!arr(route.evidence_refs)||route.evidence_refs.length===0)fail('KNOWN_ROUTE_EVIDENCE',`${p}.public_route.evidence_refs`,'KNOWN route requires exact evidence refs');
    }

    if(!nonEmpty(s.owner?.primary_ref))fail('OWNER_POINTER',`${p}.owner.primary_ref`,'primary owner pointer required');
    if(!arr(s.owner?.context_refs)||s.owner.context_refs.length===0)fail('CONTEXT_POINTERS',`${p}.owner.context_refs`,'context refs required');
    if(!nonEmpty(s.change_thread?.bridge_opportunity_id))fail('CHANGE_THREAD_BRIDGE',`${p}.change_thread.bridge_opportunity_id`,'bridge opportunity required');
    if(!nonEmpty(s.change_thread?.protocol_ref))fail('CHANGE_THREAD_PROTOCOL',`${p}.change_thread.protocol_ref`,'protocol ref required');
    if(!nonEmpty(s.local_planner?.opportunity_id))fail('LOCAL_PLANNER_POINTER',`${p}.local_planner.opportunity_id`,'local planner opportunity required');
    if(!nonEmpty(s.local_steward?.builder_opportunity_id))fail('STEWARD_BUILDER_POINTER',`${p}.local_steward.builder_opportunity_id`,'local steward builder required');
    if(!nonEmpty(s.local_steward?.integration_opportunity_id))fail('LOCAL_INTEGRATION_POINTER',`${p}.local_steward.integration_opportunity_id`,'local integration opportunity required');
    if(s.privacy_authority?.privacy_class!=='PUBLIC_COORDINATION_ONLY')fail('PRIVACY_CLASS',`${p}.privacy_authority.privacy_class`,'candidate registry may contain public coordination pointers only');
    if(s.privacy_authority?.surface_authority!=='CANDIDATE_ONLY_NO_PROMOTION')fail('SURFACE_AUTHORITY',`${p}.privacy_authority.surface_authority`,'surface may not self-promote');
  }

  for(const id of REQUIRED_SURFACE_IDS)if(!ids.has(id))fail('MISSING_REQUIRED_SURFACE','surfaces',id);
  for(const id of ids)if(!REQUIRED_SURFACE_IDS.includes(id))warn('EXTRA_SURFACE','surfaces',id);

  const summary={surface_count:surfaces.length,required_surface_count:REQUIRED_SURFACE_IDS.length,known_routes:surfaces.filter(s=>s.public_route?.state==='KNOWN').length,unresolved_routes:surfaces.filter(s=>s.public_route?.state==='UNRESOLVED').length,alias_count:aliasOwners.size};
  return {ok:errors.length===0,errors,warnings,summary};
}

export function buildAliasIndex(registry){
  const verdict=validateSurfaceRegistry(registry);
  if(!verdict.ok)throw new Error(`INVALID_SURFACE_REGISTRY:${verdict.errors.map(e=>e.code).join(',')}`);
  const index=new Map();
  for(const surface of registry.surfaces){
    for(const value of [surface.surface_id,surface.title,...surface.aliases]){
      const key=normalizeAlias(value);
      const prior=index.get(key);
      if(prior&&prior.surface_id!==surface.surface_id)throw new Error(`AMBIGUOUS_SURFACE_ALIAS:${key}`);
      index.set(key,surface);
    }
  }
  return index;
}

export function resolveSurface(registry,query){
  return buildAliasIndex(registry).get(normalizeAlias(query))??null;
}

export function loadSurfaceRegistry(file=path.join(ROOT,'coordination/swarm-v1/SURFACE_REGISTRY_CANDIDATE_V1.json')){
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const file=process.argv[2]?path.resolve(process.argv[2]):path.join(ROOT,'coordination/swarm-v1/SURFACE_REGISTRY_CANDIDATE_V1.json');
  const verdict=validateSurfaceRegistry(loadSurfaceRegistry(file));
  console.log(JSON.stringify(verdict,null,2));
  if(!verdict.ok)process.exitCode=1;
}
