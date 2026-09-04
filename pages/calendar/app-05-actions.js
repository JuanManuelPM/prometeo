function localISOToday(){return isoDate(new Date())}
function localISOTomorrow(){return isoDate(addDays(new Date(),1))}
function setQuickMode(mode){quickMode=mode;document.querySelectorAll(".quick-type").forEach(b=>b.classList.toggle("active",b.dataset.quick===mode));document.querySelectorAll(".quick-section").forEach(x=>x.classList.toggle("active",x.dataset.section===mode))}
document.querySelectorAll(".quick-type").forEach(b=>b.onclick=()=>setQuickMode(b.dataset.quick));
quickTaskWhen.onchange=()=>quickTaskDateWrap.classList.toggle("hidden",quickTaskWhen.value!=="date");
quickAddButton.onclick=()=>{
  closePopovers();setQuickMode("task");quickTaskText.value="";quickEventText.value="";quickHabitText.value="";quickFoodText.value="";quickTaskWhen.value="today";quickTaskDateWrap.classList.add("hidden");quickTaskDate.value=localISOToday();quickEventDate.value=localISOToday();quickEventTime.value="18:00";quickEventDuration.value="1";quickAddDialog.showModal();requestAnimationFrame(()=>quickTaskText.focus());
};
quickCancel.onclick=()=>quickAddDialog.close();
quickAddForm.addEventListener("submit",ev=>{
  ev.preventDefault();
  if(quickMode==="task"){const text=quickTaskText.value.trim();if(!text)return;let date=null;if(quickTaskWhen.value==="today")date=localISOToday();else if(quickTaskWhen.value==="tomorrow")date=localISOTomorrow();else if(quickTaskWhen.value==="date")date=quickTaskDate.value||localISOToday();lifeTasks.push({id:"task-"+Date.now(),text,date,done:false,createdAt:Date.now()})}
  if(quickMode==="event"){const title=quickEventText.value.trim(),date=quickEventDate.value,time=quickEventTime.value;if(!title||!date||!time)return;const [h,m]=time.split(":").map(Number);personalEvents.push({id:"pe-"+Date.now(),title,date,start:h*60+m,duration:Number(quickEventDuration.value)||1})}
  if(quickMode==="habit"){const name=quickHabitText.value.trim();if(!name)return;habits.push({id:"habit-"+Date.now(),name,target:Number(quickHabitTarget.value)||3})}
  if(quickMode==="food"){const meal=quickFoodText.value.trim();if(!meal)return;if(!foodState.library.includes(meal))foodState.library.push(meal)}
  saveLife();quickAddDialog.close();render();
});
laterToggle.onclick=()=>laterSection.classList.toggle("open");
shoppingButton.onclick=()=>{closePopovers();renderShopping();shoppingDialog.showModal()};
shoppingClose.onclick=()=>shoppingDialog.close();
shoppingAdd.onclick=()=>{const item=prompt("Agregar a compras:");if(!item||!item.trim())return;shopping.push({id:"shop-"+Date.now(),text:item.trim(),done:false});saveLife();renderShopping();updateShoppingButton()};
const calendarShell=document.getElementById("calendarShell");let swipeStartX=null,swipeStartY=null,swipeTracking=false;
calendarShell.addEventListener("pointerdown",e=>{if(window.innerWidth>760||e.pointerType==="mouse")return;swipeStartX=e.clientX;swipeStartY=e.clientY;swipeTracking=true});
calendarShell.addEventListener("pointerup",e=>{if(!swipeTracking||window.innerWidth>760)return;const dx=e.clientX-swipeStartX,dy=e.clientY-swipeStartY;swipeTracking=false;if(Math.abs(dx)<55||Math.abs(dx)<=Math.abs(dy)*1.35)return;weekStart=addDays(weekStart,dx<0?7:-7);render();window.scrollTo({top:0,behavior:"smooth"})});
calendarShell.addEventListener("pointercancel",()=>{swipeTracking=false});
function paletteIndex(){const active=localStorage.getItem(PALETTE_KEY)||PALETTES[0].id,i=PALETTES.findIndex(x=>x.id===active);if(i>=0)return i;localStorage.setItem(PALETTE_KEY,PALETTES[0].id);return 0}
function applyPalette(id){const p=PALETTES.find(x=>x.id===id)||PALETTES[0];document.documentElement.style.setProperty("--a",p.a);document.documentElement.style.setProperty("--b",p.b);localStorage.setItem(PALETTE_KEY,p.id);window.PrometeoCalendarState.captureLegacy();themeName.textContent=p.name}
function stepPalette(delta){const i=paletteIndex(),next=(i+delta+PALETTES.length)%PALETTES.length;applyPalette(PALETTES[next].id)}
const themePopover=document.getElementById("themePopover"),toolsPopover=document.getElementById("toolsPopover");
function closePopovers(){themePopover.classList.remove("open");toolsPopover.classList.remove("open")}
themeButton.onclick=e=>{e.stopPropagation();const o=!themePopover.classList.contains("open");closePopovers();if(o)themePopover.classList.add("open")};
toolsButton.onclick=e=>{e.stopPropagation();const o=!toolsPopover.classList.contains("open");closePopovers();if(o)toolsPopover.classList.add("open")};
themePopover.onclick=e=>e.stopPropagation();toolsPopover.onclick=e=>e.stopPropagation();document.addEventListener("click",closePopovers);themeClose.onclick=closePopovers;themePrev.onclick=()=>stepPalette(-1);themeNext.onclick=()=>stepPalette(1);printButton.onclick=()=>{closePopovers();window.print()};
clearButton.onclick=()=>{closePopovers();if(confirm("¿Borrar todas las clases?")){classes=[];saveClasses();render()}};
baseRateButton.onclick=()=>{closePopovers();const v=prompt("Valor base por hora:",String(defaultRate));if(v===null)return;const n=Number(String(v).replace(/\D/g,""));if(!n)return;defaultRate=n;localStorage.setItem(RATE_KEY,String(n));window.PrometeoCalendarState.captureLegacy();render()};
document.addEventListener("keydown",e=>{if(themePopover.classList.contains("open")){if(e.key==="ArrowLeft"){e.preventDefault();stepPalette(-1)}if(e.key==="ArrowRight"){e.preventDefault();stepPalette(1)}}if(e.key==="Escape")closePopovers()});
const stateExportButton=document.getElementById("stateExportButton"),stateImportButton=document.getElementById("stateImportButton"),stateImportFile=document.getElementById("stateImportFile");
stateExportButton.onclick=()=>{closePopovers();window.PrometeoCalendarState.exportDownload()};stateImportButton.onclick=()=>{closePopovers();stateImportFile.click()};stateImportFile.onchange=async()=>{const file=stateImportFile.files?.[0];if(!file)return;try{await window.PrometeoCalendarState.importFile(file)}catch{alert("No pude importar ese backup.")}};

/* En móvil no mostramos una grilla vacía de 30 minutos: proyectamos sólo lo que existe. */
renderMobileWeek=function(dates,range){
  const host=document.getElementById("mobileWeek");host.innerHTML="";const todayISO=isoDate(new Date());
  dates.forEach((d,index)=>{
    const dateISO=isoDate(d),day=document.createElement("section");day.className="mobile-day";
    const head=document.createElement("div");head.className="mobile-day-head"+(dateISO===todayISO?" today":"");
    const left=document.createElement("div");left.innerHTML=`<div class="mobile-day-name">${DAY_NAMES[index]}</div><div class="mobile-day-date">${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}</div>`;
    const summary=document.createElement("div");summary.className="mobile-day-summary";
    const numClasses=classesForDate(dateISO).length,dayTasks=openTasksForDate(dateISO).length,uniEvents=universityForDate(dateISO).length,games=gamesForDate(dateISO).length,opportunities=opportunitiesForDate(dateISO).length,bits=[];
    if(dayTasks)bits.push(`${dayTasks} pendiente${dayTasks===1?"":"s"}`);if(uniEvents)bits.push("Universidad");if(numClasses)bits.push(`${numClasses} ${numClasses===1?"clase":"clases"}`);if(opportunities)bits.push(`${opportunities} potencial`);if(games)bits.push("Boca");const income=dayIncome(dateISO);if(income)bits.push(compactMoney(income));summary.textContent=bits.length?bits.join(" · "):"Libre";
    head.append(left,summary);day.appendChild(head);

    const datedTasks=tasksForDate(dateISO);if(datedTasks.length){const taskZone=document.createElement("div");taskZone.className="task-zone";datedTasks.forEach(t=>taskZone.appendChild(taskRow(t)));day.appendChild(taskZone)}
    untimedOpportunitiesForDate(dateISO).forEach(o=>{const note=document.createElement("div");note.className="mobile-pending";note.innerHTML=`<span>${o.label}</span><span>${o.note} · ${compactMoney(o.rate)}</span>`;day.appendChild(note)});

    const entries=[];
    universityForDate(dateISO).forEach(item=>entries.push({kind:"university",item}));
    personalEventsForDate(dateISO).forEach(item=>entries.push({kind:"personal",item}));
    classesForDate(dateISO).forEach(item=>entries.push({kind:"class",item}));
    timedOpportunitiesForDate(dateISO).forEach(item=>entries.push({kind:"potential",item}));
    gamesForDate(dateISO).forEach(item=>entries.push({kind:"boca",item}));
    entries.sort((a,b)=>a.item.start-b.item.start);

    const agenda=document.createElement("div");agenda.className="mobile-agenda";
    if(!entries.length){const empty=document.createElement("div");empty.className="mobile-empty-day";empty.textContent="Sin eventos con hora";agenda.appendChild(empty)}
    entries.forEach(e=>{
      const row=document.createElement("div");row.className="mobile-agenda-row";
      const time=document.createElement("div");time.className="mobile-agenda-time";const end=e.item.start+e.item.duration*60;time.innerHTML=`<strong>${minutesLabel(e.item.start)}</strong><span>${minutesLabel(end)}</span>`;
      const body=document.createElement("div");body.className="mobile-agenda-event";
      const node=e.kind==="university"?mobileUniversityNode(e.item):e.kind==="personal"?mobilePersonalNode(e.item):e.kind==="class"?mobileClassNode(e.item):e.kind==="potential"?mobilePotentialNode(e.item):mobileBocaNode(e.item);
      body.appendChild(node);
      if(e.kind==="class"){const open=()=>openEditor(dateISO,e.item.start,e.item.id);body.onclick=open;body.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}};body.tabIndex=0}
      row.append(time,body);agenda.appendChild(row);
    });
    day.appendChild(agenda);

    const actions=document.createElement("div");actions.className="mobile-day-actions";const add=document.createElement("button");add.className="mobile-day-add";add.type="button";add.textContent="+ clase";add.onclick=()=>{const raw=prompt("Hora de la clase (HH:MM)","18:00");if(!raw)return;const m=raw.trim().match(/^(\d{1,2}):(\d{2})$/);if(!m)return;const hh=Math.max(0,Math.min(23,Number(m[1]))),mm=Number(m[2]);if(mm<0||mm>59)return;openEditor(dateISO,hh*60+mm,null)};actions.appendChild(add);day.appendChild(actions);
    if(dateISO===todayISO)renderDailyLifeMobile(day,dateISO);host.appendChild(day);
  });
};

{const savedTheme=localStorage.getItem(PALETTE_KEY),valid=PALETTES.some(p=>p.id===savedTheme);applyPalette(valid?savedTheme:PALETTES[0].id)}
render();
