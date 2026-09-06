(()=>{
  const TRACKERS=[
    {id:'youtube',label:'YouTube',group:'Caídas',kind:'avoid'},
    {id:'weed',label:'Marihuana',group:'Caídas',kind:'avoid'},
    {id:'smoking',label:'Cigarrillos',group:'Caídas',kind:'avoid'},
    {id:'food',label:'Comida',group:'Cuerpo',kind:'food'},
    {id:'study',label:'Estudio',group:'Foco',kind:'positive'},
    {id:'news',label:'Noticias',group:'Foco',kind:'positive'}
  ];
  const MONTHS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const DAYS=['D','L','M','X','J','V','S'];
  const COUNT=14;
  const KEY='prometeo-preview-habit-traces-v7';
  const OLD_KEYS=['prometeo-preview-habit-traces-v6','prometeo-preview-habit-traces-v3','prometeo-preview-habit-traces-v2','prometeo-preview-habit-traces-v1','prometeo-habit-overview-v4','prometeo-habit-rework-v3'];
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fromISO=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const human=s=>{const d=fromISO(s);return `${d.getDate()} ${MONTHS[d.getMonth()]}`};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  const axis=document.getElementById('traceAxis');
  const rowsHost=document.getElementById('traceRows');
  const range=document.getElementById('traceRange');
  const prev=document.getElementById('tracePrev');
  const next=document.getElementById('traceNext');
  const editor=document.getElementById('traceEditor');
  const editorTitle=document.getElementById('traceEditorTitle');
  const editorState=document.getElementById('traceEditorState');
  const editorActions=document.getElementById('traceEditorActions');
  const evolutionHost=document.getElementById('evolutionRows');
  if(!axis||!rowsHost||!range||!prev||!next||!editor||!evolutionHost)return;

  function seed(){
    const s={};TRACKERS.forEach(t=>s[t.id]={});
    const now=new Date();const put=(id,off,v)=>{s[id][iso(addDays(now,off))]=v};
    for(let o=-13;o<=0;o++)put('youtube',o,'clear');put('youtube',-9,'lapse');put('youtube',-3,'crave');
    for(let o=-13;o<=0;o++)put('weed',o,'clear');put('weed',-7,'lapse');put('weed',-2,'crave');
    for(let o=-13;o<=0;o++)put('smoking',o,'clear');put('smoking',-11,'lapse');put('smoking',-5,'crave');put('smoking',-1,'lapse');
    [[-13,'good'],[-12,'good'],[-11,'bad'],[-10,'good'],[-8,'good'],[-7,'good'],[-5,'bad'],[-4,'good'],[-2,'good'],[0,'good']].forEach(([o,v])=>put('food',o,v));
    [-12,-9,-7,-5,-2,0].forEach(o=>put('study',o,'done'));
    [-11,-8,-4,-1].forEach(o=>put('news',o,'done'));
    return s;
  }
  function load(){
    try{
      const current=JSON.parse(localStorage.getItem(KEY)||'null');if(current)return current;
      for(const key of OLD_KEYS){const old=JSON.parse(localStorage.getItem(key)||'null');if(old){localStorage.setItem(KEY,JSON.stringify(old));return old;}}
    }catch{}
    return seed();
  }

  let state=load(),offset=0,selected={trackerId:null,date:null};
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const status=(id,date)=>state[id]?.[date]||'unknown';
  const tracker=id=>TRACKERS.find(t=>t.id===id);
  const end=()=>addDays(new Date(),-(offset*COUNT));
  const start=()=>addDays(end(),-(COUNT-1));
  const dateAt=i=>iso(addDays(start(),i));
  function setStatus(id,date,value){state[id]=state[id]||{};if(value==='unknown')delete state[id][date];else state[id][date]=value;save();}
  function stateLabel(s){return ({unknown:'Sin registro',clear:'Bien',crave:'Ganas',lapse:'Caída',good:'Bien',bad:'Mal',done:'Hecho',missed:'No hecho'})[s]||s;}
  function stateClass(t,s){
    if(t.kind==='avoid')return s==='clear'?'is-clear':s==='crave'?'is-crave':s==='lapse'?'is-lapse':'';
    if(t.kind==='food')return s==='good'?'is-food-good':s==='bad'?'is-food-bad':'';
    return s==='done'?'is-done':s==='missed'?'is-missed':'';
  }

  function streakFor(t){
    let streak=0;
    for(let i=COUNT-1;i>=0;i--){
      const s=status(t.id,dateAt(i));
      const ok=t.kind==='avoid'?s==='clear':t.kind==='food'?s==='good':s==='done';
      if(!ok)break;
      streak++;
    }
    return streak;
  }

  function flameMarkup(streak){
    if(streak<3)return '<span class="trace-streak-spacer" aria-hidden="true"></span>';
    return `<span class="trace-streak" title="Racha de ${streak} días" aria-label="Racha de ${streak} días"><svg viewBox="0 0 16 20" aria-hidden="true"><path d="M9.4 1.2c.5 3-1 4.4-2.2 5.7C6.1 8 5.3 9 5.6 10.8c.4-.8 1-1.4 1.8-2 .1 1.6 1.2 2.3 2 3.2.8.8 1.4 1.8 1.4 3 0 2.3-1.7 3.8-4 3.8S2.5 17.2 2.5 14.7c0-2.6 1.7-4.4 3.4-6.2C7.5 6.8 9.2 5 9.4 1.2Z"/></svg><span>${streak}</span></span>`;
  }

  function renderAxis(){
    const a=start(),b=end();
    range.textContent=`${a.getDate()} ${MONTHS[a.getMonth()]} — ${offset===0?'HOY':`${b.getDate()} ${MONTHS[b.getMonth()]}`}`;
    next.disabled=offset===0;axis.innerHTML='';
    for(let i=0;i<COUNT;i++){
      const d=fromISO(dateAt(i));
      const el=document.createElement('div');
      el.className='trace-day-head'+(i===COUNT-1&&offset===0?' today':'');
      el.innerHTML=`<span>${d.getDate()}</span><small>${i===COUNT-1&&offset===0?'HOY':DAYS[d.getDay()]}</small>`;
      axis.append(el);
    }
  }

  function groupRow(name){
    const row=document.createElement('div');row.className='trace-group';
    row.innerHTML=`<div class="trace-group-label">${name}</div><div class="trace-group-fill"></div>`;
    return row;
  }

  function renderRows(){
    rowsHost.innerHTML='';let group=null;
    for(const t of TRACKERS){
      if(t.group!==group){rowsHost.append(groupRow(t.group));group=t.group;}
      const row=document.createElement('div');row.className='trace-row';
      const label=document.createElement('div');label.className='trace-label';
      label.innerHTML=`<span class="trace-name">${t.label}</span>${flameMarkup(streakFor(t))}`;
      const track=document.createElement('div');track.className='trace-track';
      for(let i=0;i<COUNT;i++){
        const date=dateAt(i),s=status(t.id,date),button=document.createElement('button');
        button.type='button';
        button.className='trace-day '+stateClass(t,s)+(i===COUNT-1&&offset===0?' today':'')+(selected.trackerId===t.id&&selected.date===date?' selected':'');
        button.setAttribute('aria-label',`${t.label} · ${human(date)} · ${stateLabel(s)}`);
        button.onclick=()=>{selected={trackerId:t.id,date};renderRows();renderEditor();};
        track.append(button);
      }
      row.append(label,track);rowsHost.append(row);
    }
  }

  function renderEditor(){
    editorActions.innerHTML='';
    if(!selected.trackerId||!selected.date){editor.hidden=true;return;}
    const t=tracker(selected.trackerId),current=status(t.id,selected.date);
    editor.hidden=false;editorTitle.textContent=`${t.label} · ${human(selected.date)}`;editorState.textContent=stateLabel(current);
    const add=(label,value,primary=false)=>{
      const b=document.createElement('button');b.type='button';b.textContent=label;if(primary)b.className='primary';
      b.onclick=()=>{setStatus(t.id,selected.date,value);renderRows();renderEditor();renderEvolution();};editorActions.append(b);
    };
    if(t.kind==='avoid'){add('BIEN','clear');add('GANAS','crave');add('CAÍ','lapse',true);add('BORRAR','unknown');}
    else if(t.kind==='food'){add('BIEN','good');add('MAL','bad',true);add('BORRAR','unknown');}
    else{add('HECHO','done',true);add('NO','missed');add('BORRAR','unknown');}
  }

  /*
    v12 trajectory semantics:
    - zero/bottom means stable;
    - explicit problems create upward spikes;
    - good days accelerate decay toward zero;
    - unknown never creates a problem and only permits slow passive decay;
    - the trajectory is derived and never persisted.
  */
  function nextRisk(t,current,s){
    if(t.kind==='avoid'){
      if(s==='lapse')return clamp(Math.max(78,current+70),0,100);
      if(s==='crave')return clamp(Math.max(18,current*.82+22),0,100);
      if(s==='clear')return current<3?0:current*.60;
      return current<2?0:current*.90;
    }
    if(t.kind==='food'){
      if(s==='bad')return clamp(Math.max(62,current+58),0,100);
      if(s==='good')return current<3?0:current*.62;
      return current<2?0:current*.92;
    }
    if(s==='missed')return clamp(Math.max(48,current+44),0,100);
    if(s==='done')return current<3?0:current*.58;
    return current<2?0:current*.93;
  }

  function riskSeries(t){
    const visibleStart=fromISO(dateAt(0));
    let risk=0;
    /* Replay prior history so changing the 14-day window does not reset a lingering spike. */
    for(let back=90;back>=1;back--){
      const d=addDays(visibleStart,-back);
      risk=nextRisk(t,risk,status(t.id,iso(d)));
    }
    const out=[];
    for(let i=0;i<COUNT;i++){
      risk=nextRisk(t,risk,status(t.id,dateAt(i)));
      if(risk<1.5)risk=0;
      out.push(risk);
    }
    return out;
  }

  const W=1400,H=108,TOP=10,BOTTOM=12;
  const x=i=>(i+.5)/COUNT*W;
  const y=v=>TOP+(1-clamp(v,0,100)/100)*(H-TOP-BOTTOM);
  function smoothPath(values){
    const pts=values.map((v,i)=>({x:x(i),y:y(v)}));
    if(pts.length<2)return '';
    let d=`M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
      const c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6;
      const c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;
      d+=` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function renderEvolution(){
    evolutionHost.innerHTML='';
    for(const t of TRACKERS){
      const values=riskSeries(t);
      const row=document.createElement('div');row.className='evolution-row';
      const name=document.createElement('div');name.className='evolution-name';
      name.innerHTML=`<strong>${t.label}</strong>${flameMarkup(streakFor(t))}`;
      const plot=document.createElement('div');plot.className='evolution-plot';
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('evolution-svg');
      let html=`<line class="evolution-baseline" x1="0" y1="${y(0)}" x2="${W}" y2="${y(0)}"/>`;
      if(offset===0)html+=`<line class="evolution-today" x1="${x(COUNT-1)}" y1="0" x2="${x(COUNT-1)}" y2="${H}"/>`;
      html+=`<path class="evolution-line" d="${smoothPath(values)}"/>`;
      svg.innerHTML=html;plot.append(svg);row.append(name,plot);evolutionHost.append(row);
    }
  }

  prev.onclick=()=>{offset++;selected={trackerId:null,date:null};renderAll();};
  next.onclick=()=>{if(offset===0)return;offset--;selected={trackerId:null,date:null};renderAll();};
  function renderAll(){renderAxis();renderRows();renderEditor();renderEvolution();}
  renderAll();
})();
