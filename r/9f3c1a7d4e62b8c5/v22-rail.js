(()=>{
'use strict';

const reader=document.getElementById('reader');
const readerSection=document.getElementById('readerSection');
const rail=document.getElementById('railTrack');
const railFill=document.getElementById('railFill');
const railThumb=document.getElementById('railThumb');
const trackFill=document.getElementById('trackFill');
if(!reader||!readerSection||!rail||!railFill||!railThumb||!trackFill)return;

// V22: the rail is intentionally discrete.
// It stays completely still while audio remains on a line, then the whole
// thumb makes one short transition to the next line slightly before wrap.
const ADVANCE_AT=.76;
const MOVE_MS=170;

let lines=[];
let totalChars=1;
let lineSpan=1;
let currentTargetIndex=-1;
let rebuildQueued=false;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

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
  currentTargetIndex=-1;
  updateTarget(true);
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

function targetLineIndex(p){
  if(!lines.length)return -1;
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
  if(!line)return -1;
  if(idx>=lines.length-1)return idx;

  // If progress is in a separator/gap, the following line is already the
  // correct visual destination. Otherwise advance shortly before line end.
  if(off>=line.end)return Math.min(idx+1,lines.length-1);
  const within=clamp((off-line.start)/Math.max(1,line.end-line.start),0,1);
  return within>=ADVANCE_AT?Math.min(idx+1,lines.length-1):idx;
}

function lineLocalY(index){
  if(index<0||!lines[index])return null;
  return clamp((lines[index].y/lineSpan)*rail.clientHeight,0,rail.clientHeight);
}

function updateTarget(immediate=false){
  if(readerSection.hidden||!lines.length||railThumb.classList.contains('dragging'))return;
  const idx=targetLineIndex(progress());
  if(idx<0||idx===currentTargetIndex)return;
  currentTargetIndex=idx;
  const y=lineLocalY(idx);
  if(y==null)return;

  if(immediate){
    const oldThumb=railThumb.style.transition;
    const oldFill=railFill.style.transition;
    railThumb.style.transition='none';
    railFill.style.transition='none';
    railThumb.style.top=`${y}px`;
    railFill.style.height=`${y}px`;
    // Force style application before restoring the one-shot transition.
    void railThumb.offsetHeight;
    railThumb.style.transition=oldThumb||`top ${MOVE_MS}ms cubic-bezier(.22,.72,.28,1), transform .12s ease`;
    railFill.style.transition=oldFill||`height ${MOVE_MS}ms cubic-bezier(.22,.72,.28,1)`;
  }else{
    railThumb.style.top=`${y}px`;
    railFill.style.height=`${y}px`;
  }
}

// One transition moves the entire thumb, including its play/pause glyph.
railThumb.style.transition=`top ${MOVE_MS}ms cubic-bezier(.22,.72,.28,1), transform .12s ease`;
railFill.style.transition=`height ${MOVE_MS}ms cubic-bezier(.22,.72,.28,1)`;
railThumb.style.willChange='top';
railFill.style.willChange='height';

// Audio progress is written into trackFill.style.width by the core player.
// Watching that value means no animation is tied to page scroll.
new MutationObserver(()=>updateTarget(false)).observe(trackFill,{attributes:true,attributeFilter:['style']});
new MutationObserver(queueRebuild).observe(readerSection,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(queueRebuild).observe(reader,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
if(window.ResizeObserver)new ResizeObserver(queueRebuild).observe(reader);
window.addEventListener('resize',queueRebuild,{passive:true});
if(document.fonts?.ready)document.fonts.ready.then(queueRebuild);

queueRebuild();
})();
