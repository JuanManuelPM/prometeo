const ICONS={fire:'./icons/fire.svg',carrot:'./icons/carrot.svg',pizza:'./icons/pizza.svg',youtube:'./icons/youtube.svg',books:'./icons/books.svg',news:'./icons/news.svg',weed:'./icons/weed.svg',cigarette:'./icons/cigarette.svg',fall:'./icons/fall.svg'};
const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAY_SHORT=['L','M','X','J','V','S','D'];
const DAY_LONG=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const fmt=n=>String(n).padStart(2,'0');
const money=n=>'$'+Math.round(n/1000)+'k';
function iso(d){return `${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())}`}
function fromISO(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function mondayIndex(day){return (day+6)%7}
function minLabel(m){return `${fmt(Math.floor(m/60))}:${fmt(m%60)}`}
function monthSpan(cursor){const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),last=new Date(cursor.getFullYear(),cursor.getMonth()+1,0),start=addDays(first,-mondayIndex(first.getDay())),end=addDays(last,6-mondayIndex(last.getDay())),out=[];for(let d=new Date(start);d<=end;d=addDays(d,1))out.push(d);return out}
function sameMonth(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()}

const UP=[
{day:0,title:'Modelos y Teorías 3',start:510,duration:210,room:'MB 1259 PB-01'},
{day:1,title:'Psicología Social',start:510,duration:210,room:'MB 1259 01-11'},
{day:2,title:'Estadística Aplicada',start:510,duration:180,room:'MB 1302 PB-B4'},
{day:3,title:'Modelos y Teorías 2',start:510,duration:210,room:'MB 1259 01-06'},
{day:4,title:'Psicología Evolutiva 1',start:510,duration:210,room:'MB 1259 01-10'}
];
const LESSONS=[
{id:'sandy',day:0,title:'Sandy',start:1080,duration:60,art:'books'},
{id:'jose',day:2,title:'José',start:1080,duration:60,art:'books'},
{id:'thu',day:3,title:'Clase fija',start:1080,duration:60,art:'books'},
{id:'repl',date:'2026-09-10',title:'Biology IGCSE',start:1050,duration:60,art:'news'}
];
const PERSONAL=[{date:'2026-09-08',title:'Gimnasio',start:1140,duration:60}];
const BOCA=[{date:'2026-09-13',title:'Boca',start:990,duration:120}];

function eventsForDate(date){
 const d=fromISO(date),day=mondayIndex(d.getDay()),out=[];
 if(d>=new Date(2026,7,3)&&d<=new Date(2026,10,27)) UP.filter(x=>x.day===day).forEach(x=>out.push({...x,kind:'up'}));
 LESSONS.filter(x=>x.date===date||(!x.date&&x.day===day)).forEach(x=>out.push({...x,kind:'lesson'}));
 PERSONAL.filter(x=>x.date===date).forEach(x=>out.push({...x,kind:'personal'}));
 BOCA.filter(x=>x.date===date).forEach(x=>out.push({...x,kind:'boca'}));
 return out.sort((a,b)=>a.start-b.start);
}

let weekStart=new Date(2026,8,7);
let calendarView='week';
function renderCalendar(){
 const dates=Array.from({length:7},(_,i)=>addDays(weekStart,i));
 weekLabel.textContent=`${dates[0].getDate()} ${MONTHS[dates[0].getMonth()]} — ${dates[6].getDate()} ${MONTHS[dates[6].getMonth()]}`;
 weekView.hidden=calendarView!=='week';calendarMonthView.hidden=calendarView!=='month';agendaView.hidden=calendarView!=='agenda';
 if(calendarView==='week')renderWeek(dates);else if(calendarView==='month')renderCalendarMonth();else renderAgenda(dates);
}
function renderWeek(dates){
 const host=weekView;host.innerHTML='';const grid=document.createElement('div');grid.className='week-grid';
 grid.append(Object.assign(document.createElement('div'),{className:'week-head corner'}));
 dates.forEach((d,i)=>{const h=document.createElement('div');h.className='week-head';h.innerHTML=`<div class="day-short">${DAY_SHORT[i]}</div><div class="day-num">${d.getDate()}</div><div class="day-mon">${MONTHS[d.getMonth()].slice(0,3)}</div>`;grid.append(h)});
 [510,540,570,600,630,660,690].forEach(t=>addTimeRow(grid,dates,t));
 const freeL=document.createElement('div');freeL.className='free-label';grid.append(freeL);
 const free=document.createElement('div');free.className='free-span';free.textContent='TIEMPO LIBRE';grid.append(free);
 [990,1020,1050,1080,1110,1140].forEach(t=>addTimeRow(grid,dates,t));host.append(grid);
}
function addTimeRow(grid,dates,t){
 const tc=document.createElement('div');tc.className='time-cell';tc.textContent=minLabel(t);grid.append(tc);
 dates.forEach(d=>{const date=iso(d),slot=document.createElement('div');slot.className='slot';const event=eventsForDate(date).find(e=>t>=e.start&&t<e.start+e.duration);if(event&&event.start===t)slot.append(eventNode(event));grid.append(slot)});
}
function eventNode(e){
 const n=document.createElement('div');n.className='event '+e.kind;n.style.setProperty('--blocks',Math.max(1,Math.ceil(e.duration/30)));
 n.innerHTML=`<div class="event-title">${e.title}</div><div class="event-meta">${minLabel(e.start)}–${minLabel(e.start+e.duration)}${e.room?' · '+e.room:''}</div>`;
 if(e.kind==='up')n.insertAdjacentHTML('beforeend','<div class="up-brand">UP · Universidad de Palermo</div>');
 if(e.kind==='lesson'){const img=document.createElement('img');img.className='mini-art';img.src=ICONS[e.art||'books'];n.append(img)}return n;
}
function renderCalendarMonth(){
 const cursor=new Date(2026,8,1),host=calendarMonthView;host.innerHTML='<div class="weekday-row"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div>';
 const g=document.createElement('div');g.className='month-view-grid';monthSpan(cursor).forEach(d=>{const c=document.createElement('div');c.className='month-cell'+(sameMonth(d,cursor)?'':' outside');c.innerHTML=`<div class="month-num">${d.getDate()}</div>`;if(sameMonth(d,cursor)){const items=document.createElement('div');items.className='month-items';eventsForDate(iso(d)).slice(0,3).forEach(e=>{const x=document.createElement('div');x.className='month-item '+e.kind;x.textContent=e.title;items.append(x)});c.append(items)}g.append(c)});host.append(g);
}
function renderAgenda(dates){
 const host=agendaView;host.innerHTML='';dates.forEach((d,i)=>{const es=eventsForDate(iso(d));const day=document.createElement('section');day.className='agenda-day';day.innerHTML=`<div class="agenda-head"><span>${DAY_LONG[i]} ${d.getDate()}</span><span>${es.length?es.length+' actividades':'libre'}</span></div>`;const items=document.createElement('div');items.className='agenda-items';es.forEach(e=>{const r=document.createElement('div');r.className='agenda-row';r.innerHTML=`<div class="agenda-time">${minLabel(e.start)}</div><div class="agenda-card ${e.kind}">${e.title}</div>`;items.append(r)});day.append(items);host.append(day)});
}

document.querySelector('.workspace-tabs').onclick=e=>{const b=e.target.closest('button[data-space]');if(!b)return;document.querySelectorAll('.workspace-tabs button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.space').forEach(s=>{const active=s.id===b.dataset.space+'Space';s.hidden=!active;s.classList.toggle('active',active)})};
calendarViews.onclick=e=>{const b=e.target.closest('button[data-view]');if(!b)return;calendarView=b.dataset.view;calendarViews.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderCalendar()};
weekPrev.onclick=()=>{weekStart=addDays(weekStart,-7);renderCalendar()};weekNext.onclick=()=>{weekStart=addDays(weekStart,7);renderCalendar()};

const TRACKERS=[
{id:'youtube',label:'YouTube',family:'Caídas',kind:'avoid',icon:ICONS.youtube},
{id:'weed',label:'Marihuana',family:'Caídas',kind:'avoid',icon:ICONS.weed},
{id:'smoking',label:'Cigarrillos',family:'Caídas',kind:'avoid',icon:ICONS.cigarette},
{id:'food',label:'Comida',family:'Comida',kind:'food',icon:ICONS.carrot,alt:ICONS.pizza},
{id:'study',label:'Estudio',family:'Foco',kind:'positive',icon:ICONS.books},
{id:'news',label:'Noticias',family:'Foco',kind:'positive',icon:ICONS.news}
];
const HKEY='prometeo-preview-workspace-v4-habits';
function seedHabits(){
 const s={};TRACKERS.forEach(t=>s[t.id]={});const today=new Date();const set=(id,off,v)=>s[id][iso(addDays(today,off))]=v;
 [-15,-14,-13,-11,-10,-9,-8,-7,-5,-4].forEach(o=>set('youtube',o,'clear'));set('youtube',-12,'lapse');set('youtube',-6,'crave');set('youtube',-2,'lapse');
 [-14,-13,-12,-10,-9,-8].forEach(o=>set('weed',o,'clear'));set('weed',-11,'lapse');set('weed',-3,'clear');
 set('smoking',-15,'lapse');[-12,-11,-10,-9].forEach(o=>set('smoking',o,'clear'));set('smoking',-8,'crave');set('smoking',-1,'lapse');
 set('food',-13,'good');set('food',-12,'good');set('food',-11,'bad');set('food',-9,'good');set('food',-6,'bad');set('food',-3,'good');
 [-13,-9,-7,-3].forEach(o=>set('study',o,'done'));[-10,-8,-5].forEach(o=>set('news',o,'done'));return s;
}
let hstate;try{hstate=JSON.parse(localStorage.getItem(HKEY)||'null')||seedHabits()}catch{hstate=seedHabits()}
let selectedTracker='youtube',habitMonth=new Date(2026,8,1),selectedHabitDate=null;
const saveHabits=()=>localStorage.setItem(HKEY,JSON.stringify(hstate));const tracker=()=>TRACKERS.find(t=>t.id===selectedTracker);
function hstatus(id,date){return hstate[id]?.[date]||'unknown'}
function setHstatus(date,status){if(status==='unknown')delete hstate[selectedTracker][date];else hstate[selectedTracker][date]=status;saveHabits();renderHabits()}
function hMonthDates(){const last=new Date(habitMonth.getFullYear(),habitMonth.getMonth()+1,0),out=[];for(let d=new Date(habitMonth.getFullYear(),habitMonth.getMonth(),1);d<=last;d=addDays(d,1))out.push(iso(d));return out}
function habitSummary(){const t=tracker(),s={good:0,bad:0,crave:0,unknown:0,done:0};hMonthDates().forEach(d=>{const v=hstatus(t.id,d);if(t.kind==='avoid'){if(v==='clear')s.good++;else if(v==='lapse')s.bad++;else if(v==='crave')s.crave++;else s.unknown++}else if(t.kind==='food'){if(v==='good')s.good++;else if(v==='bad')s.bad++;else s.unknown++}else{if(v==='done')s.done++;else s.unknown++}});return s}
function streak(){const t=tracker();if(t.kind!=='avoid')return habitSummary().done||habitSummary().good;let n=0;for(let i=0;i<90;i++){const s=hstatus(t.id,iso(addDays(new Date(),-i)));if(s==='clear')n++;else break}return n}
function renderHabits(){
 habitRail.innerHTML='';TRACKERS.forEach(t=>{const b=document.createElement('button');b.className='habit-choice'+(t.id===selectedTracker?' active':'');b.title=t.label;b.innerHTML=`<img src="${t.icon}" alt="${t.label}">`;b.onclick=()=>{selectedTracker=t.id;selectedHabitDate=null;renderHabits()};habitRail.append(b)});
 const t=tracker(),sum=habitSummary();habitFamily.textContent=t.family;habitTitle.textContent=t.label;fireIcon.src=ICONS.fire;fallIcon.src=ICONS.fall;habitStreak.textContent=t.kind==='avoid'?`${streak()} d`:t.kind==='positive'?`${sum.done} hechos`:`${sum.good} bien`;habitFalls.textContent=t.kind==='avoid'?`${sum.bad} caídas`:t.kind==='food'?`${sum.bad} mal`:`${sum.unknown} sin marcar`;habitMonthLabel.textContent=`${MONTHS[habitMonth.getMonth()]} ${habitMonth.getFullYear()}`;renderHabitTray();renderHabitGrid();renderHabitFooter();
}
function renderHabitTray(){
 if(!selectedHabitDate){habitActionTray.hidden=true;return}habitActionTray.hidden=false;const t=tracker();habitActionTray.innerHTML=`<span class="tray-date">${fromISO(selectedHabitDate).getDate()} ${MONTHS[fromISO(selectedHabitDate).getMonth()]}</span><div class="tray-buttons"></div>`;const host=habitActionTray.querySelector('.tray-buttons');const add=(label,status,primary=false)=>{const b=document.createElement('button');b.textContent=label;if(primary)b.className='primary';b.onclick=()=>setHstatus(selectedHabitDate,status);host.append(b)};if(t.kind==='avoid'){add('BIEN','clear');add('GANAS','crave');add('CAÍ','lapse',true);add('BORRAR','unknown')}else if(t.kind==='food'){add('BIEN','good');add('PIZZA','bad',true);add('BORRAR','unknown')}else{add('HECHO','done',true);add('BORRAR','unknown')}
}
function renderHabitGrid(){
 habitGrid.innerHTML='';const t=tracker();monthSpan(habitMonth).forEach(d=>{const date=iso(d),inside=sameMonth(d,habitMonth),s=hstatus(t.id,date);const c=document.createElement('div');c.className='habit-cell'+(inside?'':' outside')+(selectedHabitDate===date?' selected':'')+(inside&&s!=='unknown'?' '+s:'');c.innerHTML=`<div class="habit-day">${d.getDate()}</div><div class="habit-mark"></div>`;if(inside){const mark=c.querySelector('.habit-mark');if((t.kind==='avoid'&&s==='lapse')||(t.kind==='positive'&&s==='done')||(t.kind==='food'&&(s==='good'||s==='bad'))){const img=s==='bad'?t.alt:t.icon;mark.innerHTML=`<div class="habit-card"><img src="${img}" alt=""></div>`}c.onclick=()=>{selectedHabitDate=date;renderHabits()}}habitGrid.append(c)})
}
function renderHabitFooter(){const t=tracker(),s=habitSummary();if(t.kind==='avoid')habitFooter.innerHTML=`<span><b>${streak()}</b> racha</span><span><b>${s.bad}</b> caídas</span><span><b>${s.crave}</b> ganas</span><span><b>${s.unknown}</b> sin dato</span>`;else if(t.kind==='food')habitFooter.innerHTML=`<span><b>${s.good}</b> bien</span><span><b>${s.bad}</b> pizza</span><span><b>${s.unknown}</b> sin dato</span>`;else habitFooter.innerHTML=`<span><b>${s.done}</b> hechos</span><span><b>${s.unknown}</b> sin marcar</span>`}
habitPrev.onclick=()=>{habitMonth=new Date(habitMonth.getFullYear(),habitMonth.getMonth()-1,1);selectedHabitDate=null;renderHabits()};habitNext.onclick=()=>{habitMonth=new Date(habitMonth.getFullYear(),habitMonth.getMonth()+1,1);selectedHabitDate=null;renderHabits()};

const MONEY=[{month:'AGO',total:720000,confirmed:720000,potential:0,expenses:455000},{month:'SEP',total:850000,confirmed:800000,potential:50000,expenses:455000},{month:'OCT',total:950000,confirmed:850000,potential:100000,expenses:455000},{month:'NOV',total:900000,confirmed:900000,potential:0,expenses:470000}];
let moneyIndex=1;
function renderMoney(){moneyMonths.innerHTML='';MONEY.forEach((m,i)=>{const b=document.createElement('button');b.className='money-card'+(i===moneyIndex?' active':'');b.innerHTML=`<small>${m.month} 2026</small><strong>${money(m.total-m.expenses)}</strong><span>te quedaría</span>`;b.onclick=()=>{moneyIndex=i;renderMoney()};moneyMonths.append(b)});const m=MONEY[moneyIndex],net=m.total-m.expenses,safe=m.confirmed-m.expenses;moneyMonthTitle.textContent=m.month+' 2026 · después de gastos';moneyNet.textContent=money(net);moneySafe.textContent=money(safe);moneyPotential.textContent=money(net);const max=Math.max(m.total,m.expenses,net);moneyFlow.innerHTML=`<div class="flow-row"><div class="flow-label">Entra</div><div class="flow-track"><div class="flow-fill" style="width:${m.total/max*100}%"></div></div><div class="flow-value">${money(m.total)}</div></div><div class="flow-row"><div class="flow-label">Sale</div><div class="flow-track"><div class="flow-fill hatch" style="width:${m.expenses/max*100}%"></div></div><div class="flow-value">−${money(m.expenses)}</div></div><div class="flow-row"><div class="flow-label">Queda</div><div class="flow-track"><div class="flow-fill" style="width:${Math.max(0,net)/max*100}%"></div></div><div class="flow-value">${money(net)}</div></div>`;moneyDetails.innerHTML=`<div class="money-detail"><div class="money-line"><span>Piso fijo</span><b>${money(650000)}</b></div><div class="money-line"><span>Extras</span><b>${money(Math.max(0,m.confirmed-650000))}</b></div><div class="money-line"><span>Potencial</span><b>${money(m.potential)}</b></div></div><div class="money-detail"><div class="money-line"><span>Vivienda · demo</span><b>−$180k</b></div><div class="money-line"><span>Comida · demo</span><b>−$140k</b></div><div class="money-line"><span>Cigarrillos · demo</span><b>−$60k</b></div><div class="money-line"><span>Servicios + transporte · demo</span><b>−$75k</b></div></div>`}
moneyDetailsButton.onclick=()=>{moneyDetails.hidden=!moneyDetails.hidden;moneyDetailsButton.textContent=moneyDetails.hidden?'DETALLE':'OCULTAR DETALLE'};
renderCalendar();renderHabits();renderMoney();