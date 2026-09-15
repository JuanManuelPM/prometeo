(()=>{
'use strict';
/* UI Lab v2: no modifica audio ni contenido canónico. Lo oculta en esta rama visual y reorganiza estudio/whiteboard. */

const SVG={
 board:'<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
 close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 theory:'<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h4"/></svg>',
 pen:'<svg viewBox="0 0 24 24"><path d="M4 20l4.2-1 10-10-3.2-3.2-10 10L4 20zM13.8 7l3.2 3.2"/></svg>',
 high:'<svg viewBox="0 0 24 24"><path d="M5 16l7-10 6 4-7 10H5zM4 21h16"/></svg>',
 erase:'<svg viewBox="0 0 24 24"><path d="M5 15l7-8 7 6-6 7H8l-3-3zM12 20h7"/></svg>',
 arrow:'<svg viewBox="0 0 24 24"><path d="M4 20L19 5M12 5h7v7"/></svg>',
 undo:'<svg viewBox="0 0 24 24"><path d="M9 8H4V3M4 8c3-4 9-5 13-1 4 4 3 10-1 13"/></svg>',
 trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>'
};

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const norm=s=>(s||'').replace(/\s+/g,' ').trim();
const esc=s=>(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function activeTopicMeta(){
  const active=$('#view-topic .levelnav [data-level-node].active');
  if(active)return {id:active.dataset.levelTopic||'1',level:active.dataset.levelNode||'quick'};
  const n=parseInt(norm($('#view-topic .topicnum')?.textContent).replace(/\D/g,''),10)||1;
  return {id:String(n),level:'quick'};
}
function authorityButton(status){
  const m=activeTopicMeta();
  return $(`#view-topic [data-level-set="${status}"][data-level-id="${m.id}"][data-level="${m.level}"]`);
}
function setAssessment(status){authorityButton(status)?.click();requestAnimationFrame(syncUI)}

function hideNoise(){
  $$('.readctl,[id*="audio" i],[class*="audio" i]').forEach(el=>el.classList.add('ui-hidden-by-v2'));
  $$('button,a').forEach(el=>{
    const t=norm(el.textContent).toLowerCase();
    if(t==='parcial'||t==='audio'||t==='escuchar'||t==='leer')el.classList.add('ui-hidden-by-v2');
  });
  $$('.progressline,.progressbar,.overall-progress,.overallProgress,.stage-dots,.stageDots').forEach(el=>el.classList.add('ui-hidden-by-v2'));
}

function sourceUnits(){
  let items=$$('.memorystrip .memoryitem');
  if(items.length)return items.map((el,i)=>({el,index:i,title:unitTitle(el,i),marks:$$('.levelmarks i',el)}));
  items=$$('#view-map .chainitem');
  return items.map((el,i)=>({el,index:i,title:norm($('.chaintitle',el)?.textContent)||`Unidad ${i+1}`,marks:$$('.levelmarks i',el)}));
}
function unitTitle(el,i){
  const raw=norm($('.memorylabel',el)?.textContent)||norm($('.chaintitle',el)?.textContent)||`Unidad ${i+1}`;
  return raw.replace(/^0?\d+[·.\-:\s]*/,'').trim()||`Unidad ${i+1}`;
}
function markClass(mark){
  if(!mark)return '';
  if(mark.classList.contains('good'))return 'good';
  if(mark.classList.contains('review'))return 'review';
  if(!mark.classList.contains('new'))return 'seen';
  return '';
}
function currentUnitIndex(units){
  let i=units.findIndex(u=>u.el.classList.contains('current')||u.el.classList.contains('active'));
  if(i>=0)return i;
  const n=parseInt(norm($('#view-topic .topicnum')?.textContent).replace(/\D/g,''),10);
  return Number.isFinite(n)?Math.max(0,Math.min(units.length-1,n-1)):0;
}

function ensureUnitNav(){
  const topic=$('#view-topic'); if(!topic)return;
  let nav=$('.ui-unitnav',topic);
  if(!nav){nav=document.createElement('div');nav.className='ui-unitnav';const anchor=$('.topichead',topic)||topic.firstElementChild;anchor?.before(nav)}
  const units=sourceUnits(); if(!units.length)return;
  const cur=currentUnitIndex(units);
  nav.innerHTML='';
  units.forEach((u,i)=>{
    const b=document.createElement('button');b.type='button';b.className='ui-unit'+(i===cur?' current':'');
    const marks=[0,1,2].map(k=>`<i class="ui-unit-step ${markClass(u.marks[k])}"></i>`).join('');
    b.innerHTML=`<span class="ui-unit-main"><span class="ui-unit-code">U${i+1}</span><span class="ui-unit-title">${esc(u.title)}</span></span><span class="ui-unit-steps">${marks}</span>`;
    b.addEventListener('click',()=>{
      const clickable=$('button,a',u.el);
      (clickable||u.el).click();
      setTimeout(syncUI,20);
    });
    nav.appendChild(b);
  });
  requestAnimationFrame(()=>nav.querySelector('.current')?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'}));
}

function ensureCourseProgress(){
  let box=$('.ui-course-progress');
  if(!box){
    box=document.createElement('div');box.className='ui-course-progress';
    const anchor=$('#view-map .map-wrap')||$('#view-topic .ui-unitnav')||$('.main');
    anchor?.before(box);
  }
  const units=sourceUnits(); if(!units.length){box.remove();return}
  const fills=units.map(u=>{
    const marks=[0,1,2].map(k=>markClass(u.marks[k]));
    const score=marks.reduce((a,m)=>a+(m==='good'?1:m==='review'||m==='seen'?.5:0),0);
    return Math.round((score/3)*100);
  });
  const finished=fills.filter(x=>x>=99).length;
  box.innerHTML=`<div class="ui-course-progress-head"><span>Estudio</span><span>${finished}/${units.length} unidades</span></div><div class="ui-course-track">${fills.map(f=>`<i class="ui-course-unit" style="--fill:${f}%"></i>`).join('')}</div><div class="ui-course-nums">${units.map((_,i)=>`<span>${i+1}</span>`).join('')}</div>`;
}

function mapStatuses(){
  $$('#view-map .chainitem').forEach(item=>{
    item.querySelector('.empty-sketch')?.classList.add('ui-hidden-by-v2');
    let label=$('.ui-map-status',item);
    if(!label){label=document.createElement('span');label.className='ui-map-status';$('.chainmain',item)?.appendChild(label)}
    const marks=$$('.levelmarks i',item);const hasReview=marks.some(x=>x.classList.contains('review'));const quick=marks[0];
    label.className='ui-map-status';
    if(hasReview){label.textContent='revisar';label.classList.add('review')}
    else if(quick?.classList.contains('good')){label.textContent='entendido';label.classList.add('good')}
    else if(quick&&!quick.classList.contains('new'))label.textContent='visto';else label.textContent='';
  });
}

function ensureFlowbar(){
  let bar=$('#uiFlowbar');
  if(!bar){bar=document.createElement('div');bar.id='uiFlowbar';bar.className='ui-flowbar';document.body.appendChild(bar)}
  if(!bar.dataset.v2){
    bar.dataset.v2='1';
    bar.innerHTML=`<button class="ui-review" type="button">No entendí</button><button class="ui-good" type="button">Entendí</button><button class="ui-board" type="button" aria-label="Pizarrón" title="Pizarrón">${SVG.board}</button><button class="ui-next" type="button">Siguiente →</button>`;
    $('.ui-review',bar).onclick=()=>setAssessment('review');
    $('.ui-good',bar).onclick=()=>setAssessment('good');
    $('.ui-board',bar).onclick=openWhiteboard;
    $('.ui-next',bar).onclick=()=>$('#nextTopic')?.click();
  }
  return bar;
}

/* ---------- WHITEBOARD V2 ---------- */
const WB={topic:'1',mode:'pen',color:'#111111',state:null,canvas:null,ctx:null,drawing:null,arrowStart:null,penSeen:false,dragEmoji:null,palette:false};
const EMOJIS=['🧠','💡','🔁','⚠️','✅','❌','❓','⭐','📌','👤','👥','💬','🗣️','👁️','🌐','🧩','🔗','➡️','⬅️','↔️','🔄','➕','➖','❤️','🔥'];
function wbKey(){return `modelosIII_wb_ui_v2_${WB.topic}`}
function loadWb(){try{WB.state=JSON.parse(localStorage.getItem(wbKey()))||{strokes:[],emojis:[]}}catch{WB.state={strokes:[],emojis:[]}};if(!Array.isArray(WB.state.strokes))WB.state.strokes=[];if(!Array.isArray(WB.state.emojis))WB.state.emojis=[]}
function saveWb(){try{localStorage.setItem(wbKey(),JSON.stringify(WB.state))}catch{}}

function ensureWhiteboard(){
  let root=$('#uiWhiteboard');if(root)return root;
  root=document.createElement('section');root.id='uiWhiteboard';root.className='ui-wb theory-hidden';
  root.innerHTML=`
    <div class="ui-wb-top">
      <div class="ui-wb-title"><button class="ui-wb-btn wb-close" title="Cerrar" aria-label="Cerrar">${SVG.close}</button><strong>Pizarrón</strong></div>
      <button class="ui-wb-btn wb-theory" title="Mostrar/ocultar teoría" aria-label="Teoría">${SVG.theory}</button>
      <button class="ui-wb-btn wb-tool active" data-tool="pen" title="Lápiz" aria-label="Lápiz">${SVG.pen}</button>
      <button class="ui-wb-btn wb-tool" data-tool="high" title="Resaltador" aria-label="Resaltador">${SVG.high}</button>
      <button class="ui-wb-btn wb-tool" data-tool="eraser" title="Goma" aria-label="Goma">${SVG.erase}</button>
      <button class="ui-wb-btn wb-tool" data-tool="arrow" title="Flecha" aria-label="Flecha">${SVG.arrow}</button>
      <button class="ui-wb-btn emoji wb-emoji-btn" title="Emoji" aria-label="Emoji">☺</button>
      <button class="ui-wb-color active" data-color="#111111" style="background:#111111" aria-label="Negro"></button>
      <button class="ui-wb-color" data-color="#2355d8" style="background:#2355d8" aria-label="Azul"></button>
      <button class="ui-wb-color" data-color="#d83737" style="background:#d83737" aria-label="Rojo"></button>
      <button class="ui-wb-btn wb-undo" title="Deshacer" aria-label="Deshacer">${SVG.undo}</button>
      <button class="ui-wb-btn wb-clear" title="Limpiar" aria-label="Limpiar">${SVG.trash}</button>
    </div>
    <div class="ui-wb-work">
      <aside class="ui-wb-theory"><div class="ui-wb-kicker">Tema actual</div><div class="ui-wb-theory-content"></div></aside>
      <div class="ui-wb-canvaswrap">
        <canvas class="ui-wb-canvas"></canvas>
        <div class="ui-wb-emojis"></div>
        <div class="ui-wb-palette">${EMOJIS.map(e=>`<button type="button" data-emoji="${e}">${e}</button>`).join('')}</div>
        <div class="ui-wb-hint">Apple Pencil / lápiz: dibuja · dedo: dibuja si no hay lápiz activo</div>
      </div>
    </div>`;
  document.body.appendChild(root);
  WB.canvas=$('.ui-wb-canvas',root);WB.ctx=WB.canvas.getContext('2d');
  $('.wb-close',root).onclick=closeWhiteboard;
  $('.wb-theory',root).onclick=()=>root.classList.toggle('theory-hidden');
  $$('.wb-tool',root).forEach(b=>b.onclick=()=>setWbMode(b.dataset.tool));
  $$('.ui-wb-color',root).forEach(b=>b.onclick=()=>{WB.color=b.dataset.color;$$('.ui-wb-color',root).forEach(x=>x.classList.toggle('active',x===b))});
  $('.wb-emoji-btn',root).onclick=()=>{$('.ui-wb-palette',root).classList.toggle('open')};
  $$('.ui-wb-palette button',root).forEach(b=>b.onclick=()=>{WB.mode='emoji';WB.emoji=b.dataset.emoji;$('.ui-wb-palette',root).classList.remove('open');syncWbTools()});
  $('.wb-undo',root).onclick=undoWb;
  $('.wb-clear',root).onclick=()=>{if(confirm('¿Limpiar este pizarrón?')){WB.state={strokes:[],emojis:[]};saveWb();renderWb()}};
  WB.canvas.addEventListener('pointerdown',wbDown,{passive:false});
  WB.canvas.addEventListener('pointermove',wbMove,{passive:false});
  WB.canvas.addEventListener('pointerup',wbUp,{passive:false});
  WB.canvas.addEventListener('pointercancel',wbUp,{passive:false});
  new ResizeObserver(resizeWb).observe($('.ui-wb-canvaswrap',root));
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('open'))closeWhiteboard()});
  return root;
}
function setWbMode(mode){WB.mode=mode;syncWbTools()}
function syncWbTools(){const root=ensureWhiteboard();$$('.wb-tool',root).forEach(b=>b.classList.toggle('active',b.dataset.tool===WB.mode));$('.wb-emoji-btn',root).classList.toggle('active',WB.mode==='emoji')}
function theoryHtml(){
  const topic=$('#view-topic'); if(!topic)return '';
  const title=norm($('.topichead h1',topic)?.textContent)||'Tema';
  const bits=[];
  ['.quickcopy','.deep-question','.keyline'].forEach(sel=>{const n=$(sel,topic);if(n&&n.offsetParent!==null)bits.push(n.cloneNode(true))});
  $$('.section',topic).forEach(n=>{if(n.offsetParent!==null&&bits.length<5)bits.push(n.cloneNode(true))});
  const wrap=document.createElement('div');bits.forEach(n=>{n.querySelectorAll('button,input,textarea,select,.boardsection,.readctl').forEach(x=>x.remove());wrap.appendChild(n)});
  return `<h2>${esc(title)}</h2>${wrap.innerHTML}`;
}
function openWhiteboard(){
  const root=ensureWhiteboard();const meta=activeTopicMeta();WB.topic=meta.id||'1';loadWb();$('.ui-wb-title strong',root).textContent=`Pizarrón · U${WB.topic}`;$('.ui-wb-theory-content',root).innerHTML=theoryHtml();
  const wide=matchMedia('(min-width:700px)').matches;root.classList.toggle('theory-hidden',!wide);root.classList.add('open');document.documentElement.style.overflow='hidden';setTimeout(()=>{resizeWb();renderWb()},30);
}
function closeWhiteboard(){const root=$('#uiWhiteboard');if(!root)return;root.classList.remove('open');document.documentElement.style.overflow='';saveWb()}
function resizeWb(){if(!WB.canvas)return;const r=WB.canvas.getBoundingClientRect();if(r.width<2||r.height<2)return;const d=Math.min(devicePixelRatio||1,2);WB.canvas.width=Math.round(r.width*d);WB.canvas.height=Math.round(r.height*d);WB.ctx.setTransform(d,0,0,d,0,0);renderWb()}
function canvasSize(){const r=WB.canvas.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,top:r.top}}
function pxy(ev){const s=canvasSize();return {x:(ev.clientX-s.left)/s.w,y:(ev.clientY-s.top)/s.h,p:ev.pressure||.5}}
function allowedPointer(ev){if(ev.pointerType==='pen'){WB.penSeen=true;return true}if(ev.pointerType==='touch'&&WB.penSeen)return false;return ev.isPrimary!==false}
function wbDown(ev){if(!allowedPointer(ev))return;ev.preventDefault();try{WB.canvas.setPointerCapture(ev.pointerId)}catch{};const p=pxy(ev);
  if(WB.mode==='emoji'){WB.state.emojis.push({id:Date.now()+Math.random(),char:WB.emoji||'💡',x:p.x,y:p.y,size:38,t:Date.now()});saveWb();renderWb();return}
  if(WB.mode==='eraser'){eraseAt(p);return}
  if(WB.mode==='arrow'){WB.arrowStart=p;WB.drawing={type:'arrow',color:WB.color,width:3,points:[p,p],t:Date.now()};renderWb();return}
  WB.drawing={type:WB.mode==='high'?'high':'pen',color:WB.mode==='high'?'#f4cf35':WB.color,width:WB.mode==='high'?18:3.2,points:[p],t:Date.now()};
}
function wbMove(ev){if(!allowedPointer(ev))return;if(!WB.drawing&&WB.mode!=='eraser')return;ev.preventDefault();const events=ev.getCoalescedEvents?ev.getCoalescedEvents():[ev];
  if(WB.mode==='eraser'&&ev.buttons){events.forEach(e=>eraseAt(pxy(e)));return}
  if(!WB.drawing)return;
  if(WB.drawing.type==='arrow'){WB.drawing.points[1]=pxy(ev)}else events.forEach(e=>WB.drawing.points.push(pxy(e)));renderWb();
}
function wbUp(ev){if(!WB.drawing)return;ev.preventDefault();if(WB.drawing.points.length>1){WB.state.strokes.push(WB.drawing);saveWb()}WB.drawing=null;WB.arrowStart=null;renderWb()}
function eraseAt(p){const s=canvasSize();const px=p.x*s.w,py=p.y*s.h;let best=-1,bestD=22;WB.state.strokes.forEach((st,i)=>st.points.forEach(q=>{const dx=q.x*s.w-px,dy=q.y*s.h-py,d=Math.hypot(dx,dy);if(d<bestD){bestD=d;best=i}}));if(best>=0){WB.state.strokes.splice(best,1);saveWb();renderWb()}}
function undoWb(){const all=[...WB.state.strokes.map((x,i)=>({kind:'s',i,t:x.t||0})),...WB.state.emojis.map((x,i)=>({kind:'e',i,t:x.t||0}))].sort((a,b)=>b.t-a.t);if(!all.length)return;const a=all[0];if(a.kind==='s')WB.state.strokes.splice(a.i,1);else WB.state.emojis.splice(a.i,1);saveWb();renderWb()}
function renderStroke(ctx,st,w,h){const pts=st.points;if(!pts?.length)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=st.color||'#111';ctx.lineWidth=st.width||3;if(st.type==='high'){ctx.globalAlpha=.34;ctx.globalCompositeOperation='multiply'}ctx.beginPath();ctx.moveTo(pts[0].x*w,pts[0].y*h);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x*w,pts[i].y*h);ctx.stroke();
  if(st.type==='arrow'&&pts.length>1){const a=pts[0],b=pts[pts.length-1],x=b.x*w,y=b.y*h,ang=Math.atan2((b.y-a.y)*h,(b.x-a.x)*w),len=14;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-len*Math.cos(ang-.55),y-len*Math.sin(ang-.55));ctx.moveTo(x,y);ctx.lineTo(x-len*Math.cos(ang+.55),y-len*Math.sin(ang+.55));ctx.stroke()}
  ctx.restore();
}
function renderWb(){if(!WB.ctx||!WB.canvas)return;const s=canvasSize(),ctx=WB.ctx;ctx.clearRect(0,0,s.w,s.h);WB.state?.strokes?.forEach(st=>renderStroke(ctx,st,s.w,s.h));if(WB.drawing)renderStroke(ctx,WB.drawing,s.w,s.h);renderEmojis()}
function renderEmojis(){const layer=$('.ui-wb-emojis');if(!layer||!WB.state)return;layer.innerHTML='';WB.state.emojis.forEach(e=>{const n=document.createElement('span');n.className='ui-wb-emoji';n.textContent=e.char;n.style.left=(e.x*100)+'%';n.style.top=(e.y*100)+'%';n.style.fontSize=(e.size||38)+'px';n.dataset.id=e.id;n.addEventListener('pointerdown',emojiDown,{passive:false});layer.appendChild(n)})}
function emojiDown(ev){if(ev.pointerType==='touch'&&WB.penSeen)return;ev.preventDefault();const id=ev.currentTarget.dataset.id;const e=WB.state.emojis.find(x=>String(x.id)===String(id));if(!e)return;const node=ev.currentTarget;try{node.setPointerCapture(ev.pointerId)}catch{};const move=x=>{x.preventDefault();const s=canvasSize();e.x=Math.max(0,Math.min(1,(x.clientX-s.left)/s.w));e.y=Math.max(0,Math.min(1,(x.clientY-s.top)/s.h));node.style.left=e.x*100+'%';node.style.top=e.y*100+'%'};const up=()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',up);node.removeEventListener('pointercancel',up);e.t=Date.now();saveWb()};node.addEventListener('pointermove',move,{passive:false});node.addEventListener('pointerup',up);node.addEventListener('pointercancel',up)}

function syncUI(){
  hideNoise();ensureUnitNav();ensureCourseProgress();mapStatuses();const bar=ensureFlowbar();
  const topic=$('#view-topic'),topicActive=!!topic?.classList.contains('active');document.body.classList.toggle('ui-topic-active',topicActive);
  if(topicActive){
    const good=authorityButton('good'),review=authorityButton('review');$('.ui-good',bar)?.classList.toggle('selected',!!good?.classList.contains('active'));$('.ui-review',bar)?.classList.toggle('selected',!!review?.classList.contains('active'));
    const next=$('#nextTopic'),nb=$('.ui-next',bar);if(nb)nb.textContent=norm(next?.textContent)||'Siguiente →';
  }
}

document.addEventListener('click',()=>setTimeout(syncUI,0),true);
document.addEventListener('keydown',()=>setTimeout(syncUI,0),true);
const main=$('.main');if(main)new MutationObserver(()=>requestAnimationFrame(syncUI)).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
setTimeout(syncUI,0);setTimeout(syncUI,400);setTimeout(syncUI,1100);
})();
