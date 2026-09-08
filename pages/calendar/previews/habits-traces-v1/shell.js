const SHELL_PALETTES=[
  /* Light / mid-tone palettes kept in their original order so saved theme indexes remain stable. */
  ['#F5DABF','#6C151E'],
  ['#F5DABF','#0F3D3A'],
  ['#B8E0D2','#6C151E'],
  ['#C7F464','#202124'],
  ['#FF8F8F','#5B1735'],
  ['#F5DABF','#1546A0'],
  ['#B8E0D2','#174A3A'],
  ['#F4B6C2','#5B2448'],
  ['#F28C28','#102A43'],
  ['#EADFCB','#1B1B1A'],
  ['#E8CFAE','#144E52'],
  ['#D96D52','#24201F'],
  ['#D6A928','#2D3436'],

  /* Dark palettes: --a remains the surface/background and --b the graphic/foreground color. */
  ['#121417','#F1C7A6'], /* carbón + durazno */
  ['#17131B','#F4B6C2'], /* ciruela negra + rosa */
  ['#0E1A1A','#B8E0D2'], /* petróleo + menta */
  ['#101828','#F28C28'], /* noche azul + naranja */
  ['#24181A','#E8CFAE'], /* vino negro + crema */
  ['#16120E','#D6A928'], /* café negro + mostaza */
  ['#102A43','#F5DABF'], /* azul profundo + piel */
  ['#1B1022','#D7B5FF']  /* violeta negro + lila */
];

const LIGHT_INDEXES=Array.from({length:13},(_,i)=>i);
const DARK_INDEXES=Array.from({length:SHELL_PALETTES.length-13},(_,i)=>i+13);
const THEME_KEY='prometeo-preview-theme-index';
const LAST_LIGHT_KEY='prometeo-preview-theme-light-index-v27';
const LAST_DARK_KEY='prometeo-preview-theme-dark-index-v27';
const titleFor={calendar:'Calendario',habits:'Hábitos',money:'Dinero'};

const normalizeIndex=value=>{
  const n=Number(value);
  return Number.isFinite(n)?((n%SHELL_PALETTES.length)+SHELL_PALETTES.length)%SHELL_PALETTES.length:0;
};
const familyOf=index=>index>=13?'dark':'light';
const indexesFor=family=>family==='dark'?DARK_INDEXES:LIGHT_INDEXES;
const validStored=(key,family,fallback)=>{
  const n=Number(localStorage.getItem(key));
  return Number.isInteger(n)&&indexesFor(family).includes(n)?n:fallback;
};

let paletteIndex=normalizeIndex(localStorage.getItem(THEME_KEY)||0);
let lastLightIndex=validStored(LAST_LIGHT_KEY,'light',LIGHT_INDEXES[0]);
let lastDarkIndex=validStored(LAST_DARK_KEY,'dark',DARK_INDEXES[0]);
if(familyOf(paletteIndex)==='light')lastLightIndex=paletteIndex;
else lastDarkIndex=paletteIndex;

function syncFrameTheme(){
  const frame=document.getElementById('romanticCalendarFrame');
  try{
    const doc=frame?.contentDocument;
    if(!doc)return;
    const styles=getComputedStyle(document.documentElement);
    const a=styles.getPropertyValue('--a').trim();
    const b=styles.getPropertyValue('--b').trim();
    doc.documentElement.style.setProperty('--a',a);
    doc.documentElement.style.setProperty('--b',b);
    doc.body?.style.setProperty('--a',a);
    doc.body?.style.setProperty('--b',b);
  }catch{}
}

function updateThemeButtons(){
  const family=familyOf(paletteIndex);
  const light=document.getElementById('lightThemeButton');
  const dark=document.getElementById('darkThemeButton');
  [light,dark].forEach(button=>button?.classList.remove('is-active'));
  const active=family==='light'?light:dark;
  active?.classList.add('is-active');
  light?.setAttribute('aria-pressed',String(family==='light'));
  dark?.setAttribute('aria-pressed',String(family==='dark'));

  const indexes=indexesFor(family);
  const pos=indexes.indexOf(paletteIndex)+1;
  if(active)active.title=`${family==='light'?'Tema claro':'Tema oscuro'} ${pos} de ${indexes.length}`;
}

function applyPalette(){
  const [a,b]=SHELL_PALETTES[paletteIndex];
  document.documentElement.style.setProperty('--a',a);
  document.documentElement.style.setProperty('--b',b);
  document.documentElement.dataset.prometeoTheme=familyOf(paletteIndex);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',a);
  updateThemeButtons();
  syncFrameTheme();
}

function persistPalette(){
  localStorage.setItem(THEME_KEY,String(paletteIndex));
  if(familyOf(paletteIndex)==='light'){
    lastLightIndex=paletteIndex;
    localStorage.setItem(LAST_LIGHT_KEY,String(lastLightIndex));
  }else{
    lastDarkIndex=paletteIndex;
    localStorage.setItem(LAST_DARK_KEY,String(lastDarkIndex));
  }
}

function stepFamily(family){
  const indexes=indexesFor(family);
  if(familyOf(paletteIndex)!==family){
    paletteIndex=family==='light'?lastLightIndex:lastDarkIndex;
  }else{
    const pos=indexes.indexOf(paletteIndex);
    paletteIndex=indexes[(pos+1)%indexes.length];
  }
  persistPalette();
  applyPalette();
}

/* Apply the saved palette immediately. When this file is loaded in <head>, dark themes do not flash light first. */
applyPalette();

function initShell(){
  const modeSwitch=document.getElementById('modeSwitch');
  const lightThemeButton=document.getElementById('lightThemeButton');
  const darkThemeButton=document.getElementById('darkThemeButton');
  const activeTitle=document.getElementById('activeTitle');
  if(!modeSwitch||!lightThemeButton||!darkThemeButton||!activeTitle)return;

  function setSpace(space,{replace=false}={}){
    if(!titleFor[space])space='calendar';
    document.querySelectorAll('#modeSwitch button').forEach(b=>b.classList.toggle('active',b.dataset.space===space));
    document.querySelectorAll('.space').forEach(s=>{
      const active=s.id===space+'Space';
      s.hidden=!active;
      s.classList.toggle('active',active);
    });
    activeTitle.textContent=titleFor[space];
    const url=new URL(location.href);
    url.searchParams.set('view',space);
    url.searchParams.delete('utm_source');
    history[replace?'replaceState':'pushState']({space},'',url);
    if(space==='calendar')setTimeout(()=>window.fitRomanticCalendar?.(),30);
    if(space==='money')setTimeout(()=>window.renderPrometeoMoney?.(),30);
  }

  modeSwitch.addEventListener('click',e=>{
    const b=e.target.closest('button[data-space]');
    if(b)setSpace(b.dataset.space);
  });

  lightThemeButton.addEventListener('click',()=>stepFamily('light'));
  darkThemeButton.addEventListener('click',()=>stepFamily('dark'));

  window.addEventListener('popstate',()=>setSpace(new URL(location.href).searchParams.get('view')||'calendar',{replace:true}));
  document.getElementById('romanticCalendarFrame')?.addEventListener('load',syncFrameTheme);
  setSpace(new URL(location.href).searchParams.get('view')||'calendar',{replace:true});
  updateThemeButtons();
  syncFrameTheme();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initShell,{once:true});
else initShell();
