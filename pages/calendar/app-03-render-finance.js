function dayIncome(dateISO){return classesForDate(dateISO).reduce((sum,c)=>sum+c.duration*c.rate,0)}
function renderMobileWeek(dates,range){
  const host=document.getElementById("mobileWeek");host.innerHTML="";const todayISO=isoDate(new Date());
  dates.forEach((d,index)=>{
    const dateISO=isoDate(d),day=document.createElement("section");day.className="mobile-day";
    const head=document.createElement("div");head.className="mobile-day-head"+(dateISO===todayISO?" today":"");
    const left=document.createElement("div");left.innerHTML=`<div class="mobile-day-name">${DAY_NAMES[index]}</div><div class="mobile-day-date">${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}</div>`;
    const summary=document.createElement("div");summary.className="mobile-day-summary";
    const numClasses=classesForDate(dateISO).length,dayTasks=openTasksForDate(dateISO).length,uniEvents=universityForDate(dateISO).length,games=gamesForDate(dateISO).length,opportunities=opportunitiesForDate(dateISO).length,bits=[];
    if(dayTasks)bits.push(`${dayTasks} pendiente${dayTasks===1?"":"s"}`);if(uniEvents)bits.push("Universidad");if(numClasses)bits.push(`${numClasses} ${numClasses===1?"clase":"clases"}`);if(opportunities)bits.push(`${opportunities} potencial`);if(games)bits.push(`${games} Boca`);const income=dayIncome(dateISO);if(income)bits.push(compactMoney(income));summary.textContent=bits.length?bits.join(" · "):"Libre";
    head.append(left,summary);day.appendChild(head);
    const datedTasks=tasksForDate(dateISO);if(datedTasks.length){const taskZone=document.createElement("div");taskZone.className="task-zone";datedTasks.forEach(t=>taskZone.appendChild(taskRow(t)));day.appendChild(taskZone)}
    untimedOpportunitiesForDate(dateISO).forEach(o=>{const note=document.createElement("div");note.className="mobile-pending";note.innerHTML=`<span>${o.label}</span><span>${o.note} · ${compactMoney(o.rate)}</span>`;day.appendChild(note)});
    const slots=document.createElement("div");slots.className="mobile-slots";
    for(let t=range.start;t<range.end;t+=30){
      const row=document.createElement("div");row.className="mobile-slot";const time=document.createElement("div");time.className="mobile-time";time.textContent=minutesLabel(t);const body=document.createElement("div");body.className="mobile-slot-body";body.tabIndex=0;
      const e=eventAt(dateISO,t);
      if(e){
        if(e.item.start===t)body.appendChild(e.kind==="university"?mobileUniversityNode(e.item):e.kind==="personal"?mobilePersonalNode(e.item):e.kind==="class"?mobileClassNode(e.item):e.kind==="potential"?mobilePotentialNode(e.item):mobileBocaNode(e.item));
        if(e.kind==="class"){const open=()=>openEditor(dateISO,e.item.start,e.item.id);body.onclick=open;body.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}}}
      }else{const open=()=>openEditor(dateISO,t,null);body.onclick=open;body.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}}}
      row.append(time,body);slots.appendChild(row);
    }
    day.appendChild(slots);if(dateISO===todayISO)renderDailyLifeMobile(day,dateISO);host.appendChild(day);
  });
}
function universityNode(u){
  const box=document.createElement("div");box.className="event university";box.style.setProperty("--blocks",String(Math.max(1,u.duration*2)));const main=document.createElement("div");main.className="event-main";const title=document.createElement("div");title.className="event-title";title.textContent=u.subject;const meta=document.createElement("div");meta.className="event-meta";const bits=[`${minutesLabel(u.start)}–${minutesLabel(u.start+u.duration*60)}`,u.room];if(u.detail)bits.unshift(u.detail);meta.textContent=bits.join(" · ");main.append(title,meta);box.append(main);return box;
}
function potentialNode(o){
  const box=document.createElement("div");box.className="event potential";box.style.setProperty("--blocks",String(Math.max(1,o.duration*2)));const main=document.createElement("div");main.className="event-main";const title=document.createElement("div");title.className="event-title";title.textContent=o.label;const meta=document.createElement("div");meta.className="event-meta";meta.textContent=`Potencial · ${hourText(o.duration)} · ${compactMoney(o.rate)}/h`;main.append(title,meta);box.append(main);return box;
}
function render(){
  const dates=visibleDates(),range=rangeForWeek();grid.innerHTML="";grid.style.gridTemplateColumns="74px repeat(7,minmax(140px,1fr))";
  document.getElementById("rangeLabel").textContent=`${minutesLabel(range.start)}–${minutesLabel(range.end)}`;const last=dates[6];document.getElementById("weekLabel").textContent=`${dates[0].getDate()} ${MONTHS[dates[0].getMonth()]} — ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  const corner=document.createElement("div");corner.className="cell head corner";grid.appendChild(corner);const todayISO=isoDate(new Date());
  dates.forEach((d,i)=>{const h=document.createElement("div");h.className="cell head"+(isoDate(d)===todayISO?" today":"");h.innerHTML=`<div class="day-name">${DAY_SHORT[i]}</div><div class="day-date">${d.getDate()}</div><div class="day-month">${MONTHS[d.getMonth()]}</div>`;if(untimedOpportunitiesForDate(isoDate(d)).length){const badge=document.createElement("div");badge.className="day-pending";badge.textContent="Clase · hora a definir";h.appendChild(badge)}const taskCount=openTasksForDate(isoDate(d)).length;if(taskCount){const badge=document.createElement("div");badge.className="day-pending";badge.textContent=`${taskCount} pendiente${taskCount===1?"":"s"}`;h.appendChild(badge)}grid.appendChild(h)});
  for(let t=range.start;t<range.end;t+=30){
    const tm=document.createElement("div");tm.className="cell time";tm.textContent=minutesLabel(t);grid.appendChild(tm);
    dates.forEach(d=>{const dateISO=isoDate(d),slot=document.createElement("div");slot.className="cell slot";slot.tabIndex=0;const e=eventAt(dateISO,t);
      if(e){if(e.item.start===t)slot.appendChild(e.kind==="university"?universityNode(e.item):e.kind==="personal"?personalNode(e.item):e.kind==="class"?classNode(e.item):e.kind==="potential"?potentialNode(e.item):bocaNode(e.item));if(e.kind==="class"){const open=()=>openEditor(dateISO,e.item.start,e.item.id);slot.onclick=open;slot.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}}}}
      else{const open=()=>openEditor(dateISO,t,null);slot.onclick=open;slot.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}}}grid.appendChild(slot)});
  }
  renderMobileWeek(dates,range);renderLifeDesktop();renderLater();updateShoppingButton();updateFinance(dates);
}
function monthKey(year,month){return `${year}-${pad(month+1)}`}
function monthTitle(year,month){const full=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];return `${full[month]} ${year}`}
function previousMonthOf(year,month){if(month===0)return {year:year-1,month:11};return {year,month:month-1}}
function scheduledForMonth(year,month){return CAL_CORE.occurrencesForMonth(classes,year,month)}
function loadIncomeHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"{}")}catch{return {}}}
function pct(part,total){return total>0?part/total*100:0}
function pctLabel(value){const rounded=Math.round(value*10)/10;return String(rounded).replace(".",",")+"%"}
function forecastMonth(year,month){
  const rows=scheduledForMonth(year,month),opportunities=OPPORTUNITIES.filter(o=>{const d=parseISO(o.date);return d.getFullYear()===year&&d.getMonth()===month}),fixedRows=rows.filter(x=>x.c.type==="fixed"),extraRows=rows.filter(x=>x.c.type!=="fixed");
  const fixed=fixedRows.reduce((s,x)=>s+x.income,0),extra=extraRows.reduce((s,x)=>s+x.income,0),potential=opportunities.reduce((s,o)=>s+o.duration*o.rate,0),confirmed=rows.reduce((s,x)=>s+x.income,0),total=confirmed+potential,hours=rows.reduce((s,x)=>s+x.c.duration,0)+opportunities.reduce((s,o)=>s+o.duration,0);
  return {year,month,rows,opportunities,fixed,extra,potential,confirmed,total,hours,classCount:rows.length+opportunities.length};
}
function shiftMonth(year,month,delta){const d=new Date(year,month+delta,1);return {year:d.getFullYear(),month:d.getMonth()}}
function shortMonth(month){return ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"][month]}
