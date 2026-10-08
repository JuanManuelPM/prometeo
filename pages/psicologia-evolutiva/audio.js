/* Lector en voz alta para Psicología Evolutiva · mantiene intacto el motor de estudio compartido. */
(()=>{
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const all=(s,r=document)=>[...r.querySelectorAll(s)];
const synth=typeof window!=="undefined"&&"speechSynthesis" in window?window.speechSynthesis:null;
const voice={chunks:[],index:0,token:0,active:null,speed:1,paused:false,playing:false,mode:"",label:""};
try{voice.speed=Number(localStorage.getItem("evolutiva:voz:velocidad")||1)}catch{}
function getVoice(){
 const voices=synth?.getVoices?.()||[];
 return voices.find(v=>/^es-AR$/i.test(v.lang))||voices.find(v=>/^es(?:-|$)/i.test(v.lang))||null;
}
function splitText(text){
 const words=String(text||"").replace(/\s+/g," ").trim().split(" ");
 const result=[];let buf="";
 for(const w of words){
   if(!w)continue;
   if(buf.length+w.length+1>190&&buf){result.push(buf);buf="";}
   buf+=(buf?" ":"")+w;
   if(buf.length>110&&/[.!?;:]$/.test(w)){result.push(buf);buf="";}
 }
 if(buf)result.push(buf);
 return result;
}
function status(label,sub=""){
 const t=$("#voiceTitle"),s=$("#voiceSub");
 if(t)t.textContent=label;
 if(s)s.textContent=sub;
}
function updateUI(){
 const pause=$("#voicePause"),stop=$("#voiceStop");
 if(pause){pause.disabled=!voice.playing;pause.textContent=voice.paused?"▶ Seguir":"⏸ Pausar"}
 if(stop)stop.disabled=!voice.playing;
 all("[data-voice-topic]").forEach(b=>{
   const on=voice.playing&&voice.active===b.dataset.voiceTopic;
   b.classList.toggle("playing",on);
   b.textContent=on?"◼ Sonando":"▶ Escuchar";
 });
}
function stop(){
 ++voice.token;voice.playing=false;voice.paused=false;voice.index=0;voice.chunks=[];voice.active=null;
 try{synth?.cancel()}catch{}
 status("Lector en voz alta","Listo para escuchar · voz del navegador");
 updateUI();
}
function takeText(article){
 const pick=s=>$(s,article)?.textContent?.trim()||"";
 return [pick(".topicTitle"),pick(".lead"),pick(".explanation"),...all(".pane",article).map(p=>{
   const k=$(".paneLabel",p)?.textContent||"";
   const v=$(".paneText",p)?.textContent||"";
   return k&&v?(k+". "+v):"";
 })].filter(Boolean).join(". ");
}
function speakNext(token){
 if(token!==voice.token||!voice.playing)return;
 if(voice.index>=voice.chunks.length){
   const label=voice.label;
   stop();status("Lectura terminada",label);return;
 }
 const text=voice.chunks[voice.index];
 const u=new SpeechSynthesisUtterance(text);
 u.lang="es-AR";u.rate=voice.speed;u.pitch=1;u.volume=1;
 const selected=getVoice();if(selected)u.voice=selected;
 u.onend=()=>{if(token!==voice.token||!voice.playing)return;voice.index++;status(voice.label,"Fragmento "+Math.min(voice.index+1,voice.chunks.length)+" de "+voice.chunks.length);speakNext(token)};
 u.onerror=e=>{if(token!==voice.token)return;const code=String(e?.error||"desconocido");if(code==="canceled"||code==="interrupted")return;voice.index++;if(voice.index>=voice.chunks.length){stop();status("Audio interrumpido","La voz de este navegador devolvió: "+code)}else{speakNext(token)}};
 try{synth.speak(u)}catch(e){stop();status("No se pudo reproducir",String(e?.message||e))}
}
function start(text,label,active){
 if(!synth||typeof window.SpeechSynthesisUtterance==="undefined"){
   status("Voz no disponible","Probá abrir esta página en Chrome o en un navegador con lectura de voz.");return;
 }
 ++voice.token;try{synth.cancel()}catch{}
 voice.chunks=splitText(text);voice.index=0;voice.active=active||null;voice.label=label;voice.playing=voice.chunks.length>0;voice.paused=false;
 if(!voice.playing){status("No encontré texto para escuchar","Abrí un tema y volvé a intentar.");updateUI();return}
 status(label,"Fragmento 1 de "+voice.chunks.length);updateUI();speakNext(voice.token);
}
function topicClick(e){
 e.preventDefault();e.stopPropagation();
 const t=e.currentTarget.closest(".topic");
 if(!t)return;
 if(voice.playing&&voice.active===t.dataset.topic){stop();return}
 start(takeText(t),$(".topicTitle",t)?.textContent||"Tema",t.dataset.topic);
}
function speakModule(){
 const m=$(".module");
 if(!m){status("Todavía cargando","Esperá a que aparezcan los temas");return}
 const title=$(".moduleTitle",m)?.textContent||"Módulo";
 const blocks=all(".topic",m).map(t=>takeText(t));
 const lead=$(".moduleSummary",m)?.textContent||"";
 start([title,lead,...blocks].join(". "),title,null);
}
function togglePause(){
 if(!synth||!voice.playing)return;
 if(voice.paused){try{synth.resume();voice.paused=false;status(voice.label,"Reproduciendo · fragmento "+(voice.index+1)+"/"+voice.chunks.length)}catch{}}
 else{try{synth.pause();voice.paused=true;status(voice.label,"En pausa · fragmento "+(voice.index+1)+"/"+voice.chunks.length)}catch{}}
 updateUI();
}
function decorate(){
 const app=$("#app");if(!app||!$(".moduleHead",app))return;
 all(".topic",app).forEach(t=>{
   const tools=$(".topicTools",t);
   if(!tools||$("[data-voice-topic]",tools))return;
   const b=document.createElement("button");b.type="button";b.className="listenTopic";
   b.dataset.voiceTopic=t.dataset.topic||"";b.textContent="▶ Escuchar";
   b.setAttribute("aria-label","Escuchar este tema en voz alta");
   b.addEventListener("click",topicClick);
   tools.prepend(b);
 });
 const head=$(".moduleHead",app);
 if(head&&!$(".studyLegend",head)){
   const p=document.createElement("div");p.className="studyLegend";
   p.innerHTML="<span>Texto y ejemplos desarrollados para estudiar · no reemplazan la bibliografía.</span><a href='study-library/' title='Biblioteca académica'>Biblioteca</a>";
   head.appendChild(p);
 }
 updateUI();
}
function buildDock(){
 if($("#voiceDock"))return;
 const bar=document.createElement("aside");bar.id="voiceDock";bar.className="voiceDock";
 bar.setAttribute("aria-label","Controles de lectura en voz alta");
 bar.innerHTML='<div class="voiceState" aria-live="polite"><b id="voiceTitle">Lector en voz alta</b><small id="voiceSub">Voz del navegador · sin exportar audio</small></div><button type="button" id="voicePlay" class="voicePrimary">▶ Escuchar módulo</button><button type="button" id="voicePause" disabled>⏸ Pausar</button><button type="button" id="voiceStop" disabled>■ Detener</button><label for="voiceSpeed" style="font-size:11px;font-weight:800">Vel.</label><select id="voiceSpeed" aria-label="Velocidad de lectura"><option value="0.8">0,8×</option><option value="1">1×</option><option value="1.15">1,15×</option><option value="1.3">1,3×</option></select>';
 document.body.appendChild(bar);
 $("#voicePlay").addEventListener("click",speakModule);
 $("#voicePause").addEventListener("click",togglePause);
 $("#voiceStop").addEventListener("click",stop);
 const rate=$("#voiceSpeed");rate.value=String([0.8,1,1.15,1.3].includes(voice.speed)?voice.speed:1);
 rate.addEventListener("change",()=>{voice.speed=Number(rate.value)||1;try{localStorage.setItem("evolutiva:voz:velocidad",String(voice.speed))}catch{};if(voice.playing){stop();status("Velocidad cambiada","Volvé a tocar Escuchar para aplicar "+rate.value+"×")}});
 document.addEventListener("click",e=>{if(e.target.closest?.("[data-module]"))stop()},true);
 document.addEventListener("visibilitychange",()=>{if(document.hidden&&voice.playing&&!voice.paused){try{synth?.pause();voice.paused=true;updateUI()}catch{}}});
 if(!synth)status("Voz no disponible","Este navegador no tiene síntesis de voz.");
}
function init(){
 buildDock();
 const app=$("#app");if(!app)return;
 const obs=new MutationObserver(decorate);obs.observe(app,{childList:true,subtree:true});
 decorate();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();