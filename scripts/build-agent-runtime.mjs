import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outArg=process.argv.indexOf('--out');
const OUT=path.resolve(ROOT,outArg>=0?process.argv[outArg+1]:'dist/agent-runtime');
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const writeJson=(rel,obj)=>{const p=path.join(OUT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n');};
const git=(args,allowFail=false)=>{try{return execFileSync('git',args,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}catch(e){if(allowFail)return '';throw e;}};
const existsCommit=sha=>!!sha&&!!git(['cat-file','-e',`${sha}^{commit}`],true);
function isAncestor(a,b){if(!a||!b)return false;try{execFileSync('git',['merge-base','--is-ancestor',a,b],{cwd:ROOT,stdio:'ignore'});return true;}catch{return false;}}
const sha256=v=>crypto.createHash('sha256').update(v).digest('hex');
const norm=s=>String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const tokens=s=>[...new Set(norm(s).split(/[^a-z0-9]+/).filter(x=>x.length>2))];
const scopePrefixes=(scopes=[])=>[...new Set(scopes.map(s=>String(s).split('*')[0].replace(/\/$/,'')).filter(s=>s&&(/[/.]/.test(s)||s.endsWith('/'))&&!/\s/.test(s)))];

function commitInfo(sha){if(!sha)return null;const meta=git(['show','-s','--format=%H%x1f%s%x1f%cI',sha],true);if(!meta)return null;const [id,subject,date]=meta.split('\x1f');const files=git(['show','--pretty=format:','--name-only',sha],true).split(/\r?\n/).filter(Boolean);return {sha:id,subject,date,files};}
function commitsBetween(base,head,max=16){if(!base||!head||base===head||!existsCommit(base)||!existsCommit(head)||!isAncestor(base,head))return [];return git(['rev-list',`--max-count=${max}`,`${base}..${head}`],true).split(/\r?\n/).filter(Boolean).map(commitInfo).filter(Boolean);}
function recentTouching(base,head,prefixes,max=16){if(!head||!existsCommit(head)||!prefixes.length)return [];let args=['rev-list',`--max-count=${max}`];if(base&&existsCommit(base)&&isAncestor(base,head))args.push(`${base}..${head}`);else args.push(head);args.push('--',...prefixes);return git(args,true).split(/\r?\n/).filter(Boolean).map(commitInfo).filter(Boolean);}
function firstKnown(...values){return values.flat().find(v=>typeof v==='string'&&/^[0-9a-f]{7,40}$/i.test(v))||null;}
function branchHead(name){return git(['rev-parse',`refs/remotes/origin/${name}`],true)||git(['rev-parse',name],true)||null;}
function shortId(id){return String(id).toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,12)||'PROMETEO';}
function selectProfile(pack,ws,last){if(pack.execution_profile)return pack.execution_profile;if(last?.execution_frontier||last?.next_step||last?.plan_frozen)return 'CONTINUE';if((pack.already_decided||[]).some(x=>/frozen|100-point|100 point|plan.*exists/i.test(String(x))))return 'CONTINUE';return ws.mode==='LAB'?'DEEP':'DEEP';}
function matchScore(surface,ws){const hay=norm([surface.id,surface.title,surface.description,surface.href].join(' '));return (ws.match_terms||[]).reduce((n,t)=>n+(hay.includes(norm(t))?1:0),0);}

fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const now=readJson('coordination/NOW.json');
const feed=readJson(now.delta_feed);
const runtime=readJson('coordination/AGENT_RUNTIME.json');
const profiles=readJson('coordination/EXECUTION_PROFILES.json');
const catalog=fs.existsSync(path.join(ROOT,'catalog/pages.json'))?readJson('catalog/pages.json'):{pages:[]};
const mainHead=branchHead('main')||git(['rev-parse','HEAD']);
const generatedAt=new Date().toISOString();
const packets=[];const activity=[];const routingIndex=[];

for(const ws of now.active_workstreams||[]){
  const pack=readJson(ws.pack);
  const last=ws.last_return&&fs.existsSync(path.join(ROOT,ws.last_return))?readJson(ws.last_return):null;
  const branch=ws.branch||'main';
  const actualBranchHead=branchHead(branch);
  const knownBranchHead=firstKnown(last?.branch_head_after,last?.branch_head,last?.head,pack.observed_head,ws.observed_head,ws.branch_created_from_control_plane_head);
  const branchDelta=commitsBetween(knownBranchHead,actualBranchHead);
  const prefixes=scopePrefixes(ws.write_scope||pack.write_scope||[]);
  const upstreamBase=firstKnown(last?.main_head_seen,last?.observed_main_head,ws.observed_product_head,ws.observed_main_head,pack.observed_product_head);
  const upstreamRelevant=recentTouching(upstreamBase,mainHead,prefixes);
  const watermark=Math.max(Number(last?.global_revision_seen??0),Number(pack.last_global_revision_seen??0));
  const topics=new Set(pack.delta_topics||ws.topics||[]);
  const relevantDeltas=(feed.deltas||[]).filter(d=>d.revision>watermark&&((d.topics||[]).includes('all')||(d.topics||[]).some(t=>topics.has(t))));
  let branchDrift='NONE';if(actualBranchHead&&knownBranchHead&&actualBranchHead!==knownBranchHead)branchDrift=isAncestor(knownBranchHead,actualBranchHead)?'FAST_FORWARD_DELTA':'DIVERGED_OR_UNKNOWN';
  const drift={branch:branchDrift,upstream_main:upstreamRelevant.length?'RELEVANT_MAIN_ACTIVITY':'NONE'};
  const defaultProfile=selectProfile(pack,ws,last);
  const packetCore={schema:'prometeo.compiled-work-packet/v2',runtime_revision:runtime.version,generated_at:generatedAt,now_revision:now.revision,global_delta_revision:feed.revision,workstream:{id:ws.id,title:ws.title,status:ws.status,mode:ws.mode,branch,short_id:shortId(ws.id)},authority:now.authority,human_intent:pack.human_intent||null,already_decided:pack.already_decided||[],high_value_targets:pack.high_value_targets||[],known_failures:pack.known_failures||[],shared_dependencies:pack.shared_dependencies||[],write_scope:ws.write_scope||pack.write_scope||[],read_only_by_default:pack.read_only_by_default||ws.do_not_compete_with||[],last_return:last,state:{actual_branch_head:actualBranchHead,known_branch_head:knownBranchHead,main_head:mainHead,drift},activity_delta:{branch_commits:branchDelta,upstream_main_commits_touching_scope:upstreamRelevant},relevant_global_deltas:relevantDeltas,conditional_read_graph:pack.read_first||[],execution:{default_profile:defaultProfile,profiles,hard_commands:runtime.hard_commands,frontier:last?.execution_frontier||last?.next_step||null},seal:{active:`🟣 P✓ · ${shortId(ws.id)}`,diagnostic:`🟣 P✓ · ${shortId(ws.id)} · <PROFILE> · R${runtime.version} · Δ${feed.revision}`,boundary:`🟡 P~ · ${shortId(ws.id)}`,failure:'🔴 P! · PROMETEO',rule:runtime.seal.rule},instructions:['Use this packet as compiled working context; do not repeat repository archaeology.','Recover the last materially unsatisfied human intent from the current conversation before asking the human to repeat anything.','If branch/upstream activity is listed, reconcile only those commits before material work.','Follow conditional references only when they can change the current decision.','Choose FAST/DEEP/EXHAUSTIVE/CONTINUE from execution profiles. Existing frozen plans must be continued, not regenerated.','Prefer implementation + critique + repair in one cycle; checks are evidence, not progress.','Never print the active violet seal unless stable entry + this packet were actually loaded.']};
  const packetHash=sha256(JSON.stringify(packetCore));const packet={...packetCore,packet_hash:packetHash};writeJson(`workstreams/${ws.id}.json`,packet);
  packets.push({id:ws.id,title:ws.title,mode:ws.mode,status:ws.status,url:`https://juanmanuelpm.github.io/prometeo/agent-runtime/workstreams/${ws.id}.json`,packet_hash:packetHash,actual_branch_head:actualBranchHead,drift,default_profile:defaultProfile});
  activity.push({id:ws.id,branch,actual_branch_head:actualBranchHead,known_branch_head:knownBranchHead,branch_delta_count:branchDelta.length,upstream_relevant_count:upstreamRelevant.length,changed_paths:[...new Set([...branchDelta,...upstreamRelevant].flatMap(c=>c.files||[]))].slice(0,80)});
  routingIndex.push({kind:'workstream',id:ws.id,match_terms:[...(ws.match_terms||[]),...tokens(ws.title)],url:`https://juanmanuelpm.github.io/prometeo/agent-runtime/workstreams/${ws.id}.json`,priority:100});
}

const surfaces=[];
for(const page of catalog.pages||[]){
  const ranked=(now.active_workstreams||[]).map(ws=>({id:ws.id,score:matchScore(page,ws)})).sort((a,b)=>b.score-a.score);
  const activeWorkstream=ranked[0]?.score>0?ranked[0].id:null;
  const aliases=[...new Set([page.id,...tokens(page.title),...tokens(page.description)].filter(Boolean))];
  const card={schema:'prometeo.surface-route/v1',generated_at:generatedAt,page_id:page.id,title:page.title,status:page.status,href:page.href,description:page.description||null,source:page.source||null,verified:page.verified||null,active_workstream:activeWorkstream,active_workstream_packet:activeWorkstream?`https://juanmanuelpm.github.io/prometeo/agent-runtime/workstreams/${activeWorkstream}.json`:null,authority_hint:'This card routes to a surface; it is not permission to write or a Human Accepted/Served claim.',when_unregistered:'Load GENERAL packet, then source/catalog pointers needed for this surface. Create one small scoped workstream before material writes.'};
  writeJson(`surfaces/${page.id}.json`,card);
  const url=`https://juanmanuelpm.github.io/prometeo/agent-runtime/surfaces/${page.id}.json`;
  surfaces.push({id:page.id,title:page.title,status:page.status,url,active_workstream:activeWorkstream,aliases});
  routingIndex.push({kind:'surface',id:page.id,match_terms:aliases,url,priority:activeWorkstream?50:40});
}

const allDeltas=(feed.deltas||[]).filter(d=>(d.topics||[]).includes('all'));
const generalCore={schema:'prometeo.compiled-work-packet/v2',runtime_revision:runtime.version,generated_at:generatedAt,now_revision:now.revision,global_delta_revision:feed.revision,workstream:{id:'prometeo-general',title:'Prometeo general surface recovery',status:'ROUTING_FALLBACK',mode:'LAB',branch:null,short_id:'GENERAL'},authority:now.authority,human_intent:'Recover and route work on a Prometeo surface that does not yet have a dedicated active workstream.',already_decided:['Do not reconstruct the entire repository by default.','Use the matched surface card and Catalog/source pointers.','Do not claim or assume write ownership until a scoped workstream exists.','Promote reusable discoveries through normal shared ownership rather than duplicating them page-locally.'],high_value_targets:['Recover the user’s unfinished request with minimum context overhead.','Identify where the symptom appears and who should own the solution.','Create a small scoped workstream only if material writes are needed.'],known_failures:['Treating every new page request as a reason to redesign global architecture.','Using a page symptom to justify duplicating an existing shared capability.'],write_scope:[],last_return:null,state:{main_head:mainHead,drift:{branch:'NONE',upstream_main:'N/A'}},activity_delta:{branch_commits:[],upstream_main_commits_touching_scope:[]},relevant_global_deltas:allDeltas,conditional_read_graph:[{ref:'main',path:'catalog/pages.json'},{ref:'main',path:'lineage/CAPABILITY_REGISTRY.json'}],execution:{default_profile:'DEEP',profiles,hard_commands:runtime.hard_commands,frontier:null},seal:{active:'🟣 P✓ · GENERAL',diagnostic:`🟣 P✓ · GENERAL · <PROFILE> · R${runtime.version} · Δ${feed.revision}`,boundary:'🟡 P~ · GENERAL',failure:'🔴 P! · PROMETEO',rule:runtime.seal.rule},instructions:['Use the matched surface card first.','Recover the unfinished request from the conversation.','Read only source/capability owners that can change the current decision.','Before material writes, establish a scoped workstream/branch/write scope instead of writing ad hoc to main.']};
const generalHash=sha256(JSON.stringify(generalCore));writeJson('workstreams/prometeo-general.json',{...generalCore,packet_hash:generalHash});

writeJson('activity-index.json',{schema:'prometeo.activity-index/v1',generated_at:generatedAt,main_head:mainHead,workstreams:activity});
writeJson('manifest.json',{schema:'prometeo.agent-runtime-manifest/v2',runtime_revision:runtime.version,generated_at:generatedAt,main_head:mainHead,now_revision:now.revision,global_delta_revision:feed.revision,stable_entry:runtime.stable_entry,runtime_contract:'https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/coordination/AGENT_RUNTIME.json',execution_profiles:'https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/coordination/EXECUTION_PROFILES.json',activity_index:'https://juanmanuelpm.github.io/prometeo/agent-runtime/activity-index.json',packets,surface_routes:surfaces,fallback_packet:{id:'prometeo-general',url:'https://juanmanuelpm.github.io/prometeo/agent-runtime/workstreams/prometeo-general.json',packet_hash:generalHash},routing_index:routingIndex,routing_hint:'Match conversation intent to an active packet first. Otherwise match a Catalog surface card and load GENERAL. On PROMETEO, resync and continue the last unsatisfied intent. On dot, continue the active frontier.',seal_rule:runtime.seal.rule});
console.log(JSON.stringify({ok:true,runtime:runtime.version,main_head:mainHead,packets:packets.map(p=>({id:p.id,drift:p.drift,profile:p.default_profile})),surfaces:surfaces.length,fallback:'prometeo-general'},null,2));
