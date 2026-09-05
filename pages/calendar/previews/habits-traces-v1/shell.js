const SHELL_PALETTES=[
  ['#F5DABF','#6C151E'],['#F5DABF','#0F3D3A'],['#6C151E','#0F3D3A'],['#C7F464','#202124'],['#FF6B6B','#6B1839'],['#F5DABF','#1546A0'],['#B8E0D2','#174A3A'],['#F4B6C2','#5B2448'],['#F28C28','#102A43'],['#EADFCB','#1B1B1A'],['#E8CFAE','#144E52'],['#B94B32','#24201F'],['#D6A928','#2D3436']
];
const titleFor={calendar:'Calendario',habits:'Hábitos',money:'Dinero'};
let paletteIndex=Number(localStorage.getItem('prometeo-preview-theme-index')||0)%SHELL_PALETTES.length;
function applyPalette(){const [a,b]=SHELL_PALETTES[paletteIndex];document.documentElement.style.setProperty('--a',a);document.documentElement.style.setProperty('--b',b);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',a);syncFrameTheme();}
function syncFrameTheme(){
  const frame=document.getElementById('romanticCalendarFrame');
  try{const doc=frame?.contentDocument;if(!doc)return;const a=getComputedStyle(document.documentElement).getPropertyValue('--a').trim(),b=getComputedStyle(document.documentElement).getPropertyValue('--b').trim();doc.documentElement.style.setProperty('--a',a);doc.documentElement.style.setProperty('--b',b);doc.body.style.setProperty('--a',a);doc.body.style.setProperty('--b',b);}catch{}
}
function setSpace(space,{replace=false}={}){
  if(!titleFor[space])space='calendar';
  document.querySelectorAll('#modeSwitch button').forEach(b=>b.classList.toggle('active',b.dataset.space===space));
  document.querySelectorAll('.space').forEach(s=>{const active=s.id===space+'Space';s.hidden=!active;s.classList.toggle('active',active);});
  activeTitle.textContent=titleFor[space];
  const url=new URL(location.href);url.searchParams.set('view',space);url.searchParams.delete('utm_source');
  history[replace?'replaceState':'pushState']({space},'',url);
  if(space==='calendar')setTimeout(()=>window.fitRomanticCalendar?.(),30);
}
modeSwitch.onclick=e=>{const b=e.target.closest('button[data-space]');if(b)setSpace(b.dataset.space);};
themeButton.onclick=()=>{paletteIndex=(paletteIndex+1)%SHELL_PALETTES.length;localStorage.setItem('prometeo-preview-theme-index',String(paletteIndex));applyPalette();};
window.addEventListener('popstate',()=>setSpace(new URL(location.href).searchParams.get('view')||'calendar',{replace:true}));
applyPalette();
setSpace(new URL(location.href).searchParams.get('view')||'calendar',{replace:true});
