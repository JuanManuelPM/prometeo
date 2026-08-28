(function(global){
  'use strict';

  const DEFAULT_PALETTE=[
    {bg:'#4C3D19',fg:'#E5D7C4'},
    {bg:'#354024',fg:'#E5D7C4'},
    {bg:'#889063',fg:'#4C3D19'},
    {bg:'#CFBB99',fg:'#354024'},
    {bg:'#E5D7C4',fg:'#4C3D19'}
  ];

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>1-Math.pow(1-t,3);

  let INSTANCE_SEQ=0;

  function create(element,options={}){
    if(!element) throw new Error('PrometeoEdgeStack.create: element is required');

    const items=Array.isArray(options.items) && options.items.length
      ? options.items.map((item,i)=>({
          id:item && item.id!=null ? String(item.id) : String(i),
          title:item && item.title!=null ? String(item.title) : String(i),
          url:item && item.url!=null ? String(item.url) : null,
          raw:item
        }))
      : [{id:'prometeo',title:'Prometeo',url:null,raw:null}];

    const palette=Array.isArray(options.palette) && options.palette.length
      ? options.palette.map((p)=>({
          bg:p.bg || '#E5D7C4',
          fg:p.fg || '#4C3D19'
        }))
      : DEFAULT_PALETTE;

    const side=options.side==='right' ? 'right' : 'left';
    const mirrored=side==='right';
    const loop=options.loop!==false;
    const onChange=typeof options.onChange==='function' ? options.onChange : null;
    const instanceId=`pes-${++INSTANCE_SEQ}`;

    let current=normalizeIndex(Number.isFinite(options.startIndex) ? options.startIndex : 0);
    let state='IDLE';
    let gesture=null;
    let progress=0;
    let wheelLock=false;
    let G=null;
    let destroyed=false;
    let resizeTimer=null;

    const measureCanvas=document.createElement('canvas');
    const measureCtx=measureCanvas.getContext('2d');

    element.classList.add('prometeo-edge-stack');

    function normalizeIndex(i){
      if(loop){
        return ((i%items.length)+items.length)%items.length;
      }
      return clamp(i,0,items.length-1);
    }

    function rawIndex(i){
      if(loop) return normalizeIndex(i);
      return i;
    }

    function itemAt(i){
      if(loop) return items[normalizeIndex(i)];
      if(i<0 || i>=items.length) return null;
      return items[i];
    }

    function paletteAt(i){
      const j=((i%palette.length)+palette.length)%palette.length;
      return palette[j];
    }

    function measureWord(word,fontSize){
      measureCtx.font=`900 ${fontSize}px "Arial Narrow","Helvetica Neue Condensed","Liberation Sans Narrow",Arial,sans-serif`;
      return measureCtx.measureText(word).width;
    }

    function geometry(){
      const W=element.clientWidth;
      const H=element.clientHeight;
      const aspect=H/Math.max(1,W);
      const portraitFactor=clamp((aspect-.90)/.65,0,1);
      const railRatio=lerp(.105,.065,portraitFactor);
      const railH=clamp(H*railRatio,44,78);
      const topH=H-railH;
      const fontSize=clamp(railH*.66,25,50);
      const mainLeftPad=clamp(W*.026,14,26);
      const mainRightPad=clamp(W*.022,12,22);
      const secondarySmallPad=clamp(W*.018,10,20);
      const lowerR=clamp(Math.min(W,H)*.016,7,13);
      const inverseR=clamp(Math.min(W,H)*.017,7,13);

      return {
        W,H,portraitFactor,railH,topH,fontSize,
        mainLeftPad,mainRightPad,secondarySmallPad,
        lowerR,inverseR
      };
    }

    function layoutFor(absIndex){
      const item=itemAt(absIndex) || items[normalizeIndex(absIndex)];
      const W=G.W;
      const wordWidth=measureWord(item.title,G.fontSize);
      const baseMain=lerp(W*.50,W*.65,G.portraitFactor);
      const needed=wordWidth+G.mainLeftPad+G.mainRightPad;
      const minimumRemainder=Math.max(W*.105,G.lowerR*7);
      const maxMain=W-minimumRemainder;
      const main=clamp(Math.max(baseMain,needed),baseMain,maxMain);
      const rest=W-main;
      const u=rest/7;

      return {
        main,u,
        B:[main,main+4*u,main+6*u,W,W]
      };
    }

    function canonicalLayerPath(boundary){
      const roomRight=Math.max(0,G.W-boundary);
      const shoulderR=Math.min(G.inverseR,roomRight*.46,G.railH*.27);
      const lowerR=Math.min(G.lowerR,Math.max(0,boundary)*.28,G.railH*.29);

      return [
        'M 0 0',
        `H ${G.W}`,
        `V ${G.topH}`,
        `H ${boundary+shoulderR}`,
        `Q ${boundary} ${G.topH} ${boundary} ${G.topH+shoulderR}`,
        `V ${G.H-lowerR}`,
        `Q ${boundary} ${G.H} ${Math.max(0,boundary-lowerR)} ${G.H}`,
        'H 0',
        'Z'
      ].join(' ');
    }

    function mirrorTransform(){
      return mirrored ? `translate(${G.W} 0) scale(-1 1)` : '';
    }

    function secondaryMargin(depth,layout){
      if(depth===1 || depth===2) return G.secondarySmallPad;
      return layout.u;
    }

    function canonicalTextX(absIndex,depth,layout){
      const item=itemAt(absIndex) || items[normalizeIndex(absIndex)];
      if(depth===0) return G.mainLeftPad;

      const boundary=layout.B[Math.min(depth,layout.B.length-1)];
      const wordWidth=measureWord(item.title,G.fontSize);
      return boundary-secondaryMargin(depth,layout)-wordWidth;
    }

    function canonicalState(absIndex,depth,layout){
      const item=itemAt(absIndex) || items[normalizeIndex(absIndex)];
      const slot=Math.min(depth,layout.B.length-1);
      return {
        boundary:layout.B[slot],
        textX:canonicalTextX(absIndex,depth,layout),
        wordWidth:measureWord(item.title,G.fontSize)
      };
    }

    function physicalTextX(S){
      return mirrored ? G.W-S.textX-S.wordWidth : S.textX;
    }

    function layerMarkup(absIndex,depth,role,layout){
      const item=itemAt(absIndex);
      if(!item) return '';

      const S=canonicalState(absIndex,depth,layout);
      const colors=paletteAt(absIndex);
      const uid=`${instanceId}-${role}-${depth}`;
      const transform=mirrorTransform();

      return `
        <div
          class="prometeo-edge-stack__layer"
          data-role="${role}"
          data-depth="${depth}"
          data-index="${absIndex}"
          data-item-id="${escapeAttr(item.id)}"
          style="z-index:${role==='previous' ? 300 : 200-depth}"
        >
          <svg viewBox="0 0 ${G.W} ${G.H}" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id="${uid}" clipPathUnits="userSpaceOnUse">
                <path class="prometeo-edge-stack__clip" transform="${transform}" d="${canonicalLayerPath(S.boundary)}"></path>
              </clipPath>
            </defs>
            <path class="prometeo-edge-stack__shape" transform="${transform}" fill="${colors.bg}" d="${canonicalLayerPath(S.boundary)}"></path>
            <text
              class="prometeo-edge-stack__label"
              fill="${colors.fg}"
              x="${physicalTextX(S)}"
              y="${G.topH+G.railH*.54}"
              clip-path="url(#${uid})"
              style="font-size:${G.fontSize}px"
            >${escapeText(item.title)}</text>
          </svg>
        </div>`;
    }

    function escapeText(s){
      return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
    }

    function escapeAttr(s){
      return escapeText(s).replace(/"/g,'&quot;');
    }

    function all(){
      return [...element.querySelectorAll('.prometeo-edge-stack__layer')];
    }

    function front(){ return all().find(el=>el.dataset.role==='front'); }
    function previous(){ return all().find(el=>el.dataset.role==='previous'); }
    function rear(){ return all().filter(el=>el.dataset.role==='rear'); }

    function setState(el,S){
      if(!el) return;
      const d=canonicalLayerPath(S.boundary);
      const shape=el.querySelector('.prometeo-edge-stack__shape');
      const clip=el.querySelector('.prometeo-edge-stack__clip');
      const label=el.querySelector('.prometeo-edge-stack__label');
      if(shape) shape.setAttribute('d',d);
      if(clip) clip.setAttribute('d',d);
      if(label) label.setAttribute('x',physicalTextX(S));
    }

    function interpolateState(A,B,p){
      return {
        boundary:lerp(A.boundary,B.boundary,p),
        textX:lerp(A.textX,B.textX,p),
        wordWidth:A.wordWidth
      };
    }

    function canGoForward(){ return loop || current<items.length-1; }
    function canGoBackward(){ return loop || current>0; }

    function render(){
      if(destroyed) return;
      G=geometry();
      const layout=layoutFor(current);

      element.innerHTML=[
        layerMarkup(rawIndex(current+4),4,'rear',layout),
        layerMarkup(rawIndex(current+3),3,'rear',layout),
        layerMarkup(rawIndex(current+2),2,'rear',layout),
        layerMarkup(rawIndex(current+1),1,'rear',layout),
        layerMarkup(current,0,'front',layout),
        layerMarkup(rawIndex(current-1),0,'previous',layout)
      ].join('');

      reset();
    }

    function reset(){
      progress=0;
      const layout=layoutFor(current);
      const p=previous();
      const f=front();

      if(p) p.style.transform=`translate3d(0,${-(G.H+4)}px,0)`;
      if(f){
        f.style.transform='translate3d(0,0,0)';
        setState(f,canonicalState(current,0,layout));
      }

      rear().forEach(el=>{
        const depth=+el.dataset.depth;
        const absIndex=+el.dataset.index;
        el.style.transform='translate3d(0,0,0)';
        setState(el,canonicalState(absIndex,depth,layout));
      });
    }

    function forwardGeometry(p){
      if(!canGoForward()) return;
      const fromLayout=layoutFor(current);
      const toLayout=layoutFor(rawIndex(current+1));

      rear().forEach(el=>{
        const depth=+el.dataset.depth;
        const absIndex=+el.dataset.index;
        const A=canonicalState(absIndex,depth,fromLayout);
        const B=canonicalState(absIndex,Math.max(0,depth-1),toLayout);
        setState(el,interpolateState(A,B,p));
      });
    }

    function backwardGeometry(p){
      if(!canGoBackward()) return;
      const fromLayout=layoutFor(current);
      const target=rawIndex(current-1);
      const toLayout=layoutFor(target);

      setState(
        front(),
        interpolateState(
          canonicalState(current,0,fromLayout),
          canonicalState(current,1,toLayout),
          p
        )
      );

      rear().forEach(el=>{
        const depth=+el.dataset.depth;
        const absIndex=+el.dataset.index;
        setState(
          el,
          interpolateState(
            canonicalState(absIndex,depth,fromLayout),
            canonicalState(absIndex,Math.min(4,depth+1),toLayout),
            p
          )
        );
      });

      const prev=previous();
      if(prev) setState(prev,canonicalState(target,0,toLayout));
    }

    function applyDrag(dy){
      const travel=Math.max(120,G.H*.22);
      if(dy<=0){
        if(!canGoForward()) return;
        progress=clamp(-dy/travel,0,1);
        const f=front();
        if(f) f.style.transform=`translate3d(0,${Math.min(0,dy)}px,0)`;
        forwardGeometry(progress);
      }else{
        if(!canGoBackward()) return;
        progress=clamp(dy/travel,0,1);
        const p=previous();
        if(p) p.style.transform=`translate3d(0,${lerp(-(G.H+4),0,progress)}px,0)`;
        backwardGeometry(progress);
      }
    }

    function settle(dy,direction){
      if(state==='SETTLING' || destroyed) return;
      if(direction==='up' && !canGoForward()) direction=null;
      if(direction==='down' && !canGoBackward()) direction=null;

      state='SETTLING';
      const startP=progress;
      const start=performance.now();
      const duration=275;

      function frame(now){
        if(destroyed) return;
        const raw=clamp((now-start)/duration,0,1);
        const k=ease(raw);

        if(direction==='up'){
          const p=lerp(startP,1,k);
          const f=front();
          if(f) f.style.transform=`translate3d(0,${lerp(Math.min(0,dy),-(G.H+4),k)}px,0)`;
          forwardGeometry(p);
        }else if(direction==='down'){
          const p=lerp(startP,1,k);
          const startY=lerp(-(G.H+4),0,startP);
          const prev=previous();
          if(prev) prev.style.transform=`translate3d(0,${lerp(startY,0,k)}px,0)`;
          backwardGeometry(p);
        }else{
          const p=lerp(startP,0,k);
          if(dy<=0){
            const f=front();
            if(f) f.style.transform=`translate3d(0,${lerp(Math.min(0,dy),0,k)}px,0)`;
            if(canGoForward()) forwardGeometry(p);
          }else{
            const startY=lerp(-(G.H+4),0,startP);
            const prev=previous();
            if(prev) prev.style.transform=`translate3d(0,${lerp(startY,-(G.H+4),k)}px,0)`;
            if(canGoBackward()) backwardGeometry(p);
          }
        }

        if(raw<1){
          requestAnimationFrame(frame);
          return;
        }

        if(direction==='up'){
          current=normalizeIndex(current+1);
          render();
          emitChange();
        }else if(direction==='down'){
          current=normalizeIndex(current-1);
          render();
          emitChange();
        }else{
          reset();
        }

        gesture=null;
        progress=0;
        state='IDLE';
      }

      requestAnimationFrame(frame);
    }

    function emitChange(){
      if(onChange) onChange(itemAt(current),current);
    }

    function onPointerDown(e){
      if(state!=='IDLE' || destroyed) return;
      state='DRAGGING';
      gesture={id:e.pointerId,startY:e.clientY,lastY:e.clientY};
      element.classList.add('is-dragging');
      try{ element.setPointerCapture(e.pointerId); }catch{}
    }

    function onPointerMove(e){
      if(state!=='DRAGGING' || !gesture || e.pointerId!==gesture.id) return;
      gesture.lastY=e.clientY;
      applyDrag(e.clientY-gesture.startY);
    }

    function endGesture(e){
      if(state!=='DRAGGING' || !gesture || e.pointerId!==gesture.id) return;
      const dy=gesture.lastY-gesture.startY;
      const threshold=Math.max(48,G.H*.07);
      try{ element.releasePointerCapture(e.pointerId); }catch{}
      element.classList.remove('is-dragging');

      if(dy < -threshold && canGoForward()) settle(dy,'up');
      else if(dy > threshold && canGoBackward()) settle(dy,'down');
      else settle(dy,null);
    }

    function onWheel(e){
      if(state!=='IDLE' || wheelLock || Math.abs(e.deltaY)<18 || destroyed) return;
      const direction=e.deltaY>0 ? 'up' : 'down';
      if(direction==='up' && !canGoForward()) return;
      if(direction==='down' && !canGoBackward()) return;

      e.preventDefault();
      wheelLock=true;
      state='DRAGGING';
      progress=0;
      settle(0,direction);
      setTimeout(()=>{ wheelLock=false; },420);
    }

    function onResize(){
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        if(state==='IDLE' && !destroyed) render();
      },80);
    }

    element.addEventListener('pointerdown',onPointerDown);
    element.addEventListener('pointermove',onPointerMove);
    element.addEventListener('pointerup',endGesture);
    element.addEventListener('pointercancel',endGesture);
    element.addEventListener('wheel',onWheel,{passive:false});
    window.addEventListener('resize',onResize);

    G=geometry();
    render();

    return {
      get side(){ return side; },
      get index(){ return current; },
      get item(){ return itemAt(current); },
      refresh(){ if(state==='IDLE') render(); },
      destroy(){
        destroyed=true;
        clearTimeout(resizeTimer);
        element.removeEventListener('pointerdown',onPointerDown);
        element.removeEventListener('pointermove',onPointerMove);
        element.removeEventListener('pointerup',endGesture);
        element.removeEventListener('pointercancel',endGesture);
        element.removeEventListener('wheel',onWheel);
        window.removeEventListener('resize',onResize);
        element.classList.remove('is-dragging');
      }
    };
  }

  global.PrometeoEdgeStack={create};
})(window);
