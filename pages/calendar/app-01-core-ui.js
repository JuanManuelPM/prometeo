const DAY_NAMES=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const DAY_SHORT=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const MONTHS=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const BASE_START=13*60;
const BASE_END=20*60;
const PALETTES=[
  {id:"bordo-crema",name:"Bordó / Crema",a:"#F5DABF",b:"#6C151E"},
  {id:"verde-crema",name:"Verde / Crema",a:"#F5DABF",b:"#0F3D3A"},
  {id:"bordo-verde",name:"Bordó / Verde",a:"#6C151E",b:"#0F3D3A"}
];
const BOCA_GAMES=window.PrometeoCalendarSources?.bocaGames||[];
const INITIAL_STATE=window.PrometeoCalendarState.read();
let UNIVERSITY_SCHEDULE=INITIAL_STATE.calendar.university||[];
let OPPORTUNITIES=INITIAL_STATE.calendar.opportunities||[];
const STORAGE="dated-calendar-classes-v8";
const RATE_KEY="dated-calendar-rate-v8";
const PALETTE_KEY="horarios-fijos-paleta-v4";
const HISTORY_KEY="dated-calendar-income-history-v10";
const TASK_KEY="prometeo-life-tasks-v18";
const PERSONAL_EVENT_KEY="prometeo-life-events-v18";
const HABIT_KEY="prometeo-life-habits-v18";
const HABIT_LOG_KEY="prometeo-life-habit-log-v18";
const FOOD_KEY="prometeo-life-food-v18";
const SHOP_KEY="prometeo-life-shopping-v18";
function loadJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
let lifeTasks=loadJSON(TASK_KEY,[]);
let personalEvents=loadJSON(PERSONAL_EVENT_KEY,[]);
let habits=loadJSON(HABIT_KEY,[]);
let habitLog=loadJSON(HABIT_LOG_KEY,{});
let shopping=loadJSON(SHOP_KEY,[]);
let foodState=loadJSON(FOOD_KEY,{library:[],offsets:{},eaten:{}});
function saveLife(){
  localStorage.setItem(TASK_KEY,JSON.stringify(lifeTasks));
  localStorage.setItem(PERSONAL_EVENT_KEY,JSON.stringify(personalEvents));
  localStorage.setItem(HABIT_KEY,JSON.stringify(habits));
  localStorage.setItem(HABIT_LOG_KEY,JSON.stringify(habitLog));
  localStorage.setItem(FOOD_KEY,JSON.stringify(foodState));
  localStorage.setItem(SHOP_KEY,JSON.stringify(shopping));
  window.PrometeoCalendarState.captureLegacy();
}
let defaultRate=Number(localStorage.getItem(RATE_KEY))||0;
let classes=loadClasses();
function loadClasses(){
  const saved=localStorage.getItem(STORAGE);
  if(saved){try{return JSON.parse(saved)}catch{}}
  const prior=localStorage.getItem("clases-ingresos-v6");
  if(prior){
    try{
      const old=JSON.parse(prior),migrated=[];
      Object.entries(old).forEach(([key,c])=>{
        const [weekday,start]=key.split("-").map(Number);
        migrated.push({id:c.id||("m-"+key),name:c.name||"Clase",type:c.type||"fixed",weekday,date:(c.type&&c.type!=="fixed")?dateFromWeekday(currentMonday(),weekday):null,start:Number(c.start)||start,duration:Number(c.duration)||1,rate:Number(c.rate)||defaultRate});
      });
      if(migrated.length)return migrated;
    }catch{}
  }
  return [];
}
function saveClasses(){localStorage.setItem(STORAGE,JSON.stringify(classes));window.PrometeoCalendarState.captureLegacy()}
const CAL_CORE=window.PrometeoCalendarCore;
function pad(n){return CAL_CORE.pad(n)}
function isoDate(d){return CAL_CORE.isoDate(d)}
function cloneDate(d){return CAL_CORE.cloneDate(d)}
function addDays(d,n){return CAL_CORE.addDays(d,n)}
function currentMonday(){return CAL_CORE.mondayOf(new Date())}
function dateFromWeekday(mon,weekday){return isoDate(addDays(mon,weekday))}
function parseISO(s){return CAL_CORE.parseISO(s)}
function minutesLabel(n){return `${pad(Math.floor(n/60))}:${pad(n%60)}`}
function money(n){return "$"+Math.round(n).toLocaleString("es-AR")}
function compactMoney(n){if(n>=1000000){const m=n/1e6;return "$"+m.toFixed(m>=10?1:2).replace(".",",")+" M"}if(n>=1000)return "$"+Math.round(n/1000)+"k";return money(n)}
function hourText(n){return String(n).replace(".",",")+" h"}
function typeLabel(t){return t==="fixed"?"Fija":t==="variable"?"Variable":"Esta fecha"}
let weekStart=currentMonday();
let selectedType="fixed";
let editingId=null;
let editingDate=null;
let editingStart=null;
const grid=document.getElementById("grid");
const editor=document.getElementById("editor");
const form=document.getElementById("form");
const student=document.getElementById("student");
const duration=document.getElementById("duration");
const rate=document.getElementById("rate");
const editorDate=document.getElementById("editorDate");
const deleteClass=document.getElementById("deleteClass");
const typeHelp=document.getElementById("typeHelp");
function visibleDates(){return Array.from({length:7},(_,i)=>addDays(weekStart,i))}
function classOnDate(c,dateISO){return CAL_CORE.scheduleOccursOn(c,dateISO)}
function classesForDate(dateISO){return classes.filter(c=>classOnDate(c,dateISO))}
function gamesForDate(dateISO){return BOCA_GAMES.filter(g=>g.date===dateISO)}
function personalEventsForDate(dateISO){return personalEvents.filter(e=>e.date===dateISO)}
function tasksForDate(dateISO){return lifeTasks.filter(t=>t.date===dateISO)}
function openTasksForDate(dateISO){return tasksForDate(dateISO).filter(t=>!t.done)}
function universityForDate(dateISO){return CAL_CORE.universityOnDate(UNIVERSITY_SCHEDULE,dateISO)}
function opportunitiesForDate(dateISO){return OPPORTUNITIES.filter(o=>o.date===dateISO)}
function timedOpportunitiesForDate(dateISO){return opportunitiesForDate(dateISO).filter(o=>Number.isFinite(o.start))}
function untimedOpportunitiesForDate(dateISO){return opportunitiesForDate(dateISO).filter(o=>!Number.isFinite(o.start))}
function eventAt(dateISO,t){
  const universityMatches=universityForDate(dateISO).filter(u=>t>=u.start&&t<u.start+u.duration*60);if(universityMatches.length)return {kind:"university",item:universityMatches[0]};
  const personalMatches=personalEventsForDate(dateISO).filter(e=>t>=e.start&&t<e.start+e.duration*60);if(personalMatches.length)return {kind:"personal",item:personalMatches[0]};
  const classMatches=classesForDate(dateISO).filter(c=>t>=c.start&&t<c.start+c.duration*60);if(classMatches.length)return {kind:"class",item:classMatches[0]};
  const opportunityMatches=timedOpportunitiesForDate(dateISO).filter(o=>t>=o.start&&t<o.start+o.duration*60);if(opportunityMatches.length)return {kind:"potential",item:opportunityMatches[0]};
  const gameMatches=gamesForDate(dateISO).filter(g=>t>=g.start&&t<g.start+g.duration*60);if(gameMatches.length)return {kind:"boca",item:gameMatches[0]};
  return null;
}
function rangeForWeek(){
  let start=BASE_START,end=BASE_END;
  visibleDates().forEach(d=>{
    const iso=isoDate(d);
    personalEventsForDate(iso).forEach(e=>{start=Math.min(start,e.start);end=Math.max(end,e.start+e.duration*60)});
    universityForDate(iso).forEach(u=>{start=Math.min(start,u.start);end=Math.max(end,u.start+u.duration*60)});
    classesForDate(iso).forEach(c=>{start=Math.min(start,c.start);end=Math.max(end,c.start+c.duration*60)});
    gamesForDate(iso).forEach(g=>{start=Math.min(start,g.start);end=Math.max(end,g.start+g.duration*60)});
    timedOpportunitiesForDate(iso).forEach(o=>{start=Math.min(start,o.start);end=Math.max(end,o.start+o.duration*60)});
  });
  start=Math.floor(start/30)*30;end=Math.min(24*60,Math.ceil(end/30)*30);return {start,end};
}
function conflict(dateISO,start,dur,excludeId){
  const end=start+dur*60;
  for(const c of classesForDate(dateISO)){if(c.id===excludeId)continue;const ce=c.start+c.duration*60;if(start<ce&&end>c.start)return true}
  return false;
}
function setType(type){
  selectedType=type;
  document.querySelectorAll(".type-choice").forEach(b=>b.classList.toggle("active",b.dataset.type===type));
  typeHelp.textContent=type==="fixed"?"Se repetirá automáticamente todas las semanas en este día y horario.":type==="variable"?"Queda en esta fecha. Podés moverla o borrarla sin afectar otras semanas.":"Existe sólo en esta fecha; no forma parte de tu base fija.";
}
function openEditor(dateISO,startMinute,id=null){
  editingId=id;editingDate=dateISO;editingStart=startMinute;
  const dt=parseISO(dateISO);editorDate.textContent=`${DAY_NAMES[(dt.getDay()+6)%7]} ${dt.getDate()} ${MONTHS[dt.getMonth()]} · ${minutesLabel(startMinute)}`;
  const c=id?classes.find(x=>x.id===id):null;
  student.value=c?.name||"";duration.value=String(c?.duration||1);rate.value=String(c?.rate||defaultRate);setType(c?.type||"fixed");deleteClass.classList.toggle("hidden",!c);
  editor.showModal();requestAnimationFrame(()=>student.focus());
}
