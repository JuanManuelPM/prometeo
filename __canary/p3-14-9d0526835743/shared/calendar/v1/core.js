/* PROMETEO CALENDAR CORE v1 — pure temporal owner, no DOM/storage/domain data. */
(function(root){
  const pad=n=>String(n).padStart(2,'0');
  const cloneDate=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const isoDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseISO=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)};
  const addDays=(d,n)=>{const x=cloneDate(d);x.setDate(x.getDate()+Number(n||0));return x};
  const mondayOf=d=>{const x=cloneDate(d);const js=x.getDay();return addDays(x,js===0?-6:1-js)};
  const weekdayIndex=d=>(d.getDay()+6)%7;
  const scheduleOccursOn=(schedule,dateISO)=>{
    if(!schedule)return false;
    if(schedule.type==='fixed')return Number(schedule.weekday)===weekdayIndex(parseISO(dateISO));
    return schedule.date===dateISO;
  };
  const universityOnDate=(schedules,dateISO)=>{
    const weekday=weekdayIndex(parseISO(dateISO));
    return (schedules||[]).filter(u=>Number(u.weekday)===weekday && dateISO>=u.from && dateISO<=u.to);
  };
  const occurrencesForMonth=(schedules,year,month)=>{
    const result=[];
    const days=new Date(year,month+1,0).getDate();
    for(const schedule of schedules||[]){
      if(schedule.type==='fixed'){
        for(let day=1;day<=days;day++){
          const date=new Date(year,month,day);
          if(weekdayIndex(date)===Number(schedule.weekday)){
            result.push({c:schedule,date:isoDate(date),income:Number(schedule.duration||0)*Number(schedule.rate||0)});
          }
        }
      }else if(schedule.date){
        const date=parseISO(schedule.date);
        if(date.getFullYear()===year&&date.getMonth()===month){
          result.push({c:schedule,date:schedule.date,income:Number(schedule.duration||0)*Number(schedule.rate||0)});
        }
      }
    }
    return result;
  };
  root.PrometeoCalendarCore=Object.freeze({version:'1',pad,cloneDate,isoDate,parseISO,addDays,mondayOf,weekdayIndex,scheduleOccursOn,universityOnDate,occurrencesForMonth});
})(typeof window!=='undefined'?window:globalThis);
