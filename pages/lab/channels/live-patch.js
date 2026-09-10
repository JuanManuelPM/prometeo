(()=>{
  const baseLoad=loadLiveChannel;
  loadLiveChannel=async function(id,name){
    await baseLoad(id,name);
    if(!live)return;
    const vids=await Creator.videos(id);
    const byStory=new Map();
    for(const v of vids){if(!v.story_id)continue;const a=byStory.get(v.story_id)||[];a.push(v);byStory.set(v.story_id,a)}
    for(const s of (data[name]||[])){
      for(const v of (byStory.get(s.id)||[])){
        const e=(s.eps||[]).find(x=>x[0]===v.title);
        if(e){e[2]=statusLabel(v.state);e[3]=v.id}
      }
    }
  };

  renderReady=function(){
    const root=$("#readyGrid");root.innerHTML="";
    (ready[current]||[]).slice(0,3).forEach(e=>{
      const d=document.createElement(live&&e[3]?"button":"div");d.className="episode";
      d.innerHTML=`<div class="poster"><img ${e[1]==="fruti"?'data-imgkey="fruti"':''} src="${imageSrc(e[1])}" alt=""></div><div class="ready-title">${e[0]}</div><div class="ready-meta">${e[2]}</div>`;
      if(live&&e[3])d.onclick=async()=>{
        const meta=d.querySelector('.ready-meta');
        if(!d.dataset.publishArmed){d.dataset.publishArmed='1';meta.textContent='tocar otra vez · subir privado';return}
        d.disabled=true;meta.textContent='preparando upload…';
        try{
          const p=await Creator.publish(e[3],{privacy:'private',contains_synthetic_media:true});
          const j=await Creator.waitJob(p.job.id,x=>meta.textContent=statusLabel(x.status));
          if(j.status==='SUCCEEDED'){meta.textContent='subido privado';await loadLiveChannel(liveChannelId,current);render()}
          else if(j.status==='WAITING_AUTH'){meta.textContent='YouTube sin conectar · Setup';d.disabled=false}
          else d.disabled=false;
        }catch(err){meta.textContent=String(err.message||err);d.disabled=false}
      };
      root.appendChild(d)
    });
    if(live&&!root.children.length)root.innerHTML='<div class="ready-meta">todavía no hay videos listos</div>'
  };
})();