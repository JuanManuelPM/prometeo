(()=>{
  const $=id=>document.getElementById(id);
  const card=$('chapterCard'),toggle=$('chapterToggle'),body=$('chapterBody'),play=$('playBtn');
  const rail=$('railTrack'),thumb=$('railThumb'),pct=$('miniPct'),chapterPct=$('chapterProgress');
  if(!card||!toggle||!play||!rail||!thumb)return;

  function isPlaying(){return play.textContent.trim()!=='▶'}
  function syncThumbState(){thumb.classList.toggle('paused',!isPlaying());thumb.setAttribute('aria-label',isPlaying()?'Pausar lectura':'Reanudar lectura')}
  function syncPct(){if(pct&&chapterPct)pct.textContent=chapterPct.textContent||'0%'}
  function openChapter(open){card.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));body.setAttribute('aria-hidden',String(!open));if(open){requestAnimationFrame(()=>requestAnimationFrame(()=>{if(typeof window.syncRailGeometry==='function')window.syncRailGeometry();window.scrollTo({top:Math.max(0,card.offsetTop-12),behavior:'smooth'})}))}}
  toggle.addEventListener('click',()=>openChapter(!card.classList.contains('open')));

  new MutationObserver(()=>{syncThumbState();syncPct()}).observe(play,{childList:true,subtree:true,characterData:true});
  if(chapterPct)new MutationObserver(syncPct).observe(chapterPct,{childList:true,subtree:true,characterData:true});
  syncThumbState();syncPct();

  let gesture=null;
  function seekAt(clientY){
    const r=rail.getBoundingClientRect();
    if(!r.height)return;
    const ratio=Math.max(0,Math.min(1,(clientY-r.top)/r.height));
    if(typeof window.seekChapter==='function')window.seekChapter(ratio);
  }
  function ensurePaused(){if(isPlaying())play.click()}
  function onDown(e){
    if(!card.classList.contains('open'))return;
    e.preventDefault();e.stopPropagation();
    const onThumb=e.target===thumb||thumb.contains(e.target);
    gesture={id:e.pointerId,startY:e.clientY,onThumb,moved:false,pausedForDrag:false};
    try{rail.setPointerCapture(e.pointerId)}catch{}
    if(!onThumb){ensurePaused();gesture.pausedForDrag=true;seekAt(e.clientY);thumb.classList.add('dragging')}
  }
  function onMove(e){
    if(!gesture||gesture.id!==e.pointerId)return;
    const d=Math.abs(e.clientY-gesture.startY);
    if(d>4){gesture.moved=true;if(!gesture.pausedForDrag){ensurePaused();gesture.pausedForDrag=true}thumb.classList.add('dragging');seekAt(e.clientY)}
  }
  function onUp(e){
    if(!gesture||gesture.id!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();
    const g=gesture;gesture=null;thumb.classList.remove('dragging');
    try{rail.releasePointerCapture(e.pointerId)}catch{}
    if(g.onThumb&&!g.moved)play.click();
  }
  rail.addEventListener('pointerdown',onDown);
  rail.addEventListener('pointermove',onMove);
  rail.addEventListener('pointerup',onUp);
  rail.addEventListener('pointercancel',onUp);

  window.addEventListener('resize',()=>{if(card.classList.contains('open')&&typeof window.syncRailGeometry==='function')requestAnimationFrame(window.syncRailGeometry)});
  body.setAttribute('aria-hidden','true');toggle.setAttribute('aria-expanded','false');
})();
