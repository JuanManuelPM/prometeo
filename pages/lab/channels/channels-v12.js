(()=>{
'use strict';
const LABELS={
  flux_schnell_zerogpu:'FLUX.1 Schnell',
  ltx_video_zerogpu:'LTX Video Fast',
  ltx25_zerogpu:'LTX-2.5 + audio',
  minimax_h3_zerogpu:'MiniMax H3 Turbo',
  wan22_zerogpu:'Wan2.2 Fast',
  qwen_image_zerogpu:'Qwen Image',
  flux_dev_zerogpu:'FLUX.1 dev',
  z_image_turbo_zerogpu:'Z-Image Turbo'
};
const MODE={image:'imagen',video:'video',image_to_video:'imagen→video',audio:'audio'};
let busy=false,lastKey='';
async function probes(){if(!window.Creator?.sb)return[];const {data,error}=await Creator.sb.from('creator_media_probe_log').select('provider,modality,status,detail,tested_at').order('tested_at',{ascending:false}).limit(80);if(error)throw error;const seen=new Set(),out=[];for(const x of data||[]){const k=x.provider+'|'+x.modality;if(seen.has(k))continue;seen.add(k);out.push(x)}return out}
function row(x){const label=LABELS[x.provider]||x.provider,mod=MODE[x.modality]||x.modality,state=x.status==='PASS'?'listo $0 ✓':x.status==='CAPACITY'?'sin cuota/capacidad · fallback':'no enrutable';return `<div class="v5-provider" style="cursor:default"><span><b>${label}</b><small>${mod}</small></span><span><small>último probe</small><b>${state}</b></span></div>`}
async function paint(){if(busy)return;const box=document.querySelector('#v10Live');if(!box)return;busy=true;try{const ps=await probes(),key=JSON.stringify(ps.map(x=>[x.provider,x.modality,x.status,x.tested_at]));if(key===lastKey)return;lastKey=key;const core=ps.filter(x=>['flux_schnell_zerogpu','ltx_video_zerogpu','ltx25_zerogpu','minimax_h3_zerogpu'].includes(x.provider));const pass=ps.filter(x=>x.status==='PASS').length,capacity=ps.filter(x=>x.status==='CAPACITY').length,failed=ps.filter(x=>x.status==='FAILED').length;box.innerHTML=`<div class="v5-source-head"><div><b>Motores $0 comprobados</b><span>${pass} rutas PASS · ${capacity} sin cuota/capacidad · ${failed} descartadas por ahora</span></div><small>Estado derivado de probes E2E reales; un fallo no se promociona como proveedor.</small></div>${core.map(row).join('')}<details class="v5-more"><summary>benchmark reciente · ${ps.length} rutas</summary>${ps.filter(x=>!core.includes(x)).map(row).join('')}</details><div class="v5-source-head" style="padding-top:18px"><div><b>Ampliar fuentes</b><span>cuentas y cuotas adicionales</span></div><small>Las que pueden facturar siguen bloqueadas por FREE_ONLY.</small></div>`}catch(e){console.warn('probe health',e)}finally{busy=false}}
const mo=new MutationObserver(()=>queueMicrotask(paint));mo.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('creator:probe-updated',paint);paint();
})();
