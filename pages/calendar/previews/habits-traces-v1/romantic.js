(()=>{
  const frame=document.getElementById('romanticCalendarFrame');
  if(!frame)return;
  let resizeObserver=null,mutationObserver=null,fitRAF=0;

  function syncTheme(){
    try{
      const doc=frame.contentDocument;if(!doc)return;
      const css=getComputedStyle(document.documentElement);
      const a=css.getPropertyValue('--a').trim(),b=css.getPropertyValue('--b').trim();
      doc.documentElement.style.setProperty('--a',a);doc.documentElement.style.setProperty('--b',b);
      doc.body.style.setProperty('--a',a);doc.body.style.setProperty('--b',b);
    }catch{}
  }

  function fit(){
    cancelAnimationFrame(fitRAF);
    fitRAF=requestAnimationFrame(()=>{
      try{
        const doc=frame.contentDocument;if(!doc)return;
        const h=Math.max(360,doc.documentElement.scrollHeight||0,doc.body?.scrollHeight||0);
        frame.style.height=(h+4)+'px';
      }catch{}
    });
  }

  /* Compatibility only: if an older cached time-compression script emitted 8 buttons,
     collapse them into the canonical one-piece passive band. */
  function normalizeLegacyBreaks(){
    try{
      const doc=frame.contentDocument,grid=doc?.getElementById('grid');if(!grid)return;
      const cells=Array.from(grid.children);
      for(let i=0;i<cells.length;){
        if(!cells[i].classList?.contains('time-break-cell')){i++;continue;}
        const run=[];let j=i;
        while(j<cells.length&&cells[j].classList?.contains('time-break-cell')&&run.length<8){run.push(cells[j]);j++;}
        if(run.length){
          const band=doc.createElement('div');
          band.className='cell time-break-band';
          band.setAttribute('role','separator');
          band.setAttribute('aria-label','Tiempo libre comprimido');
          band.textContent='TIEMPO LIBRE';
          run[0].replaceWith(band);
          run.slice(1).forEach(x=>x.remove());
          i=j;
        }else i++;
      }
    }catch{}
  }

  function patchSundayWeek(){
    try{
      const win=frame.contentWindow;if(!win)return;
      win.eval(`
        (()=>{
          const shortNames=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
          const longNames=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
          const cleanHeaders=()=>{
            document.querySelectorAll('#grid .cell.head:not(.corner)').forEach((head,i)=>{
              const name=head.querySelector('.day-name');
              if(name)name.textContent=shortNames[i]||name.textContent;
              head.querySelectorAll('.day-pending').forEach(x=>x.remove());
            });
            document.querySelectorAll('#mobileWeek .mobile-day-name').forEach((name,i)=>{
              name.textContent=longNames[i]||name.textContent;
            });
          };

          const stampEvent=(node,item,kind)=>{
            if(!node||!item)return node;
            const start=Number(item.start),duration=Number(item.duration);
            if(Number.isFinite(start))node.dataset.eventStart=String(start);
            if(Number.isFinite(start)&&Number.isFinite(duration))node.dataset.eventEnd=String(start+duration*60);
            node.dataset.eventKind=kind;
            return node;
          };

          const polishEventGeometry=()=>{
            const slots=Array.from(document.querySelectorAll('#grid .slot'));
            const byDay=Array.from({length:7},()=>[]);
            slots.forEach((slot,index)=>{
              const el=slot.querySelector(':scope > .event[data-event-start][data-event-end]');
              if(!el)return;
              const start=Number(el.dataset.eventStart),end=Number(el.dataset.eventEnd);
              if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return;
              byDay[index%7].push({el,start,end});
            });

            byDay.forEach(events=>{
              events.sort((a,b)=>a.start-b.start||a.end-b.end);
              const clusters=[];
              let cluster=[],clusterEnd=-Infinity;
              events.forEach(ev=>{
                if(!cluster.length||ev.start<clusterEnd){
                  cluster.push(ev);clusterEnd=Math.max(clusterEnd,ev.end);
                }else{
                  clusters.push(cluster);cluster=[ev];clusterEnd=ev.end;
                }
              });
              if(cluster.length)clusters.push(cluster);

              clusters.forEach(group=>{
                const laneEnds=[];
                group.forEach(ev=>{
                  let lane=laneEnds.findIndex(end=>end<=ev.start);
                  if(lane<0){lane=laneEnds.length;laneEnds.push(ev.end)}
                  else laneEnds[lane]=ev.end;
                  ev.lane=lane;
                });
                const lanes=Math.max(1,laneEnds.length);
                group.forEach(ev=>{
                  ev.el.classList.toggle('event-collision',lanes>1);
                  ev.el.style.removeProperty('left');
                  ev.el.style.removeProperty('right');
                  if(lanes>1){
                    const left=ev.lane/lanes*100;
                    const right=(lanes-ev.lane-1)/lanes*100;
                    ev.el.style.setProperty('left',`calc(${left}% + 3px)`,'important');
                    ev.el.style.setProperty('right',`calc(${right}% + 3px)`,'important');
                  }
                });
              });
            });
          };

          if(!window.__PROMETEO_EVENT_GEOMETRY_PATCHED__){
            window.__PROMETEO_EVENT_GEOMETRY_PATCHED__=true;
            const baseUniversityNode=universityNode;
            const baseClassNode=classNode;
            const basePersonalNode=personalNode;
            const basePotentialNode=potentialNode;
            const baseBocaNode=bocaNode;
            universityNode=item=>stampEvent(baseUniversityNode(item),item,'university');
            classNode=item=>stampEvent(baseClassNode(item),item,'class');
            personalNode=item=>stampEvent(basePersonalNode(item),item,'personal');
            potentialNode=item=>stampEvent(basePotentialNode(item),item,'potential');
            bocaNode=item=>stampEvent(baseBocaNode(item),item,'boca');
          }

          if(!window.__PROMETEO_SUNDAY_WEEK_PATCHED__){
            window.__PROMETEO_SUNDAY_WEEK_PATCHED__=true;
            const baseRender=render;
            render=function(){baseRender();cleanHeaders();polishEventGeometry();};
            todayWeek.onclick=()=>{weekStart=addDays(currentMonday(),-1);render();};
          }
          weekStart=addDays(currentMonday(),-1);
          render();cleanHeaders();polishEventGeometry();
        })();
      `);
    }catch(error){console.warn('[Prometeo romantic calendar] Sunday/event patch unavailable',error);}
  }

  function watchSize(){
    try{
      const doc=frame.contentDocument;if(!doc)return;
      resizeObserver?.disconnect();mutationObserver?.disconnect();
      if('ResizeObserver' in window){
        resizeObserver=new ResizeObserver(()=>fit());
        resizeObserver.observe(doc.documentElement);
        if(doc.body)resizeObserver.observe(doc.body);
      }
      mutationObserver=new MutationObserver(()=>{normalizeLegacyBreaks();fit();});
      if(doc.body)mutationObserver.observe(doc.body,{subtree:true,childList:true,attributes:false});
    }catch{}
  }

  window.fitRomanticCalendar=fit;

  frame.addEventListener('load',()=>{
    try{
      const doc=frame.contentDocument;if(!doc)return;
      frame.setAttribute('scrolling','no');
      const style=doc.createElement('style');
      style.textContent=`
        html,body{margin:0!important;overflow:visible!important}
        .wrap{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
        header,.legend,.mobile-swipe-hint,.life-desktop,.later,.finance,
        .prometeo-global-shell,.p-global-shell,.global-shell,.workspace-nav,.workspace-primary,
        .workspace-secondary,.workspace-caption,.habit-quickbar,.month-view,.mobile-view-switch{display:none!important}
        .day-pending{display:none!important}
        .week-nav{position:static!important;top:auto!important;margin:0!important;padding:3px 0 6px!important}
        .calendar{width:100%!important;margin:0!important}
        .cell.slot{cursor:pointer;overflow:visible!important}
        .cell.slot:focus-visible{outline:2px solid var(--b)!important;outline-offset:-2px}
        .cell.slot:has(>.event){background-image:none!important}
        .cell.slot:has(>.event):hover{background-image:none!important}
        .time-break-cell{pointer-events:none!important;cursor:default!important;border:0!important;background:var(--b)!important;color:var(--a)!important;box-shadow:none!important}
        .time-break-band{grid-column:1/-1!important;min-height:17px!important;height:17px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:var(--b)!important;color:var(--a)!important;border:0!important;font-size:5px!important;font-weight:950!important;letter-spacing:.12em!important;pointer-events:none!important;position:relative!important;z-index:18!important}

        /* Event blocks float cleanly inside the time grid instead of touching its rules. */
        body.mobile-view-week .grid .event{
          top:3px!important;
          left:3px!important;
          right:3px!important;
          height:calc(var(--blocks) * var(--slot-h) - 6px)!important;
          min-height:20px!important;
          z-index:14!important;
        }
        body.mobile-view-week .grid .event.event-collision{min-width:0!important;overflow:hidden!important}

        /* Legibility is structural: never shrink primary time labels to microcopy. */
        body.mobile-view-week .grid{grid-template-columns:42px repeat(7,minmax(0,1fr))!important}
        body.mobile-view-week .grid .corner{width:42px!important}
        body.mobile-view-week .grid .time{padding:6px 4px 0 0!important;font-size:8.2px!important;line-height:1!important;font-weight:950!important;letter-spacing:-.025em!important;overflow:visible!important}
        body.mobile-view-week .grid .day-name{font-size:7.2px!important;letter-spacing:.02em!important}
        body.mobile-view-week .grid .day-date{font-size:13px!important}
        body.mobile-view-week .grid .day-month{font-size:6px!important}
        body.mobile-view-week .grid .event-title{font-size:7.5px!important;line-height:1.05!important}
        body.mobile-view-week .grid .event.university .event-title{font-size:7.4px!important;line-height:1.04!important}
        body.mobile-view-week .grid .event.university .up-time{font-size:6.6px!important}
        @media(max-width:420px){
          body.mobile-view-week .grid{grid-template-columns:40px repeat(7,minmax(0,1fr))!important}
          body.mobile-view-week .grid .corner{width:40px!important}
          body.mobile-view-week .grid .time{font-size:7.8px!important;padding-right:3px!important}
          body.mobile-view-week .grid .day-name{font-size:6.8px!important}
          body.mobile-view-week .grid .day-date{font-size:12.5px!important}
          body.mobile-view-week .grid .event-title{font-size:7.2px!important}
          body.mobile-view-week .grid .event.university .event-title{font-size:7.1px!important}
        }

        dialog{color:var(--b)!important;background:var(--a)!important;border:2px solid var(--b)!important;border-radius:12px!important;max-width:min(92vw,520px)!important;max-height:min(82vh,680px)!important;overflow:auto!important}
        dialog::backdrop{background:var(--b)!important;opacity:.18!important}
      `;
      doc.head.appendChild(style);
      doc.body.classList.remove('mobile-view-agenda','mobile-view-month','workspace-habits','workspace-money');
      doc.body.classList.add('mobile-view-week','workspace-calendar');
      const weekBtn=doc.querySelector('[data-mobile-view="week"],.mobile-view-button[data-view="week"]');if(weekBtn)weekBtn.click();
      patchSundayWeek();normalizeLegacyBreaks();syncTheme();watchSize();fit();
      setTimeout(()=>{patchSundayWeek();normalizeLegacyBreaks();fit();},50);
      setTimeout(fit,250);
    }catch{}
  });

  window.addEventListener('resize',fit);
})();
