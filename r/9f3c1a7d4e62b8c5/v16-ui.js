(()=>{
'use strict';
const $=id=>document.getElementById(id);
const card=$('playerCard'),play=$('playBtn'),settings=$('settingsPanel'),bufferHint=$('bufferHint');
const hiddenVoices=$('voiceChoices'),hiddenSpeeds=$('speedChoices');
const fontSlider=$('fontSlider'),fontValue=$('fontValue'),fontGrid=$('fontGrid');
const voiceGrid=$('voiceGrid'),speedSlider=$('speedSlider'),speedTicks=$('speedTicks'),speedValue=$('speedValue');
if(!card||!play||!settings)return;

const safeGet=(k,f)=>{try{return localStorage.getItem(k)??f}catch{return f}};
const safeSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
const SPEEDS=[0.75,1,1.25,1.5,2];
const FONTS={
  serif:{label:'Georgia',family:'Georgia, "Times New Roman", serif'},
  sans:{label:'Arial',family:'Arial, Helvetica, sans-serif'},
  classic:{label:'Palatino',family:'"Palatino Linotype", "Book Antiqua", Palatino, serif'},
  accessible:{label:'Verdana',family:'Verdana, Tahoma, sans-serif'}
};
const VOICE_META={julian:['Julián','Profesor'],clara:['Clara','Profesora'],vera:['Vera','Lectura'],milo:['Milo','Lectura']};
let fontPx=Math.max(12,Math.min(34,Number(safeGet('reader:v16:fontPx',safeGet('reader:v15:fontPx',18)))||18));
let fontId=safeGet('reader:v16:font',safeGet('reader:v15:font','serif'));if(!FONTS[fontId])fontId='serif';
let activePane=safeGet('reader:v16:pane','text');if(!['text','voice'].includes(activePane))activePane='text';
let lastSpeedIndex=1;
let pendingPlay=false,voicePending=false;

function applyFont(){
  card.style.setProperty('--reader-font-size',`${fontPx}px`);
  card.style.setProperty('--reader-font-family',FONTS[fontId].family);
  if(fontSlider)fontSlider.value=String(fontPx);
  if(fontValue)fontValue.textContent=`${fontPx} px`;
  if(fontGrid)fontGrid.querySelectorAll('[data-font]').forEach(b=>b.classList.toggle('active',b.dataset.font===fontId));
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
}
function renderFonts(){
  if(!fontGrid)return;
  fontGrid.innerHTML=Object.entries(FONTS).map(([id,f])=>`<button type="button" class="fontChoice${id===fontId?' active':''}" data-font="${id}"><strong>${f.label}</strong></button>`).join('');
  fontGrid.querySelectorAll('[data-font]').forEach(b=>b.onclick=()=>{fontId=b.dataset.font;safeSet('reader:v16:font',fontId);applyFont()});
}
function hiddenVoiceButton(id){return hiddenVoices?.querySelector(`[data-v="${id}"]`)||null}
function currentVoiceId(){return hiddenVoices?.querySelector('.choice.active')?.dataset.v||'julian'}
function renderVoices(){
  if(!voiceGrid)return;const current=currentVoiceId();
  voiceGrid.innerHTML=Object.entries(VOICE_META).map(([id,[name]])=>`<button type="button" class="voiceChoice${id===current?' active':''}" data-voice="${id}"><strong>${name}</strong></button>`).join('');
  voiceGrid.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.voice;if(id===currentVoiceId())return;
    voicePending=true;pendingPlay=false;play.classList.add('is-loading');
    hiddenVoiceButton(id)?.click();renderVoices();syncLoading();
  });
}
function currentSpeed(){const b=hiddenSpeeds?.querySelector('.choice.active');const n=Number(b?.dataset.s);return SPEEDS.includes(n)?n:1}
function clickSpeed(v){hiddenSpeeds?.querySelector(`[data-s="${v}"]`)?.click()}
function renderSpeed(){
  const v=currentSpeed();let idx=SPEEDS.indexOf(v);if(idx<0)idx=1;lastSpeedIndex=idx;
  if(speedSlider)speedSlider.value=String(idx);
  if(speedValue)speedValue.textContent=`${String(v).replace('.',',')}×`;
  if(speedTicks){
    speedTicks.innerHTML=SPEEDS.map((s,i)=>`<button type="button" class="speedTick${i===idx?' active':''}" data-speed-index="${i}">${String(s).replace('.',',')}×</button>`).join('');
    speedTicks.querySelectorAll('button').forEach(b=>b.onclick=()=>setSpeedIndex(Number(b.dataset.speedIndex),true));
  }
}
function haptic(){try{navigator.vibrate?.(8)}catch{}}
function setSpeedIndex(idx,fromTap=false){idx=Math.max(0,Math.min(SPEEDS.length-1,idx));if(idx!==lastSpeedIndex){haptic();lastSpeedIndex=idx}clickSpeed(SPEEDS[idx]);renderSpeed();if(fromTap&&speedSlider)speedSlider.value=String(idx)}
function setPane(name){
  activePane=name;safeSet('reader:v16:pane',name);
  settings.querySelectorAll('.settingsTab').forEach(b=>{const on=b.dataset.pane===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))});
  settings.querySelectorAll('.settingsPane').forEach(p=>p.classList.toggle('active',p.dataset.settingsPane===name));
  if(name==='voice'){renderVoices();renderSpeed()}
}
settings.querySelectorAll('.settingsTab').forEach(b=>b.onclick=()=>setPane(b.dataset.pane));
if(fontSlider){fontSlider.value=String(fontPx);fontSlider.oninput=()=>{fontPx=Number(fontSlider.value);safeSet('reader:v16:fontPx',fontPx);applyFont()}}
if(speedSlider){speedSlider.oninput=()=>setSpeedIndex(Number(speedSlider.value),false)}
if(hiddenVoices)new MutationObserver(()=>{renderVoices();syncLoading()}).observe(hiddenVoices,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
if(hiddenSpeeds)new MutationObserver(renderSpeed).observe(hiddenSpeeds,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
play.addEventListener('click',()=>setTimeout(()=>{if(play.dataset.playing!=='1'&&/prepar/i.test(bufferHint?.textContent||''))pendingPlay=true;syncLoading()},30));
function syncLoading(){
  const preparing=/prepar/i.test(bufferHint?.textContent||'');
  if(play.dataset.playing==='1'){pendingPlay=false;voicePending=false}
  if(!preparing&&voicePending)voicePending=false;
  const loading=(pendingPlay||voicePending)&&play.dataset.playing!=='1';
  play.classList.toggle('is-loading',loading);
  if(bufferHint)bufferHint.classList.toggle('is-loading',preparing);
}
if(bufferHint)new MutationObserver(syncLoading).observe(bufferHint,{childList:true,characterData:true,subtree:true});
new MutationObserver(syncLoading).observe(play,{attributes:true,attributeFilter:['data-playing']});
renderFonts();applyFont();renderVoices();renderSpeed();setPane(activePane);syncLoading();
})();
