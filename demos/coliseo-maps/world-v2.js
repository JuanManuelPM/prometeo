(function(g){
'use strict';
const M=g.COLISEO_LAB_MODULE;
if(!M||M.id!=='maps')return;
const TAU=Math.PI*2;
const MATERIALS=[
  {base:'#665448',deep:'#302821',light:'#8c7259',line:'#221914',dust:'#a08460'},
  {base:'#3d5549',deep:'#1f3129',light:'#718174',line:'#101813',dust:'#8f825b'},
  {base:'#705a48',deep:'#382e26',light:'#96765b',line:'#1b130f',dust:'#b18a5e'}
];
const ROAD={base:'#2d2924',deep:'#171512',line:'#8d7657',edge:'#4c4337'};
const KIND={ROOT:'R',REDUCER:'D',SYNTHESIS:'S',VERIFY:'V',PROMOTION:'P'};
const STATE={
  SUCCESS:{fill:'#496353',rim:'#a6bea7'},ACTIVE:{fill:'#915933',rim:'#efb36f'},READY:{fill:'#687657',rim:'#c3d2a5'},
  BLOCKED:{fill:'#443938',rim:'#806c67'},FAILED:{fill:'#683931',rim:'#c87565'},CANCELLED:{fill:'#3b3837',rim:'#696363'}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const noise=(a,b)=>{const n=Math.sin(a*12.9898+b*78.233)*43758.5453;return n-Math.floor(n)};
function alpha(hex,a){if(/^#[0-9a-f]{6}$/i.test(hex)){const n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'}return hex}
function shade(hex,amt){if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;const n=parseInt(hex.slice(1),16),rgb=[(n>>16)&255,(n>>8)&255,n&255].map(v=>clamp(v+amt,0,255));return '#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')}
function camera(layout,env){const w=Math.max(1,+env.width||800),h=Math.max(1,+env.height||500),b=layout.bounds,spanX=Math.max(1,b.maxX-b.minX),spanZ=Math.max(1,b.maxZ-b.minZ),yaw=Number.isFinite(env.yaw)?env.yaw:-.56,pitch=Number.isFinite(env.pitch)?env.pitch:.42,zoom=clamp(+env.zoom||1,.48,3.15),fit=Math.min((w*.92)/spanX,(h*.82)/(spanZ*pitch+6.5));return{w,h,yaw,pitch,scale:fit*zoom,cx:w*.5+(+env.panX||0),cy:h*.58+(+env.panY||0)}}
function project(cam,x,z,h){const c=Math.cos(cam.yaw),s=Math.sin(cam.yaw),rx=x*c-z*s,rz=x*s+z*c;return{x:cam.cx+rx*cam.scale,y:cam.cy+rz*cam.scale*cam.pitch-(h||0)*cam.scale*.78,depth:rz+(h||0)*.14}}
function ppoly(poly,cam,h){return poly.map(p=>project(cam,p.x,p.z,h||0))}
function path(ctx,pts,close=true){if(!pts.length)return;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);if(close)ctx.closePath()}
function materialPoly(ctx,poly,cam,mat,seed,opacity=.94){
  const pp=ppoly(poly,cam,.015);path(ctx,pp);ctx.fillStyle=alpha(mat.base,opacity);ctx.fill();
  ctx.save();path(ctx,pp);ctx.clip();
  const xs=poly.map(p=>p.x),zs=poly.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  ctx.lineCap='round';
  for(let i=0;i<30;i++){const x=minX+(maxX-minX)*noise(seed+i,11),z=minZ+(maxZ-minZ)*noise(seed+i,29),len=.24+.7*noise(seed+i,47),ang=noise(seed+i,63)*TAU,a=project(cam,x,z,.025),b=project(cam,x+Math.cos(ang)*len,z+Math.sin(ang)*len,.025);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=alpha(i%4?mat.deep:mat.light,.17+i%3*.035);ctx.lineWidth=Math.max(.45,cam.scale*.018);ctx.stroke()}
  for(let i=0;i<16;i++){const x=minX+(maxX-minX)*noise(seed+i,101),z=minZ+(maxZ-minZ)*noise(seed+i,131),q=project(cam,x,z,.028);ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.35,cam.scale*(.015+.025*noise(seed+i,151))),0,TAU);ctx.fillStyle=alpha(mat.dust,.10);ctx.fill()}
  ctx.restore();path(ctx,pp);ctx.strokeStyle=alpha(mat.line,.9);ctx.lineWidth=Math.max(.8,cam.scale*.03);ctx.stroke()
}
function segmentQuad(a,b,half){const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*half,nz=dx/l*half;return[{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz},{x:a.x-nx,z:a.z-nz}]}
function roadSegment(ctx,a,b,cam,major,seed){materialPoly(ctx,segmentQuad(a,b,major?.34:.25),cam,{base:ROAD.edge,deep:ROAD.deep,light:ROAD.line,line:ROAD.deep,dust:ROAD.line},seed,.98);materialPoly(ctx,segmentQuad(a,b,major?.24:.18),cam,{base:ROAD.base,deep:ROAD.deep,light:'#6d604f',line:ROAD.deep,dust:'#a28760'},seed+100,.98);const p1=project(cam,a.x,a.z,.04),p2=project(cam,b.x,b.z,.04);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=alpha(major?'#d2b882':'#a28b68',major?.30:.18);ctx.lineWidth=Math.max(.55,cam.scale*.022);ctx.setLineDash([Math.max(2,cam.scale*.18),Math.max(2,cam.scale*.24)]);ctx.stroke();ctx.setLineDash([])}
function road(ctx,pts,cam,major,seed){for(let i=0;i<pts.length-1;i++)roadSegment(ctx,pts[i],pts[i+1],cam,major,seed+i*17)}
function ring(r,n=56){const pts=[];for(let i=0;i<=n;i++){const a=i*TAU/n;pts.push({x:Math.cos(a)*r,z:Math.sin(a)*r})}return pts}
function boxPoly(x,z,w,d,rot){const c=Math.cos(rot||0),s=Math.sin(rot||0);return[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([lx,lz])=>({x:x+lx*c-lz*s,z:z+lx*s+lz*c}))}
function prism(ctx,poly,height,baseH,cam,mat,seed){
  const bot=ppoly(poly,cam,baseH||0),top=ppoly(poly,cam,(baseH||0)+height),faces=[];
  for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;faces.push({d:(project(cam,poly[i].x,poly[i].z,baseH).depth+project(cam,poly[j].x,poly[j].z,baseH).depth)/2,pts:[bot[i],bot[j],top[j],top[i]],i})}
  faces.sort((a,b)=>a.d-b.d);for(const f of faces){path(ctx,f.pts);ctx.fillStyle=shade(mat.base,-18-(f.i%2)*9);ctx.fill();ctx.strokeStyle=alpha(mat.line,.86);ctx.lineWidth=Math.max(.7,cam.scale*.025);ctx.stroke()}
  path(ctx,top);ctx.fillStyle=shade(mat.base,13);ctx.fill();ctx.strokeStyle=alpha(mat.line,.92);ctx.lineWidth=Math.max(.8,cam.scale*.028);ctx.stroke()
}
function box(ctx,x,z,w,d,h,cam,mat,seed,rot=0,baseH=0){prism(ctx,boxPoly(x,z,w,d,rot),h,baseH,cam,mat,seed)}
function wall(ctx,a,b,h,cam,mat,seed,th=.24){const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;box(ctx,mx,mz,l,th,h,cam,mat,seed,Math.atan2(dz,dx),0)}
function gateway(ctx,angle,radius,cam,mat,seed){const cx=Math.cos(angle)*radius,cz=Math.sin(angle)*radius,tx=-Math.sin(angle),tz=Math.cos(angle),pt=t=>({x:cx+tx*t,z:cz+tz*t});wall(ctx,pt(-3),pt(-1.1),.72,cam,mat,seed,.30);wall(ctx,pt(1.1),pt(3),.72,cam,mat,seed+1,.30);for(const t of [-1.1,1.1]){const p=pt(t);box(ctx,p.x,p.z,.42,.42,1.34,cam,mat,seed+2+t,angle,0)}}
function drawNode(ctx,s,cam,mat,detail){const n=s.node,st=STATE[n.state]||STATE.BLOCKED,bm={base:st.fill,deep:shade(st.fill,-22),light:st.rim,line:'#171310',dust:mat.dust},rad=s.radius*(n.node_kind==='SYNTHESIS'?1.16:1),rot=(s.angle||0)+Math.PI/4;box(ctx,s.x,s.z,rad*1.32,rad*1.32,.18,cam,bm,210+String(n.node_key).length,rot,0);const levels=n.node_kind==='SYNTHESIS'?3:n.node_kind==='PROMOTION'?2:1;for(let y=0;y<levels;y++)box(ctx,s.x,s.z,rad*.78-y*.05,rad*.78-y*.05,.16,cam,bm,230+y,rot,.18+y*.16);const q=project(cam,s.x,s.z,.23+levels*.16);ctx.fillStyle='#f0dcc0';ctx.font='900 '+clamp(cam.scale*.24,8,14)+'px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(KIND[n.node_kind]||'•',q.x,q.y);if(detail>1.2){ctx.font='700 '+clamp(cam.scale*.15,7,9)+'px ui-monospace,monospace';ctx.fillStyle='rgba(239,225,197,.62)';ctx.textBaseline='top';ctx.fillText(String(n.title||n.node_key||'').slice(0,17),q.x,q.y+6)}}
function drawLandmark(ctx,l,cam,mat,seed){const h=Math.max(1.25,l.height),steps=Math.max(3,Math.min(7,Math.round(h/.65)));for(let y=0;y<steps;y++){const s=.86-y*.045;box(ctx,l.x,l.z,s,s,h/steps*.92,cam,mat,seed+y*7,Math.PI/4,y*h/steps)}box(ctx,l.x,l.z,1.08,1.08,.18,cam,{...mat,base:'#8b7048',light:'#d2ad69'},seed+90,Math.PI/4,h+.03);const q=project(cam,l.x,l.z,h+.34),rr=Math.max(1.5,cam.scale*.10);ctx.beginPath();ctx.arc(q.x,q.y,rr,0,TAU);ctx.fillStyle='#e4c27c';ctx.shadowBlur=rr*3;ctx.shadowColor='rgba(228,194,124,.45)';ctx.fill();ctx.shadowBlur=0}
function worker(ctx,w,cam,seed){const s=w.station,a=(seed*.73)%TAU,x=s.x+Math.cos(a)*.46,z=s.z+Math.sin(a)*.46,g=project(cam,x,z,.02),q=project(cam,x,z,.42),stem=project(cam,x,z,.28);ctx.beginPath();ctx.ellipse(g.x,g.y,Math.max(2,cam.scale*.15),Math.max(1,cam.scale*.055),0,0,TAU);ctx.fillStyle='rgba(0,0,0,.42)';ctx.fill();ctx.beginPath();ctx.moveTo(stem.x,stem.y);ctx.lineTo(q.x,q.y+1);ctx.strokeStyle='#8f7250';ctx.lineWidth=Math.max(1,cam.scale*.055);ctx.stroke();ctx.beginPath();ctx.arc(q.x,q.y,Math.max(1.8,cam.scale*.09),0,TAU);ctx.fillStyle='#d9ccb0';ctx.fill();ctx.strokeStyle='#332b23';ctx.lineWidth=1;ctx.stroke()}
function furniture(layout,cam){const arr=[];if(layout.variant==='arena'){let i=0;for(const c of layout.projectCenters.values()){const mat=MATERIALS[i%MATERIALS.length],a=c.angle;for(const r of [8.85,6.15])arr.push({depth:project(cam,Math.cos(a)*r,Math.sin(a)*r,.4).depth,fn:cc=>gateway(cc,a,r,cam,mat,600+i*40+r*3)});const ox=Math.cos(a+.42)*4.5,oz=Math.sin(a+.42)*4.5;arr.push({depth:project(cam,ox,oz,.7).depth,fn:cc=>box(cc,ox,oz,.68,.68,1.48,cam,mat,760+i,a+.2,0)});i++}}return arr}
function drawWorld(ctx,layout,env){
  const cam=camera(layout,env||{}),detail=+env.detail||cam.scale/18;
  ctx.save();ctx.clearRect(0,0,cam.w,cam.h);const bg=ctx.createLinearGradient(0,0,0,cam.h);bg.addColorStop(0,'#0c0d0b');bg.addColorStop(.58,'#080907');bg.addColorStop(1,'#030403');ctx.fillStyle=bg;ctx.fillRect(0,0,cam.w,cam.h);
  for(let i=0;i<90;i++){ctx.fillStyle='rgba(187,157,112,'+(.012+noise(i,823)*.028)+')';ctx.fillRect(noise(i,801)*cam.w,noise(i,809)*cam.h,.3+noise(i,821)*1.2,.3+noise(i,821)*1.2)}
  const halo=ctx.createRadialGradient(cam.w*.5,cam.h*.55,0,cam.w*.5,cam.h*.55,Math.max(cam.w,cam.h)*.66);halo.addColorStop(0,'rgba(89,69,44,.26)');halo.addColorStop(.55,'rgba(35,31,24,.09)');halo.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,cam.w,cam.h);
  layout.territories.forEach((t,i)=>materialPoly(ctx,t.poly,cam,MATERIALS[i%MATERIALS.length],100+i*37,t.ghost?.22:.84));
  let seed=1000;for(const r of layout.roads){if(r.kind==='ring')road(ctx,ring(r.r,64),cam,r.r<5,seed++);else if(r.kind==='localRing')road(ctx,ring(r.r,42).map(p=>({x:p.x+r.x,z:p.z+r.z})),cam,false,seed++);else if(r.kind==='radial')road(ctx,[{x:Math.cos(r.angle)*r.r0,z:Math.sin(r.angle)*r.r0},{x:Math.cos(r.angle)*r.r1,z:Math.sin(r.angle)*r.r1}],cam,true,seed++);else if(r.points)road(ctx,r.points,cam,!!r.major,seed++)}
  for(const p of layout.paths)road(ctx,p.points,cam,false,seed++);
  for(const m of layout.merges){const poly=[];for(let i=0;i<8;i++){const a=i*TAU/8+.1;poly.push({x:m.x+Math.cos(a)*.32,z:m.z+Math.sin(a)*.32})}materialPoly(ctx,poly,cam,{base:'#8a704b',deep:'#3f3427',light:'#d4ad6a',line:'#241a12',dust:'#dec085'},3100+seed++,.9)}
  const d=furniture(layout,cam);layout.landmarks.forEach((l,i)=>d.push({depth:project(cam,l.x,l.z,l.height*.5).depth,fn:cc=>drawLandmark(cc,l,cam,MATERIALS[i%MATERIALS.length],4000+i*31)}));layout.nodeList.forEach((s,i)=>d.push({depth:project(cam,s.x,s.z,.28).depth,fn:cc=>drawNode(cc,s,cam,MATERIALS[i%MATERIALS.length],detail)}));let wi=0;for(const w of layout.workers.values())d.push({depth:project(cam,w.station.x,w.station.z,.4).depth+.08,fn:cc=>worker(cc,w,cam,wi++)});d.sort((a,b)=>a.depth-b.depth);for(const x of d)x.fn(ctx);
  layout.origins.forEach((o,i)=>{const mat=MATERIALS[i%MATERIALS.length],a=o.angle||0,tx=-Math.sin(a),tz=Math.cos(a),p1={x:o.x+tx*.72,z:o.z+tz*.72},p2={x:o.x-tx*.72,z:o.z-tz*.72};box(ctx,p1.x,p1.z,.34,.34,1.05,cam,mat,5200+i*3,a,0);box(ctx,p2.x,p2.z,.34,.34,1.05,cam,mat,5201+i*3,a,0);wall(ctx,p1,p2,.20,cam,{...mat,base:'#8d7048'},5202+i*3,.20)});
  const vig=ctx.createRadialGradient(cam.w*.5,cam.h*.55,Math.min(cam.w,cam.h)*.25,cam.w*.5,cam.h*.55,Math.max(cam.w,cam.h)*.73);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(.72,'rgba(0,0,0,.06)');vig.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=vig;ctx.fillRect(0,0,cam.w,cam.h);ctx.restore()
}
M.drawWorld=drawWorld;
M.version='2.0.0-material-world';
const style=document.createElement('style');
style.textContent='.info,.legend,#compare{display:none!important}.mobileInfo{display:none!important}.controls{top:auto!important;bottom:max(14px,env(safe-area-inset-bottom))!important}.worldKey{position:absolute;z-index:11;right:var(--safeR);bottom:max(14px,env(safe-area-inset-bottom));max-width:min(450px,52vw);padding:8px 10px;border-left:1px solid rgba(142,116,78,.55);background:linear-gradient(90deg,rgba(7,8,6,.08),rgba(7,8,6,.70));text-align:right;pointer-events:none}.worldKey b{display:block;font:900 8px/1 ui-monospace,monospace;letter-spacing:.1em;color:#dab37b}.worldKey span{display:block;margin-top:5px;font-size:9px;line-height:1.3;color:#a99e8c}@media(max-width:680px){.worldKey{max-width:58vw}.worldKey span{font-size:8px}}';
document.head.appendChild(style);
document.addEventListener('DOMContentLoaded',()=>{const h=document.querySelector('h1');if(h)h.textContent='Territorios que se pueden habitar';const brand=document.querySelector('.kicker');if(brand)brand.textContent='PROMETEO · MAPS / WORLD · MATERIAL V2';const key=document.createElement('div');key.className='worldKey';key.innerHTML='<b>WORLD-SPACE · MATERIAL FIRST</b><span>piedra, musgo y metal · caminos con ancho físico · muros con portales · hitos altos · jobs y workers siguen legibles al poblarse</span>';document.getElementById('app')?.appendChild(key)});
})(window);