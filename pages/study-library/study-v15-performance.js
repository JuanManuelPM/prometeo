(()=>{'use strict';
if(window.__STUDY_PERF_V15)return;window.__STUDY_PERF_V15=true;

const loaded15=new Map(),prefetched15=new Set();
let knowledgePromise15=null,classPromise15=null,blackboardPromise15=null,taskTimer15=null,taskToken15=0;
const sleep15=ms=>new Promise(r=>setTimeout(r,ms));

function taskHost15(){
 let el=document.querySelector('#studyTask15');
 if(el)return el;
 el=document.createElement('div');el.id='studyTask15';el.className='studyTask15';el.innerHTML='<i></i><span></span>';document.body.appendChild(el);return el;
}
function taskStart15(text='Cargando…'){
 const token=++taskToken15;clearTimeout(taskTimer15);const el=taskHost15();el.querySelector('span').textContent=text;el.classList.remove('show');
 taskTimer15=setTimeout(()=>{if(token===taskToken15)el.classList.add('show')},180);return token;
}
function taskDone15(token){
 if(token&&token!==taskToken15)return;clearTimeout(taskTimer15);taskToken15++;const el=document.querySelector('#studyTask15');if(el){el.classList.remove('show');setTimeout(()=>{if(!el.classList.contains('show'))el.querySelector('span').textContent=''},180)}
}
function afterPaint15(fn){requestAnimationFrame(()=>requestAnimationFrame(fn))}
function script15(src){
 if(loaded15.has(src))return loaded15.get(src);
 const existing=[...document.scripts].find(s=>s.dataset.prometeoSrc===src||s.getAttribute('src')===src);
 if(existing?.dataset.loaded==='1')return Promise.resolve();
 const p=new Promise((resolve,reject)=>{
   const s=existing||document.createElement('script');
   if(!existing){s.src=src;s.dataset.prometeoSrc=src;s.async=false;document.body.appendChild(s)}
   s.addEventListener('load',()=>{s.dataset.loaded='1';resolve()},{once:true});
   s.addEventListener('error',()=>reject(new Error('No pude cargar '+src)),{once:true});
 });
 loaded15.set(src,p);return p;
}
function prefetch15(src){
 if(prefetched15.has(src))return;prefetched15.add(src);const l=document.createElement('link');l.rel='prefetch';l.as='script';l.href=src;document.head.appendChild(l);
}
async function waitKnowledge15(max=5000){
 const started=Date.now();while(Date.now()-started<max){if(window.PrometeoStudyKnowledgeV12?.state?.loaded)return true;await sleep15(80)}return false;
}
async function ensureKnowledge15({quiet=false,wait=false}={}){
 if(window.__STUDY_LIBRARY_V12){if(wait)await waitKnowledge15();return window.PrometeoStudyKnowledgeV12}
 if(!knowledgePromise15)knowledgePromise15=(async()=>{await script15('./study-v12-knowledge.js?v=150');return window.PrometeoStudyKnowledgeV12})().catch(e=>{knowledgePromise15=null;throw e});
 const token=quiet?0:taskStart15('Sincronizando materia…');
 try{const x=await knowledgePromise15;if(wait)await waitKnowledge15();return x}finally{if(token)taskDone15(token)}
}
async function ensureBlackboard15({quiet=false}={}){
 if(window.__STUDY_V9_CONTENT&&window.__STUDY_BB_PAIRING_FIX)return;
 if(!blackboardPromise15)blackboardPromise15=(async()=>{
   if(!window.__STUDY_V9_CONTENT)await script15('./study-v9-content.js?v=150');
   if(!window.__STUDY_BB_PAIRING_FIX)await script15('./study-bb-pairing-fix-v1.js?v=15').catch(()=>{});
 })().catch(e=>{blackboardPromise15=null;throw e});
 const token=quiet?0:taskStart15('Preparando Blackboard…');
 try{return await blackboardPromise15}finally{if(token)taskDone15(token)}
}
async function ensureClass15({quiet=false,rerender=false}={}){
 if(window.__STUDY_TRANSCRIPTION_V141){if(rerender&&typeof view!=='undefined'&&view==='session'&&typeof renderSession==='function')renderSession();return}
 if(!classPromise15)classPromise15=(async()=>{
   await script15('./study-v13-class-ready.js?v=150');
   await script15('./study-v14-transcription.js?v=150');
   await script15('./study-v14-quality-fix.js?v=150');
 })().catch(e=>{classPromise15=null;throw e});
 const token=quiet?0:taskStart15('Preparando clase…');
 try{await classPromise15;if(rerender&&typeof view!=='undefined'&&view==='session'&&typeof renderSession==='function')renderSession()}finally{if(token)taskDone15(token)}
}

const baseOpenCourse15=typeof openCourse==='function'?openCourse:null;
if(baseOpenCourse15){
 openCourse=function(...args){
   const token=taskStart15('Abriendo materia…');
   const out=baseOpenCourse15.apply(this,args);
   ensureKnowledge15({quiet:true}).then(()=>{if(typeof view!=='undefined'&&view==='course'&&typeof renderCourse==='function')renderCourse()}).catch(console.warn);
   setTimeout(()=>ensureBlackboard15({quiet:true}).catch(()=>{}),700);
   afterPaint15(()=>taskDone15(token));return out;
 };
}
const baseOpenSession15=typeof openSession==='function'?openSession:null;
if(baseOpenSession15){
 openSession=async function(...args){
   const token=taskStart15('Preparando clase…');
   try{await ensureClass15({quiet:true});return await baseOpenSession15.apply(this,args)}finally{afterPaint15(()=>taskDone15(token))}
 };
}

function watchAssessment15(){
 document.addEventListener('click',e=>{
   const a=e.target.closest?.('[data-assessment10]');
   if(a){const token=taskStart15('Preparando parcial…');let tries=0;const look=()=>{const f=document.querySelector('#assessmentFrame10');if(f){const done=()=>taskDone15(token);f.addEventListener('load',done,{once:true});setTimeout(done,3500);return}if(++tries<40)setTimeout(look,50);else taskDone15(token)};setTimeout(look,0)}
   const b=e.target.closest?.('[data-workspace="board"],[data-openboard8],#boardNew10');
   if(b){const token=taskStart15('Abriendo pizarrón…');setTimeout(()=>taskDone15(token),700)}
 },true);
}
function schedule15(){
 ['./study-v12-knowledge.js?v=150','./study-v13-class-ready.js?v=150','./study-v14-transcription.js?v=150','./study-v14-quality-fix.js?v=150','./study-v9-content.js?v=150'].forEach(prefetch15);
 const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,700));
 idle(()=>ensureKnowledge15({quiet:true}).catch(()=>{}),{timeout:1600});
 if(localStorage.getItem('study_bb_workspace_token'))setTimeout(()=>{if(typeof view!=='undefined'&&view==='course')ensureBlackboard15({quiet:true}).catch(()=>{})},2200);
}

watchAssessment15();schedule15();
const q15=new URLSearchParams(location.search);
if(q15.get('session'))ensureClass15({quiet:true,rerender:true}).catch(console.warn);
else if(q15.get('course'))ensureKnowledge15({quiet:true}).then(()=>{if(typeof view!=='undefined'&&view==='course'&&typeof renderCourse==='function')renderCourse()}).catch(console.warn);

window.PrometeoPerformanceV15={ensureKnowledge:ensureKnowledge15,ensureClass:ensureClass15,ensureBlackboard:ensureBlackboard15,taskStart:taskStart15,taskDone:taskDone15,prefetch:prefetch15};
})();
