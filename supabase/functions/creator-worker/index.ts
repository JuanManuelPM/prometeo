import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { db, claim, workerAuthorized, event, succeed, waitExternal, waitAuth, blocked, failOrRetry, storeAsset, parseMp4Basic } from "./runtime.ts";
import { generateIdeas, ensureCreativePackage, maybeGenerateVoice, fetchFixtureVideo, getVideoStrategy, submitVeo, pollVeo } from "./providers.ts";
import { publishYouTube, collectAnalytics } from "./youtube.ts";

function out(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}})}

async function finalizeMaster(job:any,bytes:Uint8Array,provider:string,probe:any,metadata:Record<string,unknown>={}){
  const {data:v,error}=await db.from("creator_videos").select("*").eq("id",job.video_id).eq("owner_id",job.owner_id).single();if(error)throw error;
  const existing=await db.from("creator_video_versions").select("*,creator_assets(*)").eq("owner_id",job.owner_id).eq("video_id",v.id).eq("selected",true).order("version",{ascending:false}).limit(1).maybeSingle();
  if(existing.data?.creator_assets){await db.from("creator_videos").update({state:"READY"}).eq("id",v.id);return {asset:existing.data.creator_assets,version:existing.data,probe,idempotent:true}}
  const asset=await storeAsset({owner:job.owner_id,channelId:v.channel_id,videoId:v.id,kind:"MASTER",bytes,mime:"video/mp4",provider,pathSuffix:"master.mp4",durationMs:probe?.duration_ms||null,metadata:{...metadata,probe}});
  const {data:versions}=await db.from("creator_video_versions").select("version").eq("owner_id",job.owner_id).eq("video_id",v.id).order("version",{ascending:false}).limit(1);const versionNo=(versions?.[0]?.version||0)+1;
  const {data:scenes}=await db.from("creator_scenes").select("id,scene_no,start_ms,end_ms,visual_goal,scene_spec,state").eq("owner_id",job.owner_id).eq("video_id",v.id).order("scene_no");
  const {data:ver,error:vere}=await db.from("creator_video_versions").insert({owner_id:job.owner_id,video_id:v.id,version:versionNo,master_asset_id:asset.id,scene_manifest:scenes||[],selected:true}).select().single();if(vere)throw vere;
  const strict=provider!=="fixture";
  const technicalPass=probe?.ok===true && (!strict || probe?.vertical_9_16===true);
  await db.from("creator_validation_runs").insert({owner_id:job.owner_id,video_id:v.id,video_version_id:ver.id,kind:"DETERMINISTIC",status:technicalPass?"PASS":strict?"FAIL":"WARN",score:technicalPass?1:strict?0:.6,findings:technicalPass?[]:[strict?"MASTER_NOT_VERTICAL_9_16":"Fixture master validates persistence/container/recovery but is not a production-format visual sample."],evidence:{provider,probe,fixture:provider==="fixture"}});
  if(strict&&!technicalPass){
    await db.from("creator_videos").update({state:"BLOCKED",regeneration_count:Number(v.regeneration_count||0)+1}).eq("id",v.id);
    return {asset,version:ver,probe,invalid:true};
  }
  await db.from("creator_videos").update({state:"READY",actual_cost_cents:Number(v.actual_cost_cents||0)+Number(job.actual_cost_cents||0),metadata:{...(v.metadata||{}),last_master_provider:provider,last_master_asset_id:asset.id}}).eq("id",v.id);
  return {asset,version:ver,probe,fixture:provider==="fixture"};
}

async function pipeline(job:any){
  if(!job.video_id)throw new Error("PIPELINE_VIDEO_REQUIRED");
  const pkg=await ensureCreativePackage(job);
  await event(job,"CREATIVE_PACKAGE_READY",{source:pkg.source,scenes:pkg.scenes.length});
  const voiceMode=String(pkg.video?.creator_channels?.settings?.voice_strategy||pkg.video?.metadata?.voice_strategy||"native");
  if(voiceMode==="tts"||job.input?.generate_voice===true){const voice=await maybeGenerateVoice(job.owner_id,pkg.video.channel_id,pkg.video.id,pkg.script.voice_script||pkg.script.script);await event(job,"VOICE_ATTEMPT",{ready:!!voice,provider:voice?.provider||null});}

  if(job.provider==="veo"&&job.provider_operation_id){
    const polled=await pollVeo(job.owner_id,job.provider_operation_id);
    if(!polled.done){await waitExternal(job,job.provider_operation_id,{stage:"VIDEO_WAIT",provider:"veo"},15);return {waiting:true}}
    const res=await finalizeMaster(job,polled.bytes,"veo",polled.probe,{provider_operation_id:job.provider_operation_id});
    if(res.invalid){
      const {data:v}=await db.from("creator_videos").select("regeneration_count,max_regenerations").eq("id",job.video_id).single();
      if(Number(v?.regeneration_count||0)<Number(v?.max_regenerations||3)){await db.from("creator_jobs").update({provider_operation_id:null,provider:null,status:"RETRY",available_at:new Date(Date.now()+5000).toISOString(),lease_owner:null,lease_until:null,error:{reason:"QA_REGENERATION"}}).eq("id",job.id);return {retry:true}}
      await blocked(job,"VIDEO_QA_FAILED_AFTER_REGENERATIONS",{probe:polled.probe});return {blocked:true};
    }
    await succeed(job,{stage:"READY",provider:"veo",asset_id:res.asset.id,validation:polled.probe});return {done:true};
  }

  const strategy=await getVideoStrategy(job.owner_id,Math.max(0,Number(job.max_cost_cents||0)-Number(job.actual_cost_cents||0)));
  if(strategy.kind==="VEO"){
    const {data:prompts,error}=await db.from("creator_prompts").select("compiled_text").eq("owner_id",job.owner_id).eq("video_id",job.video_id).order("created_at");if(error)throw error;
    const masterPrompt=`Create one coherent vertical short. Preserve identity, location and object continuity across beats. Native audio is allowed.\n${(prompts||[]).map((p:any,i:number)=>`Beat ${i+1}: ${p.compiled_text}`).join("\n")}`.slice(0,12000);
    const submitted=await submitVeo(job.owner_id,masterPrompt,strategy.model);
    await db.from("creator_jobs").update({provider:"veo",estimated_cost_cents:strategy.estimated_cost_cents,actual_cost_cents:Number(job.actual_cost_cents||0)}).eq("id",job.id);
    await db.from("creator_videos").update({state:"GENERATING",estimated_cost_cents:strategy.estimated_cost_cents}).eq("id",job.video_id);
    await waitExternal({...job,provider:"veo"},submitted.operation,{stage:"VIDEO_WAIT",model:strategy.model,estimated_cost_cents:strategy.estimated_cost_cents},15);return {waiting:true};
  }

  const fixture=await fetchFixtureVideo();
  const res=await finalizeMaster(job,fixture.bytes,"fixture",fixture.probe,{source_url:fixture.url,reason:strategy.reason,fixture:true});
  await succeed(job,{stage:"READY",provider:"fixture",asset_id:res.asset.id,fixture_reason:strategy.reason,validation:fixture.probe});return {done:true,fixture:true};
}

async function processJob(job:any){
  await event(job,"RUNNING",{worker:"creator-worker",attempt:job.attempt_count,kind:job.kind});
  try{
    switch(job.kind){
      case "GENERATE_IDEAS":{const r=await generateIdeas(job);await succeed(job,r);return r;}
      case "PIPELINE":return await pipeline(job);
      case "PUBLISH_YOUTUBE":{
        const r=await publishYouTube(job);
        if((r as any).waiting_auth){await waitAuth(job,(r as any).reason);return r;}
        if((r as any).waiting_external){await waitExternal(job,String((r as any).resumable_url||"youtube-resumable"),{stage:"YOUTUBE_UPLOAD",uploaded_bytes:(r as any).uploaded_bytes},10);return r;}
        await succeed(job,r as any);return r;
      }
      case "COLLECT_ANALYTICS":{
        const r=await collectAnalytics(job);
        if((r as any).waiting_auth){await waitAuth(job,(r as any).reason);return r;}
        await succeed(job,r as any);return r;
      }
      default: await blocked(job,"UNKNOWN_JOB_KIND",{kind:job.kind}); return {blocked:true};
    }
  }catch(e){
    const status=Number((e as any)?.status||0);const msg=String((e as any)?.message||e);
    if(status===401||status===403||/OAUTH|AUTH/.test(msg)){await waitAuth(job,msg);return {waiting_auth:true,error:msg}}
    if(/quota|429|RESOURCE_EXHAUSTED/i.test(msg)){await failOrRetry(job,e,true);return {retry:true,error:msg}}
    await failOrRetry(job,e,status===0||status>=500||status===408||status===429);return {error:msg};
  }
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return out({ok:true,function:"creator-worker",method:"POST only"},200);
  if(!(await workerAuthorized(req)))return out({ok:false,error:"WORKER_AUTH_REQUIRED"},401);
  const requested=await req.json().catch(()=>({}));const limit=Math.max(1,Math.min(20,Number(requested?.limit||8)));
  const jobs=await claim(limit);const results=[];
  for(const job of jobs)results.push({job_id:job.id,kind:job.kind,result:await processJob(job)});
  return out({ok:true,worker:"creator-worker",claimed:jobs.length,results});
});
