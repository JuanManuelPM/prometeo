(()=>{
'use strict';

const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/modelos-room-audio-v2';
const CACHE_VERSION='push-scroll-lector-fusion-v2';
const MAX_CHARS=500;
const AHEAD=4;
const WORKERS=2;
const POST_MIN_GAP=3400;
const SPEEDS=[0.75,1,1.25,1.5,2];
const VOICES={
  julian:{id:'julian',name:'Julián',prompt:'Argentine male teacher. Warm medium-low voice, clear and patient. Natural Rioplatense Spanish. Explain as if to one student, with brief useful pauses. Same speaker throughout.'},
  clara:{id:'clara',name:'Clara',prompt:'Argentine female teacher. Warm clear medium voice, patient and precise. Natural Rioplatense Spanish. Lightly emphasize key ideas. Same speaker throughout.'},
  vera:{id:'vera',name:'Vera',prompt:'Buenos Aires woman. Mid-low voice, calm, dry and natural. Rioplatense Spanish. Read steadily and intimately. Same speaker throughout.'},
  milo:{id:'milo',name:'Milo',prompt:'Buenos Aires man. Medium-low slightly raspy voice, relaxed and natural. Rioplatense Spanish. Read steadily. Same speaker throughout.'}
};

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fmt=sec=>{sec=Math.max(0,Math.round(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`};
const safeGet=(k,f)=>{try{return localStorage.getItem(k)??f}catch{return f}};
const safeSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
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
      text=s.text;first=last=s;
    }else{
      if(!text)first=s;
      text=candidate;last=s;
    }
  }
  if(text)chunks.push({text,startPi:first.pi,endPi:last.pi,globalStart:first.start,globalEnd:last.end});

  const mount=el.querySelector('.chapter-audio');
  mount.innerHTML=`
    <div class="audio-track" role="slider" tabindex="0" aria-label="Progreso de audio del capítulo ${index+1}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="audio-buffer"></div>
      <div class="audio-fill"></div>
      <button class="audio-thumb" type="button" aria-label="Reproducir capítulo ${index+1}" data-playing="0">
        <svg class="play-icon" viewBox="0 0 12 14" aria-hidden="true"><path d="M2.2 1.5c0-.7.77-1.12 1.36-.75l7.1 4.45c.55.35.55 1.15 0 1.5l-7.1 4.45a.88.88 0 0 1-1.36-.75V1.5Z" fill="currentColor"/></svg>
        <svg class="pause-icon" viewBox="0 0 12 14" aria-hidden="true"><rect x="1" y="1" width="3" height="12" rx="1" fill="currentColor"/><rect x="8" y="1" width="3" height="12" rx="1" fill="currentColor"/></svg>
      </button>
    </div>
    <div class="audio-meta">
      <strong class="audio-time">0:00 / 0:00</strong>
      <span class="audio-status"></span>
      <button class="audio-settings-button" type="button" aria-label="Voz y velocidad del lector" aria-expanded="false">⚙︎</button>
    </div>
    <div class="audio-settings" hidden>
      <div class="setting-group">
        <div class="setting-label">Voz</div>
        <div class="choice-row voice-choices"></div>
      </div>
      <div class="setting-group">
        <div class="setting-label">Velocidad</div>
        <div class="choice-row speed-choices"></div>
      </div>
    </div>`;

  return {
    index,el,mount,
    numberTrack:el.querySelector('.number-track'),
    paragraphEls,paragraphs,offsets,totalChars:cursor,chunks,
    playhead:0,
    ui:{
      track:mount.querySelector('.audio-track'),
      buffer:mount.querySelector('.audio-buffer'),
      fill:mount.querySelector('.audio-fill'),
      thumb:mount.querySelector('.audio-thumb'),
      meta:mount.querySelector('.audio-meta'),
      time:mount.querySelector('.audio-time'),
      status:mount.querySelector('.audio-status'),
      settingsBtn:mount.querySelector('.audio-settings-button'),
      settings:mount.querySelector('.audio-settings'),
      voices:mount.querySelector('.voice-choices'),
      speeds:mount.querySelector('.speed-choices')
    }
  };
}

const chapters=[...document.querySelectorAll('.chapter')].map(buildChapter);
if(!chapters.length)return;

let speed=Number(safeGet('push-reader:v2:rate',1));
if(!SPEEDS.includes(speed))speed=1;
let voice=safeGet('push-reader:v2:voice','julian');
if(!VOICES[voice])voice='julian';

const state={
  chapter:null,current:0,intent:false,playing:false,audio:null,pendingFraction:0,
  clips:new Map(),queue:[],activeJobs:0,lastPost:0,postGate:Promise.resolve(),drag:null
};

const clipKey=(ci,v,i)=>`${ci}:${v}:${i}`;
function clip(ci,v,i){
  const k=clipKey(ci,v,i);
  if(!state.clips.has(k))state.clips.set(k,{status:'idle',audio:null,url:null,attempts:0});
  return state.clips.get(k);
}
function hash(s){
  let x=2166136261;
  for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}
  return(x>>>0).toString(36);
}
function messageId(ci,v,i){
  const c=chapters[ci].chunks[i];
  return `${CACHE_VERSION}-${ci}-${v}-${i}-${hash(VOICES[v].prompt+'|'+c.text)}`;
}

function paragraphForOffset(ch,off){
  for(let i=0;i<ch.paragraphs.length;i++){
    const start=ch.offsets[i],end=start+ch.paragraphs[i].length;
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
  ch.ui.track.style.top=`${top}px`;
  ch.ui.track.style.height=`${last-first}px`;
  ch.ui.meta.style.top=`${top}px`;
  ch.ui.settings.style.top=`${top+10}px`;
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
  try{a.playbackRate=speed;a.defaultPlaybackRate=speed;a.preservesPitch=true}catch{}
}
function applyAllRates(){
  applyRate(state.audio);
  for(const c of state.clips.values())applyRate(c.audio);
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
function bufferedOffset(ci){
  const ch=chapters[ci];
  const resolved=resolveOffset(ci);
  let end=ch.playhead;
  if(clip(ci,voice,resolved.idx).status==='ready')end=ch.chunks[resolved.idx].globalEnd;
  for(let i=resolved.idx+1;i<ch.chunks.length;i++){
    if(clip(ci,voice,i).status!=='ready')break;
    end=ch.chunks[i].globalEnd;
  }
  return clamp(end,0,ch.totalChars);
}
function estimatedSeconds(ci){
  const words=chapters[ci].paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return(words/155)*60/speed;
}
function totalSeconds(ci){
  const ch=chapters[ci];
  let total=0;
  for(let i=0;i<ch.chunks.length;i++){
    const a=clip(ci,voice,i).audio;
    if(!a||!Number.isFinite(a.duration))return estimatedSeconds(ci);
    total+=a.duration;
  }
  return total/speed;
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
    const by=rangeCenterAt(ch,bufferedOffset(ci));
    if(by!=null)ui.buffer.style.height=`${clamp(by-trackRect.top,0,trackRect.height)}px`;
  }

  const ratio=clamp(ch.playhead/Math.max(1,ch.totalChars),0,1);
  const tot=totalSeconds(ci);
  ui.time.textContent=`${fmt(tot*ratio)} / ${fmt(tot)}`;
  ui.track.setAttribute('aria-valuenow',String(Math.round(ratio*100)));

  const active=ci===state.chapter;
  const isPlaying=active&&state.playing;
  const isIntent=active&&state.intent;
  ui.thumb.dataset.playing=isPlaying?'1':'0';
  ui.thumb.setAttribute('aria-label',isPlaying?`Pausar capítulo ${ci+1}`:`Reproducir capítulo ${ci+1}`);

  const resolved=resolveOffset(ci);
  const cc=clip(ci,voice,resolved.idx);
  const loading=isIntent&&!isPlaying&&['queued','checking','generating','retrying'].includes(cc.status);
  ui.thumb.classList.toggle('loading',loading);
  ui.status.textContent=loading?'preparando…':bufferedOffset(ci)>=ch.totalChars-1?'audio listo':'';

  ch.el.classList.toggle('audio-active',active);
  ch.paragraphEls.forEach(p=>p.classList.remove('reading'));
  if(active&&(state.playing||state.intent)){
    const c=ch.chunks[state.current];
    if(c)for(let i=c.startPi;i<=c.endPi;i++)ch.paragraphEls[i]?.classList.add('reading');
  }
}
function updateAllUI(){chapters.forEach((_,i)=>updateChapterUI(i))}

function ensure(ci,v,i,priority=false){
  const ch=chapters[ci];
  if(!ch||i<0||i>=ch.chunks.length)return;
  const c=clip(ci,v,i);
  if(['ready','queued','checking','generating','retrying'].includes(c.status))return;
  c.status='queued';
  const job={ci,v,i};
  priority?state.queue.unshift(job):state.queue.push(job);
  pump();
  updateChapterUI(ci);
}
function maintainBuffer(){
  if(state.chapter==null)return;
  const ch=chapters[state.chapter];
  for(let i=state.current;i<Math.min(ch.chunks.length,state.current+AHEAD);i++)ensure(state.chapter,voice,i,i===state.current);
}
async function pump(){
  while(state.activeJobs<WORKERS&&state.queue.length){
    const job=state.queue.shift();
    state.activeJobs++;
    loadClip(job.ci,job.v,job.i).finally(()=>{state.activeJobs--;pump()});
  }
}
async function reservePost(){
  let release;
  const mine=new Promise(r=>release=r),prev=state.postGate;
  state.postGate=mine;
  await prev;
  const wait=Math.max(0,POST_MIN_GAP-(Date.now()-state.lastPost));
  if(wait)await sleep(wait);
  state.lastPost=Date.now();
  release();
}
async function loadClip(ci,v,i){
  const ch=chapters[ci],chunk=ch?.chunks[i],c=clip(ci,v,i);
  if(!chunk)return;
  const id=messageId(ci,v,i);
  c.status='checking';
  updateChapterUI(ci);
  try{
    const r=await fetch(`${API}?id=${encodeURIComponent(id)}`,{cache:'no-store'});
    if(r.ok){await acceptAudio(ci,v,i,c,r);return}
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
        body:JSON.stringify({voicePrompt:VOICES[v].prompt,text:chunk.text,messageId:id})
      });
      if(r.ok){await acceptAudio(ci,v,i,c,r);return}
      if(r.status===429){await sleep(12000);continue}
    }catch{}
    await sleep(Math.min(45000,4000+c.attempts*5000));
  }
}
async function acceptAudio(ci,v,i,c,r){
  const blob=await r.blob();
  if(c.url)try{URL.revokeObjectURL(c.url)}catch{}
  c.url=URL.createObjectURL(blob);
  c.audio=new Audio(c.url);
  c.audio.preload='auto';
  applyRate(c.audio);
  c.status='ready';
  updateChapterUI(ci);
  if(ci===state.chapter&&v===voice&&i===state.current&&state.intent)startCurrent();
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
  const ci=state.chapter,i=state.current;
  const c=clip(ci,voice,i);
  if(c.status!=='ready'){
    ensure(ci,voice,i,true);
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
      try{a.currentTime=(a.duration||0)*clamp(state.pendingFraction,0,1)}catch{}
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
}
function toggleChapter(ci){
  if(state.chapter===ci&&state.intent){
    snapshotActive();
    state.intent=false;
    state.audio?.pause();
    state.playing=false;
    updateAllUI();
    return;
  }
  startChapter(ci);
}
function advance(){
  if(state.chapter==null)return;
  const ci=state.chapter,ch=chapters[ci],c=ch.chunks[state.current];
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

function renderSettings(){
  chapters.forEach(ch=>{
    ch.ui.voices.innerHTML=Object.values(VOICES).map(v=>`<button type="button" class="choice${voice===v.id?' active':''}" data-voice="${v.id}">${v.name}</button>`).join('');
    ch.ui.speeds.innerHTML=SPEEDS.map(v=>`<button type="button" class="choice${speed===v?' active':''}" data-speed="${v}">${String(v).replace('.',',')}×</button>`).join('');
    ch.ui.voices.querySelectorAll('[data-voice]').forEach(b=>b.onclick=e=>{e.stopPropagation();selectVoice(b.dataset.voice)});
    ch.ui.speeds.querySelectorAll('[data-speed]').forEach(b=>b.onclick=e=>{e.stopPropagation();selectSpeed(Number(b.dataset.speed))});
  });
}
function selectVoice(v){
  if(!VOICES[v]||v===voice)return;
  snapshotActive();
  const resume=state.intent;
  state.audio?.pause();
  state.audio=null;
  state.playing=false;
  voice=v;
  safeSet('push-reader:v2:voice',voice);
  state.queue=state.queue.filter(j=>j.v===voice);
  renderSettings();
  if(state.chapter!=null&&resume){
    const resolved=resolveOffset(state.chapter);
    state.current=resolved.idx;
    state.pendingFraction=resolved.local;
    state.intent=true;
    maintainBuffer();
    startCurrent();
  }
  if(live)live.textContent=`Voz ${VOICES[voice].name}`;
  updateAllUI();
}
function selectSpeed(v){
  if(!SPEEDS.includes(v)||v===speed)return;
  speed=v;
  safeSet('push-reader:v2:rate',speed);
  applyAllRates();
  renderSettings();
  if(live)live.textContent=`Velocidad ${String(v).replace('.',',')} por`;
  updateAllUI();
}

chapters.forEach((ch,ci)=>{
  const ui=ch.ui;

  ui.settingsBtn.addEventListener('click',e=>{
    e.stopPropagation();
    const open=ui.settings.hidden;
    chapters.forEach(other=>{
      other.ui.settings.hidden=true;
      other.ui.settingsBtn.setAttribute('aria-expanded','false');
    });
    ui.settings.hidden=!open;
    ui.settingsBtn.setAttribute('aria-expanded',String(open));
    if(open)renderSettings();
  });

  ui.track.addEventListener('pointerdown',e=>{
    e.preventDefault();
    const onThumb=!!e.target.closest('.audio-thumb');
    const resume=state.chapter===ci&&state.intent;
    state.drag={ci,id:e.pointerId,startY:e.clientY,onThumb,moved:false,resume};
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
    if(e.key==='Enter'||e.key===' '){toggleChapter(ci);return}
    let ratio=chapters[ci].playhead/Math.max(1,chapters[ci].totalChars);
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
    if(resume){state.intent=true;startChapter(ci)}
  });
});

document.addEventListener('pointerdown',e=>{
  if(e.target.closest('.audio-settings')||e.target.closest('.audio-settings-button'))return;
  chapters.forEach(ch=>{
    ch.ui.settings.hidden=true;
    ch.ui.settingsBtn.setAttribute('aria-expanded','false');
  });
});

let resizeRAF=0;
const scheduleGeometry=()=>{
  if(resizeRAF)return;
  resizeRAF=requestAnimationFrame(()=>{resizeRAF=0;syncAllGeometry()});
};
window.addEventListener('resize',scheduleGeometry);
if(document.fonts?.ready)document.fonts.ready.then(scheduleGeometry);
if('ResizeObserver'in window){
  const ro=new ResizeObserver(scheduleGeometry);
  chapters.forEach(ch=>ro.observe(ch.el.querySelector('.text')));
}

renderSettings();
requestAnimationFrame(()=>requestAnimationFrame(syncAllGeometry));
setInterval(()=>{applyAllRates();if(!state.drag)updateAllUI()},350);
})();