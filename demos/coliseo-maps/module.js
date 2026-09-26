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
  const zoom=clamp(Number(env&&env.zoom)||1,.48,3.15);
  const fit=Math.min((w*.91)/spanX,(h*.80)/(spanZ*pitch+6.3));
  return {w,h,yaw,pitch,scale:fit*zoom,cx:w*.50+(Number(env&&env.panX)||0),cy:h*.57+(Number(env&&env.panY)||0)};
}
function project(cam,x,z,h){
  const c=Math.cos(cam.yaw),s=Math.sin(cam.yaw);
  const rx=x*c-z*s,rz=x*s+z*c;
  return {x:cam.cx+rx*cam.scale,y:cam.cy+rz*cam.scale*cam.pitch-(h||0)*cam.scale*.78,depth:rz+(h||0)*.14};
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
function noise(a,b){const n=Math.sin(a*12.9898+b*78.233)*43758.5453;return n-Math.floor(n)}
function shade(hex,amt){
  if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;
  const n=parseInt(hex.slice(1),16),r=clamp((n>>16)+amt,0,255),g=clamp(((n>>8)&255)+amt,0,255),b=clamp((n&255)+amt,0,255);
  return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}
const MATERIALS=[
  {id:'FORTRESS',base:'#665448',deep:'#302821',light:'#8c7259',line:'#221914',dust:'#a08460'},
  {id:'ARCHIVE',base:'#3d5549',deep:'#1f3129',light:'#718174',line:'#101813',dust:'#8f825b'},
  {id:'CIVIC',base:'#705a48',deep:'#382e26',light:'#96765b',line:'#1b130f',dust:'#b18a5e'}
];
const ROAD={base:'#2d2924',deep:'#171512',line:'#8d7657',edge:'#4c4337'};
function projectedPoly(poly,cam,h){
  return poly.map(p=>project(cam,p.x,p.z,h||0));
}
function pathProjected(ctx,pts){
  if(!pts.length)return;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();
}
function drawMaterialPoly(ctx,poly,cam,mat,seed,opacity){
  const pp=projectedPoly(poly,cam,.015);pathProjected(ctx,pp);ctx.fillStyle=alpha(mat.base,opacity==null?.96:opacity);ctx.fill();
  ctx.save();pathProjected(ctx,pp);ctx.clip();
  const xs=poly.map(p=>p.x),zs=poly.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  ctx.lineCap='round';
  for(let i=0;i<34;i++){
    const x=minX+(maxX-minX)*noise(seed+i,11),z=minZ+(maxZ-minZ)*noise(seed+i,29);
    const len=.25+.75*noise(seed+i,47),ang=noise(seed+i,63)*TAU;
    const a=project(cam,x,z,.025),b=project(cam,x+Math.cos(ang)*len,z+Math.sin(ang)*len,.025);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=alpha(i%5?mat.deep:mat.light,.18+i%3*.035);ctx.lineWidth=Math.max(.45,cam.scale*.018);ctx.stroke();
  }
  for(let i=0;i<18;i++){
    const x=minX+(maxX-minX)*noise(seed+i,101),z=minZ+(maxZ-minZ)*noise(seed+i,131),q=project(cam,x,z,.028);
    ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.35,cam.scale*(.018+.025*noise(seed+i,151))),0,TAU);ctx.fillStyle=alpha(mat.dust,.10);ctx.fill();
  }
  ctx.restore();
  pathProjected(ctx,pp);ctx.strokeStyle=alpha(mat.line,.88);ctx.lineWidth=Math.max(.8,cam.scale*.030);ctx.stroke();
}
function segmentQuad(a,b,half){
  const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*half,nz=dx/l*half;
  return [{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz},{x:a.x-nx,z:a.z-nz}];
}
function drawRoadSegment(ctx,a,b,cam,major,seed){
  const outer=segmentQuad(a,b,major?.32:.24),inner=segmentQuad(a,b,major?.23:.17);
  drawMaterialPoly(ctx,outer,cam,{base:ROAD.edge,deep:ROAD.deep,light:ROAD.line,line:ROAD.deep,dust:ROAD.line},seed,.96);
  drawMaterialPoly(ctx,inner,cam,{base:ROAD.base,deep:ROAD.deep,light:'#6d604f',line:ROAD.deep,dust:'#a28760'},seed+100,.98);
  const p1=project(cam,a.x,a.z,.04),p2=project(cam,b.x,b.z,.04);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);
  ctx.strokeStyle=alpha(major?'#d2b882':'#a28b68',major?.30:.20);ctx.lineWidth=Math.max(.55,cam.scale*.022);ctx.setLineDash([Math.max(2,cam.scale*.18),Math.max(2,cam.scale*.22)]);ctx.stroke();ctx.setLineDash([]);
}
function drawRoadPolyline(ctx,points,cam,major,seed){
  for(let i=0;i<points.length-1;i++)drawRoadSegment(ctx,points[i],points[i+1],cam,major,(seed||0)+i*17);
}
function ringPoints(r,n){const pts=[];for(let i=0;i<=n;i++){const a=i*TAU/n;pts.push({x:Math.cos(a)*r,z:Math.sin(a)*r})}return pts}
function drawRingRoad(ctx,r,cam,major,seed){drawRoadPolyline(ctx,ringPoints(r,64),cam,major,seed)}
function drawPrism(ctx,poly,height,baseH,cam,mat,seed){
  const bot=projectedPoly(poly,cam,baseH||0),top=projectedPoly(poly,cam,(baseH||0)+height),faces=[];
  for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;faces.push({d:(project(cam,poly[i].x,poly[i].z,baseH).depth+project(cam,poly[j].x,poly[j].z,baseH).depth)/2,pts:[bot[i],bot[j],top[j],top[i]],i})}
  faces.sort((a,b)=>a.d-b.d);
  for(const f of faces){pathProjected(ctx,f.pts);ctx.fillStyle=shade(mat.base,-18-(f.i%2)*10);ctx.fill();ctx.strokeStyle=alpha(mat.line,.84);ctx.lineWidth=Math.max(.7,cam.scale*.025);ctx.stroke()}
  pathProjected(ctx,top);ctx.fillStyle=shade(mat.base,14);ctx.fill();ctx.strokeStyle=alpha(mat.line,.9);ctx.lineWidth=Math.max(.8,cam.scale*.028);ctx.stroke();
  const center=poly.reduce((a,p)=>({x:a.x+p.x/poly.length,z:a.z+p.z/poly.length}),{x:0,z:0});
  for(let i=0;i<4;i++){const q=project(cam,center.x+(noise(seed,i)-.5)*.35,center.z+(noise(seed,i+9)-.5)*.35,(baseH||0)+height+.02);ctx.fillStyle=alpha(mat.light,.16);ctx.fillRect(q.x,q.y,Math.max(1,cam.scale*.035),Math.max(1,cam.scale*.02))}
}
function boxPoly(x,z,w,d,rot){
  const c=Math.cos(rot||0),s=Math.sin(rot||0),pts=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
  return pts.map(([lx,lz])=>({x:x+lx*c-lz*s,z:z+lx*s+lz*c}));
}
function drawBox(ctx,x,z,w,d,height,cam,mat,seed,rot,baseH){drawPrism(ctx,boxPoly(x,z,w,d,rot||0),height,baseH||0,cam,mat,seed||0)}
function drawWallSegment(ctx,a,b,height,cam,mat,seed,thickness){
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,rot=Math.atan2(dz,dx);
  drawBox(ctx,mx,mz,len,thickness||.22,height,cam,mat,seed,rot,0);
}
function drawGatewayWalls(ctx,angle,radius,cam,mat,seed){
  const cx=Math.cos(angle)*radius,cz=Math.sin(angle)*radius,tx=-Math.sin(angle),tz=Math.cos(angle);
  const pt=t=>({x:cx+tx*t,z:cz+tz*t});
  drawWallSegment(ctx,pt(-3.0),pt(-1.12),.72,cam,mat,seed,.30);
  drawWallSegment(ctx,pt(1.12),pt(3.0),.72,cam,mat,seed+1,.30);
  drawBox(ctx,pt(-1.12).x,pt(-1.12).z,.42,.42,1.32,cam,mat,seed+2,angle,0);
  drawBox(ctx,pt(1.12).x,pt(1.12).z,.42,.42,1.32,cam,mat,seed+3,angle,0);
}
function drawNode(ctx,s,cam,mat,detail){
  const n=s.node,sty=STATE[n.state]||STATE.BLOCKED,rot=(s.angle||0)+Math.PI/4;
  const baseMat={base:sty.fill,deep:shade(sty.fill,-22),light:sty.rim,line:'#171310',dust:mat.dust};
  const rad=s.radius*(n.node_kind==='SYNTHESIS'?1.16:1);
  drawBox(ctx,s.x,s.z,rad*1.32,rad*1.32,.18,cam,baseMat,210+n.node_key.length,rot,0);
  const levels=n.node_kind==='SYNTHESIS'?3:n.node_kind==='PROMOTION'?2:1;
  for(let y=0;y<levels;y++)drawBox(ctx,s.x,s.z,rad*.78-y*.05,rad*.78-y*.05,.16,cam,baseMat,230+y,rot,.18+y*.16);
  const q=project(cam,s.x,s.z,.23+levels*.16);
  ctx.fillStyle='#f0dcc0';ctx.font='900 '+clamp(cam.scale*.24,8,14)+'px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(KIND_LETTER[n.node_kind]||'•',q.x,q.y);
  if(detail>1.2){const label=String(n.title||n.node_key||'').slice(0,17);ctx.font='700 '+clamp(cam.scale*.15,7,9)+'px ui-monospace,monospace';ctx.fillStyle='rgba(239,225,197,.62)';ctx.textBaseline='top';ctx.fillText(label,q.x,q.y+6)}
}
function drawLandmark(ctx,l,cam,mat,seed){
  const h=Math.max(1.25,l.height),steps=Math.max(3,Math.min(7,Math.round(h/.65)));
  for(let y=0;y<steps;y++){const s=.86-y*.045;drawBox(ctx,l.x,l.z,s,s,h/steps*.92,cam,mat,seed+y*7,Math.PI/4,y*h/steps)}
  drawBox(ctx,l.x,l.z,1.08,1.08,.18,cam,{...mat,base:'#8b7048',light:'#d2ad69'},seed+90,Math.PI/4,h+.03);
  const q=project(cam,l.x,l.z,h+.34),rr=Math.max(1.5,cam.scale*.10);ctx.beginPath();ctx.arc(q.x,q.y,rr,0,TAU);ctx.fillStyle='#e4c27c';ctx.shadowBlur=rr*3;ctx.shadowColor='rgba(228,194,124,.45)';ctx.fill();ctx.shadowBlur=0;
}
function drawWorkerMarker(ctx,w,cam,seed){
  const s=w.station,a=(seed*.73)%TAU,x=s.x+Math.cos(a)*.46,z=s.z+Math.sin(a)*.46,q=project(cam,x,z,.42),g=project(cam,x,z,.02);
  ctx.beginPath();ctx.ellipse(g.x,g.y,Math.max(2,cam.scale*.15),Math.max(1,cam.scale*.055),0,0,TAU);ctx.fillStyle='rgba(0,0,0,.42)';ctx.fill();
  ctx.beginPath();ctx.arc(q.x,q.y,Math.max(1.8,cam.scale*.09),0,TAU);ctx.fillStyle='#d9ccb0';ctx.fill();ctx.strokeStyle='#332b23';ctx.lineWidth=1;ctx.stroke();
  const stem=project(cam,x,z,.28);ctx.beginPath();ctx.moveTo(stem.x,stem.y);ctx.lineTo(q.x,q.y+1);ctx.strokeStyle='#8f7250';ctx.lineWidth=Math.max(1,cam.scale*.055);ctx.stroke();
}
function worldFurniture(layout,cam){
  const arr=[];
  if(layout.variant==='arena'){
    let i=0;
    for(const c of layout.projectCenters.values()){
      const mat=MATERIALS[i%MATERIALS.length],angle=c.angle;
      arr.push({depth:project(cam,Math.cos(angle)*8.85,Math.sin(angle)*8.85,.3).depth,fn:(ctx)=>drawGatewayWalls(ctx,angle,8.85,cam,mat,600+i*20)});
      arr.push({depth:project(cam,Math.cos(angle)*6.15,Math.sin(angle)*6.15,.3).depth,fn:(ctx)=>drawGatewayWalls(ctx,angle,6.15,cam,mat,700+i*20)});
      const ox=Math.cos(angle+.42)*4.5,oz=Math.sin(angle+.42)*4.5;
      arr.push({depth:project(cam,ox,oz,.7).depth,fn:(ctx)=>drawBox(ctx,ox,oz,.66,.66,1.45,cam,mat,760+i,angle+.2,0)});
      i++;
    }
  }
  return arr;
}
function drawWorld(ctx,layout,env){
  const cam=camera(layout,env||{}),detail=Number(env&&env.detail)||cam.scale/18;
  ctx.save();ctx.clearRect(0,0,cam.w,cam.h);
  const bg=ctx.createLinearGradient(0,0,0,cam.h);bg.addColorStop(0,'#0c0d0b');bg.addColorStop(.58,'#080907');bg.addColorStop(1,'#030403');ctx.fillStyle=bg;ctx.fillRect(0,0,cam.w,cam.h);

  for(let i=0;i<90;i++){const x=noise(i,801)*cam.w,y=noise(i,809)*cam.h,r=.3+noise(i,821)*1.2;ctx.fillStyle='rgba(187,157,112,'+(.012+noise(i,823)*.028)+')';ctx.fillRect(x,y,r,r)}
  const halo=ctx.createRadialGradient(cam.w*.50,cam.h*.55,0,cam.w*.50,cam.h*.55,Math.max(cam.w,cam.h)*.66);halo.addColorStop(0,'rgba(89,69,44,.26)');halo.addColorStop(.55,'rgba(35,31,24,.09)');halo.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,cam.w,cam.h);

  layout.territories.forEach((t,i)=>drawMaterialPoly(ctx,t.poly,cam,MATERIALS[i%MATERIALS.length],100+i*37,t.ghost?.22:.82));

  let roadSeed=1000;
  for(const r of layout.roads){
    if(r.kind==='ring')drawRingRoad(ctx,r.r,cam,r.r<5,roadSeed++);
    else if(r.kind==='localRing')drawRoadPolyline(ctx,ringPoints(r.r,42).map(p=>({x:p.x+r.x,z:p.z+r.z})),cam,false,roadSeed++);
    else if(r.kind==='radial'){
      drawRoadPolyline(ctx,[{x:Math.cos(r.angle)*r.r0,z:Math.sin(r.angle)*r.r0},{x:Math.cos(r.angle)*r.r1,z:Math.sin(r.angle)*r.r1}],cam,true,roadSeed++);
    }else if(r.points)drawRoadPolyline(ctx,r.points,cam,!!r.major,roadSeed++);
  }
  for(const p of layout.paths)drawRoadPolyline(ctx,p.points,cam,false,roadSeed++);

  for(const m of layout.merges){
    const poly=regularPoly(m.x,m.z,.32,8,.1);drawMaterialPoly(ctx,poly,cam,{base:'#8a704b',deep:'#3f3427',light:'#d4ad6a',line:'#241a12',dust:'#dec085'},3100+roadSeed++,.9);
  }

  const drawables=worldFurniture(layout,cam);
  layout.landmarks.forEach((l,i)=>drawables.push({depth:project(cam,l.x,l.z,l.height*.5).depth,fn:(cc)=>drawLandmark(cc,l,cam,MATERIALS[i%MATERIALS.length],4000+i*31)}));
  layout.nodeList.forEach((s,i)=>drawables.push({depth:project(cam,s.x,s.z,.28).depth,fn:(cc)=>drawNode(cc,s,cam,MATERIALS[i%MATERIALS.length],detail)}));
  let wi=0;for(const w of layout.workers.values()){drawables.push({depth:project(cam,w.station.x,w.station.z,.4).depth+.08,fn:(cc)=>drawWorkerMarker(cc,w,cam,wi++)})}
  drawables.sort((a,b)=>a.depth-b.depth);for(const d of drawables)d.fn(ctx);

  layout.origins.forEach((o,i)=>{
    const mat=MATERIALS[i%MATERIALS.length],a=o.angle||0,tx=-Math.sin(a),tz=Math.cos(a),p1={x:o.x+tx*.72,z:o.z+tz*.72},p2={x:o.x-tx*.72,z:o.z-tz*.72};
    drawBox(ctx,p1.x,p1.z,.34,.34,1.05,cam,mat,5200+i*3,a,0);drawBox(ctx,p2.x,p2.z,.34,.34,1.05,cam,mat,5201+i*3,a,0);
    drawWallSegment(ctx,{x:p1.x,z:p1.z},{x:p2.x,z:p2.z},.20,cam,{...mat,base:'#8d7048'},5202+i*3,.20);
  });

  const vignette=ctx.createRadialGradient(cam.w*.5,cam.h*.55,Math.min(cam.w,cam.h)*.25,cam.w*.5,cam.h*.55,Math.max(cam.w,cam.h)*.73);
  vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.72,'rgba(0,0,0,.06)');vignette.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=vignette;ctx.fillRect(0,0,cam.w,cam.h);
  ctx.restore();
}

g.COLISEO_LAB_MODULE={
  id:'maps',
  version:'2.0.0',
  variants:VARIANTS,
  layoutWorld,
  drawWorld
};
})(window);