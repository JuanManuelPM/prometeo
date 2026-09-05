/* Prometeo Durable Core v1 — deterministic identities + immutable snapshots. */
((global)=>{
 'use strict';if(global.PrometeoDurable)return;
 const enc=new TextEncoder();
 function stable(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  const keys=Object.keys(value).sort();return '{'+keys.map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
 }
 async function sha256Text(text){if(!global.crypto?.subtle){const e=new Error('Cryptographic digest unavailable');e.code='PROMETEO_CRYPTO_REQUIRED';throw e}const h=await global.crypto.subtle.digest('SHA-256',enc.encode(String(text)));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
 async function digest(value){return sha256Text(typeof value==='string'?value:stable(value))}
 async function id(prefix,value,length=24){return `${prefix}-${(await digest(value)).slice(0,length)}`}
 function clone(v){return structuredClone(v)}
 function deepFreeze(value,seen=new WeakSet()){
  if(value===null||typeof value!=='object'||seen.has(value))return value;seen.add(value);
  for(const k of Reflect.ownKeys(value))deepFreeze(value[k],seen);
  return Object.freeze(value);
 }
 function immutable(value){return deepFreeze(clone(value))}
 function assert(cond,code,message,detail={}){if(cond)return;const e=new Error(message);e.code=code;e.detail=detail;throw e}
 global.PrometeoDurable=Object.freeze({version:'1.1.0-candidate',stable,sha256Text,digest,id,clone,deepFreeze,immutable,assert});
})(typeof globalThis!=='undefined'?globalThis:window);
