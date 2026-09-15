(()=>{
  const $=id=>document.getElementById(id);
  const card=$('playerCard'),play=$('playBtn'),track=$('track'),thumb=$('trackThumb');
  const disclosure=$('disclosureBtn'),settings=$('settingsPanel');
  const voiceChoices=$('voiceChoices'),speedChoices=$('speedChoices'),textChoices=$('textChoices');
  const totalTime=$('totalTime'),bufferHint=$('bufferHint');
  if(!card||!play||!track||!thumb)return;

  const SPEEDS=[0.75,1,1.25,1.5,2];
  const TEXT_SIZES=['small','normal','large'];
  let speed=Number(localStorage.getItem('lector:v8:rate')||localStorage.getItem('lector:v7:rate')||1);
  if(!SPEEDS.includes(speed))speed=1;
  let textSize=localStorage.getItem('lector:v8:textSize')||'normal';
  if(!TEXT_SIZES.includes(textSize))textSize='normal';

  function fmt(sec){sec=Math.max(0,Math.round(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}
  function estimatedSeconds(){try{const words=BOOK.join(' ').trim().split(/\s+/).length;return(words/155)*60/speed}catch{return 180/speed}}
  function updateDuration(){if(totalTime)totalTime.textContent=fmt(estimatedSeconds())}
  function applyRate(){try{if(state.audio){state.audio.playbackRate=speed;state.audio.defaultPlaybackRate=speed;state.audio.preservesPitch=true}for(const c of state.clips.values())if(c.audio){c.audio.playbackRate=speed;c.audio.defaultPlaybackRate=speed;c.audio.preservesPitch=true}}catch{}}
  function setSpeed(v){speed=v;localStorage.setItem('lector:v8:rate',String(v));localStorage.setItem('lector:v7:rate',String(v));applyRate();updateDuration();renderSettings()}
  function setTextSize(v){textSize=v;localStorage.setItem('lector:v8:textSize',v);card.dataset.textSize=v;renderSettings()}

  const voiceOrder=['julian','clara','vera','milo'];
  function renderSettings(){
    if(textChoices){
      const labels={small:'A−',normal:'A',large:'A+'};
      textChoices.innerHTML=TEXT_SIZES.map(v=>`<button class="choice${textSize===v?' active':''}" data-text="${v}">${labels[v]}</button>`).join('');
      textChoices.querySelectorAll('[data-text]').forEach(b=>b.onclick=()=>setTextSize(b.dataset.text));
    }
    if(voiceChoices){
      voiceChoices.innerHTML=voiceOrder.map(id=>`<button class="choice${state.voice===id?' active':''}" data-v="${id}">${VOICES[id].name}</button>`).join('');
      voiceChoices.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{if(typeof selectVoice==='function')selectVoice(b.dataset.v);applyRate();renderSettings()});
    }
    if(speedChoices){
      speedChoices.innerHTML=SPEEDS.map(v=>`<button class="choice${speed===v?' active':''}" data-s="${v}">${String(v).replace('.',',')}×</button>`).join('');
      speedChoices.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>setSpeed(Number(b.dataset.s)));
    }
  }

  if(disclosure&&settings){
    disclosure.onclick=e=>{e.stopPropagation();const open=settings.hidden;settings.hidden=!open;disclosure.setAttribute('aria-expanded',String(open));if(open)renderSettings()};
    document.addEventListener('click',e=>{if(!settings.hidden&&!settings.contains(e.target)&&!disclosure.contains(e.target)){settings.hidden=true;disclosure.setAttribute('aria-expanded','false')}});
  }

  let dragging=false,dragRatio=0,wasPlaying=false;
  function ratioFromX(x){const r=track.getBoundingClientRect();return Math.max(0,Math.min(1,(x-r.left)/Math.max(1,r.width)))}
  function showRatio(r){thumb.style.left=`${r*100}%`;const fill=$('trackFill');if(fill)fill.style.width=`${r*100}%`;const ct=$('timeLabel');if(ct)ct.textContent=fmt(estimatedSeconds()*r)}
  function down(e){e.preventDefault();dragging=true;track.classList.add('dragging');wasPlaying=!!(state.playing||state.intent);state.intent=false;try{state.audio?.pause()}catch{}dragRatio=ratioFromX(e.clientX);showRatio(dragRatio);try{track.setPointerCapture(e.pointerId)}catch{}}
  function move(e){if(!dragging)return;e.preventDefault();dragRatio=ratioFromX(e.clientX);showRatio(dragRatio)}
  function up(e){if(!dragging)return;e.preventDefault();dragging=false;track.classList.remove('dragging');try{track.releasePointerCapture(e.pointerId)}catch{}state.intent=wasPlaying;if(typeof seekChapter==='function')seekChapter(dragRatio);applyRate()}
  track.onpointerdown=down;track.onpointermove=move;track.onpointerup=up;track.onpointercancel=up;track.onclick=e=>e.preventDefault();

  function sync(){
    if(!dragging){
      let p=0,b=0;try{p=overallProgress();b=bufferedProgress()}catch{}
      thumb.style.left=`${p*100}%`;
      const fill=$('trackFill'),buf=$('trackBuffered');if(fill)fill.style.width=`${p*100}%`;if(buf)buf.style.width=`${b*100}%`;
      if(bufferHint){const gap=Math.max(0,b-p);bufferHint.textContent=b>=.995?'audio listo':gap>.18?'':'preparando…'}
    }
    applyRate();requestAnimationFrame(sync)
  }

  card.dataset.textSize=textSize;
  renderSettings();updateDuration();applyRate();requestAnimationFrame(sync);
})();
