(()=>{
  const $=id=>document.getElementById(id);
  const enginePlay=$('playBtn'), engineFill=$('trackFill'), engineBuffered=$('trackBuffered');
  const designStack=$('designStack'), readerShell=$('readerShell'), closeReader=$('closeReader');
  const settingsButton=$('settingsButton'), settingsPanel=$('settingsPanel'), voiceChoices=$('voiceChoices'), speedChoices=$('speedChoices');
  const rail=$('railTrack'), thumb=$('railThumb');
  if(!enginePlay||!designStack||!readerShell||!rail||!thumb)return;

  const TOTAL_WORDS=529;
  const BASE_MINUTES=3;
  const SPEEDS=[0.75,1,1.25,1.5,2];
  let speed=Number(localStorage.getItem('lector:v6:rate')||1);
  if(!SPEEDS.includes(speed))speed=1;
  let gesture=null;

  const playSvg=()=>'<svg class="controlSvg" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.8c0-.86.94-1.39 1.68-.95l9.1 5.55a1.86 1.86 0 0 1 0 3.2l-9.1 5.55A1.1 1.1 0 0 1 8 18.2V5.8Z" fill="currentColor"/></svg>';
  const pauseSvg=()=>'<svg class="controlSvg" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor"/></svg>';
  function playing(){return enginePlay.getAttribute('aria-label')==='Pausar'||enginePlay.textContent.trim()==='Ⅱ'}
  function pct(){const n=parseFloat(engineFill?.style.width||'0');return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0}
  function bufferedPct(){const n=parseFloat(engineBuffered?.style.width||'0');return Number.isFinite(n)?Math.max(pct(),Math.min(100,n)):pct()}
  function totalSeconds(){return Math.max(1,Math.round(BASE_MINUTES*60/speed))}
  function fmt(sec){sec=Math.max(0,Math.round(sec));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}
  function durationLabel(){const sec=totalSeconds();if(sec%60===0)return `~${sec/60} min`;return `~${fmt(sec)}`}
  function setRate(a){if(!a)return;try{a.playbackRate=speed;a.defaultPlaybackRate=speed;a.preservesPitch=true}catch{}}
  function syncRates(){try{setRate(state.audio);for(const c of state.clips.values())setRate(c.audio)}catch{}}

  function renderControlIcons(){
    const icon=playing()?pauseSvg():playSvg();
    document.querySelectorAll('.js-play').forEach(b=>{if(b.dataset.icon!==icon){b.innerHTML=icon;b.dataset.icon=icon}b.setAttribute('aria-label',playing()?'Pausar capítulo':'Reproducir capítulo')});
    thumb.innerHTML=icon;thumb.setAttribute('aria-label',playing()?'Pausar lectura':'Reanudar lectura');
  }
  function renderProgress(){
    const p=pct(),b=bufferedPct(),words=Math.min(TOTAL_WORDS,Math.round(TOTAL_WORDS*p/100));
    document.querySelectorAll('.js-played').forEach(el=>el.style.width=`${p}%`);
    document.querySelectorAll('.js-buffered').forEach(el=>el.style.width=`${b}%`);
    document.querySelectorAll('.js-knob').forEach(el=>el.style.left=`${p}%`);
    document.querySelectorAll('.js-pct').forEach(el=>el.textContent=`${Math.round(p)}%`);
    document.querySelectorAll('.js-word-progress').forEach(el=>el.textContent=`${words} / ${TOTAL_WORDS} palabras`);
    document.querySelectorAll('.js-duration').forEach(el=>el.textContent=durationLabel());
    document.querySelectorAll('.js-elapsed').forEach(el=>el.textContent=fmt(totalSeconds()*p/100));
    document.querySelectorAll('.js-total').forEach(el=>el.textContent=fmt(totalSeconds()));
    const od=$('openDuration');if(od)od.textContent=durationLabel();
    if(rail)rail.setAttribute('aria-valuenow',String(Math.round(p)));
  }
  function syncAll(){renderControlIcons();renderProgress();syncRates()}

  function openReader(){designStack.hidden=true;readerShell.hidden=false;settingsPanel.hidden=true;settingsButton.setAttribute('aria-expanded','false');requestAnimationFrame(()=>requestAnimationFrame(()=>{try{syncRailGeometry()}catch{};readerShell.scrollIntoView({block:'start',behavior:'smooth'})}))}
  function closeReaderView(){readerShell.hidden=true;designStack.hidden=false;settingsPanel.hidden=true;settingsButton.setAttribute('aria-expanded','false');requestAnimationFrame(()=>designStack.scrollIntoView({block:'start',behavior:'smooth'}))}
  document.querySelectorAll('[data-open-reader]').forEach(b=>b.addEventListener('click',openReader));
  closeReader.addEventListener('click',closeReaderView);

  document.querySelectorAll('.js-play').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();enginePlay.click();setTimeout(syncAll,0)}));
  document.querySelectorAll('.js-seek').forEach(el=>{
    const seek=e=>{const r=el.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));try{seekChapter(ratio)}catch{};syncAll()};
    el.addEventListener('pointerdown',e=>{e.preventDefault();seek(e)});
  });

  const voices=['julian','clara','vera','milo'];
  function renderSettings(){
    try{voiceChoices.innerHTML=voices.map(id=>`<button class="choice${state.voice===id?' active':''}" data-v="${id}">${VOICES[id].name}</button>`).join('')}catch{voiceChoices.innerHTML=''}
    voiceChoices.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{try{selectVoice(b.dataset.v)}catch{};renderSettings();syncRates()});
    speedChoices.innerHTML=SPEEDS.map(v=>`<button class="choice${speed===v?' active':''}" data-s="${v}">${String(v).replace('.',',')}×</button>`).join('');
    speedChoices.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{speed=Number(b.dataset.s);localStorage.setItem('lector:v6:rate',String(speed));syncRates();renderSettings();renderProgress()});
  }
  settingsButton.addEventListener('click',()=>{const show=settingsPanel.hidden;settingsPanel.hidden=!show;settingsButton.setAttribute('aria-expanded',String(show));if(show)renderSettings()});

  function seekRail(clientY){const r=rail.getBoundingClientRect();if(!r.height)return;const ratio=Math.max(0,Math.min(1,(clientY-r.top)/r.height));try{seekChapter(ratio)}catch{};syncAll()}
  function pauseIfNeeded(){if(playing())enginePlay.click()}
  rail.addEventListener('pointerdown',e=>{if(readerShell.hidden)return;e.preventDefault();e.stopPropagation();const onThumb=e.target===thumb||thumb.contains(e.target);gesture={id:e.pointerId,startY:e.clientY,onThumb,moved:false};try{rail.setPointerCapture(e.pointerId)}catch{};if(!onThumb){pauseIfNeeded();seekRail(e.clientY);thumb.classList.add('dragging')}});
  rail.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;if(Math.abs(e.clientY-gesture.startY)>4){gesture.moved=true;pauseIfNeeded();thumb.classList.add('dragging');seekRail(e.clientY)}});
  function endGesture(e){if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const g=gesture;gesture=null;thumb.classList.remove('dragging');try{rail.releasePointerCapture(e.pointerId)}catch{};if(g.onThumb&&!g.moved)enginePlay.click();syncAll()}
  rail.addEventListener('pointerup',endGesture);rail.addEventListener('pointercancel',endGesture);

  new MutationObserver(syncAll).observe(enginePlay,{attributes:true,childList:true,subtree:true,characterData:true});
  if(engineFill)new MutationObserver(renderProgress).observe(engineFill,{attributes:true,attributeFilter:['style']});
  if(engineBuffered)new MutationObserver(renderProgress).observe(engineBuffered,{attributes:true,attributeFilter:['style']});
  window.addEventListener('resize',()=>{if(!readerShell.hidden)requestAnimationFrame(()=>{try{syncRailGeometry()}catch{}})});
  setInterval(syncRates,500);
  renderSettings();syncAll();
})();
