(()=>{
'use strict';

const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/modelos-room-audio-v2';
const CACHE_VERSION='reader-final-v2';
const MAX_CHARS=500;
const INITIAL_AHEAD=6;
const MAX_AHEAD=8;
const WORKERS=2;
const POST_MIN_GAP=3400;

const VOICES={
  julian:{id:'julian',name:'Julián',kind:'Profesor',prompt:'Argentine male teacher. Warm medium-low voice, clear and patient. Natural Rioplatense Spanish. Explain as if to one student, with brief useful pauses. Same speaker throughout.'},
  clara:{id:'clara',name:'Clara',kind:'Profesora',prompt:'Argentine female teacher. Warm clear medium voice, patient and precise. Natural Rioplatense Spanish. Lightly emphasize key ideas. Same speaker throughout.'},
  vera:{id:'vera',name:'Vera',kind:'Lectura',prompt:'Buenos Aires woman. Mid-low voice, calm, dry and natural. Rioplatense Spanish. Read steadily and intimately. Same speaker throughout.'},
  milo:{id:'milo',name:'Milo',kind:'Lectura',prompt:'Buenos Aires man. Medium-low slightly raspy voice, relaxed and natural. Rioplatense Spanish. Read steadily. Same speaker throughout.'}
};

const BOOK=[
  'Durante mucho tiempo imaginamos la memoria como una biblioteca silenciosa: cada experiencia entra, encuentra un estante y espera allí hasta que alguien vuelve a buscarla. La imagen es cómoda, pero engañosa. Recordar no consiste en abrir una caja intacta. Cada vez que evocamos una escena, reconstruimos algo a partir de fragmentos.',
  'Una parte de esos fragmentos proviene de lo que ocurrió. Otra parte proviene de lo que sabemos ahora. Por eso un recuerdo puede sentirse completamente verdadero y, aun así, contener detalles que fueron agregados después. No hace falta pensar en la memoria como una máquina defectuosa. Es más útil pensarla como un sistema que trabaja con información incompleta.',
  'Imaginá que dos personas salen de una misma reunión. Una recuerda con claridad una discusión cerca de la ventana. La otra recuerda la música que sonaba y casi nada de la discusión. Ninguna necesariamente está mintiendo. Cada una atendió señales distintas y, cuando intenta reconstruir la escena, dispone de piezas diferentes.',
  'Esto ayuda a entender por qué una pregunta puede cambiar un recuerdo. Si alguien pregunta varias veces si un auto iba muy rápido, esa idea se vuelve más accesible al reconstruir la escena. No significa que la pregunta fabrique automáticamente una memoria falsa. Significa que recordar ocurre en el presente, utilizando pistas disponibles en el presente.',
  'La memoria también necesita olvidar. Si cada detalle de cada experiencia conservara la misma intensidad, encontrar lo importante sería mucho más difícil. Seleccionar implica perder información. Sin embargo, esa pérdida permite formar patrones: reconocer una cara aunque cambie la luz, entender una situación nueva porque se parece a otras, o anticipar qué puede pasar después.',
  'Por eso recordar y aprender están íntimamente relacionados. Cuando aprendemos, no guardamos solamente datos separados. Construimos relaciones entre ellos. Una idea nueva se vuelve más fácil de recuperar cuando puede conectarse con algo conocido. Cuantas más rutas útiles existen hacia una información, menos dependemos de una única pista para encontrarla.',
  'Este punto tiene una consecuencia práctica para estudiar. Releer muchas veces puede producir familiaridad, pero familiaridad no es lo mismo que poder recuperar una idea. Una mejor prueba consiste en cerrar el material e intentar explicarlo con palabras propias. El pequeño esfuerzo de reconstrucción fortalece precisamente las rutas que después necesitaremos en un examen.',
  'También explica por qué los ejemplos son tan poderosos. Un concepto abstracto puede parecer frágil mientras sólo existe como definición. Cuando lo vinculamos con una escena concreta, una comparación o un problema, aparecen nuevas pistas. El concepto deja de ser una frase aislada y empieza a ocupar un lugar dentro de una red.',
  'Entonces, cuando un recuerdo cambia, la pregunta interesante no siempre es cuánto se alejó de una fotografía perfecta del pasado. A veces conviene preguntar qué función está cumpliendo esa reconstrucción. La memoria usa experiencias anteriores para ayudarnos a interpretar lo que sucede ahora y para preparar respuestas posibles frente a lo que todavía no ocurrió.',
  'Pensada de esta manera, la memoria deja de parecer un archivo pasivo. Es una actividad. Selecciona, resume, conecta, actualiza y vuelve a organizar. Su flexibilidad puede introducir errores, pero esa misma flexibilidad es la que permite que el pasado siga siendo útil cuando el mundo cambia.'
];

const $=id=>document.getElementById(id);
const E={
  card:$('playerCard'),play:$('playBtn'),track:$('track'),fill:$('trackFill'),buffered:$('trackBuffered'),thumb:$('trackThumb'),
  time:$('timeLabel'),total:$('totalTime'),bufferHint:$('bufferHint'),disclosure:$('disclosureBtn'),readerSection:$('readerSection'),
  reader:$('reader'),readerFrame:$('readerFrame'),rail:$('railTrack'),railFill:$('railFill'),railThumb:$('railThumb'),
  settingsBtn:$('settingsBtn'),settings:$('settingsPanel'),textChoices:$('textChoices'),voiceChoices:$('voiceChoices'),speedChoices:$('speedChoices'),toast:$('toast')
};

if(!E.card||!E.play||!E.track||!E.disclosure||!E.readerSection||!E.reader) return;

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fmt=sec=>{sec=Math.max(0,Math.round(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`};
const lsGet=(k,f)=>{try{const v=localStorage.getItem(k);return v==null?f:v}catch{return f}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};

const SPEEDS=[0.75,1,1.25,1.5,2];
const TEXT_SIZES=['small','normal','large'];
let speed=Number(lsGet('lector:v11:rate',1));
if(!SPEEDS.includes(speed)) speed=1;
let textSize=lsGet('lector:v11:text','normal');
if(!TEXT_SIZES.includes(textSize)) textSize='normal';
E.card.dataset.textSize=textSize;

function sentenceSplit(text){return text.match(/[^.!?]+[.!?]+(?:[”»"])?|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[text]}
const PARA_OFFSETS=[];
const SENTENCES=[];
let totalCursor=0;
BOOK.forEach((p,pi)=>{
  PARA_OFFSETS[pi]=totalCursor;
  let local=0;
  for(const s of sentenceSplit(p)){
    const ix=p.indexOf(s,local);
    const start=totalCursor+Math.max(0,ix);
    SENTENCES.push({text:s,pi,start,end:start+s.length});
    local=Math.max(local,ix+s.length);
  }
  totalCursor+=p.length+(pi<BOOK.length-1?1:0);
});
const TOTAL_CHARS=totalCursor;

function buildChunks(){
  const out=[];let text='',first=null,last=null;
  for(const s of SENTENCES){
    const cand=text?text+' '+s.text:s.text;
    if(text&&cand.length>MAX_CHARS){out.push({text,startPi:first.pi,endPi:last.pi,globalStart:first.start,globalEnd:last.end});text=s.text;first=last=s}
    else{if(!text)first=s;text=cand;last=s}
  }
  if(text)out.push({text,startPi:first.pi,endPi:last.pi,globalStart:first.start,globalEnd:last.end});
  return out;
}
const CHUNKS=buildChunks();

const state={voice:'julian',current:0,playing:false,intent:false,audio:null,clips:new Map(),queue:[],activeJobs:0,lastPost:0,postGate:Promise.resolve(),generationMs:[],audioMs:[]};
function key(v,i){return `${v}:${i}`}
function clip(v,i){const k=key(v,i);if(!state.clips.has(k))state.clips.set(k,{status:'idle',audio:null,url:null,attempts:0});return state.clips.get(k)}
function hash(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return(x>>>0).toString(36)}
function messageId(v,i){return `${CACHE_VERSION}-${v}-${i}-${hash(VOICES[v].prompt+'|'+CHUNKS[i].text)}`}

function toast(msg){if(!E.toast)return;E.toast.textContent=msg;E.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.classList.remove('show'),1400)}

function renderBook(){E.reader.innerHTML=BOOK.map((p,i)=>`<p class="para" data-p="${i}">${p}</p>`).join('')}
renderBook();

function currentFraction(){return state.audio&&Number.isFinite(state.audio.duration)&&state.audio.duration>0?clamp(state.audio.currentTime/state.audio.duration,0,1):0}
function currentGlobalOffset(){const c=CHUNKS[state.current];return c.globalStart+(c.globalEnd-c.globalStart)*currentFraction()}
function overallProgress(){return clamp(currentGlobalOffset()/TOTAL_CHARS,0,1)}
function readyAhead(){const arr=[];for(let i=state.current+1;i<CHUNKS.length;i++){if(clip(state.voice,i).status==='ready')arr.push(i);else break}return arr}
function bufferedProgress(){let end=currentGlobalOffset();if(clip(state.voice,state.current).status==='ready')end=CHUNKS[state.current].globalEnd;for(const i of readyAhead())end=Math.max(end,CHUNKS[i].globalEnd);return clamp(end/TOTAL_CHARS,overallProgress(),1)}
function estimatedSeconds(){const words=BOOK.join(' ').trim().split(/\s+/).length;return (words/155)*60/speed}
function totalSeconds(){let total=0;for(let i=0;i<CHUNKS.length;i++){const a=clip(state.voice,i).audio;if(!a||!Number.isFinite(a.duration))return estimatedSeconds();total+=a.duration}return total/speed}
function applyRate(a){if(!a)return;try{a.playbackRate=speed;a.defaultPlaybackRate=speed;a.preservesPitch=true}catch{}}
function applyAllRates(){applyRate(state.audio);for(const c of state.clips.values())applyRate(c.audio)}

function setPlayingUI(){E.play.dataset.playing=state.playing?'1':'0';E.play.setAttribute('aria-label',state.playing?'Pausar':'Reproducir');if(E.railThumb)E.railThumb.dataset.playing=state.playing?'1':'0'}

function updateTimeline(){
  const p=overallProgress(),b=bufferedProgress(),tot=totalSeconds();
  E.fill.style.width=`${p*100}%`;E.buffered.style.width=`${b*100}%`;E.thumb.style.left=`${p*100}%`;
  E.time.textContent=fmt(tot*p);E.total.textContent=fmt(tot);
  const gap=b-p;E.bufferHint.textContent=b>=.995?'audio listo':gap>.18?'':'preparando…';
  setPlayingUI();updateRail();
}

function paragraphForOffset(off){for(let i=0;i<BOOK.length;i++){const s=PARA_OFFSETS[i],e=s+BOOK[i].length;if(off<=e)return i}return BOOK.length-1}
function rangeCenterAt(off){const pi=paragraphForOffset(off),p=E.reader.querySelector(`.para[data-p="${pi}"]`),node=p?.firstChild;if(!node)return null;const local=clamp(Math.round(off-PARA_OFFSETS[pi]),0,Math.max(0,node.nodeValue.length-1));const r=document.createRange();r.setStart(node,local);r.setEnd(node,Math.min(node.nodeValue.length,local+1));const rect=r.getBoundingClientRect();return rect.top+rect.height/2}
function syncRailGeometry(){
  if(E.readerSection.hidden||!E.rail||!E.readerFrame)return;
  const first=rangeCenterAt(0),last=rangeCenterAt(TOTAL_CHARS-1),frame=E.readerFrame.getBoundingClientRect();
  if(first==null||last==null||last<=first)return;
  E.rail.style.top=`${first-frame.top}px`;E.rail.style.height=`${last-first}px`;updateRail();
}
function updateRail(){if(E.readerSection.hidden||!E.rail)return;const y=rangeCenterAt(currentGlobalOffset());if(y==null)return;const r=E.rail.getBoundingClientRect(),local=clamp(y-r.top,0,r.height);E.railFill.style.height=`${local}px`;E.railThumb.style.top=`${local}px`}

function desiredAhead(){
  if(!state.generationMs.length||!state.audioMs.length)return INITIAL_AHEAD;
  const g=state.generationMs.reduce((a,b)=>a+b,0)/state.generationMs.length,a=state.audioMs.reduce((x,y)=>x+y,0)/state.audioMs.length;
  return clamp(Math.ceil((g/Math.max(1,a))*2)+4,5,MAX_AHEAD);
}
function maintainBuffer(){const t=desiredAhead();for(let i=state.current;i<Math.min(CHUNKS.length,state.current+t+1);i++)ensure(state.voice,i,i===state.current)}
function ensure(v,i,priority=false){if(i<0||i>=CHUNKS.length)return;const c=clip(v,i);if(['ready','queued','checking','generating','retrying'].includes(c.status))return;c.status='queued';const job={v,i};priority?state.queue.unshift(job):state.queue.push(job);pump()}
async function pump(){while(state.activeJobs<WORKERS&&state.queue.length){const job=state.queue.shift();state.activeJobs++;loadClip(job.v,job.i).finally(()=>{state.activeJobs--;pump()})}}
async function reservePost(){let release;const mine=new Promise(r=>release=r),prev=state.postGate;state.postGate=mine;await prev;const wait=Math.max(0,POST_MIN_GAP-(Date.now()-state.lastPost));if(wait)await sleep(wait);state.lastPost=Date.now();release()}
async function loadClip(v,i){
  const c=clip(v,i),id=messageId(v,i);c.status='checking';
  try{const r=await fetch(`${API}?id=${encodeURIComponent(id)}`,{cache:'no-store'});if(r.ok){await acceptAudio(c,r);return}}catch{}
  for(;;){
    c.status=c.attempts?'retrying':'generating';c.attempts++;await reservePost();const started=performance.now();
    try{
      const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({voicePrompt:VOICES[v].prompt,text:CHUNKS[i].text,messageId:id})});
      if(r.ok){state.generationMs.push(performance.now()-started);state.generationMs=state.generationMs.slice(-10);await acceptAudio(c,r);return}
      if(r.status===429){await sleep(12000);continue}
    }catch{}
    await sleep(Math.min(45000,4000+c.attempts*5000));
  }
}
async function acceptAudio(c,r){
  const blob=await r.blob();c.url=URL.createObjectURL(blob);c.audio=new Audio(c.url);c.audio.preload='auto';applyRate(c.audio);c.status='ready';
  c.audio.addEventListener('loadedmetadata',()=>{if(Number.isFinite(c.audio.duration)){state.audioMs.push(c.audio.duration*1000);state.audioMs=state.audioMs.slice(-10)}},{once:true});
  if(state.intent&&!state.playing&&c===clip(state.voice,state.current))startCurrent();
}

function bindAudio(a){a.ontimeupdate=()=>{updateTimeline();if(a.duration-a.currentTime<15)maintainBuffer()};a.onended=advance;a.onplay=()=>{state.playing=true;setPlayingUI()};a.onpause=()=>{if(!a.ended){state.playing=false;setPlayingUI()}}}
async function startCurrent(){const c=clip(state.voice,state.current);if(c.status!=='ready'){ensure(state.voice,state.current,true);maintainBuffer();return}state.audio=c.audio;applyRate(state.audio);bindAudio(state.audio);try{await state.audio.play();state.playing=true;maintainBuffer();setPlayingUI()}catch{state.playing=false;setPlayingUI()}}
function togglePlay(){if(state.playing){state.intent=false;state.audio?.pause();return}state.intent=true;maintainBuffer();startCurrent()}
function advance(){if(state.current>=CHUNKS.length-1){state.intent=false;state.playing=false;setPlayingUI();return}state.current++;state.audio=null;maintainBuffer();if(state.intent)startCurrent()}
function seekChapter(ratio,resume=state.intent||state.playing){ratio=clamp(ratio,0,1);const target=ratio*TOTAL_CHARS;let idx=CHUNKS.findIndex(c=>target<=c.globalEnd);if(idx<0)idx=CHUNKS.length-1;const c=CHUNKS[idx],local=clamp((target-c.globalStart)/Math.max(1,c.globalEnd-c.globalStart),0,1);state.audio?.pause();state.current=idx;state.audio=null;state.playing=false;state.intent=resume;maintainBuffer();const cc=clip(state.voice,idx);if(cc.status==='ready'){state.audio=cc.audio;applyRate(state.audio);bindAudio(state.audio);const set=()=>{state.audio.currentTime=(state.audio.duration||0)*local;updateTimeline();if(resume)state.audio.play()};Number.isFinite(state.audio.duration)?set():state.audio.addEventListener('loadedmetadata',set,{once:true})}else if(resume)startCurrent();updateTimeline()}
function selectVoice(v){if(!VOICES[v]||v===state.voice)return;state.audio?.pause();state.voice=v;state.current=clamp(state.current,0,CHUNKS.length-1);state.audio=null;state.playing=false;state.intent=false;state.queue=state.queue.filter(j=>j.v===v);maintainBuffer();renderSettings();toast(`Voz: ${VOICES[v].name}`)}

function renderSettings(){
  E.textChoices.innerHTML=TEXT_SIZES.map(v=>`<button class="choice${textSize===v?' active':''}" data-text="${v}">${v==='small'?'A−':v==='large'?'A+':'A'}</button>`).join('');
  E.textChoices.querySelectorAll('button').forEach(b=>b.onclick=()=>{textSize=b.dataset.text;lsSet('lector:v11:text',textSize);E.card.dataset.textSize=textSize;renderSettings();requestAnimationFrame(()=>requestAnimationFrame(syncRailGeometry))});
  E.voiceChoices.innerHTML=Object.values(VOICES).map(v=>`<button class="choice${state.voice===v.id?' active':''}" data-v="${v.id}">${v.name}</button>`).join('');
  E.voiceChoices.querySelectorAll('button').forEach(b=>b.onclick=()=>selectVoice(b.dataset.v));
  E.speedChoices.innerHTML=SPEEDS.map(v=>`<button class="choice${speed===v?' active':''}" data-s="${v}">${String(v).replace('.',',')}×</button>`).join('');
  E.speedChoices.querySelectorAll('button').forEach(b=>b.onclick=()=>{speed=Number(b.dataset.s);lsSet('lector:v11:rate',speed);applyAllRates();renderSettings();updateTimeline()});
}
renderSettings();

E.play.addEventListener('click',togglePlay);
E.disclosure.addEventListener('click',()=>{const open=E.readerSection.hidden;E.readerSection.hidden=!open;E.disclosure.setAttribute('aria-expanded',String(open));if(open)requestAnimationFrame(()=>requestAnimationFrame(syncRailGeometry))});
E.settingsBtn.addEventListener('click',()=>{const open=E.settings.hidden;E.settings.hidden=!open;E.settingsBtn.setAttribute('aria-expanded',String(open));if(open)renderSettings()});

let drag=false,dragRatio=0,dragResume=false;
const ratioFromX=x=>{const r=E.track.getBoundingClientRect();return clamp((x-r.left)/Math.max(1,r.width),0,1)};
function previewRatio(r){const tot=totalSeconds();E.thumb.style.left=`${r*100}%`;E.fill.style.width=`${r*100}%`;E.time.textContent=fmt(tot*r)}
E.track.addEventListener('pointerdown',e=>{e.preventDefault();drag=true;dragResume=state.intent||state.playing;state.intent=false;state.audio?.pause();dragRatio=ratioFromX(e.clientX);previewRatio(dragRatio);E.track.classList.add('dragging');try{E.track.setPointerCapture(e.pointerId)}catch{}});
E.track.addEventListener('pointermove',e=>{if(!drag)return;e.preventDefault();dragRatio=ratioFromX(e.clientX);previewRatio(dragRatio)});
const endDrag=e=>{if(!drag)return;drag=false;E.track.classList.remove('dragging');try{E.track.releasePointerCapture(e.pointerId)}catch{};seekChapter(dragRatio,dragResume)};
E.track.addEventListener('pointerup',endDrag);E.track.addEventListener('pointercancel',endDrag);

let railDrag=null;
function railRatio(y){const r=E.rail.getBoundingClientRect();return clamp((y-r.top)/Math.max(1,r.height),0,1)}
E.rail.addEventListener('pointerdown',e=>{if(E.readerSection.hidden)return;e.preventDefault();e.stopPropagation();const onThumb=e.target===E.railThumb||E.railThumb.contains(e.target);railDrag={id:e.pointerId,startY:e.clientY,onThumb,moved:false,resume:state.intent||state.playing};try{E.rail.setPointerCapture(e.pointerId)}catch{};if(!onThumb){state.intent=false;state.audio?.pause();seekChapter(railRatio(e.clientY),false);E.railThumb.classList.add('dragging')}});
E.rail.addEventListener('pointermove',e=>{if(!railDrag||railDrag.id!==e.pointerId)return;if(Math.abs(e.clientY-railDrag.startY)>4){railDrag.moved=true;state.intent=false;state.audio?.pause();E.railThumb.classList.add('dragging');seekChapter(railRatio(e.clientY),false)}});
const railEnd=e=>{if(!railDrag||railDrag.id!==e.pointerId)return;const g=railDrag;railDrag=null;E.railThumb.classList.remove('dragging');try{E.rail.releasePointerCapture(e.pointerId)}catch{};if(g.onThumb&&!g.moved)togglePlay();else if(g.resume){state.intent=true;startCurrent()}};
E.rail.addEventListener('pointerup',railEnd);E.rail.addEventListener('pointercancel',railEnd);

window.addEventListener('resize',()=>requestAnimationFrame(syncRailGeometry));
if(document.fonts?.ready)document.fonts.ready.then(()=>requestAnimationFrame(syncRailGeometry));

E.readerSection.hidden=true;E.settings.hidden=true;maintainBuffer();updateTimeline();setPlayingUI();
setInterval(()=>{applyAllRates();if(!drag)updateTimeline()},400);
})();