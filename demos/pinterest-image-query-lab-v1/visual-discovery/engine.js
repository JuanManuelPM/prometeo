"use strict";
// Prometeo Visual Discovery 01. No search-result mocks. No hidden iframe.
// Source: existing, separately owned Pinterest native search edge function.
const API="https://catnohyouxqjjtseaueb.supabase.co/functions/v1/pinterest-image-search-v1";
const LAB="pql-v1-7f2b9e31";
const STORE="prometeo_visual_discovery_papercraft_v01";
const REF=[
 {id:"gato",name:"EL GATO",sub:"PAPERIZED / MUNCHKIN KITTY",img:"https://i.pinimg.com/736x/2d/4c/1a/2d4c1aeaae5e8734c164450f7ade9b4a.jpg",source:"https://www.paperizedcrafts.com/2022/03/munchkin-kitty-papercraft.html",terms:["paperized","munchkin kitty","el gato","realistic textured paper toy","3d cat net"]},
 {id:"hotdog",name:"HOT DOG PRINCESS",sub:"ADVENTURE TIME / PAPER FOLDABLE",img:"https://4.bp.blogspot.com/-DjXISD1YA8I/UaakSeE7vHI/AAAAAAAAMQE/aOHCJrzW-yE/s1600/adventure-time-hotdog-extra-cutout.jpg",source:"https://andresipes.blogspot.com/2022/06/adventure-time-paper-foldables-tubbypaws.html",terms:["adventure time","tubbypaws","paper foldable","cartoon paper toy","rectangular character net"]},
 {id:"seal",name:"FOCA JAPONESA",sub:"クラフトザラシ / CILINDRO",img:"https://pbs.twimg.com/media/FMxPyPmUYAEfXcq.jpg",source:"https://twiman.net/user/4510040473/1498660505426141184",terms:["クラフトザラシ","ツリザラン","シパソ","ペーパークラフト","cylindrical seal papercraft"]},
 {id:"banana",name:"BANANA CAT",sub:"CAT MEME / POLIGONAL",img:"https://i.pinimg.com/736x/c0/62/18/c062188fe9155b0d6e4efc124368a9ec.jpg",source:"https://mx.pinterest.com/pin/413134965834979020/",terms:["banana cat papercraft","crying banana cat","meme character paper model","low poly banana cat","printable cat meme"]}
];
const GROUPS={
 gato:[
 "Munchkin Kitty El Gato Paperized template",
 "paperized crafts kawaii animals templates",
 "el gato papercraft recortar pegar",
 "munchkin cat paper toy unfolded pattern",
 "realistic kitty papercraft glue tabs printable",
 "paperized kittens templates cut fold",
 "memes cat papercraft paperized",
 "cute paperized 3D cat template",
 "猫 ペーパークラフト 展開図 かわいい",
 "cat meme paper toy printable net",
 "paper craft cute cat template head body ears",
 "miniature realistic animal paper foldable",
 "paperized animals papercraft template",
 "cat folded figure printable pattern A4",
 "papercraft cat 3d printable sheet tabs",
 "Paperized Daerofal kitten papercraft",
 "huh cat papercraft printable template",
 "happy cat paper model pattern",
 "maxwell cat papercraft unfolded",
 "cute animal mini papercraft free template"
 ],
 hotdog:[
 "Adventure Time Hot Dog Princess paper foldable",
 "Tubbypaws Adventure Time paper foldables",
 "Adventure Time character papercraft template",
 "Cartoon Network paper foldable printable",
 "simple long character papercraft net",
 "adventure time paper figures cut glue",
 "papercraft princesita perro caliente plantilla",
 "Jake the dog paper foldable template",
 "Finn Adventure Time cut fold glue template",
 "paper foldable character cube cartoon pattern",
 "Adventure Time paper toy template",
 "paper foldables funny characters printable",
 "papertoy flat net character illustrated",
 "paper toy strip fold template cartoon",
 "hot dog princess paper toy foldable",
 "cute cartoon animal paper cube net",
 "foldable papertoy template free print",
 "kid friendly paper model character simple",
 "printable cartoon network paper toy",
 "tubbypaws paper toys archive"
 ],
 seal:[
 "クラフトザラシ ペーパークラフト",
 "ツリザラン 工作 ペーパークラフト",
 "ツリザラン あたま からだ みみ",
 "シパソ クラフトザラシ 作り方",
 "Japanese seal paper craft template",
 "cylindrical kawaii animal papercraft template",
 "ペーパークラフト かわいい 動物 展開図",
 "cute seal paper toy printable cutout",
 "simple cylinder paper animal net",
 "Japanese papercraft cut fold glue sea lion",
 "cute whale paper model circle head body strip",
 "kawaii hippopotamus seal papercraft",
 "Japanese stationery animal paper toy template",
 "maru animal paper craft pattern",
 "あざらし ペーパークラフト 無料 型紙",
 "seal character papercraft with fins",
 "cute animal foldable circle cylinder shape",
 "paper craft japanese mascot printable",
 "flat circular paper body net animal",
 "かわいい ペーパートイ テンプレート"
 ],
 banana:[
 "banana cat crying papercraft template",
 "banana cat pepasweet paper craft printable",
 "banana cat cut fold glue pattern",
 "banana cat meme paper model pieces",
 "banana cat 3d papercraft unfolded",
 "banana cat papercraft crying tears template",
 "banana cat paper toy printable A4",
 "sad banana cat papercraft PDF",
 "meme banana cat low poly template",
 "papercraft cat wearing banana costume net",
 "crying cat banana yellow papercraft paper model",
 "banana cat cutout pieces face leg hand",
 "cat memes paper toy template free printable",
 "banana cat origami vs papercraft net",
 "Banana Cat printable paper toy sheet",
 "猫 バナナ ペーパークラフト 型紙",
 "banana gato papercraft plantilla imprimir",
 "viral meme cat paper model template",
 "funny meme character paper cutouts template",
 "banana cat pepasweet pdf craft"
 ]
};
const $=id=>document.getElementById(id);
const base=[];
for(let i=0;i<20;i++)for(const ref of REF)base.push({id:ref.id+"-"+i,ref:ref.id,kind:"base",query:GROUPS[ref.id][i]});
const state={items:[],runs:[],decisions:{},goal:50,cursor:0,mode:"idle",countReceived:0,failures:0,startAt:0};
let itemMap=new Map(),visible="all",showN=240,abortController=null,runToken=0,autoTimer=0;
try{
 const saved=JSON.parse(localStorage.getItem(STORE)||"null");
 if(saved&&Array.isArray(saved.items)&&Array.isArray(saved.runs)){
  state.items=saved.items.slice(0,3500);state.runs=saved.runs.slice(0,150);
  state.decisions=saved.decisions||{};state.cursor=Math.max(0,Math.min(120,Number(saved.cursor)||0));
  state.countReceived=Number(saved.countReceived)||0;state.failures=Number(saved.failures)||0;
 }
}catch(e){console.warn("No se pudo restaurar",e)}
for(const item of state.items)itemMap.set(item.id,item);
function save(){
 try{localStorage.setItem(STORE,JSON.stringify({items:state.items.slice(0,3500),runs:state.runs.slice(-150),decisions:state.decisions,cursor:state.cursor,countReceived:state.countReceived,failures:state.failures}))}
 catch(e){$("status").textContent="El almacenamiento está lleno: EXPORTAR JSON para conservar todo."}
}
function el(tag,cl,text){
 const node=document.createElement(tag);if(cl)node.className=cl;if(text!=null)node.textContent=String(text);return node;
}
function references(){
 const frag=document.createDocumentFragment();
 for(const ref of REF){
  const card=el("a","ref");card.href=ref.source;card.target="_blank";card.rel="noopener noreferrer";card.title="Ver fuente original";
  const img=el("img");img.src=ref.img;img.alt="Referencia: "+ref.name;img.referrerPolicy="no-referrer";img.loading="lazy";
  card.append(img,el("strong",null,ref.name),el("small",null,ref.sub));frag.append(card);
 }
 $("references").append(frag);
 $("vocab").textContent=REF.map(r=>r.name+": "+r.terms.join(" · ")).join("\n\n");
}
function heuristics(title,query){
 // A lexical prior, NOT a neural vision evaluation or verified printability.
 const s=(title||"").toLowerCase(),q=(query||"").toLowerCase();
 let n=0;
 const terms=[[/template|plantilla|pattern|printable|imprimir|print|pdf|net\b|展開図|型紙/,15],[/papercraft|paper craft|papercrafting|ペーパークラフト|paperized|papertoy|paper toy/,17],[/glue|tabs|fold|foldable|cutout|cut out|pestañas|recortar|assemble/,13],[/animal|cat|kitty|seal|banana|dog|princess|cartoon|kawaii|meme|gato|あざらし/,7]];
 for(const pair of terms)if(pair[0].test(s))n+=pair[1];
 if(/origami|crochet|plush|svg clipart|drawing tutorial|coloring page|wallpaper|sculpture|3d print|amigurumi/.test(s))n-=22;
 if(q.includes("printable")||q.includes("template"))n+=5;
 return Math.max(0,Math.min(70,25+n));
}
function normalize(item,q,ref){
 const img=String(item.image||"");const pin=String(item.source_url||"");
 if(!/^https:\/\/i\.pinimg\.com\/[^ ]+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(img)||!/^https:\/\/www\.pinterest\.com\/pin\/\d+\//i.test(pin))return null;
 const imageKey=img.replace(/\/(originals|\d+x|\d+x\d+)\//,"/").split("?")[0].toLowerCase();
 return {id:String(item.id||imageKey),imageKey,img,source:pin,title:String(item.title||"").slice(0,230),query:q,ref,score:heuristics(item.title,q),pixel:null,at:new Date().toISOString()};
}
function queueAt(i){
 if(i<base.length)return base[i];
 const k=i-base.length; const good=state.runs.filter(r=>r.ok&&r.count>0)
 .sort((a,b)=>queryValue(b)-queryValue(a));
 const source=good.length?good[k%Math.min(14,good.length)]:base[k%base.length];
 const suffixes=["printable pattern glue tabs","paper toy net unfolded","cut fold assemble template","型紙 ペーパークラフト","papercraft PDF A4"];
 const q=source.query+" "+suffixes[Math.floor(k/8)%suffixes.length];
 return {id:"adaptive-"+k,query:q,ref:source.ref,kind:"adapto-basado-en-ranking"};
}
function queryValue(run){
 const items=state.items.filter(i=>i.query===run.query);
 const votes=items.reduce((n,i)=>n+(state.decisions[i.id]==="keep"?80:state.decisions[i.id]==="reject"?-80:0),0);
 const avg=items.length?items.reduce((n,i)=>n+i.score,0)/items.length:0;
 return avg+votes/Math.max(1,items.length);
}
function queryStats(){
 return state.runs.filter(r=>r.ok&&r.count>0).map(r=>({...r,value:queryValue(r)})).sort((a,b)=>b.value-a.value);
}
function metrics(){
 $("sQueries").textContent=state.runs.length;
 $("sRaw").textContent=state.countReceived;
 $("sUnique").textContent=state.items.length;
 $("sKeep").textContent=Object.values(state.decisions).filter(v=>v==="keep").length;
 $("sErrors").textContent=state.failures;
 $("mode").textContent=state.mode==="running"?"BUSCANDO EN VIVO":state.mode==="paused"?"EN PAUSA":state.mode==="done"?"COMPLETADO":"PREPARADO";
 $("target").textContent=state.cursor+" / "+state.goal;
 $("bar").style.width=Math.min(100,Math.round(state.cursor/state.goal*100))+"%";
 $("pause").textContent=state.mode==="paused"?"CONTINUAR":"PAUSAR";
 const ranked=queryStats();
 $("bestQueries").replaceChildren(...(ranked.length?ranked.slice(0,7).map((r,i)=>{
  const node=el("div","logline");node.append(el("span",null,(i+1)+". "+r.query),el("span",null,"ÍNDICE "+r.value.toFixed(0)));return node;
 }):[el("div",null,"Todavía no hay consultas evaluadas.")]));
 $("queryLog").replaceChildren(...(state.runs.length?state.runs.slice(-7).reverse().map(r=>{
  const node=el("div","logline");node.append(el("span",null,r.query),el("span",null,r.ok?r.count+" pines":"FALLÓ"));node.title=r.error||"";return node;
 }):[el("div",null,"Todavía no hay consultas.")]));
}
function visibleList(){
 let items=state.items;
 if(visible==="possible")items=items.filter(i=>i.score>=51&&state.decisions[i.id]!=="reject");
 else if(visible==="keep")items=items.filter(i=>state.decisions[i.id]==="keep");
 else if(visible==="reject")items=items.filter(i=>state.decisions[i.id]==="reject");
 else if(visible==="unknown")items=items.filter(i=>!state.decisions[i.id]);
 return items.slice().sort((a,b)=>(state.decisions[b.id]==="keep"?1000:0)+b.score-(state.decisions[a.id]==="keep"?1000:0)-a.score);
}
function display(){
 const items=visibleList(),frag=document.createDocumentFragment();
 const displayed=items.slice(0,showN);
 for(const x of displayed){
  const card=el("article","tile");card.dataset.id=x.id;
  const anchor=el("a");anchor.href=x.source;anchor.target="_blank";anchor.rel="noopener noreferrer";anchor.title="Abrir Pin original";
  const img=el("img");img.src=x.img;img.alt=x.title||"Imagen de la búsqueda "+x.query;img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
  img.onerror=()=>{card.classList.add("broken");img.alt="Imagen no disponible; el pin sigue enlazado."};
  anchor.append(img);card.append(anchor);
  const badge=el("span","mark",x.score>=51?"PROBABLE":"SIN VERIFICAR");card.append(badge);
  const inf=el("div","info",x.title||"Pin sin título");inf.append(el("div","sub",x.ref+" · "+x.score+"/100 heurístico"));card.append(inf);
  const actions=el("div","actions");
  for(const pair of [["keep","GUARDAR"],["reject","DESCARTAR"],["similar","SIMILARES"]]){
   const b=el("button","action",pair[1]);b.type="button";b.dataset.action=pair[0];b.dataset.id=x.id;
   if(pair[0]===state.decisions[x.id])b.classList.add(pair[0]==="keep"?"yes":"no");actions.append(b);
  }
  const link=el("a","action","↗");link.href=x.source;link.title="Ver fuente";link.target="_blank";link.rel="noopener noreferrer";
  actions.append(link);card.append(actions);frag.append(card);
 }
 $("gallery").replaceChildren(frag);
 $("empty").hidden=items.length!==0;
 $("shown").textContent=displayed.length+" / "+items.length+" IMÁGENES VISIBLES";
 let next=$("more");
 if(next)next.remove();
 if(items.length>showN){
  next=el("button","control","MOSTRAR OTRAS "+Math.min(240,items.length-showN));next.id="more";next.style.margin="18px auto";next.style.display="block";next.onclick=()=>{showN+=240;display()};$("gallery").after(next);
 }
}
function repaint(){metrics();display();save()}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function probePixels(item){
 // Content-based, weak geometry proxy. Only run when browser CORS allows canvas reading.
 if(item.pixel!==null)return;
 const image=new Image();image.crossOrigin="anonymous";image.referrerPolicy="no-referrer";
 try{
  await Promise.race([
   new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error("IMAGE_ERROR"));image.src=item.img}),
   delay(5500).then(()=>{throw new Error("IMAGE_TIMEOUT")})
  ]);
  const c=document.createElement("canvas");c.width=48;c.height=48;
  const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(image,0,0,48,48);
  const p=x.getImageData(0,0,48,48).data;let white=0,contrast=0;
  for(let i=0;i<p.length;i+=4){
   const avg=(p[i]+p[i+1]+p[i+2])/3;
   if(avg>227&&Math.max(p[i],p[i+1],p[i+2])-Math.min(p[i],p[i+1],p[i+2])<35)white++;
   if(i>4&&Math.abs(avg-(p[i-4]+p[i-3]+p[i-2])/3)>55)contrast++;
  }
  const wr=white/(p.length/4),edge=contrast/(p.length/4);
  item.pixel={white:Math.round(wr*100),edges:Math.round(edge*100)};
  if(wr>.22&&wr<.88&&edge>.1)item.score=Math.min(95,item.score+12);
  else if(wr>.17&&wr<.94)item.score=Math.min(95,item.score+4);
 }catch(e){item.pixel="unavailable"} // CORS denied is expected; do not invent a score.
}
async function fetchOne(task){
 const url=new URL(API);url.searchParams.set("q",task.query);url.searchParams.set("limit","20");url.searchParams.set("k",LAB);
 const started=Date.now();
 for(let attempt=0;attempt<2;attempt++){
  try{
   const r=await fetch(url.toString(),{headers:{"x-prometeo-lab":"pinterest-image-query-lab-v1"},signal:abortController.signal});
   const data=await r.json().catch(()=>({ok:false,error:"INVALID_JSON"}));
   if(!r.ok||!data.ok||!Array.isArray(data.results))throw new Error(data.error||"HTTP_"+r.status);
   const fresh=[];
   for(const d of data.results){
    state.countReceived++;
    const x=normalize(d,task.query,task.ref);if(!x||itemMap.has(x.id))continue;
    itemMap.set(x.id,x);state.items.push(x);fresh.push(x);
   }
   state.runs.push({query:task.query,ref:task.ref,kind:task.kind,ok:true,count:data.results.length,added:fresh.length,ms:Date.now()-started,at:new Date().toISOString()});
   for(const item of fresh.slice(0,3))probePixels(item).then(()=>{metrics()});
   return true;
  }catch(e){
   if(e.name==="AbortError")return false;
   if(attempt===0){await delay(1100);continue}
   state.failures++;state.runs.push({query:task.query,ref:task.ref,kind:task.kind,ok:false,count:0,error:String(e.message||e),ms:Date.now()-started,at:new Date().toISOString()});
   return false;
  }
 }
}
async function begin(goal){
 state.goal=Math.max(1,Math.min(120,goal));
 if(state.mode==="running")return;
 if(state.cursor>=state.goal){state.mode="done";metrics();return}
 state.mode="running";abortController=new AbortController();const token=++runToken;metrics();
 let consecutive=0;
 while(state.cursor<state.goal&&state.mode==="running"&&token===runToken){
  const task=queueAt(state.cursor),ok=await fetchOne(task);
  if(token!==runToken)break;
  if(!ok&&abortController.signal.aborted)break;
  state.cursor++;consecutive=ok?0:consecutive+1;
  $("status").textContent=(ok?"Recibidos resultados: ":"Falló la consulta: ")+task.query+" · "+state.cursor+"/"+state.goal;
  if(state.cursor%2===0||!ok)repaint();else{metrics();save()}
  if(consecutive>=4){state.mode="paused";$("status").textContent="Se pausó tras cuatro fallos seguidos. No se simulan resultados. Revisá backend y reanudá.";break}
  await delay(700);
 }
 if(token===runToken&&state.mode==="running")state.mode="done";
 repaint();
}
function pause(){
 if(state.mode==="running"){state.mode="paused";runToken++;if(abortController)abortController.abort();$("status").textContent="Pausado. Los resultados se conservaron."}
 else begin(state.goal);
 metrics();
}
function clear(){
 if(!confirm("¿Reiniciar esta investigación? Podés exportar un JSON antes para conservarla."))return;
 runToken++;if(abortController)abortController.abort();
 state.items=[];state.runs=[];state.decisions={};state.cursor=0;state.countReceived=0;state.failures=0;state.goal=50;state.mode="idle";
 itemMap.clear();showN=240;repaint();$("status").textContent="Reiniciado. Podés iniciar 50 o 120 consultas.";
}
function exp(){
 const out={schema:"prometeo.visual-discovery-exp/v1",exported:new Date().toISOString(),seed_refs:REF.map(r=>({id:r.id,source:r.source,terms:r.terms})),runs:state.runs,items:state.items,decisions:state.decisions,limits:{classification:"lexical and limited pixel heuristics, no neural vision model",printability:"not physically verified",source:"Pinterest original links",maxQueries:120}};
 const blob=new Blob([JSON.stringify(out,null,2)],{type:"application/json"});
 const u=URL.createObjectURL(blob);const a=el("a");a.href=u;a.download="PROMETEO_PAPERCRAFT_EXPERIMENTO_01.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),2500);
}
references();repaint();
$("run").onclick=()=>begin(50);$("full").onclick=()=>begin(120);
$("pause").onclick=pause;$("reset").onclick=clear;$("export").onclick=exp;
$("filters").addEventListener("click",e=>{
 const b=e.target.closest("[data-view]");if(!b)return;
 visible=b.dataset.view;showN=240;document.querySelectorAll(".filter").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));display();
});
$("gallery").addEventListener("click",e=>{
 const b=e.target.closest("[data-action]");if(!b)return;
 const id=b.dataset.id,act=b.dataset.action,entry=itemMap.get(id);if(!entry)return;
 if(act==="similar"){
  const better=entry.query+" printable cut fold glue tabs";
  if(state.mode==="running")pause();
  state.runs.push({query:better,ref:entry.ref,kind:"human-refinement",ok:false,count:0,error:"pendiente: consulta manual todavía no ejecutada",at:new Date().toISOString()});
  const idx=base.findIndex(x=>x.query===entry.query);
  $("status").textContent="Sugerencia guardada: "+better+". Exportala como hipótesis; no se cuenta como búsqueda exitosa.";
 }else{
  state.decisions[id]=state.decisions[id]===act?null:act;
  if(!state.decisions[id])delete state.decisions[id];
 }
 repaint();
});
if(state.cursor<50){
 $("status").textContent="Iniciando la exploración: hasta 50 consultas reales, 20 resultados por consulta.";
 autoTimer=setTimeout(()=>begin(50),900);
}else{$("status").textContent="Sesión restaurada: "+state.cursor+" consultas realizadas. Podés continuar hasta 120."}
