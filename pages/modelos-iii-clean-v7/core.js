(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const TOPICS=[
 {t:'Noción de sujeto',s:'La unidad de análisis se amplía: del individuo aislado al sujeto-en-relación y en contexto.',visual:['sujeto relacional psicología sistémica','causalidad circular sistema','contexto relaciones psicología']},
 {t:'Teoría General de los Sistemas',s:'Un sistema es una totalidad organizada: importan los elementos, pero sobre todo sus relaciones y patrones de organización.',visual:['general systems theory diagram','open system homeostasis','equifinality system']},
 {t:'Cibernética',s:'La cibernética estudia regulación, circularidad y retroalimentación dentro de sistemas.',visual:['cybernetics feedback loop','negative positive feedback diagram','second order cybernetics observer']},
 {t:'Teoría de la información',s:'La información reduce incertidumbre y, en Bateson, es una diferencia que produce una diferencia.',visual:['information theory Shannon Weaver diagram','difference that makes a difference Bateson','noise redundancy information']},
 {t:'Teoría de la Comunicación Humana',s:'Toda conducta dentro de una interacción puede adquirir valor comunicacional y organizar una relación.',visual:['communication axioms Watzlawick','communication content relationship diagram','symmetric complementary communication']},
 {t:'Constructivismo y construccionismo',s:'El conocimiento y los significados se construyen desde marcos, relaciones, lenguaje y prácticas.',visual:['constructivism reality Watzlawick','social constructionism language','Flatland perception constructivism']},
 {t:'Modelo de mente de Bateson',s:'La mente puede entenderse como un sistema distribuido de diferencias, transformaciones y circuitos autocorrectivos.',visual:['Gregory Bateson mind ecology','Bateson pattern that connects','mind system feedback Bateson']}
];
const NB_COUNT=4;
const BUNDLES=['bundle-v13-1.txt','bundle-v13-2.txt','bundle-v13-3a1.txt','bundle-v13-3a2.txt','bundle-v13-3b1.txt','bundle-v13-3b2.txt','bundle-v13-4.txt','bundle-v13-5.txt','bundle-v13-6.txt'];
const RAW='https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/pages/modelos-iii/';
let S={};try{S=JSON.parse(localStorage.getItem('m3cleanV7')||'{}')}catch{}
if(!S.states){
  let old={};try{old=JSON.parse(localStorage.getItem('m3cleanV6')||'{}')}catch{}
  S.states=TOPICS.map((_,i)=>{const a=old.states?.[i]||[];return [a[0]||'',a[1]||'',a[2]||'','']});
}
if(!S.boards){let old={};try{old=JSON.parse(localStorage.getItem('m3cleanV6')||'{}')}catch{};S.boards=old.boards||{}}
let unit=0,nb=0,view='home',sourceReady=false,sourceResizeObserver=null,pendingSourceSync=false;
const frame=$('#sourceFrame');
function save(){localStorage.setItem('m3cleanV7',JSON.stringify(S))}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stateClass(v){return v==='good'?'good':v==='review'?'review':''}
function renderHome(){view='home';$('#home').style.display='block';$('#topic').classList.remove('active');$('#topic').setAttribute('aria-hidden','true');$('#bottom').classList.remove('show');$('#home').innerHTML=`<div class="homeIntro">7 unidades</div>${TOPICS.map((x,i)=>`<button class="topicCard" data-u="${i}"><span class="num">${String(i+1).padStart(2,'0')}</span><h2>${esc(x.t)}</h2><p>${esc(x.s)}</p><span class="topicStatus">${S.states[i].map(v=>`<i class="${stateClass(v)}"></i>`).join('')}</span></button>`).join('')}`;$$('.topicCard').forEach(b=>b.onclick=()=>openUnit(+b.dataset.u,nb));scrollTo(0,0)}
function openUnit(i,n=nb){unit=(i+TOPICS.length)%TOPICS.length;nb=Math.max(0,Math.min(NB_COUNT-1,n));view='topic';$('#home').style.display='none';$('#topic').classList.add('active');$('#topic').setAttribute('aria-hidden','false');$('#bottom').classList.add('show');renderTopicShell();syncSource();scrollTo(0,0)}
function renderTopicShell(){const x=TOPICS[unit];$('#topicKicker').textContent=`U${unit+1} / ${TOPICS.length} · NB${nb+1} / ${NB_COUNT}`;$('#topicTitle').textContent=x.t;$('#unitNav').innerHTML=TOPICS.map((_,i)=>`<button data-u="${i}" class="${i===unit?'active':''} ${S.states[i][nb]==='good'?'done':''}">${i+1}</button>`).join('');$$('#unitNav button').forEach(b=>b.onclick=()=>openUnit(+b.dataset.u,nb));$('#nbNav').innerHTML=Array.from({length:NB_COUNT},(_,i)=>`<button data-nb="${i}" class="${i===nb?'active':''} ${stateClass(S.states[unit][i])}">NB${i+1}</button>`).join('');$$('#nbNav button').forEach(b=>b.onclick=()=>{nb=+b.dataset.nb;renderTopicShell();syncSource();syncBottom();scrollTo({top:0,behavior:'smooth'})});syncBottom()}
function syncBottom(){const st=S.states[unit][nb];$('#reviewBtn').classList.toggle('on',st==='review');$('#goodBtn').classList.toggle('on',st==='good');$('#reviewBtn').setAttribute('aria-pressed',st==='review');$('#goodBtn').setAttribute('aria-pressed',st==='good')}
function toggleState(v){S.states[unit][nb]=S.states[unit][nb]===v?'':v;save();syncBottom();renderTopicShell()}
$('#reviewBtn').onclick=()=>toggleState('review');$('#goodBtn').onclick=()=>toggleState('good');
function toast(t){const el=$('#roundToast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),760)}
function nextUnit(){if(unit<TOPICS.length-1){openUnit(unit+1,nb);return}if(nb<NB_COUNT-1){nb++;toast(`NB${nb+1}`);setTimeout(()=>openUnit(0,nb),80);return}renderHome();toast('Recorrido completo')}
function prevUnit(){if(unit>0){openUnit(unit-1,nb);return}if(nb>0){nb--;openUnit(TOPICS.length-1,nb)}}
$('#nextBtn').onclick=nextUnit;$('#backHome').onclick=renderHome;$('#homeBtn').onclick=renderHome;
$('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');S.dark=document.body.classList.contains('dark');save();syncSourceTheme()};if(S.dark)document.body.classList.add('dark');
let sx=0,sy=0,swiping=false;$('#topic').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.target.closest('button,input,textarea,canvas,iframe'))return;sx=e.clientX;sy=e.clientY;swiping=true},{passive:true});$('#topic').addEventListener('pointerup',e=>{if(!swiping)return;swiping=false;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)>58&&Math.abs(dx)>Math.abs(dy)*1.25)(dx<0?nextUnit:prevUnit)()},{passive:true});window.addEventListener('keydown',e=>{if(view!=='topic'||$('#board').classList.contains('open'))return;if(e.key==='ArrowRight')nextUnit();if(e.key==='ArrowLeft')prevUnit()});

/* ---- Full V13 content source ---- */
const SOURCE_CSS=`
html,body{margin:0!important;padding:0!important;min-height:0!important;background:transparent!important;overflow:hidden!important}
header,.header,.topbar,.top,.globalnav,.stagebar,.memorystrip,.memoryrail,.drawer,.boardsection,.readctl,[class*="audio" i],[id*="audio" i],#view-map,#view-recall,#view-cases,#view-exam,#view-last,.levelnav,.level-assess,.footerNav,.topichead,.topicnum{display:none!important}
.main{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important}.view,#view-topic{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important}.study-grid,.study-grid.first{display:block!important;grid-template-columns:none!important;width:100%!important;max-width:none!important}.study-grid>div:first-child{display:none!important}.topic-main{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}.quickcopy,.section,.deep-question,.keyline,.examanswer{width:100%!important;max-width:none!important;box-sizing:border-box!important}.quickcopy{font-size:20px!important;line-height:1.56!important;margin-top:0!important}.section p,.examanswer{font-size:17px!important;line-height:1.56!important}.keyline{font-size:13px!important}.levelcontent{margin:0!important;padding:0!important}button{max-width:100%}body.dark{background:transparent!important}@media(max-width:700px){.quickcopy{font-size:19px!important}.section p,.examanswer{font-size:16px!important}}
`;
async function loadSource(){try{const parts=await Promise.all(BUNDLES.map(f=>fetch(RAW+f+'?v=7',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error(f);return (await r.text()).trim()})));const bin=atob(parts.join('')),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);if(!('DecompressionStream'in window))throw Error('navegador sin gzip');let html=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();html=html.replace('<head>','<head><base href="https://modelos-iii-sistemica.vercel.app/">').replace('</head>',`<style id="v7SourceCss">${SOURCE_CSS}</style></head>`);frame.onload=()=>waitSourceBoot();frame.srcdoc=html}catch(e){$('#sourceLoading').textContent='No pude cargar el contenido completo · '+(e?.message||e);$('#sourceState').textContent='error de contenido'}}
function waitSourceBoot(){let tries=0;const tick=()=>{tries++;const d=frame.contentDocument;if(d&&d.querySelectorAll('.chainitem').length>=TOPICS.length&&d.querySelector('.levelnav')){sourceReady=true;$('#sourceState').textContent='contenido V13';syncSourceTheme();installSourceResize();if(pendingSourceSync||view==='topic')syncSource();return}if(tries<120)setTimeout(tick,50);else{$('#sourceLoading').textContent='El contenido completo tardó demasiado en iniciar';$('#sourceState').textContent='V13 pendiente'}};tick()}
function sourceDoc(){return sourceReady?frame.contentDocument:null}
function installSourceResize(){const d=sourceDoc();if(!d)return;const resize=()=>{requestAnimationFrame(()=>{const h=Math.max(140,d.documentElement.scrollHeight,d.body?.scrollHeight||0);frame.style.height=h+'px'})};sourceResizeObserver?.disconnect?.();sourceResizeObserver=new frame.contentWindow.ResizeObserver(resize);sourceResizeObserver.observe(d.body);resize();setTimeout(resize,100);setTimeout(resize,450)}
function syncSourceTheme(){const d=sourceDoc();if(!d)return;d.body?.classList.toggle('dark',document.body.classList.contains('dark'))}
function clickLike(el){if(!el)return false;try{el.click();return true}catch{}try{el.dispatchEvent(new frame.contentWindow.MouseEvent('click',{bubbles:true,cancelable:true}));return true}catch{}return false}
async function syncSource(){if(view!=='topic')return;if(!sourceReady){pendingSourceSync=true;$('#sourceLoading').style.display='block';frame.classList.remove('ready');return}pendingSourceSync=false;const d=sourceDoc();$('#sourceLoading').style.display='block';frame.classList.remove('ready');const items=[...d.querySelectorAll('#view-map .chainitem,.chainitem')];let item=items[unit];if(item){const main=item.querySelector('.chainmain')||item.querySelector('.chaintitle')||item;clickLike(main)}await delay(55);let levels=[...d.querySelectorAll('#view-topic .levelnav [data-level-node]')];if(!levels.length)levels=[...d.querySelectorAll('.levelnav [data-level-node]')];if(levels[nb])clickLike(levels[nb]);await delay(70);syncSourceTheme();$('#sourceLoading').style.display='none';frame.classList.add('ready');installSourceResize()}
function delay(ms){return new Promise(r=>setTimeout(r,ms))}
function currentSourceText(){const d=sourceDoc();if(!d)return TOPICS[unit].s;const root=d.querySelector('#view-topic .topic-main')||d.querySelector('#view-topic')||d.body;let t=(root?.innerText||TOPICS[unit].s).replace(/\n{3,}/g,'\n\n').trim();return t.slice(0,7000)}
loadSource();


window.__M3V7_WHITEBOARD_BOOT__={TOPICS,esc,currentSourceText,getUnit:()=>unit,S,save,$,$$};
})();
