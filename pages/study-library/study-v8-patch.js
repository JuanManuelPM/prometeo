(()=>{'use strict';
if(window.__STUDY_V8)return;window.__STUDY_V8=true;

const AUDIO8=U+'/functions/v1/casa-room-audio';
const BUILTIN8=[
 ['sergeant','Sargento fósil','90+ · militar · destruido'],['otaku','Otaku turbo','agudísima · anime · caos'],['grandma','Abuela furiosa','anciana · ronca · indignada'],['goblin','Duende nervioso','nasal · mini · rapidísimo'],['giant','Gigante tonto','gravísimo · lento · feliz'],['evilkid','Nene malvado','agudo · dulce · siniestro'],['apocalypse','Apocalipsis','épico · enorme · absurdo'],['novela','Telenovela','melodrama · traición total'],['witch','Bruja seca','vieja · chillona · torcida'],['gamer','Gamer 2007','nasal · gritón · cafeína'],['barman','Viejo de bar','cascado · lento · risitas'],['fairy','Hada tóxica','ultra aguda · dulce · venenosa']
];
const BMAP8=Object.fromEntries(BUILTIN8.map(v=>[v[0],v]));
const old8={renderSession,renderNotes,renderChat,onBroadcast,syncDoc,openProfile,wireSession,saveNoteNow,scheduleNote};
let walkCtx8=null,walkSource8=null,walkChain8=Promise.resolve(),currentPrep8=null,prepTimer8=null,prepVersion8=0;
let walkDrafts8=[],boards8=[],currentBoard8=null,boardSaveTimer8=null,noteDrafts8=[],blockMenu8=null;

const clean8=(x,n=2000)=>String(x??'').replace(/\s+/g,' ').trim().slice(0,n);
const now8=()=>new Date().toISOString();
const voiceDraftKey8=()=>`study:v8:walk-drafts:${room?.id||'none'}:${st.profile.id}`;
const noteDraftKey8=()=>`study:v8:note-drafts:${room?.id||'none'}:${st.profile.id}`;
const ownColor8=()=>st.profile.color||'#d8d1ff';
function customVoices8(){st.profile.customVoices=Array.isArray(st.profile.customVoices)?st.profile.customVoices:[];return st.profile.customVoices}
function voiceKey8(){const k=st.profile.v8VoiceKey||st.profile.voice||'giant';return BMAP8[k]||customVoices8().some(v=>v.key===k)?k:'giant'}
function voiceDef8(key=voiceKey8()){
 if(BMAP8[key])return {key,name:BMAP8[key][1],desc:BMAP8[key][2],custom:false,prompt:''};
 const c=customVoices8().find(v=>v.key===key);return c?{...c,custom:true}:{key:'giant',name:'Gigante tonto',desc:BMAP8.giant[2],custom:false,prompt:''};
}
function voiceName8(key){return voiceDef8(key).name}
function compileVoicePrompt8(name,desc,reading){
 const n=clean8(name,40)||'Voz personalizada',d=clean8(desc,500),r=clean8(reading,500);
 return `Design one stable Spanish-speaking character voice named ${n}. Voice identity and performance: ${d||'distinctive, expressive, playful, memorable and easy to understand'}. Reading behavior: ${r||'Read the supplied message faithfully. Do not silently replace words because of spelling mistakes; pronounce what is written as naturally as possible. Infer punctuation and pauses only to make the delivery understandable.'}. Keep the same age, pitch range, accent, rhythm, texture and attitude from message to message. The result is for a funny social walkie-talkie: expressive and surprising, but intelligible. Preserve names and semantic content exactly. Do not announce punctuation, do not add explanations, do not add background music, and do not add an introduction unless it is present in the supplied text. Start speaking immediately and end cleanly.`.slice(0,700);
}
function save8(){save()}
function loadLocal8(){
 try{walkDrafts8=JSON.parse(localStorage.getItem(voiceDraftKey8())||'[]')}catch{walkDrafts8=[]}
 try{noteDrafts8=JSON.parse(localStorage.getItem(noteDraftKey8())||'[]')}catch{noteDrafts8=[]}
 if(!Array.isArray(walkDrafts8))walkDrafts8=[];if(!Array.isArray(noteDrafts8))noteDrafts8=[];
}
function persistWalkDrafts8(){localStorage.setItem(voiceDraftKey8(),JSON.stringify(walkDrafts8.map(({blob,...d})=>d).slice(0,30)))}
function persistNoteDrafts8(){localStorage.setItem(noteDraftKey8(),JSON.stringify(noteDrafts8.slice(0,40)))}
async function hydrateCustomVoices8(){
 try{const q=await sb.from('study_global_profiles').select('custom_voices').eq('participant_id',st.profile.id).maybeSingle();const remote=q.data?.custom_voices;if(Array.isArray(remote)&&remote.length){const map=new Map(customVoices8().map(x=>[x.key,x]));remote.forEach(x=>x?.key&&map.set(x.key,x));st.profile.customVoices=[...map.values()].slice(0,12);save8()}}catch{}
}
async function persistCustomVoices8(){
 try{await sb.from('study_global_profiles').upsert({participant_id:st.profile.id,display_name:st.profile.name||'Participante',avatar_data:st.profile.avatar||null,color:ownColor8(),voice_id:voiceKey8(),voice_claim_at:Number(st.profile.voiceClaimAt||Date.now()),spoken_intro:st.profile.spokenIntro||`Habla ${st.profile.name}`,profile_items:Array.isArray(st.profile.items)?st.profile.items:[],custom_voices:customVoices8(),updated_at:now8()},{onConflict:'participant_id'})}catch{}
}
function chooseVoice8(key){
 if(!BMAP8[key]&&!customVoices8().some(x=>x.key===key))return;
 st.profile.v8VoiceKey=key;st.profile.voice=key;st.profile.voiceClaimAt=Date.now();save8();
 ensureProfile?.().catch?.(()=>{});trackPresence?.('online');persistCustomVoices8();
 patchWalkControls8();
}

/* ---------- audio / Walkie ---------- */
async function unlock8(){try{walkCtx8||=new(window.AudioContext||window.webkitAudioContext)();if(walkCtx8.state!=='running')await walkCtx8.resume();return walkCtx8.state==='running'}catch{return false}}
function stopAudio8(){try{walkSource8?.stop()}catch{}walkSource8=null;walkChain8=Promise.resolve()}
async function playBlob8(blob){
 await unlock8();if(!blob)return;
 if(walkCtx8){const ab=await blob.arrayBuffer(),buf=await walkCtx8.decodeAudioData(ab.slice(0));await new Promise(res=>{const s=walkCtx8.createBufferSource(),g=walkCtx8.createGain();walkSource8=s;s.buffer=buf;g.gain.value=Math.max(0,Math.min(1,Number(st.audio.volume??.85)));s.connect(g);g.connect(walkCtx8.destination);s.onended=res;s.start()});return}
 const u=URL.createObjectURL(blob);try{const a=new Audio(u);a.volume=Number(st.audio.volume??.85);await a.play();await new Promise(r=>a.onended=r)}finally{URL.revokeObjectURL(u)}
}
async function playUrl8(url,row=null,interrupt=false){
 if(!url)return toast('Ese audio ya no está disponible');if(interrupt)stopAudio8();
 walkChain8=walkChain8.catch(()=>{}).then(async()=>{row?.classList.add('speaking');try{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw 0;await playBlob8(await r.blob())}catch{toast('No pude reproducir esa voz')}finally{row?.classList.remove('speaking')}});return walkChain8;
}
function readyChime8(){
 unlock8().then(ok=>{if(!ok||!walkCtx8)return;try{const t=walkCtx8.currentTime,o=walkCtx8.createOscillator(),g=walkCtx8.createGain();o.type='sine';o.frequency.setValueAtTime(620,t);o.frequency.setValueAtTime(840,t+.055);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.12);o.connect(g);g.connect(walkCtx8.destination);o.start(t);o.stop(t+.13)}catch{}})
}
function spokenText8(text){const intro=clean8(st.profile.spokenIntro||`Habla ${st.profile.name}`,60);return `${intro?intro+'. ':''}${clean8(text,180)}`.slice(0,260)}
async function prepareAudio8(text,key=voiceKey8(),messageId=crypto.randomUUID(),signal=null){
 const v=voiceDef8(key),body={messageId,text:spokenText8(text)};
 if(v.custom){body.voice='custom';body.voicePrompt=v.prompt}else body.voice=v.key;
 const r=await fetch(AUDIO8,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal});
 if(!r.ok){let e='';try{e=await r.text()}catch{}throw new Error('voice '+r.status+' '+e.slice(0,90))}
 const blob=await r.blob(),audioId=r.headers.get('x-casa-audio-id')||messageId,audioUrl=r.headers.get('x-casa-audio-url')||`${AUDIO8}?id=${encodeURIComponent(audioId)}`;
 return {blob,audioId,audioUrl,key,voiceName:v.name,voicePrompt:v.custom?v.prompt:null};
}
function currentDraftState8(text='',mode=''){const e=$('#walkState8');if(e){e.textContent=text;e.dataset.mode=mode}}
function resetCurrentPrep8(){prepVersion8++;clearTimeout(prepTimer8);prepTimer8=null;try{currentPrep8?.ctl?.abort()}catch{}currentPrep8=null;currentDraftState8('')}
async function prepareCurrent8(sendWhenReady=false){
 const input=$('#chatInput'),text=input?.value.trim().slice(0,180);if(!text||!roomClient)return;
 const key=voiceKey8();
 if(currentPrep8&&currentPrep8.text===text&&currentPrep8.key===key){if(currentPrep8.state==='ready')return sendWhenReady?sendPrepared8(currentPrep8):currentPrep8;if(currentPrep8.state==='loading'){if(sendWhenReady)currentPrep8.sendWhenReady=true;return}}
 resetCurrentPrep8();const version=++prepVersion8,ctl=new AbortController(),id=crypto.randomUUID();currentPrep8={state:'loading',text,key,id,ctl,sendWhenReady};currentDraftState8(`preparando ${voiceName8(key)}…`,'loading');updateWalkSend8();
 try{const p=await prepareAudio8(text,key,id,ctl.signal);if(version!==prepVersion8)return;currentPrep8={...currentPrep8,...p,state:'ready',ctl:null};currentDraftState8(sendWhenReady?'enviando…':'lista · TX para enviar','ready');updateWalkSend8();if(sendWhenReady)await sendPrepared8(currentPrep8);else readyChime8()}catch(e){if(e.name==='AbortError')return;if(version!==prepVersion8)return;currentPrep8={state:'error',text,key};currentDraftState8('la voz no respondió · tocá TX para reintentar','error');updateWalkSend8()}
}
async function sendPrepared8(p,draftId=null){
 if(!p?.audioUrl||!roomClient)return;const text=clean8(p.text,180);if(!text)return;
 const v=voiceDef8(p.key),m={id:crypto.randomUUID(),session_id:room.id,author_id:st.profile.id,author_name:st.profile.name,author_color:ownColor8(),spoken_intro:st.profile.spokenIntro||`Habla ${st.profile.name}`,body:text,voice_id:p.key,voice_name:v.name,audio_mode:'qwen-design',audio_id:p.audioId,audio_url:p.audioUrl,voice_prompt:v.custom?v.prompt:null,created_at:now8()};
 const q=await roomClient.from('study_chat_messages').insert(m).select('*').single();if(q.error){toast('No se pudo enviar');return}
 chat.push(q.data);renderChat8();broadcast('chat',{message:q.data});if(st.audio.walkie)playBlob8(p.blob||await (await fetch(p.audioUrl)).blob()).catch(()=>{});
 if(draftId){walkDrafts8=walkDrafts8.filter(d=>d.id!==draftId);persistWalkDrafts8();renderWalkDrafts8()}else{const input=$('#chatInput');if(input)input.value='';resetCurrentPrep8()}
 setActivity('chat');setTimeout(()=>setActivity('online'),900);updateWalkSend8();
}
async function sendNow8(){await unlock8();const input=$('#chatInput'),text=input?.value.trim();if(!text)return;if(currentPrep8?.state==='ready'&&currentPrep8.text===text&&currentPrep8.key===voiceKey8())return sendPrepared8(currentPrep8);if(currentPrep8?.state==='loading'&&currentPrep8.text===text){currentPrep8.sendWhenReady=true;currentDraftState8('terminando · se envía solo…','loading');return}resetCurrentPrep8();prepareCurrent8(true)}
function saveWalkDraft8(){
 const input=$('#chatInput'),text=input?.value.trim().slice(0,180);if(!text)return;const key=voiceKey8(),d={id:crypto.randomUUID(),text,key,voiceName:voiceName8(key),state:'loading',createdAt:Date.now()};
 if(currentPrep8?.state==='ready'&&currentPrep8.text===text&&currentPrep8.key===key){Object.assign(d,{state:'ready',audioId:currentPrep8.audioId,audioUrl:currentPrep8.audioUrl,voicePrompt:currentPrep8.voicePrompt,blob:currentPrep8.blob})}
 walkDrafts8.push(d);persistWalkDrafts8();input.value='';resetCurrentPrep8();renderWalkDrafts8();if(d.state!=='ready')prepareSavedDraft8(d.id);else readyChime8();updateWalkSend8();
}
async function prepareSavedDraft8(id,autoSend=false){
 const d=walkDrafts8.find(x=>x.id===id);if(!d)return;if(d.state==='ready'&&d.audioUrl)return autoSend?sendPrepared8(d,id):d;d.state='loading';d.autoSend=autoSend;renderWalkDrafts8();persistWalkDrafts8();
 try{const p=await prepareAudio8(d.text,d.key,d.audioId||crypto.randomUUID());Object.assign(d,p,{state:'ready'});persistWalkDrafts8();renderWalkDrafts8();if(autoSend)await sendPrepared8(d,id);else readyChime8()}catch{d.state='error';persistWalkDrafts8();renderWalkDrafts8()}
}
function renderWalkDrafts8(){
 const host=$('#walkDrafts8');if(!host)return;host.innerHTML=walkDrafts8.length?walkDrafts8.map(d=>`<article class="walkDraft8 ${d.state||''}" data-draft8="${d.id}"><div class="walkDraftText8">${esc(d.text)}</div><div class="walkDraftMeta8"><span>${esc(voiceName8(d.key))}</span><span>${d.state==='ready'?'lista':d.state==='error'?'error':'preparando…'}</span></div><div class="walkDraftActions8"><button data-dplay8="${d.id}" ${d.state!=='ready'?'disabled':''}>▶</button><button data-dsend8="${d.id}">TX</button><button data-ddel8="${d.id}">×</button></div></article>`).join(''):'';
 host.querySelectorAll('[data-dplay8]').forEach(b=>b.onclick=()=>{const d=walkDrafts8.find(x=>x.id===b.dataset.dplay8);if(d?.audioUrl)playUrl8(d.audioUrl,null,true)});
 host.querySelectorAll('[data-dsend8]').forEach(b=>b.onclick=()=>{const d=walkDrafts8.find(x=>x.id===b.dataset.dsend8);if(!d)return;d.state==='ready'?sendPrepared8(d,d.id):prepareSavedDraft8(d.id,true)});
 host.querySelectorAll('[data-ddel8]').forEach(b=>b.onclick=()=>{walkDrafts8=walkDrafts8.filter(x=>x.id!==b.dataset.ddel8);persistWalkDrafts8();renderWalkDrafts8()});
}
function updateWalkSend8(){const b=$('#sendChat');if(!b)return;const text=$('#chatInput')?.value.trim();b.disabled=!text;b.textContent=currentPrep8?.state==='loading'?'…':'TX';const s=$('#saveWalkDraft8');if(s)s.disabled=!text}
function chatPanelHTML8(){
 return `<div class="walkTop walkTop8"><button id="auto" class="walkToggle ${st.audio.walkie?'':'off'}">${st.audio.walkie?'VOL':'MUTE'}</button><button id="walkVoice" class="walkVoice">${esc(voiceName8())}</button><label class="walkVolume"><input id="vol" type="range" min="0" max="1" step=".05" value="${Number(st.audio.volume??.85)}"></label></div><div id="walkDrafts8" class="walkDrafts8"></div><div class="chatList walkMessages" id="chatList"></div><div id="walkState8" class="walkState8"></div><div class="chatComposer walkComposer walkComposer8"><button class="walkProfileMini" id="walkProfile">${st.profile.avatar?`<img src="${esc(st.profile.avatar)}" alt="">`:esc(initials(st.profile.name))}</button><input class="chatInput" id="chatInput" placeholder="Escribir transmisión…" maxlength="180"><button class="walkSaveDraft8" id="saveWalkDraft8" title="Guardar preparado">guardar</button><button class="walkTx" id="sendChat">TX</button></div>`;
}
function renderChat8(){
 const el=$('#chatList');if(!el)return;el.innerHTML=chat.map(m=>{const mine=m.author_id===st.profile.id,p=participants[m.author_id]||{},avatar=p.avatar_data||'',col=m.author_color||p.color||'#d8d1ff',v=m.voice_name||voiceName8(m.voice_id);return `<article class="walkMsg ${mine?'mine':''}" data-msg="${m.id}" style="--msg:${esc(col)}">${!mine?`<div class="walkAvatar">${avatar?`<img src="${esc(avatar)}" alt="">`:esc(initials(m.author_name))}</div>`:''}<div class="walkBody"><div class="walkMeta"><b>${esc(m.author_name)}</b><span>${esc(fmtClock(m.created_at))}</span><button class="walkReplay" data-speak8="${m.id}" ${m.audio_url?'':'disabled'}>▶ ${esc(v)}</button></div><div class="walkBubble">${esc(m.body)}</div></div>${mine?`<div class="walkAvatar">${avatar?`<img src="${esc(avatar)}" alt="">`:esc(initials(m.author_name))}</div>`:''}</article>`}).join('')||'<div class="walkEmpty">Canal abierto.</div>';
 el.querySelectorAll('[data-speak8]').forEach(b=>b.onclick=()=>{const m=chat.find(x=>x.id===b.dataset.speak8);if(m?.audio_url)playUrl8(m.audio_url,b.closest('.walkMsg'),true)});el.scrollTop=el.scrollHeight;
}
renderChat=renderChat8;
function patchWalkControls8(){
 if(view!=='session')return;const panel=$('#chatPanel');if(!panel)return;
 if(!panel.dataset.v8){panel.dataset.v8='1';panel.innerHTML=chatPanelHTML8()}
 const input=$('#chatInput');if(input){input.oninput=()=>{resetCurrentPrep8();updateWalkSend8();const t=input.value.trim();if(t.length>=4)prepTimer8=setTimeout(()=>prepareCurrent8(false),1100)};input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendNow8()}}}
 $('#sendChat')&&( $('#sendChat').onclick=sendNow8 );$('#saveWalkDraft8')&&( $('#saveWalkDraft8').onclick=saveWalkDraft8 );
 const auto=$('#auto');if(auto)auto.onclick=async()=>{await unlock8();st.audio.walkie=!st.audio.walkie;st.audio.autoplay=st.audio.walkie;save8();auto.textContent=st.audio.walkie?'VOL':'MUTE';auto.classList.toggle('off',!st.audio.walkie);if(!st.audio.walkie)stopAudio8()};
 const vol=$('#vol');if(vol)vol.oninput=e=>{st.audio.volume=Number(e.target.value);save8()};
 $('#walkVoice')&&( $('#walkVoice').onclick=openVoiceStudio8 );$('#walkProfile')&&( $('#walkProfile').onclick=()=>old8.openProfile() );
 renderWalkDrafts8();renderChat8();updateWalkSend8();
}

function openVoiceStudio8(){
 $('#voiceStudio8')?.remove();const key=voiceKey8();document.body.insertAdjacentHTML('beforeend',`<div class="voiceOverlay8" id="voiceStudio8"><section class="voiceStudio8"><header><div><h2>Voces</h2><p>Elegí una o diseñá la tuya.</p></div><button id="closeVoice8">×</button></header><div class="voiceGrid8">${BUILTIN8.map(([id,n,d])=>`<button class="voiceCard8 ${id===key?'on':''}" data-vsel8="${id}"><b>${esc(n)}</b><span>${esc(d)}</span><i data-vpreview8="${id}">▶</i></button>`).join('')}${customVoices8().map(v=>`<button class="voiceCard8 custom ${v.key===key?'on':''}" data-vsel8="${v.key}"><b>${esc(v.name)}</b><span>${esc(v.desc)}</span><i data-vpreview8="${v.key}">▶</i><em data-vdel8="${v.key}">×</em></button>`).join('')}</div><button class="voiceCreateToggle8" id="newVoice8">+ crear voz</button><div class="voiceBuilder8 hide" id="voiceBuilder8"><label>NOMBRE<input id="customVoiceName8" maxlength="36" placeholder="Ej. Profesor conspiranoico"></label><label>CÓMO SUENA<textarea id="customVoiceDesc8" rows="3" placeholder="Edad, acento, energía, textura, personalidad…"></textarea></label><label>CÓMO LEE<textarea id="customVoiceRead8" rows="3">Leé el mensaje literal. No corrijas palabras aunque haya errores de ortografía. Usá pausas y entonación para que se entienda y resulte gracioso, sin cambiar lo que dice.</textarea></label><div class="voiceBuilderActions8"><button id="previewCustom8">▶ probar</button><button class="primary" id="saveCustom8">guardar voz</button></div></div></section></div>`);
 $('#closeVoice8').onclick=()=>$('#voiceStudio8').remove();$('#voiceStudio8').onclick=e=>{if(e.target.id==='voiceStudio8')e.currentTarget.remove()};
 $$('[data-vsel8]').forEach(b=>b.onclick=e=>{if(e.target.closest('[data-vpreview8],[data-vdel8]'))return;chooseVoice8(b.dataset.vsel8);$('#voiceStudio8').remove()});
 $$('[data-vpreview8]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const k=b.dataset.vpreview8;b.textContent='…';try{const p=await prepareAudio8('Hola. Esta es mi voz para la clase.',k);await playBlob8(p.blob)}catch{toast('No respondió esa voz')}finally{b.textContent='▶'}});
 $$('[data-vdel8]').forEach(b=>b.onclick=async e=>{e.stopPropagation();st.profile.customVoices=customVoices8().filter(v=>v.key!==b.dataset.vdel8);if(st.profile.v8VoiceKey===b.dataset.vdel8)chooseVoice8('giant');save8();await persistCustomVoices8();openVoiceStudio8()});
 $('#newVoice8').onclick=()=>$('#voiceBuilder8').classList.toggle('hide');
 const customArgs=()=>{const name=clean8($('#customVoiceName8').value,36)||'Voz propia',desc=clean8($('#customVoiceDesc8').value,500),reading=clean8($('#customVoiceRead8').value,500);return {name,desc,reading,prompt:compileVoicePrompt8(name,desc,reading)}};
 $('#previewCustom8').onclick=async()=>{const a=customArgs(),b=$('#previewCustom8');b.disabled=true;b.textContent='…';try{const r=await fetch(AUDIO8,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({voice:'custom',voicePrompt:a.prompt,text:`Habla ${st.profile.name}. Bueno, probemos. Si esto suena raro, por lo menos suena raro con intención.`,messageId:crypto.randomUUID()})});if(!r.ok)throw 0;await playBlob8(await r.blob())}catch{toast('No pude generar la prueba')}finally{b.disabled=false;b.textContent='▶ probar'}};
 $('#saveCustom8').onclick=async()=>{const a=customArgs();if(!a.desc)return toast('Describí cómo querés que suene');const v={key:'custom:'+crypto.randomUUID(),name:a.name,desc:a.desc,reading:a.reading,prompt:a.prompt,createdAt:Date.now()};st.profile.customVoices=[...customVoices8(),v].slice(-12);save8();await persistCustomVoices8();chooseVoice8(v.key);$('#voiceStudio8').remove();toast('Voz creada')};
}

/* ---------- universal note blocks ---------- */
function noteColor8(n){return n?.payload?.author_color||participants[n?.author_id]?.color||(n?.author_id===st.profile.id?ownColor8():'#d8d1ff')}
function renderAttachment8(n){
 const p=n.payload||{};
 if(n.block_type==='image')return `<figure class="noteMedia8"><img src="${esc(p.image||'')}" alt="${esc(p.caption||'Imagen')}"><figcaption>${esc(p.caption||'')}</figcaption></figure>`;
 if(n.block_type==='audio')return `<div class="noteAudio8"><audio controls preload="metadata" src="${esc(p.audio||'')}"></audio><span>${esc(p.name||'Audio')}</span></div>`;
 if(n.block_type==='board')return `<div class="boardNote8">${p.image?`<img src="${esc(p.image)}" alt="Captura de ${esc(p.title||'pizarrón')}">`:''}<div><b>${esc(p.title||'Pizarrón')}</b><span>${esc(p.saved_at?fmtClock(p.saved_at):'guardado')}</span><button data-openboard8="${esc(p.board_id||'')}">abrir</button></div></div>`;
 return '';
}
function renderNotes8(){
 const el=$('#noteList');if(!el)return;notes=notes.filter(n=>!n.deleted_at).sort((a,b)=>a.position-b.position);
 el.innerHTML=notes.map((n,i)=>{const col=noteColor8(n),prev=notes[i-1],show=i===0||prev?.author_id!==n.author_id,type=n.block_type||'text',editable=type==='text'||type==='heading';return `<article class="noteBlock noteBlock8 type-${type}" data-block="${n.id}" style="--author:${esc(col)}"><div class="blockGutter8"><button class="drag8" title="Mover">⠿</button><button class="insert8" data-insert8="${n.id}" title="Agregar abajo">+</button></div><div class="authorRail8">${show?`<button class="authorDot8" title="${esc(n.author_name||'Participante')}">${esc(initials(n.author_name||'?').slice(0,1))}</button>`:''}</div><div class="noteBody8">${editable?`<div class="editor ${type==='heading'?'headingEditor8':''}" contenteditable="true" spellcheck="true">${esc(n.content||'')}</div>`:renderAttachment8(n)}<div class="editingChip" id="edit-${n.id}">${editingBy[n.id]?esc(editingBy[n.id]+' editando'):''}</div><button class="noteDelete" data-delete8="${n.id}" title="Borrar">×</button></div></article>`}).join('');
 el.querySelectorAll('.editor').forEach(ed=>{const id=ed.closest('.noteBlock8').dataset.block;ed.onfocus=()=>setActivity('editando notas',id);ed.onblur=()=>{setActivity('online');old8.saveNoteNow(id,ed.innerText)};ed.oninput=()=>old8.scheduleNote(id,ed.innerText);ed.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();old8.saveNoteNow(id,ed.innerText);addBlock8(id,'text')}};ed.onpaste=e=>pasteIntoNote8(e,id)});
 el.querySelectorAll('[data-insert8]').forEach(b=>b.onclick=()=>openBlockMenu8(b,b.dataset.insert8));el.querySelectorAll('[data-delete8]').forEach(b=>b.onclick=()=>deleteBlock8(b.dataset.delete8));el.querySelectorAll('[data-openboard8]').forEach(b=>b.onclick=()=>{if(b.dataset.openboard8)openBoardById8(b.dataset.openboard8);else switchWorkspace8('board')});el.querySelectorAll('.drag8').forEach(installDrag8);
 renderPrivateDrafts8();
}
renderNotes=renderNotes8;
async function addBlock8(after,type='text',payload={}){
 if(!roomClient)return;const sorted=[...notes].sort((a,b)=>a.position-b.position),i=after?sorted.findIndex(x=>x.id===after):-1,prev=i>=0?sorted[i]:sorted.at(-1),next=i>=0?sorted[i+1]:null,pos=prev?(next?(prev.position+next.position)/2:prev.position+1):1,n={id:crypto.randomUUID(),session_id:room.id,block_key:crypto.randomUUID(),position:pos,content:'',author_id:st.profile.id,author_name:st.profile.name,last_editor_id:st.profile.id,last_editor_name:st.profile.name,revision:1,block_type:type,payload:{author_color:ownColor8(),...payload},created_at:now8(),updated_at:now8()};const q=await roomClient.from('study_note_blocks').insert(n).select('*').single();if(q.error)return toast('No pude crear el bloque');notes.push(q.data);renderNotes8();broadcast('note',{block:q.data});syncDoc8();setTimeout(()=>{const e=$(`.noteBlock8[data-block="${q.data.id}"] .editor`);e?.focus()},20);return q.data
}
function openBlockMenu8(anchor,after){closeBlockMenu8();const r=anchor.getBoundingClientRect();blockMenu8=document.createElement('div');blockMenu8.className='blockMenu8';blockMenu8.style.left=Math.min(innerWidth-190,Math.max(8,r.left+18))+'px';blockMenu8.style.top=Math.min(innerHeight-210,r.bottom+4)+'px';blockMenu8.innerHTML=`<button data-kind8="text">Texto</button><button data-kind8="heading">Título</button><button data-kind8="image">Imagen</button><button data-kind8="audio">Audio</button><button data-kind8="board">Pizarrón</button><button data-kind8="draft">Borrador privado</button>`;document.body.appendChild(blockMenu8);blockMenu8.querySelectorAll('[data-kind8]').forEach(b=>b.onclick=()=>{const k=b.dataset.kind8;closeBlockMenu8();if(k==='image')pickImage8(after);else if(k==='audio')pickAudio8(after);else if(k==='board'){switchWorkspace8('board');createBoard8()}else if(k==='draft')createPrivateDraft8('text');else addBlock8(after,k)});setTimeout(()=>document.addEventListener('pointerdown',outsideBlock8,{once:true}),0)}
function outsideBlock8(e){if(blockMenu8&&!blockMenu8.contains(e.target))closeBlockMenu8()}
function closeBlockMenu8(){blockMenu8?.remove();blockMenu8=null}
async function imageData8(file){const im=await createImageBitmap(file),max=1100,scale=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.78)}
function pickImage8(after){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async()=>{const f=i.files?.[0];if(!f)return;try{const data=await imageData8(f);await addBlock8(after,'image',{image:data,caption:f.name})}catch{toast('No pude agregar esa imagen')}};i.click()}
function pickAudio8(after){const i=document.createElement('input');i.type='file';i.accept='audio/*';i.setAttribute('capture','microphone');i.onchange=()=>{const f=i.files?.[0];if(!f)return;if(f.size>2500000)return toast('Ese audio es demasiado pesado para una nota');const fr=new FileReader();fr.onload=()=>addBlock8(after,'audio',{audio:fr.result,name:f.name});fr.readAsDataURL(f)};i.click()}
function pasteIntoNote8(e,id){const imgs=[...e.clipboardData.items].filter(x=>x.type.startsWith('image/'));if(!imgs.length)return;e.preventDefault();const f=imgs[0].getAsFile();if(f)imageData8(f).then(data=>addBlock8(id,'image',{image:data,caption:'Pegado desde portapapeles'}))}
async function deleteBlock8(id){const n=notes.find(x=>x.id===id);if(!n)return;const q=await roomClient.from('study_note_blocks').update({deleted_at:now8(),revision:Number(n.revision||1)+1,updated_at:now8(),last_editor_id:st.profile.id,last_editor_name:st.profile.name}).eq('id',id).is('deleted_at',null).select('*').maybeSingle();if(q.error||!q.data)return toast('No pude borrar');notes=notes.filter(x=>x.id!==id);renderNotes8();broadcast('note-delete',{id});syncDoc8();undoToast8(q.data)}
function undoToast8(row){const t=$('#toast');if(!t)return;t.innerHTML=`Borrado <button id="undo8">deshacer</button>`;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),6500);$('#undo8').onclick=async()=>{const q=await roomClient.from('study_note_blocks').update({deleted_at:null,revision:Number(row.revision||1)+1,updated_at:now8()}).eq('id',row.id).select('*').maybeSingle();if(q.data){notes.push(q.data);renderNotes8();broadcast('note',{block:q.data});syncDoc8();toast('Restaurado')}}}
function installDrag8(handle){
 handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const row=handle.closest('.noteBlock8'),list=$('#noteList');if(!row||!list)return;row.classList.add('dragging8');handle.setPointerCapture?.(e.pointerId);const move=ev=>{const hit=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.noteBlock8');if(!hit||hit===row||hit.parentElement!==list)return;const rr=hit.getBoundingClientRect();list.insertBefore(row,ev.clientY<rr.top+rr.height/2?hit:hit.nextSibling)};const up=()=>{row.classList.remove('dragging8');handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);persistOrder8()};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up)}
}
async function persistOrder8(){const ids=[...document.querySelectorAll('#noteList .noteBlock8')].map(x=>x.dataset.block);const map=new Map(notes.map(n=>[n.id,n]));notes=ids.map((id,i)=>{const n=map.get(id);if(n)n.position=i+1;return n}).filter(Boolean);await Promise.all(notes.map((n,i)=>roomClient.from('study_note_blocks').update({position:i+1,updated_at:now8()}).eq('id',n.id)));broadcast('note-order',{ids});syncDoc8()}
function syncDoc8(){clearTimeout(syncDoc8.t);syncDoc8.t=setTimeout(async()=>{if(!roomClient||!room)return;const txt=[...notes].filter(n=>!n.deleted_at).sort((a,b)=>a.position-b.position).map(n=>n.block_type==='heading'?`# ${n.content}`:n.block_type==='image'?`[Imagen${n.payload?.caption?': '+n.payload.caption:''}]`:n.block_type==='audio'?`[Audio${n.payload?.name?': '+n.payload.name:''}]`:n.block_type==='board'?`[Pizarrón: ${n.payload?.title||'sin título'}]`:n.content).filter(Boolean).join('\n\n');await roomClient.from('study_session_docs').upsert({session_id:room.id,shared_notes:txt,version:Date.now(),updated_by:st.profile.name,updated_at:now8()},{onConflict:'session_id'})},700)}
syncDoc=syncDoc8;

function ensureDraftDock8(){const pane=$('#notesPane');if(!pane)return null;let d=$('#privateDrafts8');if(!d){d=document.createElement('section');d.id='privateDrafts8';d.className='privateDrafts8';pane.insertBefore(d,$('#noteList'))}return d}
function renderPrivateDrafts8(){const h=ensureDraftDock8();if(!h)return;h.innerHTML=noteDrafts8.length?`<div class="privateDraftLabel8">Borradores · sólo en este dispositivo</div>${noteDrafts8.map(d=>`<article class="privateNote8 ${d.type==='heading'?'heading':''}" data-nd8="${d.id}"><div contenteditable="true" data-ndedit8="${d.id}">${esc(d.content||'')}</div><button data-ndpub8="${d.id}">publicar</button><button data-nddel8="${d.id}">×</button></article>`).join('')}`:'';h.querySelectorAll('[data-ndedit8]').forEach(e=>e.oninput=()=>{const d=noteDrafts8.find(x=>x.id===e.dataset.ndedit8);if(d){d.content=e.innerText;persistNoteDrafts8()}});h.querySelectorAll('[data-ndpub8]').forEach(b=>b.onclick=async()=>{const d=noteDrafts8.find(x=>x.id===b.dataset.ndpub8);if(!d)return;const n=await addBlock8(null,d.type||'text');if(n&&d.content){n.content=d.content;await old8.saveNoteNow(n.id,d.content)}noteDrafts8=noteDrafts8.filter(x=>x.id!==d.id);persistNoteDrafts8();renderNotes8()});h.querySelectorAll('[data-nddel8]').forEach(b=>b.onclick=()=>{noteDrafts8=noteDrafts8.filter(x=>x.id!==b.dataset.nddel8);persistNoteDrafts8();renderPrivateDrafts8()})}
function createPrivateDraft8(type='text'){noteDrafts8.push({id:crypto.randomUUID(),type,content:'',createdAt:Date.now()});persistNoteDrafts8();renderPrivateDrafts8();setTimeout(()=>$(`[data-nd8="${noteDrafts8.at(-1).id}"] [contenteditable]`)?.focus(),10)}

/* ---------- multiple whiteboards ---------- */
function boardTopic8(id){return `class-${room.id}-board-${id}`}
function boardLocalKey8(id){return `study:v2:modelos-teorias-ii:whiteboard-v7:${boardTopic8(id)}`}
async function loadBoards8(){if(!roomClient||!room)return;const q=await roomClient.from('study_boards').select('*').eq('session_id',room.id).order('created_at');if(q.error)return;boards8=(q.data||[]).filter(b=>b.owner_id===st.profile.id||b.visibility==='shared');if(currentBoard8&&!boards8.some(b=>b.id===currentBoard8))currentBoard8=null;renderBoardBar8()}
async function createBoard8(){if(!roomClient||!room)return;const mine=boards8.filter(b=>b.owner_id===st.profile.id).length+1,b={id:crypto.randomUUID(),session_id:room.id,owner_id:st.profile.id,owner_name:st.profile.name,title:`Pizarrón ${mine}`,state:{},visibility:'personal',revision:1,created_at:now8(),updated_at:now8()};const q=await roomClient.from('study_boards').insert(b).select('*').single();if(q.error)return toast('No pude crear el pizarrón');boards8.push(q.data);currentBoard8=q.data.id;mountBoard8();return q.data}
function currentBoardObj8(){return boards8.find(b=>b.id===currentBoard8)||null}
async function saveCurrentBoard8(){const b=currentBoardObj8();if(!b||b.owner_id!==st.profile.id)return;let state={};try{state=JSON.parse(localStorage.getItem(boardLocalKey8(b.id))||'{}')}catch{};b.state=state;b.revision=Number(b.revision||1)+1;b.updated_at=now8();await roomClient.from('study_boards').update({state,revision:b.revision,updated_at:b.updated_at,title:b.title}).eq('id',b.id).eq('owner_id',st.profile.id)}
function scheduleBoardSave8(){clearTimeout(boardSaveTimer8);boardSaveTimer8=setTimeout(saveCurrentBoard8,450)}
function renderBoardBar8(){
 const bar=$('.boardTopline');if(!bar)return;const visible=boards8.filter(b=>b.owner_id===st.profile.id||b.visibility==='shared'),cur=currentBoardObj8();bar.innerHTML=`<div class="boardTabs8">${visible.map(b=>`<button data-boardtab8="${b.id}" class="boardTab8 ${b.id===currentBoard8?'on':''} ${b.owner_id===st.profile.id?'mine':'shared'}"><span>${esc(b.title)}</span>${b.visibility==='shared'?'<i>●</i>':''}</button>`).join('')}<button class="boardNew8" id="boardNew8">+</button></div>${cur?`<input class="boardTitle8" id="boardTitle8" value="${esc(cur.title)}" ${cur.owner_id!==st.profile.id?'readonly':''}><button id="publishBoard8" class="boardPublish8">publicar</button>`:''}`;bar.querySelectorAll('[data-boardtab8]').forEach(b=>b.onclick=()=>{saveCurrentBoard8();currentBoard8=b.dataset.boardtab8;mountBoard8()});$('#boardNew8')&&( $('#boardNew8').onclick=()=>createBoard8() );const title=$('#boardTitle8');if(title&&!title.readOnly)title.onchange=()=>{const b=currentBoardObj8();if(b){b.title=clean8(title.value,60)||'Pizarrón';title.value=b.title;saveCurrentBoard8();renderBoardBar8()}};$('#publishBoard8')&&( $('#publishBoard8').onclick=publishBoard8 )
}
async function mountBoard8(){
 const host=$('#boardHost');if(!host)return;if(!currentBoard8){const mine=boards8.find(b=>b.owner_id===st.profile.id);if(mine)currentBoard8=mine.id;else if(boards8[0])currentBoard8=boards8[0].id;else return createBoard8()}
 const b=currentBoardObj8();if(!b)return;if(b.state&&Object.keys(b.state).length)try{localStorage.setItem(boardLocalKey8(b.id),JSON.stringify(b.state))}catch{};host.innerHTML='';const f=document.createElement('iframe');f.id='boardFrame';f.className='boardFrame';f.title=b.title;f.src=`../study-system-v2-whiteboard-v7.html?topic=${encodeURIComponent(boardTopic8(b.id))}&embed=1&v=7`;f.onload=()=>{try{const d=f.contentDocument,sty=d.createElement('style');sty.textContent=`.wbReference,.wbIdentity,.wbRight,.wbPasteHint{display:none!important}.wbWorkspace{grid-template-columns:1fr!important}.wbTop{height:52px!important;padding:0 12px!important}.wbToolbarWrap{margin:auto!important}.wbBoard{min-width:0!important}.wbAdd{bottom:14px!important;right:14px!important}`;d.head.appendChild(sty)}catch{}};host.appendChild(f);renderBoardBar8();setActivity('pizarrón')
}
function switchWorkspace8(mode){const board=mode==='board';$('#notesPane')?.classList.toggle('hide',board);$('#boardPane')?.classList.toggle('hide',!board);$$('[data-workspace]').forEach(b=>b.classList.toggle('on',b.dataset.workspace===mode));if(board){loadBoards8().then(mountBoard8);setActivity('pizarrón')}else{saveCurrentBoard8();setActivity('online')}}
function boardSnapshot8(){try{const c=$('#boardFrame')?.contentDocument?.querySelector('.wbCanvas');if(!c||!c.width)return null;const max=1100,s=Math.min(1,max/c.width),o=document.createElement('canvas');o.width=Math.round(c.width*s);o.height=Math.round(c.height*s);o.getContext('2d').drawImage(c,0,0,o.width,o.height);return o.toDataURL('image/webp',.78)}catch{return null}}
async function publishBoard8(){const b=currentBoardObj8();if(!b)return;const image=boardSnapshot8();if(!image)return toast('Todavía no hay nada para publicar');await saveCurrentBoard8();if(b.owner_id===st.profile.id&&b.visibility!=='shared'){b.visibility='shared';await roomClient.from('study_boards').update({visibility:'shared',updated_at:now8()}).eq('id',b.id)}const n=await addBlock8(null,'board',{image,board_id:b.id,title:b.title,saved_at:now8()});if(n){broadcast('board-published',{boardId:b.id});toast('Publicado · abrí un pizarrón nuevo');await createBoard8()}}
async function openBoardById8(id){if(!boards8.some(b=>b.id===id))await loadBoards8();if(boards8.some(b=>b.id===id)){currentBoard8=id;switchWorkspace8('board');setTimeout(mountBoard8,30)}}
window.addEventListener('message',e=>{if(!e.data||typeof e.data!=='object')return;if(e.data.type==='study-wb7-thumb'&&currentBoard8&&e.data.topicId===boardTopic8(currentBoard8))scheduleBoardSave8()});

function patchSession8(){
 if(view!=='session'||!room)return;loadLocal8();
 setTimeout(()=>{renderNotes8();const add=$('#addBlock');if(add){add.textContent='+ escribir';add.onclick=()=>addBlock8(null,'text');if(!$('#privateAdd8')){const b=document.createElement('button');b.id='privateAdd8';b.className='privateAdd8';b.textContent='+ borrador';b.onclick=()=>createPrivateDraft8('text');add.insertAdjacentElement('afterend',b)}}renderPrivateDrafts8()},0);
 $$('[data-workspace]').forEach(b=>{const n=b.cloneNode(true);b.replaceWith(n);n.onclick=()=>switchWorkspace8(n.dataset.workspace)});
 patchWalkControls8();setTimeout(patchWalkControls8,120);loadBoards8();
}
const renderSessionBefore8=renderSession;renderSession=function(){renderSessionBefore8();setTimeout(patchSession8,40)};
function onBroadcast8(p){
 if(!p||p.from===st.profile.id)return;
 if(p.type==='chat'){if(!chat.some(x=>x.id===p.message.id)){chat.push(p.message);renderChat8();if(st.audio.walkie&&p.message.audio_url&&document.visibilityState==='visible')playUrl8(p.message.audio_url,$(`.walkMsg[data-msg="${p.message.id}"]`),false)}return}
 if(p.type==='note-order'){const m=new Map(notes.map(n=>[n.id,n]));notes=p.ids.map((id,i)=>{const n=m.get(id);if(n)n.position=i+1;return n}).filter(Boolean);renderNotes8();return}
 if(p.type==='board-published'){loadBoards8();return}
 old8.onBroadcast(p);if(['note','note-delete','profile'].includes(p.type))setTimeout(renderNotes8,0)
}
onBroadcast=onBroadcast8;

document.addEventListener('pointerdown',unlock8,{once:true,capture:true});document.addEventListener('keydown',unlock8,{once:true,capture:true});
hydrateCustomVoices8().then(()=>{if(st.profile.v8VoiceKey){st.profile.voice=st.profile.v8VoiceKey;save8()}if(view==='session')patchSession8()});
if(view==='session')setTimeout(patchSession8,160);
})();
