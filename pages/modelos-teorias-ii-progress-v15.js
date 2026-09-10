(()=>{
  const top=document.querySelector('header .top');
  if(!top) return;

  const old=document.querySelector('.learnProgress');
  if(old) old.remove();

  const wrap=document.createElement('div');
  wrap.className='learnProgress';
  wrap.setAttribute('role','progressbar');
  wrap.setAttribute('aria-label','Progreso de aprendizaje');
  wrap.innerHTML='<div class="learnMeter"><span class="learnPct">0%</span><div class="learnTrack"><div class="learnFill"></div></div></div>';

  const stat=top.querySelector('.stat');
  if(stat) top.insertBefore(wrap,stat); else top.appendChild(wrap);

  const fill=wrap.querySelector('.learnFill');
  const pct=wrap.querySelector('.learnPct');

  function update(){
    const ticks=[...document.querySelectorAll('.tick')];
    const total=ticks.length;
    const done=ticks.filter(x=>x.classList.contains('done')).length;
    const value=total?Math.round(done*100/total):0;
    fill.style.width=value===0?'0':'calc('+value+'% - 6px)';
    pct.textContent=value+'%';
    wrap.setAttribute('aria-valuenow',String(value));
    wrap.setAttribute('aria-valuemin','0');
    wrap.setAttribute('aria-valuemax','100');
    wrap.setAttribute('title',done+' de '+total+' aprendidos');
  }

  update();
  document.addEventListener('click',e=>{
    if(e.target.closest('.tick')) requestAnimationFrame(update);
  },true);
  const observer=new MutationObserver(list=>{
    if(list.some(m=>m.type==='attributes' && m.target.classList && m.target.classList.contains('tick'))) update();
  });
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();
