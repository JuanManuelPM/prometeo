(()=>{
'use strict';

const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/modelos-room-audio-v2';
const CACHE_VERSION='push-scroll-lector-fusion-v1';
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

const $=id=>document.getElementById(id);
const E={
  play:$('playBtn'),chapterLabel:$('activeChapterLabel'),track:$('progressTrack'),fill:$('progressFill'),buffer:$('progressBuffer'),thumb:$('progressThumb'),
  time:$('timeLabel'),total:$('totalTime'),bufferHint:$('bufferHint'),settingsBtn:$('settingsBtn'),settings:$('settingsPanel'),
  voices:$('voiceChoices'),speeds:$('speedChoices'),live:$('statusLive')
};
const chapterEls=[...document.querySelectorAll('.chapter')];
if(!E.play||!E.track||!chapterEls.length)return;

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fmt=sec=>{sec=Math.max(0,Math.round(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`};
const safeGet=(k,f)=>{try{return localStorage.getItem(k)??f}catch{return f}};
const safeSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
const sentenceSplit=text=>text.match(/[^.!?]+[.!?]+(?:[”»"])?|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[text];

function buildChapter(el){
  const paragraphs=[...el.querySelectorAll('.text p')].map(p=>p.textContent.trim());
  const offsets=[];const sentences=[];let cursor=0;
  paragraphs.forEach((text,pi)=>{
    offsets[pi]=cursor;let local=0;
    for(const s of sentenceSplit(text)){
      const ix=text.indexOf(s,local);const start=cursor+Math.max(0,ix);
      sentences.push({text:s,pi,start,end:start+s.length});
      local=Math.max(local,ix+s.length);
    }
    cursor+=text.length+(pi<paragraphs.length-1?1:0);
  });
  const chunks=[];let text='',first=null,last=null;
  for(const s of sentences){
    const candidate=text?text+' '+s.text:s.text;
    if(text&&candidate.length>MAX_CHARS){
      chunks.push({text,startPi:first.pi,endPi:last.pi,globalStart:first.start,globalEnd:last.end});
      text=s.text;first=last=s;
    }else{
      if(!text)first=s;text=candidate;last=s;
    }
  }
  if(text)chunks.push({text,startPi:first.pi,endPi:last.pi,globalStart:first.start,globalEnd:last.end});
  return {el,paragraphs,paragraphEls:[...el.querySelectorAll('.text p')],offsets,totalChars:cursor,chunks};
}
const chapters=chapterEls.map(buildChapter);

let speed=Number(safeGet('push-reader:v1:rate',1));if(!SPEEDS.includes(speed))speed=1;
let voice=safeGet('push-reader:v1:voice','julian');if(!VOICES[voice])voice='julian';

const state={chapter:0,current:0,playing:false,intent:false,audio:null,clips:new Map(),queue:[],activeJobs:0,lastPost:0,postGate:Promise.resolve(),drag:false,dragResume:false,dragRatio:0};
const clipKey=(ci,v,i)=>`${ci}:${v}:${i}`;
function clip(ci,v,i){const k=clipKey(ci,v,i);if(!state.clips.has(k))state.clips.set(k,{status:'idle',audio:null,url:null,attempts:0});return state.clips.get(k)}
function hash(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return(x>>>0).toString(36)}
function messageId(ci,v,i){const c=chapters[ci].chunks[i];return `${CACHE_VERSION}-${ci}-${v}-${i}-${hash(VOICES[v].prompt+'|'+c.text)}`}
function currentChapter(){return chapters[state.chapter]}
function currentChunk(){return currentChapter().chunks[state.current]}

function applyRate(a){if(!a)return;try{a.playbackRate=speed;a.defaultPlaybackRate=speed;a.preservesPitch=true}catch{}}
function applyAllRates(){applyRate(state.audio);for(const c of state.clips.values())applyRate(c.audio)}
function currentFraction(){return state.audio&&Number.isFinite(state.audio.duration)&&state.audio.duration>0?clamp(state.audio.currentTime/state.audio.duration,0,1):0}
function currentGlobalOffset(){const c=currentChunk();return c.globalStart+(c.globalEnd-c.globalStart)*currentFraction()}
function overallProgress(){const ch=currentChapter();return clamp(currentGlobalOffset()/Math.max(1,ch.totalChars),0,1)}
function readyAhead(){const arr=[];for(let i=state.current+1;i<currentChapter().chunks.length;i++){if(clip(state.chapter,voice,i).status==='ready')arr.push(i);else break}return arr}
function bufferedProgress(){
  const ch=currentChapter();let end=currentGlobalOffset();
  if(clip(state.chapter,voice,state.current).status==='ready')end=currentChunk().globalEnd;
  for(const i of readyAhead())end=Math.max(end,ch.chunks[i].globalEnd);
  return clamp(end/Math.max(1,ch.totalChars),overallProgress(),1);
}
function estimatedSeconds(){const words=currentChapter().paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;return (words/155)*60/speed}
function totalSeconds(){let total=0;for(let i=0;i<currentChapter().chunks.length;i++){const a=clip(state.chapter,voice,i).audio;if(!a||!Number.isFinite(a.duration))return estimatedSeconds();total+=a.duration}return total/speed}

function setPlayingUI(){
  E.play.dataset.playing=state.playing?'1':'0';
  E.play.setAttribute('aria-label',state.playing?'Pausar capítulo':'Reproducir capítulo');
}
function setLoadingUI(){
  const c=clip(state.chapter,voice,state.current);
  const preparing=['queued','checking','generating','retrying'].includes(c.status)&&!state.playing;
  E.play.classList.toggle('is-loading',preparing&&state.intent);
}
function highlightReading(){
  chapters.forEach((ch,ci)=>{
    ch.el.classList.toggle('is-audio-active',ci===state.chapter&&state.playing);
    ch.paragraphEls.forEach(p=>p.classList.remove('is-reading'));
  });
  if(!state.playing)return;
  const c=currentChunk();for(let i=c.startPi;i<=c.endPi;i++)currentChapter().paragraphEls[i]?.classList.add('is-reading');
}
function updateTimeline(){
  const p=overallProgress(),b=bufferedProgress(),tot=totalSeconds();
  E.fill.style.height=`${p*100}%`;E.buffer.style.height=`${b*100}%`;E.thumb.style.top=`${p*100}%`;
  E.time.textContent=fmt(tot*p);E.total.textContent=fmt(tot);
  E.track.setAttribute('aria-valuenow',String(Math.round(p*100)));
  const cc=clip(state.chapter,voice,state.current);
  E.bufferHint.textContent=b>=.995?'audio listo':(['queued','checking','generating','retrying'].includes(cc.status)?'preparando…':'');
  setPlayingUI();setLoadingUI();highlightReading();
}

function ensure(ci,v,i,priority=false){
  const ch=chapters[ci];if(!ch||i<0||i>=ch.chunks.length)return;
  const c=clip(ci,v,i);if(['ready','queued','checking','generating','retrying'].includes(c.status))return;
  c.status='queued';const job={ci,v,i};priority?state.queue.unshift(job):state.queue.push(job);pump();updateTimeline();
}
function maintainBuffer(){for(let i=state.current;i<Math.min(currentChapter().chunks.length,state.current+AHEAD);i++)ensure(state.chapter,voice,i,i===state.current)}
async function pump(){while(state.activeJobs<WORKERS&&state.queue.length){const job=state.queue.shift();state.activeJobs++;loadClip(job.ci,job.v,job.i).finally(()=>{state.activeJobs--;pump()})}}
async function reservePost(){let release;const mine=new Promise(r=>release=r),prev=state.postGate;state.postGate=mine;await prev;const wait=Math.max(0,POST_MIN_GAP-(Date.now()-state.lastPost));if(wait)await sleep(wait);state.lastPost=Date.now();release()}
async function loadClip(ci,v,i){
  const ch=chapters[ci],chunk=ch?.chunks[i],c=clip(ci,v,i);if(!chunk)return;
  const id=messageId(ci,v,i);c.status='checking';if(ci===state.chapter&&v===voice&&i===state.current)updateTimeline();
  try{const r=await fetch(`${API}?id=${encodeURIComponent(id)}`,{cache:'no-store'});if(r.ok){await acceptAudio(ci,v,i,c,r);return}}catch{}
  for(;;){
    c.status=c.attempts?'retrying':'generating';c.attempts++;if(ci===state.chapter&&v===voice&&i===state.current)updateTimeline();
    await reservePost();
    try{
      const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({voicePrompt:VOICES[v].prompt,text:chunk.text,messageId:id})});
      if(r.ok){await acceptAudio(ci,v,i,c,r);return}
      if(r.status===429){await sleep(12000);continue}
    }catch{}
    await sleep(Math.min(45000,4000+c.attempts*5000));
  }
}
async function acceptAudio(ci,v,i,c,r){
  const blob=await r.blob();if(c.url)try{URL.revokeObjectURL(c.url)}catch{}
  c.url=URL.createObjectURL(blob);c.audio=new Audio(c.url);c.audio.preload='auto';applyRate(c.audio);c.status='ready';
  if(ci===state.chapter&&v===voice&&i===state.current){updateTimeline();if(state.intent&&!state.playing)startCurrent()}
}

function bindAudio(a){
  a.ontimeupdate=()=>updateTimeline();
  a.onended=advance;
  a.onplay=()=>{state.playing=true;setPlayingUI();highlightReading()};
  a.onpause=()=>{if(!a.ended){state.playing=false;setPlayingUI();highlightReading()}};
}
async function startCurrent(){
  const c=clip(state.chapter,voice,state.current);
  if(c.status!=='ready'){ensure(state.chapter,voice,state.current,true);maintainBuffer();updateTimeline();return}
  state.audio=c.audio;applyRate(state.audio);bindAudio(state.audio);
  try{await state.audio.play();state.playing=true;maintainBuffer();updateTimeline()}catch{state.playing=false;state.intent=false;updateTimeline()}
}
function togglePlay(){if(state.playing){state.intent=false;state.audio?.pause();updateTimeline();return}state.intent=true;maintainBuffer();startCurrent();updateTimeline()}
function advance(){
  if(state.current>=currentChapter().chunks.length-1){state.intent=false;state.playing=false;state.audio=null;updateTimeline();return}
  state.current++;state.audio=null;state.playing=false;maintainBuffer();if(state.intent)startCurrent();updateTimeline();
}
function seek(ratio,resume=state.intent||state.playing){
  ratio=clamp(ratio,0,1);const ch=currentChapter(),target=ratio*ch.totalChars;
  let idx=ch.chunks.findIndex(c=>target<=c.globalEnd);if(idx<0)idx=ch.chunks.length-1;
  const c=ch.chunks[idx],local=clamp((target-c.globalStart)/Math.max(1,c.globalEnd-c.globalStart),0,1);
  state.audio?.pause();state.current=idx;state.audio=null;state.playing=false;state.intent=resume;maintainBuffer();
  const cc=clip(state.chapter,voice,idx);
  if(cc.status==='ready'){
    state.audio=cc.audio;applyRate(state.audio);bindAudio(state.audio);
    const apply=()=>{state.audio.currentTime=(state.audio.duration||0)*local;updateTimeline();if(resume)state.audio.play()};
    Number.isFinite(state.audio.duration)?apply():state.audio.addEventListener('loadedmetadata',apply,{once:true});
  }else if(resume)startCurrent();
  updateTimeline();
}

function renderSettings(){
  E.voices.innerHTML=Object.values(VOICES).map(v=>`<button type="button" class="choice${voice===v.id?' active':''}" data-voice="${v.id}">${v.name}</button>`).join('');
  E.voices.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>selectVoice(b.dataset.voice));
  E.speeds.innerHTML=SPEEDS.map(v=>`<button type="button" class="choice${speed===v?' active':''}" data-speed="${v}">${String(v).replace('.',',')}×</button>`).join('');
  E.speeds.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>selectSpeed(Number(b.dataset.speed)));
}
function selectVoice(v){
  if(!VOICES[v]||v===voice)return;
  state.audio?.pause();voice=v;safeSet('push-reader:v1:voice',voice);state.current=0;state.audio=null;state.playing=false;state.intent=false;
  state.queue=state.queue.filter(j=>j.v===voice&&j.ci===state.chapter);renderSettings();maintainBuffer();E.live.textContent=`Voz ${VOICES[voice].name}`;updateTimeline();
}
function selectSpeed(v){if(!SPEEDS.includes(v)||v===speed)return;speed=v;safeSet('push-reader:v1:rate',speed);applyAllRates();renderSettings();E.live.textContent=`Velocidad ${String(v).replace('.',',')} por`;updateTimeline()}

function switchChapter(index){
  index=clamp(index,0,chapters.length-1);if(index===state.chapter)return;
  state.audio?.pause();state.chapter=index;state.current=0;state.audio=null;state.playing=false;state.intent=false;
  state.queue=state.queue.filter(j=>j.ci===index&&j.v===voice);
  E.chapterLabel.textContent=String(index+1).padStart(2,'0');
  E.live.textContent=`Capítulo ${index+1}`;
  maintainBuffer();updateTimeline();
}
function detectActiveChapter(){
  let next=0;for(let i=0;i<chapterEls.length;i++){if(chapterEls[i].getBoundingClientRect().top<=1)next=i;else break}switchChapter(next);
}
let scrollRAF=0;window.addEventListener('scroll',()=>{if(scrollRAF)return;scrollRAF=requestAnimationFrame(()=>{scrollRAF=0;detectActiveChapter()})},{passive:true});
window.addEventListener('resize',()=>requestAnimationFrame(detectActiveChapter));

function ratioFromY(y){const r=E.track.getBoundingClientRect();return clamp((y-r.top)/Math.max(1,r.height),0,1)}
function previewRatio(r){E.fill.style.height=`${r*100}%`;E.thumb.style.top=`${r*100}%`;E.time.textContent=fmt(totalSeconds()*r);E.track.setAttribute('aria-valuenow',String(Math.round(r*100)))}
E.track.addEventListener('pointerdown',e=>{
  e.preventDefault();state.drag=true;state.dragResume=state.intent||state.playing;state.intent=false;state.audio?.pause();state.dragRatio=ratioFromY(e.clientY);previewRatio(state.dragRatio);E.track.classList.add('dragging');
  try{E.track.setPointerCapture(e.pointerId)}catch{}
});
E.track.addEventListener('pointermove',e=>{if(!state.drag)return;e.preventDefault();state.dragRatio=ratioFromY(e.clientY);previewRatio(state.dragRatio)});
const endDrag=e=>{if(!state.drag)return;state.drag=false;E.track.classList.remove('dragging');try{E.track.releasePointerCapture(e.pointerId)}catch{};seek(state.dragRatio,state.dragResume)};
E.track.addEventListener('pointerup',endDrag);E.track.addEventListener('pointercancel',endDrag);
E.track.addEventListener('keydown',e=>{
  if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();let p=overallProgress();
  if(e.key==='ArrowUp')p-=.05;if(e.key==='ArrowDown')p+=.05;if(e.key==='Home')p=0;if(e.key==='End')p=1;seek(clamp(p,0,1),false);
});

E.play.addEventListener('click',togglePlay);
E.settingsBtn.addEventListener('click',()=>{const open=E.settings.hidden;E.settings.hidden=!open;E.settingsBtn.setAttribute('aria-expanded',String(open));if(open)renderSettings()});
document.addEventListener('pointerdown',e=>{if(E.settings.hidden)return;if(E.settings.contains(e.target)||E.settingsBtn.contains(e.target))return;E.settings.hidden=true;E.settingsBtn.setAttribute('aria-expanded','false')});

renderSettings();E.chapterLabel.textContent='01';detectActiveChapter();maintainBuffer();updateTimeline();
setInterval(()=>{applyAllRates();if(!state.drag)updateTimeline()},400);
})();
