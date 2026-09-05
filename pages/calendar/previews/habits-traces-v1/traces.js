const TRACE_ICONS={
  fire:'/prometeo/pages/calendar/previews/workspace-v4/icons/fire.svg',
  carrot:'/prometeo/pages/calendar/previews/workspace-v4/icons/carrot.svg',
  pizza:'/prometeo/pages/calendar/previews/workspace-v4/icons/pizza.svg',
  youtube:'/prometeo/pages/calendar/previews/workspace-v4/icons/youtube.svg',
  books:'/prometeo/pages/calendar/previews/workspace-v4/icons/books.svg',
  news:'/prometeo/pages/calendar/previews/workspace-v4/icons/news.svg',
  weed:'/prometeo/pages/calendar/previews/workspace-v4/icons/weed.svg',
  cigarette:'/prometeo/pages/calendar/previews/workspace-v4/icons/cigarette.svg'
};
const TRACE_TRACKERS=[
  {id:'youtube',label:'YouTube',group:'Caídas',kind:'avoid',icon:TRACE_ICONS.youtube},
  {id:'weed',label:'Marihuana',group:'Caídas',kind:'avoid',icon:TRACE_ICONS.weed},
  {id:'smoking',label:'Cigarrillos',group:'Caídas',kind:'avoid',icon:TRACE_ICONS.cigarette},
  {id:'food',label:'Comida',group:'Cuerpo',kind:'food',icon:TRACE_ICONS.carrot},
  {id:'study',label:'Estudio',group:'Foco',kind:'positive',icon:TRACE_ICONS.books},
  {id:'news',label:'Noticias',group:'Foco',kind:'positive',icon:TRACE_ICONS.news}
];
const TRACE_MONTHS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const TRACE_DAYS=['D','L','M','X','J','V','S'];
const TRACE_COUNT=14;
const TRACE_KEY='prometeo-preview-habit-traces-v6';
const TRACE_OLD_KEYS=['prometeo-preview-habit-traces-v3','prometeo-preview-habit-traces-v2','prometeo-preview-habit-traces-v1','prometeo-habit-overview-v4','prometeo-habit-rework-v3'];
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromISO=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const human=s=>{const d=fromISO(s);return `${d.getDate()} ${TRACE_MONTHS[d.getMonth()]}`};

function seedTraceState(){
  const s={};TRACE_TRACKERS.forEach(t=>s[t.id]={});
  const now=new Date();const put=(id,off,v)=>{s[id][iso(addDays(now,off))]=v};
  for(let o=-13;o<=0;o++)put('youtube',o,'clear');put('youtube',-9,'lapse');put('youtube',-3,'crave');
  for(let o=-13;o<=0;o++)put('weed',o,'clear');put('weed',-7,'lapse');put('weed',-2,'crave');
  for(let o=-13;o<=0;o++)put('smoking',o,'clear');put('smoking',-11,'lapse');put('smoking',-5,'crave');put('smoking',-1,'lapse');
  [[-13,'good'],[-12,'good'],[-11,'bad'],[-10,'good'],[-8,'good'],[-7,'good'],[-5,'bad'],[-4,'good'],[-2,'good'],[0,'good']].forEach(([o,v])=>put('food',o,v));
  [-12,-9,-7,-5,-2,0].forEach(o=>put('study',o,'done'));
  [-11,-8,-4,-1].forEach(o=>put('news',o,'done'));
  return s;
}
function loadTraceState(){
  try{
    const current=JSON.parse(localStorage.getItem(TRACE_KEY)||'null');if(current)return current;
    for(const key of TRACE_OLD_KEYS){const prev=JSON.parse(localStorage.getItem(key)||'null');if(prev){localStorage.setItem(TRACE_KEY,JSON.stringify(prev));return prev;}}
  }catch{}
  return seedTraceState();
}
let traceState=loadTraceState();
let traceOffset=0;
let traceSelected={trackerId:null,date:null};
const traceSave=()=>localStorage.setItem(TRACE_KEY,JSON.stringify(traceState));
const traceStatus=(id,date)=>traceState[id]?.[date]||'unknown';
const traceTracker=id=>TRACE_TRACKERS.find(t=>t.id===id);
const traceEnd=()=>addDays(new Date(),-(traceOffset*TRACE_COUNT));
const traceStart=()=>addDays(traceEnd(),-(TRACE_COUNT-1));
const traceDateAt=i=>iso(addDays(traceStart(),i));
function traceSet(id,date,status){traceState[id]=traceState[id]||{};if(status==='unknown')delete traceState[id][date];else traceState[id][date]=status;traceSave();}
function traceWindowMeta(t){
  const m={good:0,lapse:0,crave:0,done:0,bad:0,unknown:0};
  for(let i=0;i<TRACE_COUNT;i++){
    const s=traceStatus(t.id,traceDateAt(i));
    if(s==='clear'||s==='good')m.good++;else if(s==='lapse')m.lapse++;else if(s==='crave')m.crave++;else if(s==='done')m.done++;else if(s==='bad')m.bad++;else m.unknown++;
  }
  return m;
}
function rangeLabel(){const a=traceStart(),b=traceEnd();return `${a.getDate()} ${TRACE_MONTHS[a.getMonth()]} — ${traceOffset===0?'HOY':`${b.getDate()} ${TRACE_MONTHS[b.getMonth()]}`}`;}
function renderTraceAxis(){
  traceRange.textContent=rangeLabel();traceNext.disabled=traceOffset===0;traceAxis.innerHTML='';
  for(let i=0;i<TRACE_COUNT;i++){
    const d=fromISO(traceDateAt(i));
    const x=document.createElement('div');x.className='trace-day-head'+(i===TRACE_COUNT-1&&traceOffset===0?' today':'');
    x.innerHTML=`<span>${d.getDate()}</span><small>${i===TRACE_COUNT-1&&traceOffset===0?'HOY':TRACE_DAYS[d.getDay()]}</small>`;
    traceAxis.append(x);
  }
}
function groupRow(name){const row=document.createElement('div');row.className='trace-group';row.innerHTML=`<div class="trace-group-label">${name}</div><div class="trace-group-fill"></div>`;return row;}
function classForStatus(t,s){
  if(t.kind==='avoid')return s==='clear'?'is-clear':s==='crave'?'is-crave':s==='lapse'?'is-lapse':'';
  if(t.kind==='food')return s==='good'?'is-food-good':s==='bad'?'is-food-bad':'';
  return s==='done'?'is-done':'';
}
function metaText(t,m){if(t.kind==='avoid')return `${m.lapse} caídas · ${m.crave} ganas`;if(t.kind==='food')return `${m.good} bien · ${m.bad} mal`;return `${m.done} días hechos`;}
function renderTraceRows(){
  traceRows.innerHTML='';let lastGroup=null;
  TRACE_TRACKERS.forEach(t=>{
    if(t.group!==lastGroup){traceRows.append(groupRow(t.group));lastGroup=t.group;}
    const row=document.createElement('div');row.className='trace-row';
    const label=document.createElement('div');label.className='trace-label';const m=traceWindowMeta(t);
    label.innerHTML=`<img class="trace-icon" src="${t.icon}" alt=""><div class="trace-namewrap"><div class="trace-name">${t.label}</div><div class="trace-meta">${metaText(t,m)}</div></div>`;
    const track=document.createElement('div');track.className='trace-track';
    for(let i=0;i<TRACE_COUNT;i++){
      const date=traceDateAt(i),s=traceStatus(t.id,date);const b=document.createElement('button');
      b.type='button';b.className='trace-day '+classForStatus(t,s)+(i===TRACE_COUNT-1&&traceOffset===0?' today':'')+(traceSelected.trackerId===t.id&&traceSelected.date===date?' selected':'');
      b.setAttribute('aria-label',`${t.label} · ${human(date)}`);b.onclick=()=>{traceSelected={trackerId:t.id,date};renderTraceRows();renderTraceEditor();};track.append(b);
    }
    row.append(label,track);traceRows.append(row);
  });
}
function labelState(s){return ({unknown:'Sin registro',clear:'Bien',crave:'Ganas',lapse:'Caída',good:'Bien',bad:'Mal',done:'Hecho'})[s]||s;}
function renderTraceEditor(){
  traceEditorActions.innerHTML='';
  if(!traceSelected.trackerId||!traceSelected.date){traceEditor.hidden=true;return;}
  const t=traceTracker(traceSelected.trackerId),current=traceStatus(t.id,traceSelected.date);
  traceEditorTitle.textContent=`${t.label} · ${human(traceSelected.date)}`;traceEditorState.textContent=labelState(current);traceEditor.hidden=false;
  const add=(label,status,primary=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;if(primary)b.className='primary';b.onclick=()=>{traceSet(t.id,traceSelected.date,status);renderTraceRows();renderTraceEditor();};traceEditorActions.append(b);};
  if(t.kind==='avoid'){add('BIEN','clear');add('GANAS','crave');add('CAÍ','lapse',true);add('BORRAR','unknown');}
  else if(t.kind==='food'){add('BIEN','good');add('MAL','bad',true);add('BORRAR','unknown');}
  else{add('HECHO','done',true);add('BORRAR','unknown');}
}
tracePrev.onclick=()=>{traceOffset++;traceSelected={trackerId:null,date:null};renderTraceAxis();renderTraceRows();renderTraceEditor();};
traceNext.onclick=()=>{if(traceOffset===0)return;traceOffset--;traceSelected={trackerId:null,date:null};renderTraceAxis();renderTraceRows();renderTraceEditor();};
renderTraceAxis();renderTraceRows();renderTraceEditor();
