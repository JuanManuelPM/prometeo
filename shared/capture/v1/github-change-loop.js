const ENVELOPE_SCHEMA='prometeo.page-change-github-envelope/v1';
const TRANSPORT_SCHEMA='prometeo.page-change-github-transport/v1';
const INGRESS_KIND='PAGE_CHANGE_METADATA_V1';
const PROJECT_ID='prometeo-page-change';
const WORKER_PROTOCOL='coordination/workspaces/PAGE_CHANGE_WORKER_PROTOCOL_V1.md';
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SAFE_OPAQUE_REF=/^[A-Za-z0-9][A-Za-z0-9._:\/-]{0,255}$/;
const SAFE_PATH=/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._\/-]{1,320}$/;
const SHA256=/^[a-f0-9]{64}$/i;
const FORBIDDEN_PUBLIC_KEYS=new Set([
  'transcript','selected_capture_revisions','attachments','page_memory','previous_ai_sessions',
  'packet_url','asset_url','signed_url','authorization','secret','token','access_token',
  'refresh_token','cookie','content','body','prompt','notes','raw','workspace_id','thread_id'
]);

function boundary(code,detail=null){
  const error=new Error(code);
  error.code=code;
  error.detail=detail;
  return error;
}
function requiredString(value,code,max=320){
  const out=String(value??'').trim();
  if(!out||out.length>max)throw boundary(code);
  return out;
}
function safeId(value,code){
  const out=requiredString(value,code,160);
  if(!SAFE_ID.test(out))throw boundary(code);
  return out;
}
function safeIso(value,code){
  const out=requiredString(value,code,40);
  if(!Number.isFinite(Date.parse(out)))throw boundary(code);
  return new Date(out).toISOString();
}
function safePath(value,code){
  const out=requiredString(value,code,320);
  if(!SAFE_PATH.test(out)||out.includes('?')||out.includes('#'))throw boundary(code);
  return out;
}
function safeOpaqueRef(value){
  if(value===null||value===undefined||value==='')return null;
  const out=String(value).trim();
  if(!SAFE_OPAQUE_REF.test(out)||out.includes('://')||/[?&#]/.test(out))throw boundary('PRIVATE_CONTEXT_REF_UNSAFE');
  if(/(?:token|secret|password|authorization|signed)/i.test(out))throw boundary('PRIVATE_CONTEXT_REF_UNSAFE');
  return out;
}
function assertPublicEnvelope(value,path='$'){
  if(value===null||value===undefined)return;
  if(Array.isArray(value)){value.forEach((v,i)=>assertPublicEnvelope(v,`${path}[${i}]`));return}
  if(typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    if(FORBIDDEN_PUBLIC_KEYS.has(String(key).toLowerCase()))throw boundary('PRIVATE_FIELD_IN_PUBLIC_ENVELOPE',{path:`${path}.${key}`});
    assertPublicEnvelope(item,`${path}.${key}`);
  }
}
function packetReturnPath(packet){
  const value=packet?.execution?.result_submission?.github_return_path||packet?.return_path;
  return safePath(value,'RETURN_PATH_REQUIRED');
}
function packetHash(packet){
  const value=String(packet?.packet_hash||'').trim();
  if(!SHA256.test(value))throw boundary('PACKET_HASH_REQUIRED');
  return value.toLowerCase();
}

export function sanitizeExecutionPacketForGitHub(packet,{privateContextRef=null}={}){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))throw boundary('EXECUTION_PACKET_REQUIRED');
  if(packet.schema!=='prometeo.execution-packet/v2')throw boundary('EXECUTION_PACKET_SCHEMA_UNSUPPORTED');
  const delivery=String(packet?.authorization?.delivery_mode||'').toUpperCase();
  if(delivery!=='WORKER_POOL')throw boundary('WORKER_POOL_PACKET_REQUIRED');

  const workItemId=safeId(packet.work_item_id,'WORK_ITEM_ID_REQUIRED');
  const pageId=safeId(packet?.target?.page_id,'PAGE_ID_REQUIRED');
  const createdAt=safeIso(packet.created_at,'CREATED_AT_REQUIRED');
  const expiresAt=safeIso(packet.expires_at,'EXPIRES_AT_REQUIRED');
  if(Date.parse(expiresAt)<=Date.parse(createdAt))throw boundary('PACKET_EXPIRY_INVALID');

  const protocolId=safeId(packet?.execution?.protocol_id,'PROTOCOL_ID_REQUIRED');
  const returnPath=packetReturnPath(packet);
  const contextRef=safeOpaqueRef(privateContextRef);
  const envelope={
    schema:ENVELOPE_SCHEMA,
    transport:'GITHUB_CANDIDATE_METADATA_ONLY',
    project_id:PROJECT_ID,
    work_item_id:workItemId,
    page_id:pageId,
    created_at:createdAt,
    expires_at:expiresAt,
    packet_digest:packetHash(packet),
    status:'READY_CANDIDATE',
    delivery_mode:'WORKER_POOL',
    private_context:{
      published:false,
      ref:contextRef,
      state:contextRef?'OPAQUE_REF_AVAILABLE':'NOT_PUBLISHED'
    },
    execution:{
      protocol_id:protocolId,
      source_path:WORKER_PROTOCOL,
      return_path:returnPath
    },
    authority:{
      owner:'EXISTING_PAGE_CHANGE_OPPORTUNITY_CLAIM',
      claim_path:`coordination/opportunities/claims/page-change-${workItemId}.json`,
      grants_authority:false
    },
    privacy:{
      capture_literals_published:false,
      transcripts_published:false,
      attachments_published:false,
      tokens_published:false,
      signed_urls_published:false
    },
    truth_boundary:'PUBLIC_METADATA_ONLY_PRIVATE_EXECUTION_CONTEXT_MUST_BE_RESOLVED_AFTER_EXISTING_AUTHORITY_CLAIM'
  };
  assertPublicEnvelope(envelope);
  return Object.freeze(envelope);
}

export function serializeExecutionPacketForGitHub(packet,options={}){
  return JSON.stringify(sanitizeExecutionPacketForGitHub(packet,options));
}

export function toIngressSubmission(packet,options={}){
  const envelope=sanitizeExecutionPacketForGitHub(packet,options);
  return Object.freeze({
    page:envelope.page_id,
    kind:INGRESS_KIND,
    text:JSON.stringify(envelope)
  });
}

export function createGitHubChangeLoopTransport({ingress=globalThis.PROMETEO_INGRESS_V1}={}){
  async function submit(packet,options={}){
    let submission;
    try{submission=toIngressSubmission(packet,options)}
    catch(error){return Object.freeze({status:'BOUNDARY',queued:false,ref:null,error:error?.code||'SANITIZATION_FAILED'})}

    if(!ingress||typeof ingress.submit!=='function'){
      return Object.freeze({status:'BOUNDARY',queued:false,ref:null,error:'GITHUB_INGRESS_UNAVAILABLE'});
    }

    try{
      const result=await ingress.submit(submission);
      const queued=result?.queued===true;
      const ref=safeOpaqueRef(result?.ref);
      if(!queued||!ref){
        return Object.freeze({
          status:'BOUNDARY',
          queued:false,
          ref:ref||null,
          error:String(result?.error||'GITHUB_INGRESS_DID_NOT_QUEUE')
        });
      }
      return Object.freeze({status:String(result?.status||'QUEUED'),queued:true,ref,error:null});
    }catch(error){
      return Object.freeze({status:'BOUNDARY',queued:false,ref:null,error:String(error?.code||error?.message||'GITHUB_INGRESS_FAILED')});
    }
  }

  return Object.freeze({
    schema:TRANSPORT_SCHEMA,
    mode:'CANDIDATE',
    prepare:toIngressSubmission,
    submit
  });
}

export const PROMETEO_GITHUB_CHANGE_LOOP_V1=Object.freeze({
  schema:TRANSPORT_SCHEMA,
  envelope_schema:ENVELOPE_SCHEMA,
  ingress_kind:INGRESS_KIND,
  sanitize:sanitizeExecutionPacketForGitHub,
  serialize:serializeExecutionPacketForGitHub,
  toIngressSubmission,
  createTransport:createGitHubChangeLoopTransport
});

if(typeof globalThis==='object'&&!globalThis.PROMETEO_GITHUB_CHANGE_LOOP_V1){
  globalThis.PROMETEO_GITHUB_CHANGE_LOOP_V1=PROMETEO_GITHUB_CHANGE_LOOP_V1;
}
