(()=>{'use strict';
const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/modelos-room-audio-v2';
const VOICE='Argentine male teacher. Warm medium-low voice, clear and patient. Natural Rioplatense Spanish. Explain as if to one student, with brief useful pauses. Same speaker throughout.';
const MAX=480;
const DATA=[
{title:'Unidad 1',paras:[
'El aprendizaje puede pensarse como un cambio relativamente estable en la conducta o en el conocimiento que aparece a partir de la experiencia. Esta definición permite separar el aprendizaje de cambios pasajeros producidos por fatiga, maduración o estados momentáneos. Lo importante no es sólo que algo cambie, sino que exista una modificación que pueda mantenerse y recuperarse más adelante.',
'En el condicionamiento clásico, un estímulo que al comienzo era neutro adquiere la capacidad de provocar una respuesta porque se asocia repetidamente con otro estímulo que ya la producía. Conviene distinguir adquisición, extinción, recuperación espontánea, generalización y discriminación. Estos procesos muestran que aprender no significa simplemente acumular asociaciones: también implica modificar expectativas según el contexto.',
'Cuando estudiamos para un examen, este modelo sirve para entender por qué ciertos lugares, horarios o señales pueden facilitar la recuperación de lo aprendido. El contexto no reemplaza al contenido, pero puede convertirse en una pista. Por eso cambiar de ambiente durante el estudio puede hacer más flexible el recuerdo y evitar que quede demasiado ligado a una sola situación.'
]},
{title:'Unidad 2',paras:[
'El condicionamiento operante se centra en la relación entre una conducta y sus consecuencias. Si una consecuencia aumenta la probabilidad futura de una respuesta hablamos de reforzamiento; si la reduce, hablamos de castigo. Positivo y negativo no significan bueno y malo: indican si se agrega o se retira un estímulo después de la conducta.',
'Los programas de reforzamiento ayudan a explicar por qué algunas conductas son muy persistentes. En un programa de razón variable, por ejemplo, el reforzador aparece después de una cantidad cambiante de respuestas. Esa incertidumbre puede sostener una tasa alta de respuesta. En cambio, otros programas generan pausas o ritmos más regulares.',
'Para estudiar, la idea más útil es que la práctica produce mejores resultados cuando exige una respuesta real. Recuperar una definición sin mirarla, resolver un ejercicio o explicar un concepto en voz alta genera una consecuencia informativa inmediata: permite detectar qué sabemos y qué todavía no podemos recuperar con facilidad.'
]},
{title:'Unidad 3',paras:[
'La memoria no funciona como un depósito único. Para comprenderla conviene separar procesos de codificación, almacenamiento y recuperación. Codificar supone transformar la información de manera que pueda integrarse a sistemas previos de conocimiento. La profundidad con la que procesamos un material influye en la probabilidad de recordarlo.',
'La memoria de trabajo permite mantener y manipular una cantidad limitada de información durante períodos breves. Cuando intentamos sostener demasiados elementos al mismo tiempo, parte de la información se pierde o interfiere con otra. Organizar, agrupar y relacionar contenidos reduce esa carga y facilita construir estructuras más amplias.',
'La recuperación también modifica la memoria. Cada vez que recordamos, reconstruimos el contenido a partir de huellas, conocimientos previos y claves disponibles. Por eso practicar la recuperación no sólo mide lo aprendido: también fortalece rutas de acceso. Para un parcial, alternar explicación, preguntas y ejercicios suele ser más útil que releer de manera continua.'
]},
{title:'Unidad 4',paras:[
'Olvidar no siempre significa que una información haya desaparecido. A veces el problema está en las claves de recuperación disponibles. Otras veces intervienen procesos de interferencia: aprendizajes anteriores dificultan incorporar material nuevo, o aprendizajes recientes dificultan recuperar contenidos previos.',
'El espaciado ayuda a combatir parte de estos problemas porque obliga a reconstruir el contenido después de intervalos en los que ya no está completamente disponible. Esa pequeña dificultad es productiva. Si una respuesta sale de inmediato porque acabamos de verla, la sensación de dominio puede ser mayor que el aprendizaje real.',
'Un resumen útil para estudiar debería permitir dos recorridos. Uno rápido, para recuperar la estructura general de cada unidad, y otro profundo, para detenerse en conceptos concretos. El audio puede funcionar como una tercera vía: no sustituye la lectura, pero permite repasar mientras caminamos, viajamos o descansamos la vista.'
]}
];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const unitsEl=document.getElementById('units');
let active=null,lastPost=0;

function chunkText(text){
  const sentences=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[text];
  const out=[];let buf='';
  for(const s0 of sentences){const s=s0.trim();if(!s)continue;if((buf+' '+s).trim().length<=MAX){buf=(buf+' '+s).trim();continue}if(buf){out.push(buf);buf=''}if(s.length<=MAX){buf=s;continue}let rest=s;while(rest.length>MAX){let cut=rest.lastIndexOf(' ',MAX);if(cut<MAX*.55)cut=MAX;out.push(rest.slice(0,cut).trim());rest=rest.slice(cut).trim()}buf=rest}
  if(buf)out.push(buf);return out;
}

function makeUnit(data,index){
  const full=data.paras.join('\n');const texts=chunkText(full);let at=0;
  const chunks=texts.map((text,i)=>{const start=at;at+=text.length;return{i,text,start,end:at,status:'idle',audio:null,url:null,promise:null}});
  const total=Math.max(1,at);
  const el=document.createElement('section');el.className='unit';el.dataset.state='idle';
  el.innerHTML=`<header class="unitHead"><h2 class="unitTitle">${data.title}</h2><span class="unitMeta">lectura + audio</span></header><div class="readerFrame"><aside class="railCol"><div class="rail"><div class="railFill"></div><button class="thumb" type="button" data-playing="0" aria-label="Reproducir ${data.title}"><svg class="play" viewBox="0 0 12 14" aria-hidden="true"><path d="M2.2 1.5c0-.7.77-1.12 1.36-.75l7.1 4.45c.55.35.55 1.15 0 1.5l-7.1 4.45a.88.88 0 0 1-1.36-.75V1.5Z" fill="currentColor"/></svg><svg class="pause" viewBox="0 0 12 14" aria-hidden="true"><rect x="1" y="1" width="3" height="12" rx="1" fill="currentColor"/><rect x="8" y="1" width="3" height="12" rx="1" fill="currentColor"/></svg></button></div></aside><article class="text">${data.paras.map(p=>`<p>${p}</p>`).join('')}</article></div>`;
  unitsEl.appendChild(el);
  const u={id:index,title:data.title,el,chunks,total,current:0,audio:null,playing:false,intent:false,ratio:0,drag:null,rail:el.querySelector('.rail'),fill:el.querySelector('.railFill'),thumb:el.querySelector('.thumb')};
  bindUnit(u);render(u);return u;
}

function messageId(u,i){return`summary-open-v1-u${u.id}-julian-${i}`}
async function ensure(u,i){
  const c=u.chunks[i];if(!c)return null;if(c.status==='ready')return c;if(c.promise)return c.promise;
  c.promise=(async()=>{c.status='loading';render(u);const id=messageId(u,i);
    try{const r=await fetch(`${API}?id=${encodeURIComponent(id)}`,{cache:'no-store'});if(r.ok){await accept(c,r);render(u);return c}}catch{}
    for(;;){try{const wait=Math.max(0,3400-(Date.now()-lastPost));if(wait)await sleep(wait);lastPost=Date.now();const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({voicePrompt:VOICE,text:c.text,messageId:id})});if(r.ok){await accept(c,r);render(u);return c}if(r.status===429){await sleep(12000);continue}}catch{}await sleep(7000)}
  })();return c.promise;
}
async function accept(c,r){const blob=await r.blob();c.url=URL.createObjectURL(blob);c.audio=new Audio(c.url);c.audio.preload='auto';c.status='ready';c.promise=null}

function globalRatio(u){const c=u.chunks[u.current];if(!c)return u.ratio;if(u.audio&&Number.isFinite(u.audio.duration)&&u.audio.duration>0){return clamp((c.start+(c.end-c.start)*(u.audio.currentTime/u.audio.duration))/u.total,0,1)}return u.ratio}
function render(u){u.ratio=globalRatio(u);const pct=u.ratio*100;u.thumb.style.top=`${pct}%`;u.fill.style.height=`${pct}%`;u.thumb.dataset.playing=u.playing?'1':'0';u.thumb.classList.toggle('is-loading',u.intent&&!u.playing&&(u.chunks[u.current]?.status!=='ready'));u.el.dataset.state=u.chunks[u.current]?.status==='ready'?'ready':(u.intent?'loading':'idle')}
function stopOther(next){if(active&&active!==next){active.intent=false;active.playing=false;active.audio?.pause();render(active)}active=next}
function bindAudio(u,a){a.ontimeupdate=()=>render(u);a.onplay=()=>{u.playing=true;render(u)};a.onpause=()=>{if(!a.ended){u.playing=false;render(u)}};a.onended=()=>advance(u)}
async function start(u){stopOther(u);u.intent=true;render(u);const c=u.chunks[u.current];await ensure(u,u.current);if(!u.intent||active!==u)return;u.audio=c.audio;bindAudio(u,u.audio);const local=clamp((u.ratio*u.total-c.start)/Math.max(1,c.end-c.start),0,1);const go=async()=>{try{u.audio.currentTime=(u.audio.duration||0)*local;await u.audio.play();u.playing=true;render(u);ensure(u,u.current+1)}catch{u.playing=false;render(u)}};if(Number.isFinite(u.audio.duration))go();else u.audio.addEventListener('loadedmetadata',go,{once:true})}
function pause(u){u.ratio=globalRatio(u);u.intent=false;u.playing=false;u.audio?.pause();render(u)}
function toggle(u){if(u.playing||u.intent){pause(u);return}start(u)}
function advance(u){u.ratio=u.chunks[u.current].end/u.total;if(u.current>=u.chunks.length-1){u.intent=false;u.playing=false;u.ratio=1;render(u);return}u.current++;u.audio=null;u.playing=false;render(u);if(u.intent)start(u)}
function seek(u,ratio,resume){ratio=clamp(ratio,0,1);u.audio?.pause();u.playing=false;u.ratio=ratio;const target=ratio*u.total;let i=u.chunks.findIndex(c=>target<=c.end);if(i<0)i=u.chunks.length-1;u.current=i;u.audio=null;u.intent=resume;render(u);if(resume)start(u)}
function railRatio(u,y){const r=u.rail.getBoundingClientRect();return clamp((y-r.top)/Math.max(1,r.height),0,1)}
function bindUnit(u){
  u.thumb.addEventListener('click',e=>{e.stopPropagation();toggle(u)});
  u.rail.addEventListener('pointerdown',e=>{if(u.thumb.contains(e.target))return;e.preventDefault();const resume=u.playing||u.intent;u.drag={id:e.pointerId,resume};u.rail.classList.add('dragging');u.thumb.classList.add('dragging');try{u.rail.setPointerCapture(e.pointerId)}catch{}seek(u,railRatio(u,e.clientY),false)});
  u.rail.addEventListener('pointermove',e=>{if(!u.drag||u.drag.id!==e.pointerId)return;seek(u,railRatio(u,e.clientY),false)});
  const end=e=>{if(!u.drag||u.drag.id!==e.pointerId)return;const resume=u.drag.resume;u.drag=null;u.rail.classList.remove('dragging');u.thumb.classList.remove('dragging');if(resume)start(u)};
  u.rail.addEventListener('pointerup',end);u.rail.addEventListener('pointercancel',end)
}

DATA.map(makeUnit);
})();