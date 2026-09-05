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
const TRACE_COUNT=30;

const TRACE_TRACKERS=[
  {id:'youtube',label:'YouTube',group:'Caídas',kind:'avoid',icon:TICON.youtube},
  {id:'weed',label:'Marihuana',group:'Caídas',kind:'avoid',icon:TICON.weed},
  {id:'smoking',label:'Cigarrillos',group:'Caídas',kind:'avoid',icon:TICON.cigarette},
  {id:'food',label:'Comida',group:'Cuerpo',kind:'food',icon:TICON.carrot,alt:TICON.pizza},
  {id:'study',label:'Estudio',group:'Foco',kind:'positive',icon:TICON.books},
  {id:'news',label:'Noticias',group:'Foco',kind:'positive',icon:TICON.news}
];

const TRACE_KEY='prometeo-preview-habit-traces-v2';
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

  for(let o=-29;o<=0;o++)put('youtube',o,'clear');
  put('youtube',-18,'lapse');
  put('youtube',-7,'crave');

  for(let o=-29;o<=0;o++)put('weed',o,'clear');
  put('weed',-12,'lapse');
  put('weed',-4,'crave');

  for(let o=-29;o<=0;o++)put('smoking',o,'clear');
  put('smoking',-20,'lapse');
  put('smoking',-9,'crave');
  put('smoking',-3,'lapse');

  [[-28,'good'],[-27,'good'],[-25,'bad'],[-23,'good'],[-22,'good'],[-19,'good'],[-17,'bad'],[-15,'good'],[-13,'good'],[-10,'good'],[-8,'bad'],[-6,'good'],[-4,'good'],[-2,'good'],[0,'good']]
    .forEach(([o,v])=>put('food',o,v));

  [-27,-23,-21,-17,-14,-10,-8,-5,-2,0].forEach(o=>put('study',o,'done'));
  [-25,-20,-16,-12,-7,-3].forEach(o=>put('news',o,'done'));
  return s;
}

let traceState;
try{traceState=JSON.parse(localStorage.getItem(TRACE_KEY)||'null')||traceSeed()}catch{traceState=traceSeed()}
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
  if(status==='unknown') delete traceState[id][date];
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
  const right=`${b.getDate()} ${TM[b.getMonth()].slice(0,3)}`;
  return `${left} — ${right}`;
}

function traceGuides(host,labels=false){
  const slots=traceOffset===0?[1,8,15,22]:[1,8,15,22,30];
  slots.forEach(i=>{
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
      label.textContent=`${d.getDate()} ${TM[d.getMonth()].slice(0,3)}`;
      host.append(label);
    }
  });

  if(traceOffset===0){
    const line=document.createElement('i');
    line.className='trace-today';
    line.style.left='100%';
    host.append(line);
    if(labels){
      const tag=document.createElement('span');
      tag.className='trace-today-tag';
      tag.style.left='100%';
      tag.textContent='HOY';
      host.append(tag);
    }
  }
}

function renderTraceAxis(){
  traceMonth.textContent=traceRangeLabel();
  traceNext.disabled=traceOffset===0;
  traceAxis.innerHTML='';
  traceGuides(traceAxis,true);
}

function traceGroup(name,icon){
  const row=document.createElement('div');
  row.className='trace-group';
  row.innerHTML=`<div class="trace-group-label"><img src="${icon}" alt=""><span>${name}</span></div><div class="trace-group-field"></div>`;
  return row;
}

function addAvoidMarks(track,t){
  let runStart=null;

  const closeRun=end=>{
    if(runStart===null||end<runStart)return;
    const seg=document.createElement('i');
    seg.className='trace-good';
    seg.style.left=tleft(runStart)+'%';
    seg.style.width=((end-runStart+1)/TRACE_COUNT*100)+'%';
    track.append(seg);
    runStart=null;
  };

  for(let i=1;i<=TRACE_COUNT;i++){
    const s=traceStatus(t.id,traceDateAt(i));
    if(s==='clear'||s==='crave'){
      if(runStart===null)runStart=i;
    }else closeRun(i-1);

    if(s==='crave'){
      const dot=document.createElement('i');
      dot.className='trace-crave';
      dot.style.left=tcenter(i)+'%';
      track.append(dot);
    }

    if(s==='lapse'){
      const lapse=document.createElement('i');
      lapse.className='trace-lapse';
      lapse.style.left=tleft(i)+'%';
      lapse.style.width=twidth()+'%';
      lapse.innerHTML=`<img src="${t.icon}" alt="">`;
      track.append(lapse);
    }
  }
  closeRun(TRACE_COUNT);
}

function addFoodMarks(track,t){
  for(let i=1;i<=TRACE_COUNT;i++){
    const s=traceStatus(t.id,traceDateAt(i));
    if(s==='good'||s==='bad'){
      const mark=document.createElement('i');
      mark.className=s==='good'?'trace-food-good':'trace-food-bad';
      mark.style.left=tleft(i)+'%';
      mark.style.width=twidth()+'%';
      if(s==='bad')mark.innerHTML=`<img src="${t.alt}" alt="">`;
      track.append(mark);
    }
  }
}

function addPositiveMarks(track,t){
  for(let i=1;i<=TRACE_COUNT;i++){
    if(traceStatus(t.id,traceDateAt(i))==='done'){
      const mark=document.createElement('i');
      mark.className='trace-done';
      mark.style.left=tleft(i)+'%';
      mark.style.width=twidth()+'%';
      track.append(mark);
    }
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
      const groupIcon=t.group==='Caídas'?TICON.fall:t.group==='Cuerpo'?TICON.carrot:TICON.books;
      traceRows.append(traceGroup(t.group,groupIcon));
      lastGroup=t.group;
    }

    const meta=traceWindowMeta(t);
    let metaText='',score='';
    if(t.kind==='avoid'){
      metaText=`${meta.lapse} caídas · ${meta.crave} ganas`;
      score=`<img src="${TICON.fire}" alt=""><span>${traceCurrentStreak(t)}</span>`;
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
