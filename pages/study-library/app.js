const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const dayNames = ['dom','lun','mar','mié','jue','vie','sáb'];
let cursor = new Date();

function dateKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderMonth(){
  const title = document.querySelector('#monthTitle');
  const grid = document.querySelector('#monthGrid');
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  title.textContent = `${monthNames[month][0].toUpperCase()+monthNames[month].slice(1)} ${year}`;

  const first = new Date(year, month, 1);
  const offset = (first.getDay()+6)%7;
  const start = new Date(year, month, 1-offset);
  const today = dateKey(new Date());
  grid.replaceChildren();

  for(let i=0;i<42;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const cell = document.createElement('button');
    cell.className = 'day';
    if(d.getMonth() !== month) cell.classList.add('out');
    if(dateKey(d) === today) cell.classList.add('today');
    cell.textContent = d.getDate();
    grid.appendChild(cell);
  }
}

function renderWeek(){
  const root = document.querySelector('#weekList');
  root.replaceChildren();
  const start = new Date(cursor);
  start.setDate(start.getDate()-((start.getDay()+6)%7));
  for(let i=0;i<7;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const row = document.createElement('div');
    row.className = 'weekRow';
    row.innerHTML = `<div class="weekDate">${dayNames[d.getDay()]}<b>${d.getDate()}</b></div><div class="weekEvents empty">—</div>`;
    root.appendChild(row);
  }
}

function renderAgenda(){
  document.querySelector('#agendaList').innerHTML = '<div class="agendaEmpty">Sin próximas fechas.</div>';
}

function renderAll(){ renderMonth(); renderWeek(); renderAgenda(); }

for(const tab of document.querySelectorAll('.viewTab')){
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.viewTab').forEach(x=>x.classList.toggle('active',x===tab));
    document.querySelectorAll('.calView').forEach(x=>x.classList.remove('active'));
    document.querySelector(`#${tab.dataset.view}View`).classList.add('active');
  });
}

document.querySelector('#todayBtn').addEventListener('click',()=>{
  cursor = new Date();
  renderAll();
});

renderAll();
