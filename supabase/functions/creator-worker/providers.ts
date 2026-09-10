import { db, SUPABASE_URL, connection, vaultRead, patchConnection, storeAsset, parseMp4Basic } from "./runtime.ts";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_LLM = "gemini-3.8-flash";
const DEFAULT_VEO = "veo-3.1-lite-generate-preview";
const FIXTURE_VIDEO_URLS = [
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
];

async function geminiSecret(owner:string){
  const c = await connection(owner,"llm","gemini");
  if(c?.mode!=="VERIFIED_REAL" || !c.vault_secret_id) return null;
  return { key: await vaultRead(c.vault_secret_id), connection:c };
}

function responseText(payload:any){
  return payload?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("") || "";
}

async function geminiJSON(owner:string,prompt:string,schema:any,system?:string){
  const g=await geminiSecret(owner); if(!g?.key) return null;
  const model=String(g.connection?.metadata?.model||DEFAULT_LLM);
  const body:any={
    contents:[{role:"user",parts:[{text:prompt}]}],
    generationConfig:{responseMimeType:"application/json",responseSchema:schema,thinkingConfig:{thinkingLevel:"low"}}
  };
  if(system) body.systemInstruction={parts:[{text:system}]};
  const r=await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":String(g.key),"Content-Type":"application/json"},body:JSON.stringify(body)});
  const p:any=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(`GEMINI_${r.status}:${p?.error?.message||"generateContent failed"}`);
  const text=responseText(p); if(!text) throw new Error("GEMINI_EMPTY_RESPONSE");
  try{return JSON.parse(text)}catch{throw new Error("GEMINI_INVALID_JSON")}
}

export async function generateIdeas(job:any){
  const {data:ch,error}=await db.from("creator_channels").select("*").eq("id",job.channel_id).eq("owner_id",job.owner_id).single();
  if(error)throw error;
  const count=Math.max(1,Math.min(30,Number(job.input?.count||12)));
  const schema={type:"array",minItems:1,maxItems:30,items:{type:"object",properties:{title:{type:"string"},hook:{type:"string"},premise:{type:"string"},story_angle:{type:"string"},target_duration_seconds:{type:"integer"},novelty_score:{type:"number"},channel_fit_score:{type:"number"},risks:{type:"array",items:{type:"string"}}},required:["title","hook","premise","story_angle","target_duration_seconds","novelty_score","channel_fit_score","risks"]}};
  const prompt=`Generá ${count} conceptos de video distintos para este canal. No repitas conflictos ni títulos.\nCHANNEL_WORLD=${JSON.stringify(ch.world)}\nSETTINGS=${JSON.stringify(ch.settings)}\nBRIEF=${JSON.stringify(job.input?.brief||null)}`;
  let ideas:any[]|null=null; let source="MOCK";
  try{const x=await geminiJSON(job.owner_id,prompt,schema,"Sos editor de una fábrica de videos. Priorizá originalidad, claridad visual y una historia que pueda ejecutarse en formato vertical.");if(Array.isArray(x)){ideas=x.slice(0,count);source="GEMINI"}}catch(e){console.error("idea gemini fallback",e)}
  if(!ideas){
    const names=["La llamada que nadie debía atender","El secreto detrás de la puerta","Una promesa hecha demasiado tarde","La carta que cambia todo","El invitado que reconoce la mentira","La decisión que divide a la familia","El objeto que aparece dos veces","La confesión antes de la fiesta","La persona que vuelve sin avisar","El testamento con una segunda página","El mensaje enviado al contacto equivocado","La foto tomada antes de que ocurriera"];
    ideas=Array.from({length:count},(_,i)=>({title:names[i%names.length]+(i>=names.length?` ${Math.floor(i/names.length)+1}`:""),hook:`En los primeros dos segundos aparece una contradicción que ${ch.title} todavía no explicó.`,premise:`Variación ${i+1} coherente con ${ch.title}, diseñada como fixture estructurado antes de gastar en render.`,story_angle:["traición","revelación","malentendido","elección imposible"][i%4],target_duration_seconds:24+(i%4)*4,novelty_score:Number((0.68+(i%5)*0.05).toFixed(2)),channel_fit_score:Number((0.73+(i%4)*0.06).toFixed(2)),risks:[]}));
  }
  const rows=ideas.map((x:any,i:number)=>({owner_id:job.owner_id,channel_id:job.channel_id,title:String(x.title||`Idea ${i+1}`).slice(0,180),hook:String(x.hook||"").slice(0,500),state:"IDEA",format:"SHORT_9_16",target_duration_ms:Math.max(8000,Math.min(180000,Number(x.target_duration_seconds||30)*1000)),idempotency_key:`idea:${job.id}:${i}`,creative:{premise:x.premise||"",story_angle:x.story_angle||"",novelty_score:x.novelty_score??null,channel_fit_score:x.channel_fit_score??null,risks:x.risks||[],generation_source:source,generation_job_id:job.id},metadata:{provenance:source}}));
  const {data,error:ie}=await db.from("creator_videos").upsert(rows,{onConflict:"owner_id,idempotency_key",ignoreDuplicates:true}).select();
  if(ie)throw ie;
  return {source,count:(data||[]).length||rows.length,video_ids:(data||[]).map((x:any)=>x.id)};
}

export async function ensureCreativePackage(job:any){
  const {data:v,error}=await db.from("creator_videos").select("*,creator_channels(*),creator_stories(*)").eq("id",job.video_id).eq("owner_id",job.owner_id).single();if(error)throw error;
  const existing=await db.from("creator_scripts").select("*").eq("video_id",v.id).eq("owner_id",job.owner_id).eq("selected",true).maybeSingle();
  if(existing.data){const scenes=await db.from("creator_scenes").select("*").eq("video_id",v.id).order("scene_no");return {video:v,script:existing.data,scenes:scenes.data||[],source:existing.data.score?.source||"EXISTING"}}
  const sceneSchema={type:"object",properties:{title:{type:"string"},hook:{type:"string"},voice_script:{type:"string"},scenes:{type:"array",minItems:1,maxItems:8,items:{type:"object",properties:{spoken_text:{type:"string"},visual_goal:{type:"string"},subject:{type:"string"},action:{type:"string"},environment:{type:"string"},camera:{type:"string"},movement:{type:"string"},lighting:{type:"string"},continuity:{type:"string"},audio_cues:{type:"string"}},required:["spoken_text","visual_goal","subject","action","environment","camera","movement","lighting","continuity","audio_cues"]}}},required:["title","hook","voice_script","scenes"]};
  const prompt=`Convertí esta idea en un Short vertical ejecutable. Diseñá narración y visual juntos. Cada escena debe ser filmable/generable.\nCHANNEL_WORLD=${JSON.stringify(v.creator_channels?.world||{})}\nSTORY=${JSON.stringify(v.creator_stories||null)}\nVIDEO=${JSON.stringify({title:v.title,hook:v.hook,creative:v.creative,target_duration_ms:v.target_duration_ms})}`;
  let pkg:any=null,source="MOCK";
  try{pkg=await geminiJSON(job.owner_id,prompt,sceneSchema,"Entregá un scene graph conciso. La continuidad de identidad, vestuario/forma, entorno y dirección espacial importa más que adornar el prompt.");if(pkg)source="GEMINI"}catch(e){console.error("creative gemini fallback",e)}
  if(!pkg){
    const names=(v.creator_channels?.world?.characters||["protagonista","rival"]);const a=names[0]||"protagonista",b=names[1]||"rival";
    pkg={title:v.title,hook:v.hook||`Algo cambia para ${a}.`,voice_script:`${a} cree que todo está resuelto. Entonces ${b} aparece con una prueba que cambia la historia.`,scenes:[
      {spoken_text:`${a} cree que todo está resuelto.`,visual_goal:`Presentar a ${a} y el problema de inmediato.`,subject:a,action:"mira un objeto decisivo",environment:"interior simple",camera:"primer plano vertical",movement:"acercamiento lento",lighting:"suave",continuity:"identidad estable",audio_cues:"silencio breve al inicio"},
      {spoken_text:`Entonces ${b} aparece con una prueba.`,visual_goal:`Introducir a ${b} y una evidencia visual legible.`,subject:b,action:"entra y muestra la prueba",environment:"mismo interior",camera:"plano medio vertical",movement:"paneo corto",lighting:"igual escena anterior",continuity:`mantener posiciones relativas y aspecto de ${a}`,audio_cues:"golpe breve"},
      {spoken_text:"La historia ya no puede volver atrás.",visual_goal:"Cerrar con consecuencia y cliffhanger.",subject:a,action:"reacciona sin resolver el conflicto",environment:"mismo interior",camera:"close-up",movement:"quieto",lighting:"igual",continuity:"misma identidad y objeto",audio_cues:"corte seco"}
    ]};
  }
  const target=Math.max(8000,Number(v.target_duration_ms||30000));const n=Math.max(1,pkg.scenes.length);const seg=Math.floor(target/n);
  const {data:script,error:se}=await db.from("creator_scripts").insert({owner_id:job.owner_id,video_id:v.id,version:1,script:pkg.scenes.map((s:any)=>s.spoken_text).join(" "),voice_script:pkg.voice_script||pkg.scenes.map((s:any)=>s.spoken_text).join(" "),structure:pkg.scenes.map((s:any,i:number)=>({scene_no:i+1,start_ms:i*seg,end_ms:i===n-1?target:(i+1)*seg,visual_goal:s.visual_goal})),score:{source},selected:true}).select().single();if(se)throw se;
  await db.from("creator_videos").update({title:String(pkg.title||v.title).slice(0,180),hook:String(pkg.hook||v.hook||"").slice(0,500),state:"PREPARED",creative:{...(v.creative||{}),creative_package_source:source}}).eq("id",v.id);
  const sceneRows=pkg.scenes.map((s:any,i:number)=>({owner_id:job.owner_id,video_id:v.id,script_id:script.id,scene_no:i+1,start_ms:i*seg,end_ms:i===n-1?target:(i+1)*seg,spoken_text:s.spoken_text||"",visual_goal:s.visual_goal||"",scene_spec:{subject:s.subject||"",action:s.action||"",environment:s.environment||"",camera:s.camera||"",movement:s.movement||"",lighting:s.lighting||"",continuity_from_previous:s.continuity||"",audio_cues:s.audio_cues||""},state:"PLANNED"}));
  const {data:scenes,error:sce}=await db.from("creator_scenes").upsert(sceneRows,{onConflict:"video_id,scene_no"}).select();if(sce)throw sce;
  for(const s of scenes||[]){
    const spec=s.scene_spec||{};const compiled=`Vertical 9:16. Subject identity: ${spec.subject}. Action: ${spec.action}. Environment: ${spec.environment}. Composition/camera: ${spec.camera}. Movement: ${spec.movement}. Lighting: ${spec.lighting}. Continuity: ${spec.continuity_from_previous}. Visual goal: ${s.visual_goal}. Audio/dialogue cue: ${s.spoken_text}. Avoid unreadable text, accidental identity changes, duplicated limbs/objects, unrelated scene changes.`;
    await db.from("creator_prompts").insert({owner_id:job.owner_id,video_id:v.id,scene_id:s.id,kind:"VIDEO_SCENE",provider:"conceptual",conceptual:{...spec,visual_goal:s.visual_goal,spoken_text:s.spoken_text},compiled_text:compiled,compiler_version:"creator-prompt-v1"});
  }
  return {video:{...v,title:pkg.title||v.title,hook:pkg.hook||v.hook,state:"PREPARED"},script,scenes:scenes||[],source};
}

export async function maybeGenerateVoice(owner:string,channelId:string,videoId:string,text:string,voice="es-AR-TomasNeural"){
  const existing=await db.from("creator_assets").select("*").eq("owner_id",owner).eq("video_id",videoId).eq("kind","VOICE").maybeSingle();if(existing.data)return existing.data;
  try{
    const r=await fetch(`${SUPABASE_URL}/functions/v1/casa-tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:text.slice(0,3500),voice})});
    if(!r.ok)throw new Error(`EDGE_TTS_${r.status}`);
    const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.byteLength<100)throw new Error("EDGE_TTS_EMPTY");
    const asset=await storeAsset({owner,channelId,videoId,kind:"VOICE",bytes,mime:r.headers.get("content-type")||"audio/mpeg",provider:"edge-neural",pathSuffix:"voice.mp3",metadata:{voice}});
    await patchConnection(owner,"voice","edge-neural",{mode:"VERIFIED_REAL",verified_at:new Date().toISOString(),last_probe:{ok:true,bytes:bytes.byteLength,at:new Date().toISOString()},last_error:null,metadata:{function:"casa-tts",default_voice:voice,credential_required:false}}).catch(()=>{});
    return asset;
  }catch(e){
    await patchConnection(owner,"voice","edge-neural",{mode:"BLOCKED",last_probe:{ok:false,at:new Date().toISOString()},last_error:{message:String((e as any)?.message||e)}}).catch(()=>{});
    return null;
  }
}

export async function fetchFixtureVideo(){
  let last="";
  for(const u of FIXTURE_VIDEO_URLS){try{const r=await fetch(u,{redirect:"follow"});if(!r.ok){last=`HTTP_${r.status}`;continue}const b=new Uint8Array(await r.arrayBuffer());if(b.byteLength<1000){last="TOO_SMALL";continue}return {bytes:b,url:u,probe:parseMp4Basic(b)}}catch(e){last=String((e as any)?.message||e)}}
  throw new Error(`FIXTURE_VIDEO_UNAVAILABLE:${last}`);
}

export async function getVideoStrategy(owner:string,maxCostCents:number){
  const veo=await connection(owner,"video","veo");
  const allowed=veo && ["CONFIGURED","VERIFIED_REAL"].includes(veo.mode) && veo.vault_secret_id && veo.metadata?.spend_allowed===true;
  const model=String(veo?.metadata?.default_model||DEFAULT_VEO);
  const estimated=model.includes("lite")?40:model.includes("fast")?80:320;
  if(allowed && estimated<=maxCostCents) return {kind:"VEO" as const,connection:veo,model,estimated_cost_cents:estimated};
  return {kind:"FIXTURE" as const,reason:!veo?"NO_VIDEO_PROVIDER":veo.metadata?.spend_allowed!==true?"PAID_SPEND_NOT_AUTHORIZED":estimated>maxCostCents?"COST_BUDGET":"PROVIDER_NOT_READY",estimated_cost_cents:0};
}

export async function submitVeo(owner:string,prompt:string,model:string){
  const c=await connection(owner,"video","veo");if(!c?.vault_secret_id)throw new Error("VEO_SECRET_MISSING");const key=await vaultRead(c.vault_secret_id);if(!key)throw new Error("VEO_SECRET_EMPTY");
  const r=await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:predictLongRunning`,{method:"POST",headers:{"x-goog-api-key":String(key),"Content-Type":"application/json"},body:JSON.stringify({instances:[{prompt}],parameters:{aspectRatio:"9:16",durationSeconds:"8",resolution:"720p"}})});
  const p:any=await r.json().catch(()=>({}));if(!r.ok||!p.name)throw new Error(`VEO_SUBMIT_${r.status}:${p?.error?.message||"missing operation"}`);
  return {operation:String(p.name),key:String(key)};
}

export async function pollVeo(owner:string,operation:string){
  const c=await connection(owner,"video","veo");if(!c?.vault_secret_id)throw new Error("VEO_SECRET_MISSING");const key=await vaultRead(c.vault_secret_id);if(!key)throw new Error("VEO_SECRET_EMPTY");
  const r=await fetch(`${GEMINI_BASE}/${operation}`,{headers:{"x-goog-api-key":String(key)}});const p:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`VEO_POLL_${r.status}:${p?.error?.message||"poll failed"}`);
  if(!p.done)return {done:false as const};if(p.error)throw new Error(`VEO_OPERATION:${p.error.message||JSON.stringify(p.error)}`);
  const uri=p?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri || p?.response?.generatedVideos?.[0]?.video?.uri || p?.response?.generated_videos?.[0]?.video?.uri;
  if(!uri)throw new Error("VEO_DONE_WITHOUT_VIDEO_URI");
  const vr=await fetch(uri,{headers:{"x-goog-api-key":String(key)},redirect:"follow"});if(!vr.ok)throw new Error(`VEO_DOWNLOAD_${vr.status}`);const bytes=new Uint8Array(await vr.arrayBuffer());
  return {done:true as const,bytes,probe:parseMp4Basic(bytes),uri};
}
