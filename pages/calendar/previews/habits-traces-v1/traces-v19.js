(()=>{
  /* v19: day cells cycle directly; primary rows stay visually silent.
     Secondary streak information lives only in the free rail under an opened graph. */
  const TRACKERS=[
    {id:'youtube',label:'YouTube',group:'Caídas',kind:'avoid'},
    {id:'weed',label:'Marihuana',group:'Caídas',kind:'avoid'},
    {id:'smoking',label:'Cigarrillos',group:'Caídas',kind:'avoid'},
    {id:'food',label:'Comida',group:'Cuerpo',kind:'binary'},
    {id:'train',label:'Entrenar',group:'Cuerpo',kind:'positive'},
    {id:'sleep',label:'Sueño',group:'Cuerpo',kind:'binary'},
    {id:'meds',label:'Pastillas',group:'Cuerpo',kind:'binary'},
    {id:'study',label:'Estudio',group:'Foco',kind:'positive'},
    {id:'news',label:'Noticias',group:'Foco',kind:'positive'}
  ];
  const CYCLES={
    avoid:['unknown','clear','crave','lapse'],
    binary:['unknown','good','bad'],
    positive:['unknown','done','missed']
  };
  const MONTHS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const DAYS=['D','L','M','X','J','V','S'];
  const COUNT=14;
  const KEY='prometeo-preview-habit-traces-v7';
  const GRAPH_KEY='prometeo-preview-habit-graphs-v13';
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
  if(!axis||!rowsHost||!range||!prev||!next)return;

  function seed(){
    const s={};TRACKERS.forEach(t=>s[t.id]={});
    const now=new Date(),put=(id,off,v)=>{s[id][iso(addDays(now,off))]=v};
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
  function loadExpanded(){try{const x=JSON.parse(localStorage.getItem(GRAPH_KEY)||'null');if(x&&typeof x==='object')return x}catch{}return {}}
  let state=load(),expanded=loadExpanded(),offset=0;
  TRACKERS.forEach(t=>{if(!state[t.id])state[t.id]={}});
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const saveExpanded=()=>localStorage.setItem(GRAPH_KEY,JSON.stringify(expanded));
  const status=(id,date)=>state[id]?.[date]||'unknown';
  const end=()=>addDays(new Date(),-(offset*COUNT));
  const start=()=>addDays(end(),-(COUNT-1));
  const dateAt=i=>iso(addDays(start(),i));
  function setStatus(id,date,value){state[id]=state[id]||{};if(value==='unknown')delete state[id][date];else state[id][date]=value;save()}
  function cycleStatus(t,date){
    const cycle=CYCLES[t.kind],current=status(t.id,date),i=cycle.indexOf(current);
    setStatus(t.id,date,cycle[((i<0?0:i)+1)%cycle.length]);
  }
  function stateLabel(s){return ({unknown:'Sin registro',clear:'Bien',crave:'Ganas',lapse:'Caída',good:'Bien',bad:'Mal',done:'Hecho',missed:'No hecho'})[s]||s}
  function stateClass(t,s){
    if(t.kind==='avoid')return s==='clear'?'is-clear':s==='crave'?'is-crave':s==='lapse'?'is-lapse':'';
    if(t.kind==='binary')return s==='good'?'is-food-good':s==='bad'?'is-food-bad':'';
    return s==='done'?'is-done':s==='missed'?'is-missed':'';
  }
  function isGood(t,s){return t.kind==='avoid'?s==='clear':t.kind==='binary'?s==='good':s==='done'}

  /* Streaks are computed from canonical day logs, not from the visible 14-day window. */
  function currentStreak(t){
    let streak=0,d=new Date();
    while(streak<3660&&isGood(t,status(t.id,iso(d)))){streak++;d=addDays(d,-1)}
    return streak;
  }
  function bestPreviousStreak(t,current){
    const dates=Object.keys(state[t.id]||{}).sort();
    if(!dates.length)return 0;
    const first=fromISO(dates[0]);
    const cutoff=addDays(new Date(),-(Math.max(1,current+1)));
    if(first>cutoff)return 0;
    let run=0,best=0,d=new Date(first);
    while(d<=cutoff){
      if(isGood(t,status(t.id,iso(d)))){run++;if(run>best)best=run}else run=0;
      d=addDays(d,1);
    }
    return best;
  }
  function flameSvg(){return '<svg class="trace-stat-flame" viewBox="0 0 16 20" aria-hidden="true"><path d="M9.4 1.2c.5 3-1 4.4-2.2 5.7C6.1 8 5.3 9 5.6 10.8c.4-.8 1-1.4 1.8-2 .1 1.6 1.2 2.3 2 3.2.8.8 1.4 1.8 1.4 3 0 2.3-1.7 3.8-4 3.8S2.5 17.2 2.5 14.7c0-2.6 1.7-4.4 3.4-6.2C7.5 6.8 9.2 5 9.4 1.2Z"/></svg>'}
  function statsMarkup(t){
    const current=currentStreak(t),best=bestPreviousStreak(t,current);
    return `<div class="trace-inline-stats" aria-label="Racha actual ${current} días. Mejor racha anterior ${best} días.">
      <div class="trace-stat-current">${flameSvg()}<strong>${current}</strong><span>RACHA</span></div>
      <div class="trace-stat-best"><span>MEJOR</span><strong>${best}</strong></div>
    </div>`;
  }
  function toggleMarkup(t){const open=!!expanded[t.id];return `<button class="trace-graph-toggle" type="button" data-graph-toggle="${t.id}" aria-expanded="${open}" aria-label="${open?'Ocultar':'Mostrar'} gráfico de ${t.label}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5.5 8 10l5-4.5"/></svg></button>`}
  function renderAxis(){
    const a=start(),b=end();range.textContent=`${a.getDate()} ${MONTHS[a.getMonth()]} — ${offset===0?'HOY':`${b.getDate()} ${MONTHS[b.getMonth()]}`}`;next.disabled=offset===0;axis.innerHTML='';
    for(let i=0;i<COUNT;i++){const d=fromISO(dateAt(i)),el=document.createElement('div');el.className='trace-day-head'+(i===COUNT-1&&offset===0?' today':'');el.innerHTML=`<span>${d.getDate()}</span><small>${i===COUNT-1&&offset===0?'HOY':DAYS[d.getDay()]}</small>`;axis.append(el)}
  }
  function groupRow(name){const row=document.createElement('div');row.className='trace-group';row.innerHTML=`<div class="trace-group-label">${name}</div><div class="trace-group-fill"></div>`;return row}
  function nextRisk(t,current,s){
    if(t.kind==='avoid'){if(s==='lapse')return clamp(Math.max(78,current+70),0,100);if(s==='crave')return clamp(Math.max(18,current*.82+22),0,100);if(s==='clear')return current<3?0:current*.60;return current<2?0:current*.90}
    if(t.kind==='binary'){if(s==='bad')return clamp(Math.max(62,current+58),0,100);if(s==='good')return current<3?0:current*.62;return current<2?0:current*.92}
    if(s==='missed')return clamp(Math.max(48,current+44),0,100);if(s==='done')return current<3?0:current*.58;return current<2?0:current*.93;
  }
  function riskSeries(t){
    const visibleStart=fromISO(dateAt(0));let risk=0;
    for(let back=90;back>=1;back--){const d=addDays(visibleStart,-back);risk=nextRisk(t,risk,status(t.id,iso(d)))}
    const out=[];for(let i=0;i<COUNT;i++){risk=nextRisk(t,risk,status(t.id,dateAt(i)));if(risk<1.5)risk=0;out.push(risk)}return out;
  }
  const W=1400,H=104,TOP=9,BOTTOM=11,x=i=>(i+.5)/COUNT*W,y=v=>TOP+(1-clamp(v,0,100)/100)*(H-TOP-BOTTOM);
  function smoothPath(values){
    const pts=values.map((v,i)=>({x:x(i),y:y(v)}));if(pts.length<2)return '';let d=`M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2,c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6,c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;d+=` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`}
    return d;
  }
  function inlineGraphRow(t){
    const values=riskSeries(t),row=document.createElement('div');row.className='trace-inline-graph';row.dataset.graphFor=t.id;
    const side=document.createElement('div');side.className='trace-inline-graph-side';side.innerHTML=statsMarkup(t);
    const plot=document.createElement('div');plot.className='trace-inline-graph-plot';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('trace-inline-graph-svg');
    let html=`<line class="trace-inline-baseline" x1="0" y1="${y(0)}" x2="${W}" y2="${y(0)}"/>`;if(offset===0)html+=`<line class="trace-inline-today" x1="${x(COUNT-1)}" y1="0" x2="${x(COUNT-1)}" y2="${H}"/>`;html+=`<path class="trace-inline-line" d="${smoothPath(values)}"/>`;svg.innerHTML=html;plot.append(svg);row.append(side,plot);return row;
  }
  function bindGraphToggles(){rowsHost.querySelectorAll('[data-graph-toggle]').forEach(btn=>{btn.onclick=e=>{e.preventDefault();e.stopPropagation();const id=btn.dataset.graphToggle;expanded[id]=!expanded[id];if(!expanded[id])delete expanded[id];saveExpanded();renderRows()}})}
  function renderRows(){
    rowsHost.innerHTML='';let group=null;
    for(const t of TRACKERS){
      if(t.group!==group){rowsHost.append(groupRow(t.group));group=t.group}
      const row=document.createElement('div');row.className='trace-row';const label=document.createElement('div');label.className='trace-label';label.innerHTML=`<span class="trace-name">${t.label}</span>${toggleMarkup(t)}`;const track=document.createElement('div');track.className='trace-track';
      for(let i=0;i<COUNT;i++){
        const date=dateAt(i),s=status(t.id,date),button=document.createElement('button');button.type='button';button.className='trace-day '+stateClass(t,s)+(i===COUNT-1&&offset===0?' today':'');button.setAttribute('aria-label',`${t.label} · ${human(date)} · ${stateLabel(s)}. Tocar para cambiar.`);
        button.onclick=()=>{cycleStatus(t,date);renderRows()};track.append(button);
      }
      row.append(label,track);rowsHost.append(row);if(expanded[t.id])rowsHost.append(inlineGraphRow(t));
    }
    bindGraphToggles();
  }
  prev.onclick=()=>{offset++;renderAll()};next.onclick=()=>{if(offset===0)return;offset--;renderAll()};
  function renderAll(){renderAxis();renderRows()}
  renderAll();
})();