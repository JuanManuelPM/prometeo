(()=>{
  const STATE_KEY='prometeo.calendar.state.v1';
  const CLASS_KEY='dated-calendar-classes-v8';
  const RATE_KEY='dated-calendar-rate-v8';
  const SEED_KEY='prometeo.preview.profile-seed.v1';

  const university=[
    {id:'up-modelos3',subject:'Modelos y Teorías 3',detail:'Psicología Sistémica y Conductismo',weekday:0,from:'2026-08-03',to:'2026-11-20',start:8*60+30,duration:3.5,room:'Mario Bravo 1259 · PB-01'},
    {id:'up-social',subject:'Psicología Social',detail:'Matías Bucosky Yolde',weekday:1,from:'2026-08-03',to:'2026-11-20',start:8*60+30,duration:3.5,room:'Mario Bravo 1259 · 01-11'},
    {id:'up-estadistica',subject:'Estadística Aplicada a la Psicología',detail:'Elba Fuertes',weekday:2,from:'2026-08-18',to:'2026-11-27',start:8*60+30,duration:3,room:'Mario Bravo 1302 · PB-B4'},
    {id:'up-modelos2',subject:'Modelos y Teorías 2',detail:'Psicología Genética y Cognitiva',weekday:3,from:'2026-08-03',to:'2026-11-20',start:8*60+30,duration:3.5,room:'Mario Bravo 1259 · 01-06'},
    {id:'up-evolutiva1',subject:'Psicología Evolutiva 1',detail:'Niños y Adolescentes',weekday:4,from:'2026-08-03',to:'2026-11-20',start:8*60+30,duration:3.5,room:'Mario Bravo 1259 · 01-10'}
  ];

  const classes=[
    {id:'sandy-fixed',name:'Sandy',type:'fixed',weekday:0,date:null,start:18*60,duration:1,rate:50000},
    {id:'jose-fixed',name:'José',type:'fixed',weekday:2,date:null,start:18*60,duration:1,rate:50000},
    {id:'thursday-fixed',name:'Clase fija · nombre a confirmar',type:'fixed',weekday:3,date:null,start:18*60,duration:1,rate:50000},
    {id:'replacement-20260910',name:'Biology IGCSE · reemplazo',type:'temporary',weekday:null,date:'2026-09-10',start:17*60+30,duration:1,rate:50000},
    {id:'replacement-20260917',name:'Biology IGCSE · reemplazo',type:'temporary',weekday:null,date:'2026-09-17',start:17*60+30,duration:1,rate:50000},
    {id:'replacement-20260924',name:'Biology IGCSE · reemplazo',type:'temporary',weekday:null,date:'2026-09-24',start:17*60+30,duration:1,rate:50000}
  ];

  const opportunities=[
    {id:'potential-20260916',label:'Clase potencial',date:'2026-09-16',duration:1,rate:50000,note:'Hora a definir'},
    {id:'potential-20261026',label:'Clase potencial',date:'2026-10-26',duration:1,rate:50000,note:'Hora a definir'},
    {id:'potential-20261029',label:'Clase potencial',date:'2026-10-29',start:19*60,duration:1,rate:50000,note:'Potencial'}
  ];

  const safeJSON=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
  const current=safeJSON(localStorage.getItem(STATE_KEY),null)||{
    schema:'prometeo.calendar-state/v1',schemaVersion:1,updatedAt:new Date().toISOString(),settings:{theme:'bordo-crema',baseRate:50000},calendar:{classes:[],university:[],opportunities:[],personalEvents:[]},life:{tasks:[],habits:[],habitLog:{},food:{library:[],offsets:{},eaten:{}},shopping:[]},finance:{history:{}}
  };

  current.settings=current.settings||{};
  current.calendar=current.calendar||{};

  if(!localStorage.getItem(SEED_KEY)){
    if(!Array.isArray(current.calendar.classes)||current.calendar.classes.length===0)current.calendar.classes=classes;
    if(!Array.isArray(current.calendar.university)||current.calendar.university.length===0)current.calendar.university=university;
    if(!Array.isArray(current.calendar.opportunities)||current.calendar.opportunities.length===0)current.calendar.opportunities=opportunities;
    current.settings.baseRate=Number(current.settings.baseRate)||50000;
    current.updatedAt=new Date().toISOString();
    localStorage.setItem(STATE_KEY,JSON.stringify(current));
    localStorage.setItem(SEED_KEY,new Date().toISOString());
  }

  const effective=safeJSON(localStorage.getItem(STATE_KEY),current);
  localStorage.setItem(CLASS_KEY,JSON.stringify(Array.isArray(effective.calendar?.classes)?effective.calendar.classes:[]));
  if(!Number(localStorage.getItem(RATE_KEY)))localStorage.setItem(RATE_KEY,'50000');

  window.PrometeoPreviewProfile=Object.freeze({version:'1',university,classes,opportunities});
})();
