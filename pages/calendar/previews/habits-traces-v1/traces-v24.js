(()=>{
  /* v24: symbols keep one meaning everywhere. X = undesired event, solid fill = positive event,
     blank = no explicit event. Negative-event trackers treat blank as baseline/clear after activation;
     positive extras stay neutral until explicitly marked. */
  const GROUPS=[
    {id:'addictions',label:'Adicciones'},
    {id:'routine',label:'Rutina'},
    {id:'extras',label:'Extras'}
  ];
  const TRACKERS=[
    {id:'youtube',label:'YouTube',group:'addictions',kind:'avoid'},
    {id:'weed',label:'Marihuana',group:'addictions',kind:'avoid'},
    {id:'smoking',label:'Cigarrillos',group:'addictions',kind:'avoid'},
    {id:'food',label:'Comer mal',group:'routine',kind:'negative'},
    {id:'sleep',label:'Dormir mal',group:'routine',kind:'negative'},
    {id:'meds',label:'Pastillas mal',group:'routine',kind:'negative'},
    {id:'train',label:'Entrenar',group:'extras',kind:'positive'},
    {id:'study',label:'Estudio',group:'extras',kind:'positive'},
    {id:'mood',label:'Buen humor',group:'extras',kind:'positive'},
    {id:'productive',label:'Productivo',group:'extras',kind:'positive'}
  ];
  const CYCLES={avoid:['unknown','crave','lapse'],negative:['unknown','bad'],positive:['unknown','done']};
  const MONTHS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const DAYS=['D','L','M','X','J','V','S'];
  const COUNT=14;
  const KEY='prometeo-preview-habit-traces-v7';
  const GRAPH_KEY='prometeo-preview-habit-graphs-v13';
  const GROUP_KEY='prometeo-preview-habit-groups-v22';
  const START_KEY='prometeo-preview-habit-starts-v24';
  const OLD_KEYS=['prometeo-preview-habit-traces-v6','prometeo-preview-habit-traces-v3','prometeo-preview-habit-traces-v2','prometeo-preview-habit-traces-v1','prometeo-habit-overview-v4','prometeo-habit-rework-v3'];
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fromISO=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const human=s=>{const d=fromISO(s);return `${d.getDate()} ${MONTHS[d.getMonth()]}`};
  const shortDate=s=>{if(!s)return'';const d=fromISO(s);return `${d.getDate()} ${MONTHS[d.getMonth()].toUpperCase()}`};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  const axis=document.getElementById('traceAxis');
  const rowsHost=document.getElementById('traceRows');
  const range=document.getElementById('traceRange');
  const prev=document.getElementById('tracePrev');
  const next=document.getElementById('traceNext');
  if(!axis||!rowsHost||!range||!prev||!next)return;

  function seed(){
    const s={};TRACKERS.forEach(t=>s[t.id]={});
    const now=new Date(),put=(id,off,v)=>{s[id][iso(addDays(now,off))]=v};
    put('youtube',-9,'lapse');put('youtube',-3,'crave');
    put('weed',-7,'lapse');put('weed',-2,'crave');
    put('smoking',-11,'lapse');put('smoking',-5,'crave');put('smoking',-1,'lapse');
    [-11,-5,-2].forEach(o=>put('food',o,'bad'));
    [-10,-4].forEach(o=>put('sleep',o,'bad'));
    [-12,-6].forEach(o=>put('meds',o,'bad'));
    [-12,-9,-5,-2].forEach(o=>put('train',o,'done'));
    [-11,-8,-4,-1].forEach(o=>put('study',o,'done'));
    [-10,-6,-3].forEach(o=>put('mood',o,'done'));
    [-9,-7,-2,0].forEach(o=>put('productive',o,'done'));
    return s;
  }
  function load(){
    try{
      const current=JSON.parse(localStorage.getItem(KEY)||'null');if(current)return current;
      for(const key of OLD_KEYS){const old=JSON.parse(localStorage.getItem(key)||'null');if(old){localStorage.setItem(KEY,JSON.stringify(old));return old}}
    }catch{}
    return seed();
  }
  function loadObject(key){try{const x=JSON.parse(localStorage.getItem(key)||'null');if(x&&typeof x==='object')return x}catch{}return {}}

  let state=load(),expanded=loadObject(GRAPH_KEY),collapsed=loadObject(GROUP_KEY),starts=loadObject(START_KEY),offset=0;
  TRACKERS.forEach(t=>{if(!state[t.id])state[t.id]={}});
  const today=()=>iso(new Date());
  let startsDirty=false;
  TRACKERS.forEach(t=>{
    if(starts[t.id])return;
    const dates=Object.keys(state[t.id]||{}).sort();
    starts[t.id]=dates[0]||today();
    startsDirty=true;
  });
  if(startsDirty)localStorage.setItem(START_KEY,JSON.stringify(starts));

  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const saveExpanded=()=>localStorage.setItem(GRAPH_KEY,JSON.stringify(expanded));
  const saveCollapsed=()=>localStorage.setItem(GROUP_KEY,JSON.stringify(collapsed));
  const status=(id,date)=>state[id]?.[date]||'unknown';
  const end=()=>addDays(new Date(),-(offset*COUNT));
  const start=()=>addDays(end(),-(COUNT-1));
  const dateAt=i=>iso(addDays(start(),i));
  function setStatus(id,date,value){state[id]=state[id]||{};if(value==='unknown')delete state[id][date];else state[id][date]=value;save()}
  function normalizedStatus(t,s){
    if(t.kind==='avoid')return s==='lapse'?'lapse':s==='crave'?'crave':'unknown';
    if(t.kind==='negative')return s==='bad'||s==='missed'||s==='lapse'?'bad':'unknown';
    return s==='done'||s==='good'||s==='clear'?'done':'unknown';
  }
  function cycleStatus(t,date){
    const cycle=CYCLES[t.kind],current=normalizedStatus(t,status(t.id,date)),i=cycle.indexOf(current);
    setStatus(t.id,date,cycle[((i<0?0:i)+1)%cycle.length]);
  }
  function stateLabel(t,s){
    const n=normalizedStatus(t,s);
    return n==='unknown'?(t.kind==='positive'?'Sin marcar':'Sin evento'):n==='crave'?'Ganas':n==='lapse'?'Caída':n==='bad'?'Marcado':n==='done'?'Hecho':n;
  }
  function stateClass(t,s){
    const n=normalizedStatus(t,s);
    if(t.kind==='avoid')return n==='crave'?'is-crave':n==='lapse'?'is-lapse':'';
    if(t.kind==='negative')return n==='bad'?'is-food-bad':'';
    return n==='done'?'is-done':'';
  }
  function explicitBad(t,date){
    const n=normalizedStatus(t,status(t.id,date));
    return t.kind==='avoid'?n==='lapse':t.kind==='negative'?n==='bad':false;
  }
  function isBaselineGood(t,date){
    if(t.kind==='positive')return normalizedStatus(t,status(t.id,date))==='done';
    return !explicitBad(t,date);
  }

  function currentStreak(t){
    if(t.kind==='positive')return 0;
    const first=fromISO(starts[t.id]||today());
    let streak=0,d=new Date();
    while(d>=first&&streak<3660){if(explicitBad(t,iso(d)))break;streak++;d=addDays(d,-1)}
    return streak;
  }
  function bestPreviousStreak(t,current){
    if(t.kind==='positive')return {length:0,end:null};
    const first=fromISO(starts[t.id]||today());
    const cutoff=addDays(new Date(),-(Math.max(1,current+1)));
    if(first>cutoff)return {length:0,end:null};
    let run=0,best=0,bestEnd=null,d=new Date(first);
    while(d<=cutoff){
      if(isBaselineGood(t,iso(d))){run++;if(run>=best){best=run;bestEnd=iso(d)}}else run=0;
      d=addDays(d,1);
    }
    return {length:best,end:bestEnd};
  }
  function flameSvg(){return '<svg class="trace-stat-flame" viewBox="0 0 16 20" aria-hidden="true"><path d="M9.4 1.2c.5 3-1 4.4-2.2 5.7C6.1 8 5.3 9 5.6 10.8c.4-.8 1-1.4 1.8-2 .1 1.6 1.2 2.3 2 3.2.8.8 1.4 1.8 1.4 3 0 2.3-1.7 3.8-4 3.8S2.5 17.2 2.5 14.7c0-2.6 1.7-4.4 3.4-6.2C7.5 6.8 9.2 5 9.4 1.2Z"/></svg>'}
  function trophySvg(){return '<svg class="trace-stat-trophy" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v2h4v3c0 3-1.7 5-4.8 5.8-.7 1.2-1.8 2-3.2 2.4V19h4v2H7v-2h4v-2.8c-1.4-.4-2.5-1.2-3.2-2.4C4.7 13 3 11 3 8V5h4V3Zm0 4H5v1c0 1.5.8 2.6 2.2 3.2C7.1 10.5 7 9.8 7 9V7Zm10 0v2c0 .8-.1 1.5-.2 2.2C18.2 10.6 19 9.5 19 8V7h-2Z"/></svg>'}
  function statsMarkup(t){
    if(t.kind==='positive')return '<div class="trace-inline-stats trace-inline-stats-empty" aria-hidden="true"></div>';
    const current=currentStreak(t),best=bestPreviousStreak(t,current);
    const bestText=best.length?` Mejor racha anterior ${best.length} días, terminada el ${human(best.end)}.`:' Sin racha anterior registrada.';
    const bestMarkup=best.length?`<div class="trace-stat-best">${trophySvg()}<strong>${best.length}</strong><time class="trace-stat-date" datetime="${best.end}">${shortDate(best.end)}</time></div>`:'';
    return `<div class="trace-inline-stats" aria-label="Racha actual ${current} días.${bestText}"><div class="trace-stat-current">${flameSvg()}<strong>${current}</strong></div>${bestMarkup}</div>`;
  }
  function toggleMarkup(t){const open=!!expanded[t.id];return `<button class="trace-graph-toggle" type="button" data-graph-toggle="${t.id}" aria-expanded="${open}" aria-label="${open?'Ocultar':'Mostrar'} gráfico de ${t.label}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5.5 8 10l5-4.5"/></svg></button>`}

  function renderAxis(){
    const a=start(),b=end();
    range.textContent=`${a.getDate()} ${MONTHS[a.getMonth()]} — ${offset===0?'HOY':`${b.getDate()} ${MONTHS[b.getMonth()]}`}`;
    next.disabled=offset===0;
    axis.classList.toggle('current-window',offset===0);
    axis.innerHTML='';
    for(let i=0;i<COUNT;i++){
      const d=fromISO(dateAt(i)),el=document.createElement('div');
      el.className='trace-day-head'+(i===COUNT-1&&offset===0?' today':'');
      el.innerHTML=`<span>${d.getDate()}</span><small>${i===COUNT-1&&offset===0?'HOY':DAYS[d.getDay()]}</small>`;
      axis.append(el);
    }
  }

  function nextLevel(t,current,raw){
    const s=normalizedStatus(t,raw);
    if(t.kind==='avoid'){
      if(s==='lapse')return clamp(Math.max(78,current+70),0,100);
      if(s==='crave')return clamp(Math.max(18,current*.82+22),0,100);
      return current<3?0:current*.60;
    }
    if(t.kind==='negative'){
      if(s==='bad')return clamp(Math.max(68,current+62),0,100);
      return current<3?0:current*.60;
    }
    if(s==='done')return clamp(Math.max(52,current+44),0,100);
    return current<2?0:current*.72;
  }
  function levelSeries(t){
    const visibleStart=fromISO(dateAt(0));let level=0;
    for(let back=90;back>=1;back--){const d=addDays(visibleStart,-back);level=nextLevel(t,level,status(t.id,iso(d)))}
    const out=[];for(let i=0;i<COUNT;i++){level=nextLevel(t,level,status(t.id,dateAt(i)));if(level<1.5)level=0;out.push(level)}return out;
  }
  const W=1400,H=104,TOP=9,BOTTOM=11,x=i=>(i+.5)/COUNT*W,y=v=>TOP+(1-clamp(v,0,100)/100)*(H-TOP-BOTTOM);
  function smoothPath(values){
    const pts=values.map((v,i)=>({x:x(i),y:y(v)}));if(pts.length<2)return '';let d=`M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2,c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6,c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;
      d+=` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }
  function inlineGraphRow(t){
    const values=levelSeries(t),row=document.createElement('div');row.className='trace-inline-graph';row.dataset.graphFor=t.id;
    const side=document.createElement('div');side.className='trace-inline-graph-side';side.innerHTML=statsMarkup(t);
    const plot=document.createElement('div');plot.className='trace-inline-graph-plot'+(offset===0?' current-window':'');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('trace-inline-graph-svg');
    svg.innerHTML=`<line class="trace-inline-baseline" x1="0" y1="${y(0)}" x2="${W}" y2="${y(0)}"/><path class="trace-inline-line" d="${smoothPath(values)}"/>`;
    plot.append(svg);row.append(side,plot);return row;
  }

  function categoryRow(group){
    const isCollapsed=!!collapsed[group.id],wrap=document.createElement('div');wrap.className='habit-category';
    const btn=document.createElement('button');btn.type='button';btn.className='habit-category-toggle';btn.dataset.groupToggle=group.id;btn.setAttribute('aria-expanded',String(!isCollapsed));btn.setAttribute('aria-label',`${isCollapsed?'Mostrar':'Ocultar'} ${group.label}`);
    btn.innerHTML=`<span class="habit-category-label">${group.label}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5.5 8 10l5-4.5"/></svg>`;
    wrap.append(btn);return wrap;
  }
  function bindToggles(){
    rowsHost.querySelectorAll('[data-graph-toggle]').forEach(btn=>{btn.onclick=e=>{e.preventDefault();e.stopPropagation();const id=btn.dataset.graphToggle;expanded[id]=!expanded[id];if(!expanded[id])delete expanded[id];saveExpanded();renderRows()}});
    rowsHost.querySelectorAll('[data-group-toggle]').forEach(btn=>{btn.onclick=e=>{e.preventDefault();const id=btn.dataset.groupToggle;collapsed[id]=!collapsed[id];if(!collapsed[id])delete collapsed[id];saveCollapsed();renderRows()}});
  }

  function renderRows(){
    rowsHost.innerHTML='';
    for(const group of GROUPS){
      rowsHost.append(categoryRow(group));
      if(collapsed[group.id])continue;
      for(const t of TRACKERS.filter(x=>x.group===group.id)){
        const row=document.createElement('div');row.className='trace-row';
        const label=document.createElement('div');label.className='trace-label';label.innerHTML=`<span class="trace-name">${t.label}</span>${toggleMarkup(t)}`;
        const track=document.createElement('div');track.className='trace-track'+(offset===0?' current-window':'');
        for(let i=0;i<COUNT;i++){
          const date=dateAt(i),s=status(t.id,date),button=document.createElement('button');
          button.type='button';button.className='trace-day '+stateClass(t,s)+(i===COUNT-1&&offset===0?' today':'');
          button.setAttribute('aria-label',`${t.label} · ${human(date)} · ${stateLabel(t,s)}. Tocar para cambiar.`);
          button.onclick=()=>{cycleStatus(t,date);renderRows()};track.append(button);
        }
        row.append(label,track);rowsHost.append(row);
        if(expanded[t.id])rowsHost.append(inlineGraphRow(t));
      }
    }
    bindToggles();
  }

  prev.onclick=()=>{offset++;renderAll()};
  next.onclick=()=>{if(offset===0)return;offset--;renderAll()};
  function renderAll(){renderAxis();renderRows()}
  renderAll();
})();
