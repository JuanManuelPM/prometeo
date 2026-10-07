Prometeo.registerWidget({
 id:'mechanical-arena',name:'MECHANICAL ARENA',version:1,widgetApi:1,defaultHeight:900,
 pages:[{title:'LANZAR'},{title:'LIVE'},{title:'RANKING'},{title:'MÉTODO'}],
 css:`
 [data-widget="mechanical-arena"] .widget-content{display:block!important;place-items:initial!important;padding:12px!important;text-align:left!important;background:#efede7!important;color:#18322f!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
 .ma{--ink:#173b37;--accent:#5d9f95;--paper:#f8f6f1;--muted:#747c77;--line:rgba(23,59,55,.13);width:100%;height:100%;overflow:auto;color:var(--ink)}
 .ma-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.ma-k{font-size:10px;letter-spacing:.22em;color:var(--muted);font-weight:800}.ma-title{font-size:28px;font-weight:780;line-height:1;margin-top:4px}.ma-sub{font-size:11px;color:var(--muted);line-height:1.45;margin-top:6px;max-width:760px}.ma-chip{font-size:10px;border:1px solid var(--line);border-radius:999px;padding:5px 9px;font-weight:800;white-space:nowrap}
 .ma-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ma-card{background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:16px;box-shadow:0 8px 18px rgba(23,59,55,.05);min-width:0}.ma-card.wide{grid-column:1/-1}
 .ma-cardhead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ma-letter{width:42px;height:42px;border-radius:14px;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:21px;font-weight:850}.ma-name{font-size:17px;font-weight:760;line-height:1.1}.ma-desc{font-size:11px;color:var(--muted);line-height:1.35;margin-top:4px}.ma-badge{font-size:9px;font-weight:800;border:1px solid var(--line);border-radius:999px;padding:4px 7px}
 .ma-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.ma-btn{border:0;border-radius:14px;padding:12px 9px;background:var(--ink);color:white;font:inherit;font-size:12px;font-weight:780;cursor:pointer}.ma-btn.alt{background:#dfe7e4;color:var(--ink)}.ma-btn[disabled]{opacity:.48}.ma-btn:active{transform:translateY(1px)}
 .ma-launches{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.ma-launch{border-top:1px solid var(--line);padding-top:6px;font-size:10px}.ma-launch span{display:block;color:var(--muted)}.ma-launch b{font-size:11px;overflow-wrap:anywhere}
 .ma-workers{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.ma-worker{border:1px solid var(--line);border-radius:15px;padding:10px}.ma-workerhead{display:flex;justify-content:space-between;align-items:center;gap:8px}.ma-worker b{font-size:13px}.ma-dot{width:9px;height:9px;border-radius:50%;background:#c5c7c3}.ma-dot.live{background:var(--accent);box-shadow:0 0 0 5px rgba(93,159,149,.14)}.ma-dot.wait{background:#b99554}.ma-line{display:flex;justify-content:space-between;gap:8px;padding-top:5px;font-size:10px}.ma-line span{color:var(--muted)}.ma-line b{font-size:10px;text-align:right}
 .ma-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.ma-metric{border-top:1px solid var(--line);padding-top:7px}.ma-metric b{display:block;font-size:20px;line-height:1}.ma-metric span{font-size:9px;color:var(--muted)}
 .ma-bar{height:12px;background:#ddd;border-radius:999px;overflow:hidden;margin-top:10px}.ma-bar i{display:block;height:100%;background:var(--accent)}
 .ma-table{overflow:auto;background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:0 12px}.ma-row{display:grid;grid-template-columns:42px minmax(140px,1.4fr) repeat(9,minmax(72px,.7fr));gap:7px;align-items:center;padding:9px 0;border-bottom:1px solid rgba(23,59,55,.1);font-size:10px;min-width:980px}.ma-row.head{font-size:9px;color:var(--muted);font-weight:800}.ma-row .rank{font-size:15px;font-weight:850}.ma-best{background:rgba(93,159,149,.09)}
 .ma-method{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ma-method h3{margin:0 0 7px;font-size:15px}.ma-note{font-size:11px;color:var(--muted);line-height:1.5}.ma-code{font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;background:#e8e8e3;border-radius:14px;padding:12px;white-space:pre-wrap}.ma-alert{background:#173b37;color:#f8f6f1;border-radius:18px;padding:13px 15px;font-size:11px;line-height:1.45;margin-bottom:12px}
 @container (max-width:680px){.ma-grid{grid-template-columns:1fr}.ma-title{font-size:24px}.ma-card.wide{grid-column:auto}.ma-workers{grid-template-columns:1fr}.ma-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.ma-method{grid-template-columns:1fr}.ma-chip{display:none}}
 `,
 render(){return '<div class="ma" data-ma><div class="ma-card">cargando arena…</div></div>';},
 afterRender({root,widgetState}){
  const host=root?.querySelector('[data-ma]');if(!host)return;
  const mem=window.__ma8||(window.__ma8={timer:null,cfg:null,states:null});
  const control='exp008-control',repo='https://raw.githubusercontent.com/JuanManuelPM/prometeo/';
  const raw=(branch,p)=>repo+branch+'/'+(String(p).startsWith('ui-workspace-v1/')?String(p):'ui-workspace-v1/'+String(p));
  const KEY='prometeo.exp008.launches.v1';
  const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const ms=(a,b)=>{const x=Date.parse(a||''),y=Date.parse(b||'');return Number.isFinite(x)&&Number.isFinite(y)?y-x:null};
  const fmt=v=>v==null||!Number.isFinite(v)?'—':v<1000?Math.round(v)+' ms':v<60000?(v/1000).toFixed(1)+' s':(v/60000).toFixed(1)+' min';
  const clock=v=>v?new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  const launches=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const saveLaunch=x=>{const a=launches();a.push(x);localStorage.setItem(KEY,JSON.stringify(a.slice(-100)))};
  const latest=(variant,b)=>launches().filter(x=>x.variant===variant&&x.button===b).at(-1)||null;
  const uuid=()=>{try{return crypto.randomUUID()}catch{return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}};
  const copy=async txt=>{if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(txt);const t=document.createElement('textarea');t.value=txt;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()};
  const tasks=w=>w?.counters?.tasks_completed||0;
  const claims=w=>w?.counters?.tickets_claimed||0;
  const calls=w=>{const c=w?.counters||{};return (c.dealer_reads||0)+(c.dealer_cas||0)+(c.return_publish||0)+(c.return_verify||0)+(c.state_writes||0)+(c.uncertain_publish_checks||0)};
  const avg=xs=>{xs=xs.filter(x=>x!=null&&Number.isFinite(x));return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null};
  const ttfw=w=>ms(w?.launch_clicked_at,w?.first_claim_at);
  const boot=w=>ms(w?.launch_clicked_at,w?.worker_started_at);
  const mech=w=>ms(w?.worker_started_at,w?.first_claim_at);
  const sig=w=>ms(w?.first_claim_at,w?.first_public_signal_at);
  const firstRet=w=>ms(w?.first_claim_at,w?.first_return_at);
  const activeMs=w=>ms(w?.first_claim_at,w?.last_return_at)||ms(w?.first_claim_at,new Date().toISOString());
  const tpm=w=>{const t=tasks(w),m=activeMs(w);return t&&m>0?t/(m/60000):null};
  const cpt=w=>{const t=tasks(w);return t?calls(w)/t:null};
  const lastAge=w=>{const x=w?.last_checkpoint_at||w?.last_return_at||w?.first_claim_at;return x?Date.now()-Date.parse(x):null};
  async function loadAll(){
    const cfg=mem.cfg||await fetch(raw(control,'ui-workspace-v1/experiments/allocator-v7/ARENA.json')+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json());
    mem.cfg=cfg;const states={};
    await Promise.all(cfg.variants.map(async v=>{states[v.id]=await Promise.all(v.state_paths.map((p,i)=>fetch(raw(v.branches[i],p)+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).catch(()=>null))) }));
    mem.states=states;return {cfg,states};
  }
  function launchCell(v,b){
    const l=latest(v.id,b);if(!l)return '<span>sin lanzar</span><b>—</b>';
    const w=(mem.states?.[v.id]||[]).find(x=>x?.launch_id===l.launch_id);
    if(w?.first_claim_at)return '<span>TTFW</span><b>'+fmt(ttfw(w))+'</b>';
    if(w?.worker_started_at)return '<span>conectando</span><b>'+fmt(Date.now()-Date.parse(l.clicked_at))+'</b>';
    return '<span>desde click</span><b>'+fmt(Date.now()-Date.parse(l.clicked_at))+'</b>';
  }
  async function doLaunch(v,b,btn){
    const clicked_at=new Date().toISOString(),launch_id='exp008-'+v.id.toLowerCase()+'-'+b+'-'+uuid();
    const rec={variant:v.id,button:b,clicked_at,launch_id};saveLaunch(rec);btn.disabled=true;btn.textContent='copiando…';
    try{
      let p=await fetch(raw(control,v.prompt_path)+'?t='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('prompt '+r.status);return r.text()});
      p=p.replaceAll('{{LAUNCH_ID}}',launch_id).replaceAll('{{LAUNCH_CLICKED_AT}}',clicked_at).replaceAll('{{LAUNCH_BUTTON}}',v.id+'-'+b);
      await copy(p);btn.textContent='✓ COPIADO '+clock(new Date().toISOString());
    }catch(e){btn.disabled=false;btn.textContent='ERROR';}
  }
  function launchPage(cfg,states){
    return '<div class="ma-alert"><b>CORTE BLOQUEADO.</b> Los cinco dealers arrancan con STOP_GRANT|NONE. No hay EMPTY ni número final de tareas. Un worker sólo tiene permiso de terminar cuando lea un grant externo válido; no se va a enviar durante la prueba de residencia.</div>'+
    '<div class="ma-head"><div><div class="ma-k">EXP-008 · MECHANICAL ARENA</div><div class="ma-title">Residencia + hot path</div><div class="ma-sub">Lanzá los dos chats de cada variante. Podés abrir los 10 casi juntos: cada variante usa dealer y branches separados.</div></div><span class="ma-chip">5 variantes · 10 workers</span></div>'+
    '<div class="ma-grid">'+cfg.variants.map(v=>'<section class="ma-card"><div class="ma-cardhead"><div style="display:flex;gap:11px"><div class="ma-letter">'+v.id+'</div><div><div class="ma-name">'+esc(v.name)+'</div><div class="ma-desc">'+(v.first==='combined'?'REGISTER + FIRST CLAIM en un CAS':'REGISTER y FIRST CLAIM separados')+' · '+(v.verify?'verifica RETURN':'sin verify normal')+' · telemetry /'+v.telemetryEvery+'</div></div></div><span class="ma-badge">'+((states[v.id]||[]).filter(w=>w?.worker_id).length)+'/2</span></div>'+
    '<div class="ma-actions"><button class="ma-btn" data-copy="'+v.id+'" data-b="1">COPIAR W1</button><button class="ma-btn alt" data-copy="'+v.id+'" data-b="2">COPIAR W2</button></div>'+
    '<div class="ma-launches"><div class="ma-launch">'+launchCell(v,'1')+'</div><div class="ma-launch">'+launchCell(v,'2')+'</div></div></section>').join('')+'</div>';
  }
  function workerHtml(w,i){
    const age=lastAge(w),cl=w?.first_claim_at?'live':w?.worker_id?'wait':'';
    return '<div class="ma-worker"><div class="ma-workerhead"><b>W'+String(i+1).padStart(3,'0')+'</b><i class="ma-dot '+cl+'"></i></div>'+
      '<div class="ma-line"><span>estado</span><b>'+esc(w?.status||'WAITING')+'</b></div>'+
      '<div class="ma-line"><span>TTFW</span><b>'+fmt(ttfw(w))+'</b></div>'+
      '<div class="ma-line"><span>tareas</span><b>'+tasks(w)+'</b></div>'+
      '<div class="ma-line"><span>tareas/min</span><b>'+(tpm(w)?.toFixed(2)||'—')+'</b></div>'+
      '<div class="ma-line"><span>calls/tarea</span><b>'+(cpt(w)?.toFixed(2)||'—')+'</b></div>'+
      '<div class="ma-line"><span>última durable</span><b>'+esc(w?.last_durable_ticket||'—')+'</b></div>'+
      '<div class="ma-line"><span>edad checkpoint</span><b>'+fmt(age)+'</b></div></div>';
  }
  function livePage(cfg,states){
    return '<div class="ma-head"><div><div class="ma-k">LIVE</div><div class="ma-title">Qué tan rápido entran y cuánto aguantan</div><div class="ma-sub">Los states se amortizan: A-D cada 5 returns, E cada 10. Que el contador no cambie cada segundo no significa que el worker esté parado.</div></div></div>'+
    '<div class="ma-grid">'+cfg.variants.map(v=>{const ws=states[v.id]||[],tt=avg(ws.map(ttfw)),tp=avg(ws.map(tpm)),ct=avg(ws.map(cpt)),sum=ws.reduce((n,w)=>n+tasks(w),0);return '<section class="ma-card"><div class="ma-cardhead"><div><div class="ma-name">'+v.id+' · '+esc(v.name)+'</div><div class="ma-desc">'+sum+' tareas durables observadas</div></div><span class="ma-badge">'+fmt(tt)+'</span></div><div class="ma-metrics"><div class="ma-metric"><b>'+sum+'</b><span>TAREAS</span></div><div class="ma-metric"><b>'+(tp?.toFixed(2)||'—')+'</b><span>TAREAS/MIN</span></div><div class="ma-metric"><b>'+(ct?.toFixed(2)||'—')+'</b><span>CALLS/TAREA</span></div><div class="ma-metric"><b>'+fmt(tt)+'</b><span>TTFW AVG</span></div></div><div class="ma-workers">'+ws.map(workerHtml).join('')+'</div></section>'}).join('')+'</div>';
  }
  function rankingPage(cfg,states){
    const rows=cfg.variants.map(v=>{const ws=states[v.id]||[];return {v,ws,tasks:ws.reduce((n,w)=>n+tasks(w),0),tt:avg(ws.map(ttfw)),boot:avg(ws.map(boot)),mech:avg(ws.map(mech)),sig:avg(ws.map(sig)),fr:avg(ws.map(firstRet)),tpm:avg(ws.map(tpm)),cpt:avg(ws.map(cpt)),conf:ws.reduce((n,w)=>n+(w?.counters?.revision_conflicts||0),0),retry:ws.reduce((n,w)=>n+(w?.counters?.retries||0),0),forb:ws.reduce((n,w)=>n+(w?.counters?.forbidden_ops||0),0)}}).sort((a,b)=>{const matureA=a.ws.filter(w=>tasks(w)>=5).length===2,matureB=b.ws.filter(w=>tasks(w)>=5).length===2;if(matureA!==matureB)return matureA?-1:1;if((a.forb>0)!==(b.forb>0))return a.forb>0?1:-1;return (b.tpm||0)-(a.tpm||0)});
    const best=rows.find(r=>r.ws.filter(w=>tasks(w)>=5).length===2&&r.forb===0)?.v.id;
    return '<div class="ma-head"><div><div class="ma-k">RANKING</div><div class="ma-title">'+(best?'Líder provisional: '+best:'Esperando madurez')+'</div><div class="ma-sub">Una variante entra al ranking cuando ambos workers tienen al menos 5 RETURN durables. Priorizamos continuidad/throughput, luego costo de calls y startup.</div></div></div><div class="ma-table"><div class="ma-row head"><span>#</span><span>VARIANTE</span><span>TAREAS</span><span>TTFW</span><span>APP→START</span><span>START→CLAIM</span><span>CLAIM→SIGNAL</span><span>1er RETURN</span><span>TAREAS/MIN</span><span>CALLS/TAREA</span><span>CONFLICT/RETRY</span></div>'+
    rows.map((r,i)=>'<div class="ma-row '+(r.v.id===best?'ma-best':'')+'"><span class="rank">'+(i+1)+'</span><span><b>'+r.v.id+' · '+esc(r.v.name)+'</b></span><span>'+r.tasks+'</span><span>'+fmt(r.tt)+'</span><span>'+fmt(r.boot)+'</span><span>'+fmt(r.mech)+'</span><span>'+fmt(r.sig)+'</span><span>'+fmt(r.fr)+'</span><span>'+(r.tpm?.toFixed(2)||'—')+'</span><span>'+(r.cpt?.toFixed(2)||'—')+'</span><span>'+r.conf+'/'+r.retry+'</span></div>').join('')+'</div>';
  }
  function methodPage(cfg){
    return '<div class="ma-head"><div><div class="ma-k">MÉTODO</div><div class="ma-title">Qué estamos cerrando</div></div></div><div class="ma-method"><section class="ma-card"><h3>Sin fin artificial</h3><div class="ma-note">NEXT_TICKET no tiene máximo. No se informa cantidad total. Sólo un STOP_GRANT externo válido permite terminar.</div></section><section class="ma-card"><h3>Hot path</h3><div class="ma-code">CLAIM → LOCAL → RETURN → CLAIM</div><div class="ma-note">Las tareas se derivan del ticket en local. Eliminamos BLOCK_READ del camino crítico.</div></section><section class="ma-card"><h3>Whitelist</h3><div class="ma-note">Sólo dealer read/CAS, RETURN y telemetría pautada. Search, listados, HEAD, exploración y otro state están fuera del contrato.</div></section><section class="ma-card"><h3>Seguridad actual</h3><div class="ma-note">CAS evita tickets duplicados y cada worker escribe su branch. Esta arena mide residencia; todavía no reencola automáticamente un ticket si el proceso muere justo después del claim.</div></section></div>';
  }
  async function render(){
    try{const {cfg,states}=await loadAll(),p=widgetState.page||0;host.innerHTML=p===0?launchPage(cfg,states):p===1?livePage(cfg,states):p===2?rankingPage(cfg,states):methodPage(cfg);if(p===0)host.querySelectorAll('button[data-copy]').forEach(btn=>btn.onclick=()=>{const v=cfg.variants.find(x=>x.id===btn.dataset.copy);doLaunch(v,btn.dataset.b,btn)})}catch(e){host.innerHTML='<div class="ma-card"><b>Error</b><div class="ma-note">'+esc(e.message)+'</div></div>'}
  }
  render();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?render():clearInterval(mem.timer),1500);
 }
});