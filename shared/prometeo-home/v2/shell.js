import { PROMETEO_MENU } from '../v1/menu-registry.js';
import { mountPageChangeLoop } from '../../capture/v1/change-loop.js';
import { VoiceQueue } from '../../prometeo-shell/v1/voice.js';
import { listNotes, getNote } from '../../prometeo-shell/v1/db.js';

const CORNERS=['top-left','top-right','bottom-left','bottom-right'];
const CORNER_KEY='prometeo.owner-shell.corner.v2';
const LAST_VIEW_KEY='prometeo.owner-shell.last-view.v2';
const SEL_RESIST_PX=28;
const SEL_UNLOCK_PX=14;
const REC_COMMIT_PX=48;
const PAGE_ID='prometeo-universal-shell-v5';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shell=document.querySelector('#prometeoShell');
const frame=document.querySelector('#pageHost');
const home=document.querySelector('#homeSurface');

try{localStorage.removeItem('prometeo.shell.enabled.v1')}catch{}

shell.innerHTML=`
  <div class="p-safe-probe" id="pSafeProbe" aria-hidden="true"></div>
  <div class="p-veil" id="pVeil"></div>
  <section class="p-menu" id="pMenu" aria-hidden="true" aria-label="Prometeo">
    <header class="p-menu-head">
      <button id="pBack" class="hidden" type="button" aria-label="Volver">‹</button>
      <div class="p-menu-title" id="pMenuTitle">Prometeo</div>
      <button id="pClose" type="button" aria-label="Cerrar">×</button>
    </header>
    <div class="p-items" id="pItems"></div>
  </section>
  <section class="p-rec" id="pRec" aria-hidden="true" aria-label="Grabación">
    <div class="p-rec-top"><span class="p-rec-light"></span><span class="p-rec-state" id="pRecState">Grabando</span><span class="p-rec-time" id="pRecTime">00:00</span></div>
    <div class="p-rec-core"><button class="p-rec-toggle" id="pRecToggle" type="button" aria-label="Pausar o continuar"></button></div>
    <div class="p-rec-rail" id="pRecRail">
      <span class="p-rec-side left">×</span><span class="p-rec-side right">✓</span><span class="p-rec-knob" id="pRecKnob"></span>
    </div>
    <div class="p-rec-foot">deslizá · tocá el centro para pausar</div>
  </section>
  <div class="p-gesture-hint" id="pGestureHint"></div>
  <button class="p-button" id="pButton" type="button" aria-label="Prometeo"></button>
  <div class="p-toast" id="pToast"></div>`;

const $=s=>shell.querySelector(s);
const button=$('#pButton'),menu=$('#pMenu'),veil=$('#pVeil'),items=$('#pItems'),menuTitle=$('#pMenuTitle'),back=$('#pBack'),close=$('#pClose');
const safeProbe=$('#pSafeProbe'),gestureHint=$('#pGestureHint'),rec=$('#pRec'),recState=$('#pRecState'),recTime=$('#pRecTime'),recToggle=$('#pRecToggle'),recRail=$('#pRecRail'),toast=$('#pToast');
let corner=loadCorner(),closedDrag=null,suppressClickUntil=0,menuGesture=null,recSwipe=null,toastTimer=0,recRAF=0,syncTimer=0;
const stack=[PROMETEO_MENU];
const selection=new Map();
const page={id:PAGE_ID,title:'Prometeo',href:location.href,baseline:{surface:'PROMETEO_OWNER_SHELL_V2'}};

function loadCorner(){try{const v=localStorage.getItem(CORNER_KEY);return CORNERS.includes(v)?v:'bottom-right'}catch{return'bottom-right'}}
function saveCorner(){try{localStorage.setItem(CORNER_KEY,corner)}catch{}}
function safeInsets(){const cs=getComputedStyle(safeProbe);return{top:parseFloat(cs.paddingTop)||0,right:parseFloat(cs.paddingRight)||0,bottom:parseFloat(cs.paddingBottom)||0,left:parseFloat(cs.paddingLeft)||0}}
function viewportBox(){const vv=visualViewport;return{w:vv?.width||innerWidth,h:vv?.height||innerHeight,ox:vv?.offsetLeft||0,oy:vv?.offsetTop||0}}
function cornerAnchor(c){const v=viewportBox(),si=safeInsets(),gx=20,gy=20;return{x:v.ox+(c.includes('left')?si.left+gx:v.w-si.right-gx),y:v.oy+(c.includes('top')?si.top+gy:v.h-si.bottom-gy)}}
function setButtonPoint(x,y){shell.style.setProperty('--button-x',`${x.toFixed(2)}px`);shell.style.setProperty('--button-y',`${y.toFixed(2)}px`)}
function clampPoint(x,y){const v=viewportBox(),si=safeInsets(),m=18;return{x:clamp(x,v.ox+si.left+m,v.ox+v.w-si.right-m),y:clamp(y,v.oy+si.top+m,v.oy+v.h-si.bottom-m)}}
function nearestCorner(x,y){let best='bottom-right',bd=Infinity;for(const c of CORNERS){const a=cornerAnchor(c),d=(x-a.x)**2+(y-a.y)**2;if(d<bd){bd=d;best=c}}return best}
function applyCorner(c,{animate=false,from=null,vibrate=false}={}){
  if(!CORNERS.includes(c))c='bottom-right';corner=c;saveCorner();shell.dataset.corner=c;const dest=cornerAnchor(c);setButtonPoint(dest.x,dest.y);
  if(animate&&from){const dx=from.x-dest.x,dy=from.y-dest.y;button.animate([{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`},{transform:'translate(-50%,-50%)'}],{duration:210,easing:'cubic-bezier(.18,.82,.22,1)'}).finished.catch(()=>{}).then(()=>{if(vibrate)navigator.vibrate?.(6)})}else if(vibrate)navigator.vibrate?.(6)
}
function innerXSign(){return corner.includes('left')?1:-1}
function innerYSign(){return corner.includes('top')?1:-1}
function say(text){toast.textContent=text;toast.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('on'),1350)}
function currentNode(){return stack[stack.length-1]}
function currentItems(){return currentNode().items||[]}
function selectedIndex(){return clamp(selection.get(currentNode().id)||0,0,Math.max(0,currentItems().length-1))}
function setSelected(n,{haptic=false}={}){const rows=[...items.querySelectorAll('.p-row')],max=Math.max(0,rows.length-1),next=clamp(n,0,max),prev=selectedIndex();selection.set(currentNode().id,next);rows.forEach((r,i)=>r.classList.toggle('selected',i===next));rows[next]?.scrollIntoView({block:'nearest'});if(haptic&&next!==prev)navigator.vibrate?.(4)}
function renderMenu(){const node=currentNode(),list=node.items||[];menuTitle.textContent=node.title||node.label||'Prometeo';back.classList.toggle('hidden',stack.length===1);items.replaceChildren();for(const [i,item] of list.entries()){const b=document.createElement('button');b.type='button';b.className='p-row';b.dataset.index=String(i);const l=document.createElement('span');l.className='p-label';l.textContent=item.label||'';const c=document.createElement('span');c.className='p-chev';c.textContent=item.items?'›':'';b.append(l,c);b.addEventListener('click',()=>activate(item));items.append(b)}setSelected(selectedIndex())}
function openMenu(){hideRecPanel(false);renderMenu();menu.classList.add('open');veil.classList.add('open');menu.setAttribute('aria-hidden','false')}
function closeMenu(){menu.classList.remove('open');veil.classList.remove('open');menu.setAttribute('aria-hidden','true');clearGesture()}
function menuBack(){if(stack.length>1){stack.pop();renderMenu();navigator.vibrate?.(4)}else closeMenu()}

function directLegacy(url){return url.pathname.includes('/legacy/prometeo-v5/')}
function navigate(href){
  const u=new URL(href,location.href);closeMenu();
  if(directLegacy(u)){location.href=u.href;return}
  if(u.origin!==location.origin){window.open(u.href,'_blank','noopener,noreferrer');return}
  frame.hidden=false;home.hidden=true;frame.src=u.href;try{sessionStorage.setItem(LAST_VIEW_KEY,u.href)}catch{}
}
function frameInfo(){let href=frame?.src||location.href,title='';try{href=frame.contentWindow?.location?.href||href;title=frame.contentDocument?.title||''}catch{}let u;try{u=new URL(href,location.href)}catch{u=new URL(location.href)}return{href:u.href,path:u.pathname+u.search,title:title||u.pathname||'Prometeo'}}
function pageMeta(){const f=frameInfo();return{pageId:PAGE_ID,sourcePath:f.path,sourceHref:f.href,sourceTitle:f.title,viewport:`${innerWidth}x${innerHeight}`}}
function updatePageRef(){const f=frameInfo();page.href=f.href}
frame.addEventListener('load',updatePageRef);

let changeLoop=null;
function syncSoon(){clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{try{await changeLoop?.ingestLocal?.()}catch{}try{await changeLoop?.refresh?.()}catch{}},180)}
const voice=new VoiceQueue({workerURL:new URL('../../prometeo-shell/v1/prometeo-voice-worker-v2.js?v=2',import.meta.url).href,onChange:syncSoon,onRecording:renderRecording});
await voice.init();
const adapter={
  getPage:()=>page,
  listLocalNotes,
  getLocalNote:getNote,
  recordingState:()=>voice.state(),
  startRecording:()=>startRecording(),
  pauseResumeRecording:()=>voice.pauseResume(),
  saveRecording:()=>voice.save(pageMeta()),
  discardRecording:()=>voice.discard(),
  createTextCapture:async text=>{const body=String(text||'').trim();if(!body)return null;if(!changeLoop?.client)throw new Error('Notas todavía no está listo');const file=new File([body],`nota-${new Date().toISOString().replace(/[:.]/g,'-')}.txt`,{type:'text/plain;charset=utf-8'});return changeLoop.client.uploadAttachment(file,page)},
  openLegacyNotes:()=>location.href='./legacy/prometeo-v5/',
  onClose:()=>{},
  navigatePage:async()=>{},
  previewUrl:url=>{if(url)navigate(url)}
};
changeLoop=mountPageChangeLoop({adapter});

async function activate(item){
  if(item.items){stack.push(item);selection.set(item.id,0);renderMenu();navigator.vibrate?.(4);return}
  closeMenu();
  if(item.action==='record'){await startRecording();return}
  if(item.action==='notes'){updatePageRef();await changeLoop.open(page);return}
  if(item.href)navigate(item.href)
}

async function startRecording(){
  closeMenu();showRecPanel();
  try{await voice.start();renderRecording(voice.state());navigator.vibrate?.(7)}catch(e){hideRecPanel();say(e?.name==='NotAllowedError'?'Permití el micrófono':(e?.message||'No pude grabar'))}
}
function showRecPanel(){rec.classList.add('open');rec.setAttribute('aria-hidden','false')}
function hideRecPanel(force=true){if(force||!voice.state().active){rec.classList.remove('open');rec.setAttribute('aria-hidden','true')}resetRecRail()}
function renderRecording(state){const active=!!state?.active,paused=!!state?.paused;shell.classList.toggle('recording',active&&!paused);shell.classList.toggle('paused',active&&paused);rec.classList.toggle('paused',paused);recState.textContent=paused?'Pausado':'Grabando';if(active){showRecPanel();tickRecording()}else{cancelAnimationFrame(recRAF);recTime.textContent='00:00';shell.classList.remove('recording','paused')}}
function tickRecording(){cancelAnimationFrame(recRAF);const tick=()=>{const s=voice.state();if(!s.active)return;const sec=Math.floor(s.elapsed/1000);recTime.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;recRAF=requestAnimationFrame(tick)};tick()}
recToggle.addEventListener('click',()=>{if(!voice.state().active)return;voice.pauseResume();renderRecording(voice.state());navigator.vibrate?.(4)});
function resetRecRail(){recRail.style.setProperty('--rec-x','0px');recRail.classList.remove('dragging','arm-left','arm-right');recSwipe=null}
recRail.addEventListener('pointerdown',e=>{if(!voice.state().active||e.button!==0)return;recSwipe={id:e.pointerId,sx:e.clientX,armed:''};recRail.classList.add('dragging');try{recRail.setPointerCapture(e.pointerId)}catch{};e.preventDefault()});
recRail.addEventListener('pointermove',e=>{const d=recSwipe;if(!d||d.id!==e.pointerId)return;const max=Math.max(56,recRail.clientWidth/2-30),dx=clamp(e.clientX-d.sx,-max,max),abs=Math.abs(dx);recRail.style.setProperty('--rec-x',`${dx}px`);let armed='';if(abs>=SEL_RESIST_PX)armed=dx<0?'left':'right';if(abs<SEL_UNLOCK_PX)armed='';if(armed!==d.armed){d.armed=armed;navigator.vibrate?.(armed?5:2)}recRail.classList.toggle('arm-left',armed==='left');recRail.classList.toggle('arm-right',armed==='right');e.preventDefault()},{passive:false});
async function finishRecSwipe(e,cancel=false){const d=recSwipe;if(!d||d.id!==e.pointerId)return;const x=parseFloat(getComputedStyle(recRail).getPropertyValue('--rec-x'))||0,action=!cancel&&Math.abs(x)>=REC_COMMIT_PX?(x<0?'discard':'save'):'';try{recRail.releasePointerCapture(e.pointerId)}catch{}resetRecRail();if(action==='discard'){voice.discard();hideRecPanel();say('Audio descartado');navigator.vibrate?.(8)}else if(action==='save'){await voice.save(pageMeta());hideRecPanel();say('Guardado · transcribiendo');navigator.vibrate?.([5,25,5])}}
recRail.addEventListener('pointerup',e=>finishRecSwipe(e,false));recRail.addEventListener('pointercancel',e=>finishRecSwipe(e,true));

button.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  if(menu.classList.contains('open')){startMenuGesture(e);return}
  const a=cornerAnchor(corner);closedDrag={id:e.pointerId,sx:e.clientX,sy:e.clientY,lastX:a.x,lastY:a.y,dragging:false};try{button.setPointerCapture(e.pointerId)}catch{}
},{capture:true});
button.addEventListener('pointermove',e=>{
  if(menuGesture&&menuGesture.id===e.pointerId){moveMenuGesture(e);return}
  const d=closedDrag;if(!d||d.id!==e.pointerId||menu.classList.contains('open'))return;const dist=Math.hypot(e.clientX-d.sx,e.clientY-d.sy);if(!d.dragging&&dist<8)return;if(!d.dragging){d.dragging=true;button.classList.add('dragging');if(rec.classList.contains('open'))rec.classList.remove('open')}const p=clampPoint(e.clientX,e.clientY);d.lastX=p.x;d.lastY=p.y;setButtonPoint(p.x,p.y);e.preventDefault();e.stopImmediatePropagation()
},{capture:true,passive:false});
function finishClosedDrag(e,cancel=false){const d=closedDrag;if(!d||d.id!==e.pointerId)return;closedDrag=null;button.classList.remove('dragging');try{button.releasePointerCapture(e.pointerId)}catch{}if(!d.dragging||cancel){applyCorner(corner);return}suppressClickUntil=performance.now()+360;const c=nearestCorner(d.lastX,d.lastY);applyCorner(c,{animate:true,from:{x:d.lastX,y:d.lastY},vibrate:true});if(voice.state().active)showRecPanel();e.preventDefault();e.stopImmediatePropagation()}
button.addEventListener('pointerup',e=>{if(menuGesture&&menuGesture.id===e.pointerId){finishMenuGesture(e,false);return}finishClosedDrag(e,false)},{capture:true});
button.addEventListener('pointercancel',e=>{if(menuGesture&&menuGesture.id===e.pointerId){finishMenuGesture(e,true);return}finishClosedDrag(e,true)},{capture:true});
button.addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();return}if(menuGesture)return;if(voice.state().active){rec.classList.toggle('open');rec.setAttribute('aria-hidden',rec.classList.contains('open')?'false':'true');return}menu.classList.contains('open')?closeMenu():openMenu()});

function startMenuGesture(e){const idx=selectedIndex();menuGesture={id:e.pointerId,sx:e.clientX,sy:e.clientY,startIndex:idx,armed:'',lastIndex:idx};button.classList.add('gesturing');try{button.setPointerCapture(e.pointerId)}catch{};e.preventDefault();e.stopPropagation()}
function moveMenuGesture(e){const d=menuGesture;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.sx,dy=e.clientY-d.sy,lx=dx*innerXSign(),ly=dy*innerYSign();const step=Math.trunc(ly/34);const target=clamp(d.startIndex+step,0,Math.max(0,currentItems().length-1));if(target!==d.lastIndex){d.lastIndex=target;setSelected(target,{haptic:true})}let armed='';if(Math.abs(lx)>=SEL_RESIST_PX)armed=lx>0?'enter':'back';if(Math.abs(lx)<SEL_UNLOCK_PX)armed='';if(armed!==d.armed){d.armed=armed;navigator.vibrate?.(armed?5:2)}gestureHint.textContent=armed==='enter'?'abrir':armed==='back'?(stack.length>1?'volver':'cerrar'):'';gestureHint.classList.toggle('show',!!armed);shell.style.setProperty('--pull-x',`${clamp(dx,-11,11)}px`);shell.style.setProperty('--pull-y',`${clamp(dy,-11,11)}px`);e.preventDefault();e.stopPropagation()}
async function finishMenuGesture(e,cancel=false){const d=menuGesture;if(!d||d.id!==e.pointerId)return;menuGesture=null;button.classList.remove('gesturing');shell.style.setProperty('--pull-x','0px');shell.style.setProperty('--pull-y','0px');gestureHint.classList.remove('show');try{button.releasePointerCapture(e.pointerId)}catch{};suppressClickUntil=performance.now()+250;if(cancel)return;if(d.armed==='back'){menuBack();return}if(d.armed==='enter'){const item=currentItems()[selectedIndex()];if(item)await activate(item)}}
function clearGesture(){menuGesture=null;button.classList.remove('gesturing');shell.style.setProperty('--pull-x','0px');shell.style.setProperty('--pull-y','0px');gestureHint.classList.remove('show')}

back.addEventListener('click',menuBack);close.addEventListener('click',closeMenu);veil.addEventListener('click',closeMenu);
addEventListener('keydown',e=>{if(!menu.classList.contains('open')){if(e.key==='Escape'&&rec.classList.contains('open'))hideRecPanel(false);return}const tag=(e.target?.tagName||'').toLowerCase();if(['input','textarea','select'].includes(tag)||e.target?.isContentEditable)return;if(e.key==='ArrowUp'){setSelected(selectedIndex()-1,{haptic:true});e.preventDefault()}else if(e.key==='ArrowDown'){setSelected(selectedIndex()+1,{haptic:true});e.preventDefault()}else if(e.key==='ArrowRight'||e.key==='Enter'){const item=currentItems()[selectedIndex()];if(item)activate(item);e.preventDefault()}else if(e.key==='ArrowLeft'||e.key==='Escape'){menuBack();e.preventDefault()}});
function resnap(){applyCorner(corner)}
addEventListener('resize',resnap);visualViewport?.addEventListener('resize',resnap);visualViewport?.addEventListener('scroll',resnap);
addEventListener('pagehide',()=>voice.close(),{once:true});

applyCorner(corner);
renderMenu();
try{const last=sessionStorage.getItem(LAST_VIEW_KEY);if(last&&new URL(last).origin===location.origin&&!directLegacy(new URL(last))){frame.hidden=false;home.hidden=true;frame.src=last}}catch{}
