const API='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-drive-text-demo-v1';
const KEY='prometeo_library_share_modelos_ii';
const POS_PREFIX='prometeo_reader_pos:';

const $=id=>document.getElementById(id);
const browser=$('browser'),reader=$('reader'),list=$('list'),title=$('folderTitle'),crumb=$('crumb'),count=$('folderCount'),back=$('back');
const searchToggle=$('searchToggle'),searchPanel=$('searchPanel'),searchInput=$('search'),snapshot=$('snapshot'),mode=$('mode');
const readerTitle=$('readerTitle'),readerKind=$('readerKind'),readerBody=$('readerBody'),readerMeta=$('readerMeta');
const sourceLabel=$('sourceLabel'),sourceMeta=$('sourceMeta'),documentLabel=$('documentLabel'),documentMeta=$('documentMeta'),readerState=$('readerState');
const readerNav=$('readerNav'),readerPrev=$('readerPrev'),readerNext=$('readerNext'),readerProgress=$('readerProgress');

let share='',nodes=[],byId=new Map(),childrenMap=new Map();
let folderState={ids:['root'],label:'Psicología',path:[]},historyStack=[],searching=false;
let currentPayload=null,currentSegmentIndex=0,lastOpenId='',scrollTick=false;

const demoNodes=[
 {node_id:'demo:modelos',parent_id:'root',node_type:'folder',title:'Modelos y Teorías II',mime_type:'application/vnd.google-apps.folder',text_status:'folder',sort_order:1},
 {node_id:'demo:doc',parent_id:'demo:modelos',node_type:'file',title:'Documento canónico de prueba',mime_type:'text/plain',text_status:'extracted',sort_order:1,demo_text:'Drive sigue siendo la fuente, pero el lector ya no depende de Drive.\n\nEl archivo se identifica en el índice, se obtiene desde la fuente, se extrae una sola vez y se guarda. Después se normaliza como documento canónico.\n\nEl Reader recibe bloques de texto y locators. No necesita saber si el origen fue PDF, DOCX, Google Docs o texto simple.\n\nSi una carpeta existe dos veces por una reconstrucción anterior del índice, esta versión agrupa ambas entradas antes de mostrarla. Así una carpeta sintética vacía no tapa a la carpeta real con contenido.'},
 {node_id:'demo:pdf',parent_id:'demo:modelos',node_type:'file',title:'Ejemplo PDF ya extraído',mime_type:'application/pdf',text_status:'extracted',sort_order:2,demo_text:'Este ejemplo representa un PDF que ya pasó por el extractor.\n\nLa segunda apertura se resuelve desde caché y no vuelve a descargar ni procesar el archivo.'}
];

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/\s+/g,' ');
function auth(){
 const p=new URLSearchParams(location.hash.slice(1)),incoming=p.get('share')||'';
 if(incoming){localStorage.setItem(KEY,incoming);history.replaceState(null,'',location.pathname+location.search)}
 share=localStorage.getItem(KEY)||'';
}
async function api(body){
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({share,...body}),cache:'no-store'});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||String(r.status));
 return j;
}
function typeLabel(n){
 const m=String(n.mime_type||'').toLowerCase(),t=String(n.title||'').toLowerCase();
 if(m.includes('pdf')||t.endsWith('.pdf'))return'PDF';
 if(m.includes('google-apps.document'))return'GOOGLE DOC';
 if(m.includes('word')||/\.docx?$/.test(t))return'WORD';
 if(m.includes('presentation')||/\.pptx?$/.test(t))return'PRESENTACIÓN';
 if(m.includes('sheet')||/\.xlsx?$/.test(t))return'PLANILLA';
 if(m.startsWith('text/')||/\.(txt|md|csv)$/.test(t))return'TEXTO';
 if(m.startsWith('image/'))return'IMAGEN';
 return'ARCHIVO';
}
function buildMaps(){
 byId=new Map(nodes.map(n=>[n.node_id,n]));childrenMap=new Map();
 for(const n of nodes){
   if(!childrenMap.has(n.parent_id))childrenMap.set(n.parent_id,[]);
   childrenMap.get(n.parent_id).push(n);
 }
 for(const arr of childrenMap.values())arr.sort((a,b)=>a.node_type===b.node_type?(Number(a.sort_order||0)-Number(b.sort_order||0)||String(a.title).localeCompare(String(b.title),'es')):(a.node_type==='folder'?-1:1));
}
function physicalChildren(ids){
 const seen=new Set(),out=[];
 for(const id of ids)for(const n of(childrenMap.get(id)||[]))if(!seen.has(n.node_id)){seen.add(n.node_id);out.push(n)}
 return out;
}
function logicalChildren(ids){
 const raw=physicalChildren(ids),folders=new Map(),files=[],fileSeen=new Set();
 for(const n of raw){
   if(n.node_type==='folder'){
     const k=norm(n.title);if(!folders.has(k))folders.set(k,{kind:'folder',label:String(n.title||'Carpeta').trim(),ids:[],sort:Number(n.sort_order||0)});
     const g=folders.get(k);g.ids.push(n.node_id);g.sort=Math.min(g.sort,Number(n.sort_order||0));
     if(!/^year:|^root:/.test(n.node_id))g.label=String(n.title||g.label).trim();
   }else if(!fileSeen.has(n.node_id)){fileSeen.add(n.node_id);files.push({kind:'file',node:n,sort:Number(n.sort_order||0)})}
 }
 return [...folders.values(),...files].sort((a,b)=>a.kind===b.kind?(a.sort-b.sort||String(a.label||a.node?.title).localeCompare(String(b.label||b.node?.title),'es')):(a.kind==='folder'?-1:1));
}
function descendantFiles(ids){
 let total=0,stack=[...ids],seenFolders=new Set(),seenFiles=new Set();
 while(stack.length){
   const id=stack.pop();if(seenFolders.has(id))continue;seenFolders.add(id);
   for(const n of(childrenMap.get(id)||[])){
     if(n.node_type==='folder')stack.push(n.node_id);
     else if(!seenFiles.has(n.node_id)){seenFiles.add(n.node_id);total++}
   }
 }
 return total;
}
function itemRow(x,searchMode=false){
 if(x.kind==='folder'){
   const side=descendantFiles(x.ids)+' archivos';
   return '<button class="row" data-kind="folder" data-ids="'+esc(x.ids.join(','))+'" data-label="'+esc(x.label)+'"><span class="folder-icon"></span><span><span class="row-title">'+esc(x.label)+'</span><span class="row-meta">Carpeta'+(x.ids.length>1?' · entradas fusionadas':'')+'</span></span><span class="row-side">'+esc(side)+'</span></button>';
 }
 const n=x.node,side=n.text_status==='extracted'?'TEXTO':'ABRIR';
 return '<button class="row" data-kind="file" data-id="'+esc(n.node_id)+'"><span class="file-icon"></span><span><span class="row-title">'+esc(n.title)+'</span><span class="row-meta">'+esc(typeLabel(n)+(searchMode?' · '+pathForNode(n):''))+'</span></span><span class="row-side '+(n.text_status==='extracted'?'ready':'')+'">'+side+'</span></button>';
}
function pathForNode(n){
 const parts=[],seen=new Set();let id=n.parent_id;
 while(id&&id!=='root'&&!seen.has(id)&&parts.length<20){seen.add(id);const p=byId.get(id);if(!p)break;parts.unshift(p.title);id=p.parent_id}
 return parts.join(' / ');
}
function bindRows(){
 list.querySelectorAll('.row').forEach(b=>b.onclick=()=>{
   if(b.dataset.kind==='folder')openFolder((b.dataset.ids||'').split(',').filter(Boolean),b.dataset.label||'Carpeta');
   else openFile(b.dataset.id);
 });
}
function renderFolder(){
 searching=false;searchInput.value='';
 const xs=logicalChildren(folderState.ids);
 title.textContent=folderState.label;
 crumb.textContent=folderState.path.length?folderState.path.join(' / '):'PSICOLOGÍA';
 count.textContent=xs.length+' elementos';
 back.hidden=!historyStack.length;
 list.innerHTML=xs.length?xs.map(x=>itemRow(x)).join(''):'<div class="empty">Sin elementos visibles en este nivel.</div>';
 bindRows();
}
function openFolder(ids,label){
 historyStack.push(folderState);
 folderState={ids,label,path:[...folderState.path,folderState.label].filter(x=>x!=='Psicología')};
 renderFolder();window.scrollTo({top:0,behavior:'instant'});
}
function search(q){
 const term=norm(q);
 if(!term){renderFolder();return}
 searching=true;back.hidden=false;
 const hits=[],seen=new Set();
 for(const n of nodes){
   if(n.node_type!=='file'||seen.has(n.node_id)||!norm(n.title).includes(term))continue;
   seen.add(n.node_id);hits.push({kind:'file',node:n,sort:Number(n.sort_order||0)});
   if(hits.length>=120)break;
 }
 title.textContent='Buscar';crumb.textContent=q.trim();count.textContent=hits.length+(hits.length===120?' +':' resultados');
 list.innerHTML=hits.length?hits.map(x=>itemRow(x,true)).join(''):'<div class="empty">Sin resultados.</div>';bindRows();
}
function stage(name,state){
 const el=document.querySelector('[data-stage="'+name+'"]');if(el)el.dataset.state=state||'';
}
function resetStages(){for(const el of document.querySelectorAll('.pipeline span'))delete el.dataset.state}
function setReaderState(kind='',headline='',detail='',retry=false){
 readerState.dataset.kind=kind;
 readerState.innerHTML=headline?'<div><strong>'+esc(headline)+'</strong>'+(detail?'<span>'+esc(detail)+'</span>':'')+'</div>'+(retry?'<button id="readerRetry" type="button">Reintentar</button>':''):'';
 const b=$('readerRetry');if(b)b.onclick=()=>lastOpenId&&openFile(lastOpenId);
}
async function digest(s){
 const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function canonicalize(n,text){
 const cleaned=String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
 const pages=cleaned.includes('\f')?cleaned.split(/\f+/):[cleaned];
 const sections=[],segments=[];let order=0;
 pages.forEach((page,pi)=>{
   const blocks=page.split(/\n\s*\n+/).map(x=>x.replace(/\s*\n\s*/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
   const section_id='sec-'+String(pi+1).padStart(4,'0'),ids=[];
   for(const text of blocks){
     const segment_id='seg-'+String(order+1).padStart(6,'0');ids.push(segment_id);
     segments.push({segment_id,section_id,order:order++,kind:'paragraph',text,source_locators:[{kind:'page',page:pi+1}]});
   }
   if(ids.length)sections.push({section_id,order:sections.length,segment_ids:ids});
 });
 const contentHash=await digest(segments.map(x=>x.text).join('\n\n'));
 return {schema:'prometeo.canonical-document/v1',document_id:'doc1:sha256:'+contentHash,title:n.title,language:'es-AR',source:{provider:'drive',provider_item_id:n.node_id,mime_type:n.mime_type||null},sections,segments};
}
function projectReader(doc){
 return {schema:'prometeo.reader-payload/v1',document_id:doc.document_id,title:doc.title,sections:doc.sections,segments:doc.segments,readable_text:doc.segments.map(s=>s.text).join('\n\n')};
}
function renderReaderPayload(payload){
 currentPayload=payload;
 if(!payload.segments.length){readerBody.innerHTML='';readerNav.hidden=true;setReaderState('empty','Sin texto legible','La extracción terminó sin bloques que el lector pueda presentar.');return}
 const sectionIndex=new Map(payload.sections.map((s,i)=>[s.section_id,i+1]));
 const bySection=new Map();for(const seg of payload.segments){if(!bySection.has(seg.section_id))bySection.set(seg.section_id,[]);bySection.get(seg.section_id).push(seg)}
 let globalIndex=0;
 readerBody.innerHTML=[...bySection.entries()].map(([sid,segs])=>'<section class="doc-section"><h2>'+(payload.sections.length>1?'Página '+sectionIndex.get(sid):'Texto')+'</h2>'+segs.map(seg=>{const i=globalIndex++;return '<p class="reader-segment" tabindex="0" data-marker="BLOQUE '+(i+1)+'" data-segment-index="'+i+'">'+esc(seg.text)+'</p>'}).join('')+'</section>').join('');
 readerBody.querySelectorAll('.reader-segment').forEach(el=>{
   el.onclick=()=>selectSegment(Number(el.dataset.segmentIndex),false);
   el.onfocus=()=>selectSegment(Number(el.dataset.segmentIndex),false);
 });
 readerNav.hidden=false;
}
function savedPosition(documentId){
 const raw=Number(localStorage.getItem(POS_PREFIX+documentId));
 return Number.isFinite(raw)&&raw>=0?raw:0;
}
function selectSegment(index,scroll=true){
 if(!currentPayload?.segments?.length)return;
 currentSegmentIndex=Math.max(0,Math.min(index,currentPayload.segments.length-1));
 const els=[...readerBody.querySelectorAll('.reader-segment')];
 els.forEach((el,i)=>el.classList.toggle('is-current',i===currentSegmentIndex));
 readerPrev.disabled=currentSegmentIndex===0;
 readerNext.disabled=currentSegmentIndex===currentPayload.segments.length-1;
 readerProgress.textContent=(currentSegmentIndex+1)+' / '+currentPayload.segments.length;
 localStorage.setItem(POS_PREFIX+currentPayload.document_id,String(currentSegmentIndex));
 if(scroll&&els[currentSegmentIndex])els[currentSegmentIndex].scrollIntoView({behavior:'smooth',block:'center'});
}
function syncSegmentFromViewport(){
 if(reader.hidden||!currentPayload?.segments?.length)return;
 const els=[...readerBody.querySelectorAll('.reader-segment')];
 const target=innerHeight*.46;let best=currentSegmentIndex,bestDistance=Infinity;
 els.forEach((el,i)=>{const r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;const d=Math.abs((r.top+r.bottom)/2-target);if(d<bestDistance){bestDistance=d;best=i}});
 if(best!==currentSegmentIndex)selectSegment(best,false);
}
async function openFile(id){
 const n=byId.get(id);if(!n)return;
 lastOpenId=id;currentPayload=null;currentSegmentIndex=0;readerNav.hidden=true;
 browser.hidden=true;reader.hidden=false;resetStages();stage('index','done');stage('source','active');
 readerTitle.textContent=n.title;readerKind.textContent=typeLabel(n)+' · '+(pathForNode(n)||'Drive');
 sourceLabel.textContent=typeLabel(n)+' en Drive';
 sourceMeta.textContent=(pathForNode(n)||'Raíz')+' · id '+n.node_id;
 documentLabel.textContent='Pendiente';documentMeta.textContent='Esperando extracción y normalización.';
 readerMeta.textContent='Índice resuelto. La fuente y el documento de lectura se procesan por separado.';
 readerBody.innerHTML='';
 setReaderState('loading','Abriendo fuente','Localizando el contenido y comprobando si existe texto cacheado.');
 try{
   let text='',cache='demo';
   if(n.demo_text){text=n.demo_text;stage('source','done');stage('extract','done');sourceMeta.textContent+=' · demostración local'}
   else{
     const d=await api({action:'read',node_id:id}),f=d.file||{};cache=d.cache||'unknown';
     stage('source','done');stage('extract',f.text_status==='extracted'?'done':'active');
     n.text_status=f.text_status||n.text_status;text=f.text_content||'';
     sourceMeta.textContent=(pathForNode(n)||'Raíz')+' · '+(cache==='hit'?'texto cacheado':cache==='created'?'texto recién extraído':'fuente localizada');
     if(f.text_status!=='extracted'||!text){
       stage('extract','');documentLabel.textContent='No disponible';documentMeta.textContent='No se generó un documento canónico.';
       readerMeta.textContent='La fuente sigue identificada aunque esta apertura no produjo texto.';
       setReaderState('error',f.text_status==='unsupported'?'Formato todavía sin extractor':'No apareció texto legible',f.text_status==='unsupported'?'El archivo está indexado, pero este formato todavía no puede convertirse en texto.':'La fuente fue localizada, pero no entregó contenido legible.',f.text_status!=='unsupported');
       return;
     }
   }
   stage('extract','done');stage('canonical','active');setReaderState('loading','Normalizando documento','Separando bloques y conservando locators de origen.');
   const canonical=await canonicalize(n,text);stage('canonical','done');stage('reader','active');
   const payload=projectReader(canonical);renderReaderPayload(payload);stage('reader','done');
   documentLabel.textContent=payload.segments.length+' bloques listos';
   documentMeta.textContent='prometeo.reader-payload/v1 · '+canonical.document_id.slice(-12)+' · posición guardada localmente';
   readerMeta.textContent=(cache==='hit'?'Caché reutilizada':cache==='created'?'Texto extraído y cacheado':cache==='demo'?'Demostración local':'Texto disponible')+' · '+payload.readable_text.length.toLocaleString('es-AR')+' caracteres · Drive permanece como fuente, Reader consume la proyección normalizada.';
   setReaderState();
   if(payload.segments.length)selectSegment(savedPosition(payload.document_id),false);
 }catch(e){
   documentLabel.textContent='Interrumpido';documentMeta.textContent='No se modificó el índice ni la fuente.';
   readerMeta.textContent='El índice quedó intacto; falló una etapa posterior.';
   setReaderState('error','No pude preparar este archivo',e.message||'Error desconocido',true);
 }
 window.scrollTo({top:0,behavior:'instant'});
}
back.onclick=()=>{if(searching){renderFolder();return}if(!historyStack.length)return;folderState=historyStack.pop();renderFolder();window.scrollTo({top:0,behavior:'instant'})};
$('readerBack').onclick=()=>{reader.hidden=true;browser.hidden=false;currentPayload=null;readerNav.hidden=true;renderFolder();window.scrollTo({top:0,behavior:'instant'})};
searchToggle.onclick=()=>{searchPanel.hidden=!searchPanel.hidden;if(!searchPanel.hidden)searchInput.focus();else renderFolder()};
searchInput.oninput=()=>search(searchInput.value);

readerPrev.onclick=()=>selectSegment(currentSegmentIndex-1,true);
readerNext.onclick=()=>selectSegment(currentSegmentIndex+1,true);
addEventListener('keydown',e=>{
 if(reader.hidden||!currentPayload?.segments?.length||/INPUT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
 if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();selectSegment(currentSegmentIndex+1,true)}
 if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();selectSegment(currentSegmentIndex-1,true)}
});
addEventListener('scroll',()=>{
 if(scrollTick)return;scrollTick=true;requestAnimationFrame(()=>{scrollTick=false;syncSegmentFromViewport()});
},{passive:true});

(async()=>{
 auth();
 try{
   if(share){
     const d=await api({action:'list'});nodes=d.nodes||[];
     mode.textContent='DRIVE REAL · extracción bajo demanda';
     const folders=nodes.filter(n=>n.node_type==='folder').length,files=nodes.filter(n=>n.node_type==='file').length,ready=nodes.filter(n=>n.text_status==='extracted').length;
     snapshot.textContent=(d.snapshot?.nodes||nodes.length).toLocaleString('es-AR')+' nodos · '+folders+' carpetas · '+files+' archivos · '+ready+' textos cacheados';
   }else{
     nodes=demoNodes;mode.textContent='DEMO SEGURA · agregá tu permiso para abrir Drive real';
     snapshot.textContent='Modo de demostración · mismo pipeline y navegación, sin publicar bibliografía privada';
   }
   buildMaps();renderFolder();
 }catch(e){
   nodes=demoNodes;buildMaps();mode.textContent='DEMO SEGURA · backend privado no disponible';
   snapshot.textContent='El índice remoto no respondió; la demostración local sigue disponible.';
   renderFolder();
 }
})();