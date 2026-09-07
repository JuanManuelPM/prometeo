(()=>{
  const CALENDAR_KEY='prometeo.calendar.state.v1';
  const FINANCE_KEY='prometeo.preview.finance.v2';
  const LEGACY_KEY='prometeo.preview.finance.v1';
  const MONTHS=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const MONTHS_SHORT=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const DAY_MS=86400000;
  const safe=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
  const pad=n=>String(n).padStart(2,'0');
  const iso=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
  const monthKey=(y,m)=>`${y}-${pad(m+1)}`;
  const parseISO=s=>new Date(`${s}T12:00:00`);
  const money=n=>'$'+Math.round(Number(n)||0).toLocaleString('es-AR');
  const signed=(n,kind)=>`${kind==='income'?'+':'−'}${money(Math.abs(Number(n)||0))}`;
  const compact=n=>{
    n=Number(n)||0;
    if(Math.abs(n)>=1000000)return '$'+(n/1000000).toFixed(2).replace('.',',')+' M';
    if(Math.abs(n)>=1000)return '$'+Math.round(n/1000)+'k';
    return money(n);
  };
  const uid=()=>`fin-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const todayISO=()=>{const d=new Date();return iso(d.getFullYear(),d.getMonth(),d.getDate())};
  const calendarState=()=>safe(localStorage.getItem(CALENDAR_KEY),{calendar:{classes:[],opportunities:[]}});

  function blankFinance(){return {version:2,items:[],recurring:[],legacyFixed:0,legacyVariable:{}}}
  function loadFinance(){
    let next=safe(localStorage.getItem(FINANCE_KEY),null);
    if(next&&Number(next.version)>=2){
      next.items=Array.isArray(next.items)?next.items:[];
      next.recurring=Array.isArray(next.recurring)?next.recurring:[];
      next.legacyVariable=next.legacyVariable&&typeof next.legacyVariable==='object'?next.legacyVariable:{};
      return next;
    }
    next=blankFinance();
    const legacy=safe(localStorage.getItem(LEGACY_KEY),null);
    if(legacy){
      next.legacyFixed=Number(legacy.fixed)||0;
      next.legacyVariable=legacy.variable&&typeof legacy.variable==='object'?legacy.variable:{};
    }
    localStorage.setItem(FINANCE_KEY,JSON.stringify(next));
    return next;
  }
  let finance=loadFinance();

  function save(){
    finance.version=2;
    localStorage.setItem(FINANCE_KEY,JSON.stringify(finance));
  }

  function decodeSeed(value){
    try{
      const normalized=value.replace(/-/g,'+').replace(/_/g,'/');
      const padded=normalized+'='.repeat((4-normalized.length%4)%4);
      const bytes=Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    }catch{return null}
  }
  function mergeById(existing,incoming){
    const map=new Map(existing.map(x=>[x.id,x]));
    incoming.forEach(x=>{if(x&&x.id)map.set(x.id,{...(map.get(x.id)||{}),...x})});
    return [...map.values()];
  }
  function importSeedFromHash(){
    const prefix='#financeSeed=';
    if(!location.hash.startsWith(prefix))return;
    const seed=decodeSeed(location.hash.slice(prefix.length));
    if(seed){
      finance.items=mergeById(finance.items,Array.isArray(seed.items)?seed.items:[]);
      finance.recurring=mergeById(finance.recurring,Array.isArray(seed.recurring)?seed.recurring:[]);
      save();
    }
    history.replaceState(history.state,'',location.pathname+location.search);
  }
  importSeedFromHash();

  let cursor=new Date();
  cursor=new Date(cursor.getFullYear(),cursor.getMonth(),1);

  function weekdayIndex(d){return (d.getDay()+6)%7}
  function classOccurrences(year,month){
    const s=calendarState();
    const classes=Array.isArray(s.calendar?.classes)?s.calendar.classes:[];
    const out=[];
    const days=new Date(year,month+1,0).getDate();
    classes.forEach(c=>{
      const amount=(Number(c.duration)||0)*(Number(c.rate)||0);
      if(!amount)return;
      if(c.type==='fixed'){
        for(let day=1;day<=days;day++){
          const d=new Date(year,month,day);
          if(weekdayIndex(d)===Number(c.weekday))out.push({
            id:`lesson-${c.id}-${iso(year,month,day)}`,
            type:'income',title:c.name||'Clase',amount,date:iso(year,month,day),status:'scheduled',source:'calendar',groupId:c.id
          });
        }
      }else if(c.date){
        const d=parseISO(c.date);
        if(d.getFullYear()===year&&d.getMonth()===month)out.push({
          id:`lesson-${c.id}-${c.date}`,
          type:'income',title:c.name||'Clase',amount,date:c.date,status:'scheduled',source:'calendar',groupId:c.id
        });
      }
    });
    return out;
  }
  function opportunityOccurrences(year,month){
    const s=calendarState();
    const ops=Array.isArray(s.calendar?.opportunities)?s.calendar.opportunities:[];
    return ops.filter(o=>{
      if(!o.date)return false;
      const d=parseISO(o.date);
      return d.getFullYear()===year&&d.getMonth()===month;
    }).map(o=>({
      id:`potential-${o.id}`,type:'income',title:o.label||'Ingreso potencial',amount:(Number(o.duration)||0)*(Number(o.rate)||0),date:o.date,status:'potential',source:'calendar'
    }));
  }
  function monthItems(year,month){
    const key=monthKey(year,month);
    return finance.items.filter(x=>x.date&&String(x.date).slice(0,7)===key);
  }
  function recurringForMonth(year,month){
    const days=new Date(year,month+1,0).getDate();
    const monthStart=iso(year,month,1),monthEnd=iso(year,month,days);
    return finance.recurring.filter(x=>x.status!=='paused'&&(!x.start||x.start<=monthEnd)&&(!x.end||x.end>=monthStart)).map(x=>({
      ...x,
      id:`${x.id}-${monthKey(year,month)}`,
      type:x.type||'expense',
      date:iso(year,month,Math.min(days,Math.max(1,Number(x.day)||1))),
      source:'recurring'
    }));
  }
  function legacyForMonth(year,month){
    const out=[];
    const fixed=Number(finance.legacyFixed)||0;
    const variable=Number(finance.legacyVariable?.[monthKey(year,month)])||0;
    if(fixed)out.push({id:`legacy-fixed-${monthKey(year,month)}`,type:'expense',title:'Gastos fijos anteriores',amount:fixed,date:null,status:'confirmed',source:'legacy'});
    if(variable)out.push({id:`legacy-variable-${monthKey(year,month)}`,type:'expense',title:'Variable cargado',amount:variable,date:null,status:'confirmed',source:'legacy'});
    return out;
  }
  function snapshot(year,month){
    const recurring=recurringForMonth(year,month);
    const income=[...classOccurrences(year,month),...monthItems(year,month).filter(x=>x.type==='income'),...recurring.filter(x=>x.type==='income')];
    const potential=[...opportunityOccurrences(year,month),...income.filter(x=>x.status==='potential')];
    const confirmedIncome=income.filter(x=>x.status!=='potential');
    const expenses=[...monthItems(year,month).filter(x=>x.type==='expense'),...recurring.filter(x=>x.type!=='income'),...legacyForMonth(year,month)];
    const incomeTotal=confirmedIncome.reduce((s,x)=>s+(Number(x.amount)||0),0);
    const potentialTotal=potential.reduce((s,x)=>s+(Number(x.amount)||0),0);
    const expenseTotal=expenses.reduce((s,x)=>s+(Number(x.amount)||0),0);
    return {income:confirmedIncome,potential,expenses,incomeTotal,potentialTotal,expenseTotal,remain:incomeTotal-expenseTotal};
  }

  function aggregateIncome(rows){
    const map=new Map();
    rows.forEach(x=>{
      const key=x.groupId||x.title;
      const current=map.get(key)||{title:x.title,count:0,total:0};
      current.count+=1;current.total+=Number(x.amount)||0;map.set(key,current);
    });
    return [...map.values()].sort((a,b)=>b.total-a.total);
  }
  function dateLabel(date){
    if(!date)return 'SIN FECHA';
    const d=parseISO(date);
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  }
  function statusLabel(x){
    if(x.status==='paid')return 'pagado';
    if(x.status==='overdue')return 'vencido';
    if(x.status==='potential')return 'potencial';
    if(x.status==='scheduled')return 'programado';
    return 'confirmado';
  }
  function movementRow(x){
    const tone=x.type==='income'?'income':'expense';
    return `<div class="money-movement ${tone}">
      <div class="money-movement-date">${dateLabel(x.date)}</div>
      <div class="money-movement-copy"><strong>${escapeHTML(x.title||'Movimiento')}</strong><span>${statusLabel(x)}</span></div>
      <div class="money-movement-amount">${signed(x.amount,x.type)}</div>
    </div>`;
  }
  function escapeHTML(value){
    return String(value??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  }

  function upcoming(rows,year,month){
    const now=new Date();
    const isCurrent=now.getFullYear()===year&&now.getMonth()===month;
    const today=todayISO();
    const dated=rows.filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date));
    const filtered=isCurrent?dated.filter(x=>x.date>=today):dated;
    return (filtered.length?filtered:dated.slice(-4)).slice(0,6);
  }

  function renderHero(data){
    const hasExpense=data.expenseTotal>0;
    document.getElementById('moneyRemain').textContent=hasExpense||data.incomeTotal?money(data.remain):'—';
    document.getElementById('moneyIncome').textContent=money(data.incomeTotal);
    document.getElementById('moneyExpense').textContent=hasExpense?money(data.expenseTotal):'—';
    const p=document.getElementById('moneyPotential');
    p.textContent=data.potentialTotal?`+${compact(data.potentialTotal)} potencial`:'sin ingresos potenciales cargados';
    p.hidden=!data.potentialTotal;
  }
  function renderTimeline(data,year,month){
    const host=document.getElementById('moneyTimeline');
    const rows=upcoming([...data.income,...data.expenses,...data.potential],year,month);
    host.innerHTML=rows.length?rows.map(movementRow).join(''):'<div class="money-empty">No hay movimientos fechados para este mes.</div>';
  }
  function renderIncomeDetail(data){
    const host=document.getElementById('moneyIncomeDetail');
    const groups=aggregateIncome(data.income);
    host.innerHTML=groups.length?groups.map(g=>`<div class="money-detail-row"><span>${escapeHTML(g.title)}${g.count>1?` · ${g.count}×`:''}</span><strong>+${money(g.total)}</strong></div>`).join(''):'<div class="money-empty">No hay ingresos programados.</div>';
  }
  function renderExpenseDetail(data){
    const host=document.getElementById('moneyExpenseDetail');
    const rows=[...data.expenses].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
    host.innerHTML=rows.length?rows.map(x=>`<div class="money-detail-row"><span>${escapeHTML(x.title)}<small>${x.date?dateLabel(x.date):statusLabel(x)}</small></span><strong>−${money(x.amount)}</strong></div>`).join(''):'<div class="money-empty">Todavía no cargaste gastos para este mes.</div>';
  }
  function renderRecurring(){
    const host=document.getElementById('moneyRecurringDetail');
    const rows=[...finance.recurring].sort((a,b)=>(a.status==='paused')-(b.status==='paused'));
    host.innerHTML=rows.length?rows.map(x=>`<div class="money-detail-row ${x.status==='paused'?'is-muted':''}"><span>${escapeHTML(x.title)}<small>${x.status==='paused'?'pausado':`día ${Number(x.day)||1} · mensual`}</small></span><strong>${x.amount?money(x.amount):'—'}</strong></div>`).join(''):'<div class="money-empty">No hay recurrentes cargados.</div>';
  }
  function renderHistory(){
    const host=document.getElementById('moneyHistoryDetail');
    const rows=[];
    for(let delta=-3;delta<=0;delta++){
      const d=new Date(cursor.getFullYear(),cursor.getMonth()+delta,1);
      const s=snapshot(d.getFullYear(),d.getMonth());
      rows.push({label:`${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,remain:s.remain,income:s.incomeTotal,expense:s.expenseTotal});
    }
    const max=Math.max(1,...rows.map(x=>Math.abs(x.remain)));
    host.innerHTML=rows.map(x=>`<div class="money-history-row"><span>${x.label}</span><div class="money-history-track"><i style="width:${Math.max(2,Math.abs(x.remain)/max*100).toFixed(1)}%"></i></div><strong>${x.remain>=0?'+':''}${compact(x.remain)}</strong></div>`).join('');
  }

  function render(){
    const year=cursor.getFullYear(),month=cursor.getMonth();
    document.getElementById('moneyMonthLabel').textContent=`${MONTHS[month]} ${year}`;
    const data=snapshot(year,month);
    renderHero(data);
    renderTimeline(data,year,month);
    renderIncomeDetail(data);
    renderExpenseDetail(data);
    renderRecurring();
    renderHistory();
  }

  function shiftMonth(delta){
    cursor=new Date(cursor.getFullYear(),cursor.getMonth()+delta,1);
    render();
  }

  const dialog=document.getElementById('moneyEditor');
  const form=document.getElementById('moneyEditorForm');
  function openEditor(){
    const d=new Date();
    document.getElementById('moneyEntryDate').value=iso(d.getFullYear(),d.getMonth(),d.getDate());
    document.getElementById('moneyEntryType').value='expense';
    document.getElementById('moneyEntryTitle').value='';
    document.getElementById('moneyEntryAmount').value='';
    document.getElementById('moneyEntryRecurring').checked=false;
    if(typeof dialog?.showModal==='function')dialog.showModal();else dialog?.setAttribute('open','');
  }
  function closeEditor(){if(typeof dialog?.close==='function')dialog.close();else dialog?.removeAttribute('open')}
  form?.addEventListener('submit',e=>{
    e.preventDefault();
    const type=document.getElementById('moneyEntryType').value;
    const title=document.getElementById('moneyEntryTitle').value.trim();
    const amount=Number(String(document.getElementById('moneyEntryAmount').value).replace(',','.'))||0;
    const date=document.getElementById('moneyEntryDate').value;
    const recurring=document.getElementById('moneyEntryRecurring').checked;
    if(!title||!amount||!date)return;
    if(recurring){
      const d=parseISO(date);
      finance.recurring.push({id:uid(),type,title,amount,day:d.getDate(),start:date,status:'active',source:'manual'});
    }else{
      finance.items.push({id:uid(),type,title,amount,date,status:'confirmed',source:'manual'});
    }
    save();closeEditor();render();
  });

  document.getElementById('moneyPrevMonth')?.addEventListener('click',()=>shiftMonth(-1));
  document.getElementById('moneyNextMonth')?.addEventListener('click',()=>shiftMonth(1));
  document.getElementById('moneyAdd')?.addEventListener('click',openEditor);
  document.getElementById('moneyEditorCancel')?.addEventListener('click',closeEditor);
  window.addEventListener('storage',()=>{finance=loadFinance();render()});

  window.renderPrometeoMoney=render;
  render();
})();
