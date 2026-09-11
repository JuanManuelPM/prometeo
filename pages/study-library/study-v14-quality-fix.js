(()=>{'use strict';
if(window.__STUDY_TRANSCRIPTION_V141)return;window.__STUDY_TRANSCRIPTION_V141=true;

const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ]+/g,' ').trim();
const sameBlock=(w,a,b,n)=>{for(let i=0;i<n;i++)if(w[a+i]!==w[b+i])return false;return true};
function quality141(text){
  const w=norm(text).split(/\s+/).filter(Boolean);if(w.length<4)return{bad:false,score:0,reasons:[]};
  let score=0,reasons=[],run=1,maxRun=1,maxBlockRepeat=1;
  for(let i=1;i<w.length;i++){run=w[i]===w[i-1]?run+1:1;if(run>maxRun)maxRun=run}
  if(maxRun>=6){score+=10;reasons.push('token-loop')}
  for(const n of [2,3,4,5,6,7,8]){
    for(let i=0;i+n*4<=w.length;i++){
      let reps=1;while(i+(reps+1)*n<=w.length&&sameBlock(w,i,i+reps*n,n))reps++;
      if(reps>maxBlockRepeat)maxBlockRepeat=reps;
      if(reps>=4){score+=10;reasons.push(`${n}gram-consecutive-loop`);i+=reps*n-1;break}
    }
    if(score>=10)break;
  }
  const uniqueRatio=new Set(w).size/w.length;if(w.length>60&&uniqueRatio<.16){score+=7;reasons.push('very-low-diversity')}
  return{bad:score>=7,score,reasons,unique_ratio:uniqueRatio,max_token_run:maxRun,max_block_repeat:maxBlockRepeat};
}

updateFullDoc=async function(){
  if(!roomClient||!room)return;
  const txt=fullText(),shared=[...notes].filter(n=>!n.deleted_at).sort((a,b)=>a.position-b.position).map(n=>n.content).filter(Boolean).join('\n\n');
  await roomClient.from('study_session_docs').upsert({session_id:room.id,shared_notes:shared,full_transcript:txt,updated_by:st.profile.name,updated_at:new Date().toISOString(),version:Date.now()},{onConflict:'session_id'});
};

transcribeJob=async function(job){
  const {x,blob}=job,sessionId=job.sessionId||x.session_id,roomToken=job.roomToken||st.sessions?.[sessionId]?.token||'',inRoom=()=>room?.id===sessionId;
  x.status='transcribing';if(inRoom()){renderChunks();broadcast?.('transcript',{chunk:x})}
  const f=new FormData();f.append('audio',blob,`canonical-${x.seq}.webm`);
  const vals={session_id:sessionId,room_token:roomToken,chunk_id:x.id,participant_id:x.participant_id,participant_name:x.participant_name,segment_no:x.segment_no,seq:x.seq,start_ms:x.start_ms,end_ms:x.end_ms,overlap_ms:x.overlap_ms||0,capture_window_ms:x.capture_window_ms||Math.max(0,x.end_ms-x.start_ms),capture_version:x.capture_version||'canonical-v2',audio_chunk_id:x.audio_chunk_id,provisional_text:'',language:'es',locale:'es-AR',mode:'canonical'};
  for(const [k,v] of Object.entries(vals))f.append(k,String(v));
  try{
    const r=await fetch(TRANSCRIBE,{method:'POST',body:f}),data=await r.json().catch(()=>({}));if(!r.ok||!data.ok){const err=new Error(data.detail||data.error||`transcripción ${r.status}`);err.status=r.status;throw err}
    const q=quality141(data.transcript||'');if(q.bad){const err=new Error(`QUALITY_GATE_CLIENT ${q.reasons.join(',')}`);err.status=422;throw err}
    x.status='ready';x.transcript=data.transcript||'';x.source=data.source||x.source;x.quality=data.quality||q;x.finished_processing_at=new Date().toISOString();if(inRoom()){broadcast?.('transcript',{chunk:x});renderChunks()}await updateFullDoc();
  }catch(e){
    const attempt=Number(job.attempt||0),status=Number(e.status||0),transient=!status||status===429||status>=500;
    if(transient&&attempt<2){x.status='queued';if(inRoom())renderChunks();setTimeout(()=>{transQueue.push({...job,attempt:attempt+1});pumpTranscription()},1800*Math.pow(2,attempt));return}
    x.status='error';x.error=String(e.message||e);if(inRoom()){broadcast?.('transcript',{chunk:x});renderChunks()}
  }
};

async function getStored14(key){const d=await openDB();return await new Promise((res,rej)=>{const t=d.transaction('chunks','readonly'),r=t.objectStore('chunks').get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
async function rebuildMaster14(sessionId){
  let m=null;try{m=JSON.parse(localStorage.getItem(`study:audio-master:v14:${sessionId}`)||'null')}catch{}
  if(!m?.count)return null;const parts=[];for(let i=1;i<=m.count;i++){const b=await getStored14(`master:${sessionId}:${String(i).padStart(6,'0')}`);if(b)parts.push(b)}
  return parts.length?new Blob(parts,{type:m.mime_type||'audio/webm'}):null;
}
if(window.PrometeoTranscriptionV14){window.PrometeoTranscriptionV14.quality=quality141;window.PrometeoTranscriptionV14.rebuildMaster=rebuildMaster14}
})();