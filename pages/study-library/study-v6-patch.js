(()=>{'use strict';

const V6_EXISTING=!!window.__STUDY_V6_EXISTING;
const CAPY='https://upload.wikimedia.org/wikipedia/commons/0/02/Capybara.jpg';
const COLORS=['#d8d1ff','#ffb4a2','#a8dadc','#ffd166','#b8f2e6','#cdb4db','#f4a261','#90caf9'];
const VOICES={
'es-AR-TomasNeural':['Tomás','Argentina','grave'],
'es-AR-ElenaNeural':['Elena','Argentina','clara'],
'es-MX-MarinaNeural':['Marina','México','infantil'],
'es-MX-JorgeNeural':['Jorge','México','profunda'],
'es-MX-CarlotaNeural':['Carlota','México','brillante'],
'es-CU-ManuelNeural':['Manuel','Cuba','caribe'],
'es-DO-EmilioNeural':['Emilio','R. Dominicana','caribe'],
'es-PR-KarinaNeural':['Karina','Puerto Rico','caribe'],
'es-PE-AlexNeural':['Alex','Perú','masculina'],
'es-UY-MateoNeural':['Mateo','Uruguay','rioplatense'],
'es-UY-ValentinaNeural':['Valentina','Uruguay','rioplatense'],
'es-VE-SebastianNeural':['Sebastián','Venezuela','masculina'],
'es-ES-TeoNeural':['Teo','España','masculina'],
'es-ES-TrianaNeural':['Triana','España','femenina']
};
const TTS6=U+'/functions/v1/casa-tts';
const prev={
 renderSession,renderRoster,renderChat,onBroadcast,openProfile,ensureProfile,trackPresence,
 queueSpeak,speak,sendChat,transcriptPanelHTML,updateRecUI
};
let walkCtx=null,walkSource=null,walkQueue=Promise.resolve(),pendingWalkie=null,profileTempAvatar=null;

function clean6(x,n=2000){return String(x??'').replace(/\s+/g,' ').trim().slice(0,n)}
function safeColor(x){return COLORS.includes(x)?x:COLORS[0]}
function defIntro(n){const x=clean6(n,40);return x?`Habla ${x}`:''}
function spoken6(m){
 const who=clean6(m.spoken_intro||m.spokenIntro||defIntro(m.author_name||m.name),60);
 const body=clean6(m.body||m.text,220);
 return `${who?who+'. ':''}${body}`.slice(0,300);
}
function b64buf(a){let s='',u=new Uint8Array(a);for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(s)}
function unb64(s){const x=atob(s),u=new Uint8Array(x.length);for(let i=0;i<x.length;i++)u[i]=x.charCodeAt(i);return u.buffer}
function profilePresence(){
 return Object.values(presence||{}).flat().filter(Boolean);
}
function voiceOwners(){
 const out=new Map();
 for(const p of profilePresence()){
   const v=p.voiceId||p.voice_id;
   if(!v||!VOICES[v])continue;
   if(!out.has(v))out.set(v,[]);
   out.get(v).push(p);
 }
 for(const xs of out.values())xs.sort((a,b)=>(+(a.voiceClaimAt||0)-+(b.voiceClaimAt||0))||String(a.participantId||'').localeCompare(String(b.participantId||'')));
 return out;
}
function voiceTaken(v){const x=voiceOwners().get(v)?.[0];return x&&x.participantId!==st.profile.id?x:null}
function saveLocalProfile(){save()}
function setSave6(text,kind=''){
 const e=$('#saveState');if(!e)return;
 e.textContent=text;e.dataset.kind=kind;e.classList.add('visible');
 clearTimeout(setSave6.t);if(kind==='ok')setSave6.t=setTimeout(()=>e.classList.remove('visible'),1100);
}
function migrateProfile(){
 st.profile.color=safeColor(st.profile.color);
 st.profile.spokenIntro=clean6(st.profile.spokenIntro,60)||defIntro(st.profile.name);
 st.profile.voiceClaimAt=Number(st.profile.voiceClaimAt||Date.now());
 st.audio=st.audio||{};
 if(typeof st.audio.walkie!=='boolean')st.audio.walkie=true;
 if(V6_EXISTING&&st.profile.name==='Vos'){
   st.profile.name='Colo';
   st.profile.spokenIntro='Habla Colo';
   if(!st.profile.avatar)st.profile.avatar=CAPY;
 }
 if(!V6_EXISTING&&st.profile.name==='Vos'){
   st.profile.name='Participante';
   st.profile.voice='';
   st.profile.spokenIntro='';
   window.__STUDY_V6_FIRST_PROFILE=true;
 }
 if(st.profile.name==='Colo'&&!st.profile.avatar)st.profile.avatar=CAPY;
 saveLocalProfile();
}
migrateProfile();

async function ensureProfile6(){
 if(!roomClient||!room)return;
 const row={
   session_id:room.id,
   participant_id:st.profile.id,
   display_name:st.profile.name||'Participante',
   avatar_data:st.profile.avatar||null,
   voice_id:st.profile.voice||'',
   color:safeColor(st.profile.color),
   spoken_intro:st.profile.spokenIntro||defIntro(st.profile.name),
   last_seen_at:new Date().toISOString()
 };
 const q=await roomClient.from('study_participants').upsert(row,{onConflict:'session_id,participant_id'});
 if(!q.error)participants[st.profile.id]=row;
}
ensureProfile=ensureProfile6;

async function trackPresence6(activity='online',blockId=null){
 if(!channel)return;
 await channel.track({
   participantId:st.profile.id,
   name:st.profile.name,
   avatar:st.profile.avatar||'',
   color:safeColor(st.profile.color),
   voiceId:st.profile.voice||'',
   voiceClaimAt:Number(st.profile.voiceClaimAt||0),
   spokenIntro:st.profile.spokenIntro||defIntro(st.profile.name),
   activity,blockId,at:Date.now()
 });
}
trackPresence=trackPresence6;

function renderRoster6(){
 const r=$('#roster');if(!r)return;
 const onlineIds=new Set();
 for(const p of profilePresence())if(p.participantId)onlineIds.add(p.participantId);
 if(!onlineIds.size)onlineIds.add(st.profile.id);
 r.innerHTML=[...onlineIds].map(id=>{
   const live=profilePresence().find(x=>x.participantId===id);
   const p=participants[id]||{};
   const name=live?.name||p.display_name||(id===st.profile.id?st.profile.name:'Participante');
   const avatar=live?.avatar||p.avatar_data||(id===st.profile.id?st.profile.avatar:'');
   const col=safeColor(live?.color||p.color||(id===st.profile.id?st.profile.color:''));
   const act=live?.activity||'online';
   return `<div class="player" title="${esc(name+' · '+act)}" style="--person:${col}">
     <div class="avatar">${avatar?`<img src="${esc(avatar)}" alt="">`:esc(initials(name))}<i class="activityDot"></i></div>
     <div class="playerText"><div class="playerName">${esc(name)}</div><div class="playerState">${esc(act)}</div></div>
   </div>`;
 }).join('');
}
renderRoster=renderRoster6;

async function audioUnlock6(){
 try{
   walkCtx||=new(window.AudioContext||window.webkitAudioContext)();
   if(walkCtx.state!=='running')await walkCtx.resume();
   return walkCtx.state==='running';
 }catch{return false}
}
function stopWalkie(){
 try{walkSource?.stop()}catch{}
 walkSource=null;walkQueue=Promise.resolve();
 if('speechSynthesis'in window)try{speechSynthesis.cancel()}catch{}
}
async function tts6(text,voice){
 const r=await fetch(TTS6,{
   method:'POST',
   headers:{'content-type':'application/json',apikey:K},
   body:JSON.stringify({text,voice:voice||'es-AR-TomasNeural'})
 });
 if(!r.ok)throw new Error('tts '+r.status);
 return r.arrayBuffer();
}
async function playBuf6(buf){
 const unlocked=await audioUnlock6();
 if(unlocked&&walkCtx){
   try{
     const decoded=await walkCtx.decodeAudioData(buf.slice(0));
     await new Promise((res,rej)=>{
       const src=walkCtx.createBufferSource(),gain=walkCtx.createGain();
       walkSource=src;src.buffer=decoded;gain.gain.value=Math.max(0,Math.min(1,Number(st.audio.volume??.85)));
       src.connect(gain);gain.connect(walkCtx.destination);src.onended=res;
       try{src.start()}catch(e){rej(e)}
     });
     return;
   }catch{}
 }
 const u=URL.createObjectURL(new Blob([buf],{type:'audio/mpeg'}));
 try{
   const a=new Audio(u);a.volume=Math.max(0,Math.min(1,Number(st.audio.volume??.85)));
   await a.play();await new Promise((res,rej)=>{a.onended=res;a.onerror=rej});
 }finally{URL.revokeObjectURL(u)}
}
async function speak6(m,row=null,interrupt=false){
 if(interrupt)stopWalkie();
 walkQueue=walkQueue.catch(()=>{}).then(async()=>{
   row?.classList.add('speaking');
   try{
     const buf=m.audio_b64?unb64(m.audio_b64):m.audioB64?unb64(m.audioB64):await tts6(spoken6(m),m.voice_id||m.voiceId||'es-AR-TomasNeural');
     await playBuf6(buf);
   }catch(e){
     if('speechSynthesis'in window){
       try{
         const u=new SpeechSynthesisUtterance(spoken6(m));u.lang='es-AR';
         await new Promise((res,rej)=>{u.onend=res;u.onerror=rej;speechSynthesis.speak(u)});
       }catch{
         pendingWalkie=m;showPendingWalkie();
       }
     }else{pendingWalkie=m;showPendingWalkie()}
   }finally{row?.classList.remove('speaking')}
 });
 return walkQueue;
}
queueSpeak=speak6;speak=speak6;

function showPendingWalkie(){
 const b=$('#walkPending');if(!b)return;
 b.classList.toggle('hide',!pendingWalkie);
 if(pendingWalkie)b.textContent='▶ reproducir · '+clean6(pendingWalkie.author_name||pendingWalkie.name,20);
}
function walkVoiceLabel(v){return VOICES[v]?.[0]||'elegir voz'}

function chatPanelHTML6(){
 const v=walkVoiceLabel(st.profile.voice);
 return `<div class="walkTop">
   <button id="auto" class="walkToggle">${st.audio.walkie?'VOL':'MUTE'}</button>
   <button id="walkVoice" class="walkVoice">V: ${esc(v)}</button>
   <label class="walkVolume" title="Volumen"><input id="vol" type="range" min="0" max="1" step=".05" value="${Number(st.audio.volume??.85)}"></label>
 </div>
 <div class="chatList walkMessages" id="chatList"></div>
 <button id="walkPending" class="walkPending hide"></button>
 <div class="chatComposer walkComposer">
   <button class="walkProfileMini" id="walkProfile" title="Perfil">${st.profile.avatar?`<img src="${esc(st.profile.avatar)}" alt="">`:esc(initials(st.profile.name))}</button>
   <input class="chatInput" id="chatInput" placeholder="Escribir transmisión…" maxlength="220">
   <button class="walkTx" id="sendChat">TX</button>
 </div>`;
}
chatPanelHTML=chatPanelHTML6;

function renderChat6(){
 const el=$('#chatList');if(!el)return;
 el.innerHTML=chat.map(m=>{
   const mine=m.author_id===st.profile.id;
   const pp=participants[m.author_id]||{};
   const avatar=pp.avatar_data||'';
   const col=safeColor(m.author_color||pp.color);
   const voice=walkVoiceLabel(m.voice_id);
   return `<article class="walkMsg ${mine?'mine':''}" data-msg="${m.id}" style="--msg:${col}">
     ${!mine?`<div class="walkAvatar">${avatar?`<img src="${esc(avatar)}" alt="">`:esc(initials(m.author_name))}</div>`:''}
     <div class="walkBody">
       <div class="walkMeta"><b>${esc(m.author_name)}</b><span>${esc(fmtClock(m.created_at))}</span><button class="walkReplay" data-speak="${m.id}">▶ ${esc(voice)}</button></div>
       <div class="walkBubble">${esc(m.body)}</div>
     </div>
     ${mine?`<div class="walkAvatar">${avatar?`<img src="${esc(avatar)}" alt="">`:esc(initials(m.author_name))}</div>`:''}
   </article>`;
 }).join('')||'<div class="walkEmpty">Canal abierto · los mensajes quedan guardados.</div>';
 $$('[data-speak]').forEach(b=>b.onclick=async()=>{await audioUnlock6();const m=chat.find(x=>x.id===b.dataset.speak);if(m)speak6(m,b.closest('.walkMsg'),true)});
 el.scrollTop=el.scrollHeight;
 if(typeof updateChatTab==='function')try{updateChatTab()}catch{}
}
renderChat=renderChat6;

async function sendChat6(){
 const i=$('#chatInput'),body=i?.value.trim();
 if(!body||!roomClient)return;
 if(!st.profile.voice||!VOICES[st.profile.voice]){
   toast('Elegí una voz para el Walkie');
   openProfile6();return;
 }
 await audioUnlock6();
 const send=$('#sendChat');if(send){send.disabled=true;send.textContent='…'}
 const now=new Date().toISOString();
 let audio_b64=null;
 const spoken_intro=st.profile.spokenIntro||defIntro(st.profile.name);
 try{
   const buf=await tts6(`${spoken_intro}. ${body}`.slice(0,300),st.profile.voice);
   const x=b64buf(buf);if(x.length<175000)audio_b64=x;
 }catch{}
 const dbMessage={
   id:crypto.randomUUID(),session_id:room.id,author_id:st.profile.id,author_name:st.profile.name,
   author_color:safeColor(st.profile.color),spoken_intro,body,voice_id:st.profile.voice,
   audio_mode:'casa',audio_b64:null,created_at:now
 };
 const q=await roomClient.from('study_chat_messages').insert(dbMessage).select('*').single();
 if(send){send.disabled=false;send.textContent='TX'}
 if(q.error){toast('No se pudo enviar');return}
 const liveMessage={...q.data,audio_b64};
 i.value='';chat.push(liveMessage);renderChat();broadcast('chat',{message:liveMessage});
 if(st.audio.walkie)speak6(liveMessage,$(`.walkMsg[data-msg="${liveMessage.id}"]`));
 setActivity('chat');setTimeout(()=>setActivity('online'),900);
}
sendChat=sendChat6;

function onBroadcast6(p){
 if(!p||p.from===st.profile.id)return;
 if(p.type==='chat'){
   if(!chat.some(x=>x.id===p.message.id)){
     chat.push(p.message);renderChat();
     if(st.audio.walkie&&document.visibilityState==='visible')speak6(p.message,$(`.walkMsg[data-msg="${p.message.id}"]`));
     else if(st.audio.walkie){pendingWalkie=p.message;showPendingWalkie()}
   }
   return;
 }
 prev.onBroadcast(p);
}
onBroadcast=onBroadcast6;

function transcriptPanelHTML6(){
 return `<div class="recordBox recV6">
   <div class="recIdle" id="recIdle"><button class="recStartV6" id="recStart"><span class="recStartDot"></span><b>Grabar clase</b></button></div>
   <div class="recLiveBar hide" id="recLiveBar">
     <div class="recState" id="recState"><i class="recDot"></i><span id="recLabel">grabando</span></div>
     <div class="timer" id="timer">00:00</div>
     <div class="recLiveActions"><button class="recBtn" id="recBreak">pausar</button><button class="recBtn recFinishV6" id="recFinish">finalizar</button></div>
   </div>
   <div class="preview" id="preview">El micrófono queda continuo; la transcripción aparece por tramos mientras la clase sigue.</div>
 </div>
 <div class="tabs transTabs"><button class="tab on" data-trans="live">en vivo</button><button class="tab" data-trans="full">completa</button></div>
 <div class="chunks" id="chunks"></div><div class="fullTranscript hide" id="fullTranscript"></div>`;
}
transcriptPanelHTML=transcriptPanelHTML6;

function updateRecUI6(){
 const idle=$('#recIdle'),bar=$('#recLiveBar'),start=$('#recStart'),br=$('#recBreak'),fin=$('#recFinish'),state=$('#recState');
 if(!start)return;
 idle?.classList.toggle('hide',recLive);
 bar?.classList.toggle('hide',!recLive);
 start.disabled=recLive;
 if(br){br.disabled=!recLive;br.textContent=recPaused?'reanudar':'pausar'}
 if(fin)fin.disabled=!recLive;
 if(state)state.classList.toggle('live',recLive&&!recPaused);
 if($('#recLabel'))$('#recLabel').textContent=recPaused?'pausado':'grabando';
}
updateRecUI=updateRecUI6;

function capBoardSnapshot(){
 try{
   const f=$('#boardFrame'),c=f?.contentDocument?.querySelector('.wbCanvas');
   if(!c||!c.width||!c.height)return null;
   const maxW=1000,scale=Math.min(1,maxW/c.width),o=document.createElement('canvas');
   o.width=Math.max(1,Math.round(c.width*scale));o.height=Math.max(1,Math.round(c.height*scale));
   o.getContext('2d').drawImage(c,0,0,o.width,o.height);
   return o.toDataURL('image/webp',.74);
 }catch{return null}
}
async function persistBoardState6(){
 try{
   const topic=`class-${room.id}`,key=`study:v2:modelos-teorias-ii:whiteboard-v7:${topic}`,raw=localStorage.getItem(key);
   if(!raw)return;
   const state=JSON.parse(raw);
   await roomClient.from('study_board_states').upsert({session_id:room.id,state,revision:Date.now(),updated_by:st.profile.name,updated_at:new Date().toISOString()},{onConflict:'session_id'});
 }catch{}
}
async function saveBoardToNotes6(){
 const image=capBoardSnapshot();
 if(!image){toast('Todavía no hay una imagen del pizarrón');return}
 const btn=$('#saveBoardNote');if(btn){btn.disabled=true;btn.textContent='guardando…'}
 await persistBoardState6();
 const sorted=[...notes].filter(n=>!n.deleted_at).sort((a,b)=>a.position-b.position);
 const now=new Date().toISOString(),n={
   id:crypto.randomUUID(),session_id:room.id,block_key:crypto.randomUUID(),
   position:(sorted.at(-1)?.position||0)+1,content:'',author_id:st.profile.id,author_name:st.profile.name,
   last_editor_id:st.profile.id,last_editor_name:st.profile.name,revision:1,block_type:'board',
   payload:{image,board_topic:`class-${room.id}`,saved_at:now},created_at:now,updated_at:now
 };
 const q=await roomClient.from('study_note_blocks').insert(n).select('*').single();
 if(btn){btn.disabled=false;btn.textContent='guardar en notas'}
 if(q.error){setSave6('sin red','error');toast('No se pudo guardar');return}
 notes.push(q.data);
 renderNotes();
 broadcast('note',{block:q.data});syncDoc();
 setSave6('guardado','ok');
 toast('Pizarrón guardado en notas');
}

function profileOptionsHTML(){
 const owners=voiceOwners();
 return Object.entries(VOICES).map(([id,v])=>{
   const owner=owners.get(id)?.[0],taken=owner&&owner.participantId!==st.profile.id;
   return `<option value="${id}" ${st.profile.voice===id?'selected':''} ${taken?'disabled':''}>${v[0]} · ${v[1]} · ${v[2]}${taken?' · en uso por '+esc(owner.name||'alguien'):''}</option>`;
 }).join('');
}
function openProfile6(){
 $('#profileSheet')?.remove();
 profileTempAvatar=st.profile.avatar||'';
 const col=safeColor(st.profile.color);
 document.body.insertAdjacentHTML('beforeend',`<div class="profileSheet" id="profileSheet"><div class="sheet profileV6">
   <div class="profileHead"><div><h2>Perfil de clase</h2><p>Esto es lo que ven y escuchan los demás.</p></div><button id="cancelProfile" class="profileClose">×</button></div>
   <div class="profileMain">
     <button class="profilePreview profilePhotoV6" id="profilePhotoButton">${profileTempAvatar?`<img id="profilePreviewImg" src="${esc(profileTempAvatar)}" alt="">`:`<span id="profilePreviewFallback">${esc(initials(st.profile.name))}</span>`}</button>
     <input id="avatarFile" class="hide" type="file" accept="image/*">
     <div class="profileFields">
       <div class="field"><label>NOMBRE</label><input id="profileName" value="${esc(st.profile.name)}" maxlength="40"></div>
       <div class="field"><label>IDENTIFICADOR HABLADO</label><input id="profileIntro" value="${esc(st.profile.spokenIntro||defIntro(st.profile.name))}" maxlength="60"></div>
     </div>
   </div>
   <div class="field"><label>COLOR EN EL CHAT</label><div class="colorChoices">${COLORS.map(c=>`<button type="button" class="colorChoice ${c===col?'on':''}" data-color="${c}" style="--c:${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
   <div class="field voiceField"><label>VOZ WALKIE</label><div class="voiceSelectRow"><select id="profileVoice"><option value="">Elegir voz…</option>${profileOptionsHTML()}</select><button id="previewVoice" class="voicePreview6">▶ probar</button></div></div>
   <div class="sheetActions"><button class="linkBtn" id="cancelProfile2">cancelar</button><button class="primary" id="saveProfile">guardar</button></div>
 </div></div>`);
 let selectedColor=col;
 const photoButton=$('#profilePhotoButton'),file=$('#avatarFile');
 photoButton.onclick=()=>file.click();
 file.onchange=async e=>{
   const f=e.target.files?.[0];if(!f)return;
   try{profileTempAvatar=await avatarData(f);photoButton.innerHTML=`<img id="profilePreviewImg" src="${profileTempAvatar}" alt="">`}catch{toast('No pude leer esa foto')}
 };
 $$('[data-color]').forEach(b=>b.onclick=()=>{selectedColor=safeColor(b.dataset.color);$$('[data-color]').forEach(x=>x.classList.toggle('on',x===b))});
 $('#previewVoice').onclick=async()=>{
   const v=$('#profileVoice').value;if(!v)return toast('Elegí una voz');
   await audioUnlock6();
   speak6({body:`Probando ${VOICES[v][0]}. Esta es mi voz en Walkie Chat.`,author_name:'',spoken_intro:'',voice_id:v},null,true);
 };
 const close=()=>$('#profileSheet')?.remove();
 $('#cancelProfile').onclick=$('#cancelProfile2').onclick=close;
 $('#saveProfile').onclick=async()=>{
   const name=clean6($('#profileName').value,40)||'Participante',voice=$('#profileVoice').value;
   if(voice&&voiceTaken(voice)){toast('Esa voz ya está en uso');return}
   const changedVoice=voice!==st.profile.voice;
   st.profile.name=name;st.profile.avatar=profileTempAvatar||'';st.profile.color=selectedColor;
   st.profile.spokenIntro=clean6($('#profileIntro').value,60)||defIntro(name);
   st.profile.voice=voice;
   if(changedVoice)st.profile.voiceClaimAt=Date.now();
   saveLocalProfile();await ensureProfile6();await trackPresence6('online');
   participants[st.profile.id]={...participants[st.profile.id],display_name:name,avatar_data:st.profile.avatar,color:selectedColor,voice_id:voice,spoken_intro:st.profile.spokenIntro};
   broadcast('profile',{participant:participants[st.profile.id]});
   close();renderRoster();renderChat();patchSessionControls();toast('Perfil guardado');
 };
}
openProfile=openProfile6;

function patchSessionControls(){
 $('#saveBoardNote')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();saveBoardToNotes6()},{capture:true,once:false});
 const auto=$('#auto');
 if(auto){
   auto.textContent=st.audio.walkie?'VOL':'MUTE';
   auto.onclick=async()=>{await audioUnlock6();st.audio.walkie=!st.audio.walkie;st.audio.autoplay=st.audio.walkie;saveLocalProfile();auto.textContent=st.audio.walkie?'VOL':'MUTE';auto.classList.toggle('off',!st.audio.walkie);if(!st.audio.walkie)stopWalkie()};
   auto.classList.toggle('off',!st.audio.walkie);
 }
 const vol=$('#vol');if(vol)vol.oninput=e=>{st.audio.volume=Number(e.target.value);saveLocalProfile()};
 $('#walkVoice')?.addEventListener('click',openProfile6);
 $('#walkProfile')?.addEventListener('click',openProfile6);
 const pending=$('#walkPending');if(pending)pending.onclick=async()=>{await audioUnlock6();if(pendingWalkie){const m=pendingWalkie;pendingWalkie=null;showPendingWalkie();speak6(m,null,true)}};
 const send=$('#sendChat');if(send)send.disabled=!st.profile.voice;
 showPendingWalkie();
 updateRecUI6();
}
const renderSession5=renderSession;
renderSession=function(){
 renderSession5();
 setTimeout(()=>{patchSessionControls();renderRoster6();renderChat6();if(window.__STUDY_V6_FIRST_PROFILE&&!localStorage.getItem('study_v6_profile_configured')){localStorage.setItem('study_v6_profile_configured','1');setTimeout(openProfile6,250)}},0);
};

document.addEventListener('pointerdown',()=>audioUnlock6(),{once:true,capture:true});
document.addEventListener('keydown',()=>audioUnlock6(),{once:true,capture:true});

try{
 if(view==='session'&&room){
   ensureProfile6().catch(()=>{});
   renderSession();
 }
}catch(e){console.warn('study v6 mount',e)}

window.__STUDY_V6=true;
})();