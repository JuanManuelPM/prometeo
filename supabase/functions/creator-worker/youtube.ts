import { db, refreshGoogleAccess, connection, patchConnection, loadAsset } from "./runtime.ts";

async function masterFor(owner:string,videoId:string){
  const {data:version,error}=await db.from("creator_video_versions").select("*,creator_assets(*)").eq("owner_id",owner).eq("video_id",videoId).eq("selected",true).order("version",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  if(version?.creator_assets)return version.creator_assets;
  const {data:asset,error:ae}=await db.from("creator_assets").select("*").eq("owner_id",owner).eq("video_id",videoId).eq("kind","MASTER").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(ae)throw ae;if(!asset)throw new Error("MASTER_ASSET_MISSING");return asset;
}

async function thumbnailFor(owner:string,videoId:string){
  const {data,error}=await db.from("creator_assets").select("*").eq("owner_id",owner).eq("video_id",videoId).eq("kind","THUMBNAIL").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;return data;
}

function uploadBody(video:any,publication:any){
  const req=publication.request||{};
  const scheduled=req.publish_at||publication.scheduled_at||video.scheduled_at||null;
  const privacy=scheduled?"private":String(req.privacy||"private");
  const status:any={privacyStatus:privacy,selfDeclaredMadeForKids:Boolean(video.metadata?.made_for_kids||false),containsSyntheticMedia:req.contains_synthetic_media!==false};
  if(scheduled) status.publishAt=new Date(scheduled).toISOString();
  return {snippet:{title:String(video.metadata?.youtube_title||video.title).slice(0,100),description:String(video.metadata?.description||"").slice(0,5000),tags:Array.isArray(video.metadata?.tags)?video.metadata.tags.slice(0,30):[],categoryId:String(video.metadata?.category_id||"24"),defaultLanguage:String(video.metadata?.language||"es")},status};
}

function parseRange(h:string|null){
  if(!h)return 0;const m=h.match(/bytes=0-(\d+)/);return m?Number(m[1])+1:0;
}

async function initiate(accessToken:string,asset:any,video:any,publication:any){
  const metadata=uploadBody(video,publication);
  const params=new URLSearchParams({uploadType:"resumable",part:"snippet,status"});
  const r=await fetch(`https://www.googleapis.com/upload/youtube/v3/videos?${params}`,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":asset.mime_type||"video/mp4","X-Upload-Content-Length":String(asset.byte_size||0)},body:JSON.stringify(metadata)});
  const text=await r.text();if(!r.ok)throw Object.assign(new Error(`YOUTUBE_INIT_${r.status}:${text.slice(0,300)}`),{status:r.status});
  const location=r.headers.get("location");if(!location)throw new Error("YOUTUBE_RESUMABLE_LOCATION_MISSING");return {location,metadata};
}

async function uploadResumable(accessToken:string,location:string,bytes:Uint8Array,mime:string,start=0){
  const total=bytes.byteLength;const slice=start?bytes.slice(start):bytes;
  const end=total-1;
  const r=await fetch(location,{method:"PUT",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":mime||"video/mp4","Content-Length":String(slice.byteLength),"Content-Range":`bytes ${start}-${end}/${total}`},body:slice});
  const text=await r.text();let payload:any={};try{payload=text?JSON.parse(text):{}}catch{payload={raw:text.slice(0,300)}}
  if(r.status===308)return {done:false as const,next:parseRange(r.headers.get("range")),payload};
  if(!r.ok)throw Object.assign(new Error(`YOUTUBE_UPLOAD_${r.status}:${payload?.error?.message||text.slice(0,300)}`),{status:r.status,payload});
  if(!payload.id)throw new Error("YOUTUBE_UPLOAD_NO_ID");return {done:true as const,id:String(payload.id),payload};
}

async function queryResumable(accessToken:string,location:string,total:number){
  const r=await fetch(location,{method:"PUT",headers:{Authorization:`Bearer ${accessToken}`,"Content-Length":"0","Content-Range":`bytes */${total}`}});
  const text=await r.text();let payload:any={};try{payload=text?JSON.parse(text):{}}catch{}
  if(r.status===308)return {done:false as const,next:parseRange(r.headers.get("range"))};
  if(r.ok&&payload.id)return {done:true as const,id:String(payload.id),payload};
  if(r.status===404||r.status===410)return {expired:true as const};
  throw Object.assign(new Error(`YOUTUBE_RESUME_QUERY_${r.status}:${text.slice(0,240)}`),{status:r.status});
}

async function setThumbnail(accessToken:string,videoId:string,asset:any){
  const bytes=await loadAsset(asset);
  const r=await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":asset.mime_type||"image/jpeg","Content-Length":String(bytes.byteLength)},body:bytes});
  const text=await r.text();return {ok:r.ok,status:r.status,error:r.ok?null:text.slice(0,300)};
}

export async function publishYouTube(job:any){
  const pubId=String(job.input?.publication_id||"");
  const {data:pub,error:pe}=await db.from("creator_publications").select("*").eq("id",pubId).eq("owner_id",job.owner_id).single();if(pe)throw pe;
  const {data:video,error:ve}=await db.from("creator_videos").select("*").eq("id",pub.video_id).eq("owner_id",job.owner_id).single();if(ve)throw ve;
  if(pub.external_id||video.youtube_video_id){return {done:true,idempotent:true,youtube_video_id:pub.external_id||video.youtube_video_id,status:pub.status}}
  const yt=await connection(job.owner_id,"youtube","google");if(!yt||!["CONFIGURED","VERIFIED_REAL"].includes(yt.mode))return {waiting_auth:true,reason:"YOUTUBE_OAUTH_NOT_READY"};
  const token=await refreshGoogleAccess(job.owner_id);if(!token.ok)return {waiting_auth:true,reason:token.reason};
  const asset=await masterFor(job.owner_id,video.id);const bytes=await loadAsset(asset);const mime=asset.mime_type||"video/mp4";
  let location=String(pub.response?.resumable_url||"");let start=Number(pub.response?.uploaded_bytes||0);let metadata=pub.response?.metadata||null;
  if(location){
    const q=await queryResumable(token.accessToken,location,bytes.byteLength);
    if((q as any).done){const id=(q as any).id;await finalize(job.owner_id,video,pub,id,token.accessToken,(q as any).payload);return {done:true,youtube_video_id:id,resumed:true}}
    if((q as any).expired){location="";start=0}else start=(q as any).next||0;
  }
  if(!location){
    const init=await initiate(token.accessToken,asset,video,pub);location=init.location;metadata=init.metadata;start=0;
    await db.from("creator_publications").update({status:"UPLOADING",response:{...(pub.response||{}),resumable_url:location,uploaded_bytes:0,metadata}}).eq("id",pub.id);
  }
  const uploaded=await uploadResumable(token.accessToken,location,bytes,mime,start);
  if(!uploaded.done){
    await db.from("creator_publications").update({status:"UPLOADING",response:{...(pub.response||{}),resumable_url:location,uploaded_bytes:uploaded.next,metadata}}).eq("id",pub.id);
    return {waiting_external:true,resumable_url:location,uploaded_bytes:uploaded.next};
  }
  await finalize(job.owner_id,video,pub,uploaded.id,token.accessToken,uploaded.payload);
  return {done:true,youtube_video_id:uploaded.id};
}

async function finalize(owner:string,video:any,pub:any,youtubeId:string,accessToken:string,payload:any){
  const thumb=await thumbnailFor(owner,video.id);const thumbProbe=thumb?await setThumbnail(accessToken,youtubeId,thumb):{ok:false,status:null,error:"NO_CUSTOM_THUMBNAIL"};
  const scheduled=pub.request?.publish_at||pub.scheduled_at||video.scheduled_at||null;const isFuture=scheduled&&new Date(scheduled).getTime()>Date.now();
  const status=isFuture?"SCHEDULED":pub.request?.privacy==="public"?"PUBLIC":"PRIVATE";
  await db.from("creator_publications").update({external_id:youtubeId,status,published_at:status==="PUBLIC"?new Date().toISOString():null,response:{...(pub.response||{}),youtube_video_id:youtubeId,youtube_response:payload,thumbnail:thumbProbe,resumable_url:null,uploaded_bytes:null}}).eq("id",pub.id);
  await db.from("creator_videos").update({youtube_video_id:youtubeId,state:status==="PUBLIC"?"PUBLISHED":"READY",published_at:status==="PUBLIC"?new Date().toISOString():video.published_at}).eq("id",video.id);
  await patchConnection(owner,"youtube","google",{mode:"VERIFIED_REAL",verified_at:new Date().toISOString(),last_probe:{upload:true,youtube_video_id:youtubeId,thumbnail:thumbProbe,at:new Date().toISOString()},last_error:null});
  const baseTime=isFuture?new Date(scheduled).getTime():Date.now();
  const offsets=[1,6,24,72,168];
  for(const h of offsets){
    await db.from("creator_jobs").upsert({owner_id:owner,channel_id:video.channel_id,video_id:video.id,kind:"COLLECT_ANALYTICS",status:"QUEUED",input:{youtube_video_id:youtubeId,hours_after_publish:h},idempotency_key:`analytics:${video.id}:${h}h`,priority:150,max_attempts:8,max_cost_cents:0,available_at:new Date(baseTime+h*3600000).toISOString()},{onConflict:"owner_id,idempotency_key",ignoreDuplicates:true});
  }
}

export async function collectAnalytics(job:any){
  const {data:video,error}=await db.from("creator_videos").select("*").eq("id",job.video_id).eq("owner_id",job.owner_id).single();if(error)throw error;
  const youtubeId=String(job.input?.youtube_video_id||video.youtube_video_id||"");if(!youtubeId)return {waiting_auth:true,reason:"YOUTUBE_VIDEO_ID_MISSING"};
  const token=await refreshGoogleAccess(job.owner_id);if(!token.ok)return {waiting_auth:true,reason:token.reason};
  const end=new Date();end.setUTCDate(end.getUTCDate()-1);const start=new Date(video.published_at||video.scheduled_at||end);start.setUTCDate(start.getUTCDate()-1);
  const d=(x:Date)=>x.toISOString().slice(0,10);
  const metrics="views,engagedViews,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost";
  const q=new URLSearchParams({ids:"channel==MINE",startDate:d(start),endDate:d(end),metrics,dimensions:"day",filters:`video==${youtubeId}`,sort:"day"});
  const r=await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${q}`,{headers:{Authorization:`Bearer ${token.accessToken}`}});const p:any=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(`YOUTUBE_ANALYTICS_${r.status}:${p?.error?.message||"query failed"}`),{status:r.status});
  const headers=(p.columnHeaders||[]).map((x:any)=>x.name);let inserted=0;
  for(const row of p.rows||[]){const rec:any={};headers.forEach((h:string,i:number)=>rec[h]=row[i]);const captured=rec.day?`${rec.day}T23:59:59Z`:new Date().toISOString();delete rec.day;const normalized={...rec,views_per_day:Number(rec.views||0),subs_per_day:Number(rec.subscribersGained||0)-Number(rec.subscribersLost||0),retention:rec.averageViewPercentage==null?null:Number(rec.averageViewPercentage),ctr:null};
    const {error:ie}=await db.from("creator_analytics_snapshots").upsert({owner_id:job.owner_id,channel_id:video.channel_id,video_id:video.id,captured_at:captured,source:"YOUTUBE_ANALYTICS",metrics:normalized},{onConflict:"owner_id,video_id,captured_at,source"});if(ie)throw ie;inserted++;
  }
  await patchConnection(job.owner_id,"analytics","youtube",{mode:"VERIFIED_REAL",verified_at:new Date().toISOString(),last_probe:{ok:true,status:r.status,rows:inserted,video_id:youtubeId,at:new Date().toISOString()},last_error:null});
  if(video.state!=="PUBLISHED"&&new Date(video.scheduled_at||0).getTime()<=Date.now())await db.from("creator_videos").update({state:"PUBLISHED",published_at:video.published_at||video.scheduled_at||new Date().toISOString()}).eq("id",video.id);
  return {done:true,rows:inserted,metric_surface:"YouTube Analytics API; thumbnail CTR requires Reporting API reach reports"};
}
