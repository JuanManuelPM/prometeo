Prometeo.registerWidget({
 id:'workers',name:'WORKERS',version:9,widgetApi:1,defaultHeight:650,
 pages:[{title:'WORKERS'},{title:'TIEMPO'},{title:'TIMELINE'},{title:'RETURNS'}],
 css:`
 [data-widget="workers"] .widget-content{display:block!important;place-items:initial!important;padding:12px!important;text-align:left!important;color:#18322f!important;background:#efede7!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
 .wd{--ink:#173b37;--accent:#5d9f95;--paper:#f7f5f0;--soft:#e4e5df;--muted:#7b817d;width:100%;height:100%;overflow:auto;color:var(--ink)}
 .wd-top{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;margin-bottom:12px}.wd-kicker{font-size:10px;letter-spacing:.22em;font-weight:800;color:var(--muted)}.wd-title{font-size:25px;line-height:1;font-weight:750;margin-top:4px}.wd-run{font-size:11px;color:var(--muted);text-align:right}.wd-run b{display:block;color:var(--ink);font-size:18px}
 .wd-summary{display:grid;grid-template-columns:1.35fr 1fr;gap:12px;margin-bottom:12px}
 .wd-card{background:var(--paper);border:1px solid rgba(23,59,55,.14);border-radius:22px;padding:17px;box-shadow:0 8px 18px rgba(23,59,55,.06)}
 .wd-cardhead{display:flex;justify-content:space-between;gap:10px;align-items:center}.wd-label{font-size:10px;letter-spacing:.16em;font-weight:800;color:var(--muted)}.wd-badge{font-size:10px;border:1px solid rgba(23,59,55,.25);padding:4px 8px;border-radius:999px;font-weight:800}
 .wd-big{font-size:46px;line-height:.9;font-weight:750;margin-top:14px;letter-spacing:-.04em}.wd-big small{font-size:16px;color:var(--muted);letter-spacing:0}.wd-sub{font-size:11px;color:var(--muted);margin-top:8px}
 .wd-bars{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;align-items:end;height:76px;margin-top:16px}.wd-bars i{display:block;border-radius:999px;background:#d8d9d3;min-height:14px}.wd-bars i.done{background:var(--accent)}.wd-bars i.current{background:var(--ink)}
 .wd-system{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start}.wd-system .wd-big{font-size:40px}.wd-gauge{width:74px;height:74px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--accent) var(--p),#ddd 0)}.wd-gauge:after{content:"";width:55px;height:55px;border-radius:50%;background:var(--paper);position:absolute}.wd-gauge{position:relative}.wd-gauge b{position:relative;z-index:1;font-size:13px}
 .wd-sysgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:14px}.wd-mini{text-align:center;border-top:1px solid rgba(23,59,55,.14);padding-top:9px}.wd-mini b{display:block;font-size:17px}.wd-mini span{font-size:9px;color:var(--muted)}
 .wd-workers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 .wd-worker{background:var(--paper);border:1px solid rgba(23,59,55,.14);border-radius:22px;padding:16px;min-width:0;box-shadow:0 8px 18px rgba(23,59,55,.05)}
 .wd-workerhead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.wd-wid{font-size:22px;font-weight:750}.wd-state{width:10px;height:10px;border-radius:50%;background:#c7c7c1;box-shadow:0 0 0 5px rgba(199,199,193,.24)}.wd-state.live{background:var(--accent);box-shadow:0 0 0 5px rgba(93,159,149,.18)}.wd-state.stale{background:#b89a60;box-shadow:0 0 0 5px rgba(184,154,96,.16)}
 .wd-phase{font-size:12px;color:var(--muted);margin-top:3px;min-height:16px}.wd-workerbody{display:grid;grid-template-columns:92px 1fr;gap:14px;align-items:center;margin-top:15px}
 .wd-ring{width:88px;height:88px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--accent) var(--p),#ddd 0);position:relative}.wd-ring:after{content:"";position:absolute;width:66px;height:66px;border-radius:50%;background:var(--paper)}.wd-ring b{position:relative;z-index:1;font-size:20px}.wd-ring span{position:absolute;z-index:1;margin-top:31px;font-size:9px;color:var(--muted)}
 .wd-lines{display:grid;gap:7px}.wd-line{display:flex;justify-content:space-between;gap:8px;font-size:11px;padding-bottom:5px;border-bottom:1px solid rgba(23,59,55,.11)}.wd-line span{color:var(--muted)}.wd-line b{font-weight:700;text-align:right}
 .wd-tickets{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin-top:13px}.wd-ticket{height:9px;border-radius:99px;background:#deded8}.wd-ticket.done{background:var(--accent)}.wd-ticket.current{background:var(--ink)}
 .wd-foot{font-size:10px;color:var(--muted);margin-top:10px}
 .wd-timecard{background:var(--paper);border:1px solid rgba(23,59,55,.14);border-radius:22px;padding:16px;margin-bottom:12px}.wd-timehead{display:flex;justify-content:space-between;align-items:center}.wd-timehead b{font-size:22px}.wd-stack{display:flex;height:24px;border-radius:999px;overflow:hidden;background:#ddd;margin:13px 0}.wd-stack i{height:100%;min-width:1px}.wd-stack i:nth-child(1){background:#173b37}.wd-stack i:nth-child(2){background:#46736d}.wd-stack i:nth-child(3){background:#5d9f95}.wd-stack i:nth-child(4){background:#83b6ae}.wd-stack i:nth-child(5){background:#a8cbc5}.wd-stack i:nth-child(6){background:#c5d8d4}.wd-stack i:nth-child(7){background:#d9dedb}.wd-stack i:nth-child(8){background:#ebece8}
 .wd-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 16px;font-size:11px}.wd-legend div{display:flex;justify-content:space-between;gap:8px}.wd-legend span{color:var(--muted)}
 .wd-event{display:grid;grid-template-columns:95px 48px 82px 1fr;gap:7px;padding:8px 0;border-bottom:1px solid rgba(23,59,55,.12);font-size:11px}.wd-return{background:var(--paper);border-radius:16px;padding:11px 13px;margin-bottom:8px;border:1px solid rgba(23,59,55,.12)}.wd-return summary{cursor:pointer;font-weight:750}.wd-answer{white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:11px;line-height:1.45;padding-top:9px}
 @container (max-width:620px){.wd-title{font-size:22px}.wd-summary{grid-template-columns:1fr}.wd-workers{grid-template-columns:1fr}.wd-big{font-size:42px}.wd-workerbody{grid-template-columns:84px 1fr}.wd-ring{width:80px;height:80px}.wd-ring:after{width:60px;height:60px}.wd-event{grid-template-columns:80px 42px 1fr}.wd-event span:nth-child(3){display:none}.wd-legend{grid-template-columns:1fr}}
 `,
 render(){return '<div class="wd" data-wd><div class="wd-card">cargando…</div></div>';},
 afterRender({root,widgetState}){
  const host=root?.querySelector('[data-wd]');if(!host)return;
  const mem=window.__wd8||(window.__wd8={timer:null,returns:{}});
  const repo='https://raw.githubusercontent.com/JuanManuelPM/prometeo/',control='exp006-control';
  const raw=(branch,p)=>repo+branch+'/'+(String(p).startsWith('ui-workspace-v1/')?String(p):'ui-workspace-v1/'+String(p));
  const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clock=v=>v?new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  const age=v=>v?Math.max(0,Date.now()-Date.parse(v)):Infinity;
  const dur=ms=>!Number.isFinite(ms)?'—':ms<60000?Math.round(ms/1000)+' s':(ms/60000).toFixed(1)+' min';
  const slot=(w,i)=>w.worker_slot||String(i+1).padStart(3,'0');
  const lastTime=w=>w.last_checkpoint_at||w.last_event_worker_at||w.first_public_ping_at||w.registered_at||w.registered_worker_at||null;
  const completed=w=>(w.counters?.completed??w.counters?.blocks_completed??w.counters?.returns_created??0);
  const tickets=w=>(w.counters?.tickets??w.counters?.tickets_received??0);
  const calls=w=>w.counters?.external_work_calls||0;
  const tele=w=>w.counters?.telemetry_writes||0;
  const conflicts=w=>w.counters?.revision_conflicts||0;
  const errors=w=>w.counters?.errors??w.counters?.critical_errors??0;
  const currentTicket=w=>w.current?.ticket||w.current?.ticket_id||null;
  const currentBlock=w=>w.current?.block||w.current?.block_id||null;
  const checkpoint=w=>w.checkpoint||w.current?.checkpoint||w.status||'WAITING';
  const liveClass=w=>{const a=age(lastTime(w));return a<90000?'live':a<240000?'':'stale'};
  function timeParts(w){
    const cps=(w.checkpoints||[]).filter(x=>x.worker_at||x.at);
    if(!cps.length)return {total:Math.max(1,age(w.registered_at||w.registered_worker_at||w.first_public_ping_at)),parts:[0,0,0,0,0,0,0,1]};
    const vals={REGISTER:0,GET_NEXT:0,BLOCK_READ:0,LOCAL_WORK:0,RETURN_PUBLISH:0,RETURN_VERIFY:0,TELEMETRY:0,IDLE:0};
    for(let i=0;i<cps.length-1;i++){const a=cps[i],b=cps[i+1],d=Date.parse(b.worker_at||b.at)-Date.parse(a.worker_at||a.at);const k=a.operation||a.checkpoint||'IDLE';if(vals[k]!==undefined&&d>0)vals[k]+=d;else vals.IDLE+=Math.max(0,d)}
    const total=Math.max(1,Object.values(vals).reduce((a,n)=>a+n,0));return {total,parts:Object.values(vals)};
  }
  function workerCard(w,i){
    const c=completed(w),pct=Math.min(100,c*10),cur=String(currentTicket(w)||'').padStart(3,'0');
    const done=(w.completed||[]).map(x=>String(x.ticket||x.ticket_id||'').padStart(3,'0'));
    const ticks=Array.from({length:10},(_,j)=>{const n=String(j+1).padStart(3,'0');return '<i class="wd-ticket '+(done.includes(n)?'done':cur===n?'current':'')+'"></i>'}).join('');
    return '<section class="wd-worker"><div class="wd-workerhead"><div><div class="wd-wid">WORKER '+esc(slot(w,i))+'</div><div class="wd-phase">'+esc(checkpoint(w))+(currentBlock(w)?' · '+esc(currentBlock(w)):'')+'</div></div><span class="wd-state '+liveClass(w)+'"></span></div><div class="wd-workerbody"><div class="wd-ring" style="--p:'+pct+'%"><b>'+c+'/10</b><span>bloques</span></div><div class="wd-lines"><div class="wd-line"><span>primer ping</span><b>'+clock(w.first_public_ping_at||w.first_public_ping_worker_at)+'</b></div><div class="wd-line"><span>última señal</span><b>'+clock(lastTime(w))+'</b></div><div class="wd-line"><span>calls</span><b>'+calls(w)+'</b></div><div class="wd-line"><span>conflicts</span><b>'+conflicts(w)+'</b></div></div></div><div class="wd-tickets">'+ticks+'</div><div class="wd-foot">'+tickets(w)+' tickets · '+tele(w)+' telemetry writes · '+errors(w)+' errores</div></section>';
  }
  async function refresh(){
    try{
      const cr=await fetch(raw(control,'ui-workspace-v1/experiments/CURRENT_RUN.json')+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json());
      const ws=await Promise.all(cr.state_paths.map((p,i)=>fetch(raw(cr.state_branches[i],p)+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json())));
      const page=widgetState.page||0,total=ws.reduce((n,w)=>n+completed(w),0),registered=ws.filter(w=>w.worker_id).length,totalCalls=ws.reduce((n,w)=>n+calls(w),0),totalConf=ws.reduce((n,w)=>n+conflicts(w),0);
      if(page===0){
        const bars=Array.from({length:10},(_,j)=>'<i class="'+(j<total?'done':'')+'" style="height:'+(22+(j%5)*11)+'px"></i>').join('');
        host.innerHTML='<div class="wd-top"><div><div class="wd-kicker">LIVE WORKFORCE</div><div class="wd-title">'+esc(cr.experiment_id)+' · '+esc(cr.title)+'</div></div><div class="wd-run"><b>'+total+'/10</b>bloques completos</div></div>'+
        '<div class="wd-summary"><section class="wd-card"><div class="wd-cardhead"><span class="wd-label">ACTIVITY</span><span class="wd-badge">10 BLOCKS</span></div><div class="wd-big">'+total+'<small> / 10</small></div><div class="wd-sub">progreso material del run</div><div class="wd-bars">'+bars+'</div></section>'+
        '<section class="wd-card"><div class="wd-system"><div><span class="wd-label">SYSTEM</span><div class="wd-big">'+registered+'<small> / 2</small></div><div class="wd-sub">workers registrados</div></div><div class="wd-gauge" style="--p:'+(registered*50)+'%"><b>'+registered*50+'%</b></div></div><div class="wd-sysgrid"><div class="wd-mini"><b>'+totalCalls+'</b><span>CALLS</span></div><div class="wd-mini"><b>'+totalConf+'</b><span>CONFLICTS</span></div><div class="wd-mini"><b>'+ws.reduce((n,w)=>n+errors(w),0)+'</b><span>ERRORES</span></div></div></section></div>'+
        '<div class="wd-workers">'+ws.map(workerCard).join('')+'</div>';
      } else if(page===1){
        host.innerHTML='<div class="wd-top"><div><div class="wd-kicker">TIME PROFILE</div><div class="wd-title">Dónde se fue el tiempo</div></div></div>'+ws.map((w,i)=>{const t=timeParts(w),labels=['registro','allocator','lectura','trabajo local','publicar','verificar','telemetría','espera'];return '<section class="wd-timecard"><div class="wd-timehead"><b>W'+slot(w,i)+'</b><span>'+dur(t.total)+'</span></div><div class="wd-stack">'+t.parts.map((v,j)=>'<i style="width:'+((v/t.total)*100).toFixed(2)+'%"></i>').join('')+'</div><div class="wd-legend">'+labels.map((l,j)=>'<div><span>'+l+'</span><b>'+dur(t.parts[j])+'</b></div>').join('')+'</div></section>'}).join('');
      } else if(page===2){
        const rows=ws.flatMap((w,i)=>(w.checkpoints||[]).map(x=>({worker:slot(w,i),...x}))).sort((a,b)=>String(a.worker_at||a.at||'').localeCompare(String(b.worker_at||b.at||'')));
        host.innerHTML='<div class="wd-top"><div><div class="wd-kicker">TIMELINE</div><div class="wd-title">Eventos durables</div></div><div class="wd-run"><b>'+rows.length+'</b>eventos</div></div>'+rows.map(x=>'<div class="wd-event"><span>'+clock(x.worker_at||x.at)+'</span><span>W'+esc(x.worker)+'</span><span>'+esc(x.checkpoint||x.phase||'')+'</span><span>'+esc(x.operation||x.status||'')+'</span></div>').join('');
      } else {
        const rows=ws.flatMap((w,i)=>(w.completed||[]).map(x=>({worker:slot(w,i),branch:cr.state_branches[i],...x}))).sort((a,b)=>String(a.ticket||a.ticket_id).localeCompare(String(b.ticket||b.ticket_id)));
        host.innerHTML='<div class="wd-top"><div><div class="wd-kicker">OUTPUT</div><div class="wd-title">Returns</div></div><div class="wd-run"><b>'+rows.length+'</b>durables</div></div>'+rows.map(r=>'<details class="wd-return" data-branch="'+esc(r.branch)+'" data-path="'+esc(r.return_path||('ui-workspace-v1/experiments/allocator-v4/returns/'+r.return))+'"><summary>TICKET '+esc(r.ticket||r.ticket_id)+' · W'+esc(r.worker)+'</summary><div class="wd-answer">tocá para cargar</div></details>').join('');
        host.querySelectorAll('details[data-path]').forEach(d=>d.addEventListener('toggle',async()=>{if(!d.open)return;const box=d.querySelector('.wd-answer'),key=d.dataset.branch+'|'+d.dataset.path;if(mem.returns[key]){box.textContent=mem.returns[key];return}box.textContent='cargando…';try{const txt=await fetch(raw(d.dataset.branch,d.dataset.path),{cache:'no-store'}).then(r=>r.text());mem.returns[key]=txt;box.textContent=txt}catch(e){box.textContent='ERROR '+e.message}}));
      }
    }catch(e){host.innerHTML='<div class="wd-card"><b>Telemetría no disponible</b><div class="wd-sub">'+esc(e.message)+'</div></div>'}
  }
  refresh();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?refresh():clearInterval(mem.timer),2500);
 }
});