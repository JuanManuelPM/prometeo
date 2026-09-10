(()=>{
const SB_URL='https://catnohyouxqjjtseaueb.supabase.co',SB_KEY='sb_publishable_eqh3PngXs4UjLLWiY3pz1w_nhHtf7X-',API=SB_URL+'/functions/v1/creator-api';
let sb=null,session=null,user=null;
async function init(){if(!window.supabase)return {live:false};sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const s=await sb.auth.getSession();session=s.data.session;user=session?.user||null;return {live:!!session,user}}
async function api(path,{method='GET',body=null,idem=null}={}){if(!session)throw new Error('LOGIN_REQUIRED');const h={Authorization:'Bearer '+session.access_token,apikey:SB_KEY};if(body!==null)h['Content-Type']='application/json';if(idem)h['x-idempotency-key']=idem;const r=await fetch(API+path,{method,headers:h,body:body===null?undefined:JSON.stringify(body)});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p.error||('HTTP_'+r.status));return p}
async function channels(){return (await api('/channels')).channels||[]}
async function stories(channelId){return (await api(`/channels/${channelId}/stories`)).stories||[]}
async function videos(channelId,state=''){return (await api(`/channels/${channelId}/videos${state?'?state='+encodeURIComponent(state):''}`)).videos||[]}
async function timeline(channelId,metric='views'){return await api(`/channels/${channelId}/timeline?metric=${encodeURIComponent(metric)}`)}
async function work(storyId,task){return await api(`/stories/${storyId}/work`,{method:'POST',body:{task}})}
async function workStatus(id){if(!sb||!session)return null;const {data,error}=await sb.from('creator_external_work').select('id,status,result,returned_at,applied_at').eq('id',id).maybeSingle();if(error)throw error;return data}
async function createVideo({channelId,storyId=null,title,hook='',targetDurationMs=30000}){if(!sb||!session)throw new Error('LOGIN_REQUIRED');const key='ui:'+crypto.randomUUID();const {data,error}=await sb.from('creator_videos').insert({owner_id:user.id,channel_id:channelId,story_id:storyId,title,hook,state:'IDEA',format:'SHORT_9_16',target_duration_ms:targetDurationMs,idempotency_key:key,metadata:{provenance:'HUMAN_UI'},creative:{source:'channel_ui'}}).select().single();if(error)throw error;return data}
async function produce(videoId,maxCostCents=500){return await api(`/videos/${videoId}/produce`,{method:'POST',body:{mode:'AUTO',generate_voice:true,max_cost_cents:maxCostCents},idem:'produce:'+videoId+':v1'})}
async function publish(videoId,body={privacy:'private'}){return await api(`/videos/${videoId}/publish`,{method:'POST',body,idem:'youtube:'+videoId})}
async function master(videoId){return await api(`/videos/${videoId}/master`)}
async function job(id){return (await api(`/jobs/${id}`)).job}
async function waitJob(id,onUpdate,limit=120){for(let i=0;i<limit;i++){const j=await job(id);onUpdate?.(j);if(['SUCCEEDED','FAILED','BLOCKED','WAITING_AUTH'].includes(j.status))return j;await new Promise(r=>setTimeout(r,1800))}throw new Error('JOB_TIMEOUT')}
async function status(){return await api('/setup/status')}
async function ensure(){return await api('/setup/ensure',{method:'POST',body:{}})}
async function handoff(){return await api('/handoff/export')}
window.Creator={init,api,channels,stories,videos,timeline,work,workStatus,createVideo,produce,publish,master,job,waitJob,status,ensure,handoff,setupUrl:'./setup/',get live(){return !!session},get user(){return user},get sb(){return sb}};
})();