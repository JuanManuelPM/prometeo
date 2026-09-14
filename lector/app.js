const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/modelos-room-audio-v2';
const VERSION='reader-final-v2';
const MAX_CHARS=500;
const INITIAL_AHEAD=5;
const MIN_AHEAD=4;
const MAX_AHEAD=6;
const WORKERS=2;
const POST_MIN_GAP=3400;

const VOICES={
  julian:{id:'julian',name:'Julián',kind:'Profesor',desc:'claro · paciente · rioplatense',prompt:'Argentine male teacher. Warm medium-low voice, clear and patient. Natural Rioplatense Spanish. Explain as if to one student, with brief useful pauses. Same speaker throughout.'},
  clara:{id:'clara',name:'Clara',kind:'Profesora',desc:'precisa · cálida · rioplatense',prompt:'Argentine female teacher. Warm clear medium voice, patient and precise. Natural Rioplatense Spanish. Lightly emphasize key ideas. Same speaker throughout.'},
  vera:{id:'vera',name:'Vera',kind:'Lectura',desc:'calma · seca · íntima',prompt:'Buenos Aires woman. Mid-low voice, calm, dry and natural. Rioplatense Spanish. Read steadily and intimately. Same speaker throughout.'},
  milo:{id:'milo',name:'Milo',kind:'Lectura',desc:'grave · relajado · natural',prompt:'Buenos Aires man. Medium-low slightly raspy voice, relaxed and natural. Rioplatense Spanish. Read steadily. Same speaker throughout.'}
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

function sentenceSplit(text){return text.match(/[^.!?]+[.!?]+(?:[”»\"])?|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[text]}
function buildChunks(paragraphs,maxChars){
  const sentences=[];
  paragraphs.forEach((p,pi)=>sentenceSplit(p).forEach(s=>sentences.push({text:s,pi})));
  const chunks=[];let cur='';let startPi=0;let endPi=0;
  for(const s of sentences){
    const candidate=cur?cur+' '+s.text:s.text;
    if(cur&&candidate.length>maxChars){chunks.push({text:cur,startPi,endPi});cur=s.text;startPi=s.pi;endPi=s.pi}else{if(!cur)startPi=s.pi;cur=candidate;endPi=s.pi}
  }
  if(cur)chunks.push({text:cur,startPi,endPi});
  let offset=0;for(const c of chunks){c.start=offset;c.end=offset+c.text.length;offset=c.end+1}
  return chunks;
}
const CHUNKS=buildChunks(BOOK,MAX_CHARS);
const TOTAL_CHARS=CHUNKS.reduce((n,c)=>n+c.text.length,0);

const state={voice:'julian',current:0,playing:false,intent:false,audio:null,queue:[],queued:new Set(),activeJobs:0,lastPost:0,clips:new Map(),generationMs:[],audioMs:[]};
const $=id=>document.getElementById(id);
const E={reader:$('reader'),voiceButton:$('voiceButton'),voiceButtonLabel:$('voiceButtonLabel'),voiceMenu:$('voiceMenu'),play:$('playBtn'),back:$('backBtn'),forward:$('forwardBtn'),nowVoice:$('nowVoice'),nowState:$('nowState'),track:$('track'),fill:$('trackFill'),time:$('timeLabel'),progress:$('chapterProgress'),buffer:$('bufferState'),bufferCount:$('bufferCount'),railFill:$('railFill'),railThumb:$('railThumb'),toast:$('toast'),wordCount:$('wordCount'),readTime:$('readTime')};

function key(v,i){return `${v}:${i}`}
function clip(v,i){const k=key(v,i);if(!state.clips.has(k))state.clips.set(k,{status:'idle',blob:null,url:null,audio:null,attempts:0,ms:0});return state.clips.get(k)}
function hash(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return(x>>>0).toString(36)}
function messageId(v,i){const voice=VOICES[v],c=CHUNKS[i];return`${VERSION}-${v}-${i}-${hash(voice.prompt+'|'+c.text)}`}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function toast(s){E.toast.textContent=s;E.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.classList.remove('show'),1800)}
function fmt(sec){sec=Math.max(0,Math.floor(sec||0));return`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}

function renderBook(){E.reader.innerHTML=BOOK.map((p,i)=>`<p class="para" data-p="${i}">${p}</p>`).join('');const words=BOOK.join(' ').trim().split(/\s+/).length;E.wordCount.textContent=`${words} palabras`;E.readTime.textContent=`${Math.max(1,Math.round(words/155))} min`}
function renderVoices(){E.voiceMenu.innerHTML=Object.values(VOICES).map(v=>`<button class="voiceOption" data-v="${v.id}"><strong>${v.name}</strong><small>${v.kind} · ${v.desc}</small><span class="tick">${v.id===state.voice?'✓':''}</span></button>`).join('');E.voiceMenu.querySelectorAll('.voiceOption').forEach(b=>b.onclick=()=>selectVoice(b.dataset.v))}
function render(){
  E.voiceButtonLabel.textContent=VOICES[state.voice].name;E.nowVoice.textContent=VOICES[state.voice].name;renderVoices();
  const c=clip(state.voice,state.current);let st='listo para leer';if(c.status==='generating'||c.status==='checking'||c.status==='queued'||c.status==='retrying')st='preparando audio';if(state.playing)st='leyendo';if(state.intent&&!state.playing&&c.status!=='ready')st='preparando siguiente tramo';E.nowState.textContent=st;
  E.play.textContent=state.playing?'Ⅱ':'▶';E.play.setAttribute('aria-label',state.playing?'Pausar':'Reproducir');
  const readyAhead=countReadyAhead();E.bufferCount.textContent=readyAhead;E.buffer.className='bufferState '+(readyAhead>=3?'ready':'busy');E.buffer.innerHTML=`<i></i><span>${readyAhead>=3?'lectura preparada':'precargando'}</span>`;
  updateProgress();
}

function overallProgress(){
  const before=CHUNKS.slice(0,state.current).reduce((n,c)=>n+c.text.length,0);let frac=0;
  if(state.audio&&Number.isFinite(state.audio.duration)&&state.audio.duration>0)frac=Math.min(1,state.audio.currentTime/state.audio.duration);
  return Math.min(1,(before+CHUNKS[state.current].text.length*frac)/TOTAL_CHARS);
}
function updateProgress(){const p=overallProgress();const pct=(p*100).toFixed(1);E.fill.style.width=pct+'%';E.progress.textContent=Math.round(p*100)+'%';E.railFill.style.height=pct+'%';E.railThumb.style.top=pct+'%';E.time.textContent=state.audio?fmt(state.audio.currentTime):'0:00'}
function countReadyAhead(){let n=0;for(let i=state.current+1;i<CHUNKS.length;i++){if(clip(state.voice,i).status==='ready')n++;else break}return n}
function desiredAhead(){
  if(!state.generationMs.length||!state.audioMs.length)return INITIAL_AHEAD;
  const g=state.generationMs.reduce((a,b)=>a+b,0)/state.generationMs.length;const a=state.audioMs.reduce((a,b)=>a+b,0)/state.audioMs.length;
  return Math.max(MIN_AHEAD,Math.min(MAX_AHEAD,Math.ceil((g/Math.max(1,a))*2)+4));
}
function maintainBuffer(){const target=desiredAhead();for(let i=state.current;i<Math.min(CHUNKS.length,state.current+target+1);i++)ensure(state.voice,i,i===state.current);render()}

function ensure(v,i,priority=false){if(i<0||i>=CHUNKS.length)return;const c=clip(v,i);if(['ready','checking','queued','generating','retrying'].includes(c.status))return;c.status='queued';const item={v,i};if(priority)state.queue.unshift(item);else state.queue.push(item);state.queued.add(key(v,i));pump()}
async function pump(){while(state.activeJobs<WORKERS&&state.queue.length){const job=state.queue.shift();state.queued.delete(key(job.v,job.i));state.activeJobs++;loadClip(job.v,job.i).finally(()=>{state.activeJobs--;pump();render()})}}
async function waitPostTurn(){const wait=Math.max(0,POST_MIN_GAP-(Date.now()-state.lastPost));if(wait)await sleep(wait);state.lastPost=Date.now()}
async function loadClip(v,i){const c=clip(v,i);c.status='checking';render();const id=messageId(v,i);
  try{const r=await fetch(`${API}?id=${encodeURIComponent(id)}`,{cache:'no-store'});if(r.ok){await acceptAudio(c,r);return}}
  catch{}
  for(;;){
    c.status=c.attempts?'retrying':'generating';c.attempts++;render();await waitPostTurn();const started=performance.now();
    try{
      const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({voicePrompt:VOICES[v].prompt,text:CHUNKS[i].text,messageId:id})});
      if(r.ok){c.ms=performance.now()-started;state.generationMs.push(c.ms);state.generationMs=state.generationMs.slice(-8);await acceptAudio(c,r);return}
      if(r.status===429){await sleep(12000);continue}
      await sleep(Math.min(45000,4000+c.attempts*5000));
    }catch{await sleep(Math.min(45000,4000+c.attempts*5000))}
  }
}
async function acceptAudio(c,r){c.blob=await r.blob();c.url=URL.createObjectURL(c.blob);c.audio=new Audio(c.url);c.audio.preload='auto';c.status='ready';c.audio.addEventListener('loadedmetadata',()=>{if(Number.isFinite(c.audio.duration)){state.audioMs.push(c.audio.duration*1000);state.audioMs=state.audioMs.slice(-8)}render()},{once:true});render();if(state.intent&&!state.playing&&c===clip(state.voice,state.current))startCurrent()}

function bindAudio(a){a.ontimeupdate=()=>{updateProgress();if(a.duration-a.currentTime<8)maintainBuffer()};a.onended=()=>advance();a.onplay=()=>{state.playing=true;render()};a.onpause=()=>{if(!a.ended){state.playing=false;render()}}}
async function startCurrent(){const c=clip(state.voice,state.current);if(c.status!=='ready'){ensure(state.voice,state.current,true);maintainBuffer();return}if(state.audio&&state.audio!==c.audio){try{state.audio.pause()}catch{}}state.audio=c.audio;bindAudio(state.audio);try{await state.audio.play();state.playing=true;maintainBuffer();render()}catch{state.playing=false;render()}}
function advance(){if(state.current>=CHUNKS.length-1){state.playing=false;state.intent=false;updateProgress();render();toast('Fin del capítulo');return}state.current++;state.audio=null;maintainBuffer();if(state.intent)startCurrent();render()}
function togglePlay(){state.intent=!state.playing;if(state.playing){state.intent=false;state.audio?.pause();state.playing=false;render();return}state.intent=true;maintainBuffer();startCurrent();render()}
function jump(delta){if(!state.audio||!Number.isFinite(state.audio.duration))return;let t=state.audio.currentTime+delta;if(t>=0&&t<=state.audio.duration){state.audio.currentTime=t;return}if(t<0&&state.current>0){const carry=-t;state.audio.pause();state.current--;state.audio=null;const pc=clip(state.voice,state.current);if(pc.status==='ready'){state.audio=pc.audio;bindAudio(state.audio);state.audio.currentTime=Math.max(0,(state.audio.duration||0)-carry);if(state.intent)state.audio.play()}else{maintainBuffer();startCurrent()}}else if(t>state.audio.duration&&state.current<CHUNKS.length-1){state.audio.pause();state.current++;state.audio=null;maintainBuffer();startCurrent()}render()}
function selectVoice(v){if(!VOICES[v]||v===state.voice){E.voiceMenu.hidden=true;return}state.audio?.pause();state.voice=v;state.playing=false;state.intent=false;state.audio=null;E.voiceMenu.hidden=true;toast(`Voz: ${VOICES[v].name}`);maintainBuffer();render()}
function seekChapter(ratio){ratio=Math.max(0,Math.min(1,ratio));const target=ratio*TOTAL_CHARS;let sum=0,idx=0;for(;idx<CHUNKS.length;idx++){const next=sum+CHUNKS[idx].text.length;if(target<=next)break;sum=next}idx=Math.min(idx,CHUNKS.length-1);state.audio?.pause();state.current=idx;state.audio=null;maintainBuffer();const c=clip(state.voice,idx);if(c.status==='ready'){state.audio=c.audio;bindAudio(state.audio);const local=(target-sum)/Math.max(1,CHUNKS[idx].text.length);state.audio.currentTime=Math.max(0,Math.min((state.audio.duration||0)*local,(state.audio.duration||0)-.05));if(state.intent)state.audio.play()}else if(state.intent)startCurrent();render()}

E.voiceButton.onclick=()=>{E.voiceMenu.hidden=!E.voiceMenu.hidden;E.voiceButton.setAttribute('aria-expanded',String(!E.voiceMenu.hidden))};document.addEventListener('click',e=>{if(!E.voiceButton.contains(e.target)&&!E.voiceMenu.contains(e.target))E.voiceMenu.hidden=true});E.play.onclick=togglePlay;E.back.onclick=()=>jump(-5);E.forward.onclick=()=>jump(10);E.track.onclick=e=>{const r=E.track.getBoundingClientRect();seekChapter((e.clientX-r.left)/r.width)};

renderBook();renderVoices();render();maintainBuffer();setInterval(()=>{if(state.playing)updateProgress()},250);
