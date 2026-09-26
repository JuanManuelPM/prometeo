(function(g){
'use strict';

const CONTRACT_STAGES=['CLAIMED','READ','THINK','PLAN','WRITE','BUILD','IMPLEMENT','VERIFY','REVIEW','SUBMIT','WAIT'];
const STAGES=['IDLE','WALK',...CONTRACT_STAGES];
const LIVENESS=['LIVE','AGING','SUSPECT','RECENT_IDLE','RECOVERING','STALE_MEMBERSHIP'];
const DIRS=['down','left','right','up'];
const TAU=Math.PI*2;

const ASSET_DEFS=[
  {
    id:'agamemnonMask',kind:'mask',
    src:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Masque_d%27Agamemnon.png/500px-Masque_d%27Agamemnon.png',
    credit:'Mask of Agamemnon cutout · transparent PNG · CC BY-SA 3.0 / GFDL · Wikimedia Commons'
  },
  {
    id:'cutHand',kind:'hand',
    src:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Leonard_Nimoys_hand_demonstrating_the_Vulcan_salutation_%28transparent_background%29.png/960px-Leonard_Nimoys_hand_demonstrating_the_Vulcan_salutation_%28transparent_background%29.png',
    credit:'Transparent hand cutout · Gage Skidmore · CC BY-SA 3.0 · Wikimedia Commons'
  },
  {
    id:'repoMask',kind:'mask',
    src:'../../strategy/mask-mouth/assets/mask-transparent.webp',
    credit:'Prometeo transparent mask · existing repo asset'
  }
];

const CURATED={
  full:{
    id:'full',label:'MÁSCARA + CUERPO',note:'cutouts limpios · manos como brazos y piernas',
    head:'agamemnonMask',torso:'repoMask',hasTorso:true,hasLegs:true,
    headScale:1.08,torsoScale:1.0,armScale:.72,legScale:.56,armSpread:15,headY:-31,torsoY:-8
  },
  legless:{
    id:'legless',label:'SIN PIERNAS',note:'máscara + torso + dos manos flotantes',
    head:'agamemnonMask',torso:'repoMask',hasTorso:true,hasLegs:false,
    headScale:1.18,torsoScale:.92,armScale:.92,legScale:0,armSpread:18,headY:-29,torsoY:-5
  },
  headhands:{
    id:'headhands',label:'CABEZA + MANOS',note:'sin torso · sin piernas · una sola mano espejada',
    head:'repoMask',torso:null,hasTorso:false,hasLegs:false,
    headScale:1.6,torsoScale:0,armScale:1.18,legScale:0,armSpread:22,headY:-17,torsoY:0
  }
};

const assets=new Map();
let readyCount=0;
const readyListeners=[];

function loadAssets(){
  for(const def of ASSET_DEFS){
    const img=new Image();
    img.decoding='async';
    if(/^https?:/.test(def.src))img.crossOrigin='anonymous';
    const item={def,img,ready:false,error:false};
    assets.set(def.id,item);
    img.onload=()=>{item.ready=true;readyCount++;notifyReady();};
    img.onerror=()=>{item.error=true;readyCount++;notifyReady();};
    img.src=def.src;
  }
}
function notifyReady(){
  if(readyCount<ASSET_DEFS.length)return;
  const result={loaded:[...assets.values()].filter(x=>x.ready).length,total:ASSET_DEFS.length};
  while(readyListeners.length)readyListeners.shift()(result);
}
function whenAssetsReady(){
  if(readyCount>=ASSET_DEFS.length)return Promise.resolve({loaded:[...assets.values()].filter(x=>x.ready).length,total:ASSET_DEFS.length});
  return new Promise(resolve=>readyListeners.push(resolve));
}
loadAssets();

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function normPose(pose){
  pose=pose||{};
  let state=String(pose.state||pose.stage||'IDLE').toUpperCase();
  if(!STAGES.includes(state))state='IDLE';
  let direction=String(pose.direction||'down').toLowerCase();
  if(!DIRS.includes(direction))direction='down';
  return {state,direction,phase:Number.isFinite(pose.phase)?pose.phase:0,selected:!!pose.selected,liveness:String(pose.liveness||'LIVE').toUpperCase(),scale:Number.isFinite(pose.scale)?pose.scale:1};
}
function source(id){const x=assets.get(id);return x&&x.ready?x:null}
function safeSource(id){return source(id)||source('repoMask')}
function identityFor(worker){
  const requested=String(worker&&worker.avatarPreset||'full').toLowerCase();
  const p=CURATED[requested]||CURATED.full;
  return {...p,preset:p.id};
}
function getIdentity(worker){return identityFor(worker)}

function drawImage(c,item,dx,dy,dw,dh,opt={}){
  if(!item||!item.ready)return false;
  c.save();
  c.translate(dx,dy);
  if(opt.rot)c.rotate(opt.rot);
  if(opt.flip)c.scale(-1,1);
  c.globalAlpha=opt.alpha==null?1:opt.alpha;
  c.filter=opt.filter||'none';
  if(opt.shadow){
    c.shadowColor='rgba(0,0,0,.82)';
    c.shadowBlur=opt.shadow;
    c.shadowOffsetY=opt.shadow*.28;
  }
  c.drawImage(item.img,-dw/2,-dh/2,dw,dh);
  c.restore();
  return true;
}
function drawShadow(c,x,y,rx,ry,a){
  c.save();c.globalAlpha=a;c.filter='blur(4px)';c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle='#000';c.fill();c.restore();
}
function gesture(state,phase){
  const q=Math.sin(phase*TAU);
  if(state==='THINK'||state==='PLAN')return {l:-1.06,r:.12,y:-3};
  if(state==='VERIFY'||state==='REVIEW')return {l:-.92,r:.36,y:-2};
  if(state==='BUILD'||state==='IMPLEMENT')return {l:-.34,r:-.88+q*.16,y:-3};
  return {l:-.46,r:.46,y:0};
}

function drawWorker(c,worker,pose,env){
  if(!c)return;
  env=env||{};
  const p=normPose(pose),id=getIdentity(worker),s=clamp((Number(env.scale)||1)*p.scale,.16,7);
  const bob=(p.state==='WALK'?Math.sin(p.phase*TAU*2)*1.2:Math.sin(p.phase*TAU)*.18)*s;
  const g=gesture(p.state,p.phase);
  const head=safeSource(id.head),torso=id.torso?safeSource(id.torso):null,hand=safeSource('cutHand');

  c.save();
  c.translate(Number(env.x)||0,(Number(env.y)||0)+bob);
  if(p.direction==='left')c.scale(-1,1);
  if(p.direction==='up')c.globalAlpha=.9;

  drawShadow(c,0,(id.hasLegs?8:3)*s,(id.preset==='headhands'?19:14)*s,3.4*s,.34);

  if(id.hasLegs){
    drawImage(c,hand,-5.5*s,8*s,14*s*id.legScale,24*s*id.legScale,{rot:2.72,flip:true,shadow:1.5*s,filter:'grayscale(.28) contrast(1.15)',alpha:.96});
    drawImage(c,hand,5.5*s,8*s,14*s*id.legScale,24*s*id.legScale,{rot:-2.72,shadow:1.5*s,filter:'sepia(.12) contrast(1.12)',alpha:.96});
  }

  if(id.hasTorso&&torso){
    drawImage(c,torso,0,id.torsoY*s,27*s*id.torsoScale,16*s*id.torsoScale,{rot:.03,shadow:2*s,filter:'grayscale(.35) contrast(1.25)',alpha:.94});
  }

  const armW=(id.preset==='headhands'?24:18)*s*id.armScale;
  const armH=(id.preset==='headhands'?31:25)*s*id.armScale;
  drawImage(c,hand,-id.armSpread*s,(-8+g.y)*s,armW,armH,{rot:g.l,flip:true,shadow:1.8*s,filter:'grayscale(.18) contrast(1.08)',alpha:.99});
  drawImage(c,hand,id.armSpread*s,(-8+g.y)*s,armW,armH,{rot:g.r,shadow:1.8*s,filter:'sepia(.08) contrast(1.08)',alpha:.99});

  const headW=(id.head==='repoMask'?31:24)*s*id.headScale;
  const headH=(id.head==='repoMask'?17:24)*s*id.headScale;
  drawImage(c,head,0,id.headY*s,headW,headH,{rot:-.02,shadow:2.5*s,filter:id.head==='repoMask'?'grayscale(.18) contrast(1.35)':'contrast(1.12) saturate(.88)'});

  if(p.selected){
    c.save();c.globalCompositeOperation='screen';c.globalAlpha=.55;c.strokeStyle='#e3c39a';c.lineWidth=Math.max(1,1.05*s);c.setLineDash([3*s,3*s]);c.strokeRect(-28*s,-49*s,56*s,66*s);c.restore();
  }
  c.restore();
}

function measureWorker(worker,env){
  const s=clamp(Number(env&&env.scale)||1,.16,7),id=getIdentity(worker);
  const width=(id.preset==='headhands'?64:50)*s;
  const height=(id.hasLegs?72:id.preset==='headhands'?48:58)*s;
  return {width,height,anchorX:width/2,anchorY:height*.84};
}

const API={
  id:'workers',version:'3.1.0-clean-cutouts',
  measureWorker,drawWorker,whenAssetsReady,getIdentity,
  curatedPresets:Object.values(CURATED).map(({id,label,note})=>({id,label,note})),
  families:[{id:'collage',label:'Clean cutout collage',description:'Stable worker identity assembled only from alpha cutouts; no visible rectangular source plates.',minScale:.3}],
  stages:STAGES.slice(),contractStages:CONTRACT_STAGES.slice(),directions:DIRS.slice(),liveness:LIVENESS.slice(),
  assetSources:ASSET_DEFS.map(({id,credit,src})=>({id,credit,src}))
};
g.COLISEO_LAB_MODULE=API;
})(window);
