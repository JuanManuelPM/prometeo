/* Prometeo Universal Shell v1 — CANDIDATE
   Exactly one global shell. Pages remain pages; the shell owns terminal lifecycle,
   Escape recovery, notifications and terminal focus lease.
*/
((global)=>{
  'use strict';
  if(global.PrometeoShell) return;
  let mounted=null;

  function mount({host=document.body,onRequestReturn=null}={}){
    if(mounted) return mounted;
    if(document.querySelector('[data-prometeo-shell="true"]')) throw new Error('PROMETEO_DUPLICATE_SHELL');
    const root=document.createElement('div'); root.className='p-universal-shell'; root.dataset.prometeoShell='true';
    root.innerHTML=`<section class="p-shell-terminal" aria-hidden="true"><iframe class="p-shell-frame" title="Página de Prometeo"></iframe><button class="p-shell-grip" type="button" aria-label="Volver"></button><div class="p-shell-status"></div></section><div class="p-shell-toast" role="status"></div>`;
    host.appendChild(root);
    const terminal=root.querySelector('.p-shell-terminal'),frame=root.querySelector('.p-shell-frame'),grip=root.querySelector('.p-shell-grip'),status=root.querySelector('.p-shell-status'),toastEl=root.querySelector('.p-shell-toast');
    let lease=null,current=null,drag=null,toastTimer=null;

    function toast(text){toastEl.textContent=text;toastEl.dataset.show='true';clearTimeout(toastTimer);toastTimer=setTimeout(()=>delete toastEl.dataset.show,1400);}
    function open(page,{returnPoint=null}={}){
      if(!page?.href) throw new Error('Terminal page href required');
      current={...page,returnPoint}; status.textContent=page.title||page.id||'Página'; frame.title=page.title||'Página de Prometeo';
      if(frame.getAttribute('src')!==page.href) frame.setAttribute('src',page.href);
      terminal.dataset.open='true';terminal.setAttribute('aria-hidden','false');
      const O=global.PrometeoOwnership;if(O&&!lease)lease=O.acquireFocus('universal-shell.terminal',{restoreKey:returnPoint?.route||page.id||null,scope:'terminal-page'});
      setTimeout(()=>{try{frame.focus({preventScroll:true});}catch{}},0); return current;
    }
    function finishClose(){terminal.removeAttribute('data-open');terminal.setAttribute('aria-hidden','true');if(lease&&global.PrometeoOwnership){try{global.PrometeoOwnership.releaseFocus(lease);}catch{}lease=null;}const old=current;current=null;return old;}
    function requestReturn(reason='grip'){if(!current)return false; if(typeof onRequestReturn==='function')return onRequestReturn({reason,current,finishClose}); finishClose();return true;}

    grip.addEventListener('click',()=>requestReturn('click'));
    grip.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX};try{grip.setPointerCapture(e.pointerId)}catch{}});
    grip.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=Math.max(0,e.clientX-drag.x);terminal.style.transform=`translate3d(${Math.min(14,dx/8)}%,0,0)`;terminal.style.opacity=String(Math.max(.68,1-dx/520));});
    function endDrag(e){if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;drag=null;terminal.style.transform='';terminal.style.opacity='';if(dx>76)requestReturn('drag');}
    grip.addEventListener('pointerup',endDrag);grip.addEventListener('pointercancel',endDrag);
    global.addEventListener('keydown',e=>{if(e.key!=='Escape'||!current)return;e.preventDefault();e.stopPropagation();requestReturn('escape');},{capture:true});

    mounted=Object.freeze({root,terminal,frame,open,finishClose,requestReturn,toast,get current(){return current;},get lease(){return lease;}});return mounted;
  }
  global.PrometeoShell=Object.freeze({version:'1.0.0-candidate',mount,get:()=>mounted});
})(typeof globalThis!=='undefined'?globalThis:window);
