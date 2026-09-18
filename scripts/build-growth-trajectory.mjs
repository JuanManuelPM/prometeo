import fs from 'node:fs';
import path from 'node:path';

const source=path.resolve(process.argv[2]||'.');
const site=path.resolve(process.argv[3]||'.');
const outDir=path.resolve(process.argv[4]||path.join(site,'trajectory'));
const read=(base,rel)=>{try{return fs.readFileSync(path.join(base,rel),'utf8')}catch{return ''}};
const json=(base,rel)=>{try{return JSON.parse(read(base,rel))}catch{return null}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const traj=json(source,'coordination/guide/GROWTH_TRAJECTORY_V1.json')||{};
const mission=json(source,'coordination/guide/CURRENT_MISSION_V1.json')||{};
const compass=json(source,'coordination/guide/GUIDE_POWER_COMPASS_V1.json')||{};
const runtime=json(site,'live/runtime.json')||{};
const scoreboard=json(site,'live/worker-scoreboard.json')||{};
const frontier=json(site,'live/claim-frontier.json')||{};
const pool=(runtime.batches||[]).find(x=>x.batch_id==='POOL-PROD-01')||null;
const leader=scoreboard.leader||scoreboard.champion_candidate||null;
const generatedAt=new Date().toISOString();

const live={
  runtime_generated_at:runtime.generated_at||null,
  frontier_generated_at:frontier.generated_at||null,
  scoreboard_generated_at:scoreboard.generated_at||null,
  observed_workers:pool?.summary?.observed??null,
  active_workers:pool?.summary?.active??null,
  productive_units_total:pool?.summary?.productive_units_total??null,
  frontier_candidates:(frontier.candidates||[]).length,
  exam_cards:scoreboard.source_exam_count||0,
  leader_score:leader?.score??null,
  champion_reproducible:!!scoreboard.champion_reproducible,
  champion_pattern_id:scoreboard.champion_pattern_id||null
};

const out={
  schema:'prometeo.growth-trajectory-public/v1',
  generated_at:generatedAt,
  canonical:traj,
  live,
  links:{
    trajectory:'https://juanmanuelpm.github.io/prometeo/trajectory/',
    guide:'https://juanmanuelpm.github.io/prometeo/guide/',
    growth:'https://juanmanuelpm.github.io/prometeo/growth/',
    worker:'https://juanmanuelpm.github.io/prometeo/wc/'
  }
};
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'trajectory.json'),JSON.stringify(out,null,2)+'\n');

const checkpoints=(traj.trajectory_checkpoints||[]).map(c=>`<section class="checkpoint"><div class="date">${esc(c.at)}</div><h3>${esc(c.id)} · ${esc(c.label)}</h3><div class="kind">${esc(c.class)}</div><p>${esc(c.interpretation||'')}</p><details><summary>evidencia</summary><pre>${esc(JSON.stringify(c.observation||{},null,2))}</pre><div>${(c.evidence||[]).map(x=>`<code>${esc(x)}</code>`).join('<br>')}</div></details></section>`).join('');

const roadmap=(traj.roadmap||[]).map(r=>`<section class="road"><div><b>${esc(r.stage)}</b><span>${esc(r.status)}</span></div><p>${esc(r.objective)}</p><small>${esc(r.pass||r.activation_gate||'')}</small></section>`).join('');
const alarms=(traj.drift_alarms||[]).map(a=>`<li><b>${esc(a.id)}</b> — ${esc(a.trigger)}</li>`).join('');
const branches=(traj.action_tree||[]).map(a=>`<section class="branch"><b>SI</b> ${esc(a.when)}<div><b>ENTONCES</b> ${esc((a.do||[]).join(' → '))}</div></section>`).join('');

const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="120"><title>Prometeo · Growth Trajectory</title><style>
:root{color-scheme:dark;background:#0d0d0c;color:#ece7df;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}*{box-sizing:border-box}body{max-width:1100px;margin:auto;padding:28px}h1{font-size:23px;margin:0}h2{font-size:13px;letter-spacing:.13em;text-transform:uppercase;color:#ff9b54;margin-top:34px}h3{font-size:15px;margin:4px 0}.sub{color:#aaa39a;margin-top:6px}.nav{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0 26px}a{color:#ff9b54}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.metric{border-top:1px solid #37332f;padding:10px 0}.metric b{display:block;font-size:19px}.north{font-size:17px;line-height:1.55;max-width:920px}.checkpoint,.road,.branch{border-top:1px solid #37332f;padding:13px 0}.date,.kind,small{color:#918a82;font-size:11px}.road>div{display:flex;gap:10px;align-items:baseline}.road span{border:1px solid #5a5148;padding:2px 6px;font-size:10px}.branch div{margin-top:6px;padding-left:16px}.status{font-size:22px}.warn{border-left:3px solid #ff9b54;padding-left:12px}pre{white-space:pre-wrap;overflow:auto}.prompt{border:1px solid #5a5148;padding:14px;white-space:pre-wrap;user-select:all}.stamp{font-size:11px;color:#777;margin-top:28px}</style></head><body>
<h1>Prometeo · Growth Trajectory</h1>
<div class="sub">Plan, evidencia, historia y anti-drift del crecimiento útil.</div>
<div class="nav"><a href="./trajectory.json">JSON</a><a href="../guide/">Guide Brief</a><a href="../growth/">Growth</a><a href="../g/">/g</a><a href="../wc/">/wc</a></div>

<h2>North Star</h2><p class="north">${esc(traj?.human_north_star?.summary||'')}</p>

<h2>Estado empírico</h2><div class="status">${esc(traj?.current_state?.empirical_growth_status||'UNKNOWN')}</div>
<p class="warn">${esc(traj?.current_state?.strongest_evidence||'')}<br>${esc(traj?.current_state?.weakest_evidence||'')}</p>
<div class="metrics">
<div class="metric">workers observados<b>${esc(live.observed_workers??'—')}</b></div>
<div class="metric">workers activos*<b>${esc(live.active_workers??'—')}</b></div>
<div class="metric">unidades productivas<b>${esc(live.productive_units_total??'—')}</b></div>
<div class="metric">exámenes<b>${esc(live.exam_cards)}</b></div>
<div class="metric">leader<b>${esc(live.leader_score??'—')}/10</b></div>
<div class="metric">champion reproducible<b>${live.champion_reproducible?'sí':'no'}</b></div>
</div>
<p class="sub">* Sólo usar occupancy si runtime es suficientemente fresco frente al frontier.</p>

<h2>Roadmap</h2>${roadmap}

<h2>Historial fechado</h2>${checkpoints}

<h2>Árbol de acción</h2>${branches}

<h2>Alarmas anti-drift</h2><ul>${alarms}</ul>

<h2>Qué tiene que demostrar “exponencial”</h2><p>${esc(traj?.empirical_growth_model?.proof_law||'')}</p><p><b>Gate actual:</b> ${esc(traj?.empirical_growth_model?.status||'')}</p>

<h2>Prompt fijo /wc</h2><div class="prompt">${esc(mission?.operating_mode?.invocation||'')}</div>

<div class="stamp">generado ${esc(generatedAt)} · runtime ${esc(live.runtime_generated_at||'—')} · frontier ${esc(live.frontier_generated_at||'—')} · scoreboard ${esc(live.scoreboard_generated_at||'—')}</div>
</body></html>`;
fs.writeFileSync(path.join(outDir,'index.html'),html);
console.log(JSON.stringify({ok:true,checkpoints:(traj.trajectory_checkpoints||[]).length,roadmap:(traj.roadmap||[]).length,generated_at:generatedAt}));
