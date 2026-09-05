(()=>{
  const frame=document.getElementById('romanticCalendarFrame');
  if(!frame)return;

  function fit(){
    try{
      const doc=frame.contentDocument;
      if(!doc)return;
      const root=doc.documentElement;
      const h=Math.max(360,Math.min(920,root.scrollHeight+4));
      frame.style.height=h+'px';
    }catch{}
  }

  frame.addEventListener('load',()=>{
    try{
      const doc=frame.contentDocument;
      if(!doc)return;
      const style=doc.createElement('style');
      style.textContent=`
        html,body{margin:0!important;overflow:hidden!important}
        .wrap{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
        header,.legend,.mobile-swipe-hint,.life-desktop,.later,.finance,
        .prometeo-global-shell,.p-global-shell,.global-shell{display:none!important}
        .week-nav{position:static!important;top:auto!important;margin:0!important;padding:3px 0 6px!important}
        .calendar{width:100%!important;margin:0!important}
        .mobile-view-switch{display:none!important}
      `;
      doc.head.appendChild(style);
      doc.body.classList.remove('mobile-view-agenda');
      doc.body.classList.add('mobile-view-week');
      const weekBtn=doc.querySelector('[data-mobile-view="week"],.mobile-view-button[data-view="week"]');
      if(weekBtn)weekBtn.click();
      setTimeout(fit,40);
      setTimeout(fit,220);
    }catch{}
  });

  window.addEventListener('resize',()=>setTimeout(fit,30));
})();