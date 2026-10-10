import {projectResidency,auditDealerBindings,readVerifiedPrompt} from './projection.js';
Prometeo.registerWidget({
 id:'residency-trio',name:'RESIDENCY TRIO',version:2,widgetApi:1,defaultHeight:860,
 pages:[{title:'LANZAR'},{title:'OBSERVAR'},{title:'MÓDULOS'},{title:'MÉTRICAS'}],
 css:`
 [data-widget="residency-trio"] .widget-content{display:block!important;place-items:initial!important;padding:12px!important;text-align:left!important;background:#efede7!important;color:#18322f!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
 .rt{--ink:#173b37;--accent:#5d9f95;--paper:#f8f6f1;--muted:#747c77;--line:rgba(23,59,55,.13);width:100%;height:100%;overflow:auto;color:var(--ink)}
 .rt-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.rt-k{font-size:10px;letter-spacing:.22em;color:var(--muted);font-weight:800}.rt-title{font-size:28px;font-weight:780;line-height:1;margin-top:4px}.rt-sub{font-size:11px;color:var(--muted);line-height:1.45;margin-top:6px;max-width:760px}.rt-chip{font-size:10px;border:1px solid var(--line);border-radius:999px;padding:5px 9px;font-weight:800;white-space:nowrap}
 .rt-alert{background:#173b37;color:#f8f6f1;border-radius:18px;padding:13px 15px;font-size:11px;line-height:1.45;margin-bottom:12px}
 .rt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.rt-card{background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:16px;box-shadow:0 8px 18px rgba(23,59,55,.05);min-width:0}.rt-num{width:42px;height:42px;border-radius:14px;background:var(--ink);color:white;display:grid;place-items:center;font-size:18px;font-weight:850}.rt-name{font-size:16px;font-weight:760}.rt-desc{font-size:11px;color:var(--muted);line-height:1.35;margin-top:4px}.rt-btn{width:100%;border:0;border-radius:14px;padding:13px 10px;background:var(--ink);color:white;font:inherit;font-size:12px;font-weight:780;cursor:pointer;margin-top:14px}.rt-btn:active{transform:translateY(1px)}.rt-btn[disabled]{opacity:.48}
 .rt-launch{border-top:1px solid var(--line);padding-top:7px;margin-top:9px;font-size:10px}.rt-launch span{display:block;color:var(--muted)}.rt-launch b{font-size:11px;overflow-wrap:anywhere}
 .rt-worker{background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:16px}.rt-wh{display:flex;justify-content:space-between;gap:8px;align-items:center}.rt-dot{width:10px;height:10px;border-radius:50%;background:#c5c7c3}.rt-dot.live{background:var(--accent);box-shadow:0 0 0 5px rgba(93,159,149,.14)}.rt-line{display:flex;justify-content:space-between;gap:8px;padding-top:7px;font-size:10px;border-bottom:1px solid rgba(23,59,55,.08);padding-bottom:5px}.rt-line span{color:var(--muted)}.rt-line b{text-align:right;font-size:10px}.rt-big{font-size:38px;font-weight:780;line-height:.9;margin-top:14px}.rt-big small{font-size:12px;color:var(--muted)}
 .rt-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.rt-metric{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:11px}.rt-metric b{display:block;font-size:22px}.rt-metric span{font-size:9px;color:var(--muted)}
 .rt-mods{display:grid;grid-template-columns:1fr 1fr;gap:12px}.rt-mod{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:15px}.rt-mod h3{font-size:15px;margin:0 0 6px}.rt-mod p{font-size:11px;color:var(--muted);line-height:1.5;margin:0}.rt-code{font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;background:#e8e8e3;border-radius:14px;padding:12px;white-space:pre-wrap}
 @container (max-width:760px){.rt-grid{grid-template-columns:1fr}.rt-mods{grid-template-columns:1fr}.rt-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.rt-title{font-size:24px}.rt-chip{display:none}}
 `,
 render(){return '<div class="rt" data-rt><div class="rt-card">cargando experimento…</div></div>';},
 afterRender({root,widgetState}){
   const host=root?.querySelector('[data-rt]');if(!host)return;
   const mem=window.__rt9candidate||(window.__rt9candidate={timer:null,cfg:null});
   const repo='https://raw.githubusercontent.com/JuanManuelPM/prometeo/';
   const control='exp009-control';
   const raw=(branch,p)=>repo+branch+'/'+(String(p).startsWith('ui-workspace-v1/')?String(p):'ui-workspace-v1/'+String(p));
   const KEY='prometeo.exp009.launches.v1';
   const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
   const ms=(a,b)=>{const x=Date.parse(a||''),y=Date.parse(b||'');return Number.isFinite(x)&&Number.isFinite(y)?y-x:null};
   const fmt=v=>v==null||!Number.isFinite(v)?'—':v<1000?Math.round(v)+' ms':v<60000?(v/1000).toFixed(1)+' s':(v/60000).toFixed(1)+' min';
   const clock=v=>v?new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
   const launches=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
   const save=x=>{const a=launches();a.push(x);localStorage.setItem(KEY,JSON.stringify(a.slice(-30)))};
   const latest=b=>launches().filter(x=>x.button===b).at(-1)||null;
   const uuid=()=>{try{return crypto.randomUUID()}catch{return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}};
   const copy=async txt=>{if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(txt);const t=document.createElement('textarea');t.value=txt;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()};
   const tasks=w=>w?.returns_observed??0;
   const ttfw=w=>ms(w?.launch_clicked_at,w?.first_claim_at);
   const startDelay=w=>ms(w?.launch_clicked_at,w?.worker_started_at);
   const claimSignal=w=>ms(w?.first_claim_at,w?.first_public_signal_at);
   const firstReturn=w=>ms(w?.first_claim_at,w?.first_return_at);
   const runtime=w=>ms(w?.first_claim_at,w?.last_return_at);
   const rate=w=>{const r=runtime(w),t=tasks(w);return w?.rate_evidence_aligned&&r&&t?t/(r/60000):null};
   async function load(){
     const cfg=mem.cfg||await fetch(raw(control,'ui-workspace-v1/experiments/allocator-v8/RUN.json')+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json());
     mem.cfg=cfg;
     if(!mem.binding_audit){
       const texts=await Promise.all(['HANDOFF.md','PROMPT.txt'].map(name=>fetch(raw(control,'ui-workspace-v1/experiments/allocator-v8/'+name),{cache:'no-store'}).then(r=>r.ok?r.text():null).catch(()=>null)));
       mem.binding_audit=auditDealerBindings(cfg,texts[0],texts[1]);
     }
     const states=await Promise.all(cfg.state_paths.map((p,i)=>fetch(raw(cfg.branches[i],p)+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).catch(()=>null)));
     if(!mem.evidence||Date.now()-mem.evidence_at>30000){
       mem.evidence=await Promise.all(cfg.branches.map(branch=>fetch('https://api.github.com/repos/JuanManuelPM/prometeo/contents/ui-workspace-v1/experiments/allocator-v8/returns?ref='+encodeURIComponent(branch),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)));
       mem.evidence_at=Date.now();
     }
     return {cfg,states:states.map((state,i)=>({...state,...projectResidency(state,mem.evidence[i],{slot:String(i+1).padStart(3,'0'),observed_at:new Date(mem.evidence_at).toISOString()})}))};
   }
   function launchCell(b,states){
     const l=latest(b);if(!l)return '<span>sin lanzar</span><b>—</b>';
     const w=states.find(x=>x?.launch_id===l.launch_id);
     if(w?.first_claim_at)return '<span>TTFW</span><b>'+fmt(ttfw(w))+'</b>';
     return '<span>desde click</span><b>'+fmt(Date.now()-Date.parse(l.clicked_at))+'</b>';
   }
   async function doCopy(b,btn){
     if(mem.binding_audit?.status!=='MATCH'){btn.textContent='CONFIGURACIÓN NO VERIFICADA';return}
     const clicked_at=new Date().toISOString(),launch_id='exp009-'+b+'-'+uuid();
     btn.disabled=true;btn.textContent='verificando…';
     try{
       const verified=await readVerifiedPrompt(fetch);let p=verified.prompt;
       p=p.replaceAll('{{LAUNCH_ID}}',launch_id).replaceAll('{{LAUNCH_CLICKED_AT}}',clicked_at).replaceAll('{{LAUNCH_BUTTON}}','TRIO-'+b);
       await copy(p);save({button:b,clicked_at,launch_id,control_revision:verified.revision});btn.textContent='✓ COPIADO '+clock(new Date().toISOString());
     }catch(e){btn.disabled=false;btn.textContent='ERROR AL COPIAR'}
   }
   function launchPage(states){
     return '<div class="rt-alert"><b>CONFIGURACIÓN '+esc(mem.binding_audit?.status||'UNKNOWN')+'. OBSERVACIÓN HISTÓRICA.</b> Los botones históricos se inhiben si RUN, HANDOFF y PROMPT no coinciden. Estos archivos no prueban que haya workers vivos ni ejecución desatendida.</div>'+
     '<div class="rt-head"><div><div class="rt-k">EXP-009 · RESIDENCY TRIO</div><div class="rt-title">3 workers · mismo prompt</div><div class="rt-sub">Objetivo: medir cuántos RETURN durables produce cada ejecución antes de una interrupción real, y cuánto tarda en conectar, reclamar y saltar entre trabajos.</div></div><span class="rt-chip">K1 · F1 · M1 · W1 · R1</span></div>'+
     '<div class="rt-grid">'+['1','2','3'].map((b,i)=>'<section class="rt-card"><div style="display:flex;gap:11px;align-items:center"><div class="rt-num">W'+b+'</div><div><div class="rt-name">LANZAMIENTO '+b+'</div><div class="rt-desc">Mismo prompt. El slot real lo decide el CAS del dealer, no este botón.</div></div></div><button class="rt-btn" data-copy="'+b+'">COPIAR PROMPT</button><div class="rt-launch">'+launchCell(b,states)+'</div></section>').join('')+'</div>';
   }
   function workerCard(w,i){
     const live='';
     return '<section class="rt-worker"><div class="rt-wh"><b>SLOT '+String(i+1).padStart(3,'0')+'</b><i class="rt-dot '+live+'"></i></div><div class="rt-big">'+tasks(w)+'<small> archivos RETURN</small></div>'+
     '<div class="rt-line"><span>estado histórico</span><b>'+esc(w?.status_label||'SOURCE_UNAVAILABLE')+'</b></div>'+
     '<div class="rt-line"><span>fuente del conteo</span><b>'+esc(w?.canonicality)+'</b></div><div class="rt-line"><span>TTFW</span><b>'+fmt(ttfw(w))+'</b></div>'+
     '<div class="rt-line"><span>click → start</span><b>'+fmt(startDelay(w))+'</b></div>'+
     '<div class="rt-line"><span>claim → señal</span><b>'+fmt(claimSignal(w))+'</b></div>'+
     '<div class="rt-line"><span>claim → 1er return</span><b>'+fmt(firstReturn(w))+'</b></div>'+
     '<div class="rt-line"><span>tareas/min</span><b>'+(rate(w)?.toFixed(2)||'—')+'</b></div>'+
     '<div class="rt-line"><span>último ticket durable</span><b>'+esc(w?.last_durable_ticket||'—')+'</b></div>'+
     '<div class="rt-line"><span>terminal</span><b>'+esc(w?.terminal_reason||'—')+'</b></div></section>';
   }
   function livePage(states){
     const total=states.reduce((n,w)=>n+tasks(w),0),active=states.filter(w=>w?.first_claim_at).length,best=Math.max(0,...states.map(tasks));
     return '<div class="rt-head"><div><div class="rt-k">OBSERVACIÓN HISTÓRICA</div><div class="rt-title">Residencia durable</div><div class="rt-sub">RETURN durable tiene prioridad sobre state. Un claim antiguo no demuestra un worker vivo. Si el índice no está disponible, el número es un mínimo declarado por state; no una prueba exacta.</div></div></div>'+
     '<div class="rt-metrics"><div class="rt-metric"><b>'+total+'</b><span>ARCHIVOS RETURN / MÍNIMO</span></div><div class="rt-metric"><b>'+active+'/3</b><span>CON CLAIM</span></div><div class="rt-metric"><b>'+best+'</b><span>MEJOR WORKER</span></div><div class="rt-metric"><b>'+states.reduce((n,w)=>n+(w?.counters?.forbidden_ops||0),0)+'</b><span>FORBIDDEN OPS</span></div></div>'+
     '<div class="rt-grid">'+states.map(workerCard).join('')+'</div>';
   }
   function modulesPage(){
     return '<div class="rt-head"><div><div class="rt-k">MÓDULOS</div><div class="rt-title">Cinco posiciones fijas</div><div class="rt-sub">El experimento ya no depende de un prompt monolítico. Cada capa puede evolucionar sin cambiar el lugar de las demás.</div></div></div>'+
     '<div class="rt-mods"><section class="rt-mod"><h3>01 · KERNEL v1</h3><p>Autoridad, STOP_GRANT, whitelist de operaciones y separación entre corte autorizado e interrupción de plataforma.</p></section>'+
     '<section class="rt-mod"><h3>02 · FAILURE CASEBOOK v1</h3><p>Parking, “ya hice suficiente”, último bloque esencial, rereads inútiles, telemetría bloqueante y errores confundidos con cierre.</p></section>'+
     '<section class="rt-mod"><h3>03 · MECHANICS residency-v1</h3><p>Registro separado, claim atómico, RETURN → CLAIM inmediato y cero checkpoint entre tareas.</p></section>'+
     '<section class="rt-mod"><h3>04 · WORK cyclic-v1</h3><p>Ocho bloques locales derivados del ticket. No existe BLOCK_READ.</p></section>'+
     '<section class="rt-mod"><h3>05 · RETURN/LEARNING v1</h3><p>Create exitoso es durable, fetch sólo ante incertidumbre, state cada 10 returns y observaciones sin auto-reescribir reglas.</p></section></div>';
   }
   function metricsPage(){
     return '<div class="rt-head"><div><div class="rt-k">MÉTRICAS</div><div class="rt-title">Qué decide si la mecánica sirve</div></div></div><div class="rt-mods">'+
     '<section class="rt-mod"><h3>Arranque</h3><div class="rt-code">click → worker_started\nclick → first_claim\nfirst_claim → first_public_signal</div></section>'+
     '<section class="rt-mod"><h3>Residencia</h3><div class="rt-code">RETURNs durables\núltimo ticket durable\ntiempo first_claim → last_return</div></section>'+
     '<section class="rt-mod"><h3>Hot path</h3><div class="rt-code">RETURN → CLAIM\ntareas/minuto\nrevision_conflicts\nretries</div></section>'+
     '<section class="rt-mod"><h3>Terminal</h3><div class="rt-code">STOP_GRANT autorizado\nvs PLATFORM_INTERRUPTION\nvs salida no autorizada</div></section></div>';
   }
   async function render(){
     try{const {states}=await load(),p=widgetState.page||0;host.innerHTML=p===0?launchPage(states):p===1?livePage(states):p===2?modulesPage():metricsPage();if(p===0)host.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>doCopy(b.dataset.copy,b))}catch(e){host.innerHTML='<div class="rt-card"><b>Error</b><div class="rt-desc">'+esc(e.message)+'</div></div>'}
   }
   render();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?render():clearInterval(mem.timer),2000);
 }
});
