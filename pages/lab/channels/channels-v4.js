(()=>{
'use strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let activeVideoId=null,activeChannel=null,busy=false;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

async function getRealChannel(){
  if(activeChannel)return activeChannel;
  if(!window.Creator?.live)return null;
  const cs=await Creator.channels();
  activeChannel=cs.find(x=>x.youtube_channel_id)||cs.find(x=>String(x.slug||'').includes('carpincho'))||null;
  return activeChannel;
}

function drawApple(ctx,w,h,t){
  const bg='#ddd4c5',ink='#242923',red='#ad2730',red2='#c84a4f',cream='#f1d9ad',green='#526f3f',skin='#d5a17c',steel='#d7d8d3';
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#cdbfa9';ctx.fillRect(0,h*.73,w,h*.27);
  const cx=w*.5,cy=h*.58;
  const split=Math.max(0,Math.min(1,(t-.64)/.28));
  const sep=w*.105*Math.pow(split,.75);
  // shadow
  ctx.save();ctx.globalAlpha=.16;ctx.fillStyle=ink;ctx.beginPath();ctx.ellipse(cx,cy+h*.11,w*.23,h*.035,0,0,Math.PI*2);ctx.fill();ctx.restore();
  function wholeApple(){
    ctx.fillStyle=red;ctx.strokeStyle='#68191d';ctx.lineWidth=4;
    ctx.beginPath();ctx.ellipse(cx-w*.055,cy,w*.105,h*.118,-.08,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx+w*.055,cy,w*.105,h*.118,.08,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=red2;ctx.beginPath();ctx.ellipse(cx,cy+h*.01,w*.13,h*.122,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.globalAlpha=.55;ctx.fillStyle='#f08f8a';ctx.beginPath();ctx.ellipse(cx-w*.055,cy-h*.045,w*.018,h*.045,-.15,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function half(sign){
    const x=cx+sign*sep;
    ctx.fillStyle=red;ctx.strokeStyle='#68191d';ctx.lineWidth=4;
    ctx.beginPath();ctx.ellipse(x+sign*w*.035,cy,w*.085,h*.115,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=cream;ctx.strokeStyle='#68191d';ctx.lineWidth=2;
    ctx.beginPath();
    if(sign<0){ctx.moveTo(x+4,cy-h*.102);ctx.quadraticCurveTo(x-w*.05,cy,x+4,cy+h*.105)}
    else{ctx.moveTo(x-4,cy-h*.102);ctx.quadraticCurveTo(x+w*.05,cy,x-4,cy+h*.105)}
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#4c3326';
    for(const sy of [-.025,.015]){ctx.beginPath();ctx.ellipse(x-sign*2,cy+h*sy,5,10,.2*sign,0,Math.PI*2);ctx.fill()}
  }
  if(split<.025)wholeApple();else{half(-1);half(1)}
  // stem + leaf
  ctx.fillStyle='#5b3a24';roundRect(ctx,cx-6-sep*.08,cy-h*.145,12,h*.062,5);ctx.fill();
  ctx.fillStyle=green;ctx.strokeStyle='#34482b';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx+30,cy-h*.145,36,16,-.22,0,Math.PI*2);ctx.fill();ctx.stroke();
  // knife + hand
  if(t>.07&&t<.84){
    let ky;
    if(t<.31){const p=(t-.07)/.24;ky=h*.19+h*.24*p*p}
    else if(t<.64){const p=(t-.31)/.33;ky=h*.43+h*.29*p}
    else{const p=(t-.64)/.20;ky=h*.72-h*.08*p}
    const kx=cx+(t>.64?45*(t-.64)/.20:0);
    ctx.fillStyle=ink;ctx.strokeStyle='#171815';ctx.lineWidth=2;roundRect(ctx,kx-w*.205,ky-h*.046,w*.17,h*.027,9);ctx.fill();ctx.stroke();
    ctx.fillStyle=steel;ctx.strokeStyle='#747873';ctx.beginPath();ctx.moveTo(kx-w*.035,ky-h*.055);ctx.lineTo(kx+w*.23,ky-h*.028);ctx.lineTo(kx-w*.035,ky-h*.004);ctx.closePath();ctx.fill();ctx.stroke();
    // hand
    ctx.fillStyle=skin;ctx.strokeStyle='#825d47';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(kx-w*.235,ky-h*.03,30,25,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    roundRect(ctx,kx-w*.23,ky-h*.038,w*.12,h*.02,8);ctx.fill();ctx.stroke();
  }
  // minimal label and progress
  ctx.fillStyle=ink;ctx.font=`${Math.round(w*.025)}px sans-serif`;ctx.fillText('DEMO $0 · RENDER LOCAL',w*.05,h*.052);
  ctx.globalAlpha=.35;ctx.fillRect(w*.05,h*.95,w*.9,2);ctx.globalAlpha=1;ctx.fillRect(w*.05,h*.95,w*.9*t,3);
}
function roundRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

async function renderAppleVideo(onProgress){
  if(!window.MediaRecorder)throw new Error('Este navegador no soporta MediaRecorder');
  const canvas=document.createElement('canvas');canvas.width=540;canvas.height=960;
  const ctx=canvas.getContext('2d');
  const stream=canvas.captureStream(24);
  const types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  const mimeType=types.find(x=>MediaRecorder.isTypeSupported(x))||'';
  const rec=new MediaRecorder(stream,mimeType?{mimeType,videoBitsPerSecond:1700000}:{videoBitsPerSecond:1700000});
  const chunks=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  const done=new Promise((resolve,reject)=>{rec.onstop=()=>resolve(new Blob(chunks,{type:rec.mimeType||'video/webm'}));rec.onerror=e=>reject(e.error||e)});
  rec.start(180);
  const duration=5000,start=performance.now();
  await new Promise(resolve=>{
    function frame(now){const p=Math.min(1,(now-start)/duration);drawApple(ctx,canvas.width,canvas.height,p);onProgress?.(p);if(p<1)requestAnimationFrame(frame);else resolve()}
    requestAnimationFrame(frame);
  });
  await sleep(180);rec.stop();stream.getTracks().forEach(t=>t.stop());
  const blob=await done;if(blob.size<5000)throw new Error('El render salió vacío');
  return {blob,durationMs:5000};
}

async function createVideoIfNeeded(title,hook){
  if(activeVideoId)return activeVideoId;
  const ch=await getRealChannel();if(!ch)throw new Error('No encuentro Carpincho Falopa conectado');
  const v=await Creator.createVideo({channelId:ch.id,title:title||'Manzana cortada · demo $0',hook:hook||'Una manzana se corta limpiamente en dos.',targetDurationMs:5000});
  activeVideoId=v.id;return v.id;
}

async function uploadAndRegister(videoId,blob,durationMs){
  const uid=Creator.user?.id;if(!uid)throw new Error('Sesión no disponible');
  const ext='webm',path=`${uid}/${videoId}/master/free-demo-${Date.now()}.${ext}`;
  const up=await Creator.sb.storage.from('creator-assets').upload(path,blob,{contentType:blob.type||'video/webm',upsert:false,cacheControl:'3600'});
  if(up.error)throw up.error;
  const rpc=await Creator.sb.rpc('creator_register_free_demo',{p_video_id:videoId,p_storage_path:path,p_mime_type:blob.type||'video/webm',p_bytes:blob.size,p_duration_ms:durationMs});
  if(rpc.error){await Creator.sb.storage.from('creator-assets').remove([path]).catch(()=>{});throw rpc.error}
  return {path,...rpc.data};
}

async function signedMaster(videoId){
  try{const m=await Creator.master(videoId);return m?.signed_url||m?.url||null}catch{return null}
}

function stage(container){
  let el=container.querySelector('.v4-stage');
  if(!el){el=document.createElement('section');el.className='v4-stage';container.appendChild(el)}
  return el;
}
function renderStage(el,{title='Demo $0',status='listo',url=null,videoId=null,error=null,publish=false}={}){
  el.innerHTML=`<div class="v4-stage-head"><b>${esc(title)}</b><span>${esc(status)}</span></div>${error?`<div class="v4-error">${esc(error)}</div>`:''}${url?`<div class="v4-player-wrap"><video class="v4-player" src="${esc(url)}" controls playsinline preload="metadata"></video><div class="v4-player-meta"><span>5 s</span><span>$0</span><span>Storage privado</span></div></div>`:''}<div class="v4-stage-actions">${videoId&&url?`<button class="v4-btn primary" data-v4-publish="${esc(videoId)}">subir privado a YouTube →</button>`:''}${videoId?`<button class="v4-btn" data-v4-open="${esc(videoId)}">abrir producción</button>`:''}</div><div class="v4-job"></div>`;
  el.querySelector('[data-v4-publish]')?.addEventListener('click',e=>publishPrivate(e.currentTarget.dataset.v4Publish,el));
  el.querySelector('[data-v4-open]')?.addEventListener('click',()=>{realGoCreate();const b=document.querySelector(`[data-video="${videoId}"]`);b?.click()});
}

async function generateDemo({container,title,hook,existingVideoId=null}={}){
  if(busy)return;busy=true;if(existingVideoId)activeVideoId=existingVideoId;
  const el=stage(container);el.innerHTML='<div class="v4-stage-head"><b>Generando demo $0</b><span id="v4Pct">0%</span></div><div class="v4-progress"><i></i></div><div class="v4-job">render local · sin API paga</div>';
  try{
    const id=await createVideoIfNeeded(title,hook);
    const p=el.querySelector('.v4-progress i'),pct=el.querySelector('#v4Pct');
    const {blob,durationMs}=await renderAppleVideo(x=>{if(p)p.style.width=`${Math.round(x*100)}%`;if(pct)pct.textContent=`${Math.round(x*100)}%`});
    const local=URL.createObjectURL(blob);renderStage(el,{title:title||'Manzana cortada · demo $0',status:'guardando…',url:local,videoId:id});
    await uploadAndRegister(id,blob,durationMs);
    const remote=await signedMaster(id);
    renderStage(el,{title:title||'Manzana cortada · demo $0',status:'READY · QA básico ✓',url:remote||local,videoId:id});
    await refreshLibrary();
  }catch(e){renderStage(el,{title:'Demo $0',status:'falló',error:String(e?.message||e)})}
  finally{busy=false;activeVideoId=null}
}

async function publishPrivate(videoId,el){
  const job=el.querySelector('.v4-job');job.textContent='creando upload privado…';
  try{
    const p=await Creator.publish(videoId,{privacy:'private',contains_synthetic_media:false});
    const j=await Creator.waitJob(p.job.id,x=>job.textContent=`YouTube · ${String(x.status).toLowerCase()}`);
    if(j.status==='SUCCEEDED')job.textContent='YouTube privado ✓';else job.textContent=`YouTube · ${j.status}`;
    await refreshLibrary();
  }catch(e){job.textContent=String(e?.message||e)}
}

function realGoCreate(){
  const b=document.querySelector('[data-rview="create"]');b?.click();
}

async function enhanceNow(){
  const actions=document.querySelector('.real-mode .real-actions');if(!actions||actions.querySelector('[data-v4-demo]'))return;
  const b=document.createElement('button');b.className='real-action primary';b.dataset.v4Demo='1';b.textContent='generar demo visible $0 →';
  actions.prepend(b);
  b.onclick=()=>{const parent=actions.closest('.real-section')||actions.parentElement;generateDemo({container:parent,title:'Manzana cortada · demo $0',hook:'Una manzana roja se corta en dos sobre una mesa.'})};
}

function enhanceCreate(){
  const form=document.querySelector('.real-mode #createForm');if(!form||form.querySelector('[data-v4-create-demo]'))return;
  const b=document.createElement('button');b.className='create-submit v4-demo-create';b.dataset.v4CreateDemo='1';b.textContent='generar demo visible $0 →';form.appendChild(b);
  b.onclick=async()=>{
    const title=document.querySelector('#cTitle')?.value.trim()||'Manzana cortada · demo $0';
    const hook=document.querySelector('#cBody')?.value.trim()||'Una manzana roja se corta en dos.';
    const section=form.closest('.real-section');activeVideoId=null;await generateDemo({container:section,title,hook});
  };
}

async function enhanceDrawer(){
  const drawer=document.querySelector('.production-drawer');if(!drawer||drawer.querySelector('.v4-media'))return;
  const id=window.__creatorActiveVideo;if(!id)return;
  const media=document.createElement('div');media.className='v4-media';drawer.prepend(media);
  const url=await signedMaster(id);
  if(url){renderStage(media,{title:'Master',status:'READY',url,videoId:id})}
  else{media.innerHTML='<div class="v4-stage-head"><b>Video</b><span>todavía sin master</span></div><button class="v4-btn primary" data-make>generar demo visible $0 →</button>';media.querySelector('[data-make]').onclick=()=>generateDemo({container:media,existingVideoId:id,title:drawer.querySelector('.pd-title')?.textContent||'Demo $0'})}
}

document.addEventListener('click',e=>{
  const d=e.target.closest?.('[data-video]');if(d)window.__creatorActiveVideo=d.dataset.video;
},true);

async function refreshLibrary(){
  const pane=document.querySelector('.real-mode #realPane');if(!pane||!Creator.live)return;
  let lib=pane.querySelector('#v4Library');
  if(!lib){lib=document.createElement('section');lib.id='v4Library';lib.className='real-section v4-library';pane.appendChild(lib)}
  try{
    const ch=await getRealChannel();if(!ch)return;
    const vs=(await Creator.videos(ch.id)).filter(v=>v.metadata?.provenance!=='CANARY').slice(0,12);
    lib.innerHTML=`<div class="real-section-head"><b>Videos reales</b><span>${vs.length}</span></div>${vs.length?`<div class="v4-video-list">${vs.map(v=>`<button data-v4-lib="${v.id}"><span>${esc(v.state)}</span><b>${esc(v.title)}</b><small>${v.youtube_video_id?'YouTube ✓':v.metadata?.demo_storage_path?'video ✓':'sin master'}</small></button>`).join('')}</div>`:'<div class="real-empty">Todavía no hay videos. Generá el primero arriba.</div>'}`;
    lib.querySelectorAll('[data-v4-lib]').forEach(b=>b.onclick=async()=>{window.__creatorActiveVideo=b.dataset.v4Lib;realGoCreate();await sleep(80);document.querySelector(`[data-video="${b.dataset.v4Lib}"]`)?.click()});
  }catch(e){lib.innerHTML='<div class="real-empty">No pude cargar la biblioteca.</div>'}
}

function enhance(){if(!window.Creator)return;enhanceNow();enhanceCreate();enhanceDrawer();if(document.querySelector('.real-mode .real-pane'))refreshLibrary()}
const mo=new MutationObserver(()=>{clearTimeout(window.__v4t);window.__v4t=setTimeout(enhance,80)});mo.observe(document.documentElement,{subtree:true,childList:true});
setTimeout(enhance,900);
})();