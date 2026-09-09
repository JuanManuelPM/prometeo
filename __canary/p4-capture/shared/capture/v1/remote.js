import {revisionRef,markSync} from './capture-core.js';

const DEFAULT_ENDPOINT='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-capture-v2-candidate';
const SECRET_KEY='prometeo.capture.workspace.secret.v2';
const LEGACY_SECRET_KEY='prometeo.capture.workspace.secret.v1';
const fail=(code,message,detail={})=>{const e=new Error(message);e.code=code;e.detail=detail;throw e};

export class CaptureRemote{
  constructor({endpoint=DEFAULT_ENDPOINT,onState=()=>{}}={}){this.endpoint=endpoint.replace(/\/+$/,'');this.onState=onState;this.ready=null}
  secret(){return localStorage.getItem(SECRET_KEY)||localStorage.getItem(LEGACY_SECRET_KEY)||''}
  hasSecret(){return this.secret().length>=32}
  linkCode(){const s=this.secret();return s?`PWS2.${s}`:''}
  async importLinkCode(code){const raw=String(code||'').trim();const secret=raw.startsWith('PWS2.')?raw.slice(5):raw.startsWith('PWS1.')?raw.slice(5):raw;if(secret.length<32)fail('PROMETEO_REMOTE_LINK','Invalid workspace link code');localStorage.setItem(SECRET_KEY,secret);this.ready=null;return this.connect()}
  async connect(){
    if(!navigator.onLine)return null;
    if(!this.hasSecret())fail('PROMETEO_REMOTE_NEEDS_LINK','Este dispositivo todavía no está vinculado a la Inbox privada de Prometeo');
    if(!this.ready)this.ready=this.call('workspace').then(x=>{this.onState({online:true,linked:true,workspace_id:x.workspace_id});return x}).catch(e=>{this.ready=null;this.onState({online:true,linked:false,error:e});throw e});
    return this.ready;
  }
  async call(action,payload={}){
    const secret=this.secret();if(secret.length<32)fail('PROMETEO_REMOTE_AUTH','Workspace secret unavailable');
    const r=await fetch(this.endpoint,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${secret}`},body:JSON.stringify({action,...payload})});
    const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(data?.error||data?.message||`HTTP ${r.status}`);e.code=data?.error||'PROMETEO_REMOTE_HTTP';e.status=r.status;e.data=data;throw e}return data;
  }
  async syncCapture(capture){
    if(!navigator.onLine)return {capture:markSync(capture,'PENDING'),deferred:true};
    await this.connect();const active=capture.transcript_revision?revisionRef(capture):null;
    try{
      const data=await this.call('sync_capture',{capture:{
        id:capture.id,created_at:capture.created_at,updated_at:capture.updated_at,privacy:capture.privacy,
        page_id:capture.immutable_creation.context.page_id,context_snapshot:capture.immutable_creation.context,
        processing_state:capture.processing_state,transcript_state:capture.transcript_state,
        transcript_revision:capture.transcript_revision,transcript:active?.text||'',transcript_digest:active?.digest||null,
        revisions:(capture.revisions||[]).map(r=>({revision:r.revision,text:r.text,state:r.state,digest:r.digest||null,created_at:r.created_at})),
        audio_digest:capture.audio?.digest||null,archive_state:capture.archive_state,metadata:capture.metadata||{}
      }});
      return {capture:markSync(capture,'SYNCED',{remote_revision:data.transcript_revision||capture.transcript_revision}),data};
    }catch(error){
      if(error.status===409)return {capture:markSync(capture,'CONFLICT',{detail:error.data}),error};
      return {capture:markSync(capture,'ERROR',{detail:{message:error.message,status:error.status}}),error};
    }
  }
  async listCaptures({page_id=null,limit=300}={}){await this.connect();const d=await this.call('list_captures',{page_id,limit});return d.captures||[]}
  async archiveCapture(id,{tombstone=false,reason=null}={}){await this.connect();return this.call('archive_capture',{id,tombstone,reason})}
  selection(captures){return captures.map(c=>{const r=revisionRef(c);return {capture_id:c.id,revision:r.revision,ref:r.ref,digest:r.digest||null}})}
  async previewExport(captures){await this.connect();return this.call('preview_export',{selection:this.selection(captures)})}
  async approveExport(proposal_id){await this.connect();return this.call('approve_export',{proposal_id,human_approved:true})}
  async prepareExport(captures){
    // The human action that invokes "Preparar patente" is the explicit export action.
    // Server still freezes an exact preview proposal first, then anchors approval to that exact scope.
    const proposal=await this.previewExport(captures);
    const receipt=await this.approveExport(proposal.proposal_id);
    return {...receipt,proposal_preview:proposal.preview,pages:proposal.pages};
  }
  async createPatent({captures,export_receipt_id,seed,work_item,current_binding,catalog_binding,pageBindings,page_bindings=pageBindings,protocol_binding,memory_bindings=[]}={}){
    await this.connect();return this.call('create_patent_v2',{selection:this.selection(captures),export_receipt_id,seed,work_item,current_binding,catalog_binding,page_bindings,protocol_binding,memory_bindings});
  }
  async getPatentStatus(patent_code){await this.connect();return this.call('patent_status',{patent_code})}
  async revokePatent(patent_code){await this.connect();return this.call('revoke_patent',{patent_code})}
  async receiptStatus({patent_code,work_item_id}={}){await this.connect();return this.call('receipt_status',{patent_code,work_item_id})}
}

export const CaptureRemoteContract=Object.freeze({endpoint:DEFAULT_ENDPOINT,auto_provision:false,secret_storage:SECRET_KEY,transport_authority:false,export_flow:'preview -> exact human approval -> patent'});
