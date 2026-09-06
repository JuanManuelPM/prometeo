/* Calendar bridge compatibility guard. Passive only: never mutates stable bands repeatedly. */
(()=>{
  const frame=document.getElementById('romanticCalendarFrame');
  if(!frame)return;
  let ro=null,mo=null,raf=0;

  function size(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      try{
        const doc=frame.contentDocument;if(!doc)return;
        const h=Math.max(360,doc.documentElement.scrollHeight||0,doc.body?.scrollHeight||0);
        frame.style.height=(h+8)+'px';
      }catch{}
    });
  }

  function normalizeLegacy(){
    try{
      const doc=frame.contentDocument,grid=doc?.getElementById('grid');if(!grid)return false;
      const cells=Array.from(grid.children);
      let changed=false;
      for(let i=0;i<cells.length;){
        if(!cells[i].classList?.contains('time-break-cell')){i++;continue;}
        const run=[];let j=i;
        while(j<cells.length&&cells[j].classList?.contains('time-break-cell')&&run.length<8){run.push(cells[j]);j++;}
        if(!run.length){i++;continue;}
        const band=doc.createElement('div');
        band.className='cell time-break-band';
        band.setAttribute('role','separator');
        band.setAttribute('aria-label','Tiempo libre comprimido');
        band.textContent='TIEMPO LIBRE';
        run[0].replaceWith(band);run.slice(1).forEach(n=>n.remove());
        changed=true;i=j;
      }
      return changed;
    }catch{return false;}
  }

  function install(){
    try{
      const doc=frame.contentDocument;if(!doc)return;
      if(!doc.getElementById('prometeo-calendar-compat-style')){
        const style=doc.createElement('style');style.id='prometeo-calendar-compat-style';
        style.textContent=`
          html,body{overflow:visible!important}
          .time-break-cell{display:none!important;pointer-events:none!important}
          .time-break-band{grid-column:1/-1!important;min-height:22px!important;height:22px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:var(--b)!important;color:var(--a)!important;border:0!important;border-radius:0!important;box-shadow:none!important;font-size:6px!important;font-weight:950!important;letter-spacing:.16em!important;pointer-events:none!important;cursor:default!important;user-select:none!important}
          @media(max-width:760px){.time-break-band{min-height:18px!important;height:18px!important;font-size:4.8px!important}}
        `;
        doc.head.appendChild(style);
      }
      normalizeLegacy();
      mo?.disconnect();ro?.disconnect();
      mo=new MutationObserver(()=>{
        /* Only act when a genuinely old break cell appears. Stable bands are left untouched. */
        if(doc.querySelector('.time-break-cell'))normalizeLegacy();
        size();
      });
      if(doc.body)mo.observe(doc.body,{subtree:true,childList:true});
      if('ResizeObserver' in window){ro=new ResizeObserver(size);ro.observe(doc.documentElement);if(doc.body)ro.observe(doc.body);}
      size();setTimeout(()=>{normalizeLegacy();size();},80);
    }catch{}
  }

  frame.addEventListener('load',install);
  if(frame.contentDocument?.readyState==='complete')install();
  window.addEventListener('resize',size);
})();
