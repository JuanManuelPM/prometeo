(()=>{
'use strict';

const cfg=window.PROMETEO_GUIDE_SURFACE;
if(!cfg?.guide||!cfg?.base||!cfg?.key)return;
const GUIDE=cfg.guide,BASE=cfg.base,KEY=cfg.key;
const H={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rpc=async(name,args={})=>{
  const r=await fetch(BASE+name,{method:'POST',headers:H,body:JSON.stringify(args),cache:'no-store'});
  const body=await r.json().catch(()=>null);
  if(!r.ok)throw new Error((body&&body.message)||('HTTP '+r.status));
  return body;
};
const newId=()=>globalThis.crypto?.randomUUID?.()||('evt-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const isRefType=t=>t==='FILE'||t==='AUDIO';

const style=document.createElement('style');
style.textContent=`
.sharedInput{padding:15px 0;border-bottom:1px solid var(--line)}
.sharedInputHead{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:10px}
.sharedInputTitle{font-size:16px;font-weight:900}
.sharedInputMeta{font:750 8px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.48;text-align:right}
.sharedForm{display:grid;grid-template-columns:150px 1fr;gap:8px}
.sharedForm textarea,.sharedForm input,.sharedForm select{width:100%;border:1px solid #373737;background:#050505;color:#fff;padding:9px;font:750 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;border-radius:0}
.sharedForm textarea{min-height:84px;resize:vertical;grid-column:1/-1}
.sharedForm .wide{grid-column:1/-1}
.sharedForm button{justify-content:center}
.sharedNote,.sharedReceipt{font:750 9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.58;margin-top:8px}
.sharedReceipt{opacity:1;overflow-wrap:anywhere}
.sharedReceipt details{margin-top:8px;border-top:1px solid #222;padding-top:7px}
.sharedReceipt summary{cursor:pointer;font-weight:900}
.sharedReceipt pre{white-space:pre-wrap;word-break:break-word;margin:7px 0 0;padding:8px;border:1px solid #222;background:#030303;font:700 8px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
.sharedReceipt button{margin-top:7px;padding:7px 9px;border:1px solid #333;background:#080808;color:#fff;font:850 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.domainBranches{display:grid;grid-template-columns:repeat(2,1fr);border-left:1px solid var(--line);border-top:1px solid var(--line);margin-top:10px}
.domainBranch{padding:9px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);min-width:0}
.domainBranch b{display:block;font-size:11px}.domainBranch span{font:750 8px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.5}
@media(max-width:720px){.sharedForm,.domainBranches{grid-template-columns:1fr}.sharedForm textarea,.sharedForm .wide{grid-column:1}.sharedInputHead{display:block}.sharedInputMeta{text-align:left;margin-top:5px}}
`;
document.head.appendChild(style);

const section=document.createElement('section');
section.className='sharedInput';
section.setAttribute('aria-label','Entrada compartida del Guide');
section.innerHTML=`
<div class="sharedInputHead">
  <div><div class="k">INTAKE COMPARTIDO · CANDIDATO</div><div class="sharedInputTitle">Registrar entrada en este dominio</div></div>
  <div class="sharedInputMeta" id="sharedDomainState">estado durable · cargando…</div>
</div>
<form class="sharedForm" id="sharedGuideInput">
  <select id="sharedInputType" aria-label="Tipo de entrada">
    <option value="CORRECTION">CORRECTION</option><option value="TEXT">TEXT</option>
    <option value="FILE">FILE REF</option><option value="AUDIO">AUDIO REF</option>
  </select>
  <input id="sharedObjective" type="text" maxlength="240" placeholder="objective_ref opcional">
  <textarea id="sharedLiteral" maxlength="200000" placeholder="Corrección, objetivo, problema o pregunta"></textarea>
  <input class="wide" id="sharedContentRef" type="text" maxlength="4096" placeholder="content_ref para FILE/AUDIO" hidden>
  <button class="wide" type="submit">REGISTRAR CANDIDATO</button>
</form>
<div class="sharedNote" id="sharedPrivacy">No se guarda borrador en localStorage. El envío crea un candidato durable con origen y provenance; no crea jobs ni demandas directamente.</div>
<div class="sharedReceipt" id="sharedReceipt" aria-live="polite"></div>
<div class="domainBranches" id="domainBranches"></div>`;
const anchor=document.querySelector('.actions');
if(anchor)anchor.after(section);else document.querySelector('main')?.append(section);

const typeEl=section.querySelector('#sharedInputType');
const literalEl=section.querySelector('#sharedLiteral');
const refEl=section.querySelector('#sharedContentRef');
const objectiveEl=section.querySelector('#sharedObjective');
const receiptEl=section.querySelector('#sharedReceipt');
const stateEl=section.querySelector('#sharedDomainState');
const branchesEl=section.querySelector('#domainBranches');
const privacyEl=section.querySelector('#sharedPrivacy');

if(GUIDE==='STUDENTS')privacyEl.textContent+=' Evitá datos personales innecesarios de terceros.';
if(GUIDE==='PERSONAL')privacyEl.textContent+=' La página no conserva una copia local del contenido enviado.';

function syncType(){
  const refMode=isRefType(typeEl.value);
  literalEl.hidden=refMode;refEl.hidden=!refMode;
  literalEl.required=!refMode;refEl.required=refMode;
}
typeEl.addEventListener('change',syncType);syncType();

function buildReceipt(out,payload){
  return {
    schema:'prometeo.domain_input_upload_receipt/v1',
    state:out?.state||'UNKNOWN',
    intake_id:out?.intake_id||null,
    candidate_ref:out?.candidate_ref||null,
    input_type:out?.input_type||payload.input_type||'UNKNOWN',
    guide_key:GUIDE,
    routing_state:out?.routing_state||'UNKNOWN',
    routed_guide_key:out?.routed_guide_key||null,
    objective_state:out?.objective_state||'UNKNOWN',
    dispatch_created:out?.dispatch_created===true,
    demand_created:out?.demand_created===true,
    job_created:out?.job_created===true,
    origin:payload.origin||null,
    provenance:Array.isArray(payload.provenance)?payload.provenance:[],
    content_ref:isRefType(payload.input_type)?(payload.content_ref||null):null,
    dedupe_key:payload.dedupe_key||null,
    client_rendered_at:new Date().toISOString()
  };
}

function renderReceipt(receipt){
  const json=JSON.stringify(receipt,null,2);
  const status=[receipt.state,receipt.candidate_ref||'sin candidate_ref','intake='+(receipt.intake_id||'—'),'type='+receipt.input_type,'routing='+receipt.routing_state,'dispatch='+(receipt.dispatch_created?'YES':'NO')].join(' · ');
  receiptEl.innerHTML='<div><b>'+esc(status)+'</b></div><details><summary>RECIBO JSON · v1</summary><pre>'+esc(json)+'</pre></details><button type="button" data-copy-receipt>COPIAR RECIBO</button>';
  const btn=receiptEl.querySelector('[data-copy-receipt]');
  btn?.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(json);btn.textContent='RECIBO COPIADO';}
    catch{btn.textContent='NO SE PUDO COPIAR';}
  });
}

async function loadDomainState(){
  try{
    const ctx=await rpc('prometeo_domain_guide_operating_view_v2',{p_guide_key:GUIDE});
    const rows=Array.isArray(ctx.domain_work)?ctx.domain_work:[];
    const overall=!rows.length?'UNKNOWN'
      :rows.some(x=>x.state==='ACTIVE')?'ACTIVE'
      :rows.some(x=>x.state==='READY')?'READY'
      :rows.some(x=>x.state==='BLOCKED')?'BLOCKED'
      :rows.every(x=>x.state==='DONE'&&x.completion_class==='SUCCESS')?'DONE':'UNKNOWN';
    stateEl.textContent='dominio '+overall+' · proyección de lectura';
    branchesEl.innerHTML=rows.length?rows.map(x=>`<div class="domainBranch"><b>${esc(x.task_key||'rama')}</b><span>${esc(x.state||'UNKNOWN')} · ${esc(x.completion_class||'—')} · gen ${esc(x.generation??'—')}</span></div>`).join(''):'<div class="domainBranch"><b>Sin filas durables</b><span>UNKNOWN · no se infiere DONE</span></div>';
  }catch(e){
    stateEl.textContent='dominio UNKNOWN · lectura falló';
    branchesEl.innerHTML='<div class="domainBranch"><b>UNKNOWN</b><span>No se fabrica estado local.</span></div>';
  }
}

section.querySelector('#sharedGuideInput').addEventListener('submit',async ev=>{
  ev.preventDefault();receiptEl.textContent='registrando…';
  const inputType=typeEl.value,eventId=newId(),now=new Date().toISOString();
  const objectiveRef=objectiveEl.value.trim();
  const payload={
    input_type:inputType,guide_key:GUIDE,
    origin:{source_ref:'guide-page:'+GUIDE+':'+location.pathname,surface:'GUIDE_DOMAIN_PAGE',guide_key:GUIDE,client_event_id:eventId},
    provenance:[{ref:location.href.split('#')[0]+'#input-'+eventId,kind:isRefType(inputType)?'USER_CONTENT_REF':'USER_LITERAL',captured_at:now}],
    content_meta:{surface_path:location.pathname,guide_key:GUIDE,client_event_id:eventId,captured_at:now,receipt_schema:'prometeo.domain_input_upload_receipt/v1'},
    dedupe_key:'guide-page:'+GUIDE+':'+eventId
  };
  if(objectiveRef)payload.objective_ref=objectiveRef;
  if(isRefType(inputType))payload.content_ref=refEl.value.trim();else payload.literal_text=literalEl.value.trim();
  try{
    const out=await rpc('prometeo_guide_intake_capture_v1',{p_input:payload});
    if(out?.state==='ERROR')throw new Error(out.reason||'INTAKE_ERROR');
    renderReceipt(buildReceipt(out,payload));
    if(isRefType(inputType))refEl.value='';else literalEl.value='';
    await loadDomainState();
  }catch(e){receiptEl.textContent='ERROR · '+(e?.message||String(e));}
});

loadDomainState();
setInterval(loadDomainState,30000);
})();