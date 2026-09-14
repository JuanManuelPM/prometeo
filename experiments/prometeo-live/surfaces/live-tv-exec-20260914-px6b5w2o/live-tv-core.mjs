export const PROTOCOL='prometeo.live-tv/v1';
export const LAYOUT_SLOTS={single:1,split:2,quad:4};

export function randomToken(bytes=16){
  const data=new Uint8Array(bytes);crypto.getRandomValues(data);
  return [...data].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function topicFor(sessionId,secret){
  const raw=new TextEncoder().encode(`${sessionId}:${secret}`);
  const digest=await crypto.subtle.digest('SHA-256',raw);
  const short=[...new Uint8Array(digest)].slice(0,16).map(v=>v.toString(16).padStart(2,'0')).join('');
  return `prometeo-live:${sessionId}:${short}`;
}
export function makeJoinHash(sessionId,secret){
  if(!/^[a-f0-9]{20,64}$/i.test(sessionId)||!/^[a-f0-9]{24,128}$/i.test(secret)) throw new Error('invalid session capability');
  return `#controller:${sessionId}:${secret}`;
}
export function parseJoinHash(hash=''){
  const match=String(hash).match(/^#controller:([a-f0-9]{20,64}):([a-f0-9]{24,128})$/i);
  return match?{sessionId:match[1],secret:match[2]}:null;
}
export function normalizeLayout(layout){return LAYOUT_SLOTS[layout]?layout:'single'}
export function safeUrl(value,base=globalThis.location?.href||'https://example.invalid/'){
  try{const u=new URL(value,base);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}
}
export function normalizeSurface(raw={},base){
  const url=safeUrl(raw.url,base);if(!url)return null;
  const kind=raw.kind==='video'?'video':'iframe';
  return {id:String(raw.id||`surface-${Date.now()}`).slice(0,80),title:String(raw.title||raw.id||'Surface').slice(0,80),url,kind,capabilities:kind==='video'?['media.play','media.pause','media.seek','media.mute']:[]};
}
export function makeEnvelope(action,payload={},actor='controller'){
  return {protocol:PROTOCOL,id:randomToken(8),at:Date.now(),actor,action:String(action),payload};
}
export function validEnvelope(msg){
  return !!msg&&msg.protocol===PROTOCOL&&typeof msg.id==='string'&&Number.isFinite(msg.at)&&['controller','display'].includes(msg.actor)&&typeof msg.action==='string'&&msg.payload&&typeof msg.payload==='object';
}
export function emptyState(catalog=[]){
  return {protocol:PROTOCOL,revision:0,layout:'single',slots:[catalog[0]?.id||null],focus:0,catalog:[...catalog],media:{}};
}
export function slotCount(layout){return LAYOUT_SLOTS[normalizeLayout(layout)]}
export function reduceDisplayState(state,env){
  if(!validEnvelope(env)||env.actor!=='controller')return {state,effect:null,changed:false};
  const next=structuredClone(state),p=env.payload||{};let changed=false,effect=null;
  if(env.action==='layout.set'){
    const layout=normalizeLayout(p.layout);const count=slotCount(layout);next.layout=layout;next.slots=next.slots.slice(0,count);while(next.slots.length<count)next.slots.push(next.catalog[0]?.id||null);next.focus=Math.min(next.focus,count-1);changed=true;
  }else if(env.action==='slot.focus'){
    const slot=Math.max(0,Math.min(slotCount(next.layout)-1,Number(p.slot)||0));next.focus=slot;changed=true;
  }else if(env.action==='surface.select'){
    const slot=Math.max(0,Math.min(slotCount(next.layout)-1,Number(p.slot??next.focus)||0));
    if(next.catalog.some(s=>s.id===p.surfaceId)){next.slots[slot]=p.surfaceId;next.focus=slot;changed=true}
  }else if(env.action==='surface.open'){
    const s=normalizeSurface(p.surface);if(s){const old=next.catalog.findIndex(x=>x.id===s.id);if(old>=0)next.catalog[old]=s;else next.catalog.push(s);const slot=Math.max(0,Math.min(slotCount(next.layout)-1,Number(p.slot??next.focus)||0));next.slots[slot]=s.id;next.focus=slot;changed=true}
  }else if(['media.play','media.pause','media.seek','media.mute'].includes(env.action)){
    const slot=Math.max(0,Math.min(slotCount(next.layout)-1,Number(p.slot??next.focus)||0));effect={type:env.action,slot,value:p.value};
  }else return {state,effect:null,changed:false};
  if(changed)next.revision=(Number(next.revision)||0)+1;
  return {state:next,effect,changed};
}
