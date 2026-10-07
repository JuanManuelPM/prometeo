Prometeo.registerWidget({
 id:'prompt-benchmark',name:'PROMPT LAB',version:1,widgetApi:1,defaultHeight:860,
 pages:[{title:'LANZAR'},{title:'LIVE'},{title:'RESULTADOS'},{title:'MÉTODO'}],
 css:`
 [data-widget="prompt-benchmark"] .widget-content{display:block!important;place-items:initial!important;padding:12px!important;text-align:left!important;background:#efede7!important;color:#18322f!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
 .pb{--ink:#173b37;--accent:#5d9f95;--paper:#f7f5f0;--soft:#e4e5df;--muted:#747c77;--warn:#b08a47;width:100%;height:100%;overflow:auto;color:var(--ink)}
 .pb-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:12px}.pb-k{font-size:10px;letter-spacing:.22em;color:var(--muted);font-weight:800}.pb-title{font-size:28px;font-weight:780;line-height:1;margin-top:4px}.pb-sub{font-size:11px;color:var(--muted);margin-top:6px;max-width:760px;line-height:1.4}.pb-chip{font-size:10px;font-weight:800;border:1px solid rgba(23,59,55,.18);border-radius:999px;padding:5px 9px;white-space:nowrap}
 .pb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pb-card{background:var(--paper);border:1px solid rgba(23,59,55,.13);border-radius:22px;padding:16px;box-shadow:0 8px 18px rgba(23,59,55,.05);min-width:0}.pb-card.wide{grid-column:1/-1}
 .pb-cardhead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.pb-letter{width:42px;height:42px;border-radius:14px;background:var(--ink);color:var(--paper);display:grid;place-items:center;font-size:21px;font-weight:850}.pb-name{font-size:17px;font-weight:760;line-height:1.1}.pb-desc{font-size:11px;color:var(--muted);line-height:1.4;margin-top:4px}.pb-status{font-size:9px;font-weight:800;border:1px solid rgba(23,59,55,.17);border-radius:999px;padding:4px 7px}
 .pb-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.pb-btn{appearance:none;border:0;border-radius:14px;padding:12px 10px;background:var(--ink);color:#fff;font:inherit;font-size:12px;font-weight:760;cursor:pointer}.pb-btn.alt{background:#dfe7e4;color:var(--ink)}.pb-btn:active{transform:translateY(1px)}.pb-btn[disabled]{opacity:.45;cursor:not-allowed}
 .pb-launch{margin-top:9px;display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:10px}.pb-launch div{border-top:1px solid rgba(23,59,55,.11);padding-top:6px}.pb-launch span{color:var(--muted);display:block}.pb-launch b{font-size:11px;overflow-wrap:anywhere}
 .pb-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.pb-metric{border-top:1px solid rgba(23,59,55,.14);padding-top:7px}.pb-metric b{display:block;font-size:22px;line-height:1}.pb-metric span{font-size:9px;color:var(--muted)}
 .pb-workers{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.pb-worker{border:1px solid rgba(23,59,55,.12);border-radius:14px;padding:10px}.pb-workerhead{display:flex;justify-content:space-between;gap:8px;align-items:center}.pb-worker b{font-size:13px}.pb-dot{width:9px;height:9px;border-radius:50%;background:#c8cbc7}.pb-dot.live{background:var(--accent);box-shadow:0 0 0 5px rgba(93,159,149,.14)}.pb-dot.done{background:var(--ink)}.pb-workerline{display:flex;justify-content:space-between;gap:8px;font-size:10px;padding-top:5px}.pb-workerline span{color:var(--muted)}.pb-workerline b{font-size:10px;text-align:right}
 .pb-rank{display:grid;grid-template-columns:42px minmax(120px,1.4fr) repeat(8,minmax(70px,.7fr));gap:7px;align-items:center;padding:9px 0;border-bottom:1px solid rgba(23,59,55,.1);font-size:10px;min-width:900px}.pb-rank.head{font-size:9px;color:var(--muted);font-weight:800}.pb-rank .v{font-size:15px;font-weight:850}.pb-table{overflow:auto;background:var(--paper);border:1px solid rgba(23,59,55,.12);border-radius:18px;padding:0 12px}.pb-best{background:rgba(93,159,149,.09)}
 .pb-bar{height:12px;border-radius:999px;background:#deded8;overflow:hidden;margin-top:8px}.pb-bar i{display:block;height:100%;background:var(--accent)}
 .pb-note{font-size:11px;color:var(--muted);line-height:1.5;margin-top:10px}.pb-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;background:#e7e7e2;border-radius:14px;padding:12px;white-space:pre-wrap}.pb-method{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pb-method h3{margin:0 0 7px;font-size:15px}
 @container (max-width:680px){.pb-grid{grid-template-columns:1fr}.pb-title{font-size:24px}.pb-card.wide{grid-column:auto}.pb-actions{grid-template-columns:1fr 1fr}.pb-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.pb-workers{grid-template-columns:1fr}.pb-method{grid-template-columns:1fr}.pb-head{align-items:flex-start}.pb-chip{display:none}}
 `,
 render(){return '<div class="pb" data-pb><div class="pb-card">cargando laboratorio…</div></div>';},
 afterRender({root,widgetState}){
  const host=root?.querySelector('[data-pb]');if(!host)return;
  const mem=window.__pb7||(window.__pb7={timer:null,cfg:null,states:null});
  const control='exp007-control';
  const repoRaw='https://raw.githubusercontent.com/JuanManuelPM/prometeo/';
  const raw=(branch,p)=>repoRaw+branch+'/'+(String(p).startsWith('ui-workspace-v1/')?String(p):'ui-workspace-v1/'+String(p));
  const KEY='prometeo.exp007.launches.v1';
  const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const ms=(a,b)=>{const x=Date.parse(a||''),y=Date.parse(b||'');return Number.isFinite(x)&&Number.isFinite(y)?y-x:null};
  const fmt=v=>v==null||!Number.isFinite(v)?'—':v<1000?Math.round(v)+' ms':v<60000?(v/1000).toFixed(1)+' s':(v/60000).toFixed(1)+' min';
  const clock=v=>v?new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  const launches=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const saveLaunch=x=>{const a=launches();a.push(x);localStorage.setItem(KEY,JSON.stringify(a.slice(-80)))};
  const latestLaunch=(variant,button)=>launches().filter(x=>x.variant===variant&&x.button===button).at(-1)||null;
  const uuid=()=>{try{return crypto.randomUUID()}catch{return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}};
  const copyText=async txt=>{if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(txt);const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()};
  const completed=w=>w?.counters?.blocks_completed??w?.counters?.completed??0;
  const calls=w=>w?.counters?.external_work_calls||0;
  const retries=w=>w?.counters?.retries||0;
  const conf=w=>w?.counters?.revision_conflicts||0;
  const crit=w=>w?.counters?.critical_errors||0;
  const forb=w=>w?.counters?.forbidden_ops||0;
  const ttfw=w=>ms(w?.launch_clicked_at,w?.first_claim_at);
  const firstReturn=w=>ms(w?.launch_clicked_at,w?.first_return_at);
  const total=w=>ms(w?.launch_clicked_at,w?.empty_at);
  const avg=xs=>{xs=xs.filter(x=>x!=null&&Number.isFinite(x));return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null};
  const duplicates=ws=>{const xs=ws.flatMap(w=>(w?.completed||[]).map(x=>String(x.ticket??x.ticket_id??''))).filter(Boolean);return xs.length-new Set(xs).size};
  async function loadAll(){
    const cfg=mem.cfg||await fetch(raw(control,'ui-workspace-v1/experiments/allocator-v6/VARIANTS.json')+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json());
    mem.cfg=cfg;
    const states={};
    await Promise.all(cfg.variants.map(async v=>{
      states[v.id]=await Promise.all(v.state_paths.map((p,i)=>fetch(raw(v.branches[i],p)+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).catch(()=>null)));
    }));
    mem.states=states;
    return {cfg,states};
  }
  function buttonState(v,b){
    const l=latestLaunch(v.id,b);if(!l)return '<span>sin lanzar</span><b>—</b>';
    const st=(mem.states?.[v.id]||[]).find(w=>w?.launch_id===l.launch_id);
    if(st?.first_claim_at)return '<span>TTFW</span><b>'+fmt(ttfw(st))+'</b>';
    if(st?.worker_started_at)return '<span>procesando</span><b>'+fmt(ms(l.clicked_at,new Date().toISOString()))+'</b>';
    return '<span>esperando señal</span><b>'+fmt(Date.now()-Date.parse(l.clicked_at))+'</b>';
  }
  async function launch(v,b,btn){
    const clicked_at=new Date().toISOString(),launch_id='exp007-'+v.id.toLowerCase()+'-'+b+'-'+uuid();
    const rec={variant:v.id,button:b,clicked_at,launch_id,status:'clicked'};saveLaunch(rec);
    btn.disabled=true;btn.textContent='copiando…';
    try{
      let p=await fetch(raw(control,v.prompt_path)+'?t='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('prompt '+r.status);return r.text()});
      p=p.replaceAll('{{LAUNCH_ID}}',launch_id).replaceAll('{{LAUNCH_CLICKED_AT}}',clicked_at).replaceAll('{{LAUNCH_BUTTON}}',v.id+'-'+b);
      await copyText(p);
      rec.copied_at=new Date().toISOString();rec.status='copied';
      const a=launches();const i=a.findIndex(x=>x.launch_id===launch_id);if(i>=0){a[i]=rec;localStorage.setItem(KEY,JSON.stringify(a.slice(-80)))}
      btn.textContent='✓ COPIADO '+clock(rec.copied_at);
    }catch(e){rec.status='copy_error';rec.error=String(e);btn.textContent='ERROR AL COPIAR';btn.disabled=false}
  }
  function launchPage(cfg,states){
    return '<div class="pb-head"><div><div class="pb-k">EXP-007 · PROMPT TOURNAMENT</div><div class="pb-title">5 prompts. Mismo trabajo.</div><div class="pb-sub">Cada botón toma la hora exacta del navegador antes de copiar. Esa hora viaja dentro del prompt y después se compara con el primer ticket reclamado.</div></div><span class="pb-chip">2 workers × 4 bloques × 5 variantes</span></div>'+
    '<div class="pb-grid">'+cfg.variants.map(v=>'<section class="pb-card"><div class="pb-cardhead"><div style="display:flex;gap:11px"><div class="pb-letter">'+v.id+'</div><div><div class="pb-name">'+esc(v.name)+'</div><div class="pb-desc">'+esc(v.desc)+'</div></div></div><span class="pb-status">'+(states[v.id]?.filter(x=>x?.worker_id).length||0)+'/2</span></div>'+
      '<div class="pb-actions"><button class="pb-btn" data-copy="'+v.id+'" data-button="1">COPIAR CHAT 1</button><button class="pb-btn alt" data-copy="'+v.id+'" data-button="2">COPIAR CHAT 2</button></div>'+
      '<div class="pb-launch"><div data-launch="'+v.id+'-1">'+buttonState(v,'1')+'</div><div data-launch="'+v.id+'-2">'+buttonState(v,'2')+'</div></div></section>').join('')+
    '</div><div class="pb-note">Los botones 1/2 no asignan slot. El slot sigue siendo mecánico por CAS. Sirven sólo para medir qué click originó qué chat.</div>';
  }
  function livePage(cfg,states){
    return '<div class="pb-head"><div><div class="pb-k">LIVE</div><div class="pb-title">Tiempo hasta trabajo real</div><div class="pb-sub">TTFW = click en COPIAR → primer ticket exclusivo. Si todavía no hay claim, el contador sigue corriendo.</div></div></div><div class="pb-grid">'+cfg.variants.map(v=>{
      const ws=states[v.id]||[],done=ws.reduce((n,w)=>n+completed(w),0),claim=ws.filter(w=>w?.first_claim_at).length,empt=ws.filter(w=>w?.status==='EMPTY').length,tt=avg(ws.map(ttfw));
      return '<section class="pb-card"><div class="pb-cardhead"><div><div class="pb-name">'+v.id+' · '+esc(v.name)+'</div><div class="pb-desc">'+done+'/4 bloques · '+empt+'/2 EMPTY</div></div><span class="pb-status">'+(tt!=null?fmt(tt):'sin claim')+'</span></div><div class="pb-bar"><i style="width:'+Math.min(100,done*25)+'%"></i></div>'+
      '<div class="pb-metrics"><div class="pb-metric"><b>'+claim+'/2</b><span>CLAIM</span></div><div class="pb-metric"><b>'+fmt(tt)+'</b><span>AVG TTFW</span></div><div class="pb-metric"><b>'+ws.reduce((n,w)=>n+calls(w),0)+'</b><span>CALLS</span></div><div class="pb-metric"><b>'+duplicates(ws)+'</b><span>DUPLICADOS</span></div></div>'+
      '<div class="pb-workers">'+ws.map((w,i)=>'<div class="pb-worker"><div class="pb-workerhead"><b>W'+String(i+1).padStart(3,'0')+'</b><i class="pb-dot '+(w?.status==='EMPTY'?'done':w?.first_claim_at?'live':'')+'"></i></div><div class="pb-workerline"><span>estado</span><b>'+esc(w?.status||'WAITING')+'</b></div><div class="pb-workerline"><span>TTFW</span><b>'+fmt(ttfw(w))+'</b></div><div class="pb-workerline"><span>1er RETURN</span><b>'+fmt(firstReturn(w))+'</b></div><div class="pb-workerline"><span>bloques</span><b>'+completed(w)+'</b></div></div>').join('')+'</div></section>';
    }).join('')+'</div>';
  }
  function resultsPage(cfg,states){
    const rows=cfg.variants.map(v=>{const ws=states[v.id]||[];return {v,ws,empty:ws.filter(w=>w?.status==='EMPTY').length,done:ws.reduce((n,w)=>n+completed(w),0),tt:avg(ws.map(ttfw)),fr:avg(ws.map(firstReturn)),tot:avg(ws.map(total)),calls:ws.reduce((n,w)=>n+calls(w),0),ret:ws.reduce((n,w)=>n+retries(w),0),conf:ws.reduce((n,w)=>n+conf(w),0),err:ws.reduce((n,w)=>n+crit(w),0),forb:ws.reduce((n,w)=>n+forb(w),0),dup:duplicates(ws)}}).sort((a,b)=>{const ap=a.empty===2&&a.done===4, bp=b.empty===2&&b.done===4;if(ap!==bp)return ap?-1:1;if(a.tt==null)return 1;if(b.tt==null)return -1;return a.tt-b.tt});
    const best=rows.find(r=>r.empty===2&&r.done===4&&r.err===0&&r.dup===0)?.v.id;
    return '<div class="pb-head"><div><div class="pb-k">RESULTADOS</div><div class="pb-title">'+(best?'Líder: '+best:'Todavía sin ganador')+'</div><div class="pb-sub">Primero exigimos corrección: 4/4, ambos EMPTY, 0 duplicados y 0 errores críticos. Entre los que pasan, gana menor TTFW.</div></div></div><div class="pb-table"><div class="pb-rank head"><span>#</span><span>VARIANTE</span><span>PASS</span><span>TTFW</span><span>1er RETURN</span><span>TOTAL</span><span>CALLS</span><span>RETRIES</span><span>CONFLICTS</span><span>ERR/DUP</span></div>'+
    rows.map((r,i)=>'<div class="pb-rank '+(r.v.id===best?'pb-best':'')+'"><span class="v">'+(i+1)+'</span><span><b>'+r.v.id+' · '+esc(r.v.name)+'</b></span><span>'+r.done+'/4 · '+r.empty+'/2</span><span>'+fmt(r.tt)+'</span><span>'+fmt(r.fr)+'</span><span>'+fmt(r.tot)+'</span><span>'+r.calls+'</span><span>'+r.ret+'</span><span>'+r.conf+'</span><span>'+r.err+'/'+r.dup+'</span></div>').join('')+'</div>';
  }
  function methodPage(){
    return '<div class="pb-head"><div><div class="pb-k">MÉTODO</div><div class="pb-title">Una variable útil por vez</div></div></div><div class="pb-method"><section class="pb-card"><h3>Constante</h3><div class="pb-note">2 workers, 4 bloques idénticos, CAS en Drive, branch aislada por worker, mismos límites de retry y mismo esquema de RETURN.</div></section><section class="pb-card"><h3>Variable</h3><div class="pb-note">Cómo está escrito y ordenado el prompt: recortado, máquina de estados, Coliseo causal, telemetría tardía o ultra mínimo.</div></section><section class="pb-card"><h3>Métrica principal</h3><div class="pb-code">TTFW = first_claim_at - launch_clicked_at</div><div class="pb-note">El click se captura ANTES de descargar/copiar el prompt, así incluye el costo real desde que vos decidís lanzar el chat.</div></section><section class="pb-card"><h3>Regla de ganador</h3><div class="pb-note">Primero seguridad y completitud. Sólo entre variantes que hagan 4/4, ambos EMPTY, 0 duplicados y 0 errores críticos comparamos velocidad.</div></section></div>';
  }
  async function render(){
    try{
      const {cfg,states}=await loadAll(),page=widgetState.page||0;
      host.innerHTML=page===0?launchPage(cfg,states):page===1?livePage(cfg,states):page===2?resultsPage(cfg,states):methodPage();
      if(page===0) host.querySelectorAll('button[data-copy]').forEach(btn=>btn.addEventListener('click',()=>{const v=cfg.variants.find(x=>x.id===btn.dataset.copy);launch(v,btn.dataset.button,btn)}));
    }catch(e){host.innerHTML='<div class="pb-card"><b>Error</b><div class="pb-note">'+esc(e.message)+'</div></div>'}
  }
  render();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?render():clearInterval(mem.timer),1500);
 }
});