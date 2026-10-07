Prometeo.registerWidget({
 id:'workers',name:'WORKERS',version:4,widgetApi:1,defaultHeight:560,
 pages:[{title:'WORKERS'},{title:'TIEMPO'},{title:'TIMELINE'},{title:'RETURNS'}],
 css:`
 [data-widget="workers"] .widget-content{display:block!important;place-items:initial!important;padding:14px!important;text-align:left!important;color:var(--fg)!important}
 .w4{width:100%;height:100%;overflow:auto;color:var(--fg)}
 .w4-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:9px}.w4-top b{font-size:12px}.w4-top span{font-size:10px;color:var(--muted)}
 .w4-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 .w4-card{border-top:3px solid var(--fg);padding-top:8px;min-width:0}.w4-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
 .w4-id{font-size:24px;font-weight:950}.w4-status{font-size:10px;border:1px solid var(--fg);border-radius:999px;padding:3px 7px}
 .w4-progress{height:12px;background:rgba(17,17,17,.12);margin:10px 0 6px;overflow:hidden}.w4-progress i{display:block;height:100%;background:var(--fg)}
 .w4-blocks{display:flex;gap:4px;flex-wrap:wrap;margin:5px 0 9px}.w4-block{width:23px;height:23px;display:grid;place-items:center;border:1px solid var(--line);font-size:9px;border-radius:4px}.w4-block.done{background:var(--fg);color:var(--panel)}.w4-block.current{outline:2px solid var(--fg)}
 .w4-line{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--line);font-size:10px}.w4-line b{text-align:right;overflow-wrap:anywhere}
 .w4-last{margin-top:7px;padding:8px;background:rgba(17,17,17,.06);font-size:10px;line-height:1.4}
 .w4-timecard{border-top:3px solid var(--fg);padding-top:8px;margin-bottom:14px}.w4-timehead{display:flex;justify-content:space-between;gap:8px;font-weight:900}
 .w4-bar{height:15px;background:rgba(17,17,17,.10);display:flex;overflow:hidden;margin:8px 0}.w4-seg{height:100%;min-width:1px}
 .w4-seg.s0{background:#111}.w4-seg.s1{background:#333}.w4-seg.s2{background:#555}.w4-seg.s3{background:#777}.w4-seg.s4{background:#999}.w4-seg.s5{background:#bbb}.w4-seg.s6{background:#ddd}.w4-seg.s7{background:#eee}
 .w4-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px;font-size:10px}.w4-legend div{display:flex;justify-content:space-between;gap:8px}.w4-legend b{white-space:nowrap}
 .w4-event{display:grid;grid-template-columns:92px 52px 76px 1fr;gap:6px;padding:4px 0;border-bottom:1px solid var(--line);font-size:9px}
 .w4-return{border-top:1px solid var(--fg);padding:7px 0}.w4-return summary{cursor:pointer;font-weight:800;font-size:10px}.w4-answer{white-space:pre-wrap;font-size:10px;line-height:1.45;padding:8px 0}
 .w4-note{font-size:10px;color:var(--muted);line-height:1.45;margin-top:9px}.w4-error{font-size:11px;color:#8a2f2f}
 @container (max-width:360px){.w4-grid{grid-template-columns:1fr}.w4-legend{grid-template-columns:1fr}.w4-event{grid-template-columns:75px 42px 1fr}.w4-event span:nth-child(3){display:none}}
 `,
 render(){return '<div class="w4" data-workers-v4><div class="w4-note">cargando workers…</div></div>';},
 afterRender({root,widgetState}){
  const host=root?.querySelector('[data-workers-v4]');if(!host)return;
  const mem=window.__workersV4||(window.__workersV4={timer:null,returns:{}});
  const base='https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/ui-workspace-v1/';
  const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clock=v=>v?new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  const dur=ms=>ms==null?'—':ms<1000?ms+' ms':ms<60000?(ms/1000).toFixed(1)+' s':(ms/60000).toFixed(1)+' min';
  function derive(w){
    const ev=(w.events||[]).filter(e=>e.worker_at).slice().sort((a,b)=>String(a.worker_at).localeCompare(String(b.worker_at)));
    const buckets={REGISTER:0,PROTOCOL_READ:0,GET_NEXT:0,BLOCK_READ:0,LOCAL_WORK:0,RETURN_PUBLISH:0,RETURN_VERIFY:0,IDLE:0};
    const intents={};
    let lastResult=null,first=ev[0]?.worker_at||null,last=ev.at(-1)?.worker_at||null;
    for(const e of ev){
      const t=Date.parse(e.worker_at);if(!Number.isFinite(t))continue;
      if(e.phase==='INTENT'){
        if(lastResult && e.operation!=='RETURN_PUBLISH'){const gap=t-lastResult;if(gap>0)buckets.IDLE+=gap}
        intents[e.operation]={t,e};
      }
      if(e.phase==='RESULT'){
        const it=intents[e.operation];
        if(it){const d=t-it.t;if(d>0)buckets[e.operation]=(buckets[e.operation]||0)+d;delete intents[e.operation]}
        if(e.operation==='BLOCK_READ'&&e.status==='SUCCESS') intents.__LOCAL={t};
        if(e.operation!=='BLOCK_READ') lastResult=t;
      }
      if(e.phase==='INTENT'&&e.operation==='RETURN_PUBLISH'&&intents.__LOCAL){const d=t-intents.__LOCAL.t;if(d>0)buckets.LOCAL_WORK+=d;delete intents.__LOCAL}
    }
    const total=first&&last?Math.max(0,Date.parse(last)-Date.parse(first)):0;
    const used=Object.values(buckets).reduce((a,n)=>a+n,0);
    return {first,last,total,buckets,unknown:Math.max(0,total-used)};
  }
  async function refresh(){
   try{
    const cr=await fetch(base+'experiments/CURRENT_RUN.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json());
    const [a,b,audit,baseline]=await Promise.all([
      fetch(base+cr.state_paths[0]+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(base+cr.state_paths[1]+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(base+'experiments/allocator-v3/AUDITED_TIMELINE.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(base+cr.baseline+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json())
    ]);
    const ws=[a,b],derived=ws.map(derive),page=widgetState.page||0;
    if(page===0){
      host.innerHTML='<div class="w4-top"><b>'+esc(cr.experiment_id)+' · 2 WORKERS</b><span>poll 2 s</span></div><div class="w4-grid">'+ws.map((w,i)=>{
        const c=w.counters||{},done=(w.completed||[]).map(x=>String(x.ticket).padStart(3,'0')),cur=String(w.current?.ticket||'').padStart(3,'0'),last=(w.events||[]).at(-1);
        const blocks=Array.from({length:10},(_,j)=>{const n=String(j+1).padStart(3,'0');const cls=done.includes(n)?'done':cur===n?'current':'';return '<span class="w4-block '+cls+'">'+(j+1)+'</span>'}).join('');
        return '<div class="w4-card"><div class="w4-head"><span class="w4-id">W'+esc(w.worker_slot)+'</span><span class="w4-status">'+esc(w.status)+'</span></div><div class="w4-progress"><i style="width:'+Math.min(100,(c.completed||0)*10)+'%"></i></div><div class="w4-blocks">'+blocks+'</div><div class="w4-line"><span>actual</span><b>'+esc(w.current?.operation||'—')+' '+esc(w.current?.block||'')+'</b></div><div class="w4-line"><span>completados</span><b>'+esc(c.completed||0)+'</b></div><div class="w4-line"><span>calls trabajo</span><b>'+esc(c.external_work_calls||0)+'</b></div><div class="w4-line"><span>telemetry</span><b>'+esc(c.telemetry_writes||0)+'</b></div><div class="w4-line"><span>conflicts / retries</span><b>'+esc(c.revision_conflicts||0)+' / '+esc(c.retries||0)+'</b></div><div class="w4-last"><b>último evento</b><br>'+clock(last?.worker_at)+' · '+esc(last?.phase)+' '+esc(last?.operation)+'<br><span class="w4-muted">'+esc(last?.status||last?.target||'')+'</span></div></div>';
      }).join('')+'</div><div class="w4-note">El primer write público ocurre inmediatamente después del registro. Durante trabajo local no debería aparecer ninguna llamada online.</div>';
    }else if(page===1){
      const audited=audit.status==='COMPLETE'&&Array.isArray(audit.workers)&&audit.workers.length===2;
      const data=audited?audit.workers:derived;
      const names=[['REGISTER','registro'],['PROTOCOL_READ','protocolo'],['GET_NEXT','allocator'],['BLOCK_READ','lectura'],['LOCAL_WORK','trabajo local'],['RETURN_PUBLISH','publicar'],['RETURN_VERIFY','verificar'],['IDLE','espera']];
      host.innerHTML='<div class="w4-top"><b>DÓNDE SE FUE EL TIEMPO</b><span>'+(audited?'AUDITED · server clock':'LIVE · worker clock')+'</span></div>'+data.map((x,i)=>{
        const buckets=x.buckets_ms||x.buckets||{},total=x.durable_span_ms||x.total||1;
        const sumNames=names.map(([k])=>buckets[k]||0).reduce((a,n)=>a+n,0),unknown=Math.max(0,total-sumNames);
        const vals=[...names.map(([k])=>buckets[k]||0),unknown];
        const segs=vals.map((v,j)=>'<i class="w4-seg s'+j+'" style="width:'+((v/total)*100).toFixed(2)+'%"></i>').join('');
        const leg=names.map(([k,l])=>'<div><span>'+l+'</span><b>'+dur(buckets[k]||0)+' · '+Math.round((buckets[k]||0)/total*100)+'%</b></div>').join('')+'<div><span>sin clasificar</span><b>'+dur(unknown)+' · '+Math.round(unknown/total*100)+'%</b></div>';
        const baseW=i===0?baseline.worker_001:baseline.worker_002;
        return '<div class="w4-timecard"><div class="w4-timehead"><span>W'+esc(ws[i].worker_slot)+'</span><span>'+dur(total)+'</span></div><div class="w4-bar">'+segs+'</div><div class="w4-legend">'+leg+'</div><div class="w4-note">baseline EXP-003: '+dur(baseW.durable_span_ms)+'</div></div>';
      }).join('')+'<div class="w4-note">Al terminar se reemplaza LIVE por AUDITED usando timestamps de commits GitHub. Así la medición final no depende del reloj subjetivo del worker.</div>';
    }else if(page===2){
      const ev=ws.flatMap(w=>(w.events||[]).map(e=>({worker:w.worker_slot,...e}))).sort((x,y)=>String(x.worker_at||'').localeCompare(String(y.worker_at||'')));
      host.innerHTML='<div class="w4-top"><b>TIMELINE ABSOLUTO</b><span>'+ev.length+' eventos</span></div>'+ev.map(e=>'<div class="w4-event"><span>'+clock(e.worker_at)+'</span><span>W'+esc(e.worker)+'</span><span>'+esc(e.phase)+'</span><span>'+esc(e.operation)+' · '+esc(e.status||e.target||'')+'</span></div>').join('')+'<div class="w4-note">Cada evento conserva ISO UTC con milisegundos en el state. El audit posterior lo contrasta contra hora de commit.</div>';
    }else{
      const rows=ws.flatMap(w=>(w.completed||[]).map(x=>({worker:w.worker_slot,...x}))).sort((x,y)=>String(x.ticket).localeCompare(String(y.ticket)));
      host.innerHTML='<div class="w4-top"><b>RETURNS</b><span>'+rows.length+'/10</span></div>'+rows.map(r=>'<details class="w4-return" data-path="'+esc(r.return_path||('ui-workspace-v1/experiments/allocator-v3/returns/'+r.return))+'"><summary>TICKET '+esc(r.ticket)+' · W'+esc(r.worker)+'</summary><div class="w4-answer">tocá para cargar</div></details>').join('');
      host.querySelectorAll('details[data-path]').forEach(d=>d.addEventListener('toggle',async()=>{if(!d.open)return;const p=d.dataset.path,box=d.querySelector('.w4-answer');if(mem.returns[p]){box.textContent=mem.returns[p];return}box.textContent='cargando…';try{const txt=await fetch('https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/'+p,{cache:'no-store'}).then(r=>r.text());mem.returns[p]=txt;box.textContent=txt}catch(e){box.textContent='ERROR '+e.message}}));
    }
   }catch(e){host.innerHTML='<div class="w4-error">telemetría no disponible: '+esc(e.message)+'</div>'}
  }
  refresh();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?refresh():clearInterval(mem.timer),2000);
 }
});