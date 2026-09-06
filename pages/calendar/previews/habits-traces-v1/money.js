(()=>{
  const STATE_KEY='prometeo.calendar.state.v1';
  const EXPENSE_KEY='prometeo.preview.finance.v1';
  const MONTHS=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const pad=n=>String(n).padStart(2,'0');
  const monthKey=(y,m)=>`${y}-${pad(m+1)}`;
  const fmt=n=>'$'+Math.round(Number(n)||0).toLocaleString('es-AR');
  const compact=n=>{n=Number(n)||0;if(Math.abs(n)>=1000000)return '$'+(n/1000000).toFixed(2).replace('.',',')+' M';if(Math.abs(n)>=1000)return '$'+Math.round(n/1000)+'k';return fmt(n)};
  const safe=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
  const state=()=>safe(localStorage.getItem(STATE_KEY),{calendar:{classes:[],opportunities:[]}});
  let expense=safe(localStorage.getItem(EXPENSE_KEY),{fixed:0,variable:{}});

  function weekdayIndex(d){return (d.getDay()+6)%7;}
  function incomeForMonth(year,month){
    const s=state(),classes=Array.isArray(s.calendar?.classes)?s.calendar.classes:[];
    let total=0;
    const days=new Date(year,month+1,0).getDate();
    classes.forEach(c=>{
      const amount=(Number(c.duration)||0)*(Number(c.rate)||0);
      if(c.type==='fixed'){
        for(let d=1;d<=days;d++)if(weekdayIndex(new Date(year,month,d))===Number(c.weekday))total+=amount;
      }else if(c.date){
        const dt=new Date(c.date+'T12:00:00');
        if(dt.getFullYear()===year&&dt.getMonth()===month)total+=amount;
      }
    });
    return total;
  }
  function potentialForMonth(year,month){
    const s=state(),ops=Array.isArray(s.calendar?.opportunities)?s.calendar.opportunities:[];
    return ops.filter(o=>{const d=new Date(o.date+'T12:00:00');return d.getFullYear()===year&&d.getMonth()===month;}).reduce((sum,o)=>sum+(Number(o.duration)||0)*(Number(o.rate)||0),0);
  }
  function expensesForMonth(year,month){
    const key=monthKey(year,month);
    return (Number(expense.fixed)||0)+(Number(expense.variable?.[key])||0);
  }
  function series(){
    const now=new Date();
    return [-2,-1,0,1,2,3].map(delta=>{
      const d=new Date(now.getFullYear(),now.getMonth()+delta,1);
      return {year:d.getFullYear(),month:d.getMonth(),income:incomeForMonth(d.getFullYear(),d.getMonth()),expenses:expensesForMonth(d.getFullYear(),d.getMonth()),potential:potentialForMonth(d.getFullYear(),d.getMonth()),current:delta===0};
    });
  }

  function pathFor(values,width,height,padX,padY,max){
    const usableW=width-padX*2,usableH=height-padY*2;
    return values.map((v,i)=>{
      const x=padX+(values.length===1?0:i/(values.length-1))*usableW;
      const y=height-padY-(max?Math.max(0,v)/max:0)*usableH;
      return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }
  function dots(values,width,height,padX,padY,max,kind){
    const usableW=width-padX*2,usableH=height-padY*2;
    return values.map((v,i)=>{
      const x=padX+(values.length===1?0:i/(values.length-1))*usableW;
      const y=height-padY-(max?Math.max(0,v)/max:0)*usableH;
      return `<circle class="money-dot ${kind}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`;
    }).join('');
  }

  function renderChart(){
    const svg=document.getElementById('moneyChart');if(!svg)return;
    const rows=series(),W=600,H=190,PX=26,PY=28;
    const incomes=rows.map(r=>r.income),expenses=rows.map(r=>r.expenses);
    const max=Math.max(1,...incomes,...expenses)*1.12;
    const grid=[.25,.5,.75,1].map(fr=>{const y=H-PY-fr*(H-PY*2);return `<line class="money-gridline" x1="${PX}" y1="${y}" x2="${W-PX}" y2="${y}"/>`;}).join('');
    const labels=rows.map((r,i)=>{const x=PX+i/(rows.length-1)*(W-PX*2);return `<text class="money-xlabel${r.current?' current':''}" x="${x}" y="${H-7}" text-anchor="middle">${MONTHS[r.month]}</text>`;}).join('');
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    svg.innerHTML=`${grid}<path class="money-income-line" d="${pathFor(incomes,W,H,PX,PY,max)}"/>${dots(incomes,W,H,PX,PY,max,'income')}<path class="money-expense-line" d="${pathFor(expenses,W,H,PX,PY,max)}"/>${dots(expenses,W,H,PX,PY,max,'expense')}${labels}`;

    const current=rows.find(r=>r.current),hasExpenses=(Number(expense.fixed)||0)>0||Object.values(expense.variable||{}).some(v=>Number(v)>0);
    const out=current.income-current.expenses;
    document.getElementById('moneyIncome').textContent=compact(current.income);
    document.getElementById('moneyExpense').textContent=hasExpenses?compact(current.expenses):'—';
    document.getElementById('moneyRemain').textContent=hasExpenses?compact(out):'—';
    document.getElementById('moneyPotential').textContent=current.potential?`+${compact(current.potential)} potencial`:'sin potencial cargado';
    document.getElementById('moneyExpenseHint').textContent=hasExpenses?`Fijo ${compact(expense.fixed)} · variable ${compact(expense.variable?.[monthKey(current.year,current.month)]||0)}`:'Cargá gastos fijos y variables para completar la segunda línea.';
  }

  function editExpenses(){
    const now=new Date(),key=monthKey(now.getFullYear(),now.getMonth());
    const fixed=prompt('Gastos fijos mensuales:',String(Number(expense.fixed)||0));if(fixed===null)return;
    const variable=prompt(`Gastos variables de ${MONTHS[now.getMonth()]}:`,String(Number(expense.variable?.[key])||0));if(variable===null)return;
    expense.fixed=Number(String(fixed).replace(/[^0-9.-]/g,''))||0;
    expense.variable=expense.variable||{};
    expense.variable[key]=Number(String(variable).replace(/[^0-9.-]/g,''))||0;
    localStorage.setItem(EXPENSE_KEY,JSON.stringify(expense));
    renderChart();
  }

  document.getElementById('moneyEditExpenses')?.addEventListener('click',editExpenses);
  renderChart();
  window.addEventListener('storage',renderChart);
})();
