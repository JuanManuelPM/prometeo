(()=>{
  const frame=document.getElementById('romanticCalendarFrame');
  if(!frame)return;
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
    try{const doc=frame.contentDocument;if(!doc)return;const h=Math.max(360,Math.min(980,doc.documentElement.scrollHeight+4));frame.style.height=h+'px';}catch{}
  }
  window.fitRomanticCalendar=fit;
  frame.addEventListener('load',()=>{
    try{
      const doc=frame.contentDocument;if(!doc)return;
      const style=doc.createElement('style');
      style.textContent=`
        html,body{margin:0!important;overflow:hidden!important}
        .wrap{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
        header,.legend,.mobile-swipe-hint,.life-desktop,.later,.finance,dialog,
        .prometeo-global-shell,.p-global-shell,.global-shell,.workspace-nav,.workspace-primary,
        .workspace-secondary,.workspace-caption,.habit-quickbar,.month-view,.mobile-view-switch{display:none!important}
        .week-nav{position:static!important;top:auto!important;margin:0!important;padding:3px 0 6px!important}
        .calendar{width:100%!important;margin:0!important}
      `;
      doc.head.appendChild(style);
      doc.body.classList.remove('mobile-view-agenda','mobile-view-month','workspace-habits','workspace-money');
      doc.body.classList.add('mobile-view-week','workspace-calendar');
      const weekBtn=doc.querySelector('[data-mobile-view="week"],.mobile-view-button[data-view="week"]');if(weekBtn)weekBtn.click();
      syncTheme();setTimeout(fit,40);setTimeout(fit,220);setTimeout(fit,700);
    }catch{}
  });
  window.addEventListener('resize',()=>setTimeout(fit,30));
})();
