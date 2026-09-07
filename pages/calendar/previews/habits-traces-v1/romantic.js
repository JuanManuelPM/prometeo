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
          if(!window.__PROMETEO_SUNDAY_WEEK_PATCHED__){
            window.__PROMETEO_SUNDAY_WEEK_PATCHED__=true;
            const baseRender=render;
            render=function(){baseRender();cleanHeaders();};
            todayWeek.onclick=()=>{weekStart=addDays(currentMonday(),-1);render();};
          }
          weekStart=addDays(currentMonday(),-1);
          render();cleanHeaders();
        })();
      `);
    }catch(error){console.warn('[Prometeo romantic calendar] Sunday patch unavailable',error);}
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
        .cell.slot{cursor:pointer}
        .cell.slot:focus-visible{outline:2px solid var(--b)!important;outline-offset:-2px}
        .time-break-cell{pointer-events:none!important;cursor:default!important;border:0!important;background:var(--b)!important;color:var(--a)!important;box-shadow:none!important}
        .time-break-band{grid-column:1/-1!important;min-height:17px!important;height:17px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:var(--b)!important;color:var(--a)!important;border:0!important;font-size:5px!important;font-weight:950!important;letter-spacing:.12em!important;pointer-events:none!important}

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
