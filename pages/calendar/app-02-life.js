function classNode(c){
  const box=document.createElement("div");box.className="event class";box.style.setProperty("--blocks",String(Math.max(1,c.duration*2)));
  const main=document.createElement("div");main.className="event-main";
  const title=document.createElement("div");title.className="event-title";title.textContent=c.name;
  const meta=document.createElement("div");meta.className="event-meta";meta.textContent=`${typeLabel(c.type)} · ${hourText(c.duration)} · ${compactMoney(c.rate)}/h`;
  main.append(title,meta);
  const del=document.createElement("button");del.className="remove";del.type="button";del.textContent="×";del.onclick=e=>{e.stopPropagation();classes=classes.filter(x=>x.id!==c.id);saveClasses();render()};
  box.append(main,del);return box;
}
function bocaNode(g){
  const box=document.createElement("div");box.className="event boca";box.style.setProperty("--blocks",String(Math.max(1,g.duration*2)));
  const main=document.createElement("div");main.className="event-main";
  const title=document.createElement("div");title.className="event-title";title.textContent=g.home?`Boca vs. ${g.rival}`:`${g.rival} vs. Boca`;
  const meta=document.createElement("div");meta.className="event-meta";meta.textContent=`${minutesLabel(g.start)} · ${g.competition}`;
  main.append(title,meta);box.append(main);return box;
}
function personalNode(e){
  const box=document.createElement("div");box.className="event personal";box.style.setProperty("--blocks",String(Math.max(1,e.duration*2)));
  const main=document.createElement("div");main.className="event-main";
  const title=document.createElement("div");title.className="event-title";title.textContent=e.title;
  const meta=document.createElement("div");meta.className="event-meta";meta.textContent=`Personal · ${minutesLabel(e.start)}–${minutesLabel(e.start+e.duration*60)}`;main.append(title,meta);
  const del=document.createElement("button");del.className="remove";del.type="button";del.textContent="×";del.onclick=ev=>{ev.stopPropagation();personalEvents=personalEvents.filter(x=>x.id!==e.id);saveLife();render()};
  box.append(main,del);return box;
}
function mobilePersonalNode(e){const box=personalNode(e);box.classList.add("mobile-event");return box}
function taskRow(t){
  const row=document.createElement("div");row.className="task-row"+(t.done?" done":"");
  const check=document.createElement("button");check.className="button3d task-check";check.type="button";check.textContent=t.done?"✓":"□";check.onclick=()=>{t.done=!t.done;saveLife();render()};
  const text=document.createElement("div"),main=document.createElement("div");main.className="task-text";main.textContent=t.text;
  const meta=document.createElement("div");meta.className="task-meta";meta.textContent=t.date?formatTaskDate(t.date):"Algún día";text.append(main,meta);
  const del=document.createElement("button");del.className="button3d task-delete";del.type="button";del.textContent="×";del.onclick=()=>{lifeTasks=lifeTasks.filter(x=>x.id!==t.id);saveLife();render()};
  row.append(check,text,del);return row;
}
function formatTaskDate(dateISO){const d=parseISO(dateISO);return `${DAY_SHORT[(d.getDay()+6)%7]} ${d.getDate()} ${MONTHS[d.getMonth()]}`}
function mondayISOFor(dateISO){const d=parseISO(dateISO),weekday=(d.getDay()+6)%7;return isoDate(addDays(d,-weekday))}
function habitDoneDate(habitId,dateISO){return !!((habitLog[dateISO]||[]).includes(habitId))}
function habitCountWeek(habitId,dateISO){const monday=parseISO(mondayISOFor(dateISO));let count=0;for(let i=0;i<7;i++){const dayISO=isoDate(addDays(monday,i));if(habitDoneDate(habitId,dayISO))count++}return count}
function toggleHabit(habitId,dateISO){const arr=habitLog[dateISO]||[],i=arr.indexOf(habitId);if(i>=0)arr.splice(i,1);else arr.push(habitId);habitLog[dateISO]=arr;saveLife();render()}
function habitCard(h,dateISO){
  const count=habitCountWeek(h.id,dateISO),doneToday=habitDoneDate(h.id,dateISO),card=document.createElement("div");card.className="habit-card";
  const left=document.createElement("div"),name=document.createElement("div");name.className="habit-name";name.textContent=h.name;
  const progress=document.createElement("div");progress.className="habit-progress";const dots=document.createElement("div");dots.className="habit-dots";
  for(let i=0;i<h.target;i++){const dot=document.createElement("span");dot.className="habit-dot"+(i<count?" filled":"");dots.appendChild(dot)}
  const txt=document.createElement("span");txt.textContent=`${count}/${h.target} esta semana`;progress.append(dots,txt);left.append(name,progress);
  const done=document.createElement("button");done.className="button3d habit-done";done.type="button";done.textContent=doneToday?"DESHACER":"HECHO";done.onclick=()=>toggleHabit(h.id,dateISO);card.append(left,done);return card;
}
function mealForDate(dateISO){if(!foodState.library.length)return "Agregar una comida simple";let hash=0;for(const ch of dateISO)hash=(hash*31+ch.charCodeAt(0))>>>0;const off=foodState.offsets[dateISO]||0;return foodState.library[(hash+off)%foodState.library.length]}
function foodCard(dateISO){
  const meal=mealForDate(dateISO),eaten=foodState.eaten[dateISO]===meal,card=document.createElement("div");card.className="food-card";card.innerHTML=`<div><div class="food-kicker">HOY COMÉ ESTO</div><div class="food-meal${eaten?" eaten":""}"></div></div>`;card.querySelector(".food-meal").textContent=meal;
  const actions=document.createElement("div");actions.className="food-actions";
  const eat=document.createElement("button");eat.className="button3d";eat.type="button";eat.textContent=eaten?"HECHO ✓":"COMER ESTO";eat.onclick=()=>{if(eaten)delete foodState.eaten[dateISO];else foodState.eaten[dateISO]=meal;saveLife();render()};
  const other=document.createElement("button");other.className="button3d";other.type="button";other.textContent="OTRA";other.onclick=()=>{foodState.offsets[dateISO]=(foodState.offsets[dateISO]||0)+1;delete foodState.eaten[dateISO];saveLife();render()};
  const missing=document.createElement("button");missing.className="button3d";missing.type="button";missing.textContent="ME FALTA ALGO";missing.onclick=()=>{const item=prompt("¿Qué te falta?");if(!item||!item.trim())return;shopping.push({id:"shop-"+Date.now(),text:item.trim(),done:false});saveLife();renderShopping();updateShoppingButton()};
  actions.append(eat,other,missing);card.appendChild(actions);return card;
}
function renderDailyLifeMobile(day,dateISO){
  const life=document.createElement("div");life.className="mobile-life";const label=document.createElement("div");label.className="mobile-life-label";label.textContent="HOY";life.appendChild(label);
  if(habits.length)habits.forEach(h=>life.appendChild(habitCard(h,dateISO)));else{const empty=document.createElement("div");empty.className="empty-life";empty.textContent="Sin hábitos todavía · usá + para agregar uno";life.appendChild(empty)}
  life.appendChild(foodCard(dateISO));day.appendChild(life);
}
function renderLifeDesktop(){
  const today=isoDate(new Date()),taskHost=document.getElementById("desktopTodayTasks"),habitHost=document.getElementById("desktopHabits"),foodHost=document.getElementById("desktopFood");if(!taskHost)return;
  taskHost.innerHTML="";habitHost.innerHTML="";foodHost.innerHTML="";const tasks=tasksForDate(today);desktopTodaySummary.textContent=tasks.length?`${tasks.filter(t=>!t.done).length} pendientes`:"sin pendientes";
  if(tasks.length)tasks.forEach(t=>taskHost.appendChild(taskRow(t)));else taskHost.innerHTML='<div class="empty-life">Nada pendiente para hoy.</div>';
  if(habits.length)habits.forEach(h=>habitHost.appendChild(habitCard(h,today)));else habitHost.innerHTML='<div class="empty-life">Sin hábitos todavía.</div>';foodHost.appendChild(foodCard(today));
}
function renderLater(){
  const host=document.getElementById("laterBody"),today=isoDate(new Date());const future=lifeTasks.filter(t=>!t.done&&(!t.date||t.date>today)).sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999"));laterCount.textContent=`${future.length} →`;host.innerHTML="";
  if(!future.length){host.innerHTML='<div class="empty-life">No hay nada esperando más adelante.</div>';return}future.slice(0,12).forEach(t=>host.appendChild(taskRow(t)));
}
function renderShopping(){
  const host=document.getElementById("shoppingList");if(!host)return;host.innerHTML="";if(!shopping.length){host.innerHTML='<div class="empty-life">Lista vacía.</div>';return}
  shopping.forEach(item=>{const row=document.createElement("div");row.className="shopping-row"+(item.done?" done":"");const check=document.createElement("button");check.className="button3d task-check";check.type="button";check.textContent=item.done?"✓":"□";check.onclick=()=>{item.done=!item.done;saveLife();renderShopping();updateShoppingButton()};const text=document.createElement("div");text.className="shopping-text";text.textContent=item.text;const del=document.createElement("button");del.className="button3d task-delete";del.type="button";del.textContent="×";del.onclick=()=>{shopping=shopping.filter(x=>x.id!==item.id);saveLife();renderShopping();updateShoppingButton()};row.append(check,text,del);host.appendChild(row)});
}
function updateShoppingButton(){const pending=shopping.filter(x=>!x.done).length;if(window.shoppingButton)shoppingButton.textContent=`Compras · ${pending}`}
function mobileClassNode(c){const box=classNode(c);box.classList.add("mobile-event");return box}
function mobileBocaNode(g){const box=bocaNode(g);box.classList.add("mobile-event");return box}
function mobilePotentialNode(o){const box=potentialNode(o);box.classList.add("mobile-event");return box}
function mobileUniversityNode(u){const box=universityNode(u);box.classList.add("mobile-event");return box}
