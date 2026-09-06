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

  function metaFor(t){
    let good=0,bad=0,crave=0,lapse=0,done=0,missed=0;
    for(let i=0;i<COUNT;i++){
      const s=status(t.id,dateAt(i));
      if(s==='clear'||s==='good')good++;
      else if(s==='bad')bad++;
      else if(s==='crave')crave++;
      else if(s==='lapse')lapse++;
      else if(s==='done')done++;
      else if(s==='missed')missed++;
    }
    if(t.kind==='avoid')return `${lapse} caídas · ${crave} ganas`;
    if(t.kind==='food')return `${good} bien · ${bad} mal`;
    return `${done} hechos${missed?` · ${missed} no`:''}`;
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
      label.innerHTML=`<div class="trace-namewrap"><div class="trace-name">${t.label}</div><div class="trace-meta">${metaFor(t)}</div></div>`;
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

  const DELTA={
    avoid:{clear:1.4,crave:.4,lapse:-4.5,unknown:0},
    food:{good:1.2,bad:-3.2,unknown:0},
    positive:{done:1.5,missed:-2.5,unknown:0}
  };
  function trajectory(t){
    let total=0;const out=[];
    for(let i=0;i<COUNT;i++){
      total=clamp(total+Number(DELTA[t.kind]?.[status(t.id,dateAt(i))]||0),-20,20);
      out.push(total);
    }
    return out;
  }
  const W=1400,H=70,RANGE=20;
  const x=i=>(i+.5)/COUNT*W;
  const y=v=>H/2-(clamp(v,-RANGE,RANGE)/RANGE)*(H*.38);
  function path(values){return values.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');}

  function renderEvolution(){
    evolutionHost.innerHTML='';
    for(const t of TRACKERS){
      const values=trajectory(t);
      const row=document.createElement('div');row.className='evolution-row';
      const name=document.createElement('div');name.className='evolution-name';name.innerHTML=`<strong>${t.label}</strong>`;
      const plot=document.createElement('div');plot.className='evolution-plot';
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('evolution-svg');
      let html=`<line class="evolution-zero" x1="0" y1="${H/2}" x2="${W}" y2="${H/2}"/>`;
      if(offset===0)html+=`<line class="evolution-today" x1="${x(COUNT-1)}" y1="0" x2="${x(COUNT-1)}" y2="${H}"/>`;
      html+=`<path class="evolution-line" d="${path(values)}"/>`;
      values.forEach((v,i)=>{html+=`<circle class="evolution-point" cx="${x(i)}" cy="${y(v)}" r="4.5"/>`;});
      svg.innerHTML=html;plot.append(svg);row.append(name,plot);evolutionHost.append(row);
    }
  }

  prev.onclick=()=>{offset++;selected={trackerId:null,date:null};renderAll();};
  next.onclick=()=>{if(offset===0)return;offset--;selected={trackerId:null,date:null};renderAll();};
  function renderAll(){renderAxis();renderRows();renderEditor();renderEvolution();}
  renderAll();
})();
