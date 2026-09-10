(()=>{'use strict';
if(window.__STUDY_V7)return;
window.__STUDY_V7=true;

const AUDIO_API=U+'/functions/v1/casa-room-audio';
const CAPY='https://upload.wikimedia.org/wikipedia/commons/0/02/Capybara.jpg';
const COLORS7=['#d8d1ff','#ffb4a2','#a8dadc','#ffd166','#b8f2e6','#cdb4db','#f4a261','#90caf9'];
const FUN_VOICES=[
 ['sergeant','Sargento fósil','90+ · militar · destruido'],
 ['otaku','Otaku turbo','agudísima · anime · caos'],
 ['grandma','Abuela furiosa','anciana · ronca · indignada'],
 ['goblin','Duende nervioso','nasal · mini · rapidísimo'],
 ['giant','Gigante tonto','gravísimo · lento · feliz'],
 ['evilkid','Nene malvado','agudo · dulce · siniestro'],
 ['apocalypse','Apocalipsis','épico · enorme · absurdo'],
 ['novela','Telenovela','melodrama · traición total'],
 ['witch','Bruja seca','vieja · chillona · torcida'],
 ['gamer','Gamer 2007','nasal · gritón · cafeína'],
 ['barman','Viejo de bar','cascado · lento · risitas'],
 ['fairy','Hada tóxica','ultra aguda · dulce · venenosa']
];
const VOICE7=Object.fromEntries(FUN_VOICES.map(v=>[v[0],v]));
const old={renderLibrary,renderCourse,renderSession,renderRoster,renderChat,onBroadcast,openProfile,ensureProfile,trackPresence,sendChat,queueSpeak,speak,wireSession};
let globalChannel=null,globalPresence={},globalProfiles={},globalActivity='library',profileItemsDraft=[];
let audioCtx7=null,audioSource7=null,audioQueue7=Promise.resolve();
let prep7=null,prepAbort7=null,prepTimer7=null,prepVersion7=0;

const clean7=(x,n=2000)=>String(x??'').replace(/\s+/g,' ').trim().slice(0,n);
const safeColor7=x=>COLORS7.includes(x)?x:COLORS7[0];
const voiceLabel7=id=>VOICE7[id]?.[1]||'elegir voz';
const defaultIntro7=n=>clean7(n,40)?`Habla ${clean7(n,40)}`:'';
const courseName7=id=>C[id]?.name||id||'';
function normalize7(){
 st.profile=st.profile||{};
 if(st.profile.name==='Vos')st.profile.name='Colo';
 if(st.profile.name==='Colo'&&!st.profile.avatar)st.profile.avatar=CAPY;
 st.profile.color=safeColor7(st.profile.color);
 if(!VOICE7[st.profile.voice])st.profile.voice='giant';
 st.profile.spokenIntro=clean7(st.profile.spokenIntro,60)||defaultIntro7(st.profile.name);
 st.profile.voiceClaimAt=Number(st.profile.voiceClaimAt||Date.now());
 st.profile.items=Array.isArray(st.profile.items)?st.profile.items.slice(0,10):[];
 st.audio=st.audio||{};
 if(typeof st.audio.walkie!=='boolean')st.audio.walkie=true;
 if(typeof st.audio.volume!=='number')st.audio.volume=.85;
 save();
}
normalize7();

function globalFlat7(){
 const xs=Object.values(globalPresence||{}).flat().filter(x=>x?.participantId);
 const m=new Map();
 for(const p of xs){
   const cur=m.get(p.participantId);
   const rank=x=>(x.sessionId?4:x.courseId?2:1)+(x.activity==='grabando'?3:0)+(x.activity==='editando notas'?1:0);
   if(!cur||rank(p)>=rank(cur))m.set(p.participantId,p);
 }
 if(!m.has(st.profile.id))m.set(st.profile.id,{participantId:st.profile.id,name:st.profile.name,avatar:st.profile.avatar,color:st.profile.color,view,courseId:course,courseName:course?courseName7(course):'',sessionId:room?.id||null,roomToken:room?.token||null,classTitle:room?.title||'',activity:globalActivity,at:Date.now()});
 return [...m.values()];
}
function pendingTrans7(){return Array.isArray(chunks)&&chunks.some(x=>['queued','transcribing'].includes(x.status))}
function status7(p){
 if(p.activity==='grabando')return 'transcribiendo audio';
 if(p.activity==='recreo')return 'grabación pausada';
 if(p.activity==='editando notas')return 'escribiendo notas';
 if(p.activity==='chat')return 'en Walkie Chat';
 if(p.activity==='pizarrón')return 'en el pizarrón';
 if(p.processing)return 'procesando transcripción';
 if(p.sessionId)return 'en clase';
 if(p.courseId)return 'viendo '+(p.courseName||courseName7(p.courseId));
 return 'mirando materias';
}
function globalState7(activity=globalActivity){
 let a=activity||'online';
 if(view==='session'&&recLive&&!recPaused)a='grabando';
 return {
   participantId:st.profile.id,name:st.profile.name,avatar:st.profile.avatar||'',color:safeColor7(st.profile.color),
   view,courseId:room?.courseId||course||null,courseName:courseName7(room?.courseId||course),
   sessionId:room?.id||null,roomToken:room?.token||null,classTitle:room?.title||'',
   activity:a,processing:view==='session'&&pendingTrans7(),recording:view==='session'&&recLive&&!recPaused,
   profileVersion:Date.now(),at:Date.now()
 };
}
async function globalTrack7(activity){
 if(activity)globalActivity=activity;
 if(!globalChannel)return;
 try{await globalChannel.track(globalState7(globalActivity))}catch{}
}
async function persistGlobalProfile7(){
 const row={participant_id:st.profile.id,display_name:st.profile.name||'Participante',avatar_data:st.profile.avatar||null,color:safeColor7(st.profile.color),voice_id:st.profile.voice||'giant',voice_claim_at:Number(st.profile.voiceClaimAt||0),spoken_intro:st.profile.spokenIntro||defaultIntro7(st.profile.name),profile_items:st.profile.items||[],updated_at:new Date().toISOString()};
 const q=await sb.from('study_global_profiles').upsert(row,{onConflict:'participant_id'}).select('*').maybeSingle();
 if(!q.error&&q.data)globalProfiles[st.profile.id]=q.data;
 return q;
}
async function fetchProfiles7(){
 const ids=globalFlat7().map(x=>x.participantId).filter(Boolean);
 if(!ids.length)return;
 const q=await sb.from('study_global_profiles').select('*').in('participant_id',ids);
 if(!q.error)for(const p of q.data||[])globalProfiles[p.participant_id]=p;
}
async function connectGlobal7(){
 if(globalChannel)return;
 globalChannel=sb.channel('study-global-v7',{config:{presence:{key:st.profile.id},broadcast:{self:true}}});
 globalChannel.on('presence',{event:'sync'},async()=>{globalPresence=globalChannel.presenceState();await fetchProfiles7();renderGlobalSurface7();renderRoster7()});
 globalChannel.on('broadcast',{event:'global'},async({payload})=>{if(payload?.type==='profile'){await fetchProfiles7();renderGlobalSurface7();renderRoster7()}if(payload?.type==='state')renderGlobalSurface7()});
 globalChannel.subscribe(async s=>{if(s==='SUBSCRIBED'){await persistGlobalProfile7();await globalTrack7(view==='session'?'online':view==='course'?'course':'library');await fetchProfiles7();renderGlobalSurface7();if(shouldPromptProfile7())setTimeout(()=>openProfile7(true),300)}});
}
function shouldPromptProfile7(){return !localStorage.getItem('study_v7_profile_configured')&&(st.profile.name==='Participante'||window.__STUDY_V6_FIRST_PROFILE)}
function avatarMarkup7(p,cls='communityAvatar'){
 const src=p.avatar||p.avatar_data||'';const name=p.name||p.display_name||'Participante';
 return `<span class="${cls}" style="--person:${safeColor7(p.color)}">${src?`<img src="${esc(src)}" alt="">`:esc(initials(name))}</span>`;
}
function profileData7(id){
 const live=globalFlat7().find(x=>x.participantId===id)||{};const dbp=globalProfiles[id]||{};
 return {participantId:id,name:dbp.display_name||live.name||(id===st.profile.id?st.profile.name:'Participante'),avatar:dbp.avatar_data||live.avatar||(id===st.profile.id?st.profile.avatar:''),color:safeColor7(dbp.color||live.color||(id===st.profile.id?st.profile.color:'')),voice:dbp.voice_id||(id===st.profile.id?st.profile.voice:''),spokenIntro:dbp.spoken_intro||'',items:Array.isArray(dbp.profile_items)?dbp.profile_items:[],live};
}
function activeRooms7(){
 const map=new Map();
 for(const p of globalFlat7())if(p.sessionId&&p.roomToken){
   let r=map.get(p.sessionId);if(!r){r={sessionId:p.sessionId,roomToken:p.roomToken,courseId:p.courseId,courseName:p.courseName||courseName7(p.courseId),classTitle:p.classTitle||'Clase en vivo',people:[]};map.set(p.sessionId,r)}
   r.people.push(p);
 }
 return [...map.values()];
}
function renderGlobalSurface7(){
 if(view==='session'){document.querySelector('#communityV7')?.remove();return}
 const top=document.querySelector('.top');if(!top)return;
 let host=document.querySelector('#communityV7');if(!host){host=document.createElement('section');host.id='communityV7';host.className='communityV7';top.insertAdjacentElement('afterend',host)}
 const people=globalFlat7();const rooms=activeRooms7();
 host.innerHTML=`<div class="communityHead7"><b>${people.length} online</b><span>${rooms.length?rooms.length+' clase'+(rooms.length===1?'':'s')+' en vivo':'sin clases en vivo'}</span></div>
 <div class="communityPeople7">${people.map(p=>{const d=profileData7(p.participantId);return `<button class="personChip7" data-profile7="${esc(p.participantId)}" style="--person:${d.color}">${avatarMarkup7(d)}<span><b>${esc(d.name)}</b><small>${esc(status7(p))}${p.sessionId&&p.courseName?' · '+esc(p.courseName):''}</small></span></button>`}).join('')}</div>
 ${rooms.length?`<div class="liveRooms7">${rooms.map(r=>`<article class="liveRoom7"><div class="liveRoomPeople7">${r.people.slice(0,4).map(p=>avatarMarkup7(profileData7(p.participantId),'liveMini7')).join('')}</div><div class="liveRoomText7"><b>${esc(r.courseName||'Materia')}</b><span>${esc(r.classTitle)} · ${r.people.length} online</span></div><button class="joinRoom7" data-join-session="${esc(r.sessionId)}" data-join-token="${esc(r.roomToken)}">unirme</button></article>`).join('')}</div>`:''}`;
 host.querySelectorAll('[data-profile7]').forEach(b=>b.onclick=()=>showProfileCard7(b.dataset.profile7));
 host.querySelectorAll('[data-join-session]').forEach(b=>b.onclick=()=>joinShared(b.dataset.joinSession,b.dataset.joinToken));
}

function renderProfileItem7(it){
 if(it.type==='image'&&String(it.data||'').startsWith('data:image/'))return `<figure class="profilePhotoItem7"><img src="${esc(it.data)}" alt=""><figcaption>${esc(it.caption||'')}</figcaption></figure>`;
 const label=clean7(it.label,40),value=clean7(it.value,240),href=safeHref7(value,label);
 return `<div class="profileDatum7"><small>${esc(label||'dato')}</small>${href?`<a href="${esc(href)}" target="_blank" rel="noopener">${esc(value)}</a>`:`<span>${esc(value)}</span>`}</div>`;
}
function safeHref7(v,label=''){
 const s=String(v||'').trim();
 if(/^https:\/\//i.test(s)||/^http:\/\//i.test(s))return s;
 if(/^www\./i.test(s))return 'https://'+s;
 if(/^@[A-Za-z0-9._]+$/.test(s)&&/insta/i.test(label))return 'https://instagram.com/'+s.slice(1);
 if(/^\+?[\d\s()\-]{7,}$/.test(s)&&/(tel|cel|whats|phone|número|numero)/i.test(label))return 'tel:'+s.replace(/[^+\d]/g,'');
 return '';
}
function showProfileCard7(id){
 document.querySelector('#profileCard7')?.remove();const d=profileData7(id),p=d.live||{},own=id===st.profile.id;
 document.body.insertAdjacentHTML('beforeend',`<div class="profileOverlay7" id="profileCard7"><article class="profileCard7" style="--person:${d.color}"><button class="profileClose7" id="closeProfileCard7">×</button><div class="profileCardHero7">${avatarMarkup7(d,'profileCardAvatar7')}<div><h2>${esc(d.name)}</h2><p>${esc(status7(p))}${p.courseName?' · '+esc(p.courseName):''}</p></div></div><div class="profileItemsView7">${d.items.length?d.items.map(renderProfileItem7).join(''):'<div class="profileEmpty7">Sin datos extra.</div>'}</div>${own?'<button class="primary profileEdit7" id="editOwnProfile7">editar perfil</button>':''}</article></div>`);
 $('#closeProfileCard7').onclick=()=>$('#profileCard7').remove();$('#profileCard7').onclick=e=>{if(e.target.id==='profileCard7')e.currentTarget.remove()};
 if(own)$('#editOwnProfile7').onclick=()=>{$('#profileCard7').remove();openProfile7(false)};
}
async function imageItem7(file){
 const img=await createImageBitmap(file),max=360,s=Math.min(img.width,img.height),sx=(img.width-s)/2,sy=(img.height-s)/2,c=document.createElement('canvas');c.width=c.height=max;const g=c.getContext('2d');g.drawImage(img,sx,sy,s,s,0,0,max,max);return c.toDataURL('image/jpeg',.72);
}
function renderProfileItemsEditor7(){
 const el=$('#profileItemsEditor7');if(!el)return;
 el.innerHTML=profileItemsDraft.map((it,i)=>it.type==='image'?`<div class="profileItemEdit7 image"><img src="${esc(it.data)}" alt=""><input data-item-caption="${i}" value="${esc(it.caption||'')}" placeholder="texto opcional"><button data-item-del="${i}">×</button></div>`:`<div class="profileItemEdit7"><input data-item-label="${i}" value="${esc(it.label||'')}" placeholder="qué es"><input data-item-value="${i}" value="${esc(it.value||'')}" placeholder="texto, link, @instagram, teléfono…"><button data-item-del="${i}">×</button></div>`).join('');
 el.querySelectorAll('[data-item-label]').forEach(x=>x.oninput=()=>profileItemsDraft[+x.dataset.itemLabel].label=x.value);
 el.querySelectorAll('[data-item-value]').forEach(x=>x.oninput=()=>profileItemsDraft[+x.dataset.itemValue].value=x.value);
 el.querySelectorAll('[data-item-caption]').forEach(x=>x.oninput=()=>profileItemsDraft[+x.dataset.itemCaption].caption=x.value);
 el.querySelectorAll('[data-item-del]').forEach(x=>x.onclick=()=>{profileItemsDraft.splice(+x.dataset.itemDel,1);renderProfileItemsEditor7()});
}
function roomVoiceOwner7(id){
 if(!room||!channel)return null;const all=Object.values(presence||{}).flat();return all.find(p=>p.participantId!==st.profile.id&&p.voiceId===id)||null;
}
function voiceOptions7(){return FUN_VOICES.map(([id,label,desc])=>{const owner=roomVoiceOwner7(id);return `<option value="${id}" ${st.profile.voice===id?'selected':''} ${owner?'disabled':''}>${esc(label)} · ${esc(desc)}${owner?' · en uso por '+esc(owner.name||'alguien'):''}</option>`}).join('')}
function openProfile7(first=false){
 document.querySelector('#profileSheet')?.remove();profileItemsDraft=(st.profile.items||[]).map(x=>({...x}));let tempAvatar=st.profile.avatar||'',tempColor=safeColor7(st.profile.color);
 document.body.insertAdjacentHTML('beforeend',`<div class="profileSheet" id="profileSheet"><div class="sheet profileV7"><div class="profileHead7"><div><h2>${first?'Elegí tu perfil':'Tu perfil'}</h2><p>Se ve en la biblioteca y dentro de las clases.</p></div>${first?'':`<button id="cancelProfile7" class="profileClose7">×</button>`}</div><div class="profileCore7"><button id="profileAvatar7" class="profileAvatarEdit7">${tempAvatar?`<img src="${esc(tempAvatar)}" alt="">`:esc(initials(st.profile.name))}</button><input id="profileAvatarFile7" class="hide" type="file" accept="image/*"><div><label>NOMBRE</label><input id="profileName7" value="${esc(st.profile.name==='Participante'?'':st.profile.name)}" maxlength="40" placeholder="Tu nombre"><label>IDENTIFICADOR HABLADO</label><input id="profileIntro7" value="${esc(st.profile.spokenIntro||'')}" maxlength="60" placeholder="Habla Colo"></div></div><label>COLOR</label><div class="colorChoices7">${COLORS7.map(c=>`<button data-color7="${c}" class="colorChoice7 ${c===tempColor?'on':''}" style="--c:${c}"></button>`).join('')}</div><label>VOZ WALKIE</label><div class="voicePick7"><select id="profileVoice7">${voiceOptions7()}</select><button id="previewVoice7">▶ probar</button></div><div class="profileExtrasHead7"><label>TUS DATOS</label><span>texto · links · contacto · fotos</span></div><div id="profileItemsEditor7"></div><div class="profileAdd7"><button id="addDatum7">+ dato</button><button id="addPhoto7">+ foto</button><input id="profilePhotoFile7" class="hide" type="file" accept="image/*"></div><div class="profilePrivacy7">Lo que agregues acá queda visible para quienes entren a esta biblioteca.</div><div class="sheetActions"><button class="primary" id="saveProfile7">guardar</button></div></div></div>`);
 renderProfileItemsEditor7();
 $('#profileAvatar7').onclick=()=>$('#profileAvatarFile7').click();
 $('#profileAvatarFile7').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{tempAvatar=await avatarData(f);$('#profileAvatar7').innerHTML=`<img src="${tempAvatar}" alt="">`}catch{toast('No pude leer esa foto')}};
 $$('[data-color7]').forEach(b=>b.onclick=()=>{tempColor=b.dataset.color7;$$('[data-color7]').forEach(x=>x.classList.toggle('on',x===b))});
 $('#addDatum7').onclick=()=>{if(profileItemsDraft.length>=10)return toast('Máximo 10 datos');profileItemsDraft.push({type:'field',label:'',value:''});renderProfileItemsEditor7()};
 $('#addPhoto7').onclick=()=>$('#profilePhotoFile7').click();
 $('#profilePhotoFile7').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const photos=profileItemsDraft.filter(x=>x.type==='image').length;if(photos>=4)return toast('Máximo 4 fotos');try{profileItemsDraft.push({type:'image',data:await imageItem7(f),caption:''});renderProfileItemsEditor7()}catch{toast('No pude leer esa foto')}};
 $('#previewVoice7').onclick=async()=>{const v=$('#profileVoice7').value;if(!v)return;const b=$('#previewVoice7');b.disabled=true;b.textContent='…';try{const id='study-preview-'+v+'-v2',r=await fetch(AUDIO_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({voice:v,text:`Hola. Soy ${VOICE7[v][1]}. Esta es mi voz.`,messageId:id})});if(!r.ok)throw 0;await playBlob7(await r.blob(),true)}catch{toast('La voz no respondió')}finally{b.disabled=false;b.textContent='▶ probar'}};
 if($('#cancelProfile7'))$('#cancelProfile7').onclick=()=>$('#profileSheet').remove();
 $('#saveProfile7').onclick=async()=>{const name=clean7($('#profileName7').value,40);if(!name)return toast('Elegí un nombre');const voice=$('#profileVoice7').value||'giant';if(roomVoiceOwner7(voice))return toast('Esa voz ya está en uso en esta clase');st.profile.name=name;st.profile.avatar=tempAvatar;st.profile.color=tempColor;st.profile.voice=voice;st.profile.voiceClaimAt=Date.now();st.profile.spokenIntro=clean7($('#profileIntro7').value,60)||defaultIntro7(name);st.profile.items=profileItemsDraft.filter(x=>x.type==='image'?x.data:clean7(x.value,240)).slice(0,10);save();localStorage.setItem('study_v7_profile_configured','1');await persistGlobalProfile7();if(room)await ensureProfile7();await globalTrack7(globalActivity);try{await old.trackPresence(globalActivity==='library'?'online':globalActivity)}catch{};globalChannel?.send({type:'broadcast',event:'global',payload:{type:'profile',from:st.profile.id}});$('#profileSheet').remove();renderGlobalSurface7();renderRoster7();if(view==='session'){renderChat7();setTimeout(wireV7Session,20)};toast('Perfil guardado')};
}
openProfile=openProfile7;

async function ensureProfile7(){
 if(!roomClient||!room)return;
 const row={session_id:room.id,participant_id:st.profile.id,display_name:st.profile.name,avatar_data:st.profile.avatar||null,voice_id:st.profile.voice||'giant',color:safeColor7(st.profile.color),spoken_intro:st.profile.spokenIntro||defaultIntro7(st.profile.name),last_seen_at:new Date().toISOString()};
 const q=await roomClient.from('study_participants').upsert(row,{onConflict:'session_id,participant_id'});
 if(!q.error)participants[st.profile.id]=row;
 await persistGlobalProfile7();
}
ensureProfile=ensureProfile7;

async function trackPresence7(activity='online',blockId=null){
 globalActivity=activity;
 try{await old.trackPresence(activity,blockId)}catch{}
 await globalTrack7(activity);
}
trackPresence=trackPresence7;

function renderRoster7(){
 const r=$('#roster');if(!r||view!=='session')return;
 const onlineIds=new Set();Object.values(presence||{}).flat().forEach(x=>x?.participantId&&onlineIds.add(x.participantId));if(!onlineIds.size)onlineIds.add(st.profile.id);
 r.innerHTML=[...onlineIds].map(id=>{const local=participants[id]||{},live=Object.values(presence||{}).flat().find(x=>x.participantId===id)||{},g=globalProfiles[id]||{},name=g.display_name||live.name||local.display_name||(id===st.profile.id?st.profile.name:'Participante'),avatar=g.avatar_data||live.avatar||local.avatar_data||(id===st.profile.id?st.profile.avatar:''),col=safeColor7(g.color||live.color||local.color||(id===st.profile.id?st.profile.color:'')),act=status7({...live,sessionId:room.id,courseName:courseName7(room.courseId),processing:pendingTrans7()});return `<button class="player playerV7" data-room-profile7="${esc(id)}" style="--person:${col}"><div class="avatar">${avatar?`<img src="${esc(avatar)}" alt="">`:esc(initials(name))}<i class="activityDot"></i></div><div class="playerText"><div class="playerName">${esc(name)}</div><div class="playerState">${esc(act)}</div></div></button>`}).join('');
 r.querySelectorAll('[data-room-profile7]').forEach(b=>b.onclick=()=>showProfileCard7(b.dataset.roomProfile7));
}
renderRoster=renderRoster7;

async function unlockAudio7(){try{audioCtx7||=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx7.state!=='running')await audioCtx7.resume();return audioCtx7.state==='running'}catch{return false}}
function stopAudio7(){try{audioSource7?.stop()}catch{}audioSource7=null;audioQueue7=Promise.resolve()}
async function playBlob7(blob,manual=false){
 await unlockAudio7();if(!audioCtx7)throw new Error('audio locked');const ab=await blob.arrayBuffer(),buf=await audioCtx7.decodeAudioData(ab.slice(0));await new Promise((res,rej)=>{const src=audioCtx7.createBufferSource(),gain=audioCtx7.createGain();audioSource7=src;src.buffer=buf;gain.gain.value=Math.max(0,Math.min(1,Number(st.audio.volume??.85)));src.connect(gain);gain.connect(audioCtx7.destination);src.onended=res;try{src.start()}catch(e){rej(e)}});
}
async function playMessage7(m,row,manual=false){
 if(!m)return;
 const url=m.audio_url||m.audioUrl||(m.audio_id?`${AUDIO_API}?id=${encodeURIComponent(m.audio_id)}`:'');
 if(!url){if(manual)toast('Este mensaje no tiene voz preparada');return}
 const queuedAt=Date.now();
 const job=async()=>{if(!manual&&Date.now()-queuedAt>20000)return;row?.classList.add('speaking');try{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw 0;await playBlob7(await r.blob(),manual)}catch{if(manual)toast('No pude reproducir esa voz')}finally{row?.classList.remove('speaking')}};
 if(manual){stopAudio7();return job()}
 audioQueue7=audioQueue7.catch(()=>{}).then(job);return audioQueue7;
}
queueSpeak=playMessage7;speak=playMessage7;

function chatPanelHTML7(){return `<div class="walkTop walkTop7"><button id="auto" class="walkToggle ${st.audio.walkie?'':'off'}">${st.audio.walkie?'VOL':'MUTE'}</button><button id="walkVoice" class="walkVoice">${esc(voiceLabel7(st.profile.voice))}</button><label class="walkVolume"><input id="vol" type="range" min="0" max="1" step=".05" value="${Number(st.audio.volume??.85)}"></label></div><div class="chatList walkMessages" id="chatList"></div><div id="walkDraftState7" class="walkDraftState7"></div><div class="chatComposer walkComposer"><button class="walkProfileMini" id="walkProfile">${st.profile.avatar?`<img src="${esc(st.profile.avatar)}" alt="">`:esc(initials(st.profile.name))}</button><input class="chatInput" id="chatInput" placeholder="Escribir transmisión…" maxlength="180"><button class="walkTx" id="sendChat">TX</button></div>`}
chatPanelHTML=chatPanelHTML7;
function renderChat7(){
 const el=$('#chatList');if(!el)return;el.innerHTML=chat.map(m=>{const mine=m.author_id===st.profile.id,p=participants[m.author_id]||globalProfiles[m.author_id]||{},avatar=p.avatar_data||'',col=safeColor7(m.author_color||p.color),voice=voiceLabel7(m.voice_id);return `<article class="walkMsg ${mine?'mine':''}" data-msg="${m.id}" style="--msg:${col}">${!mine?`<div class="walkAvatar">${avatar?`<img src="${esc(avatar)}" alt="">`:esc(initials(m.author_name))}</div>`:''}<div class="walkBody"><div class="walkMeta"><b>${esc(m.author_name)}</b><span>${esc(fmtClock(m.created_at))}</span><button class="walkReplay" data-speak7="${m.id}">▶ ${esc(voice)}</button></div><div class="walkBubble">${esc(m.body)}</div></div>${mine?`<div class="walkAvatar">${avatar?`<img src="${esc(avatar)}" alt="">`:esc(initials(m.author_name))}</div>`:''}</article>`}).join('')||'<div class="walkEmpty">Canal abierto · las voces llegan preparadas junto con el mensaje.</div>';
 el.querySelectorAll('[data-speak7]').forEach(b=>b.onclick=async()=>{await unlockAudio7();const m=chat.find(x=>x.id===b.dataset.speak7);if(m)playMessage7(m,b.closest('.walkMsg'),true)});el.scrollTop=el.scrollHeight;
}
renderChat=renderChat7;
function draftState7(text='',mode=''){const e=$('#walkDraftState7');if(e){e.textContent=text;e.dataset.mode=mode}}
function resetPrep7(){prepVersion7++;clearTimeout(prepTimer7);prepTimer7=null;try{prepAbort7?.abort()}catch{}prepAbort7=null;prep7=null;draftState7('');const b=$('#sendChat');if(b){b.disabled=false;b.textContent='TX'}}
async function prepareDraft7(sendWhenReady=false){
 const input=$('#chatInput');if(!input||!roomClient)return;const text=input.value.trim().slice(0,180);if(!text)return;
 if(!VOICE7[st.profile.voice]){openProfile7(false);return}
 if(prep7&&prep7.text===text&&prep7.voice===st.profile.voice){if(prep7.state==='ready')return sendWhenReady?transmitPrepared7():prep7;if(prep7.state==='loading'){if(sendWhenReady)prep7.sendWhenReady=true;return}}
 const version=++prepVersion7,msgId=crypto.randomUUID(),ctl=new AbortController();prepAbort7=ctl;prep7={state:'loading',text,voice:st.profile.voice,messageId:msgId,sendWhenReady};draftState7('preparando '+voiceLabel7(st.profile.voice)+'…','loading');const b=$('#sendChat');if(b){b.textContent='…';b.disabled=false}
 const timeout=setTimeout(()=>ctl.abort(),45000);
 try{
   const spoken=`${st.profile.spokenIntro||defaultIntro7(st.profile.name)}. ${text}`.slice(0,240);
   const r=await fetch(AUDIO_API,{method:'POST',headers:{'content-type':'application/json'},signal:ctl.signal,body:JSON.stringify({voice:st.profile.voice,text:spoken,messageId:msgId})});
   if(version!==prepVersion7)return;if(!r.ok)throw new Error('voice');const blob=await r.blob(),audioId=r.headers.get('x-casa-audio-id')||msgId,audioUrl=r.headers.get('x-casa-audio-url')||`${AUDIO_API}?id=${encodeURIComponent(audioId)}`;prep7={...prep7,state:'ready',blob,audioId,audioUrl};draftState7('voz lista','ready');if(b){b.textContent='TX';b.disabled=false}if(prep7.sendWhenReady)await transmitPrepared7();
 }catch(e){if(version!==prepVersion7)return;prep7={state:'error',text,voice:st.profile.voice};draftState7(e?.name==='AbortError'?'la voz tardó demasiado · tocá TX para reintentar':'la voz no respondió · tocá TX para reintentar','error');if(b){b.textContent='TX';b.disabled=false}}
 finally{clearTimeout(timeout);if(version===prepVersion7)prepAbort7=null}
}
async function transmitPrepared7(){
 if(!prep7||prep7.state!=='ready')return;const input=$('#chatInput');if(!input||input.value.trim().slice(0,180)!==prep7.text)return;const p=prep7,b=$('#sendChat');if(b){b.disabled=true;b.textContent='↑'};const m={id:crypto.randomUUID(),session_id:room.id,author_id:st.profile.id,author_name:st.profile.name,author_color:safeColor7(st.profile.color),spoken_intro:st.profile.spokenIntro||defaultIntro7(st.profile.name),body:p.text,voice_id:p.voice,audio_mode:'qwen-design',audio_id:p.audioId,audio_url:p.audioUrl,voice_prompt:null,created_at:new Date().toISOString()};const q=await roomClient.from('study_chat_messages').insert(m).select('*').single();if(q.error){if(b){b.disabled=false;b.textContent='TX'};draftState7('no se pudo enviar','error');return}input.value='';prep7=null;prepVersion7++;chat.push(q.data);renderChat7();broadcast('chat',{message:q.data});draftState7('');if(b){b.disabled=false;b.textContent='TX'};if(st.audio.walkie)playBlob7(p.blob).catch(()=>{});setActivity('chat');setTimeout(()=>setActivity('online'),900);
}
async function sendChat7(){
 await unlockAudio7();const input=$('#chatInput'),text=input?.value.trim();if(!text||!roomClient)return;if(prep7?.state==='ready'&&prep7.text===text&&prep7.voice===st.profile.voice)return transmitPrepared7();if(prep7?.state==='loading'&&prep7.text===text&&prep7.voice===st.profile.voice){prep7.sendWhenReady=true;draftState7('terminando la voz · se envía solo…','loading');return}if(prep7?.state==='error')resetPrep7();return prepareDraft7(true);
}
sendChat=sendChat7;
function onBroadcast7(p){
 if(!p||p.from===st.profile.id)return;if(p.type==='chat'){if(!chat.some(x=>x.id===p.message.id)){chat.push(p.message);renderChat7();if(st.audio.walkie&&document.visibilityState==='visible')playMessage7(p.message,$(`.walkMsg[data-msg="${p.message.id}"]`),false)}return}old.onBroadcast(p);
}
onBroadcast=onBroadcast7;

function cloneButton7(sel,fn){const x=$(sel);if(!x)return null;const n=x.cloneNode(true);x.replaceWith(n);n.onclick=fn;return n}
function wireV7Session(){
 if(view!=='session')return;
 const input=$('#chatInput');if(input&&!input.dataset.v7){input.dataset.v7='1';input.oninput=()=>{resetPrep7();const t=input.value.trim();if(t.length>=5)prepTimer7=setTimeout(()=>prepareDraft7(false),2200)};input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat7()}}}
 const send=$('#sendChat');if(send)send.onclick=sendChat7;
 const auto=$('#auto');if(auto)auto.onclick=async()=>{await unlockAudio7();st.audio.walkie=!st.audio.walkie;st.audio.autoplay=st.audio.walkie;save();auto.textContent=st.audio.walkie?'VOL':'MUTE';auto.classList.toggle('off',!st.audio.walkie);if(!st.audio.walkie)stopAudio7()};
 const vol=$('#vol');if(vol)vol.oninput=e=>{st.audio.volume=Number(e.target.value);save()};
 cloneButton7('#walkVoice',()=>openProfile7(false));cloneButton7('#walkProfile',()=>openProfile7(false));
 renderChat7();renderRoster7();globalTrack7(globalActivity);
}
wireSession=function(){old.wireSession();setTimeout(wireV7Session,30)};

renderLibrary=function(){old.renderLibrary();globalActivity='library';setTimeout(()=>{renderGlobalSurface7();globalTrack7('library')},0)};
renderCourse=function(){old.renderCourse();globalActivity='course';setTimeout(()=>{renderGlobalSurface7();globalTrack7('course')},0)};
renderSession=function(){old.renderSession();globalActivity='online';setTimeout(()=>{wireV7Session();globalTrack7('online');fetchProfiles7().then(()=>renderRoster7())},50)};

document.addEventListener('pointerdown',()=>unlockAudio7(),{once:true,capture:true});
document.addEventListener('keydown',()=>unlockAudio7(),{once:true,capture:true});
window.addEventListener('beforeunload',()=>{try{globalChannel?.untrack()}catch{}});

setTimeout(()=>{connectGlobal7();renderGlobalSurface7();if(view==='session')wireV7Session()},80);
})();