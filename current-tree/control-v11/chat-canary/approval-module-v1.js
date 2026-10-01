(function installPrometeoApprovalModuleV1(global) {
  'use strict';
  const SCHEMA='prometeo.primary-chat-approval-control/v1';
  const DEFAULT_PAGE=Object.freeze({page_id:'control-v11-chat-canary',title:'Prometeo · Chat canary',surface_id:'current-tree-control-v11-chat-canary',project_id:'prometeo-autonomous-growth',target_path:'current-tree/control-v11/chat-canary/'});
  function clean(v,max=4096){if(v===undefined||v===null)return null;const s=String(v).trim();return s?s.slice(0,max):null;}
  function validRef(ref){const v=clean(ref);return Boolean(v&&(/^coordination\//.test(v)||/^https:\/\/github\.com\/JuanManuelPM\/prometeo\//.test(v)||/^https:\/\/api\.github\.com\/repos\/JuanManuelPM\/prometeo\//.test(v)));}
  function ingress(explicit){const api=explicit||global.PROMETEO_INGRESS_V1;return api&&typeof api.submitApprovedPlan==='function'?api:null;}
  async function submitApproved({text,approval,page=DEFAULT_PAGE,ingress:explicit=null}={}){
    const raw=clean(text,65536);
    if(!raw)return Object.freeze({status:'BOUNDARY_INVALID_INPUT',queued:false,ref:null,error:'EMPTY_TEXT'});
    const api=ingress(explicit);
    if(!api)return Object.freeze({status:'BOUNDARY_APPROVAL_API_REQUIRED',queued:false,ref:null,error:'SUBMIT_APPROVED_PLAN_REQUIRED'});
    let out;try{out=await api.submitApprovedPlan(Object.freeze({text:raw,page,approval}));}catch(error){return Object.freeze({status:'BOUNDARY_TRANSPORT_FAILED',queued:false,ref:null,error:clean(error&&(error.code||error.name||error.message),240)||'TRANSPORT_ERROR'});}
    if(!out||typeof out!=='object')return Object.freeze({status:'BOUNDARY_TRANSPORT_INVALID',queued:false,ref:null,error:'TRANSPORT_RESULT_INVALID'});
    if(out.queued===true&&!validRef(out.ref))return Object.freeze({status:'BOUNDARY_TRANSPORT_INVALID',queued:false,ref:null,error:'DURABLE_REF_REQUIRED'});
    return Object.freeze({status:clean(out.status,120)||'BOUNDARY',queued:out.queued===true,ref:validRef(out.ref)?out.ref:null,error:clean(out.error,240)});
  }
  function mount(root,options={}){
    if(!root||!root.ownerDocument)throw new Error('APPROVAL_CONTROL_ROOT_REQUIRED');
    const doc=root.ownerDocument,button=doc.createElement('button'),status=doc.createElement('span');
    button.type='button';button.textContent=options.label||'APROBAR';button.setAttribute('data-prometeo-primary-chat-approve-v1','');
    status.setAttribute('data-prometeo-primary-chat-approve-status-v1','');
    root.append(button,status);
    const click=async()=>{button.disabled=true;status.textContent='MATERIALIZANDO…';const text=typeof options.getText==='function'?options.getText():options.text;const approval=typeof options.getApproval==='function'?options.getApproval():options.approval;const out=await submitApproved({text,approval,page:options.page||DEFAULT_PAGE,ingress:options.ingress||null});status.textContent=[out.status,out.error].filter(Boolean).join(' · ');button.disabled=false;if(typeof options.onResult==='function')options.onResult(out);return out;};
    button.addEventListener('click',()=>{void click();});
    return Object.freeze({schema:SCHEMA,button,status,submit:click});
  }
  global.PROMETEO_PRIMARY_CHAT_APPROVAL_V1=Object.freeze({schema:SCHEMA,submitApproved,mount,validRef,default_page:DEFAULT_PAGE});
})(typeof globalThis!=='undefined'?globalThis:window);
