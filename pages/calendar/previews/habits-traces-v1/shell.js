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

const THEME_KEY='prometeo-preview-theme-index';
const titleFor={calendar:'Calendario',habits:'Hábitos',money:'Dinero'};
let rawIndex=Number(localStorage.getItem(THEME_KEY)||0);
let paletteIndex=Number.isFinite(rawIndex)?((rawIndex%SHELL_PALETTES.length)+SHELL_PALETTES.length)%SHELL_PALETTES.length:0;

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

function applyPalette(){
  const [a,b]=SHELL_PALETTES[paletteIndex];
  document.documentElement.style.setProperty('--a',a);
  document.documentElement.style.setProperty('--b',b);
  document.documentElement.dataset.prometeoTheme=paletteIndex>=13?'dark':'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',a);
  syncFrameTheme();
}

/* Apply the saved palette immediately. When this file is loaded in <head>, dark themes do not flash light first. */
applyPalette();

function initShell(){
  const modeSwitch=document.getElementById('modeSwitch');
  const themeButton=document.getElementById('themeButton');
  const activeTitle=document.getElementById('activeTitle');
  if(!modeSwitch||!themeButton||!activeTitle)return;

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

  themeButton.addEventListener('click',()=>{
    paletteIndex=(paletteIndex+1)%SHELL_PALETTES.length;
    localStorage.setItem(THEME_KEY,String(paletteIndex));
    applyPalette();
  });

  window.addEventListener('popstate',()=>setSpace(new URL(location.href).searchParams.get('view')||'calendar',{replace:true}));
  document.getElementById('romanticCalendarFrame')?.addEventListener('load',syncFrameTheme);
  setSpace(new URL(location.href).searchParams.get('view')||'calendar',{replace:true});
  syncFrameTheme();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initShell,{once:true});
else initShell();
