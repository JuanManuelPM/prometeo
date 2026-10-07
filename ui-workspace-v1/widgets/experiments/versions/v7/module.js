Prometeo.registerWidget({
 id:'experiments',name:'EXPERIMENTOS',version:7,widgetApi:1,defaultHeight:430,
 pages:[{title:'ACTUAL'},{title:'COMPARAR'},{title:'HISTORIAL'},{title:'CONTINUIDAD'}],
 css:`
 [data-widget="experiments"] .widget-content{display:block!important;place-items:initial!important;padding:14px!important;text-align:left!important;color:var(--fg)!important}
 .e6{width:100%;height:100%;overflow:auto;color:var(--fg);font-size:14px}
 .e6-hero{border-top:4px solid var(--fg);padding-top:10px}.e6-head{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
 .e6-id{font-size:38px;font-weight:950;line-height:.95}.e6-title{font-size:14px;color:var(--muted);margin-top:7px;line-height:1.25}.e6-state{font-size:11px;font-weight:900;border:1px solid var(--fg);border-radius:999px;padding:5px 9px}
 .e6-progress{height:18px;background:rgba(17,17,17,.12);margin:16px 0 6px;border-radius:4px;overflow:hidden}.e6-progress i{display:block;height:100%;background:var(--fg)}
 .e6-pct{display:flex;justify-content:space-between;font-size:11px;color:var(--muted)}
 .e6-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:15px}.e6-metric{border-top:2px solid var(--line);padding-top:7px}.e6-metric b{display:block;font-size:27px;line-height:1}.e6-metric span{font-size:9px;color:var(--muted)}
 .e6-workers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.e6-worker{border:1px solid var(--line);border-radius:8px;padding:9px}.e6-worker b{font-size:16px}.e6-worker span{display:block;font-size:11px;color:var(--muted);margin-top:3px}
 .e6-note{font-size:11px;line-height:1.45;color:var(--muted);margin-top:12px}.e6-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}.e6-card{border-top:3px solid var(--fg);padding-top:9px}.e6-card h3{margin:0 0 8px;font-size:15px}.e6-line{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:12px}.e6-row{display:grid;grid-template-columns:72px 1fr auto;gap:8px;padding:10px 0;border-top:1px solid var(--line);font-size:12px}
 @container (max-width:500px){.e6{font-size:15px}.e6-id{font-size:42px}.e6-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.e6-metric b{font-size:30px}.e6-workers{grid-template-columns:1fr}.e6-compare{grid-template-columns:1fr}}
 `,
 render(){return '<div class="e6" data-exp-v6><div class="e6-note">cargando experimento actual…</div></div>';},
 afterRender({root,widgetState}){
  const host=root?.querySelector('[data-exp-v6]');if(!host)return;
  const mem=window.__expV6||(window.__expV6={timer:null});
  const repoBase='https://raw.githubusercontent.com/JuanManuelPM/prometeo/';
  const controlBranch='exp005-control';
  const base=repoBase+controlBranch+'/ui-workspace-v1/';
  const rawBranch=(branch,p)=>repoBase+branch+'/'+(String(p).startsWith('ui-workspace-v1/')?String(p):'ui-workspace-v1/'+String(p));
  const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clock=v=>v?new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  async function load(){
   try{
    const cr=await fetch(base+'experiments/CURRENT_RUN.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json());
    const [a,b,baseLine]=await Promise.all([
      fetch(rawBranch(cr.state_branches[0],cr.state_paths[0])+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(rawBranch(cr.state_branches[1],cr.state_paths[1])+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(rawBranch(controlBranch,cr.baseline)+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json())
    ]);
    const ws=[a,b],done=ws.reduce((n,w)=>n+(w.counters?.completed||0),0),tickets=ws.flatMap(w=>(w.completed||[]).map(x=>String(x.ticket||x.ticket_id||''))).filter(Boolean);
    const dup=tickets.length-new Set(tickets).size,ext=ws.reduce((n,w)=>n+(w.counters?.external_work_calls||0),0),tele=ws.reduce((n,w)=>n+(w.counters?.telemetry_writes||0),0),forbidden=ws.reduce((n,w)=>n+(w.counters?.forbidden_ops||0),0),errs=ws.reduce((n,w)=>n+(w.counters?.errors||0),0);
    const final=ws.every(w=>w.status==='EMPTY'),started=ws.some(w=>w.status!=='WAITING'),status=final?'FINALIZADO':started?'RUNNING':'READY';
    const page=widgetState.page||0;
    if(page===0){
      host.innerHTML='<div class="e6-hero"><div class="e6-head"><div><div class="e6-id">'+esc(cr.experiment_id)+'</div><div class="e6-title">'+esc(cr.title)+'<br>2 workers · mismos 10 bloques que EXP-003</div></div><span class="e6-state">'+status+'</span></div>'+
      '<div class="e6-progress"><i style="width:'+Math.min(100,done*10)+'%"></i></div><div class="e6-pct"><span>'+done+'/10 RETURNS</span><span>'+done*10+'%</span></div>'+
      '<div class="e6-metrics"><div class="e6-metric"><b>'+dup+'</b><span>DUPLICADOS</span></div><div class="e6-metric"><b>'+ext+'</b><span>CALLS TRABAJO</span></div><div class="e6-metric"><b>'+tele+'</b><span>TELEMETRY</span></div><div class="e6-metric"><b>'+errs+'</b><span>ERRORES</span></div></div>'+
      '<div class="e6-workers">'+ws.map((w,i)=>{const slot=w.worker_slot||String(i+1).padStart(3,'0'),last=(w.events||[]).at(-1);return '<div class="e6-worker"><b>W'+slot+' · '+esc(w.status)+'</b><span>'+(w.counters?.completed||0)+' completados · último '+clock(last?.worker_at)+' · forbidden '+(w.counters?.forbidden_ops||0)+'</span></div>'}).join('')+'</div>'+
      '<div class="e6-note">Objetivo: mismo trabajo, menos navegación y tiempos reconstruibles. El widget se actualiza cada 2 segundos.</div></div>';
    }else if(page===1){
      host.innerHTML='<div class="e6-compare"><div class="e6-card"><h3>EXP-003 · BASELINE</h3><div class="e6-line"><span>bloques</span><b>10/10</b></div><div class="e6-line"><span>duplicados</span><b>'+baseLine.totals.duplicates+'</b></div><div class="e6-line"><span>ops externas</span><b>'+baseLine.totals.external_work_ops+'</b></div><div class="e6-line"><span>telemetry</span><b>'+baseLine.totals.telemetry_writes+'</b></div></div><div class="e6-card"><h3>EXP-004 · ACTUAL</h3><div class="e6-line"><span>bloques</span><b>'+done+'/10</b></div><div class="e6-line"><span>duplicados</span><b>'+dup+'</b></div><div class="e6-line"><span>calls trabajo</span><b>'+ext+'</b></div><div class="e6-line"><span>telemetry</span><b>'+tele+'</b></div></div></div><div class="e6-note">La comparación de duración final se audita con timestamps de commits GitHub.</div>';
    }else if(page===2){
      host.innerHTML='<div class="e6-row"><b>EXP-001</b><span>CAS mecánico</span><span>PARTIAL</span></div><div class="e6-row"><b>EXP-002</b><span>dos chats / claim</span><span>PARTIAL</span></div><div class="e6-row"><b>EXP-003</b><span>allocator 2W/10B</span><span>PASS</span></div><div class="e6-row"><b>EXP-004</b><span>telemetry + efficiency</span><span>'+status+'</span></div>';
    }else{
      host.innerHTML='<div class="e6-card"><h3>CONTINUIDAD</h3><div class="e6-note">No escalar todavía. Cerramos primero esta comparación 2W/10B, auditamos tiempos y recién después atacamos lease + expiry + requeue + fencing.</div></div>';
    }
   }catch(e){host.innerHTML='<div class="e6-note">ERROR '+esc(e.message)+'</div>'}
  }
  load();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?load():clearInterval(mem.timer),2000);
 }
});