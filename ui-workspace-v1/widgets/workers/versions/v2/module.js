Prometeo.registerWidget({
id:'workers',name:'WORKERS',version:2,widgetApi:1,defaultHeight:430,
pages:[{title:'WORKERS'},{title:'STATS'},{title:'TIMELINE'},{title:'RETURNS'}],
css:`
.w2{width:100%;height:100%;overflow:auto;text-align:left;padding:0 2px 16px;color:var(--fg)}
.w2-head{display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:11px}.w2-muted{color:var(--muted)}
.w2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.w2-worker{border-top:2px solid var(--fg);padding-top:7px}
.w2-title{display:flex;justify-content:space-between;gap:8px;font-weight:900}.w2-pill{font-size:10px;border:1px solid var(--line);border-radius:99px;padding:2px 6px}
.w2-line{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--line);font-size:11px}.w2-line b{text-align:right;overflow-wrap:anywhere}
.w2-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:8px 0 12px}.w2-metric{border-top:1px solid var(--fg);padding-top:5px}.w2-metric b{display:block;font-size:18px}.w2-metric span{font-size:9px;color:var(--muted)}
.w2-bar{height:7px;background:rgba(17,17,17,.12);margin-top:4px}.w2-fill{height:100%;background:var(--fg)}
.w2-event{display:grid;grid-template-columns:80px 54px 1fr;gap:6px;padding:4px 0;border-bottom:1px solid var(--line);font-size:10px}.w2-no-time{color:#9b5f00}
.w2-return{border-top:1px solid var(--fg);padding:7px 0}.w2-return summary{cursor:pointer;font-weight:800}.w2-answer{white-space:pre-wrap;font-size:11px;line-height:1.45;padding:8px 0}
.w2-note{font-size:10px;line-height:1.4;color:var(--muted);padding:6px 0}.w2-error{font-size:11px;color:#8a2f2f}
@container (max-width:330px){.w2-grid{grid-template-columns:1fr}.w2-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.w2-event{grid-template-columns:68px 1fr}.w2-event span:nth-child(2){display:none}}
`,
render(){return '<div class="w2" data-workers-v2><div class="w2-note">cargando telemetría real…</div></div>';},
afterRender({root,widgetState}){
 const host=root?.querySelector('[data-workers-v2]');if(!host)return;
 const mem=window.__workersV2||(window.__workersV2={timer:null,returns:{}});
 const base='https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/ui-workspace-v1/experiments/allocator-v2/';
 const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const clock=v=>v?new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
 const dur=ms=>ms==null?'—':ms<1000?ms+' ms':(ms/1000).toFixed(ms<10000?1:0)+' s';
 async function refresh(){
  try{
   const [a,b,o]=await Promise.all([
    fetch(base+'state/worker-001.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
    fetch(base+'state/worker-002.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
    fetch(base+'OBSERVED_STATS.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json())
   ]);
   const ws=[a,b],page=widgetState.page||0;
   const tickets=ws.flatMap(w=>(w.completed||[]).map(x=>String(x.ticket||''))).filter(Boolean);
   const done=ws.reduce((n,w)=>n+(w.counters?.completed||0),0),dup=tickets.length-new Set(tickets).size;
   const conflicts=ws.reduce((n,w)=>n+(w.counters?.revision_conflicts||0),0),ops=ws.reduce((n,w)=>n+(w.counters?.external_work_ops||0),0),tw=ws.reduce((n,w)=>n+(w.counters?.telemetry_writes||0),0);
   if(page===0){
    host.innerHTML='<div class="w2-head"><b>ALLOCATOR V2 · REAL</b><span class="w2-muted">lectura '+clock(new Date())+'</span></div><div class="w2-metrics"><div class="w2-metric"><b>'+done+'/10</b><span>BLOQUES</span></div><div class="w2-metric"><b>'+dup+'</b><span>DUPLICADOS</span></div><div class="w2-metric"><b>'+conflicts+'</b><span>CONFLICTOS</span></div><div class="w2-metric"><b>'+ops+'</b><span>OPS EXTERNAS</span></div></div><div class="w2-grid">'+
    ws.map((w,i)=>{const ob=i?o.worker_002:o.worker_001;return '<div class="w2-worker"><div class="w2-title"><span>WORKER '+esc(w.worker_slot)+'</span><span class="w2-pill">'+esc(w.status)+'</span></div><div class="w2-line"><span>actual</span><b>'+esc(w.current_block)+'</b></div><div class="w2-line"><span>completados</span><b>'+esc(w.counters?.completed||0)+'</b></div><div class="w2-line"><span>primer durable</span><b>'+clock(ob?.first_durable_at)+'</b></div><div class="w2-line"><span>último durable</span><b>'+clock(ob?.last_durable_at)+'</b></div><div class="w2-line"><span>span durable</span><b>'+dur(ob?.durable_span_ms)+'</b></div><div class="w2-line"><span>delay visible</span><b>'+dur(ob?.first_visibility_delay_vs_reported_ms)+'</b></div></div>'}).join('')+
    '</div><div class="w2-note">Horas durable = commits GitHub observados. connected_at/local_work_ms = declarados por worker.</div>';
   }else if(page===1){
    host.innerHTML='<div class="w2-head"><b>STATS</b><span class="w2-muted">observado ≠ declarado</span></div><div class="w2-metrics"><div class="w2-metric"><b>'+tw+'</b><span>TELEMETRY WRITES</span></div><div class="w2-metric"><b>'+ops+'</b><span>OPS EXTERNAS</span></div><div class="w2-metric"><b>'+conflicts+'</b><span>CONFLICTS</span></div><div class="w2-metric"><b>'+dup+'</b><span>DUPLICADOS</span></div></div>'+
    ws.map((w,i)=>{const n=w.counters?.completed||0,ob=i?o.worker_002:o.worker_001;return '<div class="w2-worker"><div class="w2-title"><span>W'+esc(w.worker_slot)+'</span><span>'+n+' bloques</span></div><div class="w2-bar"><div class="w2-fill" style="width:'+Math.round(n*10)+'%"></div></div><div class="w2-line"><span>promedio local declarado</span><b>'+dur(w.timing?.avg_block_ms)+'</b></div><div class="w2-line"><span>vida durable observada</span><b>'+dur(ob?.durable_span_ms)+'</b></div><div class="w2-line"><span>retries</span><b>'+esc(w.counters?.retries||0)+'</b></div><div class="w2-line"><span>errores</span><b>'+esc(w.counters?.errors||0)+'</b></div></div>'}).join('')+
    '<div class="w2-note">Próxima regla: WRITE FIRST + timestamps absolutos; duración = diferencia calculada.</div>';
   }else if(page===2){
    const ev=ws.flatMap(w=>(w.events||[]).map(e=>({worker:w.worker_slot,...e}))).sort((x,y)=>String(x.ts||x.at||'').localeCompare(String(y.ts||y.at||'')));
    host.innerHTML='<div class="w2-head"><b>TIMELINE</b><span class="w2-muted">'+ev.length+' eventos</span></div>'+ev.map(e=>{const t=e.ts||e.at;return '<div class="w2-event"><span class="'+(!t?'w2-no-time':'')+'">'+(t?clock(t):'SIN HORA')+'</span><span>W'+esc(e.worker)+'</span><span>'+esc(e.phase)+' · '+esc(e.operation)+' · '+esc(e.status||e.result||e.target||'')+'</span></div>'}).join('');
   }else{
    const rows=ws.flatMap(w=>(w.completed||[]).map(x=>({worker:w.worker_slot,...x}))).sort((x,y)=>String(x.ticket).localeCompare(String(y.ticket)));
    host.innerHTML='<div class="w2-head"><b>RETURNS</b><span class="w2-muted">'+rows.length+' durables</span></div>'+rows.map(r=>'<details class="w2-return" data-path="'+esc(r.return_path||('ui-workspace-v1/experiments/allocator-v2/returns/'+r.return))+'"><summary>TICKET '+esc(r.ticket)+' · W'+esc(r.worker)+' · '+dur(r.local_work_ms)+'</summary><div class="w2-answer">tocá para cargar</div></details>').join('');
    host.querySelectorAll('details[data-path]').forEach(d=>d.addEventListener('toggle',async()=>{if(!d.open)return;const p=d.dataset.path,box=d.querySelector('.w2-answer');if(mem.returns[p]){box.textContent=mem.returns[p];return}box.textContent='cargando…';try{const txt=await fetch('https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/'+p,{cache:'no-store'}).then(r=>r.text());mem.returns[p]=txt;box.textContent=txt}catch(e){box.textContent='ERROR '+e.message}}));
   }
  }catch(e){host.innerHTML='<div class="w2-error">telemetría no disponible: '+esc(e.message)+'</div>'}
 }
 refresh();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?refresh():clearInterval(mem.timer),3000);
}
});