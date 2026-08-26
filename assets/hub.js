const $=s=>document.querySelector(s);
const toneCycle=['#d8d2c5','#cfd4ca','#d8cec5','#c9d0d3','#d5d0c3','#cdd2c8'];
const stateLabels={live:'vivo',recovering:'recuperando',draft:'en preparación',archived:'archivo'};
let projects=[];let activeId=localStorage.getItem('prometeo.hub.active')||'';
function formatIndex(i){return String(i+1).padStart(2,'0')}
function card(p,i){
  const card=document.createElement('article');
  card.className='project-card'+(p.status==='live'?'':' unavailable');
  card.dataset.id=p.id;card.tabIndex=0;card.style.setProperty('--tone',toneCycle[i%toneCycle.length]);
  const openable=Boolean(p.public_url)&&p.status==='live';
  card.innerHTML=`<div class="project-inner"><div class="project-top"><span class="project-num">${formatIndex(i)}</span><span class="project-closed"></span><span class="project-state"></span></div><div class="project-open"><div class="kicker">${openable?'acceso disponible':'sin acceso público verificado'}</div><h2 class="project-name"></h2><div class="project-meta"></div><div class="project-description"></div></div><div class="enter-wrap"><button class="enter" type="button" ${openable?'':'disabled'}>${openable?'Abrir':'Pendiente'}</button></div></div>`;
  card.querySelector('.project-closed').textContent=p.title||p.id;
  card.querySelector('.project-state').textContent=stateLabels[p.status]||p.status||'';
  card.querySelector('.project-name').textContent=p.title||p.id;
  const meta=[p.subtitle,p.verified?`verificado ${p.verified}`:null].filter(Boolean);
  card.querySelector('.project-meta').textContent=meta.join(' · ');
  card.querySelector('.project-description').textContent=p.note||descriptionFor(p);
  card.addEventListener('click',e=>{if(e.target.closest('.enter'))return;activate(p.id);});
  card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(p.id)}});
  card.querySelector('.enter').addEventListener('click',e=>{e.stopPropagation();if(openable){localStorage.setItem('prometeo.hub.active',p.id);location.href=p.public_url}});
  return card;
}
function descriptionFor(p){
  if(p.id==='jose-study')return 'Clases y Study. Conserva la microapp completa al entrar.';
  if(p.id==='prometeo-workspace')return 'Memoria, fuentes y cambios de Prometeo sin mezclar la infraestructura con la portada.';
  if(p.id==='prometeo-current')return 'Superficie Prometeo anterior, preservada como acceso y referencia.';
  return 'Proyecto registrado en el mapa universal.';
}
function activate(id){
  activeId=id;localStorage.setItem('prometeo.hub.active',id);
  document.querySelectorAll('.project-card').forEach(el=>el.classList.toggle('active',el.dataset.id===id));
}
async function boot(){
  const res=await fetch('./projects.json',{cache:'no-store'});if(!res.ok)throw new Error('registry');
  const data=await res.json();projects=data.projects||[];
  const host=$('#projects');host.replaceChildren(...projects.map(card));
  const preferred=projects.some(p=>p.id===activeId)?activeId:(projects.find(p=>p.status==='live')?.id||projects[0]?.id);
  if(preferred)activate(preferred);
  $('#stamp').textContent=`Actualizado ${data.updated_at||'—'}`;
  window.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||!projects.length)return;
    const current=Math.max(0,projects.findIndex(p=>p.id===activeId));
    const delta=(e.key==='ArrowLeft'||e.key==='ArrowUp')?-1:1;
    activate(projects[(current+delta+projects.length)%projects.length].id);
    document.querySelector(`[data-id="${CSS.escape(activeId)}"]`)?.focus({preventScroll:true});
  });
}
boot().catch(()=>{$('#projects').innerHTML='<div class="hint">No pude cargar el registro de proyectos. Recargá la página.</div>'});
