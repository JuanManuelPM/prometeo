(()=>{
'use strict';

const reader=document.getElementById('reader');
const readerSection=document.getElementById('readerSection');
const rail=document.getElementById('railTrack');
const railFill=document.getElementById('railFill');
const railThumb=document.getElementById('railThumb');
const trackFill=document.getElementById('trackFill');
const play=document.getElementById('playBtn');
if(!reader||!readerSection||!rail||!railFill||!railThumb||!trackFill||!play)return;

// The core rail snaps to each rendered line because every character on a line
// has essentially the same vertical coordinate. This layer turns that into a
// continuous reading path and reaches the next line slightly before its end.
const ANTICIPATE_START=.38;
const ANTICIPATE_END=.88;
const MAX_EXTRAPOLATE_MS=520;
const SMOOTH_MS=115;

let lines=[];
let totalChars=0;
let rebuildQueued=false;
let displayedY=null;
let lastFrame=performance.now();
let lastRawProgress=0;
let lastProgressChange=performance.now();
let progressVelocity=0;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoothstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};

function charRect(node,index){
  if(!node||!node.nodeValue?.length)return null;
  const i=clamp(index,0,node.nodeValue.length-1);
  const r=document.createRange();
  r.setStart(node,i);
  r.setEnd(node,Math.min(node.nodeValue.length,i+1));
  const rect=r.getBoundingClientRect();
  return rect.height?rect:null;
}

function rebuildLines(){
  rebuildQueued=false;
  if(readerSection.hidden)return;
  const out=[];
  let globalBase=0;
  const paras=[...reader.querySelectorAll('.para')];
  for(let pi=0;pi<paras.length;pi++){
    const node=paras[pi].firstChild;
    const text=node?.nodeValue||'';
    if(text.length){
      let current=null;
      for(let i=0;i<text.length;i++){
        const rect=charRect(node,i);
        if(!rect)continue;
        const y=rect.top+rect.height/2;
        if(!current||Math.abs(y-current.y)>2){
          if(current)out.push(current);
          current={start:globalBase+i,end:globalBase+i+1,y};
        }else{
          current.end=globalBase+i+1;
          // Average tiny raster/font differences without moving the line itself.
          current.y=current.y*.92+y*.08;
        }
      }
      if(current)out.push(current);
    }
    globalBase+=text.length;
    if(pi<paras.length-1)globalBase+=1; // matches the core paragraph separator
  }
  lines=out;
  totalChars=Math.max(1,globalBase);
  displayedY=null;
}

function queueRebuild(){
  if(rebuildQueued)return;
  rebuildQueued=true;
  requestAnimationFrame(()=>requestAnimationFrame(rebuildLines));
}

function rawProgress(){
  const p=parseFloat(trackFill.style.width||'0');
  return clamp((Number.isFinite(p)?p:0)/100,0,1);
}

function sampledProgress(now){
  const raw=rawProgress();
  if(Math.abs(raw-lastRawProgress)>.000001){
    const dt=Math.max(16,now-lastProgressChange);
    const instant=(raw-lastRawProgress)/dt;
    progressVelocity=progressVelocity*.55+instant*.45;
    lastRawProgress=raw;
    lastProgressChange=now;
  }
  const playing=play.dataset.playing==='1';
  if(!playing)return raw;
  const age=Math.min(MAX_EXTRAPOLATE_MS,Math.max(0,now-lastProgressChange));
  return clamp(raw+Math.max(0,progressVelocity)*age,0,1);
}

function pathY(progress){
  if(!lines.length)return null;
  const off=progress*totalChars;
  let lo=0,hi=lines.length-1,idx=lines.length-1;
  while(lo<=hi){
    const mid=(lo+hi)>>1;
    if(off<lines[mid].start){idx=mid;hi=mid-1}
    else if(off>=lines[mid].end){lo=mid+1}
    else{idx=mid;break}
  }
  const line=lines[idx];
  if(!line)return null;
  const next=lines[Math.min(idx+1,lines.length-1)];
  if(next===line)return line.y;
  const span=Math.max(1,line.end-line.start);
  const within=clamp((off-line.start)/span,0,1);
  const u=smoothstep((within-ANTICIPATE_START)/(ANTICIPATE_END-ANTICIPATE_START));
  return line.y+(next.y-line.y)*u;
}

function frame(now){
  const dt=Math.min(50,Math.max(1,now-lastFrame));
  lastFrame=now;
  if(!readerSection.hidden&&lines.length&&!railThumb.classList.contains('dragging')){
    const y=pathY(sampledProgress(now));
    if(y!=null){
      const rr=rail.getBoundingClientRect();
      const target=clamp(y-rr.top,0,rr.height);
      if(displayedY==null)displayedY=target;
      const a=1-Math.exp(-dt/SMOOTH_MS);
      displayedY+= (target-displayedY)*a;
      railThumb.style.top=`${displayedY}px`;
      railFill.style.height=`${displayedY}px`;
    }
  }
  requestAnimationFrame(frame);
}

// Remove the old delayed top/height transition; smoothing is now frame-based.
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
