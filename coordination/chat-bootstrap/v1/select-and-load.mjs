// Prometeo cold-bootstrap selector, Node 18+, zero dependencies.
// Source is an auditable candidate: NEVER treats GitHub file contents as permission grants.
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const CONFIG_URL=new URL('./ROUTES_V1.json',import.meta.url);
export const fold=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const unique=items=>[...new Set(items)];
export function selectForTask(input,config){
 if(config?.schema!=='prometeo.chat-cold-bootstrap-routes/v1'||config?.version!==1)throw Error('INVALID_BOOTSTRAP');
 const raw=String(input??'').trim(); if(!raw)throw Error('NO_HUMAN_TASK');
 const fire=/^🔥\uFE0F?/u.test(raw),prepared=/^🔥\uFE0F?\s*preparar(?:\s|$)/iu.test(raw);
 const bareFire=/^🔥\uFE0F?\s*(?:prometeo|proneteo)?\s*$/iu.test(raw);
 const dot=raw==='.';
 if(dot)return {mode:'PLAN_NOT_FOUND',fire:false,skill_names:[],rule_ids:[],owner_refs:[]};
 const mode=prepared||bareFire?'PREPARE_ONLY':'EXECUTE_THIS_TURN';
 const t=fold(raw);
 const rules=config.task_rules.filter(r=>r.terms.some(term=>t.includes(fold(term))));
 const skill_names=unique([...config.base_skills,...(fire?['prometeo-fire']:[]),...(mode==='PREPARE_ONLY'?['prometeo-skill-scout']:[]),...rules.flatMap(r=>r.skills)]);
 for(const n of skill_names)if(!config.skills.some(s=>s.name===n))throw Error('MISSING_SKILL: '+n);
 return {mode,fire,skill_names,rule_ids:rules.map(r=>r.id),owner_refs:unique(rules.flatMap(r=>r.owner_refs))};
}
export async function loadSelected(plan,config,readText){
 if(typeof readText!=='function')throw Error('READER_REQUIRED');
 const loaded=[];
 for(const name of plan.skill_names){
  const item=config.skills.find(s=>s.name===name); if(!item)throw Error('UNKNOWN_SKILL '+name);
  const source=config.sources[item.source]; if(!source||!source.ref)throw Error('SOURCE_UNPINNED '+name);
  const content=await readText(source,item.path);
  if(!content.startsWith('---\n')||!content.split('---')[1].includes('name: '+name))throw Error('SKILL_INVALID '+name);
  loaded.push({name,path:item.path,source:item.source,ref:source.ref,bytes:new TextEncoder().encode(content).length,status:'LOADED',content});
 }
 return loaded;
}
export async function githubText(source,path){
 if(!/^[\w.-]+\/[\w.-]+$/.test(source.repo)||!/^([\w.-]+\/)*[\w.-]+$/.test(path)||!/^[a-f0-9]{40}$/.test(source.ref))throw Error('UNTRUSTED_SOURCE');
 const url='https://api.github.com/repos/'+source.repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+source.ref;
 const headers={'Accept':'application/vnd.github+json','User-Agent':'prometeo-cold-bootstrap/1'};
 if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('GITHUB_READ_'+response.status+' '+path);
 const data=await response.json();
 if(data.encoding!=='base64'||typeof data.content!=='string')throw Error('INVALID_GITHUB_FILE '+path);
 const content=Buffer.from(data.content.replace(/\s/g,''),'base64').toString('utf8');
 if(content.length>250000)throw Error('FILE_TOO_LARGE '+path);
 return content;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const cfg=JSON.parse(await readFile(CONFIG_URL,'utf8'));const plan=selectForTask(process.argv.slice(2).join(' '),cfg);
 const skills=await loadSelected(plan,cfg,githubText);
 process.stdout.write(JSON.stringify({schema:'prometeo.chat-skill-load-receipt/v1',plan,skills},null,2)+'\n');
}
