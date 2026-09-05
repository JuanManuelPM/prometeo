const TICON={
  fire:'./icons/fire.svg',
  carrot:'./icons/carrot.svg',
  pizza:'./icons/pizza.svg',
  youtube:'./icons/youtube.svg',
  books:'./icons/books.svg',
  news:'./icons/news.svg',
  weed:'./icons/weed.svg',
  cigarette:'./icons/cigarette.svg',
  fall:'./icons/fall.svg'
};

const TM=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const TRACE_COUNT=14;

const TRACE_TRACKERS=[
  {id:'youtube',label:'YouTube',group:'Caídas',kind:'avoid',icon:TICON.youtube},
  {id:'weed',label:'Marihuana',group:'Caídas',kind:'avoid',icon:TICON.weed},
  {id:'smoking',label:'Cigarrillos',group:'Caídas',kind:'avoid',icon:TICON.cigarette},
  {id:'food',label:'Comida',group:'Cuerpo',kind:'food',icon:TICON.carrot,alt:TICON.pizza},
  {id:'study',label:'Estudio',group:'Foco',kind:'positive',icon:TICON.books},
  {id:'news',label:'Noticias',group:'Foco',kind:'positive',icon:TICON.news}
];

const TRACE_KEY='prometeo-preview-habit-traces-v3';
const PREV_KEYS=['prometeo-preview-habit-traces-v2','prometeo-preview-habit-traces-v1'];
const tfmt=n=>String(n).padStart(2,'0');
const tiso=d=>`${d.getFullYear()}-${tfmt(d.getMonth()+1)}-${tfmt(d.getDate())}`;
const tfrom=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const tadd=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const tcenter=i=>((i-.5)/TRACE_COUNT)*100;
const tleft=i=>((i-1)/TRACE_COUNT)*100;
const twidth=()=>100/TRACE_COUNT;
const thuman=s=>{const d=tfrom(s);return `${d.getDate()} ${TM[d.getMonth()].slice(0,3)}`};
const tdayDiff=(a,b)=>Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);

function traceSeed(){
  const s={};TRACE_TRACKERS.forEach(t=>s[t.id]={});
  const now=new Date();
  const put=(id,off,v)=>{s[id][tiso(tadd(now,off))]=v};

  for(let o=-13;o<=0;o++)put('youtube',o,'clear');
  put('youtube',-9,'lapse');
  put('youtube',-3,'crave');

  for(let o=-13;o<=0;o++)put('weed',o,'clear');
  put('weed',-7,'lapse');
  put('weed',-2,'crave');

  for(let o=-13;o<=0;o++)put('smoking',o,'clear');
  put('smoking',-11,'lapse');
  put('smoking',-5,'crave');
  put('smoking',-1,'lapse');

  [[-13,'good'],[-12,'good'],[-11,'bad'],[-10,'good'],[-8,'good'],[-7,'good'],[-5,'bad'],[-4,'good'],[-2,'good'],[0,'good']]
    .forEach(([o,v])=>put('food',o,v));

  [-12,-9,-7,-5,-2,0].forEach(o=>put('study',o,'done'));
  [-11,-8,-4,-1].forEach(o=>put('news',o,'done'));
  return s;
}

function loadTraceState(){
  try{
    const current=JSON.parse(localStorage.getItem(TRACE_KEY)||'null');
    if(current)return current;
    for(const key of PREV_KEYS){
      const prev=JSON.parse(localStorage.getItem(key)||'null');
      if(prev){localStorage.setItem(TRACE_KEY,JSON.stringify(prev));return prev;}
    }
  }catch{}
  return traceSeed();
}

let traceState=loadTraceState();
let traceOffset=0;
let traceSelected={trackerId:null,date:null};

const traceSave=()=>localStorage.setItem(TRACE_KEY,JSON.stringify(traceState));
const traceStatus=(id,date)=>traceState[id]?.[date]||'unknown';
const traceTracker=id=>TRACE_TRACKERS.find(t=>t.id===id);
const traceEnd=()=>tadd(new Date(),-(traceOffset*TRACE_COUNT));
const traceStart=()=>tadd(traceEnd(),-(TRACE_COUNT-1));
const traceDateAt=i=>tiso(tadd(traceStart(),i-1));

function traceSet(id,date,status){
  traceState[id]=traceState[id]||{};
  if(status==='unknown')delete traceState[id][date];
  else traceState[id][date]=status;
  traceSave();
}

function traceWindowMeta(t){
  const m={good:0,lapse:0,crave:0,done:0,bad:0,unknown:0};
  for(let i=1;i<=TRACE_COUNT;i++){
    const s=traceStatus(t.id,traceDateAt(i));
    if(s==='clear'||s==='good')m.good++;
    else if(s==='lapse')m.lapse++;
    else if(s==='crave')m.crave++;
    else if(s==='done')m.done++;
    else if(s==='bad')m.bad++;
    else m.unknown++;
  }
  return m;
}

function traceCurrentStreak(t){
  if(t.kind!=='avoid')return 0;
  let n=0;
  const now=new Date();
  for(let i=0;i<120;i++){
    const s=traceStatus(t.id,tiso(tadd(now,-i)));
    if(s==='clear'||s==='crave')n++;
    else break;
  }
  return n;
}

function traceRangeLabel(){
  const a=traceStart(),b=traceEnd();
  const left=`${a.getDate()} ${TM[a.getMonth()].slice(0,3)}`;
  const right=traceOffset===0?'HOY':`${b.getDate()} ${TM[b.getMonth()].slice(0,3)}`;
  return `${left} — ${right}`;
}

function traceGuides(host,labels=false){
  [1,4,7,10,14].forEach(i=>{
    const x=tcenter(i);
    const guide=document.createElement('i');
    guide.className='trace-guide';
    guide.style.left=x+'%';
    host.append(guide);
    if(labels){
      const d=tfrom(traceDateAt(i));
      const label=document.createElement('span');
      label.className='trace-tick';
      label.style.left=x+'%';
      label.textContent=i===14&&traceOffset===0?'HOY':`${d.getDate()} ${TM[d.getMonth()].slice(0,3)}`;
      host.append(label);
    }
  });

  if(traceOffset===0){
    const edge=document.createElement('i');
    edge.className='trace-today-edge';
    host.append(edge);
  }
}

function renderTraceAxis(){
  traceMonth.textContent=traceRangeLabel();
  traceNext.disabled=traceOffset===0;
  traceAxis.innerHTML='';
  traceGuides(traceAxis,true);
}

function traceGroup(name){
  const row=document.createElement('div');
  row.className='trace-group';
  row.innerHTML=`<div class="trace-group-label"><span>${name}</span></div><div class="trace-group-field"></div>`;
  return row;
}

function addDayState(track,i,className){
  const mark=document.createElement('i');
  mark.className='trace-day-state '+className;
  mark.style.left=tleft(i)+'%';
  mark.style.width=twidth()+'%';
  track.append(mark);
}

function addAvoidMarks(track,t){
  for(let i=1;i<=TRACE_COUNT;i++){
    const s=traceStatus(t.id,traceDateAt(i));
    if(s==='clear')addDayState(track,i,'is-clear');
    else if(s==='crave')addDayState(track,i,'is-crave');
    else if(s==='lapse')addDayState(track,i,'is-lapse');
  }
}

function addFoodMarks(track,t){
  for(let i=1;i<=TRACE_COUNT;i++){
    const s=traceStatus(t.id,traceDateAt(i));
    if(s==='good')addDayState(track,i,'is-food-good');
    else if(s==='bad')addDayState(track,i,'is-food-bad');
  }
}

function addPositiveMarks(track,t){
  for(let i=1;i<=TRACE_COUNT;i++){
    if(traceStatus(t.id,traceDateAt(i))==='done')addDayState(track,i,'is-done');
  }
}

function addTraceHits(track,t){
  for(let i=1;i<=TRACE_COUNT;i++){
    const date=traceDateAt(i);
    const hit=document.createElement('button');
    hit.type='button';
    hit.className='trace-hit';
    hit.style.left=tleft(i)+'%';
    hit.style.width=twidth()+'%';
    hit.setAttribute('aria-label',`${t.label} · ${thuman(date)}`);
    hit.onclick=()=>{
      traceSelected={trackerId:t.id,date};
      renderTraceRows();
      renderTraceEditor();
    };
    track.append(hit);
  }

  if(traceSelected.trackerId===t.id&&traceSelected.date){
    const idx=tdayDiff(traceStart(),tfrom(traceSelected.date))+1;
    if(idx>=1&&idx<=TRACE_COUNT){
      const sel=document.createElement('i');
      sel.className='trace-selection';
      sel.style.left=tleft(idx)+'%';
      sel.style.width=twidth()+'%';
      track.append(sel);
    }
  }
}

function renderTraceRows(){
  traceRows.innerHTML='';
  let lastGroup=null;

  TRACE_TRACKERS.forEach(t=>{
    if(t.group!==lastGroup){
      traceRows.append(traceGroup(t.group));
      lastGroup=t.group;
    }

    const meta=traceWindowMeta(t);
    let metaText='',score='';
    if(t.kind==='avoid'){
      metaText=`${meta.lapse} caídas · ${meta.crave} ganas`;
      score=`<span>${traceCurrentStreak(t)} d</span>`;
    }else if(t.kind==='food'){
      metaText=`${meta.good} bien · ${meta.bad} mal`;
      score=`<span>${meta.good}/${meta.good+meta.bad||0}</span>`;
    }else{
      metaText=`${meta.done} días hechos`;
      score=`<span>${meta.done}</span>`;
    }

    const row=document.createElement('div');
    row.className='trace-row';

    const label=document.createElement('div');
    label.className='trace-label';
    label.innerHTML=`
      <img class="trace-icon" src="${t.icon}" alt="">
      <div class="trace-namewrap">
        <div class="trace-name">${t.label}</div>
        <div class="trace-meta">${metaText}</div>
      </div>
      <div class="trace-score">${score}</div>
    `;

    const track=document.createElement('div');
    track.className='trace-track';
    traceGuides(track,false);
    if(t.kind==='avoid')addAvoidMarks(track,t);
    else if(t.kind==='food')addFoodMarks(track,t);
    else addPositiveMarks(track,t);
    addTraceHits(track,t);

    row.append(label,track);
    traceRows.append(row);
  });
}

function renderTraceEditor(){
  traceEditorActions.innerHTML='';
  if(!traceSelected.trackerId||!traceSelected.date){
    traceEditor.hidden=true;
    return;
  }

  const t=traceTracker(traceSelected.trackerId);
  const current=traceStatus(t.id,traceSelected.date);
  traceEditorTitle.textContent=`${t.label} · ${thuman(traceSelected.date)}`;
  traceEditorState.textContent=current==='unknown'?'Sin registro':`Estado: ${current}`;
  traceEditor.hidden=false;

  const add=(label,status,primary=false)=>{
    const b=document.createElement('button');
    b.type='button';
    b.textContent=label;
    if(primary)b.className='primary';
    b.onclick=()=>{
      traceSet(t.id,traceSelected.date,status);
      renderTraceRows();
      renderTraceEditor();
    };
    traceEditorActions.append(b);
  };

  if(t.kind==='avoid'){
    add('BIEN','clear');
    add('GANAS','crave');
    add('CAÍ','lapse',true);
    add('BORRAR','unknown');
  }else if(t.kind==='food'){
    add('BIEN','good');
    add('MAL','bad',true);
    add('BORRAR','unknown');
  }else{
    add('HECHO','done',true);
    add('BORRAR','unknown');
  }
}

tracePrev.onclick=()=>{
  traceOffset++;
  traceSelected={trackerId:null,date:null};
  renderTraceAxis();
  renderTraceRows();
  renderTraceEditor();
};
traceNext.onclick=()=>{
  if(traceOffset===0)return;
  traceOffset--;
  traceSelected={trackerId:null,date:null};
  renderTraceAxis();
  renderTraceRows();
  renderTraceEditor();
};

renderTraceAxis();
renderTraceRows();
renderTraceEditor();
