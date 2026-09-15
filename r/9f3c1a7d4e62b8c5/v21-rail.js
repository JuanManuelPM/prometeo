(()=>{
'use strict';

const reader=document.getElementById('reader');
const readerSection=document.getElementById('readerSection');
const rail=document.getElementById('railTrack');
const railFill=document.getElementById('railFill');
const railThumb=document.getElementById('railThumb');
const trackFill=document.getElementById('trackFill');
if(!reader||!readerSection||!rail||!railFill||!railThumb||!trackFill)return;

// Stable rail: position depends only on audio progress, never on viewport scroll.
// We store every rendered line relative to the first line, so scrolling the page
// cannot alter the target position.
const MOVE_START=.64;
const MOVE_END=.92;
const FOLLOW_MS=105;

let lines=[];
let totalChars=1;
let lineSpan=1;
let displayedY=null;
let lastFrame=performance.now();
let rebuildQueued=false;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoothstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};

function charCenter(node,index){
  if(!node||!node.nodeValue?.length)return null;
  const i=clamp(index,0,node.nodeValue.length-1);
  const r=document.createRange();
  r.setStart(node,i);
  r.setEnd(node,Math.min(node.nodeValue.length,i+1));
  const rect=r.getBoundingClientRect();
  return rect.height?rect.top+rect.height/2:null;
}

function rebuildLines(){
  rebuildQueued=false;
  if(readerSection.hidden)return;

  const raw=[];
  let globalBase=0;
  const paras=[...reader.querySelectorAll('.para')];

  for(let pi=0;pi<paras.length;pi++){
    const node=paras[pi].firstChild;
    const text=node?.nodeValue||'';
    let current=null;

    for(let i=0;i<text.length;i++){
      const y=charCenter(node,i);
      if(y==null)continue;
      if(!current||Math.abs(y-current.y)>2){
        if(current)raw.push(current);
        current={start:globalBase+i,end:globalBase+i+1,y};
      }else{
        current.end=globalBase+i+1;
      }
    }
    if(current)raw.push(current);

    globalBase+=text.length;
    if(pi<paras.length-1)globalBase+=1;
  }

  if(!raw.length)return;
  const firstY=raw[0].y;
  const lastY=raw[raw.length-1].y;
  lineSpan=Math.max(1,lastY-firstY);
  lines=raw.map(x=>({...x,y:x.y-firstY}));
  totalChars=Math.max(1,globalBase);

  // Snap once after a real layout change (font size/family/opening), not on scroll.
  displayedY=null;
}

function queueRebuild(){
  if(rebuildQueued)return;
  rebuildQueued=true;
  requestAnimationFrame(()=>requestAnimationFrame(rebuildLines));
}

function progress(){
  const p=parseFloat(trackFill.style.width||'0');
  return clamp((Number.isFinite(p)?p:0)/100,0,1);
}

function pathY(p){
  if(!lines.length)return null;
  const off=p*totalChars;
  let lo=0,hi=lines.length-1,idx=lines.length-1;

  while(lo<=hi){
    const mid=(lo+hi)>>1;
    const line=lines[mid];
    if(off<line.start){idx=mid;hi=mid-1}
    else if(off>=line.end){lo=mid+1}
    else{idx=mid;break}
  }

  const line=lines[idx];
  if(!line)return null;
  const next=lines[Math.min(idx+1,lines.length-1)];
  if(next===line)return line.y;

  const span=Math.max(1,line.end-line.start);
  const within=clamp((off-line.start)/span,0,1);
  const u=smoothstep((within-MOVE_START)/(MOVE_END-MOVE_START));
  return line.y+(next.y-line.y)*u;
}

function frame(now){
  const dt=Math.min(50,Math.max(1,now-lastFrame));
  lastFrame=now;

  if(!readerSection.hidden&&lines.length&&!railThumb.classList.contains('dragging')){
    const y=pathY(progress());
    if(y!=null){
      // Scale the stable line-relative coordinate into the current rail height.
      const target=clamp((y/lineSpan)*rail.clientHeight,0,rail.clientHeight);
      if(displayedY==null)displayedY=target;
      const a=1-Math.exp(-dt/FOLLOW_MS);
      displayedY+=(target-displayedY)*a;
      railThumb.style.top=`${displayedY}px`;
      railFill.style.height=`${displayedY}px`;
    }
  }
  requestAnimationFrame(frame);
}

// Avoid CSS easing fighting with the frame-based follower.
railThumb.style.transition='transform .12s ease';
railFill.style.transition='none';

new MutationObserver(queueRebuild).observe(readerSection,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(queueRebuild).observe(reader,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
if(window.ResizeObserver)new ResizeObserver(queueRebuild).observe(reader);
window.addEventListener('resize',queueRebuild,{passive:true});
if(document.fonts?.ready)document.fonts.ready.then(queueRebuild);

queueRebuild();
requestAnimationFrame(frame);
})();
