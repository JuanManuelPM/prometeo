import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sha256, norm, uniq, deriveConvergence, filterRelevantEvents, publicWorker, assertPublicSafe} from './agent-network-lib.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outArg=process.argv.indexOf('--out');
const OUT=path.resolve(ROOT,outArg>=0?process.argv[outArg+1]:'dist/agent-runtime');
const REPO='JuanManuelPM/prometeo';
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const exists=rel=>fs.existsSync(path.join(ROOT,rel));
const writeJson=(rel,obj)=>{const p=path.join(OUT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n');};
const git=(args,allowFail=false)=>{try{return execFileSync('git',args,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}catch(e){if(allowFail)return '';throw e;}};
const existsCommit=sha=>!!sha&&!!git(['cat-file','-e',`${sha}^{commit}`],true);
function isAncestor(a,b){if(!a||!b)return false;try{execFileSync('git',['merge-base','--is-ancestor',a,b],{cwd:ROOT,stdio:'ignore'});return true;}catch{return false;}}
const tokens=s=>[...new Set(norm(s).split(/[^a-z0-9]+/).filter(x=>x.length>2))];
const scopePrefixes=(scopes=[])=>uniq(scopes.map(s=>String(s).split('*')[0].replace(/\/$/,'')).filter(s=>s&&(/[/.]/.test(s)||s.endsWith('/'))&&!/\s/.test(s));
function commitInfo(sha){if(!sha)return null;const meta=git(['show','-s','--format=%H%x1f%s%x1f%cI',sha],true);if(!meta)return null;const [id,subject,date]=meta.split('\x1f');const files=git(['show','--pretty=format:','--name-only',sha],true).split(/\r?\n/).filter(Boolean);return {sha:id,subject,date,files};}
function commitsBetween(base,head,max=20){if(!base||!head||base===head||!existsCommit(base)||!existsCommit(head)||!isAncestor(base,head))return [];return git(['rev-list',`--max-count=${max}`,`${base}..${head}`],true).split(/\r?\n/).filter(Boolean).map(commitInfo).filter(Boolean);}
function recentTouching(base,head,prefixes,max=20){if(!head||!existsCommit(head)||!prefixes.length)return [];let args=['rev-list',`--max-count=${max}`];if(base&&existsCommit(base)&&isAncestor(base,head))args.push(`${base}..${head}`);else args.push(head);args.push('--',...prefixes);return git(args,true).split(/\r?\n/).filter(Boolean).map(commitInfo).filter(Boolean);}
function firstKnown(...values){return values.flat().find(v=>typeof v==='string'&&/^[0-9a-f]{7,40}$/i.test(v))||null;}
function branchHead(name){return git(['rev-parse',`refs/remotes/origin/${name}`],true)||git(['rev-parse',name],true)||null;}
function shortId(id){return String(id).toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,18)||'PROMETEO';}
function selectProfile(pack,ws,last){if(pack.execution_profile)return pack.execution_profile;if(last?.execution_frontier||last?.next_step||last?.plan_frozen||pack.plan_frozen)return 'CONTINUE';if((pack.already_decided||[]).some(x=>/frozen|100-point|100 point|plan.*exists/i.test(String(x))))return 'CONTINUE';return ws.mode==='LAB'?'DEEP':'DEEP';}
function matchScore(surface,ws){const hay=norm([surface.id,surface.title,surface.description,surface.href].join(' '));return (ws.match_terms||[]).reduce((n,t)=>n+(hay.includes(norm(t))?1:0),0);}
function latestWorker(workers){return [...workers].sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')))[0]||null;}
function listJson(dir){const abs=path.join(ROOT,dir);if(!fs.existsSync(abs))return [];return fs.readdirSync(abs,{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.json')).map(e=>path.join(dir,e.name));}
function discoverPacks(){const base=path.join(ROOT,'coordination/workstreams');if(!fs.existsSync(base))return [];return fs.readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>`coordination/workstreams/${e.name}/PACK.json`).filter(exists).map(rel=>({rel,pack:readJson(rel)}));}

fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const now=readJson('coordination/NOW.json');
const feed=readJson(now.delta_feed);
const runtime=readJson('coordination/AGENT_RUNTIME.json');
const profiles=readJson('coordination/EXECUTION_PROFILES.json');
const catalog=exists('catalog/pages.json')?readJson('catalog/pages.json'):{pages:[]};
const mainHead=branchHead('main')||git(['rev-parse','HEAD']);
const generatedAt=new Date().toISOString();
const compatById=new Map((now.active_workstreams||[]).map(w=>[w.id,w]));
const workerFiles=listJson('coordination/network/workers');
const workers=workerFiles.map(rel=>readJson(rel)).filter(w=>w.schema==='prometeo.worker-status/v1').map(publicWorker);
const workerByWs=new Map();
for(const w of workers){if(!workerByWs.has(w.workstream_id))workerByWs.set(w.workstream_id,[]);workerByWs.get(w.workstream_id).push(w);}

const workstreams=[];
for(const {rel,pack} of discoverPacks()){
  if(!pack.id)continue;
  const compat=compatById.get(pack.id)||{};
  const branch=pack.branch||pack.candidate_branch||compat.branch||'main';
  const repository=pack.repository||compat.repository||REPO;
  const wsWorkers=workerByWs.get(pack.id)||[];
  const latest=latestWorker(wsWorkers);
  const returnPath=pack.return_path||compat.last_return||`coordination/workstreams/${pack.id}/LAST_RETURN.json`;
  const last=exists(returnPath)?readJson(returnPath):null;
  const actualBranchHead=repository===REPO?branchHead(branch):(latest?.reported_head||pack.reported_head||null);
  const knownBranchHead=firstKnown(last?.branch_head_after,last?.branch_head,last?.head,pack.observed_head,compat.observed_head,compat.branch_created_from_control_plane_head);
  const branchDelta=repository===REPO?commitsBetween(knownBranchHead,actualBranchHead):[];
  const writeScope=uniq([...(pack.write_scope||compat.write_scope||[]),...wsWorkers.flatMap(w=>w.write_scope||[])]);
  const prefixes=scopePrefixes(writeScope);
  const upstreamBase=firstKnown(last?.main_head_seen,last?.observed_main_head,compat.observed_product_head,compat.observed_main_head,pack.observed_product_head,pack.observed_main_head);
  const upstreamRelevant=repository===REPO?recentTouching(upstreamBase,mainHead,prefixes):[];
  const topics=uniq([...(pack.delta_topics||compat.topics||[]),pack.id]);
  const needs=uniq([...(pack.needs||[]),...wsWorkers.flatMap(w=>w.needs||[])]);
  const provides=uniq([...(pack.provides||[]),...wsWorkers.flatMap(w=>w.provides||[])]);
  const dependsOn=uniq([...(pack.depends_on||pack.shared_dependencies||[]),...wsWorkers.flatMap(w=>w.depends_on||[])]);
  const impacts=uniq([...(pack.impacts||[]),...wsWorkers.flatMap(w=>w.impacts||[])]);
  const sharedOwners=uniq([...(pack.candidate_shared_owners||[]),...wsWorkers.flatMap(w=>w.candidate_shared_owners||[])]);
  const lastUseful=latest?.last_useful_delta||last?.last_useful_delta||last?.result_summary||null;
  let branchDrift='NONE';if(actualBranchHead&&knownBranchHead&&actualBranchHead!==knownBranchHead)branchDrift=isAncestor(knownBranchHead,actualBranchHead)?'FAST_FORWARD_DELTA':'DIVERGED_OR_UNKNOWN';
  workstreams.push({
    id:pack.id,title:pack.title||compat.title||pack.id,status:pack.status||compat.status||'REGISTERED',mode:pack.mode||compat.mode||'LAB',
    repository,branch,match_terms:uniq([...(pack.match_terms||compat.match_terms||[]),...tokens(pack.title||'')]),topics,write_scope:writeScope,
    needs,provides,depends_on:dependsOn,impacts,candidate_shared_owners:sharedOwners,last_useful_delta:lastUseful,
    worker_ids:wsWorkers.map(w=>w.worker_instance_id),worker_states:uniq(wsWorkers.map(w=>w.state)),latest_worker_updated_at:latest?.updated_at||null,
    actual_branch_head:actualBranchHead,known_branch_head:knownBranchHead,branch_delta:branchDelta,upstream_relevant:upstreamRelevant,
    material_activity:branchDelta.length>0||upstreamRelevant.length>0||!!lastUseful,
    pack,pack_path:rel,last_return:last,return_path:returnPath,
    drift:{branch:branchDrift,upstream_main:upstreamRelevant.length?'RELEVANT_MAIN_ACTIVITY':'NONE'}
  });
}

const convergence=deriveConvergence(workstreams);
const networkCore={
  schema:'prometeo.agent-network/v1',runtime_revision:runtime.version,generated_at:generatedAt,role:'DERIVED_COORDINATION_ONLY_NOT_PRODUCT_AUTHORITY',
  workstreams:workstreams.map(w=>({id:w.id,title:w.title,status:w.status,mode:w.mode,repository:w.repository,branch:w.branch,actual_branch_head:w.actual_branch_head,write_scope:w.write_scope,frontier:latestWorker(workerByWs.get(w.id)||[])?.frontier||w.last_return?.execution_frontier||null,last_useful_delta:w.last_useful_delta,needs:w.needs,provides:w.provides,depends_on:w.depends_on,impacts:w.impacts,candidate_shared_owners:w.candidate_shared_owners,worker_ids:w.worker_ids,worker_states:w.worker_states,staleness:w.worker_ids.length?'WORKER_REPORTED':'NO_LIVE_WORKER_ATTESTATION'})),
  workers,
  convergence_summary:{total:convergence.length,hard:convergence.filter(e=>e.severity==='HARD').length,soft:convergence.filter(e=>e.severity==='SOFT').length,info:convergence.filter(e=>e.severity==='INFO').length},
  privacy:'PUBLIC_COORDINATION_METADATA_ONLY'
};
assertPublicSafe(networkCore);
const networkHash=sha256(networkCore);
const semanticEpochInput={runtime:runtime.version,deltas:feed.revision,main:mainHead,network_hash:networkHash,convergence:convergence.map(e=>e.event_id)};
const epochId=`P${runtime.version}-${sha256(semanticEpochInput).slice(0,12)}`;
const epoch={schema:'prometeo.epoch/v1',epoch:epochId,runtime:runtime.version,deltas:feed.revision,network:networkHash.slice(0,16),main:String(mainHead||'').slice(0,12),workstreams:workstreams.length};
writeJson('epoch.json',epoch);
writeJson('network.json',{...networkCore,network_hash:networkHash,epoch:epochId});
writeJson('convergence.json',{schema:'prometeo.convergence-view/v1',runtime_revision:runtime.version,generated_at:generatedAt,epoch:epochId,events:convergence});
writeJson('workstream-index.json',{schema:'prometeo.workstream-index/v1',generated_at:generatedAt,epoch:epochId,workstreams:workstreams.map(w=>({id:w.id,title:w.title,status:w.status,mode:w.mode,repository:w.repository,branch:w.branch,pack_path:w.pack_path,packet_url:`https://juanmanuelpm.github.io/prometeo/agent-runtime/workstreams/${w.id}.json`}))});

const packets=[];const activity=[];const routingIndex=[];
for(const ws of workstreams){
  const pack=ws.pack,last=ws.last_return;
  const watermark=Math.max(Number(last?.global_revision_seen??0),Number(pack.last_global_revision_seen??0));
  const topicSet=new Set(ws.topics.map(norm));
  const relevantDeltas=(feed.deltas||[]).filter(d=>d.revision>watermark&&((d.topics||[]).includes('all')||(d.topics||[]).some(t=>topicSet.has(norm(t)))));
  const relevantEvents=filterRelevantEvents(convergence,ws);
  const ownWorkers=workers.filter(w=>w.workstream_id===ws.id);
  const defaultProfile=selectProfile(pack,ws,last);
  const packetCore={
    schema:'prometeo.compiled-work-packet/v3',runtime_revision:runtime.version,generated_at:generatedAt,epoch,now_revision:now.revision,global_delta_revision:feed.revision,
    workstream:{id:ws.id,title:ws.title,status:ws.status,mode:ws.mode,repository:ws.repository,branch:ws.branch,short_id:shortId(ws.id)},authority:now.authority,
    human_intent:pack.human_intent||null,already_decided:pack.already_decided||pack.must_preserve||[],high_value_targets:pack.high_value_targets||[],known_failures:pack.known_failures||pack.avoid||[],
    write_scope:ws.write_scope,needs:ws.needs,provides:ws.provides,depends_on:ws.depends_on,impacts:ws.impacts,candidate_shared_owners:ws.candidate_shared_owners,
    workers:ownWorkers,last_return:last,
    state:{actual_branch_head:ws.actual_branch_head,known_branch_head:ws.known_branch_head,main_head:mainHead,drift:ws.drift},
    activity_delta:{branch_commits:ws.branch_delta,upstream_main_commits_touching_scope:ws.upstream_relevant},
    cross_chat:{network_url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/network.json',convergence_url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/convergence.json',relevant_events:relevantEvents,relevant_global_deltas:relevantDeltas},
    refresh_contract:{fast_epoch_url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/epoch.json',epoch_seen:uniq(ownWorkers.map(w=>w.epoch_seen)).filter(Boolean),same_epoch:'Continue without reading NETWORK/DELTA; do not recompile context.',new_epoch:'Reload only this compiled packet; it already contains filtered relevant changes.'},
    conditional_read_graph:pack.read_first||[],
    execution:{default_profile:defaultProfile,profiles,hard_commands:runtime.hard_commands,frontier:last?.execution_frontier||last?.next_step||pack.execution_frontier||null},
    seal:{active:`🟣 P✓ · ${shortId(ws.id)}`,diagnostic:`🟣 P✓ · ${shortId(ws.id)} · ${defaultProfile} · R${runtime.version} · ${epochId}`,boundary:`🟡 P~ · ${shortId(ws.id)}`,failure:'🔴 P! · PROMETEO',rule:runtime.seal.rule},
    instructions:[
      'Use this packet as compiled working context; do not repeat repository archaeology.',
      'Before material work in an already-bootstrapped chat, compare the tiny public EPOCH id with the last seen id. If unchanged, continue immediately.',
      'If EPOCH changed, reload only this packet; consume only relevant cross-chat events included here.',
      'Recover the last materially unsatisfied human intent from the conversation before asking the human to repeat anything.',
      'If branch/upstream activity is listed, reconcile only those commits before material work.',
      'Existing frozen plans must be continued, not regenerated.',
      'Prefer implementation + critique + repair in one cycle; checks are evidence, not progress.'
    ]
  };
  assertPublicSafe(packetCore);
  const packetHash=sha256(packetCore);writeJson(`workstreams/${ws.id}.json`,{...packetCore,packet_hash:packetHash});
  packets.push({id:ws.id,title:ws.title,mode:ws.mode,status:ws.status,url:`https://juanmanuelpm.github.io/prometeo/agent-runtime/workstreams/${ws.id}.json`,packet_hash:packetHash,actual_branch_head:ws.actual_branch_head,drift:ws.drift,default_profile:defaultProfile,relevant_event_count:relevantEvents.length});
  activity.push({id:ws.id,repository:ws.repository,branch:ws.branch,actual_branch_head:ws.actual_branch_head,known_branch_head:ws.known_branch_head,branch_delta_count:ws.branch_delta.length,upstream_relevant_count:ws.upstream_relevant.length,worker_count:ownWorkers.length,changed_paths:uniq([...ws.branch_delta,...ws.upstream_relevant].flatMap(c=>c.files||[])).slice(0,80)});
  routingIndex.push({kind:'workstream',id:ws.id,match_terms:uniq([...ws.match_terms,...tokens(ws.title)]),url:`https://juanmanuelpm.github.io/prometeo/agent-runtime/workstreams/${ws.id}.json`,priority:100});
}

const surfaces=[];
for(const page of catalog.pages||[]){
  const ranked=workstreams.map(ws=>({id:ws.id,score:matchScore(page,ws)})).sort((a,b)=>b.score-a.score);
  const activeWorkstream=ranked[0]?.score>0?ranked[0].id:null;
  const aliases=uniq([page.id,...tokens(page.title),...tokens(page.description)]);
  const card={schema:'prometeo.surface-route/v2',generated_at:generatedAt,page_id:page.id,title:page.title,status:page.status,href:page.href,description:page.description||null,source:page.source||null,verified:page.verified||null,active_workstream:activeWorkstream,active_workstream_packet:activeWorkstream?`https://juanmanuelpm.github.io/prometeo/agent-runtime/workstreams/${activeWorkstream}.json`:null,authority_hint:'Routing only; not write or Human Accepted/Served authority.',when_unregistered:'Load GENERAL, recover the conversation, then scaffold one scoped workstream before material writes.'};
  writeJson(`surfaces/${page.id}.json`,card);
  const url=`https://juanmanuelpm.github.io/prometeo/agent-runtime/surfaces/${page.id}.json`;
  surfaces.push({id:page.id,title:page.title,status:page.status,url,active_workstream:activeWorkstream,aliases});
  routingIndex.push({kind:'surface',id:page.id,match_terms:aliases,url,priority:activeWorkstream?50:40});
}

const allDeltas=(feed.deltas||[]).filter(d=>(d.topics||[]).includes('all'));
const generalCore={schema:'prometeo.compiled-work-packet/v3',runtime_revision:runtime.version,generated_at:generatedAt,epoch,workstream:{id:'prometeo-general',title:'Prometeo general surface recovery',status:'ROUTING_FALLBACK',mode:'LAB',repository:REPO,branch:null,short_id:'GENERAL'},authority:now.authority,human_intent:'Recover and route work on a Prometeo surface that does not yet have a dedicated active workstream.',already_decided:['Do not reconstruct the entire repository by default.','Use the matched surface card and Catalog/source pointers.','GENERAL is read-only and cannot grant material write scope.'],high_value_targets:['Recover the unfinished request with minimum context overhead.','Scaffold a small workstream only when material writes begin.'],known_failures:['Inventing global architecture because one surface lacks a PACK.'],write_scope:[],workers:[],cross_chat:{network_url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/network.json',relevant_events:[],relevant_global_deltas:allDeltas},refresh_contract:{fast_epoch_url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/epoch.json',same_epoch:'Continue.',new_epoch:'Reload GENERAL or the newly registered workstream packet.'},conditional_read_graph:[{ref:'main',path:'catalog/pages.json'},{ref:'main',path:'lineage/CAPABILITY_REGISTRY.json'}],execution:{default_profile:'DEEP',profiles,hard_commands:runtime.hard_commands,frontier:null},seal:{active:'🟣 P✓ · GENERAL',diagnostic:`🟣 P✓ · GENERAL · DEEP · R${runtime.version} · ${epochId}`,boundary:'🟡 P~ · GENERAL',failure:'🔴 P! · PROMETEO',rule:runtime.seal.rule},instructions:['Recover the current surface and unfinished request.','Before material writes create a scoped workstream/branch/status object.']};
const generalHash=sha256(generalCore);writeJson('workstreams/prometeo-general.json',{...generalCore,packet_hash:generalHash});
writeJson('activity-index.json',{schema:'prometeo.activity-index/v2',generated_at:generatedAt,epoch:epochId,main_head:mainHead,workstreams:activity});
const manifest={schema:'prometeo.agent-runtime-manifest/v3',runtime_revision:runtime.version,generated_at:generatedAt,epoch_url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/epoch.json',epoch:epochId,network_url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/network.json',convergence_url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/convergence.json',workstream_index:'https://juanmanuelpm.github.io/prometeo/agent-runtime/workstream-index.json',main_head:mainHead,now_revision:now.revision,global_delta_revision:feed.revision,stable_entry:runtime.stable_entry,runtime_contract:'https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/coordination/AGENT_RUNTIME.json',execution_profiles:'https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/coordination/EXECUTION_PROFILES.json',activity_index:'https://juanmanuelpm.github.io/prometeo/agent-runtime/activity-index.json',packets,surface_routes:surfaces,fallback_packet:{id:'prometeo-general',url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/workstreams/prometeo-general.json',packet_hash:generalHash},routing_index:routingIndex,routing_hint:'Read EPOCH cheaply. If unchanged, continue. If changed, route to one active packet; otherwise surface + GENERAL. Prometeo=resync/recover/continue; dot=continue frontier.',seal_rule:runtime.seal.rule};
assertPublicSafe(manifest);writeJson('manifest.json',manifest);
console.log(JSON.stringify({ok:true,runtime:runtime.version,epoch:epochId,workstreams:workstreams.length,workers:workers.length,convergence:convergence.length,hard_collisions:convergence.filter(e=>e.severity==='HARD').length,surfaces:surfaces.length},null,2));
