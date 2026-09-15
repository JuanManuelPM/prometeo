(()=>{
'use strict';
const $=id=>document.getElementById(id);
const card=$('playerCard'),play=$('playBtn'),settingsBtn=$('settingsBtn'),settings=$('settingsPanel'),bufferHint=$('bufferHint');
const textChoices=$('textChoices'),voiceChoices=$('voiceChoices'),speedChoices=$('speedChoices');
if(!card||!play||!settingsBtn||!settings)return;

const FONT_STEPS=[
  {id:'xxs',label:'A−−',px:13},
  {id:'s',label:'A−',px:15.5},
  {id:'m',label:'A',px:18},
  {id:'l',label:'A+',px:22},
  {id:'xl',label:'A++',px:27}
];
const safeGet=(k,f)=>{try{return localStorage.getItem(k)||f}catch{return f}};
const safeSet=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
let fontStep=safeGet('lector:v13:font','m');
if(!FONT_STEPS.some(x=>x.id===fontStep))fontStep='m';

function applyFont(){
  const x=FONT_STEPS.find(v=>v.id===fontStep)||FONT_STEPS[2];
  card.style.setProperty('--reader-font-size',`${x.px}px`);
  const cur=$('textCurrent');if(cur)cur.textContent=x.label;
}

let rewriting=false;
function renderTextChoices(){
  if(!textChoices||rewriting)return;
  rewriting=true;
  textChoices.innerHTML=FONT_STEPS.map(x=>`<button class="choice${x.id===fontStep?' active':''}" data-v13-size="${x.id}">${x.label}</button>`).join('');
  textChoices.querySelectorAll('[data-v13-size]').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();fontStep=b.dataset.v13Size;safeSet('lector:v13:font',fontStep);applyFont();renderTextChoices();
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }));
  rewriting=false;
}
if(textChoices){
  new MutationObserver(()=>{
    if(rewriting)return;
    const btn=textChoices.querySelector('button');
    if(!btn||!btn.hasAttribute('data-v13-size'))renderTextChoices();
  }).observe(textChoices,{childList:true});
}

function syncCurrent(){
  const v=$('voiceCurrent'),s=$('speedCurrent');
  if(v&&voiceChoices){const a=voiceChoices.querySelector('.choice.active');v.textContent=a?.textContent?.trim()||'Julián'}
  if(s&&speedChoices){const a=speedChoices.querySelector('.choice.active');s.textContent=a?.textContent?.trim()||'1×'}
  applyFont();
}

settings.querySelectorAll('.settingToggle').forEach(toggle=>toggle.addEventListener('click',e=>{
  e.stopPropagation();
  const row=toggle.closest('.settingRow');
  const willOpen=!row.classList.contains('open');
  settings.querySelectorAll('.settingRow.open').forEach(r=>r.classList.remove('open'));
  if(willOpen)row.classList.add('open');
}));
settings.addEventListener('click',()=>setTimeout(()=>{renderTextChoices();syncCurrent()},0));
settingsBtn.addEventListener('click',()=>setTimeout(()=>{renderTextChoices();syncCurrent()},0));

let beforePlaying=false,pendingPlay=false;
play.addEventListener('click',()=>{beforePlaying=play.dataset.playing==='1'},true);
play.addEventListener('click',()=>setTimeout(()=>{
  if(beforePlaying){pendingPlay=false}else if(play.dataset.playing!=='1'){pendingPlay=true}
  syncLoading();
},60));
function syncLoading(){
  if(play.dataset.playing==='1')pendingPlay=false;
  play.classList.toggle('is-loading',pendingPlay&&play.dataset.playing!=='1');
  if(bufferHint){const preparing=/prepar/i.test(bufferHint.textContent||'');bufferHint.classList.toggle('is-loading',preparing)}
}
new MutationObserver(syncLoading).observe(play,{attributes:true,attributeFilter:['data-playing']});
if(bufferHint)new MutationObserver(syncLoading).observe(bufferHint,{childList:true,characterData:true,subtree:true});

applyFont();renderTextChoices();syncCurrent();syncLoading();
})();
