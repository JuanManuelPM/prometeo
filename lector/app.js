const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/modelos-room-audio-v2';
const VERSION='reader-final-v1';
const MAX_CHARS=480;
const POST_GAP=3600;

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

const state={
  voice:'julian',current:0,playing:false,intent:false,follow:true,audio:null,lastSentence:-1,
  queue:[],working:false,lastPost:0,manualScrollUntil:0,session:Math.random().toString(36).slice(2,8),
  clips:new Map()
};

const $=id=>document.getElementById(id);
const E={reader:$('reader'),voiceButton:$('voiceButton'),voiceButtonLabel:$('voiceButtonLabel'),voiceMenu:$('voiceMenu'),play:$('playBtn'),back:$('backBtn'),forward:$('forwardBtn'),follow:$('followBtn'),nowVoice:$('nowVoice'),nowState:$('nowState'),track:$('track'),fill:$('trackFill'),time:$('timeLabel'),progress:$('chapterProgress'),buffer:$('bufferState'),toast:$('toast'),wordCount:$('wordCount'),readTime:$('readTime')};

function hash(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return(x>>>0).toString(36)}
function splitSentences(text){return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[text]}
function splitBlock(text){if(text.length<=MAX_CHARS)return[text];const sentences=splitSentences(text),out=[];let cur='';for(const s of sentences){if((cur+' '+s).trim().length>MAX_CHARS&&cur){out.push(cur);cur=s}else cur=(cur+' '+s).trim()}if(cur)out.push(cur);return out}
const BLOCKS=BOOK.flatMap((p,pi)=>splitBlock(p).map((text,sub)=>({text,pi,sub,sentences:splitSentences(text)})));

function clipKey(voice,i){const v=VOICES[voice],b=BLOCKS[i];return`${VERSION}-${voice}-b${i}-${hash(v.prompt+'|'+b.text)}`}
function key(voice,i){return`${voice}:${i}`}
function clip(voice,i){const k=key(voice,i);if(!state.clips.has(k))state.clips.set(k,{status:'idle',url:null,blob:null,error:null,attempts:0,cache:'',bytes:0});return state.clips.get(k)}
function fmt(sec){if(!Number.isFinite(sec)||sec<0)sec=0;const m=Math.floor(sec/60),s=Math.floor(sec%60);return`${m}:${String(s).padStart(2,'0')}`}
function toast(msg){E.toast.textContent=msg;E.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.classList.remove('show'),1800)}

function renderBook(){
  E.reader.innerHTML='';
  BOOK.forEach((p,pi)=>{
    const node=document.createElement('p');node.className='para';node.dataset.pi=pi;
    const ss=splitSentences(p);
    ss.forEach((s,si)=>{const sp=document.createElement('span');sp.className='sentence';sp.dataset.pi=pi;sp.dataset.si=si;sp.textContent=s+(si<ss.length-1?' ':'');node.appendChild(sp)});
    E.reader.appendChild(node);
  });
  const words=BOOK.join(' ').trim().split(/\s+/).length;E.wordCount.textContent=`${words} palabras`;E.readTime.textContent=`${Math.max(1,Math.round(words/155))} min`;
}

function renderVoices(){
  E.voiceMenu.innerHTML='';
  Object.values(VOICES).forEach(v=>{const b=document.createElement('button');b.className='voiceOption';b.innerHTML=`<strong>${v.name}</strong><small>${v.kind} · ${v.desc}</small><span class="tick">${v.id===state.voice?'✓':''}</span>`;b.onclick=()=>selectVoice(v.id);E.voiceMenu.appendChild(b)});
  E.voiceButtonLabel.textContent=VOICES[state.voice].name;E.nowVoice.textContent=VOICES[state.voice].name;
}

function selectVoice(id){
  if(id===state.voice){closeVoiceMenu();return}
  stopAudio(false);state.voice=id;state.intent=false;state.playing=false;state.queue=[];state.lastSentence=-1;renderVoices();closeVoiceMenu();setPlayIcon();setStatus('preparando esta voz');prepareAhead(state.current,2);toast(`${VOICES[id].name} seleccionada`);
}
function closeVoiceMenu(){E.voiceMenu.hidden=true;E.voiceButton.setAttribute('aria-expanded','false')}
E.voiceButton.onclick=()=>{const open=E.voiceMenu.hidden;E.voiceMenu.hidden=!open;E.voiceButton.setAttribute('aria-expanded',String(open));if(open)renderVoices()};
document.addEventListener('click',e=>{if(!E.voiceMenu.hidden&&!E.voiceMenu.contains(e.target)&&!E.voiceButton.contains(e.target))closeVoiceMenu()});

function setStatus(text){E.nowState.textContent=text}
function buffer(text,kind='busy'){E.buffer.className=`bufferState ${kind}`;E.buffer.querySelector('span').textContent=text}
function setPlayIcon(){E.play.textContent=state.playing?'❚❚':'▶';E.play.setAttribute('aria-label',state.playing?'Pausar':'Reproducir')}

function renderHighlight(){
  const b=BLOCKS[state.current]||BLOCKS[BLOCKS.length-1];
  document.querySelectorAll('.para').forEach((p,pi)=>{p.classList.toggle('past',pi<b.pi);p.classList.toggle('current',pi===b.pi)});
  document.querySelectorAll('.sentence').forEach(s=>s.classList.remove('active','done'));
}

function markSentence(localIndex){
  const b=BLOCKS[state.current];if(!b)return;
  const paragraphSentences=[...document.querySelectorAll(`.sentence[data-pi="${b.pi}"]`)];
  const priorBlocksSamePara=BLOCKS.slice(0,state.current).filter(x=>x.pi===b.pi).reduce((n,x)=>n+x.sentences.length,0);
  const targetIndex=priorBlocksSamePara+localIndex;
  paragraphSentences.forEach((s,i)=>{s.classList.toggle('active',i===targetIndex);s.classList.toggle('done',i<targetIndex)});
  if(localIndex!==state.lastSentence){state.lastSentence=localIndex;const target=paragraphSentences[targetIndex];if(target&&state.follow&&Date.now()>state.manualScrollUntil)target.scrollIntoView({behavior:'smooth',block:'center'})}
}

function updateFromAudio(){
  if(!state.audio)return;const d=state.audio.duration||0,t=state.audio.currentTime||0,ratio=d?t/d:0;
  const overall=((state.current+ratio)/BLOCKS.length)*100;E.fill.style.width=`${Math.min(100,overall)}%`;E.progress.textContent=`${Math.round(overall)}%`;E.time.textContent=fmt(t);
  const ss=BLOCKS[state.current]?.sentences||[];if(ss.length){const total=ss.reduce((n,s)=>n+s.length,0);let threshold=ratio*total,acc=0,idx=0;for(let i=0;i<ss.length;i++){acc+=ss[i].length;if(threshold<=acc){idx=i;break}idx=i}markSentence(idx)}
  prepareAhead(state.current+1,3);
}

function stopAudio(resetIntent=true){if(state.audio){state.audio.pause();state.audio.ontimeupdate=null;state.audio.onended=null;state.audio.onerror=null;state.audio=null}state.playing=false;if(resetIntent)state.intent=false;setPlayIcon()}

async function startBlock(i){
  if(i>=BLOCKS.length){finishChapter();return}
  state.current=i;state.lastSentence=-1;renderHighlight();const c=clip(state.voice,i);
  if(c.status!=='ready'){state.intent=true;setStatus('esperando el siguiente fragmento');buffer('terminando de preparar', 'busy');prepareAhead(i,3);return}
  stopAudio(false);state.audio=new Audio(c.url);state.audio.preload='auto';state.audio.ontimeupdate=updateFromAudio;state.audio.onended=()=>{state.playing=false;state.audio=null;state.current++;if(state.current>=BLOCKS.length){finishChapter();return}renderHighlight();if(state.intent)startBlock(state.current);else setPlayIcon()};state.audio.onerror=()=>{setStatus('reintentando audio');buffer('reintentando', 'busy');c.status='idle';c.url=null;enqueue(state.voice,i,true)};
  try{await state.audio.play();state.playing=true;state.intent=true;setPlayIcon();setStatus(`leyendo · fragmento ${i+1} de ${BLOCKS.length}`);buffer('siguientes fragmentos en preparación','busy');prepareAhead(i+1,3)}catch(e){state.playing=false;setPlayIcon();setStatus('tocá play para continuar')}
}

function finishChapter(){stopAudio();state.current=BLOCKS.length-1;E.fill.style.width='100%';E.progress.textContent='100%';E.time.textContent='fin';setStatus('capítulo terminado');buffer('lectura completa','ready');document.querySelector('.endMark').scrollIntoView({behavior:'smooth',block:'center'})}

E.play.onclick=()=>{
  if(state.playing&&state.audio){state.audio.pause();state.playing=false;state.intent=false;setPlayIcon();setStatus('pausado');return}
  if(state.audio&&!state.audio.ended&&state.audio.currentTime>0){state.intent=true;state.audio.play().then(()=>{state.playing=true;setPlayIcon();setStatus(`leyendo · fragmento ${state.current+1} de ${BLOCKS.length}`)});return}
  state.intent=true;const c=clip(state.voice,state.current);if(c.status==='ready')startBlock(state.current);else{setStatus('preparando el comienzo');buffer('preparando para reproducir','busy');prepareAhead(state.current,3)}
};
E.back.onclick=()=>{if(state.audio){state.audio.currentTime=Math.max(0,state.audio.currentTime-5);return}if(state.current>0){state.current--;renderHighlight();state.intent=true;startBlock(state.current)}};
E.forward.onclick=()=>{if(state.audio&&Number.isFinite(state.audio.duration)&&state.audio.currentTime+10<state.audio.duration){state.audio.currentTime+=10;return}if(state.current<BLOCKS.length-1){state.current++;state.intent=true;startBlock(state.current)}};
E.follow.onclick=()=>{state.follow=!state.follow;E.follow.classList.toggle('active',state.follow);E.follow.setAttribute('aria-pressed',String(state.follow));if(state.follow)markSentence(state.lastSentence<0?0:state.lastSentence)};
E.track.onclick=e=>{const r=E.track.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),pos=ratio*BLOCKS.length,bi=Math.min(BLOCKS.length-1,Math.floor(pos));state.current=bi;state.intent=true;startBlock(bi)};
window.addEventListener('wheel',()=>{state.manualScrollUntil=Date.now()+5000},{passive:true});window.addEventListener('touchmove',()=>{state.manualScrollUntil=Date.now()+5000},{passive:true});

function prepareAhead(from,count){for(let i=from;i<Math.min(BLOCKS.length,from+count);i++)ensure(state.voice,i)}
async function ensure(voice,i){const c=clip(voice,i);if(c.status!=='idle'&&c.status!=='error')return;c.status='checking';if(voice===state.voice&&i===state.current)buffer('buscando audio preparado','busy');try{const r=await fetch(`${API}?id=${encodeURIComponent(clipKey(voice,i))}`,{cache:'no-store'});if(r.ok){const blob=await r.blob();c.blob=blob;c.url=URL.createObjectURL(blob);c.status='ready';c.cache='HIT';onReady(voice,i);return}}catch{}c.status='queued';enqueue(voice,i)}
function enqueue(voice,i,front=false){if(!state.queue.some(x=>x.voice===voice&&x.i===i)){front?state.queue.unshift({voice,i}):state.queue.push({voice,i})}pump()}
async function pump(){if(state.working)return;state.working=true;while(state.queue.length){const job=state.queue.shift();if(job.voice!==state.voice)continue;const c=clip(job.voice,job.i);if(c.status==='ready')continue;c.status='generating';if(job.i===state.current)buffer('generando este fragmento','busy');const wait=Math.max(0,POST_GAP-(Date.now()-state.lastPost));if(wait)await new Promise(r=>setTimeout(r,wait));state.lastPost=Date.now();try{const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({voicePrompt:VOICES[job.voice].prompt,text:BLOCKS[job.i].text,messageId:clipKey(job.voice,job.i)})});if(r.status===429){c.status='queued';state.queue.unshift(job);await new Promise(r=>setTimeout(r,12000));continue}if(!r.ok)throw new Error(`HTTP ${r.status}`);const blob=await r.blob();if(!blob.size)throw new Error('audio vacío');c.blob=blob;c.url=URL.createObjectURL(blob);c.status='ready';c.cache=r.headers.get('x-modelos-cache')||'MISS';c.bytes=blob.size;c.attempts=0;onReady(job.voice,job.i)}catch(e){c.error=String(e);c.attempts++;if(c.attempts<=4){c.status='queued';state.queue.push(job);await new Promise(r=>setTimeout(r,Math.min(25000,3000*c.attempts)))}else{c.status='error';if(job.i===state.current){buffer('no se pudo generar · reintentá play','error');setStatus('hubo un problema con este fragmento')}}}}
  state.working=false;updateBufferSummary()
}
function onReady(voice,i){if(voice!==state.voice)return;if(i===state.current){buffer('listo para reproducir','ready');if(state.intent&&!state.playing&&!state.audio)startBlock(i)}updateBufferSummary();if(i<=state.current+2)prepareAhead(i+1,2)}
function updateBufferSummary(){const ready=[0,1,2].filter(off=>state.current+off<BLOCKS.length&&clip(state.voice,state.current+off).status==='ready').length;if(state.playing){if(ready>=2)buffer(`${Math.min(ready-1,2)} fragmentos listos por delante`,'ready');else buffer('preparando el siguiente','busy')}else if(clip(state.voice,state.current).status==='ready')buffer('listo para reproducir','ready')}

renderBook();renderVoices();renderHighlight();setPlayIcon();buffer('preparando el comienzo','busy');prepareAhead(0,2);
