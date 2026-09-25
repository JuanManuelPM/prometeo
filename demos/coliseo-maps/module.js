(function(g){
'use strict';

const TAU=Math.PI*2;
const KIND_ORDER={ROOT:0,REDUCER:1,SYNTHESIS:2,VERIFY:3,PROMOTION:4};
const KIND_LETTER={ROOT:'R',REDUCER:'D',SYNTHESIS:'S',VERIFY:'V',PROMOTION:'P'};
const STATE={
  SUCCESS:{fill:'#476153',rim:'#94b09a'},
  ACTIVE:{fill:'#8b552f',rim:'#efb36f'},
  READY:{fill:'#667357',rim:'#c3d2a5'},
  BLOCKED:{fill:'#453a39',rim:'#7b6663'},
  FAILED:{fill:'#63362f',rim:'#bd6e60'},
  CANCELLED:{fill:'#3b3837',rim:'#696363'}
};
const PROJECT_COLORS=['#c0713f','#6e8d7b','#7f7896','#aa8452','#607e96','#8c665a','#71855f','#9b775a'];

const VARIANTS={
  arena:{
    id:'arena',
    label:'ARENA CÍVICA',
    strap:'Coliseo reordenado por distritos radiales',
    answer:{
      birth:'Pórtico exterior de cada distrito.',
      merge:'Plazas de convergencia sobre el eje radial.',
      walk:'Anillos + corredores radiales compartidos.',
      growth:'El distrito ensancha el arco; los hitos crecen en altura.',
      density:'De lejos se leen territorios y torres; al acercar aparecen estaciones.'
    }
  },
  foundry:{
    id:'foundry',
    label:'FUNDICIÓN ORBITAL',
    strap:'Talleres autónomos alrededor de una logística común',
    answer:{
      birth:'Patio de entrada de cada taller.',
      merge:'Forja central dentro de cada taller.',
      walk:'Anillo logístico global + calles internas.',
      growth:'Cada proyecto densifica su parcela y luego ocupa una parcela vecina.',
      density:'La ciudad conserva siluetas separadas aunque aumenten los proyectos.'
    }
  },
  campus:{
    id:'campus',
    label:'CAMPUS DE TALLERES',
    strap:'Patios teselables pensados para TV horizontal',
    answer:{
      birth:'Puerta norte del patio del proyecto.',
      merge:'Taller central, físicamente más ancho.',
      walk:'Boulevard común + calles ortogonales por patio.',
      growth:'Los patios se agregan como manzanas, no como estantes.',
      density:'Funciona como tira horizontal y pasa a grilla cuando hay más proyectos.'
    }
  },
  archipelago:{
    id:'archipelago',
    label:'ARCHIPIÉLAGO',
    strap:'Plataformas conectadas por puentes causales',
    answer:{
      birth:'Muelle de la primera plataforma.',
      merge:'Isla-plaza donde desembocan varios puentes.',
      walk:'Puentes y pasarelas son la red caminable.',
      growth:'Aparecen nuevas plataformas alrededor del territorio existente.',
      density:'El vacío entre islas evita que los proyectos se fundan visualmente.'
    }
  }
};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function keyFor(n){return String(n.project_key||'')+'|'+String(n.node_key||'')}
function colorForProject(pk,index){
  let h=0;const s=String(pk||'');
  for(let i=0;i<s.length;i++)h=(h*33+s.charCodeAt(i))>>>0;
  return PROJECT_COLORS[(h+index)%PROJECT_COLORS.length];
}
function groups(snapshot){
  const projects=(snapshot.projects||[]).map((p,i)=>({...p,_index:i,_color:colorForProject(p.project_key,i)}));
  const byProject=new Map(projects.map(p=>[p.project_key,[]]));
  for(const n of (snapshot.nodes||[])){
    if(!byProject.has(n.project_key))byProject.set(n.project_key,[]);
    byProject.get(n.project_key).push(n);
  }
  return {projects,byProject};
}
function sortedKinds(nodes){
  const by=new Map();
  for(const n of nodes){
    const k=n.node_kind||'ROOT';
    if(!by.has(k))by.set(k,[]);
    by.get(k).push(n);
  }
  for(const arr of by.values())arr.sort((a,b)=>String(a.node_key).localeCompare(String(b.node_key)));
  return by;
}
function regularPoly(cx,cz,r,sides,rot){
  const pts=[];for(let i=0;i<sides;i++){const a=rot+i*TAU/sides;pts.push({x:cx+Math.cos(a)*r,z:cz+Math.sin(a)*r})}
  return pts;
}
function rectPoly(cx,cz,w,d){return [{x:cx-w/2,z:cz-d/2},{x:cx+w/2,z:cz-d/2},{x:cx+w/2,z:cz+d/2},{x:cx-w/2,z:cz+d/2}]}
function wedgePoly(a0,a1,r0,r1){
  const pts=[],steps=7;
  for(let i=0;i<=steps;i++){const a=a0+(a1-a0)*i/steps;pts.push({x:Math.cos(a)*r1,z:Math.sin(a)*r1})}
  for(let i=steps;i>=0;i--){const a=a0+(a1-a0)*i/steps;pts.push({x:Math.cos(a)*r0,z:Math.sin(a)*r0})}
  return pts;
}
function avgPoint(list){if(!list.length)return{x:0,z:0};return{x:list.reduce((s,p)=>s+p.x,0)/list.length,z:list.reduce((s,p)=>s+p.z,0)/list.length}}
function station(node,x,z,project,extra){
  return {
    key:keyFor(node),node,project_key:node.project_key,x,z,
    h:0.12+0.02*(KIND_ORDER[node.node_kind]||0),
    radius:node.node_kind==='SYNTHESIS'?0.64:node.node_kind==='REDUCER'?0.56:node.node_kind==='PROMOTION'?0.52:0.44,
    color:project._color,
    ...extra
  };
}
function pushNode(layout,n,s){layout.nodes.set(keyFor(n),s);layout.nodeList.push(s)}
function makePath(layout,from,to,points){
  layout.paths.push({project_key:to.node.project_key,from:from.key,to:to.key,points});
}
function routeDependencies(layout,mode){
  for(const target of layout.nodeList){
    const deps=Array.isArray(target.node.depends_on)?target.node.depends_on:[];
    if(!deps.length)continue;
    const sources=deps.map(id=>layout.nodes.get(String(target.node.project_key)+'|'+String(id))).filter(Boolean);
    if(!sources.length)continue;
    if(mode==='arena'){
      const ta=Math.atan2(target.z,target.x),tr=Math.hypot(target.x,target.z);
      const sr=sources.reduce((s,p)=>s+Math.hypot(p.x,p.z),0)/sources.length;
      const mergeR=tr+(sr-tr)*0.40;
      const merge={x:Math.cos(ta)*mergeR,z:Math.sin(ta)*mergeR};
      layout.merges.push({x:merge.x,z:merge.z,project_key:target.node.project_key,node_key:target.node.node_key});
      for(const src of sources){
        const sa=Math.atan2(src.z,src.x);
        const p1={x:Math.cos(sa)*mergeR,z:Math.sin(sa)*mergeR};
        makePath(layout,src,target,[{x:src.x,z:src.z},p1,merge,{x:target.x,z:target.z}]);
      }
    }else if(mode==='foundry'){
      const c=layout.projectCenters.get(target.node.project_key)||{x:0,z:0};
      const channelZ=(sources.reduce((s,p)=>s+p.z,0)/sources.length+target.z)/2;
      layout.merges.push({x:target.x,z:channelZ,project_key:target.node.project_key,node_key:target.node.node_key});
      for(const src of sources){
        makePath(layout,src,target,[{x:src.x,z:src.z},{x:src.x,z:channelZ},{x:target.x,z:channelZ},{x:target.x,z:target.z}]);
      }
    }else if(mode==='campus'){
      const channelZ=target.z-0.55;
      layout.merges.push({x:target.x,z:channelZ,project_key:target.node.project_key,node_key:target.node.node_key});
      for(const src of sources){
        makePath(layout,src,target,[{x:src.x,z:src.z},{x:src.x,z:channelZ},{x:target.x,z:channelZ},{x:target.x,z:target.z}]);
      }
    }else{
      const mid=avgPoint(sources.map(p=>({x:p.x,z:p.z})));
      const merge={x:(mid.x+target.x)*0.5,z:(mid.z+target.z)*0.5};
      layout.merges.push({x:merge.x,z:merge.z,project_key:target.node.project_key,node_key:target.node.node_key});
      for(const src of sources){
        const dx=target.x-src.x,dz=target.z-src.z;
        const bend={x:(src.x+merge.x)*0.5-dz*0.05,z:(src.z+merge.z)*0.5+dx*0.05};
        makePath(layout,src,target,[{x:src.x,z:src.z},bend,merge,{x:target.x,z:target.z}]);
      }
    }
  }
}
function addLandmark(layout,p,nodes,x,z){
  const done=nodes.filter(n=>n.state==='SUCCESS').length;
  layout.landmarks.push({project_key:p.project_key,x,z,height:1.05+3.8*(nodes.length?done/nodes.length:0),color:p._color,title:p.title});
}
function arenaLayout(snapshot,layout){
  const {projects,byProject}=groups(snapshot),count=Math.max(1,projects.length);
  const sector=TAU/count;
  projects.forEach((p,i)=>{
    const angle=-Math.PI/2+i*sector;
    const half=Math.min(.72,sector*.39);
    layout.territories.push({project_key:p.project_key,title:p.title,color:p._color,poly:wedgePoly(angle-half,angle+half,1.15,11.7),center:{x:Math.cos(angle)*7.0,z:Math.sin(angle)*7.0},type:'wedge'});
    layout.projectCenters.set(p.project_key,{x:Math.cos(angle)*7,z:Math.sin(angle)*7,angle});
    layout.origins.push({project_key:p.project_key,x:Math.cos(angle)*11.1,z:Math.sin(angle)*11.1,angle,title:p.title});
    const nodes=byProject.get(p.project_key)||[],by=sortedKinds(nodes);
    const radii={ROOT:10.1,REDUCER:7.45,SYNTHESIS:5.25,VERIFY:3.55,PROMOTION:1.95};
    for(const kind of Object.keys(radii)){
      const arr=by.get(kind)||[];
      arr.forEach((n,j)=>{
        const spread=(j-(arr.length-1)/2)*Math.min(.24,half/(Math.max(1,arr.length)));
        const a=angle+spread,r=radii[kind];
        pushNode(layout,n,station(n,Math.cos(a)*r,Math.sin(a)*r,p,{angle:a}));
      });
    }
    addLandmark(layout,p,nodes,Math.cos(angle)*2.65,Math.sin(angle)*2.65);
  });
  layout.roads.push({kind:'ring',r:10.65},{kind:'ring',r:7.45},{kind:'ring',r:5.25},{kind:'ring',r:3.55});
  for(const p of projects){const c=layout.projectCenters.get(p.project_key);layout.roads.push({kind:'radial',angle:c.angle,r0:1.3,r1:11.4})}
  layout.bounds={minX:-12.4,maxX:12.4,minZ:-12.4,maxZ:12.4};
  routeDependencies(layout,'arena');
}
function foundryLayout(snapshot,layout){
  const {projects,byProject}=groups(snapshot),count=Math.max(1,projects.length),orbit=7.2;
  projects.forEach((p,i)=>{
    const a=-Math.PI/2+i*TAU/count,cx=Math.cos(a)*orbit,cz=Math.sin(a)*orbit;
    layout.projectCenters.set(p.project_key,{x:cx,z:cz,angle:a});
    layout.territories.push({project_key:p.project_key,title:p.title,color:p._color,poly:regularPoly(cx,cz,3.15,10,a+.15),center:{x:cx,z:cz},type:'yard'});
    const outward={x:Math.cos(a),z:Math.sin(a)},tangent={x:-outward.z,z:outward.x};
    const local=(lx,lz)=>({x:cx+tangent.x*lx+outward.x*lz,z:cz+tangent.z*lx+outward.z*lz});
    const gate=local(0,2.72);layout.origins.push({project_key:p.project_key,x:gate.x,z:gate.z,angle:a,title:p.title});
    const nodes=byProject.get(p.project_key)||[],by=sortedKinds(nodes);
    const slots={ROOT:1.82,REDUCER:.65,SYNTHESIS:-.35,VERIFY:-1.25,PROMOTION:-2.05};
    for(const kind of Object.keys(slots)){
      const arr=by.get(kind)||[];
      arr.forEach((n,j)=>{
        const lx=(j-(arr.length-1)/2)*1.05,lz=slots[kind],q=local(lx,lz);
        pushNode(layout,n,station(n,q.x,q.z,p,{angle:a}));
      });
    }
    const tower=local(-2.15,-1.6);addLandmark(layout,p,nodes,tower.x,tower.z);
    layout.roads.push({kind:'localRing',x:cx,z:cz,r:2.45});
    layout.roads.push({kind:'spoke',points:[{x:Math.cos(a)*4.15,z:Math.sin(a)*4.15},{x:cx-outward.x*2.55,z:cz-outward.z*2.55}]});
  });
  layout.roads.push({kind:'ring',r:4.1});
  layout.hubs.push({x:0,z:0,r:2.15,label:'LOGÍSTICA'});
  layout.bounds={minX:-11.4,maxX:11.4,minZ:-11.4,maxZ:11.4};
  routeDependencies(layout,'foundry');
}
function campusLayout(snapshot,layout){
  const {projects,byProject}=groups(snapshot),n=Math.max(1,projects.length);
  const spacing=8.8;
  projects.forEach((p,i)=>{
    const cx=(i-(n-1)/2)*spacing,cz=0;
    layout.projectCenters.set(p.project_key,{x:cx,z:cz});
    layout.territories.push({project_key:p.project_key,title:p.title,color:p._color,poly:rectPoly(cx,cz,7.25,10.2),center:{x:cx,z:cz},type:'block'});
    layout.origins.push({project_key:p.project_key,x:cx,z:-4.65,angle:-Math.PI/2,title:p.title});
    const nodes=byProject.get(p.project_key)||[],by=sortedKinds(nodes);
    const lanes={ROOT:-3.25,REDUCER:-1.3,SYNTHESIS:.65,VERIFY:2.35,PROMOTION:3.7};
    for(const kind of Object.keys(lanes)){
      const arr=by.get(kind)||[];
      arr.forEach((node,j)=>{
        const x=cx+(j-(arr.length-1)/2)*1.55,z=lanes[kind];
        pushNode(layout,node,station(node,x,z,p,{angle:0}));
      });
    }
    addLandmark(layout,p,nodes,cx+2.65,3.45);
    layout.roads.push({kind:'spoke',points:[{x:cx,z:-4.8},{x:cx,z:4.35}]});
    layout.roads.push({kind:'spoke',points:[{x:cx-3.1,z:-.25},{x:cx+3.1,z:-.25}]});
  });
  const minX=-(n-1)*spacing/2-3.8,maxX=(n-1)*spacing/2+3.8;
  layout.roads.push({kind:'spoke',points:[{x:minX,z:-5.35},{x:maxX,z:-5.35}],major:true});
  layout.hubs.push({x:0,z:-5.35,r:.55,label:'BOULEVARD'});
  layout.bounds={minX:minX-1,maxX:maxX+1,minZ:-6.2,maxZ:5.6};
  routeDependencies(layout,'campus');
}
function archipelagoLayout(snapshot,layout){
  const {projects,byProject}=groups(snapshot),n=Math.max(1,projects.length),spacing=8.2;
  projects.forEach((p,i)=>{
    const baseX=(i-(n-1)/2)*spacing,baseZ=(i%2?1.2:-.4);
    layout.projectCenters.set(p.project_key,{x:baseX,z:baseZ});
    const nodes=byProject.get(p.project_key)||[],by=sortedKinds(nodes);
    const stage={ROOT:{x:-2.5,z:-2.8,r:2.0},REDUCER:{x:-1.1,z:-.7,r:1.45},SYNTHESIS:{x:.45,z:1.05,r:1.55},VERIFY:{x:1.95,z:2.55,r:1.2},PROMOTION:{x:3.0,z:3.75,r:1.05}};
    const hull=[{x:baseX-4.3,z:baseZ-4.4},{x:baseX-3.8,z:baseZ+.5},{x:baseX-.2,z:baseZ+4.6},{x:baseX+4.2,z:baseZ+5.0},{x:baseX+4.6,z:baseZ+.4},{x:baseX+1.0,z:baseZ-4.4}];
    layout.territories.push({project_key:p.project_key,title:p.title,color:p._color,poly:hull,center:{x:baseX,z:baseZ},type:'watermark',ghost:true});
    layout.origins.push({project_key:p.project_key,x:baseX-3.6,z:baseZ-3.75,angle:-2.35,title:p.title});
    for(const kind of Object.keys(stage)){
      const arr=by.get(kind)||[],s=stage[kind];
      arr.forEach((node,j)=>{
        const a=arr.length===1?0:(-Math.PI/2+j*TAU/arr.length);
        const rr=arr.length===1?0:Math.min(.78,s.r*.48);
        const x=baseX+s.x+Math.cos(a)*rr,z=baseZ+s.z+Math.sin(a)*rr;
        pushNode(layout,node,station(node,x,z,p,{angle:.3}));
      });
      layout.platforms.push({project_key:p.project_key,x:baseX+s.x,z:baseZ+s.z,r:s.r,color:p._color,kind});
    }
    addLandmark(layout,p,nodes,baseX+3.9,baseZ+2.7);
  });
  const minX=-(n-1)*spacing/2-5,maxX=(n-1)*spacing/2+5;
  layout.bounds={minX,maxX,minZ:-5.5,maxZ:6.3};
  routeDependencies(layout,'archipelago');
}
function layoutWorld(snapshot,env){
  const variant=(env&&env.variant&&VARIANTS[env.variant])?env.variant:'arena';
  const layout={
    variant,meta:VARIANTS[variant],snapshot,
    nodes:new Map(),nodeList:[],paths:[],roads:[],territories:[],origins:[],merges:[],landmarks:[],platforms:[],hubs:[],
    projectCenters:new Map(),workers:new Map(),bounds:{minX:-12,maxX:12,minZ:-8,maxZ:8}
  };
  if(variant==='arena')arenaLayout(snapshot,layout);
  else if(variant==='foundry')foundryLayout(snapshot,layout);
  else if(variant==='campus')campusLayout(snapshot,layout);
  else archipelagoLayout(snapshot,layout);
  for(const w of (snapshot.workers||[])){
    const s=layout.nodes.get(String(w.project_key)+'|'+String(w.node_key));
    if(s)layout.workers.set(w.worker_id,{station:s,x:s.x,z:s.z});
  }
  return layout;
}

function camera(layout,env){
  const w=Math.max(1,Number(env&&env.width)||800),h=Math.max(1,Number(env&&env.height)||500);
  const b=layout.bounds,spanX=Math.max(1,b.maxX-b.minX),spanZ=Math.max(1,b.maxZ-b.minZ);
  const yaw=Number.isFinite(env&&env.yaw)?env.yaw:-.56,pitch=Number.isFinite(env&&env.pitch)?env.pitch:.42;
  const zoom=clamp(Number(env&&env.zoom)||1,.45,3.2);
  const fit=Math.min((w*0.84)/spanX,(h*0.72)/(spanZ*pitch+4.8));
  return {w,h,yaw,pitch,scale:fit*zoom,cx:w*.5+(Number(env&&env.panX)||0),cy:h*.53+(Number(env&&env.panY)||0)};
}
function project(cam,x,z,h){
  const c=Math.cos(cam.yaw),s=Math.sin(cam.yaw);
  const rx=x*c-z*s,rz=x*s+z*c;
  return {x:cam.cx+rx*cam.scale,y:cam.cy+rz*cam.scale*cam.pitch-(h||0)*cam.scale*.74,depth:rz};
}
function trace(ctx,pts,cam,h){
  if(!pts.length)return;
  const p0=project(cam,pts[0].x,pts[0].z,h||0);
  ctx.beginPath();ctx.moveTo(p0.x,p0.y);
  for(let i=1;i<pts.length;i++){const p=project(cam,pts[i].x,pts[i].z,h||0);ctx.lineTo(p.x,p.y)}
}
function alpha(hex,a){
  if(/^#[0-9a-f]{6}$/i.test(hex)){const n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'}
  return hex;
}
function drawGroundPoly(ctx,poly,cam,fill,stroke,width){
  trace(ctx,poly,cam,.02);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width||1;ctx.stroke()}
}
function drawPlatform(ctx,cx,cz,r,height,cam,fill,stroke,sides){
  const poly=regularPoly(cx,cz,r,sides||8,.22),top=poly.map(p=>project(cam,p.x,p.z,height)),bot=poly.map(p=>project(cam,p.x,p.z,0));
  for(let i=0;i<poly.length;i++){
    const j=(i+1)%poly.length;
    ctx.beginPath();ctx.moveTo(bot[i].x,bot[i].y);ctx.lineTo(bot[j].x,bot[j].y);ctx.lineTo(top[j].x,top[j].y);ctx.lineTo(top[i].x,top[i].y);ctx.closePath();
    ctx.fillStyle=alpha(fill,.48);ctx.fill();
  }
  ctx.beginPath();ctx.moveTo(top[0].x,top[0].y);for(let i=1;i<top.length;i++)ctx.lineTo(top[i].x,top[i].y);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(1,cam.scale*.035);ctx.stroke();
}
function drawBox(ctx,x,z,w,d,height,cam,fill,stroke){
  const poly=[{x:x-w/2,z:z-d/2},{x:x+w/2,z:z-d/2},{x:x+w/2,z:z+d/2},{x:x-w/2,z:z+d/2}];
  const top=poly.map(p=>project(cam,p.x,p.z,height)),bot=poly.map(p=>project(cam,p.x,p.z,0));
  const faces=[];
  for(let i=0;i<4;i++){const j=(i+1)%4;faces.push({d:(poly[i].z+poly[j].z)/2,pts:[bot[i],bot[j],top[j],top[i]]})}
  faces.sort((a,b)=>a.d-b.d);
  for(const f of faces){ctx.beginPath();ctx.moveTo(f.pts[0].x,f.pts[0].y);for(let i=1;i<f.pts.length;i++)ctx.lineTo(f.pts[i].x,f.pts[i].y);ctx.closePath();ctx.fillStyle=alpha(fill,.55);ctx.fill()}
  ctx.beginPath();ctx.moveTo(top[0].x,top[0].y);for(let i=1;i<4;i++)ctx.lineTo(top[i].x,top[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(.8,cam.scale*.028);ctx.stroke();
}
function drawRoadPolyline(ctx,points,cam,major){
  trace(ctx,points,cam,.035);ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='rgba(6,7,6,.92)';ctx.lineWidth=Math.max(3,cam.scale*(major?.34:.24));ctx.stroke();
  trace(ctx,points,cam,.042);ctx.strokeStyle=major?'rgba(210,186,139,.34)':'rgba(169,150,119,.25)';ctx.lineWidth=Math.max(1,cam.scale*.055);ctx.stroke();
}
function drawRingRoad(ctx,r,cam,alphaV){
  const pts=[];for(let i=0;i<=72;i++){const a=i*TAU/72;pts.push({x:Math.cos(a)*r,z:Math.sin(a)*r})}
  trace(ctx,pts,cam,.035);ctx.strokeStyle='rgba(9,10,9,.88)';ctx.lineWidth=Math.max(3,cam.scale*.22);ctx.stroke();
  trace(ctx,pts,cam,.04);ctx.strokeStyle='rgba(188,164,126,'+(alphaV||.22)+')';ctx.lineWidth=Math.max(1,cam.scale*.045);ctx.stroke();
}
function drawWorld(ctx,layout,env){
  const cam=camera(layout,env||{}),preview=!!(env&&env.preview),detail=Number(env&&env.detail)||cam.scale/18;
  ctx.save();ctx.clearRect(0,0,cam.w,cam.h);
  ctx.fillStyle='#070806';ctx.fillRect(0,0,cam.w,cam.h);

  const glow=ctx.createRadialGradient(cam.w*.52,cam.h*.54,0,cam.w*.52,cam.h*.54,Math.max(cam.w,cam.h)*.7);
  glow.addColorStop(0,'rgba(54,46,35,.30)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,cam.w,cam.h);

  if(layout.variant==='archipelago'){
    const sea=ctx.createLinearGradient(0,0,0,cam.h);sea.addColorStop(0,'rgba(18,29,30,.52)');sea.addColorStop(1,'rgba(8,14,14,.18)');ctx.fillStyle=sea;ctx.fillRect(0,0,cam.w,cam.h);
  }

  for(const t of layout.territories){
    if(t.ghost){
      trace(ctx,t.poly,cam,.01);ctx.closePath();ctx.fillStyle=alpha(t.color,.035);ctx.fill();ctx.strokeStyle=alpha(t.color,.18);ctx.lineWidth=1;ctx.setLineDash([5,7]);ctx.stroke();ctx.setLineDash([]);
    }else{
      drawGroundPoly(ctx,t.poly,cam,alpha(t.color,.11),alpha(t.color,.42),Math.max(1,cam.scale*.035));
    }
  }

  for(const p of layout.platforms)drawPlatform(ctx,p.x,p.z,p.r,.12,cam,alpha(p.color,.23),alpha(p.color,.66),10);

  for(const r of layout.roads){
    if(r.kind==='ring')drawRingRoad(ctx,r.r,cam,r.r<5?.28:.17);
    else if(r.kind==='localRing')drawRingRoadLocal(ctx,r,cam);
    else if(r.kind==='radial'){
      const pts=[{x:Math.cos(r.angle)*r.r0,z:Math.sin(r.angle)*r.r0},{x:Math.cos(r.angle)*r.r1,z:Math.sin(r.angle)*r.r1}];
      drawRoadPolyline(ctx,pts,cam,false);
    }else if(r.points)drawRoadPolyline(ctx,r.points,cam,!!r.major);
  }

  for(const h of layout.hubs){
    drawPlatform(ctx,h.x,h.z,h.r,.08,cam,'#24231e','#726754',12);
    if(!preview&&detail>.55){const q=project(cam,h.x,h.z,.12);ctx.fillStyle='rgba(214,198,165,.55)';ctx.font='700 '+clamp(cam.scale*.20,7,11)+'px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText(h.label,q.x,q.y)}
  }

  for(const p of layout.paths){
    drawRoadPolyline(ctx,p.points,cam,false);
  }

  for(const m of layout.merges){
    const q=project(cam,m.x,m.z,.065),rr=Math.max(2.5,cam.scale*.14);
    ctx.beginPath();ctx.ellipse(q.x,q.y,rr,rr*.44,0,0,TAU);ctx.fillStyle='rgba(218,184,124,.16)';ctx.fill();ctx.strokeStyle='rgba(218,184,124,.42)';ctx.lineWidth=1;ctx.stroke();
  }

  for(const o of layout.origins){
    const dx=Math.cos(o.angle||0),dz=Math.sin(o.angle||0),tx=-dz,tz=dx;
    const a={x:o.x+tx*.46,z:o.z+tz*.46},b={x:o.x-tx*.46,z:o.z-tz*.46};
    drawBox(ctx,a.x,a.z,.20,.20,.78,cam,'#65513b','#aa8458');
    drawBox(ctx,b.x,b.z,.20,.20,.78,cam,'#65513b','#aa8458');
    const mid=project(cam,o.x,o.z,.86),p1=project(cam,a.x,a.z,.86),p2=project(cam,b.x,b.z,.86);
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle='rgba(190,151,96,.8)';ctx.lineWidth=Math.max(1,cam.scale*.08);ctx.stroke();
    if(!preview&&detail>.75){ctx.fillStyle='rgba(218,197,157,.78)';ctx.font='800 '+clamp(cam.scale*.22,8,12)+'px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('ORIGEN',mid.x,mid.y-5)}
  }

  const drawables=[];
  for(const s of layout.nodeList){const p=project(cam,s.x,s.z,s.h);drawables.push({depth:p.depth,type:'node',v:s})}
  for(const l of layout.landmarks){const p=project(cam,l.x,l.z,0);drawables.push({depth:p.depth+.05,type:'tower',v:l})}
  drawables.sort((a,b)=>a.depth-b.depth);

  for(const d of drawables){
    if(d.type==='tower'){
      const l=d.v;drawBox(ctx,l.x,l.z,.62,.62,l.height,cam,alpha(l.color,.82),'#211914');
      const cap=project(cam,l.x,l.z,l.height+.10);
      ctx.beginPath();ctx.arc(cap.x,cap.y,Math.max(1.5,cam.scale*.10),0,TAU);ctx.fillStyle='#e2c690';ctx.fill();
      continue;
    }
    const s=d.v,n=s.node,sty=STATE[n.state]||STATE.BLOCKED;
    const rad=s.radius*(n.node_kind==='SYNTHESIS'?1.18:1);
    drawPlatform(ctx,s.x,s.z,rad,s.h,cam,sty.fill,sty.rim,n.node_kind==='ROOT'?4:n.node_kind==='VERIFY'?6:8);
    const q=project(cam,s.x,s.z,s.h+.06);
    ctx.fillStyle='#f0dcc0';ctx.font='900 '+clamp(cam.scale*.28,8,15)+'px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(KIND_LETTER[n.node_kind]||'•',q.x,q.y);
    if(!preview&&detail>1.05){
      const label=String(n.title||n.node_key||'').slice(0,24);
      ctx.font='700 '+clamp(cam.scale*.18,7,10)+'px system-ui,sans-serif';ctx.fillStyle='rgba(231,220,198,.78)';ctx.textBaseline='top';ctx.fillText(label,q.x,q.y+Math.max(7,cam.scale*.32));
    }
  }

  if(!preview){
    for(const t of layout.territories){
      const q=project(cam,t.center.x,t.center.z,.03);
      ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-.10);
      ctx.font='900 '+clamp(cam.scale*.27,9,16)+'px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=alpha(t.color,.88);
      ctx.fillText(String(t.title||t.project_key).toUpperCase().slice(0,22),0,0);ctx.restore();
    }
  }

  const vignette=ctx.createRadialGradient(cam.w*.5,cam.h*.52,Math.min(cam.w,cam.h)*.25,cam.w*.5,cam.h*.52,Math.max(cam.w,cam.h)*.72);
  vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.62)');ctx.fillStyle=vignette;ctx.fillRect(0,0,cam.w,cam.h);
  ctx.restore();
}
function drawRingRoadLocal(ctx,r,cam){
  const pts=[];for(let i=0;i<=52;i++){const a=i*TAU/52;pts.push({x:r.x+Math.cos(a)*r.r,z:r.z+Math.sin(a)*r.r})}
  drawRoadPolyline(ctx,pts,cam,false);
}

g.COLISEO_LAB_MODULE={
  id:'maps',
  version:'1.0.0',
  variants:VARIANTS,
  layoutWorld,
  drawWorld
};
})(window);
