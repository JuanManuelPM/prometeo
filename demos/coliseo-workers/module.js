(function(g){
'use strict';

const TAU=Math.PI*2;
const CONTRACT_STAGES=['CLAIMED','READ','THINK','PLAN','WRITE','BUILD','IMPLEMENT','VERIFY','REVIEW','SUBMIT','WAIT'];
const STAGES=['IDLE','WALK',...CONTRACT_STAGES];
const LIVENESS=['LIVE','AGING','SUSPECT','RECENT_IDLE','RECOVERING','STALE_MEMBERSHIP'];
const DIRS=['down','left','right','up'];

const PALETTES=[
  {ink:'#15110e',body:'#6e513d',body2:'#3d3028',light:'#d9bd91',accent:'#d86b42',cold:'#6f9188'},
  {ink:'#121313',body:'#43534f',body2:'#273330',light:'#c9c7aa',accent:'#c58a43',cold:'#76958e'},
  {ink:'#151113',body:'#58414e',body2:'#302731',light:'#d2b9ad',accent:'#a86148',cold:'#758d98'},
  {ink:'#11110f',body:'#635b43',body2:'#353228',light:'#d5c69c',accent:'#bd7041',cold:'#6b8f83'},
  {ink:'#111214',body:'#46505f',body2:'#272c37',light:'#c2c8cf',accent:'#b66b45',cold:'#728b99'},
  {ink:'#15100f',body:'#68473e',body2:'#352724',light:'#d2b38c',accent:'#c4503e',cold:'#618b82'}
];

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function hashString(s){let h=2166136261>>>0;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function palette(worker){return PALETTES[hashString(worker&&worker.worker_id)%PALETTES.length]}
function normPose(pose){
  pose=pose||{};
  let state=String(pose.state||pose.stage||'IDLE').toUpperCase();
  if(state==='READING')state='READ';
  if(state==='THINKING')state='THINK';
  if(state==='WRITING')state='WRITE';
  if(state==='BUILDING')state='BUILD';
  if(state==='VERIFYING')state='VERIFY';
  if(state==='WAITING')state='WAIT';
  if(!STAGES.includes(state))state='IDLE';
  let direction=String(pose.direction||'down').toLowerCase();
  if(!DIRS.includes(direction))direction='down';
  return {
    state,direction,
    phase:Number.isFinite(pose.phase)?pose.phase:0,
    selected:!!pose.selected,
    liveness:String(pose.liveness||'LIVE').toUpperCase(),
    scale:Number.isFinite(pose.scale)?pose.scale:1,
    family:pose.family||null
  };
}
function bodyBounds(env){
  const scale=clamp(Number(env&&env.scale)||1,.25,8);
  return {width:22*scale,height:28*scale,anchorX:11*scale,anchorY:25*scale};
}
function measureWorker(worker,env){return bodyBounds(env)}

function pxRect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function line(c,x1,y1,x2,y2,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function poly(c,pts,col,stroke,sw){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();if(col){c.fillStyle=col;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=sw||1;c.stroke()}}
function circle(c,x,y,r,col,stroke,sw){c.beginPath();c.arc(x,y,r,0,TAU);if(col){c.fillStyle=col;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=sw||1;c.stroke()}}
function ellipse(c,x,y,rx,ry,col,stroke,sw){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(col){c.fillStyle=col;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=sw||1;c.stroke()}}

function transformForDirection(c,d){
  if(d==='left'){c.scale(-1,1)}
}
function bobFor(p){
  if(p.state==='WALK')return Math.sin(p.phase*TAU*2)*.65;
  if(p.state==='THINK')return Math.sin(p.phase*TAU)*.35;
  if(p.liveness==='RECOVERING')return Math.sin(p.phase*TAU*1.5)*.4;
  return 0;
}
function activityGesture(p){
  const q=(Math.sin(p.phase*TAU)+1)*.5;
  if(p.state==='READ')return {armL:-.55,armR:.45,tool:'book',q};
  if(p.state==='THINK'||p.state==='PLAN')return {armL:-1.15,armR:.25,tool:'think',q};
  if(p.state==='WRITE')return {armL:-.45,armR:-1.05,tool:'pen',q};
  if(p.state==='BUILD'||p.state==='IMPLEMENT')return {armL:.35,armR:-1.15+q*.65,tool:'hammer',q};
  if(p.state==='VERIFY'||p.state==='REVIEW')return {armL:-.65,armR:-.35,tool:'lens',q};
  if(p.state==='CLAIMED')return {armL:.2,armR:-1.45,tool:'claim',q};
  if(p.state==='SUBMIT')return {armL:-.2,armR:-.9,tool:'submit',q};
  if(p.state==='WAIT')return {armL:.15,armR:-.15,tool:'wait',q};
  return {armL:.18,armR:-.18,tool:null,q};
}

// ---------- PIXEL ATLAS ----------
// Each frame is an actual 12x16 bitmap rendered with nearest-neighbour scaling.
const PIX={
  '.':null,'k':'ink','b':'body','B':'body2','l':'light','a':'accent','c':'cold'
};
const PIXEL_FRAMES={
  down:[
    [
      '....kkkk....','...kllllk...','..kllllllk..','..klkllklk..','..kllllllk..','...kllllk...','....kkkk....','...kbbbbk...','..kbbbbbbk..','..kbabbabk..','..kbbbbbbk..','...kbBBbk...','...kB..Bk...','..kB....Bk..','.kB......Bk.','............'
    ],
    [
      '....kkkk....','...kllllk...','..kllllllk..','..klkllklk..','..kllllllk..','...kllllk...','....kkkk....','...kbbbbk...','..kbbbbbbk..','..kbabbabk..','..kbbbbbbk..','...kbBBbk...','..kB....Bk..','...kB..Bk...','....kBBk....','............'
    ]
  ],
  up:[
    [
      '....kkkk....','...kbbbbk...','..kbbbbbbk..','..kbbbbbbk..','..kbbbbbbk..','...kbbbbk...','....kkkk....','...kbbbbk...','..kbbbbbbk..','..kbaaaabk..','..kbbbbbbk..','...kbBBbk...','...kB..Bk...','..kB....Bk..','.kB......Bk.','............'
    ],
    [
      '....kkkk....','...kbbbbk...','..kbbbbbbk..','..kbbbbbbk..','..kbbbbbbk..','...kbbbbk...','....kkkk....','...kbbbbk...','..kbbbbbbk..','..kbaaaabk..','..kbbbbbbk..','...kbBBbk...','..kB....Bk..','...kB..Bk...','....kBBk....','............'
    ]
  ],
  side:[
    ['.....kk.....','....kllk....','...kllllk...','...kllklk...','...kllllk...','....kkkk....','...kbbbk....','..kbbbbbk...','..kbabbk....','..kbbbbbk...','...kbBBk....','...kB.Bk....','..kB..Bk....','..kB...Bk...','.kB.....Bk..','............'],
    ['.....kk.....','....kllk....','...kllllk...','...kllklk...','...kllllk...','....kkkk....','...kbbbk....','..kbbbbbk...','..kbabbk....','..kbbbbbk...','...kbBBk....','..kB...Bk...','...kB.Bk....','....kBBk....','...kB..Bk...','............']
  ]
};
function drawPixel(c,worker,p,env){
  const pal=palette(worker),unit=Math.max(1,Math.round((env.scale||1)*1.35));
  const dir=p.direction==='up'?'up':(p.direction==='down'?'down':'side');
  const moving=p.state==='WALK';
  const frame=(moving?Math.floor(p.phase*4)%2:0);
  const rows=(PIXEL_FRAMES[dir][frame]||PIXEL_FRAMES[dir][0]);
  const ox=-rows[0].length*unit/2,oy=-rows.length*unit+2*unit+bobFor(p)*unit*.45;
  c.save();
  if(p.direction==='left')c.scale(-1,1);
  c.imageSmoothingEnabled=false;
  for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){
    const key=PIX[rows[y][x]];if(!key)continue;pxRect(c,ox+x*unit,oy+y*unit,unit,unit,pal[key]);
  }
  const g=activityGesture(p),q=g.q;
  if(g.tool==='book'){pxRect(c,2*unit,-7*unit,4*unit,3*unit,pal.cold);pxRect(c,4*unit,-7*unit,unit,3*unit,pal.light)}
  if(g.tool==='pen'){pxRect(c,5*unit,-6*unit,unit,4*unit,pal.accent)}
  if(g.tool==='hammer'){pxRect(c,4*unit,-8*unit,unit,5*unit,pal.light);pxRect(c,3*unit,-9*unit,3*unit,unit,pal.accent)}
  if(g.tool==='lens'){circle(c,4*unit,-8*unit,1.6*unit,null,pal.cold,unit);line(c,5*unit,-6.8*unit,6.4*unit,-4.8*unit,unit,pal.cold)}
  if(g.tool==='think'){pxRect(c,4*unit,-15*unit,unit,unit,pal.light);pxRect(c,6*unit,-17*unit,unit,unit,pal.light)}
  if(g.tool==='claim'){pxRect(c,5*unit,-11*unit,2*unit,2*unit,pal.accent)}
  if(g.tool==='submit'){pxRect(c,4*unit,-8*unit,3*unit,3*unit,pal.cold);pxRect(c,5*unit,-9*unit,unit,2*unit,pal.light)}
  if(p.liveness==='SUSPECT'||p.liveness==='STALE_MEMBERSHIP'){c.globalAlpha=.65;pxRect(c,-7*unit,-13*unit,2*unit,2*unit,pal.accent);c.globalAlpha=1}
  if(p.liveness==='RECOVERING'){pxRect(c,-7*unit,-12*unit,2*unit,5*unit,pal.cold)}
  c.restore();
}

// ---------- CREEPY / STRANGE ----------
function drawCreepy(c,worker,p,env){
  const pal=palette(worker),s=env.scale||1,b=bobFor(p)*s;
  const g=activityGesture(p),walk=p.state==='WALK'?Math.sin(p.phase*TAU*2):0;
  c.save();c.translate(0,b);transformForDirection(c,p.direction);
  ellipse(c,0,1*s,7.2*s,2.2*s,'rgba(0,0,0,.28)');
  poly(c,[[-5*s,-17*s],[5*s,-17*s],[6.5*s,-4*s],[4*s,1*s],[-4*s,1*s],[-6.5*s,-4*s]],pal.body2,pal.ink,1.4*s);
  poly(c,[[-4.8*s,-21*s],[0,-26*s],[4.8*s,-21*s],[4.2*s,-14*s],[-4.2*s,-14*s]],pal.body,pal.ink,1.35*s);
  poly(c,[[-3.2*s,-21*s],[3.2*s,-21*s],[2.6*s,-16*s],[-2.6*s,-16*s]],pal.light,pal.ink,1.05*s);
  if(p.direction!=='up'){
    ellipse(c,-1.25*s,-18.7*s,1.05*s,.7*s,pal.ink);ellipse(c,1.25*s,-18.7*s,1.05*s,.7*s,pal.ink);
    if(p.state==='THINK'){circle(c,1.25*s,-18.7*s,.32*s,pal.accent)}
  }
  line(c,-3.2*s,-9*s,-6.4*s+g.armL*s,-4.5*s,2.4*s,pal.body);
  line(c,3.2*s,-9*s,6.4*s+g.armR*s,-4.5*s,2.4*s,pal.body);
  line(c,-2.3*s,-2*s,-3.6*s-walk*1.5*s,5*s,2.7*s,pal.body2);
  line(c,2.3*s,-2*s,3.6*s+walk*1.5*s,5*s,2.7*s,pal.body2);
  drawToolVector(c,g,5.6*s,-6.5*s,s,pal);
  if(p.liveness==='SUSPECT'||p.liveness==='STALE_MEMBERSHIP'){
    c.setLineDash([2*s,2*s]);circle(c,0,-20*s,7.2*s,null,pal.accent,1.1*s);c.setLineDash([]);
  }else if(p.liveness==='RECOVERING'){
    circle(c,0,-20*s,7.2*s,null,pal.cold,1.1*s);circle(c,0,-20*s,5.9*s,null,pal.cold,.6*s);
  }
  c.restore();
}

function drawHumanoid(c,worker,p,env){
  const pal=palette(worker),s=env.scale||1,g=activityGesture(p),walk=p.state==='WALK'?Math.sin(p.phase*TAU*2):0;
  c.save();c.translate(0,bobFor(p)*s);transformForDirection(c,p.direction);
  ellipse(c,0,2*s,6.5*s,1.8*s,'rgba(0,0,0,.22)');
  line(c,-2*s,-1*s,-3.2*s-walk*2*s,6*s,3*s,pal.body2);line(c,2*s,-1*s,3.2*s+walk*2*s,6*s,3*s,pal.body2);
  poly(c,[[-5*s,-13*s],[5*s,-13*s],[4*s,-1*s],[-4*s,-1*s]],pal.body,pal.ink,1.2*s);
  line(c,0,-13*s,0,-15*s,2.5*s,pal.body2);circle(c,0,-19*s,4.7*s,pal.light,pal.ink,1.2*s);
  if(p.direction!=='up'){
    if(p.direction==='down'){circle(c,-1.35*s,-19.3*s,.48*s,pal.ink);circle(c,1.35*s,-19.3*s,.48*s,pal.ink)}
    else circle(c,1.35*s,-19.2*s,.55*s,pal.ink);
  }
  line(c,-4.4*s,-10*s,-7.5*s+g.armL*s,-4*s,2.8*s,pal.body);
  line(c,4.4*s,-10*s,7.5*s+g.armR*s,-4*s,2.8*s,pal.body);
  drawToolVector(c,g,7*s,-5*s,s,pal);
  if(p.state==='CLAIMED'){circle(c,0,-26*s,1.5*s,pal.accent)}
  c.restore();
}

function drawMask(c,worker,p,env){
  const pal=palette(worker),s=env.scale||1,g=activityGesture(p),walk=p.state==='WALK'?Math.sin(p.phase*TAU*2):0;
  c.save();c.translate(0,bobFor(p)*s);transformForDirection(c,p.direction);
  ellipse(c,0,2*s,6*s,1.7*s,'rgba(0,0,0,.24)');
  line(c,-2*s,-2*s,-3*s-walk*1.8*s,5*s,2.7*s,pal.body2);line(c,2*s,-2*s,3*s+walk*1.8*s,5*s,2.7*s,pal.body2);
  poly(c,[[-4.8*s,-14*s],[4.8*s,-14*s],[6*s,-1*s],[-6*s,-1*s]],pal.body2,pal.ink,1.2*s);
  poly(c,[[-5.8*s,-23*s],[5.8*s,-23*s],[5*s,-15*s],[0,-12.5*s],[-5*s,-15*s]],pal.light,pal.ink,1.35*s);
  if(p.direction!=='up'){
    const eyeShift=p.direction==='right'?1.0*s:0;
    ellipse(c,-1.8*s+eyeShift,-19.2*s,1.25*s,.72*s,pal.ink);ellipse(c,1.8*s+eyeShift,-19.2*s,1.25*s,.72*s,pal.ink);
    if(p.state==='VERIFY'){circle(c,1.8*s+eyeShift,-19.2*s,.32*s,pal.cold)}
  }
  line(c,-4.4*s,-10*s,-7*s+g.armL*s,-4*s,2.3*s,pal.body);
  line(c,4.4*s,-10*s,7*s+g.armR*s,-4*s,2.3*s,pal.body);
  drawToolVector(c,g,6.7*s,-5*s,s,pal);
  if(p.liveness==='SUSPECT'){line(c,-4.5*s,-23.3*s,4.3*s,-14.8*s,1.2*s,pal.accent)}
  if(p.liveness==='RECOVERING'){circle(c,0,-18*s,8*s,null,pal.cold,1.1*s)}
  c.restore();
}

function drawIndustrial(c,worker,p,env){
  const pal=palette(worker),s=env.scale||1,g=activityGesture(p),walk=p.state==='WALK'?Math.sin(p.phase*TAU*2):0;
  c.save();c.translate(0,bobFor(p)*s);transformForDirection(c,p.direction);
  ellipse(c,0,2*s,6.6*s,1.8*s,'rgba(0,0,0,.22)');
  line(c,-2.3*s,-1*s,-3.4*s-walk*1.8*s,6*s,3.2*s,pal.body2);line(c,2.3*s,-1*s,3.4*s+walk*1.8*s,6*s,3.2*s,pal.body2);
  poly(c,[[-5.2*s,-13*s],[5.2*s,-13*s],[4.4*s,-1*s],[-4.4*s,-1*s]],pal.body,pal.ink,1.25*s);
  poly(c,[[-3.5*s,-10*s],[3.5*s,-10*s],[3*s,-1*s],[-3*s,-1*s]],pal.body2,pal.ink,.8*s);
  circle(c,0,-18.5*s,4.3*s,pal.light,pal.ink,1.15*s);
  poly(c,[[-4.8*s,-20*s],[-3*s,-23*s],[3*s,-23*s],[4.8*s,-20*s]],pal.accent,pal.ink,1*s);
  if(p.direction!=='up'){circle(c,p.direction==='right'?1.1*s:-1.2*s,-18.6*s,.5*s,pal.ink);if(p.direction==='down')circle(c,1.2*s,-18.6*s,.5*s,pal.ink)}
  line(c,-4.2*s,-9*s,-7*s+g.armL*s,-4*s,3*s,pal.body);line(c,4.2*s,-9*s,7*s+g.armR*s,-4*s,3*s,pal.body);
  drawToolVector(c,g,7*s,-5*s,s,pal,true);
  c.restore();
}

function drawSilhouette(c,worker,p,env){
  const pal=palette(worker),s=env.scale||1,g=activityGesture(p),walk=p.state==='WALK'?Math.sin(p.phase*TAU*2):0;
  c.save();c.translate(0,bobFor(p)*s);transformForDirection(c,p.direction);
  ellipse(c,0,1*s,5.6*s,1.55*s,'rgba(0,0,0,.2)');
  poly(c,[[-3.6*s,-17*s],[-1.8*s,-21*s],[2.3*s,-21*s],[4.2*s,-17*s],[4.9*s,-4*s],[2.2*s,1*s],[-2.3*s,1*s],[-4.8*s,-4*s]],pal.body2,pal.ink,1.25*s);
  if(p.direction!=='up'){
    const eyeX=p.direction==='down'?0:1.2*s;
    line(c,-1.6*s+eyeX,-17.2*s,1.5*s+eyeX,-17.2*s,1.1*s,pal.light);
  }
  if(p.state==='READ')pxRect(c,-1.5*s,-12*s,3*s,1*s,pal.cold);
  if(p.state==='THINK'||p.state==='PLAN')circle(c,0,-24*s,.9*s,pal.light);
  if(p.state==='WRITE')pxRect(c,4*s,-10*s,1.2*s,5*s,pal.light);
  if(p.state==='BUILD'||p.state==='IMPLEMENT')poly(c,[[3.6*s,-9*s],[6*s,-10*s],[6.4*s,-8*s],[4*s,-7*s]],pal.accent);
  if(p.state==='VERIFY'||p.state==='REVIEW')circle(c,4.2*s,-12*s,1.7*s,null,pal.cold,1*s);
  if(p.state==='SUBMIT')pxRect(c,3.6*s,-11*s,2.8*s,3.2*s,pal.cold);
  if(p.state==='CLAIMED')pxRect(c,-1.2*s,-24*s,2.4*s,2.4*s,pal.accent);
  if(p.state==='WALK'){
    line(c,-1.5*s,0,-2.8*s-walk*1.2*s,4*s,2.5*s,pal.body2);line(c,1.5*s,0,2.8*s+walk*1.2*s,4*s,2.5*s,pal.body2);
  }
  if(p.liveness==='SUSPECT'||p.liveness==='STALE_MEMBERSHIP')c.globalAlpha=.72;
  c.restore();
}

function drawToolVector(c,g,x,y,s,pal,industrial){
  if(!g.tool)return;
  if(g.tool==='book'){
    poly(c,[[x-3*s,y-1*s],[x,y-2*s],[x+3*s,y-1*s],[x+3*s,y+2*s],[x,y+1*s],[x-3*s,y+2*s]],pal.cold,pal.ink,.7*s);
  }else if(g.tool==='pen'){
    line(c,x-1*s,y-3*s,x+2*s,y+2*s,1.2*s,pal.light);circle(c,x+2.3*s,y+2.2*s,.7*s,pal.accent);
  }else if(g.tool==='hammer'){
    line(c,x,y+2*s,x+1*s,y-4*s,1.4*s,pal.light);line(c,x-1*s,y-4*s,x+3*s,y-4*s,2.2*s,industrial?pal.accent:pal.light);
  }else if(g.tool==='lens'){
    circle(c,x,y-2*s,2.1*s,null,pal.cold,1.1*s);line(c,x+1.5*s,y-.5*s,x+3*s,y+2*s,1.1*s,pal.cold);
  }else if(g.tool==='think'){
    circle(c,x-1*s,y-8*s,.8*s,pal.light);circle(c,x+1*s,y-10*s,.55*s,pal.light);
  }else if(g.tool==='claim'){
    poly(c,[[x-1.5*s,y-3*s],[x+2*s,y-3*s],[x+2*s,y+.5*s],[x-1.5*s,y+.5*s]],pal.accent,pal.ink,.7*s);
  }else if(g.tool==='submit'){
    poly(c,[[x-2*s,y-3*s],[x+2*s,y-3*s],[x+2*s,y+1*s],[x-2*s,y+1*s]],pal.cold,pal.ink,.7*s);line(c,x,y-5*s,x,y-1*s,1*s,pal.light);
  }else if(g.tool==='wait'){
    line(c,x-2*s,y-3*s,x+2*s,y+1*s,.9*s,pal.body2);line(c,x+2*s,y-3*s,x-2*s,y+1*s,.9*s,pal.body2);
  }
}

const FAMILY_DEFS={
  pixel:{id:'pixel',label:'Pixel / sprite',description:'Bitmap 12×16 con frames reales por dirección y paso.',draw:drawPixel,minScale:.42},
  creepy:{id:'creepy',label:'Oscuro / extraño',description:'Capucha, máscara y silueta inquietante sin perder lectura.',draw:drawCreepy,minScale:.55},
  humanoid:{id:'humanoid',label:'Humanoide mínimo',description:'Figura humana muy contenida, manos y herramientas legibles.',draw:drawHumanoid,minScale:.55},
  mask:{id:'mask',label:'Máscara / ojos',description:'La cara concentra identidad y los ojos cambian con orientación.',draw:drawMask,minScale:.55},
  industrial:{id:'industrial',label:'Industrial / artesanal',description:'Delantal, gorra y herramientas físicas.',draw:drawIndustrial,minScale:.55},
  silhouette:{id:'silhouette',label:'Silueta masiva',description:'Monolito compacto para decenas de workers simultáneos.',draw:drawSilhouette,minScale:.35}
};

function resolveFamily(worker,pose,env){
  const requested=(pose&&pose.family)||(env&&env.family)||(worker&&worker.visual_family)||'pixel';
  return FAMILY_DEFS[requested]||FAMILY_DEFS.pixel;
}
function drawWorker(ctx,worker,pose,env){
  if(!ctx)return;
  env=env||{};const p=normPose(pose),fam=resolveFamily(worker,p,env);
  const s=clamp((Number(env.scale)||1)*p.scale,.18,8);
  ctx.save();ctx.translate(Number(env.x)||0,Number(env.y)||0);
  if(p.selected){
    ctx.save();ctx.globalAlpha=.22;circle(ctx,0,-10*s,14*s,null,palette(worker).light,1.15*s);ctx.restore();
  }
  fam.draw(ctx,worker,p,{...env,scale:s});
  ctx.restore();
}

const API={
  id:'workers',version:'1.0.0',
  measureWorker,drawWorker,
  families:Object.values(FAMILY_DEFS).map(({id,label,description,minScale})=>({id,label,description,minScale})),
  stages:STAGES.slice(),contractStages:CONTRACT_STAGES.slice(),directions:DIRS.slice(),liveness:LIVENESS.slice()
};
g.COLISEO_LAB_MODULE=API;
})(window);
