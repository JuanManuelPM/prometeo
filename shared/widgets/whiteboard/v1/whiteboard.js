(() => {
  if(window.__PROMETEO_WHITEBOARD_V1__)return;
  window.__PROMETEO_WHITEBOARD_V1__=true;

  function mount(host=document.body){
    const board=document.createElement('section');
    board.className='p-board';
    board.dataset.open='false';
    board.setAttribute('aria-label','Pizarrón compartido');
    board.innerHTML=`
      <div class="p-board__handle" data-board-toggle>
        <strong>Pizarrón</strong>
        <div class="p-board__handle-actions">
          <button class="p-board__mini" data-board-clear aria-label="Limpiar">×</button>
          <button class="p-board__mini" data-board-full aria-label="Pantalla completa">↗</button>
          <button class="p-board__mini" data-board-toggle aria-label="Abrir o cerrar">—</button>
        </div>
      </div>
      <div class="p-board__tools" aria-label="Herramientas">
        <button class="p-board__tool" data-tool="laser" aria-pressed="true">Láser</button>
        <button class="p-board__tool" data-tool="pen" aria-pressed="false">Lápiz</button>
        <button class="p-board__tool" data-tool="highlighter" aria-pressed="false">Resaltar</button>
        <button class="p-board__tool" data-tool="eraser" aria-pressed="false">Goma</button>
        <button class="p-board__tool" data-board-undo>Deshacer</button>
      </div>
      <div class="p-board__sheet"><canvas aria-label="Superficie para dibujar"></canvas></div>`;
    host.appendChild(board);
    const canvas=board.querySelector('canvas');
    const ctx=canvas.getContext('2d');
    let tool='laser',drawing=false,last=null,strokes=[],current=[];

    function resize(){
      const rect=canvas.getBoundingClientRect();
      const dpr=Math.min(2,window.devicePixelRatio||1);
      canvas.width=Math.max(1,Math.round(rect.width*dpr));
      canvas.height=Math.max(1,Math.round(rect.height*dpr));
      ctx.setTransform(dpr,0,0,dpr,0,0);
      redraw();
    }
    function styleFor(name){
      if(name==='highlighter')return {color:'rgba(211,158,48,.35)',width:18};
      if(name==='eraser')return {color:'#f8f3e9',width:26};
      if(name==='laser')return {color:'#c43f30',width:4};
      return {color:'#26352d',width:3};
    }
    function paintStroke(stroke){
      if(stroke.points.length<2)return;
      const style=styleFor(stroke.tool);
      ctx.save();ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=style.color;ctx.lineWidth=style.width;ctx.lineCap='round';ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(stroke.points[0].x,stroke.points[0].y);
      stroke.points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.restore();
    }
    function redraw(){ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);strokes.forEach(paintStroke)}
    function point(event){const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top}}
    function begin(event){drawing=true;last=point(event);current=[last];canvas.setPointerCapture?.(event.pointerId)}
    function move(event){
      if(!drawing)return;const next=point(event);current.push(next);paintStroke({tool,points:[last,next]});last=next;
    }
    function end(event){
      if(!drawing)return;drawing=false;canvas.releasePointerCapture?.(event.pointerId);
      if(tool==='laser'){setTimeout(redraw,220);return}
      if(current.length>1)strokes.push({tool,points:current});current=[];
    }
    canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    board.addEventListener('click',event=>{
      if(event.target.closest('[data-board-clear]')){strokes=[];redraw();return}
      if(event.target.closest('[data-board-full]')){board.dataset.full=String(board.dataset.full!=='true');board.dataset.open='true';setTimeout(resize,300);return}
      if(event.target.closest('[data-board-undo]')){strokes.pop();redraw();return}
      if(event.target.closest('[data-board-toggle]')){board.dataset.open=String(board.dataset.open!=='true');setTimeout(resize,300);return}
      const button=event.target.closest('[data-tool]');
      if(button){tool=button.dataset.tool;board.querySelectorAll('[data-tool]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)))}
    });
    new ResizeObserver(resize).observe(canvas);setTimeout(resize);
    return board;
  }

  window.PrometeoWhiteboard=Object.freeze({version:'1',mount});
  document.addEventListener('DOMContentLoaded',()=>{if(document.body.hasAttribute('data-whiteboard'))mount()});
})();
