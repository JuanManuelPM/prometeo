/* PROMETEO · SequenceTree v1. One graph recipe; vertical canvas across portrait/landscape.
   Shared VideoFrameGuard is the only media-visibility gate. No YouTube player UI. */
(function(){
'use strict';
const story=window.__QA_STORY||JSON.parse(document.getElementById('story-data').textContent);
const nodes=Object.fromEntries(story.nodes.map(n=>[n.id,n]));
const el=id=>document.getElementById(id);
const app=el('app'),film=el('film'),map=el('map'),scroller=el('scroll'),world=el('world'),nodeWrap=el('nodes'),reward=el('reward');
const slate=el('slate'),back=el('back'),warning=el('warning'),ending=el('ending');
const frameGuard=window.PrometeoVideoFrameGuard.create(film);
const storageKey='prometeo-secuencia-branching/'+story.id;
const watched=new Set();const completed=new Set();
let mediaSource=null,objectURL=null,current=null,phase='map',epoch=0;
let mapOffset=0,frameReady=false,started=false,slateDone=false,clipTicker=0,fadeTimer=0,frameTimeout=0,bufferTimer=0;
let layoutItems=[],layoutRewardTop=0;
try {let d=JSON.parse(sessionStorage.getItem(storageKey)||'{}');for(let id of d.watched||[])if(nodes[id])watched.add(id)}catch(e){}
function save(){try{sessionStorage.setItem(storageKey,JSON.stringify({watched:[...watched],completed:[...completed]}))}catch(e){}}
function refreshCompleted(){completed.clear();for(let p of story.paths)if(watched.has(p.completionNode))completed.add(p.id)}
refreshCompleted();
function text(node,value){node.textContent=value}
function time(sec){const t=Math.floor(sec);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function pos(div){const a=div.getBoundingClientRect(),b=world.getBoundingClientRect();return{x:a.left-b.left,y:a.top-b.top,w:a.width,h:a.height,cx:a.left-b.left+a.width/2,cy:a.top-b.top+a.height/2}}
function escapeAttribute(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function branchOrder(p){
  const assigned=story.nodes.filter(n=>n.path===p.id);const ordered=[],visited=new Set();
  let cursor=nodes[p.entry];
  while(cursor&&cursor.path===p.id&&!visited.has(cursor.id)){
    ordered.push(cursor);visited.add(cursor.id);
    const next=cursor.choices.find(c=>nodes[c.to]?.path===p.id&&!visited.has(c.to));
    cursor=next?nodes[next.to]:null;
  }
  for(const n of assigned)if(!visited.has(n.id))ordered.push(n);
  return ordered;
}
function makeNode(n,index,total,isEntry){
  const b=document.createElement('button');b.type='button';b.className='tree-node'+(isEntry?' emphasis':'');b.dataset.node=n.id;b.setAttribute('aria-label',n.label||n.title);
  const top=document.createElement('span');top.className='node-top';const no=document.createElement('span');no.textContent=String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');const badge=document.createElement('span');badge.textContent=watched.has(n.id)?'✓':'◇';top.append(no,badge);
  const title=document.createElement('strong');title.className='node-title';title.textContent=n.label||n.title;
  const foot=document.createElement('span');foot.className='node-bottom';const stamp=document.createElement('span');stamp.textContent=time(n.start)+'  ·  '+Math.round(n.end-n.start)+'S';const arrow=document.createElement('b');arrow.textContent='↗';foot.append(stamp,arrow);
  b.append(top,title,foot);b.classList.toggle('watched',watched.has(n.id));b.addEventListener('click',()=>enterNode(n.id));
  return b;
}
function renderTree(){
  nodeWrap.replaceChildren();layoutItems=[];
  const width=world.clientWidth,mobile=window.matchMedia('(max-width:650px)').matches;
  const size=mobile?Math.max(148,Math.min(190,Math.round(width*.425))):Math.min(405,Math.round(width*.38));
  const margin=Math.max(12,Math.min(48,Math.round(width*.042)));
  const compact=!mobile&&window.innerHeight<=540;
  let y=mobile?364:(compact?272:407);const step=mobile?214:(compact?204:246),groupGap=mobile?142:(compact?118:168);
  const total=story.nodes.length;let index=0;
  story.paths.forEach((path,pIndex)=>{
    let list=branchOrder(path);
    for(let j=0;j<list.length;j++){
      const n=list[j],b=makeNode(n,index,total,j===0);index++;
      const side=pIndex%2?'right':'left';
      b.style.width=size+'px';b.style.left=(side==='left'?margin:width-margin-size)+'px';b.style.top=y+'px';
      b.dataset.side=side;b.dataset.path=path.id;nodeWrap.append(b);
      const parent=j?list.slice(0,j).reverse().find(prev=>prev.choices.some(choice=>choice.to===n.id)):null;
      layoutItems.push({node:n,el:b,first:!parent,parent:parent?.id||null});
      y+=step;
    }
    y+=groupGap;
  });
  layoutRewardTop=y+13;reward.style.top=layoutRewardTop+'px';
  world.style.height=(layoutRewardTop+(mobile?250:300))+'px';
  refreshLabels();
  requestAnimationFrame(drawEdges);
}
function drawEdges(){
  const w=world.clientWidth,h=world.clientHeight,cx=w/2;
  const source=pos(el('root')),last=pos(reward);
  const stroke='#94a88c',muted='#52644f';const out=[];
  // Single vertical spine, the same direction regardless of device orientation.
  out.push('<path d="M '+cx.toFixed(1)+' '+source.y.toFixed(1)+' L '+cx.toFixed(1)+' '+last.y.toFixed(1)+'" stroke="'+muted+'" stroke-width="2" fill="none"/>');
  for(let i=0;i<layoutItems.length;i++){
    const item=layoutItems[i],a=pos(item.el),side=item.el.dataset.side;
    if(item.first){
      const dest=side==='left'?a.x+a.w:a.x,y=a.y+Math.min(a.h*.48,72);
      const d='M '+cx.toFixed(1)+' '+y.toFixed(1)+' C '+(cx+(dest-cx)*.4).toFixed(1)+' '+y.toFixed(1)+', '+(cx+(dest-cx)*.67).toFixed(1)+' '+y.toFixed(1)+', '+dest.toFixed(1)+' '+y.toFixed(1);
      out.push('<path d="'+d+'" stroke="'+stroke+'" stroke-width="2" fill="none"/>');
      out.push('<circle cx="'+cx.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="#c6d7b0"/>');
    }else{
      const parent=layoutItems.find(z=>z.node.id===item.parent);
      if(parent){const p=pos(parent.el);const y1=p.y+p.h,x1=p.cx,x2=a.cx,y2=a.y;
        out.push('<path d="M '+x1.toFixed(1)+' '+y1.toFixed(1)+' C '+x1.toFixed(1)+' '+((y1+y2)/2).toFixed(1)+', '+x2.toFixed(1)+' '+((y1+y2)/2).toFixed(1)+', '+x2.toFixed(1)+' '+y2.toFixed(1)+'" stroke="'+stroke+'" stroke-width="2" fill="none"/>');
      }
    }
  }
  out.push('<circle cx="'+cx.toFixed(1)+'" cy="'+last.y.toFixed(1)+'" r="5" fill="'+(completed.size>=story.unlock.requiredCompletedPaths?'#d1dfb5':'#586958')+'"/>');
  el('lines').setAttribute('viewBox','0 0 '+w+' '+h);el('lines').innerHTML=out.join('');
}
function refreshLabels(){
  refreshCompleted();text(el('count'),String(watched.size).padStart(2,'0')+' / '+String(story.nodes.length).padStart(2,'0'));
  for(let item of layoutItems){const seen=watched.has(item.node.id);item.el.classList.toggle('watched',seen);item.el.setAttribute('aria-pressed',String(seen));item.el.querySelector('.node-top span:last-child').textContent=seen?'✓':'◇'}
  const available=completed.size>=story.unlock.requiredCompletedPaths;
  reward.disabled=!available;reward.classList.toggle('unlocked',available);reward.setAttribute('aria-label',available?'Abrir síntesis':'Síntesis bloqueada');
  text(el('reward-counter'),String(Math.min(completed.size,story.unlock.requiredCompletedPaths)).padStart(2,'0')+' / '+String(story.unlock.requiredCompletedPaths).padStart(2,'0'));
  drawEdges();
}
function sourceFromHash(){
  const u=new URLSearchParams(location.hash.slice(1)).get('src');if(!u)return null;
  try{const v=new URL(u);if(v.protocol==='https:'&&v.hostname==='storage.googleapis.com'&&v.pathname.startsWith('/vidiq-user-videos/')&&v.pathname.endsWith('.mp4'))return v.href}catch(e){}
  return null;
}
function setSource(src){mediaSource=src;film.src=src;film.load()}
function halt(){
  epoch++;frameGuard.cancel();clearTimeout(fadeTimer);clearTimeout(frameTimeout);clearTimeout(bufferTimer);clearInterval(clipTicker);
  fadeTimer=frameTimeout=bufferTimer=clipTicker=0;film.pause();frameReady=false;started=false;slateDone=false;el('buffer').classList.remove('open');
}
function closeOverlays(){slate.classList.remove('open');ending.classList.remove('open');warning.classList.remove('open');back.classList.remove('open')}
function returnTree(){halt();phase='map';closeOverlays();map.classList.remove('off');refreshLabels();requestAnimationFrame(()=>{scroller.scrollTop=mapOffset;drawEdges()})}
function showError(label){halt();phase='error';closeOverlays();text(el('warning-title'),label);map.classList.add('off');warning.classList.add('open');back.classList.add('open')}
function reveal(token){
 if(token!==epoch||phase!=='opening'||!frameReady||!started||!slateDone)return;
 if(!current||Math.abs(film.currentTime-current.start)>1.4)return;
 clearTimeout(frameTimeout);phase='video';slate.classList.remove('open');el('buffer').classList.remove('open');
 clearInterval(clipTicker);clipTicker=setInterval(checkEnd,80);checkEnd();
}
function checkEnd(){
 if(phase!=='video'||!current||film.paused||!frameGuard.ready())return;
 if(film.currentTime>=current.end-.09)finishClip();
}
function play(token){
 let p;try{p=film.play()}catch(e){showError('VIDEO BLOQUEADO');return}
 if(p&&typeof p.then==='function')p.then(()=>{if(token!==epoch)return;started=true;reveal(token)}).catch(()=>{if(token===epoch)showError('VIDEO BLOQUEADO')});
 else{started=true;reveal(token)}
}
function enterNode(id){
 const n=nodes[id];if(!n)return;
 mapOffset=scroller.scrollTop;halt();current=n;phase='opening';const token=epoch;
 map.classList.add('off');ending.classList.remove('open');warning.classList.remove('open');
 slate.classList.toggle('dark',n.path==='circuito');text(el('slate-code'),n.kicker);text(el('slate-title'),n.label||n.title);slate.classList.add('open');back.classList.add('open');
 if(!mediaSource){showError('VIDEO NO DISPONIBLE');return}
 try{frameGuard.arm(n.start,n.end,()=>{if(token!==epoch)return;frameReady=true;reveal(token)});film.currentTime=n.start}
 catch(e){showError('FRAGMENTO NO DISPONIBLE');return}
 // Every frame must be COMPOSITED before exposure. Do not treat audio as proof.
 frameTimeout=setTimeout(()=>{if(token===epoch&&phase==='opening')showError('IMAGEN NO DISPONIBLE')},Number(window.__QA_FRAME_TIMEOUT_MS)||14000);
 fadeTimer=setTimeout(()=>{if(token!==epoch)return;slateDone=true;reveal(token);bufferTimer=setTimeout(()=>{if(token===epoch&&phase==='opening')el('buffer').classList.add('open')},1300)},700);
 play(token);
}
function finishClip(){
 if(phase!=='video'||!current||!frameGuard.ready())return;
 watched.add(current.id);save();returnTree();
}
function openEnding(){
 if(completed.size<story.unlock.requiredCompletedPaths)return;
 mapOffset=scroller.scrollTop;halt();phase='ending';map.classList.add('off');closeOverlays();text(el('ending-title'),story.synthesis.headline);ending.classList.add('open');back.classList.add('open');
}
back.addEventListener('click',returnTree);
reward.addEventListener('click',openEnding);
el('reset').addEventListener('click',()=>{watched.clear();completed.clear();save();scroller.scrollTo({top:0,behavior:'instant'});mapOffset=0;refreshLabels()});
el('warning-return').addEventListener('click',returnTree);
el('choose-file').addEventListener('click',()=>el('file-input').click());
el('file-input').addEventListener('change',()=>{
 const file=el('file-input').files?.[0];if(!file)return;
 if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);setSource(objectURL);returnTree();
});
film.addEventListener('playing',()=>{if(phase==='opening'){started=true;reveal(epoch)}});
film.addEventListener('seeked',()=>{if(phase==='opening')reveal(epoch)});
film.addEventListener('timeupdate',checkEnd);
film.addEventListener('ended',()=>{if(phase==='video')finishClip()});
film.addEventListener('error',()=>{if(phase==='opening'||phase==='video')showError('ERROR DE VIDEO')});
film.addEventListener('contextmenu',e=>e.preventDefault());
scroller.addEventListener('scroll',()=>{if(phase==='map')mapOffset=scroller.scrollTop},{passive:true});
window.addEventListener('resize',()=>{const before=scroller.scrollTop;renderTree();requestAnimationFrame(()=>{scroller.scrollTop=before;drawEdges()})});
window.addEventListener('pagehide',()=>{if(objectURL)URL.revokeObjectURL(objectURL)});
const source=window.__QA_SRC||sourceFromHash();if(source)setSource(source);
renderTree();
window.__sequenceTreeQA={phase:()=>phase,video:film,story,watched:()=>[...watched],completed:()=>[...completed],unlocked:()=>completed.size>=story.unlock.requiredCompletedPaths,enterNode,returnTree,finishClip,openEnding,mapOffset:()=>mapOffset,frameProof:()=>frameGuard.evidence(),frameReady:()=>frameGuard.ready(),videoComposited:()=>frameGuard.composited(),nodeCount:()=>nodeWrap.querySelectorAll('.tree-node').length,scroll:scroller};
})();
