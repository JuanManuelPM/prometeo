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

const TRACE_TRACKERS=[
  {id:'youtube',label:'YouTube',group:'Caídas',kind:'avoid',icon:TICON.youtube},
  {id:'weed',label:'Marihuana',group:'Caídas',kind:'avoid',icon:TICON.weed},
  {id:'smoking',label:'Cigarrillos',group:'Caídas',kind:'avoid',icon:TICON.cigarette},
  {id:'food',label:'Comida',group:'Cuerpo',kind:'food',icon:TICON.carrot,alt:TICON.pizza},
  {id:'study',label:'Estudio',group:'Foco',kind:'positive',icon:TICON.books},
  {id:'news',label:'Noticias',group:'Foco',kind:'positive',icon:TICON.news}
];

const TRACE_KEY='prometeo-preview-habit-traces-v1';
const tfmt=n=>String(n).padStart(2,'0');
const tiso=d=>`${d.getFullYear()}-${tfmt(d.getMonth()+1)}-${tfmt(d.getDate())}`;
const tfrom=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const tadd=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const tdays=d=>new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
const tdate=(cursor,day)=>tiso(new Date(cursor.getFullYear(),cursor.getMonth(),day));
const tcenter=(day,count)=>((day-.5)/count)*100;
const tleft=(day,count)=>((day-1)/count)*100;
const twidth=(n,count)=>(n/count)*100;
const thuman=s=>{const d=tfrom(s);return `${d.getDate()} ${TM[d.getMonth()].slice(0,3)}`};

function traceSeed(){
  const s={};TRACE_TRACKERS.forEach(t=>s[t.id]={});
  const cur=new Date(2026,8,1);
  const put=(id,day,v)=>{if(day>=1&&day<=tdays(cur))s[id][tdate(cur,day)]=v};

  [1,2,3,4,5,6,7,8,9].forEach(d=>put('youtube',d,'clear'));
  put('youtube',10,'lapse');
  [11,12,13,14,15,16].forEach(d=>put('youtube',d,'clear'));
  put('youtube',17,'crave');
  [18,19,20,21].forEach(d=>put('youtube',d,'clear'));

  [1,2,3,4,5,6,7,8,9,10,11].forEach(d=>put('weed',d,'clear'));
  put('weed',12,'lapse');
  [13,14,15,16,17,18,19,20,21].forEach(d=>put('weed',d,'clear'));

  [1,2,3].forEach(d=>put('smoking',d,'clear'));
  put('smoking',4,'lapse');
  [5,6,7,8,9].forEach(d=>put('smoking',d,'clear'));
  put('smoking',10,'crave');
  [11,12,13,14].forEach(d=>put('smoking',d,'clear'));

  [[1,'good'],[2,'good'],[3,'good'],[4,'bad'],[5,'good'],[7,'good'],[8,'good'],[9,'bad'],[11,'good'],[12,'good'],[14,'good'],[15,'good'],[16,'bad'],[18,'good']]
    .forEach(([d,v])=>put('food',d,v));

  [2,5,6,9,12,13,17,20].forEach(d=>put('study',d,'done'));
  [3,8,11,15,19].forEach(d=>put('news',d,'done'));
  return s;
}

let traceState;
try{traceState=JSON.parse(localStorage.getItem(TRACE_KEY)||'null')||traceSeed()}catch{traceState=traceSeed()}
let traceCursor=new Date(2026,8,1);
let traceSelected={trackerId:null,date:null};

const traceSave=()=>localStorage.setItem(TRACE_KEY,JSON.stringify(traceState));
const traceStatus=(id,date)=>traceState[id]?.[date]||'unknown';
const traceTracker=id=>TRACE_TRACKERS.find(t=>t.id===id);

function traceSet(id,date,status){
  traceState[id]=traceState[id]||{};
  if(status==='unknown') delete traceState[id][date];
  else traceState[id][date]=status;
  traceSave();
}

function traceMonthMeta(t){
  const count=tdays(traceCursor),m={good:0,lapse:0,crave:0,done:0,bad:0,unknown:0};
  for(let day=1;day<=count;day++){
    const s=traceStatus(t.id,tdate(traceCursor,day));
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
    const d=tiso(tadd(now,-i));
    if(traceStatus(t.id,d)==='clear')n++;
    else break;
  }
  return n;
}

function traceGuides(host,count,labels=false){
  [1,8,15,22,29].filter(d=>d<=count).forEach(day=>{
    const x=tcenter(day,count);
    const guide=document.createElement('i');
    guide.className='trace-guide';
    guide.style.left=x+'%';
    host.append(guide);
    if(labels){
      const label=document.createElement('span');
      label.className='trace-tick';
      label.style.left=x+'%';
      label.textContent=day;
      host.append(label);
    }
  });

  const now=new Date();
  if(now.getFullYear()===traceCursor.getFullYear()&&now.getMonth()===traceCursor.getMonth()){
    const x=tcenter(now.getDate(),count);
    const line=document.createElement('i');
    line.className='trace-today';
    line.style.left=x+'%';
    host.append(line);
    if(labels){
      const tag=document.createElement('span');
      tag.className='trace-today-tag';
      tag.style.left=x+'%';
      tag.textContent='HOY';
      host.append(tag);
    }
  }
}

function renderTraceAxis(){
  traceMonth.textContent=`${TM[traceCursor.getMonth()]} ${traceCursor.getFullYear()}`;
  traceAxis.innerHTML='';
  traceGuides(traceAxis,tdays(traceCursor),true);
}

function traceGroup(name,icon){
  const row=document.createElement('div');
  row.className='trace-group';
  row.innerHTML=`<div class="trace-group-label"><img src="${icon}" alt=""><span>${name}</span></div><div class="trace-group-field"></div>`;
  return row;
}

function addAvoidMarks(track,t,count){
  let runStart=null;

  const closeRun=end=>{
    if(runStart===null||end<runStart)return;
    const n=end-runStart+1;
    const seg=document.createElement('i');
    seg.className='trace-good '+(n===1?'single':'start end');
    seg.style.left=tleft(runStart,count)+'%';
    seg.style.width=twidth(n,count)+'%';
    track.append(seg);
    runStart=null;
  };

  for(let day=1;day<=count;day++){
    const s=traceStatus(t.id,tdate(traceCursor,day));

    if(s==='clear'||s==='crave'){
      if(runStart===null)runStart=day;
    }else{
      closeRun(day-1);
    }

    if(s==='crave'){
      const dot=document.createElement('i');
      dot.className='trace-crave';
      dot.style.left=tcenter(day,count)+'%';
      track.append(dot);
    }

    if(s==='lapse'){
      const lapse=document.createElement('i');
      lapse.className='trace-lapse';
      lapse.style.left=tcenter(day,count)+'%';
      lapse.innerHTML=`<img src="${t.icon}" alt="">`;
      track.append(lapse);
    }
  }
  closeRun(count);
}

function addFoodMarks(track,t,count){
  for(let day=1;day<=count;day++){
    const s=traceStatus(t.id,tdate(traceCursor,day));
    if(s==='good'||s==='bad'){
      const mark=document.createElement('i');
      mark.className=s==='good'?'trace-food-good':'trace-food-bad';
      mark.style.left=tcenter(day,count)+'%';
      track.append(mark);
    }
  }
}

function addPositiveMarks(track,t,count){
  for(let day=1;day<=count;day++){
    if(traceStatus(t.id,tdate(traceCursor,day))==='done'){
      const mark=document.createElement('i');
      mark.className='trace-done';
      mark.style.left=tcenter(day,count)+'%';
      track.append(mark);
    }
  }
}

function addTraceHits(track,t,count){
  for(let day=1;day<=count;day++){
    const date=tdate(traceCursor,day);
    const hit=document.createElement('button');
    hit.type='button';
    hit.className='trace-hit';
    hit.style.left=tleft(day,count)+'%';
    hit.style.width=twidth(1,count)+'%';
    hit.setAttribute('aria-label',`${t.label} · ${thuman(date)}`);
    hit.onclick=()=>{
      traceSelected={trackerId:t.id,date};
      renderTraceRows();
      renderTraceEditor();
    };
    track.append(hit);
  }

  if(traceSelected.trackerId===t.id&&traceSelected.date){
    const d=tfrom(traceSelected.date);
    if(d.getFullYear()===traceCursor.getFullYear()&&d.getMonth()===traceCursor.getMonth()){
      const sel=document.createElement('i');
      sel.className='trace-selection';
      sel.style.left=tleft(d.getDate(),count)+'%';
      sel.style.width=twidth(1,count)+'%';
      track.append(sel);
    }
  }
}

function renderTraceRows(){
  traceRows.innerHTML='';
  const count=tdays(traceCursor);
  let lastGroup=null;

  TRACE_TRACKERS.forEach(t=>{
    if(t.group!==lastGroup){
      const groupIcon=t.group==='Caídas'?TICON.fall:t.group==='Cuerpo'?TICON.carrot:TICON.books;
      traceRows.append(traceGroup(t.group,groupIcon));
      lastGroup=t.group;
    }

    const meta=traceMonthMeta(t);
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
    traceGuides(track,count,false);
    if(t.kind==='avoid')addAvoidMarks(track,t,count);
    else if(t.kind==='food')addFoodMarks(track,t,count);
    else addPositiveMarks(track,t,count);
    addTraceHits(track,t,count);

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
  traceCursor=new Date(traceCursor.getFullYear(),traceCursor.getMonth()-1,1);
  traceSelected={trackerId:null,date:null};
  renderTraceAxis();
  renderTraceRows();
  renderTraceEditor();
};
traceNext.onclick=()=>{
  traceCursor=new Date(traceCursor.getFullYear(),traceCursor.getMonth()+1,1);
  traceSelected={trackerId:null,date:null};
  renderTraceAxis();
  renderTraceRows();
  renderTraceEditor();
};

renderTraceAxis();
renderTraceRows();
renderTraceEditor();
