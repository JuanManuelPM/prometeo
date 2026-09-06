/* Habit momentum v10. Uses the existing logs as the only source of truth. */
(()=>{
  if(typeof TRACE_TRACKERS==='undefined'||typeof traceDateAt!=='function')return;

  const scoreByKind={
    avoid:{clear:4,crave:1.25,lapse:-9,unknown:0},
    food:{good:4,bad:-7,unknown:0},
    positive:{done:5,missed:-5,unknown:0}
  };
  TRACE_TRACKERS.forEach(t=>{t.scoring={...(scoreByKind[t.kind]||{}),...(t.scoring||{})};
    /* Override earlier tiny deltas so movement is actually legible. */
    if(t.kind==='avoid')t.scoring={clear:4,crave:1.25,lapse:-9,unknown:0};
    if(t.kind==='food')t.scoring={good:4,bad:-7,unknown:0};
    if(t.kind==='positive')t.scoring={done:5,missed:-5,unknown:0};
  });

  const W=1400,H=300,TOP=20,BOTTOM=20;
  const x=i=>(i+.5)/TRACE_COUNT*W;
  const y=score=>TOP+(100-score)/100*(H-TOP-BOTTOM);
  const delta=(t,status)=>Number(t.scoring?.[status]??0);

  function seriesFor(t){
    const start=fromISO(traceDateAt(0));
    const end=fromISO(traceDateAt(TRACE_COUNT-1));
    let score=50;

    /* Small amount of prior memory so moving the 14-day window does not reset the line. */
    for(let back=28;back>=1;back--){
      const d=addDays(start,-back);
      const weight=.12+(28-back)/28*.18;
      score+=delta(t,traceStatus(t.id,iso(d)))*weight;
    }
    score=clamp(score,25,75);

    const out=[];
    for(let i=0;i<TRACE_COUNT;i++){
      const d=addDays(start,i);
      score=clamp(score+delta(t,traceStatus(t.id,iso(d))),5,95);
      out.push(score);
    }
    return out;
  }

  function path(series){
    return series.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  }
  const dash=['','18 10','3 7','24 8 4 8','10 5','2 6'];

  renderMomentum=function(){
    const svg=document.getElementById('momentumChart');
    const focus=document.getElementById('momentumFocus');
    const meta=document.getElementById('momentumMeta');
    if(!svg)return;

    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio','none');
    const selected=momentumSelectedId?traceTracker(momentumSelectedId):null;
    if(selected){
      const s=seriesFor(selected),change=s[s.length-1]-s[0];
      focus.textContent=selected.label;
      meta.textContent=`${change>0?'+':''}${change.toFixed(1).replace('.',',')} pts · ${TRACE_COUNT} días`;
    }else{
      focus.textContent='Todas';
      meta.textContent='trayectoria · mismos 14 días';
    }

    let html='';
    for(let i=0;i<TRACE_COUNT;i++){
      html+=`<line class="momentum-guide${i===TRACE_COUNT-1&&traceOffset===0?' today':''}" x1="${x(i)}" y1="0" x2="${x(i)}" y2="${H}"/>`;
    }
    html+=`<line class="momentum-mid" x1="0" y1="${y(50)}" x2="${W}" y2="${y(50)}"/>`;

    TRACE_TRACKERS.forEach((t,index)=>{
      const s=seriesFor(t),d=path(s),active=momentumSelectedId===t.id,dim=!!momentumSelectedId&&!active;
      if(active){
        const base=y(50);
        html+=`<path class="momentum-area" d="${d} L${x(TRACE_COUNT-1)},${base} L${x(0)},${base} Z"/>`;
      }
      html+=`<path class="momentum-line${active?' active':''}${dim?' dim':''}" data-tracker="${t.id}" d="${d}" style="stroke-dasharray:${dash[index]||''}"/>`;
      s.forEach((v,i)=>{
        html+=`<circle class="momentum-point${active?' active':''}${dim?' dim':''}" data-tracker="${t.id}" cx="${x(i)}" cy="${y(v)}" r="${active?5:2.7}"/>`;
      });
    });

    svg.innerHTML=html;
    svg.querySelectorAll('[data-tracker]').forEach(el=>el.addEventListener('click',()=>{
      const id=el.dataset.tracker;
      momentumSelectedId=momentumSelectedId===id?null:id;
      renderTraceRows();
      renderMomentum();
    }));
  };

  renderMomentum();
})();
