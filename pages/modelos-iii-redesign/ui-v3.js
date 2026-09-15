(()=>{
'use strict';
/* V3 = sólo UI/flujo. La branch de audio sigue fuera de este trabajo. */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const txt=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();

function levelButtons(){return $$('#view-topic .levelnav [data-level-node]')}
function topicMeta(){
  const active=levelButtons().find(b=>b.classList.contains('active'))||levelButtons()[0];
  const n=parseInt((txt($('#view-topic .topicnum')).match(/\d+/)||['1'])[0],10)||1;
  return {id:active?.dataset.levelTopic||String(n),level:active?.dataset.levelNode||'quick',unit:n};
}
function statusFor(btn){
  if(!btn)return '';
  const id=btn.dataset.levelTopic||topicMeta().id, level=btn.dataset.levelNode;
  const good=$(`#view-topic [data-level-set="good"][data-level-id="${id}"][data-level="${level}"]`);
  const review=$(`#view-topic [data-level-set="review"][data-level-id="${id}"][data-level="${level}"]`);
  if(good?.classList.contains('active'))return 'good';
  if(review?.classList.contains('active'))return 'review';
  return '';
}

function ensureLevelBar(){
  const topic=$('#view-topic');if(!topic)return;
  const originals=levelButtons();if(!originals.length)return;
  let bar=$('.ui-levelbar',topic);
  if(!bar){
    bar=document.createElement('div');bar.className='ui-levelbar';
    const h=$('.topichead',topic);h?.after(bar);
  }
  bar.innerHTML='';
  originals.forEach((b,i)=>{
    const n=document.createElement('button');n.type='button';n.className='ui-leveldot';n.textContent=String(i+1);n.title=`Nivel ${i+1}`;
    const st=statusFor(b);if(st)n.classList.add(st);if(b.classList.contains('active'))n.classList.add('active');
    n.onclick=()=>{b.click();setTimeout(sync,20)};
    bar.appendChild(n);
  });
}

function unitSources(){
  let els=$$('.memorystrip .memoryitem');
  if(els.length)return els;
  return $$('#view-map .chainitem');
}
function currentUnitIndex(){
  const els=unitSources();if(!els.length)return 0;
  let i=els.findIndex(e=>e.classList.contains('current')||e.classList.contains('active'));
  if(i>=0)return i;
  const n=topicMeta().unit;return Math.max(0,Math.min(els.length-1,n-1));
}
function ensureUnitLabel(){
  const topic=$('#view-topic');if(!topic)return;
  const els=unitSources(),count=els.length||7,idx=currentUnitIndex();
  let row=$('.ui-mobile-unit',topic);
  if(!row){row=document.createElement('div');row.className='ui-mobile-unit';$('.topichead',topic)?.before(row)}
  row.innerHTML=`<span>U${idx+1} / ${count}</span><span class="swipehint">deslizá ↔</span>`;
}

function smallestExactText(label){
  const want=label.toLowerCase();
  const all=$$('body *').filter(e=>txt(e).toLowerCase()===want);
  if(!all.length)return null;
  return all.sort((a,b)=>a.children.length-b.children.length)[0];
}
function hideUnwantedTabs(){
  ['parcial','audio'].forEach(label=>{
    const el=smallestExactText(label);if(!el)return;
    const target=el.closest('button,a,[role="button"],li')||el;
    target.classList.add('ui-old-progress-hidden');
  });
}

function hideOldHeaderProgress(){
  const candidates=$$('body div,body span,body section');
  candidates.forEach(el=>{
    if(el.classList.contains('ui-levelbar')||el.classList.contains('ui-flowbar')||el.closest('.ui-wb'))return;
    const r=el.getBoundingClientRect();if(!r.width||!r.height)return;
    if(r.top<0||r.top>190||r.width<120||r.height>32)return;
    const meaningful=txt(el);if(meaningful.length>4)return;
    const kids=el.querySelectorAll('i,span,b,em').length;
    if(kids>=12)el.classList.add('ui-old-progress-hidden');
  });
}

function mapHardFix(){
  $$('#view-map .chainitem').forEach(item=>{
    item.style.setProperty('display','block','important');
    item.style.setProperty('width','100%','important');
    item.style.setProperty('max-width','none','important');
    const main=$('.chainmain',item);if(main){main.style.setProperty('display','block','important');main.style.setProperty('width','100%','important');main.style.setProperty('max-width','none','important')}
    $$('.mapthumbbtn,.empty-sketch,.levelmarks',item).forEach(x=>x.style.setProperty('display','none','important'));
  });
}

function navigateUnit(delta){
  if(delta>0){
    const next=$('#nextTopic');if(next){next.click();setTimeout(sync,30);return true}
  }else{
    const prev=$('#prevTopic');if(prev){prev.click();setTimeout(sync,30);return true}
  }
  const units=unitSources();if(!units.length)return false;
  const i=currentUnitIndex(),j=Math.max(0,Math.min(units.length-1,i+delta));if(i===j)return false;
  const u=units[j],clickable=$('button,a,[role="button"]',u)||u;clickable.click();setTimeout(sync,30);return true;
}

let gesture=null;
function installSwipe(){
  const main=$('#view-topic .topic-main');if(!main||main.dataset.swipeV3)return;main.dataset.swipeV3='1';
  main.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch')return;
    if(e.target.closest('button,a,input,textarea,select,canvas,[contenteditable],.ui-wb'))return;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0,horizontal:false};
  },{passive:true});
  main.addEventListener('pointermove',e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    gesture.dx=e.clientX-gesture.x;gesture.dy=e.clientY-gesture.y;
    if(!gesture.horizontal&&Math.abs(gesture.dx)>12&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.2)gesture.horizontal=true;
    if(!gesture.horizontal)return;
    e.preventDefault();main.classList.add('ui-dragging');
    const resisted=Math.max(-42,Math.min(42,gesture.dx*.22));main.style.transform=`translateX(${resisted}px)`;
  },{passive:false});
  const end=e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const g=gesture;gesture=null;main.classList.remove('ui-dragging');main.style.transform='';
    const valid=g.horizontal&&Math.abs(g.dx)>54&&Math.abs(g.dx)>Math.abs(g.dy)*1.25;
    if(!valid)return;
    const delta=g.dx<0?1:-1;
    main.classList.add(delta>0?'ui-swipe-out-left':'ui-swipe-out-right');
    setTimeout(()=>{navigateUnit(delta);main.classList.remove('ui-swipe-out-left','ui-swipe-out-right')},120);
  };
  main.addEventListener('pointerup',end,{passive:true});main.addEventListener('pointercancel',end,{passive:true});
}

function colorBottomState(){
  const meta=topicMeta();
  const good=$(`#view-topic [data-level-set="good"][data-level-id="${meta.id}"][data-level="${meta.level}"]`);
  const review=$(`#view-topic [data-level-set="review"][data-level-id="${meta.id}"][data-level="${meta.level}"]`);
  const gb=$('#uiFlowbar .ui-good'),rb=$('#uiFlowbar .ui-review');
  gb?.classList.toggle('selected',!!good?.classList.contains('active'));rb?.classList.toggle('selected',!!review?.classList.contains('active'));
}

function sync(){
  try{
    hideUnwantedTabs();hideOldHeaderProgress();mapHardFix();ensureLevelBar();ensureUnitLabel();installSwipe();colorBottomState();
    $('.ui-course-progress')?.classList.add('ui-old-progress-hidden');$('.ui-unitnav')?.classList.add('ui-old-progress-hidden');
  }catch(e){console.warn('UI v3',e)}
}

document.addEventListener('click',()=>setTimeout(sync,0),true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sync,30)});
window.addEventListener('resize',()=>setTimeout(sync,30));
const root=$('.main')||document.body;new MutationObserver(()=>requestAnimationFrame(sync)).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
setTimeout(sync,0);setTimeout(sync,250);setTimeout(sync,900);setTimeout(sync,1800);
})();
