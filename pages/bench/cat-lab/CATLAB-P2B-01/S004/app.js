(()=>{
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const chapters=$$('.chapter');
  const currentEl=$('#chapter-current'), ttsPlay=$('#tts-play'), ttsPrev=$('#tts-prev'), ttsNext=$('#tts-next'), ttsRate=$('#tts-rate');
  const ttsStatus=$('#tts-status'), ttsFallback=$('#tts-fallback'), notes=$('#cat-notes');
  const radioPlay=$('#cat-radio-play'), radioVolume=$('#cat-radio-volume'), radioStatus=$('#radio-status'), radioFallback=$('#radio-fallback');
  const KEY='catlab.s004.v1';
  let state={chapter:1,rate:'1',palette:'paper',notes:''};
  try{state={...state,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
  const setChapter=(n,{scroll=false}={})=>{
    n=Math.max(1,Math.min(4,Number(n)||1)); state.chapter=n; currentEl.textContent=String(n); persist();
    if(!ttsPlay.getAttribute('aria-pressed').includes('true')) ttsStatus.textContent=`Listo para leer el capítulo ${n}.`;
    if(scroll) document.getElementById(`chapter-${n}`)?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  notes.value=state.notes||''; notes.addEventListener('input',()=>{state.notes=notes.value;persist()});
  ttsRate.value=['0.8','1','1.2','1.5'].includes(String(state.rate))?String(state.rate):'1';
  ttsRate.addEventListener('change',()=>{state.rate=ttsRate.value;persist(); if(speechOk&&speechSynthesis.speaking){speechSynthesis.cancel();setTts(false,'Ritmo actualizado. Volvé a iniciar la lectura.')}});
  const setPalette=name=>{
    name=name==='night'?'night':'paper'; state.palette=name; document.body.dataset.palette=name;
    $$('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===name))); persist();
  };
  $$('[data-palette]').forEach(b=>b.addEventListener('click',()=>setPalette(b.dataset.palette))); setPalette(state.palette);

  const speechOk=('speechSynthesis' in window)&&('SpeechSynthesisUtterance' in window);
  const setTts=(on,msg)=>{ttsPlay.setAttribute('aria-pressed',String(on));ttsPlay.textContent=on?'pausar':'leer';if(msg)ttsStatus.textContent=msg};
  if(!speechOk){ttsFallback.hidden=false;ttsPlay.disabled=true;ttsPrev.disabled=false;ttsNext.disabled=false;ttsStatus.textContent='Lectura por voz no disponible.'}
  const chapterText=n=>document.querySelector(`#chapter-${n} article`)?.innerText||'';
  const speakCurrent=()=>{
    if(!speechOk)return;
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(chapterText(state.chapter)); u.lang='es-AR'; u.rate=Number(ttsRate.value)||1;
    u.onstart=()=>setTts(true,`Leyendo capítulo ${state.chapter}.`);
    u.onend=()=>setTts(false,`Capítulo ${state.chapter} terminado.`);
    u.onerror=()=>setTts(false,'La síntesis de voz no pudo continuar; el texto sigue disponible.');
    speechSynthesis.speak(u);
  };
  ttsPlay.addEventListener('click',()=>{
    if(!speechOk)return;
    if(speechSynthesis.speaking&&!speechSynthesis.paused){speechSynthesis.pause();setTts(false,'Lectura pausada.');return}
    if(speechSynthesis.paused){speechSynthesis.resume();setTts(true,`Leyendo capítulo ${state.chapter}.`);return}
    speakCurrent();
  });
  const stepChapter=d=>{if(speechOk)speechSynthesis.cancel();setTts(false);setChapter(state.chapter+d,{scroll:true})};
  ttsPrev.addEventListener('click',()=>stepChapter(-1)); ttsNext.addEventListener('click',()=>stepChapter(1));

  if('IntersectionObserver' in window){
    const obs=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible)setChapter(visible.target.dataset.catlabChapter);
    },{rootMargin:'-18% 0px -58% 0px',threshold:[0,.15,.35,.6]}); chapters.forEach(c=>obs.observe(c));
  }
  document.addEventListener('keydown',e=>{
    const a=document.activeElement, editable=a&&(a.matches('input,textarea,select')||a.isContentEditable); if(editable)return;
    if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();stepChapter(1)}
    if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();stepChapter(-1)}
  });

  let audioCtx=null, master=null, nodes=[];
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  const setRadio=on=>{radioPlay.setAttribute('aria-pressed',String(on));radioPlay.textContent=on?'apagar':'encender';radioStatus.textContent=on?'Cat Radio encendida.':'Radio detenida.'};
  if(!AudioCtx){radioFallback.hidden=false;radioPlay.disabled=true;radioStatus.textContent='Web Audio no disponible.'}
  const startRadio=async()=>{
    if(!AudioCtx)return;
    audioCtx=audioCtx||new AudioCtx(); await audioCtx.resume();
    master=audioCtx.createGain(); master.gain.value=Number(radioVolume.value)*0.14; master.connect(audioCtx.destination);
    const base=audioCtx.currentTime;
    [164.81,220,293.66].forEach((freq,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=i===1?'triangle':'sine';o.frequency.value=freq;g.gain.value=.22/(i+1);o.connect(g).connect(master);o.start(base);nodes.push(o,g)});
    const lfo=audioCtx.createOscillator(),lg=audioCtx.createGain();lfo.frequency.value=.08;lg.gain.value=.035;lfo.connect(lg).connect(master.gain);lfo.start();nodes.push(lfo,lg);setRadio(true);
  };
  const stopRadio=()=>{nodes.forEach(n=>{try{if(typeof n.stop==='function')n.stop()}catch(e){};try{n.disconnect()}catch(e){}});nodes=[];try{master?.disconnect()}catch(e){};master=null;setRadio(false)};
  radioPlay.addEventListener('click',()=>radioPlay.getAttribute('aria-pressed')==='true'?stopRadio():startRadio().catch(()=>{stopRadio();radioFallback.hidden=false;radioStatus.textContent='No se pudo iniciar Web Audio; la radio permanece apagada.'}));
  radioVolume.addEventListener('input',()=>{if(master&&audioCtx)master.gain.setTargetAtTime(Number(radioVolume.value)*.14,audioCtx.currentTime,.03)});

  setChapter(state.chapter); ttsRate.dispatchEvent(new Event('change')); requestAnimationFrame(()=>document.getElementById(`chapter-${state.chapter}`)?.scrollIntoView({block:'start'}));
  addEventListener('beforeunload',()=>{if(speechOk)speechSynthesis.cancel();stopRadio()},{once:true});
})();
