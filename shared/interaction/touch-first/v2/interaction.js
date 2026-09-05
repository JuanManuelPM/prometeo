/* PROMETEO TOUCH-FIRST INTERACTION v2 — CANDIDATE
   Direct manipulation adapter for mouse/pen while preserving native touch physics.
*/
(() => {
  'use strict';
  if (window.__PROMETEO_TOUCH_FIRST_V2__) return;
  window.__PROMETEO_TOUCH_FIRST_V2__ = true;

  const root = document.documentElement;
  const indicator = document.createElement('div');
  indicator.className = 'p-contact-indicator-v2';
  indicator.setAttribute('aria-hidden','true');
  document.body.appendChild(indicator);

  const PRESS = '[data-p-touch],[data-p-control],[data-p-manipulable="true"]';
  const PAN = '[data-p-scroll][data-p-direct-pan="true"]';
  const DRAG_THRESHOLD_PX = 7;
  const CLICK_SUPPRESS_MS = 450;
  let gesture = null;
  let suppress = null;

  const isDisabled = el => !!el?.matches?.(':disabled,[aria-disabled="true"]');
  const moveIndicator = e => { indicator.style.left=e.clientX+'px'; indicator.style.top=e.clientY+'px'; };
  const clearPressed = () => document.querySelectorAll('[data-p-pressed="true"]').forEach(el=>el.removeAttribute('data-p-pressed'));

  function scrollableAncestorBetween(target, stop, axis){
    for(let el=target; el && el!==stop; el=el.parentElement){
      const cs=getComputedStyle(el);
      if(axis==='y' && /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight>el.clientHeight+1) return el;
      if(axis==='x' && /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth>el.clientWidth+1) return el;
    }
    return null;
  }

  function axisFor(el){ return el?.dataset?.pScroll==='y' ? 'y' : 'x'; }
  function releaseCapture(g){
    if(!g?.captured) return;
    try{ g.pan.releasePointerCapture(g.pointerId); }catch{}
    g.captured=false;
  }
  function clearGesture(){
    if(!gesture) return;
    releaseCapture(gesture);
    gesture.pan?.removeAttribute('data-p-dragging');
    gesture=null;
  }
  function endContact(){ clearPressed(); root.removeAttribute('data-p-contact-v2'); }

  addEventListener('pointerdown', e => {
    if(e.isPrimary===false) return;
    moveIndicator(e);
    if(e.pointerType!=='touch') root.dataset.pContactV2=e.pointerType||'mouse';

    const press=e.target.closest?.(PRESS);
    if(press && !isDisabled(press)) press.dataset.pPressed='true';

    const pan=e.target.closest?.(PAN);
    if(!pan || e.pointerType==='touch' || e.button!==0) return;
    const axis=axisFor(pan);
    gesture={pointerId:e.pointerId,pointerType:e.pointerType||'mouse',pan,axis,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,startScrollLeft:pan.scrollLeft,startScrollTop:pan.scrollTop,dragging:false,captured:false};
  }, {capture:true,passive:true});

  addEventListener('pointermove', e => {
    if(e.pointerType!=='touch') moveIndicator(e);
    const g=gesture;
    if(!g || e.pointerId!==g.pointerId) return;
    const dx=e.clientX-g.startX, dy=e.clientY-g.startY;
    const primary=g.axis==='x'?dx:dy;
    const cross=g.axis==='x'?dy:dx;
    if(!g.dragging){
      if(Math.hypot(dx,dy)<DRAG_THRESHOLD_PX) return;
      if(Math.abs(cross)>Math.abs(primary)*1.15){ clearGesture(); return; }
      g.dragging=true;
      g.pan.dataset.pDragging='true';
      clearPressed();
      try{ g.pan.setPointerCapture(g.pointerId); g.captured=true; }catch{}
    }
    if(g.axis==='x') g.pan.scrollLeft=g.startScrollLeft-dx;
    else g.pan.scrollTop=g.startScrollTop-dy;
    g.lastX=e.clientX; g.lastY=e.clientY;
    if(e.cancelable) e.preventDefault();
  }, {capture:true,passive:false});

  function finishPointer(e){
    const g=gesture;
    if(g && e.pointerId===g.pointerId){
      if(g.dragging) suppress={root:g.pan,until:performance.now()+CLICK_SUPPRESS_MS};
      clearGesture();
    }
    endContact();
  }
  addEventListener('pointerup',finishPointer,{capture:true,passive:true});
  addEventListener('pointercancel',finishPointer,{capture:true,passive:true});
  addEventListener('lostpointercapture',e=>{ if(gesture && e.pointerId===gesture.pointerId){ gesture.pan?.removeAttribute('data-p-dragging'); gesture=null; } },true);

  addEventListener('click',e=>{
    if(!suppress || performance.now()>suppress.until){ suppress=null; return; }
    if(suppress.root.contains(e.target)){
      e.preventDefault(); e.stopImmediatePropagation(); suppress=null;
    }
  },true);

  addEventListener('wheel',e=>{
    const rail=e.target.closest?.('[data-p-scroll="x"][data-p-wheel-axis="x"]');
    if(!rail) return;
    if(Math.abs(e.deltaX)>=Math.abs(e.deltaY)*0.8) return;
    if(!e.deltaY) return;
    if(scrollableAncestorBetween(e.target,rail,'y')) return;
    const max=rail.scrollWidth-rail.clientWidth;
    if(max<=1) return;
    const before=rail.scrollLeft;
    rail.scrollLeft=Math.max(0,Math.min(max,before+e.deltaY));
    if(rail.scrollLeft!==before && e.cancelable) e.preventDefault();
  },{capture:true,passive:false});

  addEventListener('blur',()=>{ clearGesture(); endContact(); suppress=null; });
  addEventListener('pagehide',()=>{ clearGesture(); endContact(); suppress=null; });

  window.PrometeoTouch = Object.freeze({
    version:'2',
    thresholdPx:DRAG_THRESHOLD_PX,
    isCoarse:()=>matchMedia('(pointer:coarse)').matches,
    isFine:()=>matchMedia('(pointer:fine)').matches,
    activeOwner:()=>gesture?.pan?.dataset?.pInteractionOwner || (gesture?'touch-first-v2':null)
  });
})();
