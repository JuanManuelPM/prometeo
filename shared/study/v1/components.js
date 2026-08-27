/* Prometeo Study Commons v1 — reusable component primitives. */
(function(global){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const icons={
    lock:`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.25 10V7.4a3.75 3.75 0 0 1 7.5 0V10"/><rect x="6.25" y="10" width="11.5" height="8.75" rx="2.25"/><path d="M12 13.5v2"/></svg>`,
    check:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4 10-10"/></svg>`,
    chev:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l7 7-7 7"/></svg>`,
    youtube:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.8" y="5.5" width="18.4" height="13" rx="4" fill="#ff0033" stroke="none"/><path d="M10 9.1 15.2 12 10 14.9Z" fill="#fff" stroke="none"/></svg>`,
    external:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5h6v6M19 5l-8.5 8.5"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/></svg>`
  };
  function subjectState(info){
    if(!info||info.kind==='locked')return `<div class="subject-state locked ps-subject-state locked" aria-hidden="true"><span class="ps-lock">${icons.lock}</span></div>`;
    const kind=info.kind==='done'?'done':info.kind==='new'?'new':'progress';
    return `<div class="subject-state ${kind} ps-subject-state ${kind}" aria-hidden="true">${esc(info.label??'')}</div>`;
  }
  function formula(f){
    if(!f)return'';
    if(f.type==='stack')return `<div class="math-sheet math-stack ps-math ps-math-stack">${(f.lines||[]).map(x=>`<div>${x}</div>`).join('')}</div>`;
    if(f.type==='system')return `<div class="math-sheet ps-math"><div class="math-system ps-system"><div class="brace ps-brace">{</div><div class="system-lines ps-system-lines">${(f.lines||[]).map(x=>`<div>${x}</div>`).join('')}</div></div></div>`;
    if(f.type==='fraction')return `<div class="math-sheet ps-math">${f.prefix||''}<span class="frac ps-frac"><span>${f.num}</span><span>${f.den}</span></span></div>`;
    if(f.type==='sqrt')return `<div class="math-sheet ps-math">${f.prefix||''}<span class="sqrt ps-sqrt"><span class="sqrt-sign ps-sqrt-sign">√</span><span class="sqrt-body ps-sqrt-body">${f.inside}</span></span></div>`;
    if(f.type==='quadratic'||f.type==='vector'||f.type==='html')return `<div class="math-sheet ps-math ${f.type==='vector'?'vector-display':''}">${f.html||''}</div>`;
    return '';
  }
  function inputHTML(ex,idx,val){
    const size=ex?.fields?.[idx]?.size||'short';
    const cls=size==='long'?' long':size==='sign'?' sign':'';
    return `<input class="inline-input ps-inline-input${cls}" inputmode="decimal" autocomplete="off" aria-label="${esc(ex?.fields?.[idx]?.label||`respuesta ${idx+1}`)}" data-field="${idx}" value="${esc(val??'')}">`;
  }
  function renderMath(ex,a){
    const m=ex?.math||{},vals=a?.response||[];
    const replace=t=>String(t??'').replace(/\{\{(\d+)\}\}/g,(_,n)=>inputHTML(ex,Number(n),vals[Number(n)]));
    if(m.type==='template')return `<div class="math-sheet math-template ps-math">${replace(m.html)}</div>`;
    if(m.type==='system')return `<div class="math-sheet ps-math"><div class="math-system ps-system"><div class="brace ps-brace">{</div><div class="system-lines ps-system-lines">${(m.lines||[]).map(x=>`<div>${x}</div>`).join('')}</div></div>${m.answer_html?`<div class="answer-under">${replace(m.answer_html)}</div>`:''}</div>`;
    if(m.type==='stack')return `<div class="math-sheet math-stack ps-math ps-math-stack">${(m.lines||[]).map(x=>`<div>${replace(x)}</div>`).join('')}</div>`;
    if(m.type==='vector')return `<div class="math-sheet vector-display ps-math">${replace(m.html)}</div>`;
    return formula(m);
  }
  function resourceLink({href,label='Buscar videos'}={}){
    return `<a class="youtube-resource ps-resource" href="${esc(href||'#')}" target="_blank" rel="noopener"><span class="yt-icon ps-youtube">${icons.youtube}</span><span>${esc(label)}</span><span class="external-icon ps-external">${icons.external}</span></a>`;
  }
  function hintSteps(hint,{renderFormula}={}){
    const rf=renderFormula||((x)=>esc(x));
    return (hint?.steps||[]).map((step,index)=>`<div class="solution-step ps-hint-step"><span class="step-number ps-hint-step-index">${index+1}</span><div><div class="step-expression ps-hint-expression">${step.expression?rf(step.expression,false):esc(step.text||'')}</div>${step.note?`<div class="step-note ps-hint-note">${esc(step.note)}</div>`:''}</div></div>`).join('');
  }
  function bindActivation(el,{activate,enter,dragThreshold=10}={}){
    if(!el)return()=>{};
    let start=null,moved=false;
    const down=e=>{if(e.target.closest('button,a,input,textarea,select'))return;start={id:e.pointerId,x:e.clientX,y:e.clientY};moved=false};
    const move=e=>{if(start&&start.id===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>dragThreshold)moved=true};
    const up=e=>{if(!start||start.id!==e.pointerId)return;const ok=!moved;start=null;moved=false;if(ok)activate?.(e)};
    const cancel=()=>{start=null;moved=false};
    const key=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();(enter||activate)?.(e)}};
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',cancel);el.addEventListener('keydown',key);
    return()=>{el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',cancel);el.removeEventListener('keydown',key)};
  }
  global.PrometeoStudy=Object.freeze({version:'1.0.0',esc,icons,subjectState,formula,inputHTML,renderMath,resourceLink,hintSteps,bindActivation});
})(window);
