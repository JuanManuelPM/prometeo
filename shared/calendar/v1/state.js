/* PROMETEO CALENDAR STATE v1
   One local source of truth. Public code; personal data stays in browser storage.
   A #pcal=<base64url-json> fragment may bootstrap state once; the fragment is then erased.
*/
(function(root){
  const KEY='prometeo.calendar.state.v1';
  const SCHEMA='prometeo.calendar-state/v1';
  const legacy={
    classes:'dated-calendar-classes-v8',rate:'dated-calendar-rate-v8',theme:'horarios-fijos-paleta-v4',history:'dated-calendar-income-history-v10',
    tasks:'prometeo-life-tasks-v18',personalEvents:'prometeo-life-events-v18',habits:'prometeo-life-habits-v18',habitLog:'prometeo-life-habit-log-v18',food:'prometeo-life-food-v18',shopping:'prometeo-life-shopping-v18'
  };
  const foodDefault={library:[],offsets:{},eaten:{}};
  const fresh=()=>({schema:SCHEMA,schemaVersion:1,updatedAt:new Date().toISOString(),settings:{theme:'bordo-crema',baseRate:0},calendar:{classes:[],university:[],opportunities:[],personalEvents:[]},life:{tasks:[],habits:[],habitLog:{},food:foodDefault,shopping:[]},finance:{history:{}}});
  const readJSON=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}};
  const clone=x=>JSON.parse(JSON.stringify(x));
  function normalize(input){
    const base=fresh(),s=input&&typeof input==='object'?input:{};
    return {
      ...base,...s,schema:SCHEMA,schemaVersion:1,updatedAt:new Date().toISOString(),
      settings:{...base.settings,...(s.settings||{})},
      calendar:{...base.calendar,...(s.calendar||{}),classes:Array.isArray(s.calendar?.classes)?s.calendar.classes:[],university:Array.isArray(s.calendar?.university)?s.calendar.university:[],opportunities:Array.isArray(s.calendar?.opportunities)?s.calendar.opportunities:[],personalEvents:Array.isArray(s.calendar?.personalEvents)?s.calendar.personalEvents:[]},
      life:{...base.life,...(s.life||{}),tasks:Array.isArray(s.life?.tasks)?s.life.tasks:[],habits:Array.isArray(s.life?.habits)?s.life.habits:[],habitLog:s.life?.habitLog&&typeof s.life.habitLog==='object'?s.life.habitLog:{},food:s.life?.food&&typeof s.life.food==='object'?s.life.food:clone(foodDefault),shopping:Array.isArray(s.life?.shopping)?s.life.shopping:[]},
      finance:{...base.finance,...(s.finance||{}),history:s.finance?.history&&typeof s.finance.history==='object'?s.finance.history:{}}
    };
  }
  function read(){return normalize(readJSON(KEY,fresh()))}
  function write(input){const state=normalize(input);localStorage.setItem(KEY,JSON.stringify(state));return state}
  function hasLegacy(){return Object.values(legacy).some(k=>localStorage.getItem(k)!==null)}
  function captureLegacy(){
    const s=read();
    s.settings.baseRate=Number(localStorage.getItem(legacy.rate))||s.settings.baseRate||0;
    s.settings.theme=localStorage.getItem(legacy.theme)||s.settings.theme||'bordo-crema';
    s.calendar.classes=readJSON(legacy.classes,s.calendar.classes||[]);
    s.calendar.personalEvents=readJSON(legacy.personalEvents,s.calendar.personalEvents||[]);
    s.life.tasks=readJSON(legacy.tasks,s.life.tasks||[]);
    s.life.habits=readJSON(legacy.habits,s.life.habits||[]);
    s.life.habitLog=readJSON(legacy.habitLog,s.life.habitLog||{});
    s.life.food=readJSON(legacy.food,s.life.food||clone(foodDefault));
    s.life.shopping=readJSON(legacy.shopping,s.life.shopping||[]);
    s.finance.history=readJSON(legacy.history,s.finance.history||{});
    return write(s);
  }
  function hydrateLegacy(state=read()){
    localStorage.setItem(legacy.classes,JSON.stringify(state.calendar.classes||[]));
    localStorage.setItem(legacy.rate,String(Number(state.settings.baseRate)||0));
    localStorage.setItem(legacy.theme,state.settings.theme||'bordo-crema');
    localStorage.setItem(legacy.history,JSON.stringify(state.finance.history||{}));
    localStorage.setItem(legacy.tasks,JSON.stringify(state.life.tasks||[]));
    localStorage.setItem(legacy.personalEvents,JSON.stringify(state.calendar.personalEvents||[]));
    localStorage.setItem(legacy.habits,JSON.stringify(state.life.habits||[]));
    localStorage.setItem(legacy.habitLog,JSON.stringify(state.life.habitLog||{}));
    localStorage.setItem(legacy.food,JSON.stringify(state.life.food||clone(foodDefault)));
    localStorage.setItem(legacy.shopping,JSON.stringify(state.life.shopping||[]));
  }
  const fromBase64Url=str=>{
    const b64=String(str).replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(str.length/4)*4,'=');
    const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };
  const toBase64Url=str=>{
    const bytes=new TextEncoder().encode(str);let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  };
  function importObject(obj){const s=write(obj);hydrateLegacy(s);return s}
  function importHash(){
    const m=location.hash.match(/^#pcal=([A-Za-z0-9_-]+)$/);if(!m)return false;
    try{importObject(JSON.parse(fromBase64Url(m[1])));history.replaceState(null,'',location.pathname+location.search);return true}catch(err){console.error('Calendar import failed',err);return false}
  }
  function exportDownload(){
    const blob=new Blob([JSON.stringify(captureLegacy(),null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='prometeo-calendar-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  async function importFile(file){const obj=JSON.parse(await file.text());importObject(obj);location.reload()}
  function bootstrap(){
    const imported=importHash();
    if(imported)return;
    if(localStorage.getItem(KEY)){hydrateLegacy(read());return}
    if(hasLegacy()){captureLegacy();return}
    const s=write(fresh());hydrateLegacy(s);
  }
  const api={version:'1',schema:SCHEMA,key:KEY,read,write,normalize,captureLegacy,hydrateLegacy,importObject,exportDownload,importFile,toBase64Url,fromBase64Url,bootstrap};
  root.PrometeoCalendarState=Object.freeze(api);bootstrap();
})(window);
