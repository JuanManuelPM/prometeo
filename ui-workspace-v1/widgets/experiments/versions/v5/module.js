Prometeo.registerWidget({
 id:'experiments',name:'EXPERIMENTOS',version:5,widgetApi:1,defaultHeight:390,
 pages:[{title:'ACTUAL'},{title:'COMPARAR'},{title:'HISTORIAL'},{title:'CONTINUIDAD'}],
 css:`
 [data-widget="experiments"] .widget-content{display:block!important;place-items:initial!important;padding:14px!important;text-align:left!important;color:var(--fg)!important}
 .e4{width:100%;height:100%;overflow:auto;color:var(--fg)}
 .e4-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-top:3px solid var(--fg);padding-top:10px}
 .e4-id{font-size:30px;font-weight:950;line-height:1}.e4-title{font-size:12px;margin-top:5px;color:var(--muted)}
 .e4-state{font-size:10px;font-weight:900;border:1px solid var(--fg);border-radius:999px;padding:4px 8px;white-space:nowrap}
 .e4-progress{height:14px;background:rgba(17,17,17,.12);margin:14px 0 5px;overflow:hidden}.e4-progress i{display:block;height:100%;background:var(--fg)}
 .e4-pct{display:flex;justify-content:space-between;font-size:10px;color:var(--muted)}
 .e4-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:13px}
 .e4-metric{border-top:1px solid var(--line);padding-top:6px}.e4-metric b{display:block;font-size:22px}.e4-metric span{font-size:9px;color:var(--muted)}
 .e4-note{font-size:10px;line-height:1.45;color:var(--muted);margin-top:12px}
 .e4-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}.e4-card{border-top:2px solid var(--fg);padding-top:8px}
 .e4-card h3{margin:0 0 7px;font-size:12px}.e4-line{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--line);font-size:10px}
 .e4-row{display:grid;grid-template-columns:68px 1fr auto;gap:8px;padding:8px 0;border-top:1px solid var(--line);font-size:11px}
 .e4-link{display:inline-block;margin-top:10px;color:var(--fg);font-size:11px}
 @container (max-width:340px){.e4-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.e4-compare{grid-template-columns:1fr}}
 `,
 render(){return '<div class="e4" data-exp-v4><div class="e4-note">cargando experimento actual…</div></div>';},
 afterRender({root,widgetState}){
  const host=root?.querySelector('[data-exp-v4]');if(!host)return;
  const repoRaw='https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/';
  const base=repoRaw+'ui-workspace-v1/';
  const raw=p=>repoRaw+(String(p).startsWith('ui-workspace-v1/')?String(p):'ui-workspace-v1/'+String(p));
  const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  async function load(){
   try{
    const cr=await fetch(base+'experiments/CURRENT_RUN.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json());
    const [a,b,baseLine]=await Promise.all([
      fetch(raw(cr.state_paths[0])+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(raw(cr.state_paths[1])+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(raw(cr.baseline)+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json())
    ]);
    const ws=[a,b],done=ws.reduce((n,w)=>n+(w.counters?.completed||0),0);
    const tickets=ws.flatMap(w=>(w.completed||[]).map(x=>String(x.ticket||''))).filter(Boolean);
    const dup=tickets.length-new Set(tickets).size;
    const ext=ws.reduce((n,w)=>n+(w.counters?.external_work_calls||0),0);
    const tele=ws.reduce((n,w)=>n+(w.counters?.telemetry_writes||0),0);
    const forbidden=ws.reduce((n,w)=>n+(w.counters?.forbidden_ops||0),0);
    const states=ws.map(w=>w.status);
    const live=states.some(x=>x!=='WAITING'&&x!=='EMPTY');
    const final=states.every(x=>x==='EMPTY');
    const status=final?'PASS CANDIDATE':live?'RUNNING':cr.status;
    const page=widgetState.page||0;
    if(page===0){
      host.innerHTML='<div class="e4-head"><div><div class="e4-id">'+esc(cr.experiment_id)+'</div><div class="e4-title">'+esc(cr.title)+' · 2 workers / 10 bloques</div></div><span class="e4-state">'+esc(status)+'</span></div>'+
      '<div class="e4-progress"><i style="width:'+Math.min(100,done*10)+'%"></i></div><div class="e4-pct"><span>'+done+'/10 completados</span><span>'+Math.min(100,done*10)+'%</span></div>'+
      '<div class="e4-metrics"><div class="e4-metric"><b>'+dup+'</b><span>DUPLICADOS</span></div><div class="e4-metric"><b>'+ext+'</b><span>CALLS TRABAJO</span></div><div class="e4-metric"><b>'+tele+'</b><span>TELEMETRY</span></div><div class="e4-metric"><b>'+forbidden+'</b><span>FORBIDDEN</span></div></div>'+
      '<div class="e4-note">La carga es idéntica a EXP-003. Cambia el protocolo: primer ping inmediato, timestamps absolutos y cero navegación innecesaria.</div>';
    }else if(page===1){
      host.innerHTML='<div class="e4-compare"><div class="e4-card"><h3>BASELINE · EXP-003</h3><div class="e4-line"><span>bloques</span><b>10/10</b></div><div class="e4-line"><span>duplicados</span><b>'+esc(baseLine.totals.duplicates)+'</b></div><div class="e4-line"><span>ops externas</span><b>'+esc(baseLine.totals.external_work_ops)+'</b></div><div class="e4-line"><span>telemetry writes</span><b>'+esc(baseLine.totals.telemetry_writes)+'</b></div></div>'+
      '<div class="e4-card"><h3>ACTUAL · EXP-004</h3><div class="e4-line"><span>bloques</span><b>'+done+'/10</b></div><div class="e4-line"><span>duplicados</span><b>'+dup+'</b></div><div class="e4-line"><span>calls trabajo</span><b>'+ext+'</b></div><div class="e4-line"><span>telemetry writes</span><b>'+tele+'</b></div></div></div>'+
      '<div class="e4-note">La comparación final de tiempos usa commits GitHub como reloj durable, no los milisegundos declarados por el worker.</div>';
    }else if(page===2){
      host.innerHTML='<div class="e4-row"><b>EXP-001</b><span>CAS mecánico</span><span>PARTIAL</span></div><div class="e4-row"><b>EXP-002</b><span>dos chats / claim</span><span>PARTIAL</span></div><div class="e4-row"><b>EXP-003</b><span>allocator 2W/10B</span><span>PASS</span></div><div class="e4-row"><b>EXP-004</b><span>telemetry + efficiency</span><span>'+esc(status)+'</span></div>';
    }else{
      host.innerHTML='<div class="e4-card"><h3>CONTINUIDAD</h3><div class="e4-note">EXP-004 mantiene 2 workers / 10 tareas para aislar el efecto del prompt y la observabilidad. Lease/requeue sigue fuera de alcance hasta cerrar esta comparación.</div><a class="e4-link" href="experiments/allocator-v3/START_HERE.md">protocolo durable</a></div>';
    }
   }catch(e){host.innerHTML='<div class="e4-note">ERROR '+esc(e.message)+'</div>'}
  }
  load();
 }
});