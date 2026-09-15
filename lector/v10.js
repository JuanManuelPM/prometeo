(()=>{
  const $=id=>document.getElementById(id);
  const card=$('playerCard'),play=$('playBtn'),track=$('track'),thumb=$('trackThumb');
  const disclosure=$('disclosureBtn'),readerSection=$('readerSection');
  const settingsBtn=$('settingsBtn'),settings=$('settingsPanel');
  const voiceChoices=$('voiceChoices'),speedChoices=$('speedChoices'),textChoices=$('textChoices');
  const totalTime=$('totalTime'),timeLabel=$('timeLabel'),bufferHint=$('bufferHint');
  const rail=$('railTrack'),railThumb=$('railThumb');
  if(!card||!play||!track||!thumb||!disclosure||!readerSection)return;

  const SPEEDS=[0.75,1,1.25,1.5,2], TEXT_SIZES=['small','normal','large'];
  const TEXT_LABELS={small:'A−',normal:'A',large:'A+'};
  const voiceOrder=['julian','clara','vera','milo'];
  const lsGet=(k,f)=>{try{const v=localStorage.getItem(k);return v==null?f:v}catch{return f}};
  const lsSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
  let speed=Number(lsGet('lector:v10:rate',1)); if(!SPEEDS.includes(speed))speed=1;
  let textSize=lsGet('lector:v10:text','normal'); if(!TEXT_SIZES.includes(textSize))textSize='normal';
  card.dataset.textSize=textSize;

  const getState=()=>{try{return state}catch{return null}};
  const getVoices=()=>{try{return VOICES}catch{return null}};
  const getChunks=()=>{try{return CHUNKS}catch{return []}};
  const getBook=()=>{try{return BOOK}catch{return []}};
  const getClip=(v,i)=>{try{return clip(v,i)}catch{return null}};
  const doSeek=r=>{try{seekChapter(r);return true}catch{return false}};
  const doVoice=v=>{try{selectVoice(v);return true}catch{return false}};
  const doRailSync=()=>{try{syncRailGeometry();return true}catch{return false}};
  const progress=()=>{try{return overallProgress()}catch{return 0}};
  const buffered=()=>{try{return bufferedProgress()}catch{return 0}};
  const fmt=sec=>{sec=Math.max(0,Math.round(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`};

  // Critical UI wiring first: these controls remain functional even if engine state is unavailable.
  disclosure.addEventListener('click',()=>{
    const open=readerSection.hidden;
    readerSection.hidden=!open;
    disclosure.setAttribute('aria-expanded',String(open));
    disclosure.setAttribute('aria-label',open?'Ocultar texto':'Mostrar texto');
    if(open)requestAnimationFrame(()=>requestAnimationFrame(doRailSync));
  });
  if(settingsBtn&&settings){
    settingsBtn.addEventListener('click',()=>{
      const open=settings.hidden;
      settings.hidden=!open;
      settingsBtn.setAttribute('aria-expanded',String(open));
      if(open)renderSettings();
    });
  }

  function estimatedSeconds(){const book=getBook();const words=book.join(' ').trim().split(/\s+/).filter(Boolean).length||465;return (words/155)*60/speed}
  function actualTotalSeconds(){
    const st=getState(),chunks=getChunks();
    if(!st||!chunks.length)return estimatedSeconds();
    let total=0;
    for(let i=0;i<chunks.length;i++){
      const c=getClip(st.voice,i),a=c&&c.audio;
      if(!c||c.status!=='ready'||!a||!Number.isFinite(a.duration))return estimatedSeconds();
      total+=a.duration;
    }
    return total>0?total/speed:estimatedSeconds();
  }
  function applyRate(){
    const st=getState();if(!st)return;
    try{if(st.audio){st.audio.playbackRate=speed;st.audio.defaultPlaybackRate=speed;st.audio.preservesPitch=true}}catch{}
    try{for(const c of st.clips.values())if(c.audio){c.audio.playbackRate=speed;c.audio.defaultPlaybackRate=speed;c.audio.preservesPitch=true}}catch{}
  }
  function setSpeed(v){speed=v;lsSet('lector:v10:rate',v);applyRate();renderSettings()}
  function setTextSize(v){textSize=v;lsSet('lector:v10:text',v);card.dataset.textSize=v;renderSettings();if(!readerSection.hidden)requestAnimationFrame(()=>requestAnimationFrame(doRailSync))}

  function renderSettings(){
    if(textChoices){
      textChoices.innerHTML=TEXT_SIZES.map(v=>`<button class="choice${textSize===v?' active':''}" data-text="${v}">${TEXT_LABELS[v]}</button>`).join('');
      textChoices.querySelectorAll('[data-text]').forEach(b=>b.onclick=()=>setTextSize(b.dataset.text));
    }
    const voices=getVoices(),st=getState();
    if(voiceChoices&&voices){
      voiceChoices.innerHTML=voiceOrder.map(id=>{const v=voices[id];if(!v)return'';return `<button class="choice${st&&st.voice===id?' active':''}" data-v="${id}">${v.name}<small>${v.kind}</small></button>`}).join('');
      voiceChoices.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{doVoice(b.dataset.v);applyRate();renderSettings()});
    }
    if(speedChoices){
      speedChoices.innerHTML=SPEEDS.map(v=>`<button class="choice${speed===v?' active':''}" data-s="${v}">${String(v).replace('.',',')}×</button>`).join('');
      speedChoices.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>setSpeed(Number(b.dataset.s));
    }
  }

  // Horizontal scrubber: drag/tap anywhere to seek.
  let dragging=false,dragRatio=0,wasPlaying=false;
  const ratioFromX=x=>{const r=track.getBoundingClientRect();return Math.max(0,Math.min(1,(x-r.left)/Math.max(1,r.width)))};
  function showRatio(r){thumb.style.left=`${r*100}%`;const f=$('trackFill');if(f)f.style.width=`${r*100}%`;if(timeLabel)timeLabel.textContent=fmt(actualTotalSeconds()*r)}
  track.addEventListener('pointerdown',e=>{
    e.preventDefault();dragging=true;track.classList.add('dragging');
    const st=getState();wasPlaying=!!(st&&(st.playing||st.intent));
    if(st){st.intent=false;try{st.audio&&st.audio.pause()}catch{}}
    dragRatio=ratioFromX(e.clientX);showRatio(dragRatio);try{track.setPointerCapture(e.pointerId)}catch{}
  });
  track.addEventListener('pointermove',e=>{if(!dragging)return;e.preventDefault();dragRatio=ratioFromX(e.clientX);showRatio(dragRatio)});
  const finishDrag=e=>{
    if(!dragging)return;e.preventDefault();dragging=false;track.classList.remove('dragging');try{track.releasePointerCapture(e.pointerId)}catch{}
    const st=getState();if(st)st.intent=wasPlaying;doSeek(dragRatio);applyRate();
  };
  track.addEventListener('pointerup',finishDrag);track.addEventListener('pointercancel',finishDrag);

  // Vertical rail: tap/drag seeks; tapping the thumb toggles play/pause.
  let railGesture=null;
  const isPlaying=()=>{const st=getState();return !!(st&&st.playing)};
  function seekRailAt(y){if(!rail)return;const r=rail.getBoundingClientRect();if(!r.height)return;doSeek(Math.max(0,Math.min(1,(y-r.top)/r.height)))}
  if(rail&&railThumb){
    rail.addEventListener('pointerdown',e=>{
      if(readerSection.hidden)return;e.preventDefault();e.stopPropagation();
      const onThumb=e.target===railThumb||railThumb.contains(e.target);
      railGesture={id:e.pointerId,startY:e.clientY,onThumb,moved:false};
      try{rail.setPointerCapture(e.pointerId)}catch{}
      if(!onThumb){if(isPlaying())play.click();seekRailAt(e.clientY);railThumb.classList.add('dragging')}
    });
    rail.addEventListener('pointermove',e=>{
      if(!railGesture||railGesture.id!==e.pointerId)return;
      if(Math.abs(e.clientY-railGesture.startY)>4){railGesture.moved=true;if(isPlaying())play.click();railThumb.classList.add('dragging');seekRailAt(e.clientY)}
    });
    const railUp=e=>{
      if(!railGesture||railGesture.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();
      const g=railGesture;railGesture=null;railThumb.classList.remove('dragging');try{rail.releasePointerCapture(e.pointerId)}catch{}
      if(g.onThumb&&!g.moved)play.click();
    };
    rail.addEventListener('pointerup',railUp);rail.addEventListener('pointercancel',railUp);
  }

  function sync(){
    if(!dragging){
      const p=Math.max(0,Math.min(1,progress())),b=Math.max(p,Math.min(1,buffered()));
      thumb.style.left=`${p*100}%`;const f=$('trackFill'),buf=$('trackBuffered');if(f)f.style.width=`${p*100}%`;if(buf)buf.style.width=`${b*100}%`;
      const total=actualTotalSeconds();if(totalTime)totalTime.textContent=fmt(total);if(timeLabel)timeLabel.textContent=fmt(total*p);
      if(bufferHint){const gap=b-p;bufferHint.textContent=b>=.995?'audio listo':gap>.18?'':'preparando…'}
    }
    if(railThumb)railThumb.classList.toggle('paused',!isPlaying());
    applyRate();requestAnimationFrame(sync);
  }

  window.addEventListener('resize',()=>{if(!readerSection.hidden)requestAnimationFrame(doRailSync)});
  readerSection.hidden=true;if(settings)settings.hidden=true;disclosure.setAttribute('aria-expanded','false');
  renderSettings();applyRate();requestAnimationFrame(sync);
})();