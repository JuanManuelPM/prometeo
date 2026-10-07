Prometeo.registerWidget({
 id:'experiments',name:'EXPERIMENTOS',version:8,widgetApi:1,defaultHeight:470,
 pages:[{title:'ACTUAL'},{title:'COMPARAR'},{title:'HISTORIAL'}],
 css:`
 [data-widget="experiments"] .widget-content{display:block!important;place-items:initial!important;padding:12px!important;text-align:left!important;color:#18322f!important;background:#efede7!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
 .ed{--ink:#173b37;--accent:#5d9f95;--paper:#f7f5f0;--muted:#7b817d;width:100%;height:100%;overflow:auto;color:var(--ink)}
 .ed-head{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:12px}.ed-k{font-size:10px;letter-spacing:.22em;color:var(--muted);font-weight:800}.ed-title{font-size:26px;font-weight:760;line-height:1;margin-top:4px}.ed-chip{font-size:10px;border:1px solid rgba(23,59,55,.2);border-radius:999px;padding:5px 9px;font-weight:800}
 .ed-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}.ed-card{background:var(--paper);border:1px solid rgba(23,59,55,.14);border-radius:22px;padding:17px;box-shadow:0 8px 18px rgba(23,59,55,.05)}
 .ed-num{font-size:54px;line-height:.9;font-weight:760;letter-spacing:-.05em}.ed-num small{font-size:17px;color:var(--muted)}.ed-label{font-size:10px;letter-spacing:.16em;font-weight:800;color:var(--muted);margin-bottom:14px}
 .ed-progress{height:16px;border-radius:999px;background:#ddd;overflow:hidden;margin:15px 0 7px}.ed-progress i{display:block;height:100%;background:var(--accent)}.ed-sub{font-size:11px;color:var(--muted)}
 .ed-minirow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px}.ed-mini{text-align:center;border-top:1px solid rgba(23,59,55,.13);padding-top:8px}.ed-mini b{display:block;font-size:20px}.ed-mini span{font-size:9px;color:var(--muted)}
 .ed-workers{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.ed-w{border:1px solid rgba(23,59,55,.13);border-radius:14px;padding:10px}.ed-w b{font-size:14px}.ed-w span{display:block;font-size:10px;color:var(--muted);margin-top:4px}
 .ed-history{background:var(--paper);border-radius:18px;padding:12px 14px;border:1px solid rgba(23,59,55,.13);margin-bottom:8px;display:grid;grid-template-columns:75px 1fr auto;gap:10px;font-size:11px}.ed-history b{font-size:12px}.ed-note{font-size:11px;color:var(--muted);line-height:1.45;margin-top:10px}
 @container (max-width:520px){.ed-grid{grid-template-columns:1fr}.ed-title{font-size:23px}.ed-num{font-size:48px}.ed-workers{grid-template-columns:1fr}}
 `,
 render(){return '<div class="ed" data-ed><div class="ed-card">cargando…</div></div>';},
 afterRender({root,widgetState}){
   const host=root?.querySelector('[data-ed]');if(!host)return;
   const mem=window.__ed8||(window.__ed8={timer:null});
   const repo='https://raw.githubusercontent.com/JuanManuelPM/prometeo/',control='exp005-control';
   const raw=(branch,p)=>repo+branch+'/'+(String(p).startsWith('ui-workspace-v1/')?String(p):'ui-workspace-v1/'+String(p));
   const esc=s=>String(s??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
   async function refresh(){
     try{
       const cr=await fetch(raw(control,'ui-workspace-v1/experiments/CURRENT_RUN.json')+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json());
       const ws=await Promise.all(cr.state_paths.map((p,i)=>fetch(raw(cr.state_branches[i],p)+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.json())));
       const done=ws.reduce((n,w)=>n+(w.counters?.completed??w.counters?.blocks_completed??w.counters?.returns_created??0),0),registered=ws.filter(w=>w.worker_id).length,conf=ws.reduce((n,w)=>n+(w.counters?.revision_conflicts||0),0),calls=ws.reduce((n,w)=>n+(w.counters?.external_work_calls||0),0),errs=ws.reduce((n,w)=>n+(w.counters?.errors??w.counters?.critical_errors??0),0);
       const status=done===10?'DONE':registered?'RUNNING':'READY',page=widgetState.page||0;
       if(page===0){
         host.innerHTML='<div class="ed-head"><div><div class="ed-k">CURRENT EXPERIMENT</div><div class="ed-title">'+esc(cr.experiment_id)+' · '+esc(cr.title)+'</div></div><span class="ed-chip">'+status+'</span></div><div class="ed-grid">'+
         '<section class="ed-card"><div class="ed-label">PROGRESS</div><div class="ed-num">'+done+'<small> / 10</small></div><div class="ed-progress"><i style="width:'+done*10+'%"></i></div><div class="ed-sub">bloques con RETURN durable</div><div class="ed-workers">'+ws.map((w,i)=>'<div class="ed-w"><b>WORKER '+(w.worker_slot||String(i+1).padStart(3,'0'))+'</b><span>'+esc(w.checkpoint||w.status||'WAITING')+' · '+(w.counters?.returns_created??w.counters?.completed??0)+' returns</span></div>').join('')+'</div></section>'+
         '<section class="ed-card"><div class="ed-label">SYSTEM</div><div class="ed-num">'+registered+'<small> / 2</small></div><div class="ed-sub">workers registrados</div><div class="ed-minirow"><div class="ed-mini"><b>'+calls+'</b><span>CALLS</span></div><div class="ed-mini"><b>'+conf+'</b><span>CONFLICTS</span></div><div class="ed-mini"><b>'+errs+'</b><span>ERRORES</span></div></div><div class="ed-note">branches aisladas · telemetría no bloqueante</div></section></div>';
       } else if(page===1){
         host.innerHTML='<div class="ed-head"><div><div class="ed-k">BENCHMARK</div><div class="ed-title">Comparación</div></div></div><div class="ed-grid"><section class="ed-card"><div class="ed-label">EXP-004</div><div class="ed-num">FAIL</div><div class="ed-note">telemetría podía matar trabajo; W002 murió después de tomar ticket 003.</div></section><section class="ed-card"><div class="ed-label">EXP-005</div><div class="ed-num">'+done+'<small>/10</small></div><div class="ed-note">branch por worker; telemetry best-effort. Resultado material todavía en curso o detenido antes de GET_NEXT.</div></section></div>';
       } else {
         host.innerHTML='<div class="ed-head"><div><div class="ed-k">HISTORY</div><div class="ed-title">Experimentos</div></div></div><div class="ed-history"><b>EXP-003</b><span>allocator 2W/10B</span><span>PASS</span></div><div class="ed-history"><b>EXP-004</b><span>telemetry estricta</span><span>FAIL</span></div><div class="ed-history"><b>EXP-005</b><span>branch isolation</span><span>'+status+'</span></div>';
       }
     }catch(e){host.innerHTML='<div class="ed-card"><b>Error</b><div class="ed-note">'+esc(e.message)+'</div></div>'}
   }
   refresh();clearInterval(mem.timer);mem.timer=setInterval(()=>document.body.contains(host)?refresh():clearInterval(mem.timer),2500);
 }
});