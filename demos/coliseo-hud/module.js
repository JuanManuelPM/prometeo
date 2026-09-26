(function(g){
'use strict';

const STATE={hits:[],last:null};
const LIVE_WORKING=new Set(['LIVE','AGING']);
const ISSUE_STATES=new Set(['SUSPECT','RECOVERING','STALE_MEMBERSHIP']);
const STAGE_SHORT={CLAIMED:'CLAIM',READ:'READ',THINK:'THINK',PLAN:'PLAN',WRITE:'WRITE',BUILD:'BUILD',IMPLEMENT:'BUILD',VERIFY:'VERIFY',REVIEW:'REVIEW',SUBMIT:'SUBMIT',WAIT:'WAIT'};
const C={
  ink:'#eee4d3',dim:'#8a8277',paper:'#c9b995',dark:'#090908',wood:'#3a2a20',wood2:'#5a3d29',metal:'#30352f',metal2:'#4d594d',
  live:'#9fbe79',aging:'#d9b565',suspect:'#c96956',recover:'#6aa6b5',ready:'#91aa73',blocked:'#895e58',accent:'#d39a5d',black:'#050504'
};

function arr(x){return Array.isArray(x)?x:[]}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function txt(v,fallback){return v===undefined||v===null||v===''?(fallback===undefined?'—':fallback):String(v)}
function short(v,n){v=txt(v,'');return v.length>n?v.slice(0,Math.max(1,n-1))+'…':v}
function stageShort(v){return STAGE_SHORT[v]||short(v||'—',9)}
function nodeMap(s){const m=new Map();for(const n of arr(s.nodes))if(n&&n.node_key)m.set(n.node_key,n);return m}
function projectMap(s){const m=new Map();for(const p of arr(s.projects))if(p&&p.project_key)m.set(p.project_key,p);return m}
function workerMap(s){const m=new Map();for(const w of arr(s.workers))if(w&&w.worker_id)m.set(w.worker_id,w);return m}
function activeNodeFor(w,nodes){return w&&w.node_key?nodes.get(w.node_key):null}
function actualWorking(w,nodes){const n=activeNodeFor(w,nodes);return !!(n&&n.state==='ACTIVE'&&LIVE_WORKING.has(w.liveness))}
function issueWorker(w){return !!(w&&ISSUE_STATES.has(w.liveness))}
function recoveryWorker(w){return !!(w&&(w.liveness==='RECOVERING'||Number(w.recovery_count||0)>0))}
function liveColor(v){if(v==='LIVE')return C.live;if(v==='AGING')return C.aging;if(v==='SUSPECT'||v==='STALE_MEMBERSHIP')return C.suspect;if(v==='RECOVERING')return C.recover;return C.dim}
function levelFor(env){if(env&&['overview','mid','detail'].includes(env.semanticLevel))return env.semanticLevel;const z=num(env&&env.zoom);if(z!==null)return z<.82?'overview':z<1.5?'mid':'detail';return (num(env&&env.width)||0)<560?'mid':'overview'}
function pickXY(v){if(!v)return null;const x=num(v.x!==undefined?v.x:(v.screen_x!==undefined?v.screen_x:v.screenX));const y=num(v.y!==undefined?v.y:(v.screen_y!==undefined?v.screen_y:v.screenY));return x===null||y===null?null:{x,y}}
function fromCollection(coll,id){if(!coll)return null;if(coll instanceof Map)return coll.get(id)||null;if(Array.isArray(coll))return coll.find(v=>v&&(v.id===id||v.worker_id===id||v.node_key===id||v.project_key===id))||null;return typeof coll==='object'?(coll[id]||null):null}
function anchorFor(layout,type,id,item,env){const names=type==='worker'?['workers','workerPositions','worker_points']:type==='node'?['nodes','nodePositions','node_points']:['projects','projectPositions','project_points'];for(const name of names){const p=pickXY(fromCollection(layout&&layout[name],id));if(p)return p}const own=pickXY(item);if(own)return own;if(env&&typeof env.projectToScreen==='function'){const wx=num(item&&item.world_x),wz=num(item&&item.world_z),wh=num(item&&item.world_h)||0;if(wx!==null&&wz!==null){const p=pickXY(env.projectToScreen({x:wx,y:wh,z:wz},item,type));if(p)return p}}return null}
function rectsOverlap(a,b,pad){pad=pad||0;return !(a.x+a.w+pad<=b.x||b.x+b.w+pad<=a.x||a.y+a.h+pad<=b.y||b.y+b.h+pad<=a.y)}
function reserve(rect,occupied,pad){for(const o of occupied)if(rectsOverlap(rect,o,pad||4))return false;occupied.push(rect);return true}
function hit(rect,payload,z){STATE.hits.push({x:rect.x,y:rect.y,w:rect.w,h:rect.h,payload,z:z||0})}
function line(ctx,x1,y1,x2,y2,color,width){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width||1;ctx.stroke()}
function text(ctx,value,x,y,font,color,align){ctx.font=font;ctx.textAlign=align||'left';ctx.textBaseline='alphabetic';ctx.fillStyle=color;ctx.fillText(value,x,y)}
function panelPath(ctx,x,y,w,h,slant){const s=Math.min(slant||7,w*.12);ctx.beginPath();ctx.moveTo(x+s,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w-s,y+h);ctx.lineTo(x,y+h);ctx.closePath()}
function board(ctx,r,fill,stroke,slant){panelPath(ctx,r.x,r.y,r.w,r.h,slant||8);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}
function post(ctx,x,y,h,color){line(ctx,x,y,x,y+h,color,2);ctx.fillStyle=color;ctx.fillRect(x-3,y+h-2,6,3)}
function segmentedGauge(ctx,x,y,w,h,on,total,onColor,offColor){const gap=2,totalN=Math.max(1,total||6),seg=(w-gap*(totalN-1))/totalN;for(let i=0;i<totalN;i++){ctx.fillStyle=i<on?onColor:offColor;ctx.fillRect(x+i*(seg+gap),y,seg,h)}}

function projectStats(snapshot){
  const nodes=nodeMap(snapshot),out=[];
  for(const p of arr(snapshot.projects)){
    const ws=arr(snapshot.workers).filter(w=>w.project_key===p.project_key),ns=arr(snapshot.nodes).filter(n=>n.project_key===p.project_key);
    out.push({project:p,working:ws.filter(w=>actualWorking(w,nodes)).length,issues:ws.filter(issueWorker).length,recovery:ws.filter(recoveryWorker).length,ready:ns.filter(n=>n.state==='READY').length,blocked:ns.filter(n=>n.state==='BLOCKED').length,active:ns.filter(n=>n.state==='ACTIVE').length});
  }
  return out;
}
function summaryStats(snapshot){
  const nodes=nodeMap(snapshot),workers=arr(snapshot.workers);return {
    working:workers.filter(w=>actualWorking(w,nodes)).length,
    issues:workers.filter(issueWorker).length,
    recovery:workers.filter(recoveryWorker).length,
    projects:new Set(workers.filter(w=>actualWorking(w,nodes)||issueWorker(w)).map(w=>w.project_key).filter(Boolean)).size,
    ready:arr(snapshot.nodes).filter(n=>n.state==='READY').length,
    blocked:arr(snapshot.nodes).filter(n=>n.state==='BLOCKED').length
  };
}
function drawScoreboard(ctx,snapshot,env,occupied){
  const s=summaryStats(snapshot),W=env.width,mobile=W<620,tv=W>=1200;
  const w=mobile?Math.min(W-16,286):(tv?380:330),h=mobile?42:48,x=(W-w)/2,y=mobile?8:10;
  const r={x,y,w,h};board(ctx,r,'rgba(19,17,14,.92)','rgba(181,148,103,.52)',10);
  ctx.fillStyle='rgba(190,155,102,.25)';ctx.fillRect(x+9,y+7,3,h-14);ctx.fillRect(x+w-14,y+7,3,h-14);
  const fs=mobile?10:(tv?13:11),big=mobile?13:(tv?17:15);
  const cols=[
    {label:'WORK',value:s.working,color:C.live},
    {label:'PROJ',value:s.projects,color:C.ink},
    {label:'READY',value:s.ready,color:C.ready},
    {label:'ISSUE',value:s.issues,color:s.issues?C.suspect:C.dim}
  ];
  const cw=(w-28)/cols.length;
  cols.forEach((q,i)=>{const cx=x+14+cw*i+cw*.5;text(ctx,String(q.value),cx,y+20,'900 '+big+'px ui-monospace,monospace',q.color,'center');text(ctx,q.label,cx,y+h-8,'800 '+fs+'px ui-monospace,monospace',C.dim,'center')});
  if(snapshot&&snapshot.demo!==false){text(ctx,'SYNTHETIC',x+w-17,y+12,'800 '+(mobile?7:8)+'px ui-monospace,monospace',C.accent,'right')}
  occupied.push(r);return s;
}
function projectBoard(ctx,row,anchor,env,occupied){
  const W=env.width,H=env.height,mobile=W<620,tv=W>=1200;
  const title=short(row.project.title||row.project.project_key,mobile?16:22),fs=tv?15:(mobile?11:13),sub=tv?10:9;
  ctx.font='850 '+fs+'px system-ui,sans-serif';const tw=ctx.measureText(title).width;
  const w=Math.max(mobile?106:128,Math.min(mobile?160:210,tw+30)),h=mobile?48:56;
  const candidates=[{x:anchor.x-w/2,y:anchor.y-h-18},{x:anchor.x-w/2,y:anchor.y+18},{x:anchor.x+16,y:anchor.y-h/2},{x:anchor.x-w-16,y:anchor.y-h/2}];
  let r=null;for(const c of candidates){const q={x:clamp(c.x,6,W-w-6),y:clamp(c.y,58,H-h-9),w,h};if(reserve(q,occupied,6)){r=q;break}}
  if(!r)return null;
  const alert=row.issues>0,frame=alert?C.suspect:(row.recovery?C.recover:'rgba(181,148,103,.50)');
  post(ctx,r.x+r.w*.18,r.y+r.h,r.y>anchor.y?12:8,'rgba(116,87,60,.72)');post(ctx,r.x+r.w*.82,r.y+r.h,r.y>anchor.y?12:8,'rgba(116,87,60,.72)');
  board(ctx,r,'rgba(37,30,23,.95)',frame,8);
  ctx.fillStyle='rgba(204,181,137,.08)';ctx.fillRect(r.x+7,r.y+7,r.w-17,1);
  text(ctx,title,r.x+10,r.y+18,'850 '+fs+'px system-ui,sans-serif',alert?C.suspect:C.ink);
  const state=row.issues?'ISSUE '+row.issues:row.recovery?'RECOVER '+row.recovery:row.working?row.working+' LIVE':row.ready?row.ready+' READY':'IDLE';
  text(ctx,state,r.x+10,r.y+33,'800 '+sub+'px ui-monospace,monospace',alert?C.suspect:(row.working?C.live:C.dim));
  const total=Math.max(1,row.working+row.ready+row.blocked),on=Math.min(6,Math.round((row.working+row.ready*.45)/total*6));
  segmentedGauge(ctx,r.x+10,r.y+h-10,r.w-23,4,on,6,alert?C.suspect:C.accent,'rgba(226,216,198,.13)');
  line(ctx,anchor.x,anchor.y,clamp(anchor.x,r.x+10,r.x+r.w-10),r.y+r.h,'rgba(181,148,103,.20)',1);
  hit(r,{type:'project',id:row.project.project_key,item:row.project},30);return r;
}
function drawProjectBoards(ctx,snapshot,layout,env,occupied){const shown=[];for(const row of projectStats(snapshot)){const a=anchorFor(layout,'project',row.project.project_key,row.project,env);if(!a)continue;if(projectBoard(ctx,row,a,env,occupied)){shown.push(row.project.project_key)}}return shown}

function workerPriority(w,selectedId,nodes){if(w.worker_id===selectedId)return 1000;let p=0;if(w.liveness==='RECOVERING')p+=900;if(w.liveness==='SUSPECT'||w.liveness==='STALE_MEMBERSHIP')p+=850;if(w.liveness==='AGING')p+=550;if(actualWorking(w,nodes))p+=260;if(Number(w.recovery_count||0)>0)p+=100;if(w.progress_stage==='VERIFY'||w.progress_stage==='SUBMIT')p+=40;return p}
function drawBeacon(ctx,a,w,selected){
  const col=liveColor(w.liveness),h=selected?15:10;line(ctx,a.x,a.y,a.x,a.y-h,col,selected?2:1.2);
  ctx.beginPath();ctx.moveTo(a.x-4,a.y-h);ctx.lineTo(a.x+4,a.y-h);ctx.lineTo(a.x,a.y-h-5);ctx.closePath();ctx.fillStyle=col;ctx.fill();
  ctx.fillStyle='rgba(7,7,6,.9)';ctx.fillRect(a.x-3,a.y-2,6,3);
}
function drawWorkerMarkers(ctx,snapshot,layout,selection,env,occupied,level){
  const nodes=nodeMap(snapshot),W=env.width,H=env.height,mobile=W<620,tv=W>=1200;
  const sel=resolveSelection(selection,snapshot),selectedId=sel&&sel.type==='worker'?sel.id:null;
  const ranked=arr(snapshot.workers).map(w=>({w,p:workerPriority(w,selectedId,nodes)})).sort((a,b)=>b.p-a.p);
  const max=level==='detail'?(mobile?8:(tv?20:13)):(mobile?5:(tv?12:8));let labels=0,beacons=0;
  for(const {w} of ranked){const a=anchorFor(layout,'worker',w.worker_id,w,env);if(!a)continue;const selected=w.worker_id===selectedId,issue=issueWorker(w);drawBeacon(ctx,a,w,selected);beacons++;if(labels>=max&&!selected&&!issue)continue;
    const code=txt(w.display_code,short(w.worker_id,6)),stage=stageShort(w.progress_stage);const label=code+' '+stage+(issue?' '+w.liveness:'');
    const fs=tv?12:(mobile?9:10);ctx.font='850 '+fs+'px ui-monospace,monospace';const bw=Math.min(mobile?150:190,ctx.measureText(label).width+18),bh=mobile?22:24;
    const candidates=[{x:a.x+9,y:a.y-bh-16},{x:a.x-bw-9,y:a.y-bh-16},{x:a.x+10,y:a.y+6}];let r=null;
    for(const c of candidates){const q={x:clamp(c.x,5,W-bw-5),y:clamp(c.y,58,H-bh-7),w:bw,h:bh};if(reserve(q,occupied,4)){r=q;break}}
    if(!r){if(!selected&&!issue)continue;r={x:clamp(a.x+10,5,W-bw-5),y:clamp(a.y-bh-14,58,H-bh-7),w:bw,h:bh};occupied.push(r)}
    board(ctx,r,selected?'rgba(54,40,27,.97)':'rgba(20,19,16,.93)',selected?C.accent:(issue?liveColor(w.liveness):'rgba(203,184,150,.35)'),5);
    text(ctx,label,r.x+8,r.y+15,'850 '+fs+'px ui-monospace,monospace',issue?liveColor(w.liveness):C.ink);
    line(ctx,a.x,a.y-9,clamp(a.x,r.x,r.x+r.w),r.y+r.h,'rgba(200,175,136,.24)',1);
    hit(r,{type:'worker',id:w.worker_id,item:w},100+(selected?100:0)+(issue?50:0));labels++;
  }
  return {labels,beacons};
}
function resolveSelection(selection,snapshot){if(!selection)return null;if(typeof selection==='string'){const wm=workerMap(snapshot),nm=nodeMap(snapshot),pm=projectMap(snapshot);if(wm.has(selection))return {type:'worker',id:selection,item:wm.get(selection)};if(nm.has(selection))return {type:'node',id:selection,item:nm.get(selection)};if(pm.has(selection))return {type:'project',id:selection,item:pm.get(selection)};return null}const type=selection.type||selection.kind||'worker',id=selection.id||selection.worker_id||selection.node_key||selection.project_key;if(!id)return null;const source=type==='node'?nodeMap(snapshot):type==='project'?projectMap(snapshot):workerMap(snapshot);return {type,id,item:source.get(id)||selection.item||selection}}
function detailData(snapshot,selection){const sel=resolveSelection(selection,snapshot);if(!sel)return null;const nodes=nodeMap(snapshot),projects=projectMap(snapshot);if(sel.type==='worker'){const w=sel.item,n=w&&w.node_key?nodes.get(w.node_key):null,p=projects.get(w&&w.project_key);return {sel,title:(w&&w.title)||(n&&n.title)||txt(w&&w.worker_id),project:txt(p&&p.title,w&&w.project_key),liveness:txt(w&&w.liveness),stage:stageShort(w&&w.progress_stage),age:w&&w.seconds_since_progress!==undefined?txt(w.seconds_since_progress)+'s':'—',gen:txt(w&&w.assignment_generation),rec:txt(w&&w.recovery_count,'0'),job:txt(w&&(w.job_ref||w.job_id)),node:txt(w&&w.node_key)}}if(sel.type==='node'){const n=sel.item,p=projects.get(n&&n.project_key),w=arr(snapshot.workers).find(x=>x.node_key===n.node_key);return {sel,title:txt(n&&n.title,n&&n.node_key),project:txt(p&&p.title,n&&n.project_key),liveness:txt(w&&w.liveness,n&&n.state),stage:stageShort((w&&w.progress_stage)||(n&&n.progress_stage)),age:w&&w.seconds_since_progress!==undefined?txt(w.seconds_since_progress)+'s':'—',gen:txt(w&&w.assignment_generation),rec:txt(w&&w.recovery_count,'0'),job:txt(w&&(w.job_ref||w.job_id)),node:txt(n&&n.node_key)}}const p=sel.item,rows=projectStats(snapshot).find(x=>x.project.project_key===sel.id);return {sel,title:txt(p&&p.title,p&&p.project_key),project:'PROJECT',liveness:rows&&rows.issues?'ISSUE':rows&&rows.working?'WORKING':'IDLE',stage:(rows&&rows.working?rows.working+' LIVE':'—'),age:rows&&rows.ready!==undefined?rows.ready+' READY':'—',gen:rows&&rows.blocked!==undefined?rows.blocked+' BLOCKED':'—',rec:'',job:'',node:txt(p&&p.project_key)}}
function wrap(ctx,value,maxW,maxLines){const words=txt(value,'').split(/s+/),out=[];let cur='';for(const word of words){const test=cur?cur+' '+word:word;if(!cur||ctx.measureText(test).width<=maxW){cur=test;continue}out.push(cur);cur=word;if(out.length>=maxLines-1)break}if(cur&&out.length<maxLines)out.push(cur);return out}
function drawInspectionPlaque(ctx,snapshot,selection,layout,env,occupied){
  const d=detailData(snapshot,selection);if(!d)return null;const W=env.width,H=env.height,mobile=W<620,tv=W>=1200;
  const anchor=anchorFor(layout,d.sel.type,d.sel.id,d.sel.item,env)||{x:W*.5,y:H*.5};const w=mobile?Math.min(W-18,330):(tv?390:350),h=mobile?116:126;
  let x=anchor.x>w*.62?anchor.x-w-18:anchor.x+18,y=anchor.y-h-18;if(x<7)x=7;if(x+w>W-7)x=W-w-7;if(y<58)y=Math.min(H-h-8,anchor.y+18);y=clamp(y,58,H-h-8);
  const r={x,y,w,h};board(ctx,r,'rgba(29,25,20,.97)','rgba(202,164,111,.67)',11);occupied.push(r);
  const close={x:r.x+r.w-30,y:r.y+8,w:20,h:20};ctx.fillStyle='rgba(211,164,101,.18)';ctx.fillRect(close.x,close.y,close.w,close.h);text(ctx,'×',close.x+10,close.y+16,'800 16px system-ui,sans-serif',C.ink,'center');hit(close,{type:'close',id:'detail-close'},500);
  text(ctx,d.sel.type.toUpperCase(),r.x+12,r.y+17,'850 '+(mobile?8:9)+'px ui-monospace,monospace',C.accent);
  ctx.font='850 '+(mobile?13:15)+'px system-ui,sans-serif';const lines=wrap(ctx,d.title,r.w-60,2);let yy=r.y+38;for(const ln of lines){text(ctx,ln,r.x+12,yy,'850 '+(mobile?13:15)+'px system-ui,sans-serif',C.ink);yy+=mobile?15:17}
  text(ctx,short(d.project,mobile?30:38),r.x+12,yy+1,'700 '+(mobile?9:10)+'px system-ui,sans-serif',C.dim);yy+=14;
  const col=liveColor(d.liveness);ctx.fillStyle=col;ctx.fillRect(r.x+12,yy,8,8);text(ctx,short(d.liveness,15),r.x+26,yy+8,'850 '+(mobile?9:10)+'px ui-monospace,monospace',col);
  text(ctx,d.stage,r.x+118,yy+8,'850 '+(mobile?9:10)+'px ui-monospace,monospace',C.ink);
  const rightX=r.x+r.w-12;text(ctx,'Δ '+d.age,rightX,yy+8,'800 '+(mobile?9:10)+'px ui-monospace,monospace',C.dim,'right');yy+=18;
  const labels=[['GEN',d.gen],['REC',d.rec],['NODE',short(d.node,mobile?13:17)]];let xx=r.x+12;for(const row of labels){text(ctx,row[0]+' '+row[1],xx,yy+8,'800 '+(mobile?8:9)+'px ui-monospace,monospace',C.dim);xx+=mobile?82:92}
  line(ctx,anchor.x,anchor.y,clamp(anchor.x,r.x+10,r.x+r.w-10),anchor.y<r.y?r.y:r.y+r.h,'rgba(211,164,101,.42)',1.3);
  hit(r,{type:d.sel.type,id:d.sel.id,item:d.sel.item},250);return r;
}
function drawHud(ctx,snapshot,layout,selection,env){
  snapshot=snapshot||{projects:[],nodes:[],workers:[],counts:{}};layout=layout||{};env=env||{};const canvas=ctx&&ctx.canvas,dpr=num(env.dpr)||1,width=num(env.width)||(canvas?canvas.width/dpr:0),height=num(env.height)||(canvas?canvas.height/dpr:0);env=Object.assign({},env,{width,height});const level=levelFor(env),occupied=[];STATE.hits=[];
  if(!ctx||!width||!height){STATE.last={level,occupied,hits:[]};return STATE.last}
  ctx.save();if(env.contextScaled!==true&&dpr!==1)ctx.scale(dpr,dpr);
  const summary=drawScoreboard(ctx,snapshot,env,occupied);const projects=drawProjectBoards(ctx,snapshot,layout,env,occupied);let workers={labels:0,beacons:0};
  if(level!=='overview'||selection)workers=drawWorkerMarkers(ctx,snapshot,layout,selection,env,occupied,level);
  let detail=null;if(selection&&(level==='detail'||width<620||env.forceDetail))detail=drawInspectionPlaque(ctx,snapshot,selection,layout,env,occupied);
  ctx.restore();STATE.last={level,summary,projects,workerLabels:workers.labels,beacons:workers.beacons,detail,occupied,hits:STATE.hits.slice(),diegetic:true};return STATE.last;
}
function hitTestHud(point){if(!point)return null;const x=num(point.x!==undefined?point.x:point.clientX),y=num(point.y!==undefined?point.y:point.clientY);if(x===null||y===null)return null;const hits=STATE.hits.filter(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h).sort((a,b)=>b.z-a.z);return hits.length?hits[0].payload:null}

g.COLISEO_LAB_MODULE={id:'hud',version:'2.0.0',drawHud,hitTestHud};
})(window);
