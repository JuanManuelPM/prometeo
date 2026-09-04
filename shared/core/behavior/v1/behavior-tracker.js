(function(global){
  "use strict";

  const KINDS=Object.freeze(["use","urge","clear"]);
  const GOAL_MODES=Object.freeze(["avoid","limit","minimum","target"]);

  function requireStore(store){
    if(!store||typeof store.create!=="function"||typeof store.query!=="function")throw new TypeError("Prometeo ObjectStore required");
  }
  function pad(n){return String(n).padStart(2,"0")}
  function localDateKey(value=new Date()){
    const d=value instanceof Date?value:new Date(value);
    if(Number.isNaN(d.getTime()))throw new Error("invalid date");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function parseDateKey(key){
    const m=String(key||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)throw new Error(`invalid date key: ${key}`);
    return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
  }
  function shiftDateKey(key,delta){
    const d=parseDateKey(key);d.setDate(d.getDate()+delta);return localDateKey(d);
  }
  function uniqueStrings(values){return [...new Set((values||[]).map(x=>String(x).trim()).filter(Boolean))]}
  function tracker(store,id){
    requireStore(store);const object=store.get(id);
    if(!object||object.type!=="behavior_tracker")throw new Error(`behavior tracker not found: ${id}`);
    return object;
  }

  function createTracker(store,input={}){
    requireStore(store);
    const goal={...(input.goal||{})};
    goal.mode=GOAL_MODES.includes(goal.mode)?goal.mode:"avoid";
    const unit=String(input.unit||"event").trim()||"event";
    return store.create("behavior_tracker",{
      title:String(input.title||"Registro").trim()||"Registro",
      status:input.status||"active",
      tags:input.tags||[],
      collections:input.collections||[],
      notes:input.notes||[],
      capabilities:{
        trackable:{
          goal,
          unit,
          confirmation:input.confirmation||"manual",
          dayBoundary:input.dayBoundary||"local"
        },
        content:{description:input.description||null}
      }
    });
  }

  function log(store,trackerId,input={}){
    const parent=tracker(store,trackerId);
    const kind=KINDS.includes(input.kind)?input.kind:"use";
    const timestamp=input.timestamp||new Date().toISOString();
    const date=input.date||localDateKey(timestamp);
    const unit=parent.capabilities.trackable.unit||"event";
    const rawQuantity=kind==="clear"?0:Number(input.quantity==null?(kind==="use"?1:0):input.quantity);
    const quantity=Number.isFinite(rawQuantity)?Math.max(0,rawQuantity):0;
    const label=kind==="use"?"consumo":kind==="urge"?"ganas":"sin consumo";
    return store.create("behavior_log",{
      title:`${parent.title} · ${label}`,
      status:"done",
      tags:uniqueStrings(input.tags),
      relations:[{type:"belongs_to",targetId:trackerId}],
      capabilities:{
        trackable:{
          trackerId,
          kind,
          quantity,
          unit,
          context:uniqueStrings(input.context),
          note:input.note||null,
          timestamp
        },
        temporal:{date,start:timestamp,allDay:false}
      }
    });
  }

  function logUse(store,trackerId,quantity=1,extra={}){return log(store,trackerId,{...extra,kind:"use",quantity})}
  function logUrge(store,trackerId,extra={}){return log(store,trackerId,{...extra,kind:"urge",quantity:0})}
  function markClear(store,trackerId,date=localDateKey(),extra={}){
    const timestamp=extra.timestamp||`${date}T23:59:00`;
    return log(store,trackerId,{...extra,kind:"clear",quantity:0,date,timestamp});
  }

  function logsFor(store,trackerId){
    tracker(store,trackerId);
    return store.query({
      type:"behavior_log",
      where:o=>o.status!=="archived"&&o.capabilities?.trackable?.trackerId===trackerId
    }).sort((a,b)=>String(a.capabilities.trackable.timestamp||"").localeCompare(String(b.capabilities.trackable.timestamp||"")));
  }

  function logsByDate(store,trackerId){
    const map=new Map();
    logsFor(store,trackerId).forEach(object=>{
      const key=object.capabilities?.temporal?.date||localDateKey(object.capabilities?.trackable?.timestamp);
      if(!map.has(key))map.set(key,[]);map.get(key).push(object);
    });
    return map;
  }

  function stateFromLogs(logs=[]){
    const uses=logs.filter(x=>x.capabilities?.trackable?.kind==="use");
    const urges=logs.filter(x=>x.capabilities?.trackable?.kind==="urge");
    const clears=logs.filter(x=>x.capabilities?.trackable?.kind==="clear");
    const quantity=uses.reduce((sum,x)=>sum+(Number(x.capabilities.trackable.quantity)||0),0);
    return {
      state:uses.length?"use":clears.length?"clear":urges.length?"urge":"unknown",
      quantity,
      useCount:uses.length,
      urgeCount:urges.length,
      clearCount:clears.length,
      logs:[...logs]
    };
  }

  function dayState(store,trackerId,date){
    const map=logsByDate(store,trackerId);
    return {date,...stateFromLogs(map.get(date)||[])};
  }

  function series(store,trackerId,{end=localDateKey(),days=30}={}){
    const safeDays=Math.max(1,Math.min(3660,Math.floor(Number(days)||30)));
    const map=logsByDate(store,trackerId),out=[];
    for(let i=safeDays-1;i>=0;i--){
      const date=shiftDateKey(end,-i);out.push({date,...stateFromLogs(map.get(date)||[])});
    }
    return out;
  }

  function stats(store,trackerId,{today=localDateKey(),days=30}={}){
    const rows=series(store,trackerId,{end:today,days});
    const all=logsFor(store,trackerId);
    const useLogs=all.filter(x=>x.capabilities?.trackable?.kind==="use");
    let currentStreak=0;
    for(let i=rows.length-1;i>=0;i--){if(rows[i].state==="clear")currentStreak++;else break}
    let bestStreak=0,run=0;
    rows.forEach(r=>{if(r.state==="clear"){run++;bestStreak=Math.max(bestStreak,run)}else run=0});
    const lastUse=useLogs.length?useLogs[useLogs.length-1]:null;
    return {
      trackerId,
      windowDays:rows.length,
      currentStreak,
      bestStreak,
      daysWithUse:rows.filter(x=>x.state==="use").length,
      confirmedClearDays:rows.filter(x=>x.state==="clear").length,
      urgeOnlyDays:rows.filter(x=>x.state==="urge").length,
      unknownDays:rows.filter(x=>x.state==="unknown").length,
      totalQuantity:rows.reduce((sum,x)=>sum+x.quantity,0),
      lastUseAt:lastUse?.capabilities?.trackable?.timestamp||null,
      series:rows
    };
  }

  global.PrometeoBehavior=Object.freeze({
    KINDS,GOAL_MODES,localDateKey,shiftDateKey,createTracker,log,logUse,logUrge,markClear,
    logsFor,dayState,series,stats
  });
})(window);
