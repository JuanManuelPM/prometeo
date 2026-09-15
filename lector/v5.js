(()=>{
  const $=id=>document.getElementById(id);
  const card=$('chapterCard'),toggle=$('chapterToggle'),body=$('chapterBody'),play=$('playBtn');
  const rail=$('railTrack'),thumb=$('railThumb'),pct=$('miniPct'),chapterPct=$('chapterProgress');
  const settingsBtn=$('chapterSettingsBtn'),settingsPanel=$('settingsPanel'),settingsVoices=$('settingsVoices'),settingsSpeeds=$('settingsSpeeds');
  const readTime=$('readTime');
  if(!card||!toggle||!play||!rail||!thumb)return;

  const SPEEDS=[0.75,1,1.25,1.5,2];
  let speed=Number(localStorage.getItem('lector:playbackRate')||1);
  if(!SPEEDS.includes(speed))speed=1;

  function isPlaying(){try{return !!state.playing}catch{return play.getAttribute('aria-label')==='Pausar'}}
  function playSvg(playing){
    if(playing)return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor"/></svg>';
    return '<svg class="playIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.8c0-.86.94-1.39 1.68-.95l9.1 5.55a1.86 1.86 0 0 1 0 3.2l-9.1 5.55A1.1 1.1 0 0 1 8 18.2V5.8Z" fill="currentColor"/></svg>';
  }
  function railSvg(playing){
    if(playing)return '<svg class="railIcon" viewBox="0 0 12 14" aria-hidden="true"><rect x="1" y="1" width="3" height="12" rx="1" fill="currentColor"/><rect x="8" y="1" width="3" height="12" rx="1" fill="currentColor"/></svg>';
    return '<svg class="railIcon" viewBox="0 0 12 14" aria-hidden="true"><path d="M2.2 1.5c0-.7.77-1.12 1.36-.75l7.1 4.45c.55.35.55 1.15 0 1.5l-7.1 4.45a.88.88 0 0 1-1.36-.75V1.5Z" fill="currentColor"/></svg>';
  }
  function syncIcons(){
    const playing=isPlaying();
    if(!play.querySelector('svg')||play.dataset.playing!==String(playing)){
      play.dataset.playing=String(playing);play.innerHTML=playSvg(playing);
    }
    thumb.classList.toggle('paused',!playing);
    thumb.innerHTML=railSvg(playing);
    thumb.setAttribute('aria-label',playing?'Pausar lectura':'Reanudar lectura');
  }

  function syncPct(){if(pct&&chapterPct)pct.textContent=chapterPct.textContent||'0%'}
  function openChapter(open){
    card.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));body.setAttribute('aria-hidden',String(!open));
    if(!open&&settingsPanel){settingsPanel.hidden=true;if(settingsBtn)settingsBtn.setAttribute('aria-expanded','false')}
    if(open){requestAnimationFrame(()=>requestAnimationFrame(()=>{if(typeof window.syncRailGeometry==='function')window.syncRailGeometry();window.scrollTo({top:Math.max(0,card.offsetTop-10),behavior:'smooth'})}))}
  }
  toggle.addEventListener('click',()=>openChapter(!card.classList.contains('open')));

  function setRateOnAudio(a){if(!a)return;try{a.playbackRate=speed;a.defaultPlaybackRate=speed;a.preservesPitch=true}catch{}}
  function syncAllRates(){
    try{setRateOnAudio(state.audio);for(const c of state.clips.values())setRateOnAudio(c.audio)}catch{}
  }
  function fmtDuration(sec){sec=Math.max(1,Math.round(sec));const m=Math.floor(sec/60),s=sec%60;return s?`${m}:${String(s).padStart(2,'0')}`:`${m} min`}
  function updateDuration(){
    try{const words=BOOK.join(' ').trim().split(/\s+/).length;const sec=(words/155)*60/speed;if(readTime)readTime.textContent=fmtDuration(sec)}catch{}
  }
  function setSpeed(v){speed=v;localStorage.setItem('lector:playbackRate',String(v));syncAllRates();updateDuration();renderSettings()}

  const voiceOrder=['julian','clara','vera','milo'];
  function renderSettings(){
    if(settingsVoices){settingsVoices.innerHTML=voiceOrder.map(id=>{
      const v=VOICES[id];const active=state.voice===id?' active':'';
      return `<button class="settingsChoice${active}" data-voice="${id}"><strong>${v.name}</strong><small>${v.kind}</small></button>`;
    }).join('');settingsVoices.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>{if(typeof selectVoice==='function')selectVoice(b.dataset.voice);syncAllRates();renderSettings()})}
    if(settingsSpeeds){settingsSpeeds.innerHTML=SPEEDS.map(v=>`<button class="settingsChoice${speed===v?' active':''}" data-speed="${v}">${String(v).replace('.',',')}×</button>`).join('');settingsSpeeds.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>setSpeed(Number(b.dataset.speed))}
  }
  if(settingsBtn&&settingsPanel){settingsBtn.addEventListener('click',()=>{const open=settingsPanel.hidden;settingsPanel.hidden=!open;settingsBtn.setAttribute('aria-expanded',String(open));if(open)renderSettings()})}

  const mo=new MutationObserver(()=>{syncIcons();syncPct()});
  mo.observe(play,{childList:true,subtree:true,characterData:true});
  if(chapterPct)new MutationObserver(syncPct).observe(chapterPct,{childList:true,subtree:true,characterData:true});
  play.addEventListener('click',()=>setTimeout(()=>{syncAllRates();syncIcons()},0));

  let gesture=null;
  function seekAt(clientY){const r=rail.getBoundingClientRect();if(!r.height)return;const ratio=Math.max(0,Math.min(1,(clientY-r.top)/r.height));if(typeof window.seekChapter==='function')window.seekChapter(ratio)}
  function ensurePaused(){if(isPlaying())play.click()}
  function onDown(e){
    if(!card.classList.contains('open'))return;e.preventDefault();e.stopPropagation();
    const onThumb=e.target===thumb||thumb.contains(e.target);gesture={id:e.pointerId,startY:e.clientY,onThumb,moved:false,pausedForDrag:false};
    try{rail.setPointerCapture(e.pointerId)}catch{}
    if(!onThumb){ensurePaused();gesture.pausedForDrag=true;seekAt(e.clientY);thumb.classList.add('dragging')}
  }
  function onMove(e){if(!gesture||gesture.id!==e.pointerId)return;const d=Math.abs(e.clientY-gesture.startY);if(d>4){gesture.moved=true;if(!gesture.pausedForDrag){ensurePaused();gesture.pausedForDrag=true}thumb.classList.add('dragging');seekAt(e.clientY)}}
  function onUp(e){if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const g=gesture;gesture=null;thumb.classList.remove('dragging');try{rail.releasePointerCapture(e.pointerId)}catch{}if(g.onThumb&&!g.moved)play.click()}
  rail.addEventListener('pointerdown',onDown);rail.addEventListener('pointermove',onMove);rail.addEventListener('pointerup',onUp);rail.addEventListener('pointercancel',onUp);

  window.addEventListener('resize',()=>{if(card.classList.contains('open')&&typeof window.syncRailGeometry==='function')requestAnimationFrame(window.syncRailGeometry)});
  setInterval(syncAllRates,350);
  body.setAttribute('aria-hidden','true');toggle.setAttribute('aria-expanded','false');renderSettings();updateDuration();syncAllRates();syncIcons();syncPct();
})();
