Prometeo.registerWidget({
 id:'workers',name:'WORKERS',version:7,widgetApi:1,defaultHeight:760,
 pages:[{title:'WORKERS'},{title:'TIEMPO'},{title:'TIMELINE'},{title:'RETURNS'}],
 css:`
 [data-widget="workers"] .widget-content{display:block!important;place-items:initial!important;padding:14px!important;text-align:left!important;color:var(--fg)!important}
 .w6{width:100%;height:100%;overflow:auto;color:var(--fg);font-size:14px}
 .w6-run{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end;border-top:4px solid var(--fg);padding-top:10px;margin-bottom:14px}
 .w6-run h2{font-size:24px;line-height:1;margin:0;font-weight:950}.w6-run small{display:block;font-size:12px;color:var(--muted);margin-top:5px}
 .w6-total{text-align:right}.w6-total b{font-size:28px;line-height:1}.w6-total span{display:block;font-size:10px;color:var(--muted)}
 .w6-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
 .w6-card{border:2px solid var(--fg);border-radius:10px;padding:12px;min-width:0}
 .w6-cardhead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.w6-id{font-size:30px;font-weight:950;line-height:1}.w6-live{font-size:11px;font-weight:900;border:1px solid currentColor;border-radius:999px;padding:4px 8px;white-space:nowrap}
 .w6-phase{font-size:18px;font-weight:900;margin-top:13px;line-height:1.15}.w6-phase small{display:block;font-size:11px;font-weight:500;color:var(--muted);margin-top:4px}
 .w6-progress{height:14px;background:rgba(17,17,17,.12);margin:12px 0 7px;overflow:hidden;border-radius:3px}.w6-progress i{height:100%;display:block;background:var(--fg)}
 .w6-blocks{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px;margin-bottom:12px}.w6-block{aspect-ratio:1;display:grid;place-items:center;border:1px solid var(--line);font-size:10px;border-radius:3px}.w6-block.done{background:var(--fg);color:var(--panel)}.w6-block.current{outline:2px solid var(--fg);outline-offset:1px;font-weight:900}
 .w6-timebar{height:18px;display:flex;background:rgba(17,17,17,.08);overflow:hidden;border-radius:4px;margin:9px 0 6px}.w6-timebar i{display:block;height:100%;min-width:1px}.w6-timebar i:nth-child(1){background:#111}.w6-timebar i:nth-child(2){background:#333}.w6-timebar i:nth-child(3){background:#555}.w6-timebar i:nth-child(4){background:#777}.w6-timebar i:nth-child(5){background:#999}.w6-timebar i:nth-child(6){background:#bbb}.w6-timebar i:nth-child(7){background:#d2d2d2}.w6-timebar i:nth-child(8){background:#ededed}
 .w6-timelegend{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:var(--muted)}.w6-timelegend b{color:var(--fg)}
 .w6-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:12px}.w6-stat{border-top:1px solid var(--line);padding-top:5px}.w6-stat b{display:block;font-size:18px}.w6-stat span{font-size:9px;color:var(--muted)}
 .w6-clock{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;margin-top:10px;font-size:11px}.w6-clock div{display:flex;justify-content:space-between;gap:7px;border-bottom:1px solid var(--line);padding:4px 0}.w6-clock span{color:var(--muted)}
 .w6-detail{border-top:3px solid var(--fg);padding-top:10px;margin-bottom:18px}.w6-detailhead{display:flex;justify-content:space-between;gap:10px;font-size:17px;font-weight:900}
 .w6-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 14px;font-size:12px}.w6-legend div{display:flex;justify-content:space-between;gap:8px;padding:3px 0}.w6-legend span{color:var(--muted)}
 .w6-event{display:grid;grid-template-columns:92px 48px 80px 1fr;gap:7px;padding:7px 0;border-bottom:1px solid var(--line);font-size:11px}
 .w6-return{border-top:1px solid var(--fg);padding:10px 0}.w6-return summary{font-weight:900;cursor:pointer;font-size:12px}.w6-answer{white-space:pre-wrap;font-size:12px;line-height:1.5;padding:10px 0}
 .w6-note{font-size:11px;color:var(--muted);line-height:1.45;margin-top:10px}.w6-error{font-size:14px;color:#8a2f2f;font-weight:800}
 @container (max-width:620px){
   .w6{font-size:15px}.w6-grid{grid-template-columns:1fr}.w6-card{padding:14px}.w6-id{font-size:34px}.w6-phase{font-size:21px}
   .w6-run h2{font-size:27px}.w6-stats{grid-template-columns:repeat(4,minmax(0,1fr))}.w6-stat b{font-size:21px}
   .w6-block{font-size:11px}.w6-clock{grid-template-columns:1fr}.w6-legend{grid-template-columns:1fr}.w6-event{grid-template-columns:82px 42px 1fr}.w6-event span:nth-child(3){display:none}
 }
 `,
 render(){return '<div class="w6" data-workers-v6><div class="w6-note">cargando workers…</div></div>';},
 afterRender({root,widgetState}){
  const host=root?.querySelector('[data-workers-v6]');if(!host)return;
  const mem=window.__workersV6||(window.__workersV6={timer:null,returns:{}});
  const repoBase='https://raw.githubusercontent.com/JuanManuelPM/prometeo/';
  const controlBranch='exp005-control';
  const base=repoBase+controlBranch+'/ui-workspace-v1/';
  const rawBranch=(branch,p)=>repoBase+branch+'/'+(String(p).startsWith('ui-workspace-v1/')?String(p):'ui-workspace-v1/'+String(p));
  const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clock=v=>v?new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  const dur=ms=>ms==null?'—':ms<1000?ms+' ms':ms<60000?(ms/1000).toFixed(0)+' s':(ms/60000).toFixed(1)+' min';
  const age=iso=>{if(!iso)return Infinity;return Math.max(0,Date.now()-Date.parse(iso))};
  const slotOf=(w,i)=>w.worker_slot||String(i+1).padStart(3,'0');
  const ticketOf=w=>w.current?.ticket||w.current?.ticket_id||null;
  const blockOf=w=>w.current?.block||w.current?.block_id||null;
  function phaseAfter(e){
    if(!e)return 'IDLE';
    if(e.phase==='INTENT') return e.operation||'IDLE';
    if(e.phase==='RESULT'&&e.operation==='BLOCK_READ'&&e.status==='SUCCESS')return 'LOCAL_WORK';
    if(e.phase==='RESULT'&&e.operation==='GET_NEXT'&&e.status==='EMPTY')return 'DONE';
    return 'IDLE';
  }
  function derive(w){
    const ev=(w.events||[]).filter(e=>e.worker_at).slice().sort((a,b)=>String(a.worker_at).localeCompare(String(b.worker_at)));
    const buckets={REGISTER:0,PROTOCOL_READ:0,GET_NEXT:0,BLOCK_READ:0,LOCAL_WORK:0,RETURN_PUBLISH:0,RETURN_VERIFY:0,IDLE:0};
    if(!ev.length)return {first:null,last:null,total:0,buckets};
    const terminal=w.status==='EMPTY'||w.status==='DONE';
    const stop=terminal?Date.parse(ev.at(-1).worker_at):Date.now();
    for(let i=0;i<ev.length;i++){
      const a=ev[i],t0=Date.parse(a.worker_at),t1=i<ev.length-1?Date.parse(ev[i+1].worker_at):stop;
      const k=phaseAfter(a);if(Number.isFinite(t0)&&Number.isFinite(t1)&&t1>=t0&&buckets[k]!==undefined)buckets[k]+=t1-t0;
    }
    return {first:ev[0].worker_at,last:ev.at(-1).worker_at,total:Math.max(0,stop-Date.parse(ev[0].worker_at)),buckets};
  }
  function humanPhase(w){
    if(w.status==='EMPTY')return 'TERMINÓ · EMPTY';
    const last=(w.events||[]).at(-1);
    if(last?.phase==='RESULT'&&last.operation==='BLOCK_READ')return 'REDACTANDO LOCALMENTE';
    if(last?.phase==='INTENT'&&last.operation==='GET_NEXT')return 'PIDIENDO TICKET';
    if(last?.phase==='INTENT'&&last.operation==='BLOCK_READ')return 'LEYENDO BLOQUE';
    if(last?.phase==='INTENT'&&last.operation==='RETURN_PUBLISH')return 'PUBLICANDO RETURN';
    if(last?.phase==='INTENT'&&last.operation==='RETURN_VERIFY')return 'VERIFICANDO RETURN';
    if(last?.phase==='INTENT'&&last.operation==='PROTOCOL_READ')return 'LEYENDO PROTOCOLO';
    if(ticketOf(w))return 'TICKET '+String(ticketOf(w)).padStart(3,'0')+' ASIGNADO';
    return w.status||'ESPERANDO';
  }
  function liveLabel(w){
    if(w.status==='EMPTY')return '✓ EMPTY';
    const a=age(w.last_event_worker_at);if(a<90000)return '● LIVE';if(a<240000)return '◐ LENTO';return '○ STALE';
  }
  function topBucket(d){
    const names={REGISTER:'registro',PROTOCOL_READ:'protocolo',GET_NEXT:'allocator',BLOCK_READ:'lectura',LOCAL_WORK:'trabajo local',RETURN_PUBLISH:'publicación',RETURN_VERIFY:'verificación',IDLE:'espera'};
    const arr=Object.entries(d.buckets).sort((a,b)=>b[1]-a[1]);const [k,v]=arr[0]||['IDLE',0];
    return {name:names[k],value:v,pct:d.total?Math.round(v/d.total*100):0};
  }
  async function refresh(){
   try{
    const cr=await fetch(base+'experiments/CURRENT_RUN.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json());
    const [a,b,audit,baseline]=await Promise.all([
      fetch(rawBranch(cr.state_branches[0],cr.state_paths[0])+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(rawBranch(cr.state_branches[1],cr.state_paths[1])+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(rawBranch(controlBranch,cr.audit)+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
      fetch(rawBranch(controlBranch,cr.baseline)+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json())
    ]);
    const ws=[a,b],ds=ws.map(derive),page=widgetState.page||0;
    const totalDone=ws.reduce((n,w)=>n+(w.counters?.completed||0),0);
    if(page===0){
      host.innerHTML='<div class="w6-run"><div><h2>'+esc(cr.experiment_id)+' · RUN REAL</h2><small>2 workers · 10 bloques · actualización cada 2 s</small></div><div class="w6-total"><b>'+totalDone+'/10</b><span>COMPLETADOS</span></div></div><div class="w6-grid">'+ws.map((w,i)=>{
        const c=w.counters||{},slot=slotOf(w,i),done=(w.completed||[]).map(x=>String(x.ticket||x.ticket_id||'').padStart(3,'0')),cur=String(ticketOf(w)||'').padStart(3,'0'),last=(w.events||[]).at(-1),d=ds[i],top=topBucket(d);
        const blocks=Array.from({length:10},(_,j)=>{const n=String(j+1).padStart(3,'0'),cls=done.includes(n)?'done':cur===n?'current':'';return '<span class="w6-block '+cls+'">'+(j+1)+'</span>'}).join('');
        const keys=['GET_NEXT','BLOCK_READ','LOCAL_WORK','RETURN_PUBLISH','RETURN_VERIFY','PROTOCOL_READ','IDLE','REGISTER'];
        const segs=keys.map(k=>'<i style="width:'+((d.buckets[k]||0)/(d.total||1)*100).toFixed(2)+'%"></i>').join('');
        return '<section class="w6-card"><div class="w6-cardhead"><div class="w6-id">W'+esc(slot)+'</div><span class="w6-live">'+liveLabel(w)+'</span></div>'+
        '<div class="w6-phase">'+esc(humanPhase(w))+'<small>'+esc(blockOf(w)||'sin bloque')+' · último evento hace '+dur(age(w.last_event_worker_at))+'</small></div>'+
        '<div class="w6-progress"><i style="width:'+Math.min(100,(c.completed||0)*10)+'%"></i></div><div class="w6-blocks">'+blocks+'</div>'+
        '<div class="w6-timebar">'+segs+'</div><div class="w6-timelegend"><span>mayor gasto: <b>'+esc(top.name)+' '+top.pct+'%</b></span><span><b>'+dur(d.total)+'</b> vivo</span></div>'+
        '<div class="w6-stats"><div class="w6-stat"><b>'+esc(c.completed||0)+'</b><span>RETURNS</span></div><div class="w6-stat"><b>'+esc(c.external_work_calls||0)+'</b><span>CALLS</span></div><div class="w6-stat"><b>'+esc(c.revision_conflicts||0)+'</b><span>CONFLICTS</span></div><div class="w6-stat"><b>'+esc(c.errors||0)+'</b><span>ERRORES</span></div></div>'+
        '<div class="w6-clock"><div><span>primer ping</span><b>'+clock(w.first_public_ping_worker_at)+'</b></div><div><span>último evento</span><b>'+clock(w.last_event_worker_at)+'</b></div><div><span>telemetry writes</span><b>'+esc(c.telemetry_writes||0)+'</b></div><div><span>forbidden ops</span><b>'+esc(c.forbidden_ops||0)+'</b></div></div></section>';
      }).join('')+'</div><div class="w6-note">● LIVE sólo significa señal durable reciente. ○ STALE significa que el state no cambió hace más de 4 minutos; no inventa que el chat murió.</div>';
    }else if(page===1){
      const audited=audit.status==='COMPLETE'&&Array.isArray(audit.workers)&&audit.workers.length===2;
      const data=audited?audit.workers:ds;
      const names=[['REGISTER','registro'],['PROTOCOL_READ','protocolo'],['GET_NEXT','allocator'],['BLOCK_READ','lectura'],['LOCAL_WORK','trabajo local'],['RETURN_PUBLISH','publicación'],['RETURN_VERIFY','verificación'],['IDLE','espera / huecos']];
      host.innerHTML='<div class="w6-run"><div><h2>DÓNDE SE FUE EL TIEMPO</h2><small>'+(audited?'AUDITED · reloj servidor':'LIVE · timestamps worker')+'</small></div></div>'+data.map((x,i)=>{
        const buckets=x.buckets_ms||x.buckets||{},total=x.durable_span_ms||x.total||1,baseW=i===0?baseline.worker_001:baseline.worker_002;
        const segs=names.map(([k])=>'<i style="width:'+((buckets[k]||0)/total*100).toFixed(2)+'%"></i>').join('');
        const leg=names.map(([k,l])=>'<div><span>'+l+'</span><b>'+dur(buckets[k]||0)+' · '+Math.round((buckets[k]||0)/total*100)+'%</b></div>').join('');
        return '<section class="w6-detail"><div class="w6-detailhead"><span>W'+esc(slotOf(ws[i],i))+'</span><span>'+dur(total)+'</span></div><div class="w6-timebar">'+segs+'</div><div class="w6-legend">'+leg+'</div><div class="w6-note">EXP-003 baseline: '+dur(baseW.durable_span_ms)+' · cambio actual '+(total&&baseW.durable_span_ms?Math.round((total-baseW.durable_span_ms)/baseW.durable_span_ms*100):0)+'%</div></section>';
      }).join('')+'<div class="w6-note">La auditoría final usa timestamps de commits GitHub para que la duración no dependa de lo que el worker declare.</div>';
    }else if(page===2){
      const ev=ws.flatMap((w,i)=>(w.events||[]).map(e=>({worker:slotOf(w,i),...e}))).sort((x,y)=>String(x.worker_at||'').localeCompare(String(y.worker_at||'')));
      host.innerHTML='<div class="w6-run"><div><h2>TIMELINE ABSOLUTO</h2><small>'+ev.length+' eventos durables declarados</small></div></div>'+ev.map(e=>'<div class="w6-event"><span>'+clock(e.worker_at)+'</span><span>W'+esc(e.worker)+'</span><span>'+esc(e.phase)+'</span><span>'+esc(e.operation)+' · '+esc(e.status||e.target||'')+'</span></div>').join('');
    }else{
      const rows=ws.flatMap((w,i)=>(w.completed||[]).map(x=>({worker:slotOf(w,i),branch:cr.state_branches[i],...x}))).sort((x,y)=>String(x.ticket||x.ticket_id).localeCompare(String(y.ticket||y.ticket_id)));
      host.innerHTML='<div class="w6-run"><div><h2>RETURNS</h2><small>'+rows.length+'/10 durables</small></div></div>'+rows.map(r=>'<details class="w6-return" data-path="'+esc(r.return_path||('ui-workspace-v1/experiments/allocator-v4/returns/'+r.return))+'" data-branch="'+esc(r.branch)+'"><summary>TICKET '+esc(r.ticket||r.ticket_id)+' · W'+esc(r.worker)+'</summary><div class="w6-answer">tocá para cargar respuesta</div></details>').join('');
      host.querySelectorAll('details[data-path]').forEach(d=>d.addEventListener('toggle',async()=>{if(!d.open)return;const p=d.dataset.path,branch=d.dataset.branch,box=d.querySelector('.w6-answer');if(mem.returns[p]){box.textContent=mem.returns[p];return}box.textContent='cargando…';try{const txt=await fetch(rawBranch(branch,p),{cache:'no-store'}).then(r=>r.text());mem.returns[p]=txt;box.textContent=txt}catch(e){box.textContent='ERROR '+e.message}}));
    }
   }catch(e){host.innerHTML='<div class="w6-error">telemetría no disponible: '+esc(e.message)+'</div>'}
  }
  refresh();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?refresh():clearInterval(mem.timer),2000);
 }
});