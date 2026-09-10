(()=>{
  const NS='study:v2:modelos-teorias-ii:whiteboard';
  const boards=new Map();
  const runtimes=new Map();
  const oldIds={socrates:'socrates',james:'james',tolman:'tolman',hixon:'hixon',bruner:'bruner',bordin:'bordin'};
  const slug=s=>String(s||'tema').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  const stateKey=id=>`${NS}:${id}`;
  const safeParse=(s,f)=>{try{return JSON.parse(s)}catch{return f}};
  function getState(id,title){
    if(boards.has(id))return boards.get(id);
    let state=safeParse(localStorage.getItem(stateKey(id)),null);
    if(!state){
      const legacy=oldIds[slug(title)];
      if(legacy) state=safeParse(localStorage.getItem(`study:v2:modelos-demo:topic:${legacy}:board`),null);
    }
    if(!state||!Array.isArray(state.strokes)) state={version:1,strokes:[]};
    boards.set(id,state);return state;
  }
  function save(id){localStorage.setItem(stateKey(id),JSON.stringify(boards.get(id)))}
  function color(){const cs=getComputedStyle(document.documentElement);return {bg:cs.getPropertyValue('--a').trim()||'#111321',ink:cs.getPropertyValue('--b').trim()||'#d8d0ff'}}
  function idFor(topic,index){const module=topic.closest('.module');const title=topic.querySelector('.topicTitle')?.textContent.trim()||`tema-${index+1}`;return `${module?.id||'M'}-${index+1}-${slug(title)}`}
  function makeMount(topic,id,title){
    const mount=document.createElement('div');
    mount.className='studyWBMount';mount.dataset.wbid=id;
    mount.innerHTML=`<div class="studyWBCompact"><button class="studyWBThumbCard" type="button" aria-label="Abrir dibujo de ${escapeHTML(title)}"><canvas class="studyWBThumb"></canvas></button><button class="studyWBOpen" type="button">pizarrón</button><span class="studyWBHint">dibujo / apunte visual del tema</span></div><div class="studyWBPanel"><div class="studyWBTop"><div class="studyWBTools"><button class="studyWBTool isActive" data-tool="pen" type="button">lápiz</button><button class="studyWBTool" data-tool="highlighter" type="button">resalta</button><button class="studyWBTool" data-tool="line" type="button">línea</button><button class="studyWBTool" data-tool="curve3" type="button">curva 3</button><button class="studyWBTool" data-tool="eraser" type="button">goma</button><button class="studyWBTool" data-tool="laser" type="button">láser</button><button class="studyWBTool" data-action="undo" type="button">↶</button><button class="studyWBTool" data-action="clear" type="button">limpiar</button></div><button class="studyWBClose" type="button">cerrar pizarrón</button></div><div class="studyWBCanvasShell"><canvas class="studyWBCanvas"></canvas><div class="studyWBLaser"></div><div class="studyWBCurveHint"></div></div></div>`;
    topic.appendChild(mount);
    const state=getState(id,title);topic.classList.toggle('studyWBHasDrawing',state.strokes.length>0);
    mount.addEventListener('click',e=>e.stopPropagation());
    mount.querySelector('.studyWBOpen').addEventListener('click',()=>openBoard(topic,mount));
    mount.querySelector('.studyWBThumbCard').addEventListener('click',()=>openBoard(topic,mount));
    mount.querySelector('.studyWBClose').addEventListener('click',()=>closeBoard(topic,mount));
    mount.querySelectorAll('[data-tool]').forEach(btn=>btn.addEventListener('click',()=>selectTool(mount,btn.dataset.tool,btn)));
    mount.querySelector('[data-action="undo"]').addEventListener('click',()=>undo(mount));
    mount.querySelector('[data-action="clear"]').addEventListener('click',()=>clearBoard(mount));
    requestAnimationFrame(()=>renderThumb(topic,mount));
    return mount;
  }
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function ensureTopicOpen(topic){
    if(topic.classList.contains('open'))return;
    const head=topic.querySelector('.topicHead');
    if(head)head.click();
    if(!topic.classList.contains('open'))topic.classList.add('open');
  }
  function openBoard(topic,mount){
    ensureTopicOpen(topic);mount.classList.add('studyWBOpenState');
    requestAnimationFrame(()=>{const rt=ensureRuntime(topic,mount);resize(rt);draw(rt);mount.scrollIntoView({behavior:'smooth',block:'nearest'})});
  }
  function closeBoard(topic,mount){
    const rt=runtimes.get(mount.dataset.wbid);if(rt){save(rt.id);drawThumb(rt)}
    mount.classList.remove('studyWBOpenState');
    const has=getState(mount.dataset.wbid,'').strokes.length>0;topic.classList.toggle('studyWBHasDrawing',has);renderThumb(topic,mount);
  }
  function selectTool(mount,tool,btn){const rt=ensureRuntime(mount.closest('.topic'),mount);rt.tool=tool;rt.pending=[];mount.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('isActive',x===btn));hint(rt);draw(rt)}
  function ensureRuntime(topic,mount){
    const id=mount.dataset.wbid;if(runtimes.has(id))return runtimes.get(id);
    const canvas=mount.querySelector('.studyWBCanvas'),shell=mount.querySelector('.studyWBCanvasShell');
    const rt={id,topic,mount,canvas,shell,ctx:canvas.getContext('2d'),tool:'pen',drawing:false,current:null,pending:[],history:[],laser:mount.querySelector('.studyWBLaser'),curveHint:mount.querySelector('.studyWBCurveHint')};
    runtimes.set(id,rt);wire(rt);
    if('ResizeObserver'in window)new ResizeObserver(()=>{if(mount.classList.contains('studyWBOpenState')){resize(rt);draw(rt)}}).observe(shell);
    return rt;
  }
  function pt(rt,e){const r=rt.canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height)),p:e.pressure||.5}}
  function hist(rt){rt.history.push(JSON.stringify(getState(rt.id,'').strokes));if(rt.history.length>40)rt.history.shift()}
  function wire(rt){
    const c=rt.canvas;c.addEventListener('contextmenu',e=>e.preventDefault());
    c.addEventListener('pointerdown',e=>{e.preventDefault();c.setPointerCapture?.(e.pointerId);const p=pt(rt,e);
      if(rt.tool==='laser'){laser(rt,e);return}
      if(rt.tool==='eraser'){hist(rt);rt.drawing=true;erase(rt,p);return}
      if(rt.tool==='curve3'){rt.pending.push(p);hint(rt);if(rt.pending.length===3){hist(rt);getState(rt.id,'').strokes.push({id:uid(),tool:'curve3',width:3,points:[...rt.pending]});rt.pending=[];save(rt.id);draw(rt);drawThumb(rt);hint(rt)}else draw(rt);return}
      hist(rt);rt.drawing=true;rt.current={id:uid(),tool:rt.tool,width:rt.tool==='highlighter'?12:3,points:[p]};draw(rt)
    });
    c.addEventListener('pointermove',e=>{if(rt.tool==='laser'){if(e.buttons||e.pointerType==='pen')laser(rt,e);return}if(!rt.drawing)return;const p=pt(rt,e);if(rt.tool==='eraser'){erase(rt,p);return}if(!rt.current)return;if(rt.current.tool==='line')rt.current.points=[rt.current.points[0],p];else rt.current.points.push(p);draw(rt)});
    const end=()=>{if(rt.tool==='laser'){hideLaser(rt);return}if(!rt.drawing)return;rt.drawing=false;if(rt.current){getState(rt.id,'').strokes.push(rt.current);rt.current=null}save(rt.id);draw(rt);drawThumb(rt);rt.topic.classList.toggle('studyWBHasDrawing',getState(rt.id,'').strokes.length>0)};
    c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('pointerleave',()=>{if(rt.tool==='laser')hideLaser(rt)});
  }
  function resize(rt){const r=rt.canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2.5);rt.w=Math.max(1,r.width);rt.h=Math.max(1,r.height);const w=Math.round(rt.w*d),h=Math.round(rt.h*d);if(rt.canvas.width!==w||rt.canvas.height!==h){rt.canvas.width=w;rt.canvas.height=h}rt.ctx.setTransform(d,0,0,d,0,0)}
  function stroke(ctx,s,w,h,ink,scale=1){const ps=s.points||[];if(!ps.length)return;ctx.save();ctx.strokeStyle=ink;ctx.fillStyle=ink;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(1,(s.width||3)*scale);if(s.tool==='highlighter')ctx.setLineDash([16*scale,7*scale]);if(s.tool==='curve3'&&ps.length>=3){ctx.beginPath();ctx.moveTo(ps[0].x*w,ps[0].y*h);ctx.quadraticCurveTo(ps[1].x*w,ps[1].y*h,ps[2].x*w,ps[2].y*h);ctx.stroke()}else if(s.tool==='line'&&ps.length>=2){ctx.beginPath();ctx.moveTo(ps[0].x*w,ps[0].y*h);ctx.lineTo(ps[1].x*w,ps[1].y*h);ctx.stroke()}else{ctx.beginPath();ctx.moveTo(ps[0].x*w,ps[0].y*h);for(let i=1;i<ps.length;i++)ctx.lineTo(ps[i].x*w,ps[i].y*h);if(ps.length===1){ctx.beginPath();ctx.arc(ps[0].x*w,ps[0].y*h,ctx.lineWidth/2,0,Math.PI*2);ctx.fill()}else ctx.stroke()}ctx.restore()}
  function draw(rt){resize(rt);const {bg,ink}=color();rt.ctx.clearRect(0,0,rt.w,rt.h);rt.ctx.fillStyle=bg;rt.ctx.fillRect(0,0,rt.w,rt.h);getState(rt.id,'').strokes.forEach(s=>stroke(rt.ctx,s,rt.w,rt.h,ink));if(rt.current)stroke(rt.ctx,rt.current,rt.w,rt.h,ink);if(rt.pending.length){rt.ctx.fillStyle=ink;rt.pending.forEach(p=>{rt.ctx.beginPath();rt.ctx.arc(p.x*rt.w,p.y*rt.h,3,0,Math.PI*2);rt.ctx.fill()})}}
  function renderThumb(topic,mount){const state=getState(mount.dataset.wbid,''),card=mount.querySelector('.studyWBThumbCard');topic.classList.toggle('studyWBHasDrawing',state.strokes.length>0);if(!state.strokes.length)return;const c=mount.querySelector('.studyWBThumb'),r=c.getBoundingClientRect();if(r.width<1||r.height<1)return;const d=Math.min(window.devicePixelRatio||1,2);c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);const ctx=c.getContext('2d');ctx.setTransform(d,0,0,d,0,0);const {bg,ink}=color();ctx.fillStyle=bg;ctx.fillRect(0,0,r.width,r.height);const sc=Math.max(.35,Math.min(.8,r.width/180));state.strokes.forEach(s=>stroke(ctx,s,r.width,r.height,ink,sc));card.style.display=''}
  function drawThumb(rt){renderThumb(rt.topic,rt.mount)}
  function undo(mount){const rt=ensureRuntime(mount.closest('.topic'),mount);if(!rt.history.length)return;getState(rt.id,'').strokes=JSON.parse(rt.history.pop());save(rt.id);draw(rt);drawThumb(rt);rt.topic.classList.toggle('studyWBHasDrawing',getState(rt.id,'').strokes.length>0)}
  function clearBoard(mount){const rt=ensureRuntime(mount.closest('.topic'),mount);hist(rt);getState(rt.id,'').strokes=[];rt.pending=[];save(rt.id);draw(rt);drawThumb(rt);rt.topic.classList.remove('studyWBHasDrawing');hint(rt)}
  function seg(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,c1=vx*wx+vy*wy;if(c1<=0)return Math.hypot(px-ax,py-ay);const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-bx,py-by);const t=c1/c2;return Math.hypot(px-(ax+t*vx),py-(ay+t*vy))}
  function distance(s,p){const a=s.points||[];if(!a.length)return 9;if(s.tool==='curve3'&&a.length>=3){let best=9,prev=a[0];for(let i=1;i<=24;i++){const t=i/24,q={x:(1-t)*(1-t)*a[0].x+2*(1-t)*t*a[1].x+t*t*a[2].x,y:(1-t)*(1-t)*a[0].y+2*(1-t)*t*a[1].y+t*t*a[2].y};best=Math.min(best,seg(p.x,p.y,prev.x,prev.y,q.x,q.y));prev=q}return best}let best=9;for(let i=1;i<a.length;i++)best=Math.min(best,seg(p.x,p.y,a[i-1].x,a[i-1].y,a[i].x,a[i].y));return a.length===1?Math.hypot(p.x-a[0].x,p.y-a[0].y):best}
  function erase(rt,p){const a=getState(rt.id,'').strokes;let at=-1,best=.035;for(let i=0;i<a.length;i++){const d=distance(a[i],p);if(d<best){best=d;at=i}}if(at>=0){a.splice(at,1);save(rt.id);draw(rt);drawThumb(rt);rt.topic.classList.toggle('studyWBHasDrawing',a.length>0)}}
  function laser(rt,e){const r=rt.shell.getBoundingClientRect();rt.laser.style.left=(e.clientX-r.left)+'px';rt.laser.style.top=(e.clientY-r.top)+'px';rt.laser.style.opacity='1';clearTimeout(rt.laserTimer);rt.laserTimer=setTimeout(()=>hideLaser(rt),600)}
  function hideLaser(rt){rt.laser.style.opacity='0'}
  function hint(rt){rt.curveHint.textContent=rt.tool==='curve3'?(rt.pending.length===0?'curva: inicio':rt.pending.length===1?'curva: control':'curva: final'):''}
  function uid(){return 's'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function install(){
    document.querySelectorAll('.module .topic').forEach((topic,i)=>{if(topic.querySelector(':scope>.studyWBMount'))return;const title=topic.querySelector('.topicTitle')?.textContent.trim()||`Tema ${i+1}`;makeMount(topic,idFor(topic,i),title)});
    const obs=new MutationObserver(list=>{for(const m of list){if(m.type==='attributes'&&m.target.classList?.contains('topic')&&!m.target.classList.contains('open')){const mount=m.target.querySelector(':scope>.studyWBMount');if(mount?.classList.contains('studyWBOpenState'))closeBoard(m.target,mount)}}});
    document.querySelectorAll('.module .topic').forEach(t=>obs.observe(t,{attributes:true,attributeFilter:['class']}));
    document.addEventListener('click',e=>{if(e.target.closest('.themeBtn,.themeChoice,.themeSwatch'))setTimeout(renderAll,60)},true);
    window.addEventListener('resize',()=>requestAnimationFrame(renderAll));
  }
  function renderAll(){document.querySelectorAll('.studyWBMount').forEach(m=>{const t=m.closest('.topic');renderThumb(t,m);const rt=runtimes.get(m.dataset.wbid);if(rt&&m.classList.contains('studyWBOpenState'))draw(rt)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
