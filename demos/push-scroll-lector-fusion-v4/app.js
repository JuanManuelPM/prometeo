(()=>{
'use strict';

const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/modelos-room-audio-v2';
const CACHE_VERSION='push-scroll-lector-fusion-v4';
const MAX_CHARS=500;
const AHEAD=5;
const WORKERS=2;
const POST_MIN_GAP=3400;
const VOICE={
  id:'julian',
  prompt:'Argentine male teacher. Warm medium-low voice, clear and patient. Natural Rioplatense Spanish. Explain as if to one student, with brief useful pauses. Same speaker throughout.'
};
const SPEED=1;

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sentenceSplit=text=>text.match(/[^.!?]+[.!?]+(?:[”»"])?|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[text];
const live=document.getElementById('statusLive');

function buildChapter(el,index){
  const paragraphEls=[...el.querySelectorAll('.text p')];
  const paragraphs=paragraphEls.map(p=>p.textContent.trim());
  const offsets=[];
  const sentences=[];
  let cursor=0;

  paragraphs.forEach((text,pi)=>{
    offsets[pi]=cursor;
    let local=0;
    for(const s of sentenceSplit(text)){
      const ix=text.indexOf(s,local);
      const start=cursor+Math.max(0,ix);
      sentences.push({text:s,pi,start,end:start+s.length});
      local=Math.max(local,ix+s.length);
    }
    cursor+=text.length+(pi<paragraphs.length-1?1:0);
  });

  const chunks=[];
  let text='',first=null,last=null;
  for(const s of sentences){
    const candidate=text?text+' '+s.text:s.text;
    if(text&&candidate.length>MAX_CHARS){
      chunks.push({text,startPi:first.pi,endPi:last.pi,globalStart:first.start,globalEnd:last.end});
      text=s.text;
      first=last=s;
    }else{
      if(!text)first=s;
      text=candidate;
      last=s;
    }
  }
  if(text)chunks.push({text,startPi:first.pi,endPi:last.pi,globalStart:first.start,globalEnd:last.end});

  const mount=el.querySelector('.chapter-audio');
  mount.innerHTML=`
    <div class="audio-track" role="slider" tabindex="0"
      aria-label="Progreso y reproducción del capítulo ${index+1}"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="audio-fill"></div>
      <button class="audio-thumb" type="button"
        aria-label="Reproducir capítulo ${index+1}" data-playing="0">
        <svg class="play-icon" viewBox="0 0 12 14" aria-hidden="true">
          <path d="M2.2 1.5c0-.7.77-1.12 1.36-.75l7.1 4.45c.55.35.55 1.15 0 1.5l-7.1 4.45a.88.88 0 0 1-1.36-.75V1.5Z" fill="currentColor"/>
        </svg>
        <svg class="pause-icon" viewBox="0 0 12 14" aria-hidden="true">
          <rect x="1" y="1" width="3" height="12" rx="1" fill="currentColor"/>
          <rect x="8" y="1" width="3" height="12" rx="1" fill="currentColor"/>
        </svg>
      </button>
    </div>`;

  return{
    index,
    el,
    mount,
    paragraphEls,
    paragraphs,
    offsets,
    totalChars:cursor,
    chunks,
    playhead:0,
    ui:{
      track:mount.querySelector('.audio-track'),
      fill:mount.querySelector('.audio-fill'),
      thumb:mount.querySelector('.audio-thumb')
    }
  };
}

const chapters=[...document.querySelectorAll('.chapter')].map(buildChapter);
if(!chapters.length)return;

const state={
  chapter:null,
  current:0,
  intent:false,
  playing:false,
  audio:null,
  pendingFraction:0,
  clips:new Map(),
  queue:[],
  activeJobs:0,
  lastPost:0,
  postGate:Promise.resolve(),
  drag:null
};

const clipKey=(ci,i)=>`${ci}:${i}`;
function clip(ci,i){
  const k=clipKey(ci,i);
  if(!state.clips.has(k))state.clips.set(k,{status:'idle',audio:null,url:null,attempts:0});
  return state.clips.get(k);
}
function hash(s){
  let x=2166136261;
  for(let i=0;i<s.length;i++){
    x^=s.charCodeAt(i);
    x=Math.imul(x,16777619);
  }
  return(x>>>0).toString(36);
}
function messageId(ci,i){
  const c=chapters[ci].chunks[i];
  return `${CACHE_VERSION}-${ci}-${i}-${hash(VOICE.prompt+'|'+c.text)}`;
}

function paragraphForOffset(ch,off){
  for(let i=0;i<ch.paragraphs.length;i++){
    const start=ch.offsets[i];
    const end=start+ch.paragraphs[i].length;
    if(off<=end)return i;
  }
  return ch.paragraphs.length-1;
}
function rangeCenterAt(ch,off){
  const pi=paragraphForOffset(ch,off);
  const p=ch.paragraphEls[pi];
  const node=p?.firstChild;
  if(!node||node.nodeType!==Node.TEXT_NODE||!node.nodeValue?.length)return null;

  const local=clamp(Math.round(off-ch.offsets[pi]),0,Math.max(0,node.nodeValue.length-1));
  const range=document.createRange();
  range.setStart(node,local);
  range.setEnd(node,Math.min(node.nodeValue.length,local+1));
  const rect=range.getBoundingClientRect();
  return rect.top+rect.height/2;
}

function syncGeometry(ch){
  const first=rangeCenterAt(ch,0);
  const last=rangeCenterAt(ch,Math.max(0,ch.totalChars-1));
  const base=ch.mount.getBoundingClientRect();
  if(first==null||last==null||last<=first)return;

  const top=first-base.top;
  const height=Math.max(1,last-first);
  ch.ui.track.style.top=`${top}px`;
  ch.ui.track.style.height=`${height}px`;
}
function syncAllGeometry(){
  chapters.forEach(syncGeometry);
  updateAllUI();
}

function resolveOffset(ci,offset=chapters[ci].playhead){
  const ch=chapters[ci];
  const target=clamp(offset,0,ch.totalChars);
  let idx=ch.chunks.findIndex(c=>target<=c.globalEnd);
  if(idx<0)idx=ch.chunks.length-1;
  const c=ch.chunks[idx];
  const local=clamp((target-c.globalStart)/Math.max(1,c.globalEnd-c.globalStart),0,1);
  return{idx,local};
}

function applyRate(a){
  if(!a)return;
  try{
    a.playbackRate=SPEED;
    a.defaultPlaybackRate=SPEED;
    a.preservesPitch=true;
  }catch{}
}

function snapshotActive(){
  if(state.chapter==null)return;
  const ch=chapters[state.chapter];
  const c=ch.chunks[state.current];
  if(!c)return;

  if(state.audio&&Number.isFinite(state.audio.duration)&&state.audio.duration>0){
    const f=clamp(state.audio.currentTime/state.audio.duration,0,1);
    ch.playhead=c.globalStart+(c.globalEnd-c.globalStart)*f;
  }else if(state.pendingFraction!=null){
    ch.playhead=c.globalStart+(c.globalEnd-c.globalStart)*state.pendingFraction;
  }
}

function updateChapterUI(ci){
  const ch=chapters[ci];
  const ui=ch.ui;
  if(ci===state.chapter)snapshotActive();

  const trackRect=ui.track.getBoundingClientRect();
  if(trackRect.height>0){
    const y=rangeCenterAt(ch,ch.playhead);
    if(y!=null){
      const local=clamp(y-trackRect.top,0,trackRect.height);
      ui.fill.style.height=`${local}px`;
      ui.thumb.style.top=`${local}px`;
    }
  }

  const ratio=clamp(ch.playhead/Math.max(1,ch.totalChars),0,1);
  ui.track.setAttribute('aria-valuenow',String(Math.round(ratio*100)));

  const active=ci===state.chapter;
  const isPlaying=active&&state.playing;
  const isIntent=active&&state.intent;

  ui.thumb.dataset.playing=isPlaying?'1':'0';
  ui.thumb.setAttribute('aria-label',isPlaying?`Pausar capítulo ${ci+1}`:`Reproducir capítulo ${ci+1}`);

  const resolved=resolveOffset(ci);
  const cc=clip(ci,resolved.idx);
  const loading=isIntent&&!isPlaying&&['queued','checking','generating','retrying'].includes(cc.status);
  ui.thumb.classList.toggle('loading',loading);

  ch.el.classList.toggle('audio-active',active);
  ch.paragraphEls.forEach(p=>p.classList.remove('reading'));
  if(active&&(state.playing||state.intent)){
    const pi=paragraphForOffset(ch,ch.playhead);
    ch.paragraphEls[pi]?.classList.add('reading');
  }
}
function updateAllUI(){
  chapters.forEach((_,i)=>updateChapterUI(i));
}

function ensure(ci,i,priority=false){
  const ch=chapters[ci];
  if(!ch||i<0||i>=ch.chunks.length)return;

  const c=clip(ci,i);
  if(['ready','queued','checking','generating','retrying'].includes(c.status))return;

  c.status='queued';
  const job={ci,i};
  priority?state.queue.unshift(job):state.queue.push(job);
  pump();
  updateChapterUI(ci);
}

function maintainBuffer(){
  if(state.chapter==null)return;

  let slots=AHEAD;
  const ch=chapters[state.chapter];

  for(let i=state.current;i<ch.chunks.length&&slots>0;i++,slots--){
    ensure(state.chapter,i,i===state.current);
  }

  let next=state.chapter+1;
  while(slots>0&&next<chapters.length){
    const nextCh=chapters[next];
    for(let i=0;i<nextCh.chunks.length&&slots>0;i++,slots--){
      ensure(next,i,false);
    }
    next++;
  }
}

async function pump(){
  while(state.activeJobs<WORKERS&&state.queue.length){
    const job=state.queue.shift();
    state.activeJobs++;
    loadClip(job.ci,job.i).finally(()=>{
      state.activeJobs--;
      pump();
    });
  }
}

async function reservePost(){
  let release;
  const mine=new Promise(r=>release=r);
  const prev=state.postGate;
  state.postGate=mine;
  await prev;

  const wait=Math.max(0,POST_MIN_GAP-(Date.now()-state.lastPost));
  if(wait)await sleep(wait);
  state.lastPost=Date.now();
  release();
}

async function loadClip(ci,i){
  const ch=chapters[ci];
  const chunk=ch?.chunks[i];
  const c=clip(ci,i);
  if(!chunk)return;

  const id=messageId(ci,i);
  c.status='checking';
  updateChapterUI(ci);

  try{
    const r=await fetch(`${API}?id=${encodeURIComponent(id)}`,{cache:'no-store'});
    if(r.ok){
      await acceptAudio(ci,i,c,r);
      return;
    }
  }catch{}

  for(;;){
    c.status=c.attempts?'retrying':'generating';
    c.attempts++;
    updateChapterUI(ci);
    await reservePost();

    try{
      const r=await fetch(API,{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({
          voicePrompt:VOICE.prompt,
          text:chunk.text,
          messageId:id
        })
      });

      if(r.ok){
        await acceptAudio(ci,i,c,r);
        return;
      }
      if(r.status===429){
        await sleep(12000);
        continue;
      }
    }catch{}

    await sleep(Math.min(45000,4000+c.attempts*5000));
  }
}

async function acceptAudio(ci,i,c,r){
  const blob=await r.blob();

  if(c.url){
    try{URL.revokeObjectURL(c.url)}catch{}
  }

  c.url=URL.createObjectURL(blob);
  c.audio=new Audio(c.url);
  c.audio.preload='auto';
  applyRate(c.audio);
  c.status='ready';
  updateChapterUI(ci);

  if(ci===state.chapter&&i===state.current&&state.intent){
    startCurrent();
  }
}

function bindAudio(a,ci,i){
  a.ontimeupdate=()=>{
    if(state.chapter!==ci||state.current!==i||state.audio!==a)return;
    snapshotActive();
    updateChapterUI(ci);
  };

  a.onended=()=>{
    if(state.chapter===ci&&state.current===i&&state.audio===a)advance();
  };

  a.onplay=()=>{
    if(state.chapter!==ci||state.current!==i||state.audio!==a)return;
    state.playing=true;
    updateAllUI();
  };

  a.onpause=()=>{
    if(state.chapter!==ci||state.current!==i||state.audio!==a)return;
    snapshotActive();
    if(!a.ended)state.playing=false;
    updateAllUI();
  };
}

function startCurrent(){
  if(state.chapter==null||!state.intent)return;

  const ci=state.chapter;
  const i=state.current;
  const c=clip(ci,i);

  if(c.status!=='ready'){
    ensure(ci,i,true);
    maintainBuffer();
    updateAllUI();
    return;
  }

  const a=c.audio;
  state.audio=a;
  applyRate(a);
  bindAudio(a,ci,i);

  const playNow=async()=>{
    if(state.chapter!==ci||state.current!==i||!state.intent||state.audio!==a)return;

    if(state.pendingFraction!=null&&Number.isFinite(a.duration)){
      try{
        a.currentTime=(a.duration||0)*clamp(state.pendingFraction,0,1);
      }catch{}
      state.pendingFraction=null;
    }

    try{
      await a.play();
      if(state.chapter===ci&&state.current===i&&state.audio===a){
        state.playing=true;
        maintainBuffer();
        updateAllUI();
      }
    }catch{
      if(state.chapter===ci&&state.current===i){
        state.playing=false;
        state.intent=false;
        updateAllUI();
      }
    }
  };

  if(Number.isFinite(a.duration))playNow();
  else a.addEventListener('loadedmetadata',playNow,{once:true});
}

function startChapter(ci){
  ci=clamp(ci,0,chapters.length-1);

  if(state.chapter!==ci){
    snapshotActive();
    state.audio?.pause();
    state.chapter=ci;
    state.audio=null;
    state.playing=false;
  }

  const resolved=resolveOffset(ci);
  state.current=resolved.idx;
  state.pendingFraction=resolved.local;
  state.intent=true;
  maintainBuffer();
  startCurrent();
  updateAllUI();

  if(live)live.textContent=`Reproduciendo capítulo ${ci+1}`;
}

function toggleChapter(ci){
  if(state.chapter===ci&&state.intent){
    snapshotActive();
    state.intent=false;
    state.audio?.pause();
    state.playing=false;
    updateAllUI();
    if(live)live.textContent=`Capítulo ${ci+1} pausado`;
    return;
  }
  startChapter(ci);
}

function advance(){
  if(state.chapter==null)return;

  const ci=state.chapter;
  const ch=chapters[ci];
  const c=ch.chunks[state.current];
  ch.playhead=c.globalEnd;

  if(state.current<ch.chunks.length-1){
    state.current++;
    state.pendingFraction=0;
    state.audio=null;
    state.playing=false;
    startCurrent();
    updateAllUI();
    return;
  }

  if(ci<chapters.length-1){
    ch.playhead=ch.totalChars;
    const next=ci+1;
    chapters[next].playhead=0;
    state.chapter=next;
    state.current=0;
    state.pendingFraction=0;
    state.audio=null;
    state.playing=false;

    if(state.intent){
      maintainBuffer();
      startCurrent();
    }
    updateAllUI();
    return;
  }

  state.intent=false;
  state.playing=false;
  state.audio=null;
  updateAllUI();
}

function setPlayhead(ci,ratio){
  const ch=chapters[ci];
  ch.playhead=clamp(ratio,0,1)*ch.totalChars;

  if(state.chapter===ci){
    state.audio?.pause();
    state.audio=null;
    state.playing=false;

    const resolved=resolveOffset(ci);
    state.current=resolved.idx;
    state.pendingFraction=resolved.local;
  }

  updateChapterUI(ci);
}

function ratioFromY(ch,y){
  const r=ch.ui.track.getBoundingClientRect();
  return clamp((y-r.top)/Math.max(1,r.height),0,1);
}

chapters.forEach((ch,ci)=>{
  const ui=ch.ui;

  ui.track.addEventListener('pointerdown',e=>{
    e.preventDefault();

    const onThumb=!!e.target.closest('.audio-thumb');
    const resume=state.chapter===ci&&state.intent;

    state.drag={
      ci,
      id:e.pointerId,
      startY:e.clientY,
      onThumb,
      moved:false,
      resume
    };

    try{ui.track.setPointerCapture(e.pointerId)}catch{}

    if(!onThumb){
      if(state.chapter===ci){
        snapshotActive();
        state.intent=false;
        state.audio?.pause();
      }

      setPlayhead(ci,ratioFromY(ch,e.clientY));
      ui.track.classList.add('dragging');
    }
  });

  ui.track.addEventListener('pointermove',e=>{
    const d=state.drag;
    if(!d||d.ci!==ci||d.id!==e.pointerId)return;

    if(Math.abs(e.clientY-d.startY)>4)d.moved=true;
    if(!d.moved)return;

    e.preventDefault();

    if(state.chapter===ci){
      snapshotActive();
      state.intent=false;
      state.audio?.pause();
    }

    setPlayhead(ci,ratioFromY(ch,e.clientY));
    ui.track.classList.add('dragging');
  });

  const endPointer=e=>{
    const d=state.drag;
    if(!d||d.ci!==ci||d.id!==e.pointerId)return;

    state.drag=null;
    ui.track.classList.remove('dragging');

    try{ui.track.releasePointerCapture(e.pointerId)}catch{}

    if(d.onThumb&&!d.moved){
      toggleChapter(ci);
      return;
    }

    if(state.chapter===ci&&d.resume){
      state.intent=true;
      startChapter(ci);
    }
  };

  ui.track.addEventListener('pointerup',endPointer);
  ui.track.addEventListener('pointercancel',endPointer);

  ui.track.addEventListener('keydown',e=>{
    if(!['ArrowUp','ArrowDown','Home','End','Enter',' '].includes(e.key))return;
    e.preventDefault();

    if(e.key==='Enter'||e.key===' '){
      toggleChapter(ci);
      return;
    }

    let ratio=ch.playhead/Math.max(1,ch.totalChars);
    if(e.key==='ArrowUp')ratio-=.04;
    if(e.key==='ArrowDown')ratio+=.04;
    if(e.key==='Home')ratio=0;
    if(e.key==='End')ratio=1;

    const resume=state.chapter===ci&&state.intent;

    if(state.chapter===ci){
      snapshotActive();
      state.intent=false;
      state.audio?.pause();
    }

    setPlayhead(ci,clamp(ratio,0,1));

    if(resume){
      state.intent=true;
      startChapter(ci);
    }
  });
});

let resizeRAF=0;
const scheduleGeometry=()=>{
  if(resizeRAF)return;
  resizeRAF=requestAnimationFrame(()=>{
    resizeRAF=0;
    syncAllGeometry();
  });
};

window.addEventListener('resize',scheduleGeometry);
if(document.fonts?.ready)document.fonts.ready.then(scheduleGeometry);

if('ResizeObserver'in window){
  const ro=new ResizeObserver(scheduleGeometry);
  chapters.forEach(ch=>ro.observe(ch.el.querySelector('.text')));
}

requestAnimationFrame(()=>requestAnimationFrame(syncAllGeometry));
setInterval(()=>{
  if(!state.drag)updateAllUI();
},350);
})();