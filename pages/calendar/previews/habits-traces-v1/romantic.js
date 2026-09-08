(()=>{
  const frame=document.getElementById('romanticCalendarFrame');
  if(!frame)return;

  let resizeObserver=null,mutationObserver=null,frameWidthObserver=null,fitRAF=0;

  const PSYCH_PATH='M 59 179 L 59 182 L 61 184 L 94 184 L 95 182 L 95 178 L 93 176 L 62 176 L 60 177 Z M 126 143 L 123 144 L 119 148 L 118 150 L 118 156 L 119 158 L 124 162 L 130 162 L 135 159 L 137 155 L 137 150 L 132 144 Z M 25 143 L 18 148 L 17 155 L 20 160 L 24 162 L 30 162 L 32 161 L 36 156 L 36 149 L 33 145 L 28 143 Z M 23 8 L 21 10 L 21 13 L 23 15 L 30 17 L 37 24 L 42 36 L 39 38 L 32 46 L 23 60 L 16 75 L 12 87 L 12 90 L 10 95 L 10 102 L 9 103 L 9 113 L 13 124 L 20 129 L 29 129 L 33 127 L 42 117 L 47 106 L 47 103 L 49 99 L 50 91 L 51 90 L 51 83 L 52 82 L 52 51 L 51 50 L 50 39 L 60 32 L 71 30 L 78 32 L 86 39 L 89 44 L 91 51 L 88 54 L 80 67 L 74 80 L 70 92 L 69 100 L 68 101 L 68 106 L 67 107 L 67 118 L 70 126 L 74 129 L 82 129 L 86 127 L 92 120 L 98 105 L 99 97 L 100 96 L 100 89 L 101 88 L 101 61 L 100 60 L 99 52 L 102 47 L 112 37 L 122 32 L 128 32 L 134 35 L 138 39 L 142 47 L 143 56 L 144 57 L 144 78 L 143 79 L 143 86 L 142 87 L 141 96 L 135 114 L 129 124 L 129 126 L 131 128 L 135 128 L 137 126 L 143 114 L 148 98 L 148 94 L 150 88 L 150 82 L 151 81 L 151 55 L 150 54 L 150 49 L 147 40 L 144 35 L 138 29 L 131 26 L 119 26 L 107 32 L 96 42 L 93 36 L 88 30 L 84 27 L 76 24 L 63 24 L 57 26 L 48 31 L 43 20 L 37 13 L 30 9 Z M 93 61 L 94 62 L 94 86 L 93 87 L 92 99 L 89 107 L 89 110 L 85 118 L 80 123 L 78 123 L 75 120 L 75 116 L 74 115 L 75 102 L 79 90 L 79 87 L 84 77 L 84 75 L 91 62 Z M 43 44 L 44 45 L 44 52 L 45 53 L 45 80 L 44 81 L 44 88 L 43 89 L 42 98 L 39 107 L 33 118 L 30 121 L 26 123 L 23 123 L 19 120 L 17 116 L 17 111 L 16 110 L 17 97 L 18 96 L 19 89 L 23 77 L 26 72 L 26 70 L 28 68 L 28 66 L 38 50 Z';

  function syncTheme(){
    try{
      const doc=frame.contentDocument;if(!doc)return;
      const css=getComputedStyle(document.documentElement);
      const a=css.getPropertyValue('--a').trim(),b=css.getPropertyValue('--b').trim();
      doc.documentElement.style.setProperty('--a',a);doc.documentElement.style.setProperty('--b',b);
      doc.body?.style.setProperty('--a',a);doc.body?.style.setProperty('--b',b);
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

  function applyEmbedWidthMode(){
    try{
      const doc=frame.contentDocument;if(!doc?.body)return;
      const width=Math.round(frame.getBoundingClientRect().width||frame.clientWidth||0);
      const mode=width>=1250?'wide':width>=900?'compact':width>=650?'narrow':'phone';
      doc.body.dataset.embedWidth=mode;
      doc.documentElement.style.setProperty('--prometeo-embed-width',width+'px');
    }catch{}
  }

  /* Compatibility only: cached older compression builds may emit one cell per day. */
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

  function patchCalendar(){
    try{
      const win=frame.contentWindow;if(!win)return;
      const psychPath=JSON.stringify(PSYCH_PATH);
      win.eval(`
        (()=>{
          const shortNames=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
          const longNames=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
          const psychPath=${psychPath};

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

          const ensureSandra=()=>{
            const seedKey='prometeo.personal.sandra-wed.seed.v1';
            if(localStorage.getItem(seedKey))return;
            if(!personalEvents.some(e=>e?.id==='psych-sandra-wed')){
              personalEvents.push({
                id:'psych-sandra-wed',
                title:'Sandra',
                type:'fixed',
                weekday:2,
                date:null,
                start:13*60,
                duration:1,
                art:'psychology'
              });
              saveLife();
            }
            localStorage.setItem(seedKey,new Date().toISOString());
          };

          if(!window.__PROMETEO_RECURRING_PERSONAL_PATCHED__){
            window.__PROMETEO_RECURRING_PERSONAL_PATCHED__=true;

            personalEventsForDate=dateISO=>personalEvents.filter(e=>CAL_CORE.scheduleOccursOn(e,dateISO));

            const basePersonalNode=personalNode;
            personalNode=item=>{
              const node=basePersonalNode(item);
              if(item?.art==='psychology'||item?.id==='psych-sandra-wed'){
                node.classList.add('psychology');
                const meta=node.querySelector('.event-meta');
                if(meta)meta.textContent='Psicóloga · '+minutesLabel(item.start)+'–'+minutesLabel(item.start+item.duration*60);
                const remove=node.querySelector('.remove');
                if(remove)remove.setAttribute('aria-label','Quitar Psicóloga');
                if(!node.querySelector('.psych-art')){
                  const art=document.createElement('div');
                  art.className='psych-art';
                  art.setAttribute('aria-hidden','true');
                  art.innerHTML='<svg viewBox="0 0 161 198" focusable="false" aria-hidden="true"><path d="'+psychPath+'" fill="currentColor" fill-rule="evenodd"/></svg>';
                  node.appendChild(art);
                }
              }
              return node;
            };
          }

          ensureSandra();

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
    }catch(error){console.warn('[Prometeo romantic calendar] calendar patch unavailable',error);}
  }

  function watchSize(){
    try{
      const doc=frame.contentDocument;if(!doc)return;
      resizeObserver?.disconnect();mutationObserver?.disconnect();frameWidthObserver?.disconnect();

      if('ResizeObserver' in window){
        resizeObserver=new ResizeObserver(()=>fit());
        resizeObserver.observe(doc.documentElement);
        if(doc.body)resizeObserver.observe(doc.body);

        frameWidthObserver=new ResizeObserver(()=>{applyEmbedWidthMode();fit();});
        frameWidthObserver.observe(frame);
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
      style.dataset.prometeoEmbed='ux29';
      style.textContent=`
        html,body{margin:0!important;overflow:visible!important}
        .wrap{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
        header,.legend,.mobile-swipe-hint,.life-desktop,.later,.finance,
        .prometeo-global-shell,.p-global-shell,.global-shell,.workspace-nav,.workspace-primary,
        .workspace-secondary,.workspace-caption,.habit-quickbar,.month-view,.mobile-view-switch{display:none!important}
        .day-pending{display:none!important}

        .week-nav{position:static!important;top:auto!important;margin:0!important;padding:3px 0 6px!important}
        .calendar{width:100%!important;margin:0!important;overflow:hidden!important}

        /* One responsive weekly geometry at every embedded width. Never fall back to the 1080px desktop minimum. */
        body.mobile-view-week .grid{
          display:grid!important;
          min-width:0!important;
          width:100%!important;
          grid-template-columns:var(--embed-time-col,44px) repeat(7,minmax(0,1fr))!important;
          isolation:isolate!important;
        }
        body.mobile-view-week .grid .corner{width:var(--embed-time-col,44px)!important}
        body.mobile-view-week .grid .cell{min-width:0!important}
        body.mobile-view-week .grid .slot{position:relative!important;z-index:1!important;overflow:visible!important}
        body.mobile-view-week .grid .slot:has(>.event){z-index:12!important;background-image:none!important}
        body.mobile-view-week .grid .slot:has(>.event):hover{background-image:none!important}
        body.mobile-view-week .grid .slot:focus-visible{outline:2px solid var(--b)!important;outline-offset:-2px}

        /* Events sit above grid rules; the rules remain the substrate instead of slicing through cards. */
        body.mobile-view-week .grid .event{
          top:2px!important;
          left:2px!important;
          right:2px!important;
          height:calc(var(--blocks) * var(--slot-h) - 4px)!important;
          min-height:20px!important;
          z-index:20!important;
          overflow:hidden!important;
          box-shadow:none!important;
        }

        .time-break-cell{pointer-events:none!important;cursor:default!important;border:0!important;background:var(--b)!important;color:var(--a)!important;box-shadow:none!important}
        .time-break-band{grid-column:1/-1!important;min-height:17px!important;height:17px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:var(--b)!important;color:var(--a)!important;border:0!important;font-size:5px!important;font-weight:950!important;letter-spacing:.12em!important;pointer-events:none!important;position:relative!important;z-index:30!important}

        /* Psychology event: exact user-provided mark, vector-traced so it follows the active two-color theme. */
        .event.personal.psychology{padding-right:36px!important;border-style:solid!important}
        .event.personal.psychology .psych-art{position:absolute;right:7px;bottom:6px;width:25px;height:30px;color:var(--b);pointer-events:none;opacity:.95}
        .event.personal.psychology .psych-art svg{display:block;width:100%;height:100%}
        .event.personal.psychology .remove{display:none!important}

        /* Wide embedded desktop. */
        body[data-embed-width="wide"]{--embed-time-col:50px}
        body[data-embed-width="wide"] .grid .time{padding:7px 5px 0 0!important;font-size:8.5px!important}
        body[data-embed-width="wide"] .grid .day-name{font-size:7.4px!important}
        body[data-embed-width="wide"] .grid .day-date{font-size:13.5px!important}
        body[data-embed-width="wide"] .grid .day-month{font-size:6px!important}
        body[data-embed-width="wide"] .grid .event-title{font-size:8px!important;line-height:1.05!important}
        body[data-embed-width="wide"] .grid .event-meta{font-size:6.7px!important}
        body[data-embed-width="wide"] .grid .event.university .event-title{font-size:8px!important}
        body[data-embed-width="wide"] .grid .event.university .up-time{font-size:6.8px!important}

        /* Split-screen / compact desktop: keep seven days, remove secondary density before shrinking primary text. */
        body[data-embed-width="compact"]{--embed-time-col:45px}
        body[data-embed-width="compact"] .grid .time{padding:6px 4px 0 0!important;font-size:8px!important}
        body[data-embed-width="compact"] .grid .day-name{font-size:7px!important}
        body[data-embed-width="compact"] .grid .day-date{font-size:12.5px!important}
        body[data-embed-width="compact"] .grid .day-month{font-size:5.8px!important}
        body[data-embed-width="compact"] .grid .event-title{font-size:7.5px!important;line-height:1.04!important}
        body[data-embed-width="compact"] .grid .event-meta{font-size:6px!important}
        body[data-embed-width="compact"] .grid .event.university .event-title{font-size:7.5px!important}
        body[data-embed-width="compact"] .grid .event.university .up-detail{font-size:6.2px!important;margin-top:4px!important;-webkit-line-clamp:2!important}
        body[data-embed-width="compact"] .grid .event.university .up-room{font-size:6px!important}
        body[data-embed-width="compact"] .grid .event.university .up-time{font-size:6.5px!important}

        /* Narrow split-screen: simplify card interiors, not the calendar structure. */
        body[data-embed-width="narrow"]{--embed-time-col:41px}
        body[data-embed-width="narrow"] .week-nav-right{display:none!important}
        body[data-embed-width="narrow"] .week-label{font-size:9px!important;min-width:0!important}
        body[data-embed-width="narrow"] .grid .time{padding:6px 3px 0 0!important;font-size:7.6px!important;line-height:1!important;overflow:visible!important}
        body[data-embed-width="narrow"] .grid .day-name{font-size:6.7px!important;letter-spacing:.01em!important}
        body[data-embed-width="narrow"] .grid .day-date{font-size:12px!important}
        body[data-embed-width="narrow"] .grid .day-month{font-size:5.5px!important}
        body[data-embed-width="narrow"] .grid .event{padding:3px 3px!important;border-width:1px!important;border-radius:5px!important}
        body[data-embed-width="narrow"] .grid .event-title{font-size:7px!important;line-height:1.03!important;-webkit-line-clamp:2!important}
        body[data-embed-width="narrow"] .grid .event-meta{display:none!important}
        body[data-embed-width="narrow"] .grid .event.university .up-detail,
        body[data-embed-width="narrow"] .grid .event.university .up-room,
        body[data-embed-width="narrow"] .grid .event.university .up-name{display:none!important}
        body[data-embed-width="narrow"] .grid .event.university .up-facts{padding-top:3px!important}
        body[data-embed-width="narrow"] .grid .event.university .up-time{font-size:6px!important}
        body[data-embed-width="narrow"] .grid .event.university .up-mark{font-size:11px!important}
        body[data-embed-width="narrow"] .grid .event.class .class-art{width:14px!important;height:14px!important;right:2px!important;bottom:2px!important}
        body[data-embed-width="narrow"] .grid .event.personal.psychology{padding-right:26px!important}
        body[data-embed-width="narrow"] .grid .event.personal.psychology .psych-art{width:18px;height:22px;right:4px;bottom:4px}

        /* Phone: same seven-day projection, with minimum legibility instead of microtext. */
        body[data-embed-width="phone"]{--embed-time-col:39px}
        body[data-embed-width="phone"] .week-nav-right{display:none!important}
        body[data-embed-width="phone"] .grid .time{padding:5px 3px 0 0!important;font-size:7.4px!important;line-height:1!important;overflow:visible!important}
        body[data-embed-width="phone"] .grid .day-name{font-size:6.4px!important}
        body[data-embed-width="phone"] .grid .day-date{font-size:11.5px!important}
        body[data-embed-width="phone"] .grid .day-month{font-size:5.2px!important}
        body[data-embed-width="phone"] .grid .event{top:1px!important;left:1px!important;right:1px!important;height:calc(var(--blocks) * var(--slot-h) - 2px)!important;padding:2px!important;border-width:1px!important;border-radius:4px!important}
        body[data-embed-width="phone"] .grid .event-title{font-size:6.8px!important;line-height:1.02!important;-webkit-line-clamp:2!important}
        body[data-embed-width="phone"] .grid .event-meta{display:none!important}
        body[data-embed-width="phone"] .grid .event.university .up-detail,
        body[data-embed-width="phone"] .grid .event.university .up-room,
        body[data-embed-width="phone"] .grid .event.university .up-name{display:none!important}
        body[data-embed-width="phone"] .grid .event.university .up-facts{padding-top:2px!important}
        body[data-embed-width="phone"] .grid .event.university .up-time{font-size:5.8px!important}
        body[data-embed-width="phone"] .grid .event.university .up-mark{font-size:10px!important}
        body[data-embed-width="phone"] .grid .event.class .class-art{display:none!important}
        body[data-embed-width="phone"] .grid .event.personal.psychology{padding-right:22px!important}
        body[data-embed-width="phone"] .grid .event.personal.psychology .psych-art{width:16px;height:20px;right:3px;bottom:3px}

        dialog{color:var(--b)!important;background:var(--a)!important;border:2px solid var(--b)!important;border-radius:12px!important;max-width:min(92vw,520px)!important;max-height:min(82vh,680px)!important;overflow:auto!important}
        dialog::backdrop{background:var(--b)!important;opacity:.18!important}
      `;
      doc.head.appendChild(style);

      doc.body.classList.remove('mobile-view-agenda','mobile-view-month','workspace-habits','workspace-money');
      doc.body.classList.add('mobile-view-week','workspace-calendar');
      const weekBtn=doc.querySelector('[data-mobile-view="week"],.mobile-view-button[data-view="week"]');if(weekBtn)weekBtn.click();

      patchCalendar();
      normalizeLegacyBreaks();
      applyEmbedWidthMode();
      syncTheme();
      watchSize();
      fit();

      setTimeout(()=>{patchCalendar();normalizeLegacyBreaks();applyEmbedWidthMode();fit();},60);
      setTimeout(()=>{applyEmbedWidthMode();fit();},260);
    }catch{}
  });

  window.addEventListener('resize',()=>{applyEmbedWidthMode();fit();});
})();
