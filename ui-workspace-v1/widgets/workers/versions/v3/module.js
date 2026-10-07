Prometeo.registerWidget({
 id:'workers',name:'WORKERS',version:3,widgetApi:1,defaultHeight:500,
 pages:[{title:'WORKERS'},{title:'TIEMPO'},{title:'TIMELINE'},{title:'RETURNS'}],
 css:`
 .w3{width:100%;height:100%;overflow:auto;text-align:left;padding:0 2px 18px;color:var(--fg)}
 .w3-head{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:9px;font-size:11px}.w3-muted{color:var(--muted)}
 .w3-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.w3-worker{border-top:2px solid var(--fg);padding-top:8px;min-width:0}
 .w3-title{display:flex;justify-content:space-between;gap:8px;font-weight:900}.w3-pill{font-size:10px;border:1px solid var(--line);border-radius:99px;padding:2px 6px}
 .w3-line{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--line);font-size:11px}.w3-line b{text-align:right}
 .w3-big{font-size:27px;font-weight:900;line-height:1;margin:9px 0 3px}.w3-bar{height:9px;background:rgba(17,17,17,.12);display:flex;overflow:hidden;margin:8px 0 4px}
 .w3-seg{height:100%;min-width:1px}.w3-seg:nth-child(1){background:#111}.w3-seg:nth-child(2){background:#444}.w3-seg:nth-child(3){background:#777}.w3-seg:nth-child(4){background:#999}.w3-seg:nth-child(5){background:#bbb}.w3-seg:nth-child(6){background:#ddd}.w3-seg:nth-child(7){background:#eee}
 .w3-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 10px;font-size:10px}.w3-legend div{display:flex;justify-content:space-between;gap:8px}
 .w3-event{display:grid;grid-template-columns:78px 48px 1fr;gap:6px;padding:4px 0;border-bottom:1px solid var(--line);font-size:10px}.w3-no{color:#9b5f00}
 .w3-return{border-top:1px solid var(--fg);padding:7px 0}.w3-return summary{cursor:pointer;font-weight:800}.w3-answer{white-space:pre-wrap;font-size:11px;line-height:1.45;padding:8px 0}
 .w3-note{font-size:10px;color:var(--muted);line-height:1.4;margin-top:8px}.w3-error{color:#8a2f2f;font-size:11px}
 @container (max-width:340px){.w3-grid{grid-template-columns:1fr}.w3-event{grid-template-columns:68px 1fr}.w3-event span:nth-child(2){display:none}}
 `,
 render(){return '<div class="w3" data-workers-v3><div class="w3-note">cargando telemetría…</div></div>';},
 afterRender({root,widgetState}){
  const host=root?.querySelector('[data-workers-v3]');if(!host)return;
  const mem=window.__workersV3||(window.__workersV3={timer:null,returns:{}});
  const base='https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/ui-workspace-v1/experiments/allocator-v2/';
  const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clock=v=>v?new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  const dur=ms=>ms==null?'—':ms<1000?ms+' ms':(ms/1000).toFixed(ms<10000?1:0)+' s';
  const labels=[['REGISTER','registro'],['GET_NEXT','allocator'],['BLOCK_READ','lectura'],['LOCAL_WORK','trabajo local'],['RETURN_PUBLISH','publicación'],['RETURN_VERIFY','verificación'],['IDLE','espera/overhead']];
  async function refresh(){
   try{
    const [a,b,t]=await Promise.all([
     fetch(base+'state/worker-001.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
     fetch(base+'state/worker-002.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
     fetch(base+'OBSERVED_TIMELINE.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json())
    ]);
    const ws=[a,b],tw=t.workers||[],page=widgetState.page||0;
    if(page===0){
     host.innerHTML='<div class="w3-head"><b>EXP-003 · FINAL</b><span class="w3-muted">10/10 · 0 duplicados</span></div><div class="w3-grid">'+ws.map((w,i)=>{const x=tw[i]||{};return '<div class="w3-worker"><div class="w3-title"><span>WORKER '+esc(w.worker_slot)+'</span><span class="w3-pill">'+esc(w.status)+'</span></div><div class="w3-big">'+esc(w.counters?.completed||0)+' bloques</div><div class="w3-line"><span>primer durable</span><b>'+clock(x.first_durable_at)+'</b></div><div class="w3-line"><span>último durable</span><b>'+clock(x.last_durable_at)+'</b></div><div class="w3-line"><span>vida observada</span><b>'+dur(x.durable_span_ms)+'</b></div><div class="w3-line"><span>conflicts</span><b>'+esc(w.counters?.revision_conflicts||0)+'</b></div><div class="w3-line"><span>errores</span><b>'+esc(w.counters?.errors||0)+'</b></div></div>'}).join('')+'</div><div class="w3-note">horas = commits GitHub observados; no dependen del “creo que tardé X ms” del worker.</div>';
    }else if(page===1){
     host.innerHTML='<div class="w3-head"><b>DÓNDE SE FUE EL TIEMPO</b><span class="w3-muted">server-observed</span></div>'+tw.map((x,i)=>{const b=x.buckets_ms||{},total=x.durable_span_ms||1;const segs=labels.map(([k])=>'<i class="w3-seg" style="width:'+((b[k]||0)/total*100).toFixed(2)+'%"></i>').join('');const leg=labels.map(([k,l])=>'<div><span>'+l+'</span><b>'+dur(b[k]||0)+' · '+Math.round((b[k]||0)/total*100)+'%</b></div>').join('');return '<div class="w3-worker"><div class="w3-title"><span>WORKER '+esc(x.worker_slot)+'</span><span>'+dur(total)+'</span></div><div class="w3-bar">'+segs+'</div><div class="w3-legend">'+leg+'</div></div>'}).join('')+'<div class="w3-note">Cada segmento usa la diferencia entre commits sucesivos del state. LOCAL_WORK empieza después del resultado BLOCK_READ. IDLE absorbe huecos que no pertenecen a una operación externa declarada.</div>';
    }else if(page===2){
     const ev=tw.flatMap(x=>(x.timeline||[]).map(e=>({worker:x.worker_slot,...e}))).sort((x,y)=>String(x.at).localeCompare(String(y.at)));
     host.innerHTML='<div class="w3-head"><b>TIMELINE DURABLE</b><span class="w3-muted">'+ev.length+' eventos</span></div>'+ev.map(e=>'<div class="w3-event"><span>'+clock(e.at)+'</span><span>W'+esc(e.worker)+'</span><span>'+esc(e.phase)+' · '+esc(e.message)+'</span></div>').join('');
    }else{
     const rows=ws.flatMap(w=>(w.completed||[]).map(x=>({worker:w.worker_slot,...x}))).sort((x,y)=>String(x.ticket).localeCompare(String(y.ticket)));
     host.innerHTML='<div class="w3-head"><b>RETURNS</b><span class="w3-muted">'+rows.length+'</span></div>'+rows.map(r=>'<details class="w3-return" data-path="'+esc(r.return_path||('ui-workspace-v1/experiments/allocator-v2/returns/'+r.return))+'"><summary>TICKET '+esc(r.ticket)+' · W'+esc(r.worker)+'</summary><div class="w3-answer">tocá para cargar</div></details>').join('');
     host.querySelectorAll('details[data-path]').forEach(d=>d.addEventListener('toggle',async()=>{if(!d.open)return;const p=d.dataset.path,box=d.querySelector('.w3-answer');if(mem.returns[p]){box.textContent=mem.returns[p];return}box.textContent='cargando…';try{const txt=await fetch('https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/'+p,{cache:'no-store'}).then(r=>r.text());mem.returns[p]=txt;box.textContent=txt}catch(e){box.textContent='ERROR '+e.message}}));
    }
   }catch(e){host.innerHTML='<div class="w3-error">telemetría no disponible: '+esc(e.message)+'</div>'}
  }
  refresh();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?refresh():clearInterval(mem.timer),3000);
 }
});