(function(g){
'use strict';

const CONTRACT_STAGES=['CLAIMED','READ','THINK','PLAN','WRITE','BUILD','IMPLEMENT','VERIFY','REVIEW','SUBMIT','WAIT'];
const STAGES=['IDLE','WALK',...CONTRACT_STAGES];
const LIVENESS=['LIVE','AGING','SUSPECT','RECENT_IDLE','RECOVERING','STALE_MEMBERSHIP'];
const DIRS=['down','left','right','up'];
const TAU=Math.PI*2;

const ASSET_DEFS=[
  {id:'sanmartin',kind:'portrait',src:'https://upload.wikimedia.org/wikipedia/commons/f/f9/Jose_de_San_Martin-retouch-transparent_background.png',credit:'José de San Martín daguerreotype · public domain · Wikimedia Commons',head:[.31,.14,.38,.38],torso:[.13,.35,.74,.61]},
  {id:'russell',kind:'portrait',src:'https://upload.wikimedia.org/wikipedia/commons/a/a6/Bertrand_Russell_transparent_bg.png',credit:'Bertrand Russell portrait · public domain · Wikimedia Commons',head:[.14,.04,.72,.50],torso:[.08,.42,.84,.57]},
  {id:'washington',kind:'portrait',src:'https://upload.wikimedia.org/wikipedia/commons/f/f2/Portrait_of_George_Washington-transparent.png',credit:'George Washington portrait · public domain · Wikimedia Commons',head:[.16,.06,.68,.49],torso:[.06,.43,.88,.56]},
  {id:'handbone',kind:'limb',src:'https://upload.wikimedia.org/wikipedia/commons/6/6d/Hand_bone.png',credit:"Gray's Anatomy hand plate · public domain · Wikimedia Commons",crop:[.11,.08,.71,.84]},
  {id:'morrishand',kind:'limb',src:"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Morris%27_human_anatomy_%281898%29_-_Fig_134.png/960px-Morris%27_human_anatomy_%281898%29_-_Fig_134.png",credit:"Morris' Anatomy hand plate · public domain · Wikimedia Commons",crop:[.23,.02,.68,.94]},
  {id:'repoMask',kind:'mask',src:'../../strategy/mask-mouth/assets/mask-transparent.webp',credit:'Prometeo transparent mask · existing repo asset',crop:[0,0,1,1]}
];

const CURATED={
  full:{
    id:'full',label:'CUERPO ENTERO',note:'cabeza + torso + brazos + piernas raras',
    head:'sanmartin',torso:'russell',left:'handbone',right:'morrishand',
    filter:'sepia(.42) contrast(1.35)',headScale:1.12,torsoScale:1.08,armScale:.86,
    headX:-1,headY:-31,armSpread:12,angle:-.04,hasTorso:true,hasLegs:true,maskFace:false
  },
  legless:{
    id:'legless',label:'SIN PIERNAS',note:'busto flotante + manos asimétricas',
    head:'washington',torso:'sanmartin',left:'morrishand',right:'handbone',
    filter:'grayscale(.75) contrast(1.48)',headScale:1.18,torsoScale:1.05,armScale:.96,
    headX:1,headY:-29,armSpread:13,angle:.035,hasTorso:true,hasLegs:false,maskFace:true
  },
  headhands:{
    id:'headhands',label:'CABEZA + MANOS',note:'sin torso, sin piernas',
    head:'repoMask',torso:null,left:'handbone',right:'morrishand',
    filter:'grayscale(.85) contrast(1.55)',headScale:1.55,torsoScale:1,armScale:1.2,
    headX:0,headY:-18,armSpread:18,angle:0,hasTorso:false,hasLegs:false,maskFace:false,maskHead:true
  }
};

const assets=new Map();
let readyCount=0;
const readyListeners=[];

function loadAssets(){
  for(const def of ASSET_DEFS){
    const img=new Image();
    assets.set(def.id,{def,img,ready:false,error:false});
    img.onload=()=>{const item=assets.get(def.id);item.ready=true;readyCount++;notifyReady();};
    img.onerror=()=>{const item=assets.get(def.id);item.error=true;readyCount++;notifyReady();};
    img.decoding='async';
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
function hashString(s){let h=2166136261>>>0;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function choice(arr,r){return arr[Math.floor(r()*arr.length)%arr.length]}
function normPose(pose){
  pose=pose||{};
  let state=String(pose.state||pose.stage||'IDLE').toUpperCase();
  if(!STAGES.includes(state))state='IDLE';
  let direction=String(pose.direction||'down').toLowerCase();
  if(!DIRS.includes(direction))direction='down';
  return {state,direction,phase:Number.isFinite(pose.phase)?pose.phase:0,selected:!!pose.selected,liveness:String(pose.liveness||'LIVE').toUpperCase(),scale:Number.isFinite(pose.scale)?pose.scale:1};
}
function source(id){const x=assets.get(id);return x&&x.ready?x:null}
function defById(id){return ASSET_DEFS.find(x=>x.id===id)||null}
function portraitDefs(){return ASSET_DEFS.filter(x=>x.kind==='portrait')}
function limbDefs(){return ASSET_DEFS.filter(x=>x.kind==='limb')}

function curatedIdentity(name){
  const p=CURATED[name]||CURATED.full;
  return {
    preset:p.id,label:p.label,note:p.note,
    head:defById(p.head),torso:defById(p.torso),left:defById(p.left),right:defById(p.right),
    filter:p.filter,headScale:p.headScale,torsoScale:p.torsoScale,armScale:p.armScale,
    headX:p.headX,headY:p.headY,armSpread:p.armSpread,angle:p.angle,
    hasTorso:p.hasTorso,hasLegs:p.hasLegs,maskFace:p.maskFace,maskHead:!!p.maskHead,
    asym:true,noRight:false
  };
}
function identityFor(worker){
  const preset=String(worker&&worker.avatarPreset||'').toLowerCase();
  if(CURATED[preset])return curatedIdentity(preset);
  const seed=hashString(worker&&worker.worker_id||worker&&worker.display_code||'worker');
  const r=mulberry32(seed),portraits=portraitDefs(),limbs=limbDefs();
  const head=choice(portraits,r);
  let torso=choice(portraits,r);if(torso.id===head.id)torso=portraits[(portraits.indexOf(torso)+1)%portraits.length];
  return {
    preset:'generated',label:'GENERATED',note:'stable worker collage',head,torso,
    left:choice(limbs,r),right:choice(limbs,r),
    filter:choice(['grayscale(1) contrast(1.25)','sepia(.35) contrast(1.32)','grayscale(.65) contrast(1.45)'],r),
    headScale:.82+r()*.46,torsoScale:.82+r()*.42,armScale:.48+r()*.30,
    headX:(r()-.5)*5,headY:-31+(r()-.5)*3,armSpread:8+r()*7,angle:(r()-.5)*.12,
    hasTorso:true,hasLegs:r()>.28,maskFace:r()>.64,maskHead:false,asym:r()>.38,noRight:r()>.84
  };
}
const identityCache=new Map();
function getIdentity(worker){
  const k=String(worker&&worker.worker_id||worker&&worker.display_code||'worker')+'|'+String(worker&&worker.avatarPreset||'');
  if(!identityCache.has(k))identityCache.set(k,identityFor(worker));
  return identityCache.get(k);
}

function drawCrop(c,item,crop,dx,dy,dw,dh,opt={}){
  if(!item||!item.ready)return false;
  const img=item.img,[nx,ny,nw,nh]=crop||[0,0,1,1];
  const sx=nx*img.naturalWidth,sy=ny*img.naturalHeight,sw=nw*img.naturalWidth,sh=nh*img.naturalHeight;
  c.save();c.translate(dx,dy);
  if(opt.rot)c.rotate(opt.rot);
  if(opt.flip)c.scale(-1,1);
  c.globalAlpha=opt.alpha==null?1:opt.alpha;
  c.filter=opt.filter||'none';
  if(opt.shadow){c.shadowColor='rgba(0,0,0,.78)';c.shadowBlur=opt.shadow;c.shadowOffsetY=opt.shadow*.25;}
  c.drawImage(img,sx,sy,sw,sh,-dw/2,-dh/2,dw,dh);
  c.restore();return true;
}
function gestureFor(state,phase){
  const q=Math.sin(phase*TAU),base={l:-.32,r:.32,y:0};
  if(state==='READ')return {l:-.78,r:.78,y:-1};
  if(state==='THINK'||state==='PLAN')return {l:-1.18,r:.18,y:-3};
  if(state==='WRITE')return {l:-.46,r:1.12,y:-1};
  if(state==='BUILD'||state==='IMPLEMENT')return {l:-.25,r:-1.0+q*.22,y:-4};
  if(state==='VERIFY'||state==='REVIEW')return {l:-.88,r:.34,y:-2};
  if(state==='CLAIMED'||state==='SUBMIT')return {l:-.16,r:-1.25,y:-4};
  if(state==='WAIT')return {l:-.12,r:.12,y:1};
  if(state==='WALK')return {l:-.32-q*.18,r:.32+q*.18,y:0};
  return base;
}
function drawImageShadow(c,x,y,rx,ry,a){c.save();c.globalAlpha=a;c.filter='blur(3px)';c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle='#000';c.fill();c.restore()}

function drawWorker(c,worker,pose,env){
  if(!c)return;
  env=env||{};
  const p=normPose(pose),id=getIdentity(worker),s=clamp((Number(env.scale)||1)*p.scale,.16,7);
  const bob=(p.state==='WALK'?Math.sin(p.phase*TAU*2)*1.25:Math.sin(p.phase*TAU)*.22)*s;
  const gest=gestureFor(p.state,p.phase);
  c.save();
  c.translate(Number(env.x)||0,(Number(env.y)||0)+bob);
  if(p.direction==='left')c.scale(-1,1);
  if(p.direction==='up')c.globalAlpha=.88;

  const mask=source('repoMask');
  const torso=id.torso?source(id.torso.id):null;
  const head=id.head?source(id.head.id):null;
  const left=id.left?source(id.left.id):null;
  const right=id.right?source(id.right.id):null;

  drawImageShadow(c,0,(id.hasLegs?8:3)*s,(id.preset==='headhands'?17:13)*s,3.3*s,.34);

  if(id.hasLegs){
    const legH=23*s,legW=10*s;
    drawCrop(c,left,id.left.crop,-4.5*s,5*s,legW,legH,{rot:2.78,filter:'grayscale(.9) contrast(1.45)',shadow:1.2*s,alpha:.88});
    drawCrop(c,right,id.right.crop,4.5*s,5*s,legW*.95,legH*1.04,{rot:-2.78,filter:'sepia(.18) grayscale(.75) contrast(1.5)',shadow:1.2*s,alpha:.88,flip:true});
  }

  if(id.hasTorso&&torso){
    const tW=25*s*id.torsoScale,tH=32*s*id.torsoScale;
    drawCrop(c,torso,id.torso.torso,0,-10*s,tW,tH,{rot:id.angle,filter:id.filter,shadow:2*s});
  }

  const armH=(id.preset==='headhands'?31:26)*s*id.armScale,armW=(id.preset==='headhands'?17:13)*s*id.armScale;
  drawCrop(c,left,id.left.crop,-id.armSpread*s,(-9+gest.y)*s,armW,armH,{rot:gest.l-(id.preset==='headhands'?.22:0),filter:'grayscale(.8) contrast(1.55)',shadow:1.5*s,flip:true,alpha:.98});
  if(!id.noRight)drawCrop(c,right,id.right.crop,id.armSpread*s,(-9+gest.y)*s,armW*(id.asym?1.12:.96),armH*(id.asym?.9:1.04),{rot:gest.r+(id.preset==='headhands'?.2:0),filter:'sepia(.18) grayscale(.62) contrast(1.55)',shadow:1.5*s,alpha:.97});

  if(id.maskHead&&mask){
    drawCrop(c,mask,[0,0,1,1],id.headX*s,id.headY*s,28*s*id.headScale,15*s*id.headScale,{filter:'grayscale(.72) contrast(1.6)',shadow:2.4*s});
  }else if(head){
    drawCrop(c,head,id.head.head,id.headX*s,id.headY*s,20*s*id.headScale,21*s*id.headScale,{rot:-id.angle*.55,filter:id.filter,shadow:2.3*s});
  }

  if(id.maskFace&&mask){
    drawCrop(c,mask,[0,0,1,1],id.headX*s,(id.headY+1)*s,18*s,9.5*s,{rot:id.angle*.9,filter:'grayscale(.85) contrast(1.6)',alpha:.78,shadow:1*s});
  }

  if(p.selected){
    c.save();c.globalCompositeOperation='screen';c.globalAlpha=.58;c.strokeStyle='#e3c39a';c.lineWidth=Math.max(1,1.05*s);c.setLineDash([3*s,3*s]);c.strokeRect(-24*s,-48*s,48*s,62*s);c.restore();
  }
  c.restore();
}

function measureWorker(worker,env){
  const s=clamp(Number(env&&env.scale)||1,.16,7),id=getIdentity(worker);
  const width=(id.preset==='headhands'?54:42)*s,height=(id.hasLegs?66:id.preset==='headhands'?45:55)*s;
  return {width,height,anchorX:width/2,anchorY:height*.84};
}

const API={
  id:'workers',version:'3.0.0-curated-swipe',
  measureWorker,drawWorker,whenAssetsReady,getIdentity,
  curatedPresets:Object.values(CURATED).map(({id,label,note})=>({id,label,note})),
  families:[{id:'collage',label:'Modular image collage',description:'Stable worker identity assembled from photographic/public-domain cutouts and existing Prometeo imagery.',minScale:.3}],
  stages:STAGES.slice(),contractStages:CONTRACT_STAGES.slice(),directions:DIRS.slice(),liveness:LIVENESS.slice(),
  assetSources:ASSET_DEFS.map(({id,credit,src})=>({id,credit,src}))
};
g.COLISEO_LAB_MODULE=API;
})(window);
