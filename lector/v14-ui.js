(()=>{
'use strict';
const $=id=>document.getElementById(id);
const card=$('playerCard'),play=$('playBtn'),settings=$('settingsPanel'),settingsBtn=$('settingsBtn'),bufferHint=$('bufferHint');
const voiceChoices=$('voiceChoices'),speedChoices=$('speedChoices');
const fontSlider=$('fontSlider'),fontValue=$('fontValue'),speedSlider=$('speedSlider'),speedValue=$('speedValue');
if(!card||!play||!settings||!settingsBtn)return;

const safeGet=(k,f)=>{try{const v=localStorage.getItem(k);return v==null?f:v}catch{return f}};
const safeSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
const SPEEDS=[0.75,1,1.25,1.5,2];
let fontPx=Number(safeGet('lector:v14:fontPx',18));
if(!Number.isFinite(fontPx))fontPx=18;
fontPx=Math.max(12,Math.min(32,fontPx));

function applyFont(px,save=true){
  fontPx=Math.max(12,Math.min(32,Number(px)||18));
  card.style.setProperty('--reader-font-size',`${fontPx}px`);
  if(fontSlider)fontSlider.value=String(fontPx);
  if(fontValue)fontValue.textContent=`${Math.round(fontPx)} px`;
  if(save)safeSet('lector:v14:fontPx',fontPx);
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
}

let activePane='text';
function showPane(name){
  activePane=name;
  settings.querySelectorAll('.settingsTab').forEach(b=>{
    const on=b.dataset.pane===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));
  });
  settings.querySelectorAll('.settingsPane').forEach(p=>p.classList.toggle('active',p.dataset.settingsPane===name));
  syncControls();
}
settings.querySelectorAll('.settingsTab').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();showPane(b.dataset.pane)}));

function currentSpeedIndex(){
  if(!speedChoices)return 1;
  const buttons=[...speedChoices.querySelectorAll('button')];
  const active=buttons.findIndex(b=>b.classList.contains('active'));
  return active>=0?active:1;
}
function syncSpeed(){
  const i=currentSpeedIndex();
  if(speedSlider)speedSlider.value=String(i);
  if(speedValue)speedValue.textContent=`${String(SPEEDS[i]).replace('.',',')}×`;
}
function setSpeedByIndex(i){
  i=Math.max(0,Math.min(SPEEDS.length-1,Number(i)||0));
  if(!speedChoices)return;
  const buttons=[...speedChoices.querySelectorAll('button')];
  const target=buttons[i];
  if(target)target.click();
  setTimeout(syncSpeed,0);
}
if(speedSlider){
  speedSlider.addEventListener('input',()=>{const i=Number(speedSlider.value);if(speedValue)speedValue.textContent=`${String(SPEEDS[i]).replace('.',',')}×`});
  speedSlider.addEventListener('change',()=>setSpeedByIndex(Number(speedSlider.value)));
  speedSlider.addEventListener('pointerup',()=>setSpeedByIndex(Number(speedSlider.value)));
}
if(fontSlider)fontSlider.addEventListener('input',()=>applyFont(fontSlider.value));

function syncControls(){applyFont(fontPx,false);syncSpeed()}
if(voiceChoices)new MutationObserver(()=>{if(activePane==='voice')requestAnimationFrame(()=>{})}).observe(voiceChoices,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
if(speedChoices)new MutationObserver(syncSpeed).observe(speedChoices,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});

// Keep the settings area to one active pane when it opens.
settingsBtn.addEventListener('click',()=>setTimeout(()=>{
  if(!settings.hidden)showPane(activePane);
},0));

// Clear loading feedback only when playback really begins.
let pending=false,wasPlaying=false;
play.addEventListener('click',()=>{wasPlaying=play.dataset.playing==='1'},true);
play.addEventListener('click',()=>setTimeout(()=>{
  if(wasPlaying)pending=false;
  else if(play.dataset.playing!=='1')pending=true;
  syncLoading();
},70));
function syncLoading(){
  if(play.dataset.playing==='1')pending=false;
  play.classList.toggle('is-loading',pending&&play.dataset.playing!=='1');
  if(bufferHint){const preparing=/prepar/i.test(bufferHint.textContent||'');bufferHint.classList.toggle('is-loading',preparing)}
}
new MutationObserver(syncLoading).observe(play,{attributes:true,attributeFilter:['data-playing']});
if(bufferHint)new MutationObserver(syncLoading).observe(bufferHint,{childList:true,subtree:true,characterData:true});

applyFont(fontPx,false);showPane('text');syncLoading();
})();
