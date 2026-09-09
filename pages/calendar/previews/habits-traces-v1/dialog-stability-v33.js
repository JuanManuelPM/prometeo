(()=>{
  'use strict';

  const frame=document.getElementById('romanticCalendarFrame');
  if(!frame)return;

  const PARENT_STYLE_ID='prometeo-dialog-stability-v33-style';
  const CHILD_STYLE_ID='prometeo-dialog-stability-v33-child-style';
  let childObserver=null;
  let boundWin=null;
  let nativeFocus=null;
  let nativeShowModal=null;
  let openDialog=null;

  function ensureParentStyle(){
    if(document.getElementById(PARENT_STYLE_ID))return;
    const style=document.createElement('style');
    style.id=PARENT_STYLE_ID;
    style.textContent=`
      #romanticCalendarFrame.prometeo-dialog-open{
        height:var(--prometeo-dialog-stable-height)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function structuralHeight(doc){
    const wrap=doc?.querySelector('.wrap');
    if(wrap){
      const rect=wrap.getBoundingClientRect();
      const h=Math.ceil(Math.max(rect.height,wrap.scrollHeight||0));
      if(Number.isFinite(h)&&h>0)return Math.max(360,h+4);
    }
    return Math.max(360,Math.ceil(frame.getBoundingClientRect().height||frame.clientHeight||360));
  }

  function visibleSlice(){
    const rect=frame.getBoundingClientRect();
    const viewportH=Math.max(1,window.innerHeight||document.documentElement.clientHeight||1);
    const frameH=Math.max(1,rect.height||frame.clientHeight||1);
    const top=Math.max(0,-rect.top);
    const bottom=Math.min(frameH,viewportH-rect.top);
    if(bottom>top+40)return {top,bottom,height:bottom-top,center:(top+bottom)/2};
    const fallback=Math.min(frameH,Math.max(0,-rect.top+viewportH/2));
    return {top:Math.max(0,fallback-160),bottom:Math.min(frameH,fallback+160),height:Math.min(320,frameH),center:fallback};
  }

  function syncDialogPosition(){
    try{
      const doc=frame.contentDocument;if(!doc)return;
      const slice=visibleSlice();
      const maxH=Math.max(220,Math.min(slice.height-20,Math.max(220,(window.innerHeight||600)-24)));
      doc.documentElement.style.setProperty('--prometeo-dialog-top',`${Math.round(slice.center)}px`);
      doc.documentElement.style.setProperty('--prometeo-dialog-max-height',`${Math.round(maxH)}px`);
    }catch{}
  }

  function lockFrameForDialog(doc){
    const h=structuralHeight(doc);
    frame.style.setProperty('--prometeo-dialog-stable-height',`${h}px`);
    frame.classList.add('prometeo-dialog-open');
  }

  function unlockFrame(){
    frame.classList.remove('prometeo-dialog-open');
    frame.style.removeProperty('--prometeo-dialog-stable-height');
    requestAnimationFrame(()=>window.fitRomanticCalendar?.());
  }

  function refreshDialogState(){
    try{
      const doc=frame.contentDocument;if(!doc)return;
      const next=doc.querySelector('dialog[open]');
      if(next){
        openDialog=next;
        lockFrameForDialog(doc);
        syncDialogPosition();
      }else if(openDialog){
        openDialog=null;
        unlockFrame();
      }
    }catch{}
  }

  function installChildCSS(doc){
    if(doc.getElementById(CHILD_STYLE_ID))return;
    const style=doc.createElement('style');
    style.id=CHILD_STYLE_ID;
    style.textContent=`
      dialog{
        position:fixed!important;
        inset:auto!important;
        top:var(--prometeo-dialog-top,50%)!important;
        left:50%!important;
        margin:0!important;
        transform:translate(-50%,-50%)!important;
        max-height:var(--prometeo-dialog-max-height,calc(100vh - 24px))!important;
        overscroll-behavior:contain!important;
      }
      dialog[open]{overflow:auto!important}
      dialog[open]>.dialog-inner,
      dialog[open]>form.dialog-inner{
        max-height:inherit!important;
        overflow:auto!important;
        overscroll-behavior:contain!important;
      }
      html:has(dialog[open]),body:has(dialog[open]){
        overscroll-behavior:none!important;
      }
    `;
    doc.head.appendChild(style);
  }

  function patchFocus(win){
    if(win.__PROMETEO_DIALOG_FOCUS_V33__)return;
    win.__PROMETEO_DIALOG_FOCUS_V33__=true;
    nativeFocus=win.HTMLElement?.prototype?.focus;
    if(typeof nativeFocus!=='function')return;
    win.HTMLElement.prototype.focus=function(options){
      if(this?.closest?.('dialog')){
        const opts=options&&typeof options==='object'?{...options,preventScroll:true}:{preventScroll:true};
        return nativeFocus.call(this,opts);
      }
      return options===undefined?nativeFocus.call(this):nativeFocus.call(this,options);
    };
  }

  function patchShowModal(win){
    const proto=win.HTMLDialogElement?.prototype;
    if(!proto||win.__PROMETEO_DIALOG_SHOWMODAL_V33__)return;
    win.__PROMETEO_DIALOG_SHOWMODAL_V33__=true;
    nativeShowModal=proto.showModal;
    if(typeof nativeShowModal!=='function')return;
    proto.showModal=function(...args){
      const x=window.scrollX,y=window.scrollY;
      syncDialogPosition();
      const result=nativeShowModal.apply(this,args);
      refreshDialogState();
      requestAnimationFrame(()=>{
        syncDialogPosition();
        if(Math.abs(window.scrollY-y)>2||Math.abs(window.scrollX-x)>2)window.scrollTo(x,y);
      });
      return result;
    };
  }

  function initChild(){
    try{
      const doc=frame.contentDocument,win=frame.contentWindow;
      if(!doc||!win)return;
      ensureParentStyle();
      installChildCSS(doc);
      patchFocus(win);
      patchShowModal(win);
      syncDialogPosition();

      childObserver?.disconnect();
      childObserver=new MutationObserver(records=>{
        if(records.some(r=>r.type==='attributes'&&r.attributeName==='open'))refreshDialogState();
      });
      childObserver.observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['open']});
      boundWin=win;
      refreshDialogState();
    }catch(error){
      console.warn('[Prometeo dialog stability] unavailable',error);
    }
  }

  function onViewportChange(){
    if(!frame.classList.contains('prometeo-dialog-open'))return;
    syncDialogPosition();
  }

  window.addEventListener('scroll',onViewportChange,{passive:true});
  window.addEventListener('resize',onViewportChange,{passive:true});
  frame.addEventListener('load',()=>requestAnimationFrame(initChild));

  if(frame.contentDocument?.readyState==='complete')requestAnimationFrame(initChild);
})();
