import {validateGraph,planSignal} from './core.mjs';
const mount=document.getElementById('universalEntryMount');
const NS='http://www.w3.org/2000/svg';
const elm=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const svgEl=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));return n;};
const validLink=v=>typeof v==='string'&&/^https:\/\/github\.com\/JuanManuelPM\/prometeo\/(blob|pull|issues|actions|commit)\//.test(v);
function button(label,action,group){const b=elm('button','',label);b.type='button';b.addEventListener('click',action);group.append(b);return b;}
function fail(msg){mount.replaceChildren(elm('div','ue-fail','Mapa no disponible: '+msg+'. Los proyectos existentes siguen funcionando.'));}
async function main(){
 if(!mount)return;
 let res;
 try{res=await fetch('./entrada-universal/graph.v1.json',{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);const g=await res.json();validateGraph(g);await render(g);}
 catch(e){fail(String(e.message||e));}
}
async function render(g){
 mount.replaceChildren();
 let active=g.routes[0],chosen=g.nodes[0],technical=false,evolution=false;
 const head=elm('header','ue-head'),hgroup=elm('div'),kicker=elm('div','ue-kicker','PERSISTENCIA / ENTRADA UNIVERSAL / CANDIDATO'),title=elm('h2','', 'El mapa de decisiones'),intro=elm('p','','Explorá qué ocurre desde un mensaje hasta un resultado durable. Las rutas A–E son ejemplos de prueba, no chats ejecutándose en vivo.');
 hgroup.append(kicker,title,intro);head.append(hgroup);
 const controls=elm('div','ue-buttons');
 const explain=button('Modo: humano',()=>{technical=!technical;explain.textContent=technical?'Modo: técnico':'Modo: humano';inspect();},controls);
 const compare=button('Arquitectura: actual',()=>{evolution=!evolution;compare.textContent=evolution?'Arquitectura: evolución':'Arquitectura: actual';compare.setAttribute('aria-pressed',String(evolution));drawGraph();inspect();},controls);
 head.append(controls);mount.append(head);
 const scenes=elm('nav','ue-scenes');scenes.setAttribute('aria-label','Escenarios de entrada');mount.append(scenes);
 const summary=elm('div','ue-summary');summary.dataset.demoId='universal.summary';const summaryKind=elm('span','ue-kicker'),summaryTitle=elm('strong'),summaryText=elm('p'),summaryStatus=elm('p');summary.append(summaryKind,summaryTitle,summaryText,summaryStatus);mount.append(summary);
 const dashboard=elm('div','ue-dashboard'),toolbar=elm('div','ue-toolbar'),toolCaption=elm('span','ue-mode-note','MAPA EXPLORABLE · arrastrá, pellizcá o usá teclado'),mapActions=elm('div','ue-buttons');toolbar.append(toolCaption,mapActions);dashboard.append(toolbar);
 const svg=svgEl('svg',{viewBox:'0 0 1070 760',class:'ue-map',role:'group','aria-label':'Grafo de decisiones. Usá las etapas de la lista para navegación accesible.',tabindex:'0'});svg.dataset.demoId='universal.graph';
 const root=svgEl('g'),links=svgEl('g'),shapes=svgEl('g');root.append(links,shapes);svg.append(root);dashboard.append(svg);
 const legend=elm('div','ue-legend');for(const [state,desc] of Object.entries(g.status_legend)){if(['verified','implemented','candidate','blocked','unknown'].includes(state)){const tag=elm('span',state);tag.append(elm('i','ue-dot'),document.createTextNode(desc));legend.append(tag);}}dashboard.append(legend);mount.append(dashboard);
 const lower=elm('div','ue-lower'),panel=elm('section','ue-inspect'),steps=elm('section','ue-steps');panel.dataset.demoId='universal.details';steps.dataset.demoId='universal.steps';lower.append(panel,steps);mount.append(lower);
 const boundary=elm('p','ue-boundary');boundary.append(elm('strong','','Límite de verdad'));boundary.append(document.createTextNode('Los nodos dibujados no ejecutan tareas. GitHub requiere permisos, ChatGPT no se inicia desde Pages y la publicación necesita gate independiente.'));mount.append(boundary);
 let cam={x:0,y:0,w:1070,h:760},gesture=new Map(),pointerStart=null;
 function box(){svg.setAttribute('viewBox',[cam.x,cam.y,cam.w,cam.h].join(' '));}
 function fitAll(){cam={x:0,y:-8,w:2310,h:710};box();}
 function zoom(factor){const cx=cam.x+cam.w/2,cy=cam.y+cam.h/2;cam.w=Math.max(280,Math.min(2800,cam.w*factor));cam.h=cam.w*760/1070;cam.x=cx-cam.w/2;cam.y=cy-cam.h/2;box();}
 function center(n){cam.w=690;cam.h=490;cam.x=n.x-230;cam.y=n.y-210;box();}
 button('−',()=>zoom(1.25),mapActions).setAttribute('aria-label','Alejar');
 button('+',()=>zoom(.8),mapActions).setAttribute('aria-label','Acercar');
 button('Ver todo',fitAll,mapActions);
 button('Centrar etapa',()=>center(chosen),mapActions);
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.12:.89);},{passive:false});
 function place(e){const r=svg.getBoundingClientRect();return {x:e.clientX,y:e.clientY,width:r.width,height:r.height};}
 svg.addEventListener('pointerdown',e=>{if(e.target.closest?.('.ue-node'))return;svg.setPointerCapture(e.pointerId);gesture.set(e.pointerId,place(e));pointerStart={cam:{...cam},point:place(e)};});
 svg.addEventListener('pointermove',e=>{
  if(!gesture.has(e.pointerId))return;
  const old=gesture.get(e.pointerId),next=place(e);gesture.set(e.pointerId,next);
  if(gesture.size===2){const list=[...gesture.values()];const dist=Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y);if(pointerStart?.dist)zoom(pointerStart.dist/dist);pointerStart={dist};return;}
  if(!pointerStart?.cam)return;
  cam.x=pointerStart.cam.x-(next.x-pointerStart.point.x)*cam.w/next.width;
  cam.y=pointerStart.cam.y-(next.y-pointerStart.point.y)*cam.h/next.height;box();
 });
 function release(e){gesture.delete(e.pointerId);if(!gesture.size)pointerStart=null;}
 svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);
 svg.addEventListener('keydown',e=>{
  if(e.target!==svg)return;
  if(e.key==='+'||e.key==='=')zoom(.8);else if(e.key==='-')zoom(1.25);
  else if(e.key==='Home')fitAll();
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){const d=cam.w*.13;if(e.key==='ArrowLeft')cam.x-=d;if(e.key==='ArrowRight')cam.x+=d;if(e.key==='ArrowUp')cam.y-=d;if(e.key==='ArrowDown')cam.y+=d;box();}
  else return;e.preventDefault();
 });
 function selectNode(n,centerView=false){chosen=n;drawGraph();inspect();if(centerView)center(n);}
 function activeEdges(){const s=new Set();for(let i=1;i<active.path.length;i++)s.add(active.path[i-1]+'>'+active.path[i]);return s;}
 function drawGraph(){
  links.replaceChildren();shapes.replaceChildren();
  const illuminated=new Set(active.path),edgeSet=activeEdges();
  for(const e of g.edges){const a=g.nodes.find(x=>x.id===e.from),b=g.nodes.find(x=>x.id===e.to),x=a.x+205,y=a.y+42,xx=b.x,yy=b.y+42;
   const bend=Math.max(25,(xx-x)/2);
   const path=svgEl('path',{d:'M '+x+' '+y+' C '+(x+bend)+' '+y+' '+(xx-bend)+' '+yy+' '+xx+' '+yy,class:'ue-link '+(edgeSet.has(e.from+'>'+e.to)?'active':'muted')});links.append(path);
  }
  g.nodes.forEach((n,i)=>{
   const group=svgEl('g',{class:'ue-node '+n.status+(chosen.id===n.id?' selected':'')+(!illuminated.has(n.id)&&!evolution?' ue-muted':''),transform:'translate('+n.x+' '+n.y+')',tabindex:'0',role:'button','aria-label':n.title+', '+g.status_legend[n.status]});
   group.dataset.node=n.id;group.dataset.demoId='universal.node.'+n.id;
   group.append(svgEl('rect',{width:205,height:90,rx:3}));
   group.append(svgEl('rect',{class:'strip',width:205,height:9}));
   for(const [t,x,y,klass] of [[String(i+1).padStart(2,'0'),12,29,'num'],[n.title,12,53,'name'],[n.status+' · v'+n.version,12,75,'sub']]){const label=svgEl('text',{x,y,class:klass});label.textContent=t;group.append(label);}
   group.addEventListener('click',()=>selectNode(n));
   group.addEventListener('keydown',e=>{
    if(['Enter',' '].includes(e.key)){e.preventDefault();selectNode(n,true);}
    if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=g.nodes[(i+(e.key==='ArrowRight'?1:g.nodes.length-1))%g.nodes.length];shapes.querySelector('[data-node="'+next.id+'"]')?.focus();selectNode(next,true);}
   });
   shapes.append(group);
  });
 }
 function inspect(){
  panel.replaceChildren(elm('div','ue-kicker','CARTUCHO / '+chosen.id.toUpperCase()),elm('h3','',chosen.title));
  panel.append(elm('p','',technical?chosen.responsibility+' · Estado: '+g.status_legend[chosen.status]:chosen.responsibility));
  const dl=elm('dl');
  const attrs=technical?[['Versión',chosen.version],['Estado',g.status_legend[chosen.status]],['Entrada',chosen.input],['Salida',chosen.output],['Dependencias',chosen.depends_on],['Permisos',chosen.permissions],['Estados',chosen.states.join(' → ')],['Fallo',chosen.failure],['Sustitución',chosen.migration]]:[['Estado',g.status_legend[chosen.status]],['Depende de',chosen.depends_on],['Resultado',chosen.output],['Puede cambiarse',chosen.migration.split(';')[0]]];
  attrs.forEach(([k,v])=>{dl.append(elm('dt','',k),elm('dd','',v));});panel.append(dl);
  if(validLink(chosen.source_url)){const a=elm('a','','Abrir evidencia / fuente ↗');a.href=chosen.source_url;a.target='_blank';a.rel='noopener noreferrer';panel.append(a);}
  else panel.append(elm('p','', 'Sin evidencia individual vinculada; componente candidato, no verificado.'));
 }
 function renderSteps(){
  steps.replaceChildren(elm('div','ue-kicker','RECORRIDO DEL MENSAJE'),elm('h3','',active.kind));
  const ol=elm('ol');for(const id of active.path){const n=g.nodes.find(x=>x.id===id),li=elm('li'),b=button(n.title,()=>selectNode(n,true),li);b.setAttribute('aria-label','Examinar '+n.title);ol.append(li);}steps.append(ol);
  steps.append(elm('p','ue-mode-note','Ejemplo con datos sintéticos, sin ejecutar escrituras.'));
 }
 function renderScenario(){
  summaryKind.textContent='ESCENARIO '+active.id.toUpperCase()+' / FIXTURE · NO EJECUCIÓN';
  summaryTitle.textContent='«'+active.prompt+'»';
  summaryText.textContent=active.expected;
  const plan=planSignal({intents:active.intents,entities:active.entities,uncertainty:active.uncertainty},[]);
  summaryStatus.textContent='Política: '+plan.kind+' · escrituras de esta demo: ninguna · incertidumbres: '+(active.uncertainty.join(', ')||'ninguna declarada');
  [...scenes.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.route===active.id)));
  drawGraph();renderSteps();inspect();
 }
 g.routes.forEach(route=>{const b=button(route.name,()=>{active=route;chosen=g.nodes.find(x=>x.id===route.path[0]);renderScenario();},scenes);b.dataset.route=route.id;b.dataset.demoId='universal.route.'+route.id;});
 renderScenario();box();
 // Public source modified time: verified from GitHub API, never inferred from local clock.
 const status=elm('p','ue-boundary','Última edición de fuente: sin comprobar. Esto no indica versión publicada.');
 mount.append(status);
 try{
  const url='https://api.github.com/repos/JuanManuelPM/prometeo/commits?path=tv/chat/relevo/retomar/entrada-universal/graph.v1.json&sha=gh-pages&per_page=1';
  const r=await fetch(url,{cache:'no-store'});
  if(r.ok){const json=await r.json(),at=json[0]?.commit?.committer?.date;
   if(at&&!Number.isNaN(Date.parse(at)))status.textContent='Última edición en rama pública: '+new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'medium',timeStyle:'short'}).format(new Date(at))+' (Argentina). No equivale a ejecución en vivo.';
  }
 }catch{}
}
main();
