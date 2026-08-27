const lockIcon=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.25 10V7.4a3.75 3.75 0 0 1 7.5 0V10"/><rect x="6.25" y="10" width="11.5" height="8.75" rx="2.25"/><path d="M12 13.5v2"/></svg>`;
const chev=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l7 7-7 7"/></svg>`;
const yt=`<span class="yt-brand"><svg viewBox="0 0 24 24"><rect x="2.8" y="5.5" width="18.4" height="13" rx="4" fill="#ff0033"/><path d="M10 9.1 15.2 12 10 14.9Z" fill="#fff"/></svg></span>`;
const ext=`<span class="external-link-icon"><svg viewBox="0 0 24 24"><path d="M13 5h6v6M19 5l-8.5 8.5"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/></svg></span>`;

const subjects=[
 {id:'math',name:'MATEMÁTICA',enabled:true,tone:'#d8d2c5',deep:'#b9b09f',meta:'Logaritmos y exponenciales · 18 ejercicios'},
 {id:'physics',name:'FÍSICA',enabled:false,tone:'#cbdce2',deep:'#9fb8c1'},
 {id:'chem',name:'QUÍMICA',enabled:false,tone:'#d5d7c8',deep:'#b6b9a7'},
 {id:'bio',name:'BIOLOGÍA',enabled:false,tone:'#ded6c8',deep:'#c0b5a4'},
 {id:'lang',name:'LENGUA',enabled:false,tone:'#d7d4df',deep:'#b8b4c2'}
];

function subjectCard(s,i){
 return `<article class="subject-card ${i===0?'active':''} ${s.enabled?'':'locked'}" data-subject="${s.id}" style="--tone:${s.tone};--progress-tone:${s.deep}">
  <div class="subject-inner"><div class="s-top"><div class="s-num">${String(i+1).padStart(2,'0')}</div><div class="s-closed"><span class="s-closed-text">${s.name}</span></div></div>
  <div class="s-open"><h2 class="s-name">${s.name}</h2><div class="s-open-info"><div class="s-open-meta">${s.enabled?s.meta:'Bloqueada por ahora'}</div><div class="locked-gate">Por ahora seguimos con Matemática.</div></div></div></div>
  <div class="subject-state ${s.enabled?'new':'locked'}">${s.enabled?'NEW':lockIcon}</div>
  <div class="enter-wrap"><button class="enter" data-enter="${s.id}">ENTRAR</button></div>
 </article>`;
}
document.getElementById('subjects').innerHTML=subjects.map(subjectCard).join('');
document.querySelectorAll('.subject-card').forEach(card=>card.addEventListener('click',e=>{
 if(e.target.closest('[data-enter]'))return;
 document.querySelectorAll('.subject-card').forEach(c=>c.classList.remove('active','show-locked-gate'));
 card.classList.add('active');
}));
document.querySelectorAll('[data-enter]').forEach(btn=>btn.addEventListener('click',e=>{
 e.stopPropagation(); const s=subjects.find(x=>x.id===btn.dataset.enter);
 if(!s.enabled){btn.closest('.subject-card').classList.add('show-locked-gate');return;}
 go('math');
}));

const mathTopics=[
 ['Logaritmos y exponenciales',true],['Funciones',false],['Trigonometría',false],['Geometría analítica',false],['Probabilidad y estadística',false]
];
document.getElementById('mathTopics').innerHTML=mathTopics.map((t,i)=>`<div class="topic-row ${t[1]?'':'locked'}" data-topic="${i}">
 <div class="topic-n">${String(i+1).padStart(2,'0')}</div><div class="topic-title">${t[0]}</div><div class="topic-lock">${t[1]?'':lockIcon}</div></div>`).join('');
document.querySelectorAll('[data-topic]').forEach(row=>row.addEventListener('click',()=>{
 if(row.dataset.topic==='0')go('logs');else document.getElementById('mathNote').textContent='Este tema está bloqueado por ahora.';
}));

function videoLink(query){
 return `<a class="youtube-resource" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}">${yt}<span>Buscar videos</span>${ext}</a>`;
}
function practiceHTML(ex){
 return `<div class="practice-row" data-practice="${ex.id}">
   <div class="practice-head"><span class="chev">${chev}</span><span class="practice-code">${ex.id}</span><span class="practice-q">${ex.q}</span></div>
   <div class="practice-panel"><div class="practice-inner"><div class="practice-content">
     <div class="practice-math">${ex.q}</div>
     <div class="answer-line"><input class="answer" autocomplete="off" aria-label="respuesta"><button class="mini" data-check>Corregir</button><button class="mini" data-hint>Pista</button></div>
     <div class="feedback"></div><div class="hint">${ex.hint||''}</div>
   </div></div></div>
 </div>`;
}
function theoryHTML(th,i){
 const cheat=(th.cheat||[]).map(x=>`<div>${x}</div>`).join('');
 const example=(th.example||[]).map(x=>`<div>${x}</div>`).join('');
 return `<section class="theory-unit ${i===0?'open':''}" data-theory="${th.id}">
   <button class="theory-unit-head"><span class="r-num">${String(i+1).padStart(2,'0')}</span><span class="chev">${chev}</span><span class="r-title">${th.title}</span></button>
   <div class="theory-panel"><div class="theory-panel-inner"><div class="theory-content">
      <p class="theory-copy">${th.idea}</p>
      <div class="study-cue"><div class="cue"><b>Machete</b><div class="formula">${cheat}</div></div><div class="cue"><b>Ejemplo</b><div class="formula">${example}</div></div></div>
      <div class="cue" style="max-width:780px;margin-bottom:14px"><b>Error típico</b>${th.error}</div>
      ${videoLink(th.video)}
      <div class="practice"><div class="practice-title">Ejercicios</div>${th.exercises.map(practiceHTML).join('')}</div>
   </div></div></div>
 </section>`;
}
document.getElementById('theories').innerHTML=THEORIES.map(theoryHTML).join('');
document.querySelectorAll('.theory-unit-head').forEach(h=>h.addEventListener('click',()=>h.closest('.theory-unit').classList.toggle('open')));
document.querySelectorAll('.practice-head').forEach(h=>h.addEventListener('click',()=>h.closest('.practice-row').classList.toggle('open')));

function norm(v){return String(v||'').trim().toLowerCase().replace(/−/g,'-').replace(/\s+/g,' ')}
function allPractice(){return THEORIES.flatMap(t=>t.exercises)}
let state={};
try{state=JSON.parse(localStorage.getItem('mumi-study-progress-v1')||'{}')}catch(e){}
function updatePct(){
 const ex=allPractice(); const n=ex.filter(x=>state[x.id]).length; const p=Math.round(n/ex.length*100); document.getElementById('logsPct').textContent=p+'%';
}
document.querySelectorAll('[data-practice]').forEach(row=>{
 const id=row.dataset.practice; const ex=allPractice().find(x=>x.id===id);
 const input=row.querySelector('.answer'), fb=row.querySelector('.feedback');
 row.querySelector('[data-hint]').addEventListener('click',()=>row.querySelector('.hint').classList.toggle('show'));
 row.querySelector('[data-check]').addEventListener('click',()=>{
   const ok=(ex.answers||[]).some(a=>norm(a)===norm(input.value));
   if(ok){state[id]=1;localStorage.setItem('mumi-study-progress-v1',JSON.stringify(state));fb.className='feedback ok';fb.textContent='✓ Correcta';updatePct();}
   else{fb.className='feedback bad';fb.textContent='Revisá el procedimiento.';}
 });
 input.addEventListener('keydown',e=>{if(e.key==='Enter')row.querySelector('[data-check]').click();});
});
updatePct();

function examHTML(ex){
 return `<section class="exam-item" data-exam="${ex.id}">
   <button class="exam-row"><span class="exam-id">${ex.id}</span><span class="exam-group">${ex.group}</span><span class="exam-points">${ex.points}</span><span>${chev}</span></button>
   <div class="exam-panel"><div class="exam-inner"><div class="exam-content">
     <div class="exam-math">\\[${ex.prompt}\\]</div>
     <div class="exam-result"><b>Resultado</b><div class="result-math">\\(${ex.result}\\)</div></div>
     <div class="solution"><button class="solution-toggle"><span>${chev}</span><span>Ver resolución paso a paso</span></button>
       <div class="solution-panel"><div class="solution-inner">${ex.steps.map((s,i)=>`<div class="step"><div class="step-n">${String(i+1).padStart(2,'0')}</div><div class="step-copy">${s[0]}</div><div class="step-math">\\[${s[1]}\\]</div></div>`).join('')}</div></div>
     </div>
   </div></div></div>
 </section>`;
}
document.getElementById('examList').innerHTML=EXAM.map(examHTML).join('');
document.querySelectorAll('.exam-row').forEach(r=>r.addEventListener('click',()=>r.closest('.exam-item').classList.toggle('open')));
document.querySelectorAll('.solution-toggle').forEach(r=>r.addEventListener('click',()=>r.closest('.solution').classList.toggle('open')));

function go(id){
 document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo(0,0);
}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));

window.addEventListener('load',()=>window.MathJax?.typesetPromise?.());