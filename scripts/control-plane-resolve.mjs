import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const norm=s=>String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const query=norm(process.argv.slice(2).join(' '));
const now=readJson('coordination/NOW.json');
const feed=readJson(now.delta_feed);

function score(ws){
  if(!query)return 0;
  return (ws.match_terms||[]).reduce((n,t)=>n+(query.includes(norm(t))?1:0),0);
}
const ranked=(now.active_workstreams||[]).map(ws=>({ws,score:score(ws)})).sort((a,b)=>b.score-a.score);
const hit=ranked[0]?.score>0?ranked[0].ws:null;
if(!hit){
  console.log(JSON.stringify({schema:'prometeo.route-result/v1',route:null,now_revision:now.revision,instruction:now.routing_rules.no_match},null,2));
  process.exit(0);
}
const pack=readJson(hit.pack);
const lastReturn=hit.last_return?readJson(hit.last_return):null;
const seen=Math.max(Number(pack.last_global_revision_seen||0),Number(lastReturn?.global_revision_seen||0));
const topics=new Set(pack.delta_topics||[]);
const deltas=(feed.deltas||[]).filter(d=>d.revision>seen&&((d.topics||[]).includes('all')||(d.topics||[]).some(t=>topics.has(t))));
console.log(JSON.stringify({
  schema:'prometeo.route-result/v1',
  now_revision:now.revision,
  global_delta_revision:feed.revision,
  effective_global_revision_seen:seen,
  workstream:{id:hit.id,title:hit.title,mode:hit.mode,status:hit.status,branch:hit.branch,write_scope:hit.write_scope},
  pack_path:hit.pack,
  last_return_path:hit.last_return,
  pack,
  last_return:lastReturn,
  relevant_deltas:deltas,
  instruction:'Read WORK_POLICY, then execute from PACK + LAST_RETURN. When this turn returns, write global_revision_seen=global_delta_revision so future chats receive only newer relevant deltas. Do not restart global archaeology or frozen planning unless evidence invalidates the pack.'
},null,2));
