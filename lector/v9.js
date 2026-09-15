(()=>{
  const $=id=>document.getElementById(id);
  const card=$('playerCard'),play=$('playBtn'),track=$('track'),thumb=$('trackThumb');
  const disclosure=$('disclosureBtn'),readerSection=$('readerSection'),settingsBtn=$('settingsBtn'),settings=$('settingsPanel');
  const voiceChoices=$('voiceChoices'),speedChoices=$('speedChoices'),textChoices=$('textChoices');
  const totalTime=$('totalTime'),timeLabel=$('timeLabel'),bufferHint=$('bufferHint');
  const rail=$('railTrack'),railThumb=$('railThumb');
  if(!card||!play||!track||!thumb||!disclosure||!readerSection)return;

  const SPEEDS=[0.75,1,1.25,1.5,2];
  const TEXT_SIZES=['small','normal','large'];
  const TEXT_LABELS={small:'A−',normal:'A',large:'A+'};
  const voiceOrder=['julian','clara','vera','milo'];
  let speed=Number(localStorage.getItem('lector:v9:rate')||1);
  if(!SPEEDS.includes(speed))speed=1;
  let textSize=localStorage.getItem('lector:v9:text')||'normal';
  if(!TEXT_SIZES.includes(textSize))textSize='normal';
  card.dataset.textSize=textSize;

  const fmt=sec=>{sec=Math.max(0,Math.round(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`};
  function estimatedSeconds(){try{const words=BOOK.join(' ').trim().split(/\s+/).length;return (words/155)*60/speed}catch{return 180/speed}}
  function actualTotalSeconds(){
    try{
      let total=0,complete=true;
      for(let i=0;i<CHUNKS.length;i++){
        const c=clip(state.voice,i),a=c.audio;
        if(c.status!=='ready'||!a||!Number.isFinite(a.duration)){complete=false;break}
        total+=a.duration;
      }
      return complete&&total>0?total/speed:estimatedSeconds();
    }catch{return estimatedSeconds()}
  }
  function applyRate(){
    try{
      if(state.audio){state.audio.playbackRate=speed;state.audio.defaultPlaybackRate=speed;state.audio.preservesPitch=true}
      for(const c of state.clips.values())if(c.audio){c.audio.playbackRate=speed;c.audio.defaultPlaybackRate=speed;c.audio.preservesPitch=true}
    }catch{}
  }
  function setSpeed(v){speed=v;localStorage.setItem('lector:v9:rate',String(v));applyRate();renderSettings();syncTimeline()}
  function setTextSize(v){
    textSize=v;localStorage.setItem('lector:v9:text',v);card.dataset.textSize=v;renderSettings();
    if(!readerSection.hidden)requestAnimationFrame(()=>requestAnimationFrame(()=>{try{syncRailGeometry()}catch{}}));
  }

  function renderSettings(){
    if(textChoices){textChoices.innerHTML=TEXT_SIZES.map(v=>`<button class="choice${textSize===v?' active':''}" data-text="${v}">${TEXT_LABELS[v]}</button>`).join('');textChoices.querySelectorAll('[data-text]').forEach(b=>b.onclick=()=>setTextSize(b.dataset.text))}
    if(voiceChoices){voiceChoices.innerHTML=voiceOrder.map(id=>{const v=VOICES[id];return `<button class="choice${state.voice===id?' active':''}" data-v="${id}">${v.name}<small>${v.kind}</small></button>`}).join('');voiceChoices.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{if(typeof selectVoice==='function')selectVoice(b.dataset.v);applyRate();renderSettings()})}
    if(speedChoices){speedChoices.innerHTML=SPEEDS.map(v=>`<button class="choice${speed===v?' active':''}" data-s="${v}">${String(v).replace('.',',')}×</button>`).join('');speedChoices.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>setSpeed(Number(b.dataset.s))}
  }

  disclosure.onclick=()=>{
    const open=readerSection.hidden;
    readerSection.hidden=!open;
    disclosure.setAttribute('aria-expanded',String(open));
    disclosure.setAttribute('aria-label',open?'Ocultar texto':'Mostrar texto');
    if(open){
      requestAnimationFrame(()=>requestAnimationFrame(()=>{try{syncRailGeometry()}catch{}}));
    }
  };

  if(settingsBtn&&settings){
    settingsBtn.onclick=e=>{e.stopPropagation();const open=settings.hidden;settings.hidden=!open;settingsBtn.setAttribute('aria-expanded',String(open));if(open)renderSettings()};
  }

  let dragging=false,dragRatio=0,wasPlaying=false;
  function ratioFromX(x){const r=track.getBoundingClientRect();return Math.max(0,Math.min(1,(x-r.left)/Math.max(1,r.width)))}
  function showRatio(r){thumb.style.left=`${r*100}%`;const fill=$('trackFill');if(fill)fill.style.width=`${r*100}%`;if(timeLabel)timeLabel.textContent=fmt(actualTotalSeconds()*r)}
  function down(e){
    e.preventDefault();dragging=true;track.classList.add('dragging');wasPlaying=!!(state.playing||state.intent);state.intent=false;try{state.audio?.pause()}catch{};dragRatio=ratioFromX(e.clientX);showRatio(dragRatio);try{track.setPointerCapture(e.pointerId)}catch{}
  }
  function move(e){if(!dragging)return;e.preventDefault();dragRatio=ratioFromX(e.clientX);showRatio(dragRatio)}
  function up(e){
    if(!dragging)return;e.preventDefault();dragging=false;track.classList.remove('dragging');try{track.releasePointerCapture(e.pointerId)}catch{};state.intent=wasPlaying;if(typeof seekChapter==='function')seekChapter(dragRatio);applyRate()
  }
  track.onpointerdown=down;track.onpointermove=move;track.onpointerup=up;track.onpointercancel=up;track.onclick=e=>e.preventDefault();

  let railGesture=null;
  function isPlaying(){try{return !!state.playing}catch{return play.getAttribute('aria-label')==='Pausar'}}
  function seekRailAt(clientY){const r=rail.getBoundingClientRect();if(!r.height)return;const ratio=Math.max(0,Math.min(1,(clientY-r.top)/r.height));if(typeof seekChapter==='function')seekChapter(ratio)}
  function ensurePaused(){if(isPlaying())play.click()}
  if(rail&&railThumb){
    rail.onpointerdown=e=>{
      if(readerSection.hidden)return;e.preventDefault();e.stopPropagation();
      const onThumb=e.target===railThumb||railThumb.contains(e.target);railGesture={id:e.pointerId,startY:e.clientY,onThumb,moved:false,pausedForDrag:false};
      try{rail.setPointerCapture(e.pointerId)}catch{}
      if(!onThumb){ensurePaused();railGesture.pausedForDrag=true;seekRailAt(e.clientY);railThumb.classList.add('dragging')}
    };
    rail.onpointermove=e=>{if(!railGesture||railGesture.id!==e.pointerId)return;const d=Math.abs(e.clientY-railGesture.startY);if(d>4){railGesture.moved=true;if(!railGesture.pausedForDrag){ensurePaused();railGesture.pausedForDrag=true}railThumb.classList.add('dragging');seekRailAt(e.clientY)}};
    rail.onpointerup=rail.onpointercancel=e=>{if(!railGesture||railGesture.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const g=railGesture;railGesture=null;railThumb.classList.remove('dragging');try{rail.releasePointerCapture(e.pointerId)}catch{}if(g.onThumb&&!g.moved)play.click()};
  }

  function syncTimeline(){
    if(!dragging){
      let p=0,b=0;try{p=overallProgress();b=bufferedProgress()}catch{}
      thumb.style.left=`${p*100}%`;const fill=$('trackFill'),buf=$('trackBuffered');if(fill)fill.style.width=`${p*100}%`;if(buf)buf.style.width=`${b*100}%`;
      const total=actualTotalSeconds();if(totalTime)totalTime.textContent=fmt(total);if(timeLabel)timeLabel.textContent=fmt(total*p);
      if(bufferHint){const gap=Math.max(0,b-p);bufferHint.textContent=b>=.995?'audio listo':gap>.18?'':'preparando…'}
    }
    if(railThumb)railThumb.classList.toggle('paused',!isPlaying());
  }
  function loop(){applyRate();syncTimeline();requestAnimationFrame(loop)}
  window.addEventListener('resize',()=>{if(!readerSection.hidden)requestAnimationFrame(()=>{try{syncRailGeometry()}catch{}})});

  readerSection.hidden=true;disclosure.setAttribute('aria-expanded','false');settings.hidden=true;renderSettings();applyRate();requestAnimationFrame(loop);
})();
