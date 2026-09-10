let current="Frutidrama",selected=0,currentMetric="views",selectedInterval=3,showChanges=false;
const $=s=>document.querySelector(s);
function imageSrc(k){return k==="fruti"?FRUTI:IMG[k]}
function ts(s){return new Date(s+"T00:00:00").getTime()}

function showChannel(name){
  current=name;selected=0;selectedInterval=Math.min(3,published[name].length-2);
  $("#home").classList.add("hidden");
  $("#channel").classList.remove("hidden");
  $("#channelName").textContent=name;
  view("ideas");
  render();
}
function render(){
  const arr=data[current],root=$("#stories");root.innerHTML="";
  arr.forEach((s,i)=>{
    const b=document.createElement("button");
    b.className="story"+(i===selected?" active":"");
    b.innerHTML=`<div><div class="story-title">${s.title}</div><div class="story-copy">${s.copy}</div></div><div class="story-foot"><span>${s.eps.length} videos</span><span class="story-arrow">→</span></div>`;
    b.onclick=()=>{selected=i;render()};
    root.appendChild(b);
  });
  const s=arr[selected];
  $("#detailName").textContent=s.title;
  const eps=$("#episodes");eps.innerHTML="";
  s.eps.forEach(e=>{
    const src=imageSrc(e[1]);
    const b=document.createElement("button");b.className="episode";
    b.innerHTML=`<div class="poster"><img ${e[1]==="fruti"?'data-imgkey="fruti"':''} src="${src}" alt=""></div><div class="ep-title">${e[0]}</div><div class="ep-state">${e[2]}</div>`;
    eps.appendChild(b);
  });
  renderReady();
  renderTimeline();
}
function renderReady(){
  const root=$("#readyGrid");root.innerHTML="";
  ready[current].slice(0,3).forEach(e=>{
    const d=document.createElement("div");d.className="episode";
    d.innerHTML=`<div class="poster"><img ${e[1]==="fruti"?'data-imgkey="fruti"':''} src="${imageSrc(e[1])}" alt=""></div><div class="ready-title">${e[0]}</div><div class="ready-meta">${e[2]}</div>`;
    root.appendChild(d);
  });
}
function view(v){
  $("#ideasView").classList.toggle("hidden",v!=="ideas");
  $("#readyView").classList.toggle("hidden",v!=="ready");
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===v));
  if(v==="ready")requestAnimationFrame(renderTimeline);
}

function xPositions(items,width){
  const pad=52,start=ts(items[0].date),end=ts(items[items.length-1].date),span=Math.max(1,end-start);
  return items.map(x=>pad+((ts(x.date)-start)/span)*(width-pad*2));
}
function renderTimeline(){
  const items=published[current];
  const timeline=$("#timeline");
  const width=timeline.clientWidth||1480;
  const pos=xPositions(items,width);
  const chart=$("#chartArea");
  const h=chart.clientHeight||82;
  const vals=items.map(x=>x[currentMetric]);
  const min=Math.min(...vals),max=Math.max(...vals),range=Math.max(1,max-min);
  const top=12,bottom=10;
  const ys=vals.map(v=>top+(max-v)/range*Math.max(8,h-top-bottom));
  const svg=$("#chartSvg");
  svg.setAttribute("viewBox",`0 0 ${width} ${h}`);
  svg.innerHTML="";

  [0.25,0.5,0.75].forEach(fr=>{
    const y=Math.round(h*fr);
    svg.insertAdjacentHTML("beforeend",`<line class="grid-line" x1="0" y1="${y}" x2="${width}" y2="${y}"/>`);
  });
  const points=pos.map((x,i)=>`${x},${ys[i]}`).join(" ");
  svg.insertAdjacentHTML("beforeend",`<polyline class="metric-line" points="${points}"/>`);
  pos.forEach((x,i)=>{
    svg.insertAdjacentHTML("beforeend",`<circle class="metric-dot ${i===selectedInterval?"active":""}" data-point="${i}" cx="${x}" cy="${ys[i]}" r="4"/>`);
  });

  document.querySelectorAll(".guide").forEach(x=>x.remove());
  pos.forEach((x,i)=>{
    const g=document.createElement("div");g.className="guide"+(i===selectedInterval?" active":"");
    g.style.left=x+"px";g.style.height=(h+16+30+24+6)+"px";g.style.top="0";
    chart.appendChild(g);
  });

  const il=$("#intervalLayer");il.innerHTML="";
  for(let i=0;i<items.length-1;i++){
    const d=document.createElement("button");
    d.className="interval"+(i===selectedInterval?" active":"");
    d.style.left=pos[i]+"px";
    d.style.width=(pos[i+1]-pos[i])+"px";
    d.title=`${items[i].label} → ${items[i+1].label}`;
    d.onclick=()=>{selectedInterval=i;renderTimeline()};
    il.appendChild(d);
  }

  const cl=$("#changeLayer");cl.innerHTML="";
  const start=ts(items[0].date),end=ts(items[items.length-1].date),span=Math.max(1,end-start);
  changes[current].forEach(c=>{
    const x=52+((ts(c[0])-start)/span)*(width-104);
    const d=document.createElement("div");d.className="change-mark";d.style.left=x+"px";d.textContent=c[1];cl.appendChild(d);
  });
  cl.classList.toggle("hidden",!showChanges);

  const row=$("#publishedRow");row.innerHTML="";
  items.forEach((e,i)=>{
    const d=document.createElement("button");
    d.className="pub-video"+(i===selectedInterval?" active":"");
    d.style.left=pos[i]+"px";
    d.innerHTML=`<div class="poster"><img ${e.img==="fruti"?'data-imgkey="fruti"':''} src="${imageSrc(e.img)}" alt=""></div><div class="pub-video-title">${e.title}</div><div class="pub-video-date">${e.label}</div>`;
    d.onclick=()=>{selectedInterval=Math.min(i,items.length-2);renderTimeline()};
    row.appendChild(d);
  });
  renderReadout();
}
function formatMetric(v,key){
  if(key==="views")return `${Math.round(v)}k vistas/día`;
  if(key==="subs")return `${Math.round(v)} subs/día`;
  if(key==="retention")return `${Math.round(v)}% retención`;
  if(key==="ctr")return `${Number(v).toFixed(1)}% CTR`;
  return `$${Math.round(v)}/día`;
}
function renderReadout(){
  const items=published[current];
  const i=Math.min(selectedInterval,items.length-2);
  const a=items[i],b=items[i+1],prev=items[Math.max(0,i-1)];
  const deltaPrev=prev===a?0:((a[currentMetric]-prev[currentMetric])/Math.max(.001,prev[currentMetric]))*100;
  const sign=deltaPrev>0?"+":"";
  $("#readout").innerHTML=`<b>${a.label} → ${b.label}</b><span class="readout-primary">${formatMetric(a[currentMetric],currentMetric)}</span><span>${sign}${deltaPrev.toFixed(0)}% vs tramo anterior</span><span>${Math.round(a.subs)} subs · ${Math.round(a.retention)}% retención · ${Number(a.ctr).toFixed(1)}% CTR</span><span>${a.note}</span>`;
}

function openWorker(task){
  $("#workerChannel").textContent=current;
  $("#workerTask").textContent=task||`Desarrollar “${data[current][selected].title}” y devolver nuevas posibilidades de video.`;
  $("#workerSmall").textContent="Se compartiría el mundo del canal, esta historia y sus videos actuales. La otra IA devuelve cambios al mismo archivo.";
  $("#done").classList.add("hidden");$("#worker").classList.remove("hidden");
}

document.querySelectorAll(".channel-pick").forEach(b=>b.onclick=()=>showChannel(b.dataset.name));
$("#back").onclick=()=>{$("#channel").classList.add("hidden");$("#home").classList.remove("hidden")};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>view(t.dataset.view));
$("#work").onclick=()=>openWorker();
$("#send").onclick=()=>{const v=$("#request").value.trim();if(v){openWorker(v);$("#request").value=""}};
$("#request").addEventListener("keydown",e=>{if(e.key==="Enter")$("#send").click()});
$("#workerClose").onclick=()=>$("#worker").classList.add("hidden");
$("#copy").onclick=()=>{$("#copy").textContent="copiado";setTimeout(()=>$("#copy").textContent="copiar enlace",800)};
$("#simulate").onclick=()=>{
  $("#workerSmall").textContent="trabajando…";
  setTimeout(()=>{
    data[current][selected].eps.unshift(["Nueva posibilidad devuelta por la otra IA","fruti","idea"]);
    $("#workerSmall").textContent="cambio incorporado";
    $("#done").classList.remove("hidden");render();
  },800);
};
$("#done").onclick=()=>$("#worker").classList.add("hidden");

$("#metricButton").onclick=()=>$("#metricMenu").classList.toggle("hidden");
$("#metricMenu").addEventListener("click",e=>{
  const b=e.target.closest("button[data-metric]");if(!b)return;
  currentMetric=b.dataset.metric;
  $("#metricButton").textContent=metricMeta[currentMetric].label+"⌄";
  $("#metricMenu").classList.add("hidden");
  renderTimeline();
});
$("#changesButton").onclick=()=>{
  showChanges=!showChanges;
  $("#changesButton").classList.toggle("on",showChanges);
  renderTimeline();
};

let dragging=false,startY=0,startH=0;
$("#dragRail").addEventListener("pointerdown",e=>{
  dragging=true;startY=e.clientY;startH=$("#chartArea").getBoundingClientRect().height;
  $("#dragRail").setPointerCapture(e.pointerId);e.preventDefault();
});
$("#dragRail").addEventListener("pointermove",e=>{
  if(!dragging)return;
  const h=Math.max(34,Math.min(230,startH+(e.clientY-startY)));
  document.documentElement.style.setProperty("--chart-h",h+"px");renderTimeline();
});
$("#dragRail").addEventListener("pointerup",()=>dragging=false);
$("#dragRail").addEventListener("dblclick",()=>{
  const h=$("#chartArea").getBoundingClientRect().height;
  document.documentElement.style.setProperty("--chart-h",(h<110?200:60)+"px");renderTimeline();
});
window.addEventListener("resize",()=>{if(!$("#readyView").classList.contains("hidden"))renderTimeline()});
