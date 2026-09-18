import fs from 'node:fs';
import path from 'node:path';

const source=path.resolve(process.argv[2]||'.');
const site=path.resolve(process.argv[3]||'.');
const outDir=path.resolve(process.argv[4]||path.join(site,'guide'));
const read=(base,rel)=>{try{return fs.readFileSync(path.join(base,rel),'utf8')}catch{return ''}};
const json=(base,rel)=>{try{return JSON.parse(read(base,rel))}catch{return null}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const urls=s=>[...String(s||'').matchAll(/https:\/\/[^\s)"']+/g)].map(m=>m[0].replace(/[.,;:]$/,''));

const mission=json(source,'coordination/guide/CURRENT_MISSION_V1.json')||{};
const compass=json(source,'coordination/guide/GUIDE_POWER_COMPASS_V1.json')||{};
const campaign=json(source,'coordination/guide/GROWTH_CAMPAIGN_V1.json')||{};
const trajectory=json(source,'coordination/guide/GROWTH_TRAJECTORY_V1.json')||{};
const pages=json(source,'coordination/live/PAGE_WATCH_REGISTRY_V1.json')||{pages:[]};
const portfolio=json(source,'coordination/portfolio/PORTFOLIO.json')||{projects:[]};
const runtime=json(site,'live/runtime.json')||{};
const scoreboard=json(site,'live/worker-scoreboard.json')||{};
const frontier=json(site,'live/claim-frontier.json')||{};

const projects=[];
for(const p of portfolio.projects||[]){
  const st=json(source,`coordination/project-guides/${p.project_id}/STATE.json`);
  if(!st) continue;
  const review=[...new Set((st.blockers||[]).flatMap(urls))];
  projects.push({
    project_id:st.project_id,label:st.label||p.label||st.project_id,status:st.status,
    revision:st.revision,updated_at:st.updated_at,objective:st.objective||p.goal||'',
    focus:st.focus||'',blockers:st.blockers||[],frontier_count:(st.frontier_refs||[]).length,
    review_links:review
  });
}
projects.sort((a,b)=>(Number((portfolio.projects||[]).find(p=>p.project_id===b.project_id)?.priority)||0)-(Number((portfolio.projects||[]).find(p=>p.project_id===a.project_id)?.priority)||0));

const pageRows=(pages.pages||[]).map(p=>({
  plate:p.plate,title:p.title,url:p.url,folder:p.folder,status:p.status,revision:p.revision,
  changed_at:p.changed_at,change_id:p.change_id,change_note:p.change_note
}));

const pool=(runtime.batches||[]).find(x=>x.batch_id==='POOL-PROD-01')||null;
const prompt=mission?.operating_mode?.invocation||campaign?.next_launch?.prompt||'';
const generatedAt=new Date().toISOString();
const data={
  schema:'prometeo.guide-brief/v1',generated_at:generatedAt,
  mission:{id:mission.mission_id,status:mission.status,title:mission.title,worker_protocol:mission?.operating_mode?.current_worker_protocol_version,pool_id:mission?.operating_mode?.pool_id},
  compounding:{assessment:compass.current_assessment||null,axes:compass?.growth_model?.axes||[],experiments:compass.current_priority_experiments||[],creative_levers:compass.creative_lever_catalog||[]},
  trajectory:{status:trajectory?.current_state?.empirical_growth_status||null,strategic_health:trajectory?.current_state?.strategic_health||null,active_stage:trajectory?.current_state?.active_stage||null,active_experiment:trajectory?.current_state?.active_experiment||null,strongest_evidence:trajectory?.current_state?.strongest_evidence||null,weakest_evidence:trajectory?.current_state?.weakest_evidence||null,url:'https://juanmanuelpm.github.io/prometeo/trajectory/'},
  pool:pool?{summary:pool.summary||null,last_event_at:pool.last_event_at||runtime.last_event_at||null}:null,
  scoreboard:{generated_at:scoreboard.generated_at||null,source_exam_count:scoreboard.source_exam_count||0,leader:scoreboard.leader||scoreboard.champion_candidate||null,champion:scoreboard.champion||null,champion_reproducible:!!scoreboard.champion_reproducible,reproduction_counts:scoreboard.reproduction_counts||{}},
  frontier:{generated_at:frontier.generated_at||null,candidate_count:(frontier.candidates||[]).length},
  projects,pages:pageRows,worker_prompt:prompt,
  links:{guide:'https://juanmanuelpm.github.io/prometeo/guide/',growth:'https://juanmanuelpm.github.io/prometeo/growth/',worker:'https://juanmanuelpm.github.io/prometeo/wc/',bootstrap:'https://juanmanuelpm.github.io/prometeo/g/'}
};
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'brief.json'),JSON.stringify(data,null,2)+'\n');

const health=esc(compass?.current_assessment?.overall||'UNKNOWN');
const projectHtml=projects.map(p=>`<section class="row"><div><b>${esc(p.label)}</b><span class="pill">${esc(p.status)}</span><small>rev ${esc(p.revision)} · ${esc(p.updated_at)}</small></div><p>${esc(p.focus)}</p>${p.review_links.length?`<div class="links">${p.review_links.map((u,i)=>`<a href="${esc(u)}" target="_blank">review ${i+1}</a>`).join('')}</div>`:''}</section>`).join('');
const pageHtml=pageRows.map(p=>`<section class="row page"><div><b>${esc(p.plate)} · ${esc(p.title)}</b><span class="pill">${esc(p.status)}</span><small>${esc(p.folder)} · ${esc(p.change_id||'')}</small></div><p>${esc(p.change_note||'')}</p><a href="${esc(p.url)}" target="_blank">abrir página</a></section>`).join('');
const expHtml=(compass.current_priority_experiments||[]).map(e=>`<section class="row"><div><b>${esc(e.id)}</b><span class="pill">${esc(e.status)}</span></div><p>${esc(e.hypothesis||'')}</p></section>`).join('');
const leader=scoreboard.leader||scoreboard.champion_candidate||null;

const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="120"><title>Prometeo · Guide Brief</title><style>
:root{color-scheme:dark;background:#10100f;color:#eee;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}*{box-sizing:border-box}body{margin:0;max-width:1100px;padding:28px;margin:auto}h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;text-transform:uppercase;letter-spacing:.12em;margin:32px 0 10px;color:#ff9b54}p{line-height:1.45}.muted,small{color:#a9a49d}.top{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:18px 0}.metric,.row{border-top:1px solid #36332e;padding:12px 0}.metric b{display:block;font-size:20px}.pill{font-size:11px;border:1px solid #5a5148;padding:2px 6px;margin-left:8px}.row>div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.row p{margin:7px 0}.links,a{color:#ff9b54}.links{display:flex;gap:12px;flex-wrap:wrap}.prompt{white-space:pre-wrap;border:1px solid #5a5148;padding:14px;user-select:all;overflow:auto}.nav{display:flex;gap:16px;flex-wrap:wrap;margin-top:10px}details{border-top:1px solid #36332e;padding:10px 0}summary{cursor:pointer}.stamp{font-size:11px;color:#777;margin-top:28px}</style></head><body>
<h1>Prometeo · Guide Brief</h1><div class="muted">Estado compilado para que el humano vea lo mismo que el Guide sin leer receipts.</div>
<div class="nav"><a href="./brief.json">JSON</a><a href="https://juanmanuelpm.github.io/prometeo/trajectory/">Trajectory</a><a href="https://juanmanuelpm.github.io/prometeo/growth/">Growth</a><a href="https://juanmanuelpm.github.io/prometeo/g/">/g</a><a href="https://juanmanuelpm.github.io/prometeo/wc/">/wc</a></div>
<h2>Brújula</h2><div class="top"><div class="metric">salud<b>${health}</b></div><div class="metric">workers activos<b>${esc(pool?.summary?.active??'—')}</b></div><div class="metric">unidades productivas<b>${esc(pool?.summary?.productive_units_total??'—')}</b></div><div class="metric">exámenes<b>${esc(scoreboard.source_exam_count||0)}</b></div><div class="metric">leader<b>${esc(leader?.score??'—')}/10</b></div><div class="metric">champion<b>${scoreboard.champion_reproducible?'sí':'todavía no'}</b></div></div>
<h2>Experimentos multiplicativos</h2>${expHtml||'<p class="muted">Sin experimentos activos.</p>'}
<h2>Proyectos · contexto actual</h2>${projectHtml}
<h2>Páginas / lugares que deberían estar online</h2>${pageHtml}
<h2>Prompt fijo de producción</h2><div class="prompt">${esc(prompt)}</div>
<div class="stamp">generado ${esc(generatedAt)} · se refresca automáticamente cuando cambian fuentes del brief</div>
</body></html>`;
fs.writeFileSync(path.join(outDir,'index.html'),html);
console.log(JSON.stringify({ok:true,projects:projects.length,pages:pageRows.length,generated_at:generatedAt}));
