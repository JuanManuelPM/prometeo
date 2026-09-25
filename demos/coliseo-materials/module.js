(function(g){
'use strict';
const TAU=Math.PI*2;
const tokens=Object.freeze({
  palette:{
    void:'#050605', ink:'#d6c3a5', muted:'#756a5d', outline:'#0b0c0b', outlineHi:'#322f29',
    stone:'#4a4a43', stoneHi:'#67675f', stoneLo:'#292a27', wood:'#5b3b28', woodHi:'#876247', woodLo:'#2f2119',
    metal:'#5d6665', metalHi:'#96a3a0', metalLo:'#2b3131', dark:'#151816', darkHi:'#282d29', glass:'#8fa9a2',
    glassEdge:'#c3d1ca', ember:'#d46f32', emberHi:'#f2bd69', cyan:'#65b9b0', cyanHi:'#a7eee1', acid:'#98aa57',
    red:'#a44332', redHi:'#e07a54', sand:'#8b7657'
  },
  line:{hair:1,strong:1.75,hero:2.6},
  alpha:{glass:.14,glassFill:.28,shadow:.34,glow:.25},
  perf:{particleCap:48,farDetailScale:.62}
});
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rnd(seed){const x=Math.sin(seed*12.9898+78.233)*43758.5453;return x-Math.floor(x)}
function col(p){return tokens.palette[p]||p||tokens.palette.ink}
function rgba(hex,a){
  if(!hex||hex[0]!=='#')return hex;
  let h=hex.slice(1); if(h.length===3)h=h.split('').map(x=>x+x).join('');
  const n=parseInt(h,16); return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}
function ellipsePath(c,x,y,rx,ry){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU)}
function poly(c,pts,close=true){if(!pts||!pts.length)return;c.beginPath();c.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)c.lineTo(pts[i].x,pts[i].y);if(close)c.closePath()}
function material(id){
  const P=tokens.palette;
  return {
    stone:{base:P.stone,hi:P.stoneHi,lo:P.stoneLo},
    wood:{base:P.wood,hi:P.woodHi,lo:P.woodLo},
    metal:{base:P.metal,hi:P.metalHi,lo:P.metalLo},
    dark:{base:P.dark,hi:P.darkHi,lo:'#0b0d0c'},
    glass:{base:P.glass,hi:P.glassEdge,lo:'#29403a'}
  }[id]||{base:P.dark,hi:P.darkHi,lo:'#0b0d0c'};
}
function drawShadow(c,p,e){
  const a=p.alpha==null?tokens.alpha.shadow:p.alpha, x=p.x||0,y=p.y||0,rx=p.rx||24,ry=p.ry||8;
  c.save(); c.globalAlpha=a; c.fillStyle=p.color||'#000'; ellipsePath(c,x,y,rx,ry); c.fill(); c.restore();
}
function fillMaterial(c,p,e){
  const m=material(p.material||'dark'),x=p.x||0,y=p.y||0,w=p.w||60,h=p.h||40,seed=p.seed||1;
  c.fillStyle=p.color||m.base;c.fillRect(x,y,w,h);
  const detail=(e.detail==null?1:e.detail)*(e.scale&&e.scale<.6?tokens.perf.farDetailScale:1);
  if(detail>.25){
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    c.globalAlpha=.12;
    if((p.material||'dark')==='stone'){
      c.strokeStyle=m.hi;c.lineWidth=1;
      const n=Math.min(22,Math.max(5,Math.floor(w*h/900)));
      for(let i=0;i<n;i++){const xx=x+rnd(seed+i)*w,yy=y+rnd(seed+i*13)*h,rr=2+rnd(seed+i*7)*8;c.beginPath();c.moveTo(xx-rr,yy);c.lineTo(xx+rr*.5,yy+rr*.25);c.stroke()}
    } else if(p.material==='wood'){
      c.strokeStyle=m.hi;c.lineWidth=1;
      for(let i=1;i<5;i++){const yy=y+h*i/5+(rnd(seed+i)-.5)*4;c.beginPath();c.moveTo(x,yy);c.bezierCurveTo(x+w*.25,yy+3,x+w*.65,yy-3,x+w,yy+1);c.stroke()}
    } else if(p.material==='metal'){
      c.strokeStyle=m.hi;c.lineWidth=1;
      for(let i=0;i<4;i++){const yy=y+h*(.18+i*.21);c.beginPath();c.moveTo(x+4,yy);c.lineTo(x+w-4,yy);c.stroke()}
    } else {
      c.fillStyle=m.hi;for(let i=0;i<6;i++)c.fillRect(x+rnd(seed+i)*w,y+rnd(seed+i*9)*h,1,1);
    }
    c.restore();
  }
  c.strokeStyle=p.outline||tokens.palette.outline;c.lineWidth=p.lineWidth||tokens.line.strong;c.strokeRect(x+.5,y+.5,w-1,h-1);
  c.strokeStyle=rgba(m.hi,.42);c.lineWidth=1;c.beginPath();c.moveTo(x+2,y+2);c.lineTo(x+w-2,y+2);c.stroke();
}
function drawBlock(c,p,e){
  const x=p.x||0,y=p.y||0,w=p.w||70,h=p.h||42,d=p.depth||12,m=material(p.material||'stone');
  if(p.shadow!==false)drawShadow(c,{x:x+w*.52,y:y+h+d+5,rx:w*.62,ry:7,alpha:.28},e);
  c.save();
  poly(c,[{x,y},{x:x+d,y:y-d},{x:x+w+d,y:y-d},{x:x+w,y}],true);c.fillStyle=p.top||m.hi;c.fill();c.strokeStyle=tokens.palette.outline;c.lineWidth=1.4;c.stroke();
  poly(c,[{x:x+w,y},{x:x+w+d,y:y-d},{x:x+w+d,y:y+h-d},{x:x+w,y:y+h}],true);c.fillStyle=p.side||m.lo;c.fill();c.stroke();
  fillMaterial(c,{...p,x,y,w,h,material:p.material||'stone'},e);
  c.restore();
}
function drawGlassBox(c,p,e){
  const x=p.x||0,y=p.y||0,w=p.w||70,h=p.h||60,d=p.depth||9,edge=col(p.edge||'glassEdge');
  if(p.shadow!==false)drawShadow(c,{x:x+w*.5,y:y+h+7,rx:w*.55,ry:7,alpha:.22},e);
  c.save();
  c.fillStyle=rgba(col(p.tint||'glass'),p.alpha==null?.10:p.alpha);c.fillRect(x,y,w,h);
  poly(c,[{x,y},{x:x+d,y:y-d},{x:x+w+d,y:y-d},{x:x+w,y}],true);c.fillStyle=rgba(col(p.tint||'glass'),.16);c.fill();
  poly(c,[{x:x+w,y},{x:x+w+d,y:y-d},{x:x+w+d,y:y+h-d},{x:x+w,y:y+h}],true);c.fillStyle=rgba(col(p.tint||'glass'),.08);c.fill();
  c.strokeStyle=rgba(edge,.92);c.lineWidth=p.lineWidth||1.6;c.strokeRect(x+.5,y+.5,w-1,h-1);
  c.globalAlpha=.35;c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.moveTo(x+w*.16,y+4);c.lineTo(x+w*.64,y+4);c.stroke();
  if(p.fill!=null){const f=clamp(p.fill,0,1),fh=(h-8)*f,fy=y+h-4-fh;c.fillStyle=rgba(col(p.fillColor||'cyan'),.28);c.fillRect(x+4,fy,w-8,fh);c.strokeStyle=rgba(col(p.fillColor||'cyanHi'),.55);c.beginPath();c.moveTo(x+4,fy);c.lineTo(x+w-4,fy);c.stroke()}
  c.restore();
}
function drawCylinder(c,p,e){
  const x=p.x||0,y=p.y||0,w=p.w||44,h=p.h||110,rx=w*.5,ry=p.ellipse||Math.max(4,w*.15),fill=clamp(p.fill==null?0:p.fill,0,1);
  const edge=col(p.edge||'glassEdge'), fillCol=col(p.fillColor||'ember'), variant=p.variant||'ribbed', seg=p.segments||10, alpha=p.alpha==null?.13:p.alpha;
  if(p.shadow!==false)drawShadow(c,{x,y:y+h+ry*.75,rx:w*.72,ry:ry*.8,alpha:.30},e);
  c.save();
  c.fillStyle=rgba(col(p.tint||'glass'),alpha);c.fillRect(x-rx,y,w,h);
  ellipsePath(c,x,y,rx,ry);c.fillStyle=rgba(col(p.tint||'glass'),alpha*.9);c.fill();
  ellipsePath(c,x,y+h,rx,ry);c.fillStyle=rgba(col(p.tint||'glass'),alpha*.65);c.fill();
  if(fill>0){
    const fy=y+h*(1-fill), bodyH=h*fill;
    c.fillStyle=rgba(fillCol,p.fillAlpha==null?.48:p.fillAlpha);c.fillRect(x-rx+4,fy,w-8,bodyH);
    ellipsePath(c,x,fy,rx-4,Math.max(2,ry-2));c.fillStyle=rgba(fillCol,.66);c.fill();
    ellipsePath(c,x,y+h,rx-4,Math.max(2,ry-2));c.fillStyle=rgba(fillCol,.42);c.fill();
    if(p.emissive){c.shadowColor=fillCol;c.shadowBlur=Math.min(16,4+(p.emissive||1)*6);ellipsePath(c,x,fy,rx-6,Math.max(1,ry-3));c.strokeStyle=rgba(col(p.fillHi||'emberHi'),.82);c.lineWidth=1.2;c.stroke();c.shadowBlur=0}
  }
  if(variant!=='clean'){
    c.strokeStyle=rgba(edge,variant==='technical'?.78:.48);c.lineWidth=variant==='technical'?1.35:1;
    for(let i=1;i<seg;i++){const yy=y+h*i/seg;c.beginPath();c.moveTo(x-rx-1,yy);c.lineTo(x+rx+1,yy);c.stroke()}
  }
  c.strokeStyle=rgba(edge,.95);c.lineWidth=p.lineWidth||2;c.beginPath();c.moveTo(x-rx,y);c.lineTo(x-rx,y+h);c.moveTo(x+rx,y);c.lineTo(x+rx,y+h);c.stroke();
  ellipsePath(c,x,y,rx,ry);c.stroke();ellipsePath(c,x,y+h,rx,ry);c.stroke();
  c.strokeStyle=rgba(tokens.palette.outline,.95);c.lineWidth=.85;c.beginPath();c.moveTo(x-rx-1.5,y);c.lineTo(x-rx-1.5,y+h);c.moveTo(x+rx+1.5,y);c.lineTo(x+rx+1.5,y+h);c.stroke();
  if(p.inputs&&p.inputs>0){
    const n=Math.min(p.inputs,seg), r=2.2;
    for(let i=0;i<n;i++){const yy=y+h-(i+.5)*h/seg;ellipsePath(c,x+rx+6,yy,r,r);c.fillStyle=rgba(fillCol,.86);c.fill();c.strokeStyle=tokens.palette.outline;c.lineWidth=.7;c.stroke()}
  }
  if(fill>=.999){ellipsePath(c,x,y-ry*.1,rx+3,ry+1);c.strokeStyle=rgba(col(p.completeColor||'cyanHi'),.95);c.lineWidth=2.2;c.stroke()}
  c.restore();
}
function drawPlatform(c,p,e){
  const x=p.x||0,y=p.y||0,rx=p.rx||42,ry=p.ry||13,h=p.h||8,m=material(p.material||'metal');
  if(p.shadow!==false)drawShadow(c,{x,y:y+h+ry*.85,rx:rx*1.12,ry:ry*.72,alpha:.30},e);
  c.save();
  c.fillStyle=p.side||m.lo;c.beginPath();c.ellipse(x,y+h,rx,ry,0,0,TAU);c.fill();
  c.fillStyle=p.top||m.base;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();c.strokeStyle=tokens.palette.outline;c.lineWidth=1.7;c.stroke();
  c.strokeStyle=rgba(m.hi,.48);c.lineWidth=1;c.beginPath();c.ellipse(x,y-1,rx*.82,ry*.72,0,0,TAU);c.stroke();
  if(p.ring){c.strokeStyle=rgba(col(p.ring),.85);c.lineWidth=2;c.beginPath();c.ellipse(x,y,rx*.58,ry*.5,0,0,TAU);c.stroke()}
  c.restore();
}
function drawPath(c,p,e){
  const pts=p.points||[];if(pts.length<2)return;c.save();c.lineCap='round';c.lineJoin='round';
  c.strokeStyle=rgba(p.shadowColor||'#000',p.shadowAlpha==null?.38:p.shadowAlpha);c.lineWidth=(p.width||8)+5;poly(c,pts,false);c.stroke();
  c.strokeStyle=col(p.color||'sand');c.lineWidth=p.width||8;poly(c,pts,false);c.stroke();
  c.strokeStyle=rgba(col(p.edge||'ink'),.35);c.lineWidth=1;poly(c,pts,false);c.stroke();c.restore();
}
function drawArrow(c,p,e){
  const a=p.from||{x:p.x||0,y:p.y||0},b=p.to||{x:(p.x||0)+50,y:p.y||0}, color=col(p.color||'emberHi'),w=p.width||3;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,hs=p.head||9;
  c.save();c.lineCap='round';c.strokeStyle=rgba(tokens.palette.outline,.95);c.lineWidth=w+3;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x-ux*hs*.7,b.y-uy*hs*.7);c.stroke();
  c.strokeStyle=color;c.lineWidth=w;c.stroke();
  poly(c,[{x:b.x,y:b.y},{x:b.x-ux*hs-uy*hs*.55,y:b.y-uy*hs+ux*hs*.55},{x:b.x-ux*hs+uy*hs*.55,y:b.y-uy*hs-ux*hs*.55}],true);c.fillStyle=color;c.fill();c.strokeStyle=tokens.palette.outline;c.lineWidth=1;c.stroke();c.restore();
}
function drawGlow(c,p,e){
  const x=p.x||0,y=p.y||0,r=p.r||18,color=col(p.color||'cyan');c.save();
  const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,rgba(color,p.alpha==null?.55:p.alpha));gr.addColorStop(.35,rgba(color,.20));gr.addColorStop(1,rgba(color,0));c.fillStyle=gr;ellipsePath(c,x,y,r,r);c.fill();c.restore();
}
function drawToken(c,p,e){
  const x=p.x||0,y=p.y||0,r=p.r||7,color=col(p.color||'emberHi'),shape=p.shape||'hex';c.save();
  if(p.emissive){c.shadowColor=color;c.shadowBlur=8}
  if(shape==='disc'){ellipsePath(c,x,y,r,r*.48)}else{const pts=[];for(let i=0;i<6;i++){const a=-Math.PI/2+i*TAU/6;pts.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r})}poly(c,pts,true)}
  c.fillStyle=color;c.fill();c.shadowBlur=0;c.strokeStyle=tokens.palette.outline;c.lineWidth=1;c.stroke();c.restore();
}
function drawWall(c,p,e){
  drawBlock(c,{...p,depth:p.depth==null?7:p.depth,material:p.material||'stone',shadow:p.shadow},e);
  if(p.bolts){const x=p.x||0,y=p.y||0,w=p.w||80,h=p.h||45;c.save();c.fillStyle=rgba(tokens.palette.metalHi,.65);[[6,6],[w-6,6],[6,h-6],[w-6,h-6]].forEach(([dx,dy])=>{ellipsePath(c,x+dx,y+dy,1.5,1.5);c.fill()});c.restore()}
}
function drawStation(c,p,e){
  const x=p.x||0,y=p.y||0,w=p.w||90,h=p.h||42;
  drawPlatform(c,{x:x+w*.5,y:y+h+6,rx:w*.56,ry:11,h:6,material:p.material||'metal',ring:p.ring||'ember'},e);
  drawBlock(c,{x,y,w,h,depth:8,material:p.bodyMaterial||'dark',shadow:false},e);
  if(p.slot!==false){drawGlassBox(c,{x:x+w*.18,y:y+8,w:w*.64,h:h*.45,depth:4,fill:p.fill,fillColor:p.fillColor||'cyan',shadow:false},e)}
}
function drawParticles(c,p,e){
  const n=Math.min(p.count||12,tokens.perf.particleCap),x=p.x||0,y=p.y||0,spread=p.spread||28,time=(e.now||0)*.001,seed=p.seed||1,color=col(p.color||'emberHi');
  c.save();for(let i=0;i<n;i++){const life=(time*(p.speed||.7)+rnd(seed+i)*2)%1,ang=(rnd(seed+i*7)-.5)*1.5,rr=spread*life,px=x+Math.sin(ang)*rr,py=y-life*(p.rise||32)+(rnd(seed+i*9)-.5)*8;c.globalAlpha=(1-life)*(.35+rnd(seed+i*4)*.65);c.fillStyle=color;const s=1+rnd(seed+i*3)*2;c.fillRect(px,py,s,s)}c.restore();
}
function drawFlash(c,p,e){
  const x=p.x||0,y=p.y||0,r=p.r||24,color=col(p.color||'emberHi'),phase=p.phase==null?.5:p.phase;c.save();c.globalAlpha=clamp(phase,0,1);c.strokeStyle=color;c.lineWidth=2;ellipsePath(c,x,y,r*(1-phase*.45),r*(1-phase*.45));c.stroke();for(let i=0;i<8;i++){const a=i*TAU/8,ra=r*.45,rb=r;c.beginPath();c.moveTo(x+Math.cos(a)*ra,y+Math.sin(a)*ra);c.lineTo(x+Math.cos(a)*rb,y+Math.sin(a)*rb);c.stroke()}c.restore();
}
function drawHologram(c,p,e){
  const x=p.x||0,y=p.y||0,w=p.w||58,h=p.h||64,color=col(p.color||'cyanHi'),t=(e.now||0)*.002;c.save();
  c.globalAlpha=p.alpha==null?.55:p.alpha;c.strokeStyle=color;c.lineWidth=1.2;c.setLineDash([3,4]);c.strokeRect(x,y,w,h);c.setLineDash([]);
  for(let i=0;i<5;i++){const yy=y+((i/5+t%1)*h)%h;c.globalAlpha=.13;c.fillStyle=color;c.fillRect(x+2,yy,w-4,1)}
  c.globalAlpha=.45;c.beginPath();c.moveTo(x+w*.5,y+4);c.lineTo(x+w-5,y+h-5);c.lineTo(x+5,y+h-5);c.closePath();c.stroke();c.restore();
}
function drawPrimitive(ctx,p={},env={}){
  if(!ctx||!p)return false;
  const type=(p.type||'block').toLowerCase();
  const e={scale:env.scale==null?1:env.scale,detail:env.detail==null?1:env.detail,now:env.now==null?performance.now():env.now};
  switch(type){
    case 'shadow':drawShadow(ctx,p,e);break;
    case 'block':case 'solid':drawBlock(ctx,p,e);break;
    case 'glassbox':case 'glass-box':drawGlassBox(ctx,p,e);break;
    case 'cylinder':case 'progress-cylinder':drawCylinder(ctx,p,e);break;
    case 'platform':case 'node-platform':drawPlatform(ctx,p,e);break;
    case 'path':drawPath(ctx,p,e);break;
    case 'arrow':drawArrow(ctx,p,e);break;
    case 'glow':drawGlow(ctx,p,e);break;
    case 'token':case 'output-token':drawToken(ctx,p,e);break;
    case 'wall':drawWall(ctx,p,e);break;
    case 'station':drawStation(ctx,p,e);break;
    case 'particles':drawParticles(ctx,p,e);break;
    case 'flash':case 'impact':drawFlash(ctx,p,e);break;
    case 'hologram':drawHologram(ctx,p,e);break;
    default:return false;
  }
  return true;
}
g.COLISEO_LAB_MODULE={id:'materials',version:'1.0.0',tokens,drawPrimitive};
})(window);
