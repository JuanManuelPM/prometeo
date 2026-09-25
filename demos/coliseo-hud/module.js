(function(g){
'use strict';

const STATE={hits:[],last:null};
const LIVE_WORKING=new Set(['LIVE','AGING']);
const ISSUE_STATES=new Set(['SUSPECT','RECOVERING','STALE_MEMBERSHIP']);
const STAGE_SHORT={
  CLAIMED:'CLAIM',READ:'READ',THINK:'THINK',PLAN:'PLAN',WRITE:'WRITE',BUILD:'BUILD',
  IMPLEMENT:'BUILD',VERIFY:'VERIFY',REVIEW:'REVIEW',SUBMIT:'SUBMIT',WAIT:'WAIT'
};
const COLORS={
  ink:'#f0e8db',muted:'#9b9286',panel:'rgba(8,8,7,.91)',line:'rgba(236,226,211,.34)',
  live:'#b9d99d',aging:'#e5c783',suspect:'#e88b73',recover:'#8dc9d8',ready:'#a9c88f',
  blocked:'#9f7770',success:'#6f8e75',unknown:'#80786e',accent:'#e7b276'
};

function arr(x){return Array.isArray(x)?x:[]}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function text(v,fallback){return v===undefined||v===null||v===''?(fallback===undefined?'—':fallback):String(v)}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function short(v,n){v=text(v,'');return v.length>n?v.slice(0,Math.max(1,n-1))+'…':v}
function nodeMap(snapshot){const m=new Map();for(const n of arr(snapshot.nodes))if(n&&n.node_key)m.set(n.node_key,n);return m}
function projectMap(snapshot){const m=new Map();for(const p of arr(snapshot.projects))if(p&&p.project_key)m.set(p.project_key,p);return m}
function workerMap(snapshot){const m=new Map();for(const w of arr(snapshot.workers))if(w&&w.worker_id)m.set(w.worker_id,w);return m}
function activeNodeFor(worker,nodes){return worker&&worker.node_key?nodes.get(worker.node_key):null}
function actualWorking(worker,nodes){
  const n=activeNodeFor(worker,nodes);
  return !!(n&&n.state==='ACTIVE'&&LIVE_WORKING.has(worker.liveness));
}
function issueWorker(worker){return !!(worker&&ISSUE_STATES.has(worker.liveness))}
function recoveryWorker(worker){return !!(worker&&(worker.liveness==='RECOVERING'||Number(worker.recovery_count||0)>0))}
function stageShort(s){return STAGE_SHORT[s]||short(s||'—',10)}
function liveColor(s){
  if(s==='LIVE')return COLORS.live;
  if(s==='AGING')return COLORS.aging;
  if(s==='SUSPECT'||s==='STALE_MEMBERSHIP')return COLORS.suspect;
  if(s==='RECOVERING')return COLORS.recover;
  if(s==='RECENT_IDLE')return COLORS.muted;
  return COLORS.unknown;
}
function levelFor(env){
  if(env&&['overview','mid','detail'].includes(env.semanticLevel))return env.semanticLevel;
  const z=num(env&&env.zoom);
  if(z!==null){if(z<.82)return 'overview';if(z<1.5)return 'mid';return 'detail'}
  const w=num(env&&env.width)||0;
  return w&&w<560?'mid':'overview';
}
function resolveSelection(selection,snapshot){
  if(!selection)return null;
  if(typeof selection==='string'){
    const wm=workerMap(snapshot),nm=nodeMap(snapshot),pm=projectMap(snapshot);
    if(wm.has(selection))return {type:'worker',id:selection,item:wm.get(selection)};
    if(nm.has(selection))return {type:'node',id:selection,item:nm.get(selection)};
    if(pm.has(selection))return {type:'project',id:selection,item:pm.get(selection)};
    return null;
  }
  const type=selection.type||selection.kind;
  const id=selection.id||selection.worker_id||selection.node_key||selection.project_key;
  if(!id)return null;
  const source=type==='node'?nodeMap(snapshot):type==='project'?projectMap(snapshot):workerMap(snapshot);
  const item=source.get(id)||selection.item||selection;
  return {type:type||'worker',id,item};
}
function pickXY(v){
  if(!v)return null;
  const x=num(v.x!==undefined?v.x:(v.screen_x!==undefined?v.screen_x:v.screenX));
  const y=num(v.y!==undefined?v.y:(v.screen_y!==undefined?v.screen_y:v.screenY));
  return x===null||y===null?null:{x,y};
}
function fromCollection(coll,id){
  if(!coll)return null;
  if(coll instanceof Map)return coll.get(id)||null;
  if(Array.isArray(coll)){
    return coll.find(v=>v&&(v.id===id||v.worker_id===id||v.node_key===id||v.project_key===id))||null;
  }
  return typeof coll==='object'?(coll[id]||null):null;
}
function anchorFor(layout,type,id,item,env){
  const names=type==='worker'?['workers','workerPositions','worker_points']:
    type==='node'?['nodes','nodePositions','node_points']:['projects','projectPositions','project_points'];
  for(const name of names){
    const p=pickXY(fromCollection(layout&&layout[name],id));
    if(p)return p;
  }
  const own=pickXY(item);
  if(own)return own;
  if(env&&typeof env.projectToScreen==='function'){
    const wx=num(item&&item.world_x),wz=num(item&&item.world_z),wh=num(item&&item.world_h)||0;
    if(wx!==null&&wz!==null){
      const p=env.projectToScreen({x:wx,y:wh,z:wz},item,type);
      const q=pickXY(p);if(q)return q;
    }
  }
  return null;
}
function rounded(ctx,x,y,w,h,r){
  r=Math.max(0,Math.min(r,Math.min(w,h)/2));
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function rectsOverlap(a,b,pad){
  pad=pad||0;
  return !(a.x+a.w+pad<=b.x||b.x+b.w+pad<=a.x||a.y+a.h+pad<=b.y||b.y+b.h+pad<=a.y);
}
function reserve(rect,occupied){for(const o of occupied)if(rectsOverlap(rect,o,3))return false;occupied.push(rect);return true}
function drawText(ctx,s,x,y,font,color,align){
  ctx.font=font;ctx.textAlign=align||'left';ctx.textBaseline='alphabetic';ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function pill(ctx,x,y,label,color,opts){
  opts=opts||{};const fs=opts.fs||11,padX=opts.padX||8,h=opts.h||22;
  ctx.font=(opts.weight||700)+' '+fs+'px system-ui,sans-serif';
  const w=Math.ceil(ctx.measureText(label).width)+padX*2;
  ctx.fillStyle=opts.bg||'rgba(7,7,6,.82)';rounded(ctx,x,y,w,h,h/2);ctx.fill();
  if(opts.stroke){ctx.strokeStyle=opts.stroke;ctx.lineWidth=1;ctx.stroke()}
  ctx.fillStyle=color;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(label,x+padX,y+h/2+.25);
  return {x,y,w,h};
}
function line(ctx,a,b,color,width){
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color||COLORS.line;ctx.lineWidth=width||1;ctx.stroke();
}
function wrapLines(ctx,value,maxW,maxLines){
  const words=text(value,'—').split(/\s+/),lines=[];let cur='';
  for(const word of words){
    const test=cur?cur+' '+word:word;
    if(ctx.measureText(test).width<=maxW||!cur){cur=test;continue}
    lines.push(cur);cur=word;if(lines.length>=maxLines-1)break;
  }
  if(cur&&lines.length<maxLines)lines.push(cur);
  const used=words.join(' ');
  const made=lines.join(' ');
  if(made.length<used.length&&lines.length){
    let last=lines.length-1;
    while(lines[last].length>2&&ctx.measureText(lines[last]+'…').width>maxW)lines[last]=lines[last].slice(0,-1);
    lines[last]+='…';
  }
  return lines;
}
function hit(rect,payload,z){
  STATE.hits.push({x:rect.x,y:rect.y,w:rect.w,h:rect.h,payload,z:z||0});
}
function projectStats(snapshot){
  const nodes=nodeMap(snapshot),projects=projectMap(snapshot),out=[];
  for(const p of arr(snapshot.projects)){
    const ws=arr(snapshot.workers).filter(w=>w.project_key===p.project_key);
    const active=ws.filter(w=>actualWorking(w,nodes)).length;
    const issues=ws.filter(issueWorker).length;
    const recovery=ws.filter(recoveryWorker).length;
    const ns=arr(snapshot.nodes).filter(n=>n.project_key===p.project_key);
    out.push({project:p,active,issues,recovery,ready:ns.filter(n=>n.state==='READY').length,blocked:ns.filter(n=>n.state==='BLOCKED').length});
  }
  for(const w of arr(snapshot.workers)){
    if(w.project_key&&!projects.has(w.project_key)){
      let row=out.find(x=>x.project.project_key===w.project_key);
      if(!row){row={project:{project_key:w.project_key,title:w.project_key},active:0,issues:0,recovery:0,ready:0,blocked:0};out.push(row)}
      if(actualWorking(w,nodes))row.active++;if(issueWorker(w))row.issues++;if(recoveryWorker(w))row.recovery++;
    }
  }
  return out;
}
function topRail(ctx,snapshot,env,occupied){
  const W=env.width,H=env.height,mobile=W<620,tv=W>=1200;
  const nodes=nodeMap(snapshot),workers=arr(snapshot.workers);
  const working=workers.filter(w=>actualWorking(w,nodes)).length;
  const issue=workers.filter(issueWorker).length;
  const recovering=workers.filter(recoveryWorker).length;
  const activeProjects=new Set(workers.filter(w=>actualWorking(w,nodes)||issueWorker(w)).map(w=>w.project_key).filter(Boolean)).size;
  const fs=tv?14:(mobile?10:12),h=tv?30:26;
  let x=mobile?8:14,y=mobile?8:12;
  const parts=[
    {label:working+' WORKING',color:COLORS.live},
    {label:activeProjects+' PROJECTS',color:COLORS.ink}
  ];
  if(issue)parts.push({label:issue+' ISSUE'+(issue===1?'':'S'),color:COLORS.suspect});
  if(recovering)parts.push({label:recovering+' RECOVERY',color:COLORS.recover});
  for(const part of parts){
    const r=pill(ctx,x,y,part.label,part.color,{fs,h,bg:'rgba(5,5,4,.76)',stroke:'rgba(240,232,219,.12)'});
    occupied.push(r);x+=r.w+6;
    if(x>W-110)break;
  }
  const syn=snapshot&&snapshot.demo!==false;
  if(syn){
    const label='SYNTHETIC';
    ctx.font='800 '+fs+'px ui-monospace,monospace';
    const w=ctx.measureText(label).width+16;
    const r={x:W-w-(mobile?8:14),y,w,h};
    rounded(ctx,r.x,r.y,r.w,r.h,h/2);ctx.fillStyle='rgba(89,43,29,.82)';ctx.fill();
    drawText(ctx,label,r.x+8,r.y+h/2+fs*.34,'800 '+fs+'px ui-monospace,monospace',COLORS.accent);
    occupied.push(r);
  }
  return {working,issue,recovering,activeProjects};
}
function projectLabels(ctx,snapshot,layout,env,occupied){
  const stats=projectStats(snapshot),W=env.width,H=env.height,mobile=W<620,tv=W>=1200;
  const fs=tv?15:(mobile?10:12),shown=[];
  for(const row of stats){
    const p=row.project,anchor=anchorFor(layout,'project',p.project_key,p,env);if(!anchor)continue;
    const title=short(p.title||p.project_key,mobile?13:20);
    const suffix=row.issues?' · !'+row.issues:(row.recovery?' · R'+row.recovery:(row.active?' · '+row.active+' signal':''));
    const label=title+suffix;
    ctx.font='800 '+fs+'px system-ui,sans-serif';
    const w=Math.ceil(ctx.measureText(label).width)+16,h=tv?28:24;
    const candidates=[
      {x:anchor.x-w/2,y:anchor.y-h-12},{x:anchor.x-w/2,y:anchor.y+12},
      {x:anchor.x+12,y:anchor.y-h/2},{x:anchor.x-w-12,y:anchor.y-h/2}
    ];
    let rect=null;
    for(const c of candidates){
      const r={x:clamp(c.x,6,W-w-6),y:clamp(c.y,44,H-h-8),w,h};
      if(reserve(r,occupied)){rect=r;break}
    }
    if(!rect)continue;
    rounded(ctx,rect.x,rect.y,rect.w,rect.h,6);
    ctx.fillStyle='rgba(7,7,6,.78)';ctx.fill();
    ctx.strokeStyle=row.issues?COLORS.suspect:'rgba(236,226,211,.18)';ctx.lineWidth=1;ctx.stroke();
    drawText(ctx,label,rect.x+8,rect.y+h/2+fs*.34,'800 '+fs+'px system-ui,sans-serif',row.issues?COLORS.suspect:COLORS.ink);
    const moved=Math.hypot(rect.x+rect.w/2-anchor.x,rect.y+rect.h/2-anchor.y);
    if(moved>44&&(row.issues||row.recovery))line(ctx,anchor,{x:rect.x+rect.w/2,y:rect.y+rect.h/2},row.issues?COLORS.suspect:COLORS.line,1);
    hit(rect,{type:'project',id:p.project_key,item:p},20);shown.push(p.project_key);
  }
  return shown;
}
function workerPriority(w,selectedId,nodes){
  if(w.worker_id===selectedId)return 1000;
  let p=0;if(w.liveness==='RECOVERING')p+=900;if(w.liveness==='SUSPECT'||w.liveness==='STALE_MEMBERSHIP')p+=850;
  if(w.liveness==='AGING')p+=600;if(Number(w.recovery_count||0)>0)p+=120;if(actualWorking(w,nodes))p+=300;
  if(w.progress_stage==='VERIFY'||w.progress_stage==='SUBMIT')p+=60;
  return p;
}
function workerLabels(ctx,snapshot,layout,selection,env,occupied,level){
  const W=env.width,H=env.height,mobile=W<620,tv=W>=1200,nodes=nodeMap(snapshot);
  const sel=resolveSelection(selection,snapshot),selectedId=sel&&sel.type==='worker'?sel.id:null;
  const labels=arr(snapshot.workers).map(w=>({w,p:workerPriority(w,selectedId,nodes)})).sort((a,b)=>b.p-a.p);
  const area=W*H,maxByArea=Math.max(mobile?7:10,Math.floor(area/(mobile?30000:36000)));
  const max=level==='detail'?Math.min(tv?38:26,maxByArea+8):Math.min(tv?28:18,maxByArea);
  const fs=tv?14:(mobile?10:11),sub=tv?11:9,h=tv?38:32;
  let placed=0;
  for(const entry of labels){
    const w=entry.w,anchor=anchorFor(layout,'worker',w.worker_id,w,env);if(!anchor)continue;
    const issue=issueWorker(w),selected=w.worker_id===selectedId;
    if(placed>=max&&!selected&&!issue)continue;
    const code=text(w.display_code,short(w.worker_id||'WORKER',8));
    const stage=stageShort(w.progress_stage);
    const primary=code+' · '+stage+(issue?' · '+w.liveness:'');
    const secondary=short(w.project_key||'',mobile?12:18);
    ctx.font='800 '+fs+'px ui-monospace,monospace';
    const w1=ctx.measureText(primary).width;
    ctx.font='700 '+sub+'px system-ui,sans-serif';
    const w2=ctx.measureText(secondary).width;
    const bw=Math.ceil(Math.max(w1,w2))+16;
    const offsets=[[0,-h-12],[14,-h/2],[-bw-14,-h/2],[0,12],[18,-h-16],[-bw-18,-h-16]];
    let rect=null;
    for(const off of offsets){
      const r={x:clamp(anchor.x+off[0],6,W-bw-6),y:clamp(anchor.y+off[1],44,H-h-8),w:bw,h};
      if(reserve(r,occupied)){rect=r;break}
    }
    if(!rect){
      if(!selected&&!issue)continue;
      const r={x:clamp(anchor.x+16,6,W-bw-6),y:clamp(anchor.y-h-16,44,H-h-8),w:bw,h};
      rect=r;occupied.push(r);
    }
    rounded(ctx,rect.x,rect.y,rect.w,rect.h,5);
    ctx.fillStyle=selected?'rgba(32,25,18,.94)':'rgba(7,7,6,.84)';ctx.fill();
    ctx.strokeStyle=selected?COLORS.accent:(issue?liveColor(w.liveness):'rgba(236,226,211,.16)');
    ctx.lineWidth=selected?1.6:1;ctx.stroke();
    drawText(ctx,primary,rect.x+8,rect.y+fs+7,'800 '+fs+'px ui-monospace,monospace',issue?liveColor(w.liveness):COLORS.ink);
    drawText(ctx,secondary,rect.x+8,rect.y+h-6,'700 '+sub+'px system-ui,sans-serif',COLORS.muted);
    const moved=Math.hypot(rect.x+rect.w/2-anchor.x,rect.y+rect.h/2-anchor.y);
    if(moved>48&&(selected||issue))line(ctx,anchor,{x:clamp(anchor.x,rect.x,rect.x+rect.w),y:clamp(anchor.y,rect.y,rect.y+rect.h)},issue?liveColor(w.liveness):COLORS.line,1);
    ctx.beginPath();ctx.arc(anchor.x,anchor.y,selected?4.2:3.2,0,Math.PI*2);ctx.fillStyle=liveColor(w.liveness);ctx.fill();
    hit(rect,{type:'worker',id:w.worker_id,item:w},100+(selected?100:0)+(issue?50:0));
    placed++;
  }
  return placed;
}
function detailRows(snapshot,selection){
  const sel=resolveSelection(selection,snapshot);if(!sel)return null;
  const nodes=nodeMap(snapshot),projects=projectMap(snapshot);
  let w=null,n=null,p=null,title='',liveness='—',stage='—',sec='—',gen='—',rec='—',job='—',node='—';
  if(sel.type==='worker'){
    w=sel.item;n=w&&w.node_key?nodes.get(w.node_key):null;p=projects.get(w&&w.project_key);
    title=(w&&w.title)||(n&&n.title)||w&&w.node_key||w&&w.worker_id||'Worker';
    liveness=text(w&&w.liveness);stage=text(w&&w.progress_stage);
    sec=w&&w.seconds_since_progress!==undefined?text(w.seconds_since_progress)+'s':'—';
    gen=text(w&&w.assignment_generation);rec=text(w&&w.recovery_count,'0');job=text(w&&(w.job_ref||w.job_id));node=text(w&&w.node_key);
  }else if(sel.type==='node'){
    n=sel.item;p=projects.get(n&&n.project_key);title=text(n&&n.title,n&&n.node_key);stage=text(n&&n.progress_stage);
    node=text(n&&n.node_key);const linked=arr(snapshot.workers).find(x=>x.node_key===n.node_key);
    if(linked){w=linked;liveness=text(w.liveness);sec=w.seconds_since_progress!==undefined?text(w.seconds_since_progress)+'s':'—';gen=text(w.assignment_generation);rec=text(w.recovery_count,'0');job=text(w.job_ref||w.job_id)}
  }else{
    p=sel.item;title=text(p&&p.title,p&&p.project_key);
  }
  const projectTitle=text(p&&p.title,(w&&w.project_key)||(n&&n.project_key)||sel.item&&sel.item.project_key);
  const prev=n?arr(n.depends_on):[];
  const next=n?arr(snapshot.nodes).filter(x=>arr(x.depends_on).includes(n.node_key)).map(x=>x.node_key):[];
  return {sel,w,n,p,title,projectTitle,liveness,stage,sec,gen,rec,job,node,prev,next};
}
function drawDetail(ctx,snapshot,selection,env,occupied){
  const data=detailRows(snapshot,selection);if(!data)return null;
  const W=env.width,H=env.height,mobile=W<620,tv=W>=1200;
  const pad=mobile?14:16,fsTitle=tv?18:(mobile?15:16),fs=tv?13:(mobile?11:12),small=tv?11:10;
  const panel=mobile?
    {x:8,y:Math.max(78,H-Math.min(248,H*.38)-8),w:W-16,h:Math.min(248,H*.38)}:
    {x:Math.max(12,W-(tv?390:350)-14),y:56,w:tv?390:350,h:Math.min(360,H-70)};
  rounded(ctx,panel.x,panel.y,panel.w,panel.h,10);ctx.fillStyle=COLORS.panel;ctx.fill();
  ctx.strokeStyle='rgba(240,232,219,.22)';ctx.lineWidth=1;ctx.stroke();occupied.push(panel);
  const close={x:panel.x+panel.w-34,y:panel.y+8,w:26,h:26};
  rounded(ctx,close.x,close.y,close.w,close.h,13);ctx.fillStyle='rgba(255,255,255,.07)';ctx.fill();
  drawText(ctx,'×',close.x+13,close.y+19,'700 19px system-ui,sans-serif',COLORS.ink,'center');
  hit(close,{type:'close',id:'detail-close'},500);
  const typeLabel=data.sel.type==='worker'?'WORKER DETAIL':data.sel.type==='node'?'NODE DETAIL':'PROJECT DETAIL';
  drawText(ctx,typeLabel,panel.x+pad,panel.y+20,'800 '+small+'px ui-monospace,monospace',COLORS.accent);
  ctx.font='800 '+fsTitle+'px system-ui,sans-serif';
  const titleLines=wrapLines(ctx,data.title,panel.w-pad*2-34,2);
  let y=panel.y+43;
  for(const ln of titleLines){drawText(ctx,ln,panel.x+pad,y,'800 '+fsTitle+'px system-ui,sans-serif',COLORS.ink);y+=fsTitle+3}
  y+=4;
  drawText(ctx,short(data.projectTitle,42),panel.x+pad,y,'700 '+fs+'px system-ui,sans-serif',COLORS.muted);y+=fs+11;
  if(data.sel.type!=='project'){
    const c=liveColor(data.liveness);
    const tag=pill(ctx,panel.x+pad,y-4,data.liveness,c,{fs:small,h:22,bg:'rgba(255,255,255,.05)',stroke:c});
    const stage=pill(ctx,tag.x+tag.w+6,y-4,stageShort(data.stage),COLORS.ink,{fs:small,h:22,bg:'rgba(255,255,255,.05)'});
    y+=30;
    const rows=[
      ['seconds_since_progress',data.sec],['assignment_generation',data.gen],['recovery_count',data.rec],
      ['job',data.job],['node',data.node]
    ];
    for(const row of rows){
      if(y>panel.y+panel.h-56)break;
      drawText(ctx,row[0],panel.x+pad,y,'700 '+small+'px ui-monospace,monospace',COLORS.muted);
      drawText(ctx,short(row[1],mobile?26:34),panel.x+panel.w-pad,y,'700 '+fs+'px ui-monospace,monospace',COLORS.ink,'right');y+=fs+9;
    }
    if(y<panel.y+panel.h-34){
      const prev=data.prev.length?data.prev.join(', '):'—',next=data.next.length?data.next.join(', '):'—';
      drawText(ctx,'CAUSAL',panel.x+pad,y,'800 '+small+'px ui-monospace,monospace',COLORS.accent);y+=small+7;
      drawText(ctx,'← '+short(prev,mobile?26:38),panel.x+pad,y,'700 '+small+'px ui-monospace,monospace',COLORS.muted);
      drawText(ctx,short(next,mobile?26:38)+' →',panel.x+panel.w-pad,y,'700 '+small+'px ui-monospace,monospace',COLORS.muted,'right');
    }
  }else{
    drawText(ctx,'Selección espacial del proyecto. El detalle causal vive en sus nodos.',panel.x+pad,y,'600 '+fs+'px system-ui,sans-serif',COLORS.muted);
  }
  hit(panel,{type:data.sel.type,id:data.sel.id,item:data.sel.item},250);
  return panel;
}
function drawHud(ctx,snapshot,layout,selection,env){
  snapshot=snapshot||{projects:[],nodes:[],workers:[],counts:{}};
  layout=layout||{};env=env||{};
  const canvas=ctx&&ctx.canvas;
  const dpr=num(env.dpr)||1;
  const width=num(env.width)||(canvas?canvas.width/dpr:0),height=num(env.height)||(canvas?canvas.height/dpr:0);
  env=Object.assign({},env,{width,height});
  const level=levelFor(env),occupied=[];STATE.hits=[];
  if(!ctx||!width||!height){STATE.last={level,occupied,hits:STATE.hits};return STATE.last}
  ctx.save();
  if(env.contextScaled!==true&&dpr!==1)ctx.scale(dpr,dpr);
  const summary=topRail(ctx,snapshot,env,occupied);
  const projects=projectLabels(ctx,snapshot,layout,env,occupied);
  let workers=0;
  if(level!=='overview')workers=workerLabels(ctx,snapshot,layout,selection,env,occupied,level);
  let detail=null;
  if(selection&&(level==='detail'||width<620||env.forceDetail))detail=drawDetail(ctx,snapshot,selection,env,occupied);
  ctx.restore();
  STATE.last={level,summary,projects,workerLabels:workers,detail,occupied,hits:STATE.hits.slice()};
  return STATE.last;
}
function hitTestHud(point){
  if(!point)return null;
  const x=num(point.x!==undefined?point.x:point.clientX),y=num(point.y!==undefined?point.y:point.clientY);
  if(x===null||y===null)return null;
  const hits=STATE.hits.filter(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h).sort((a,b)=>b.z-a.z);
  return hits.length?hits[0].payload:null;
}

g.COLISEO_LAB_MODULE={
  id:'hud',
  version:'1.0.0',
  drawHud,
  hitTestHud
};
})(window);
