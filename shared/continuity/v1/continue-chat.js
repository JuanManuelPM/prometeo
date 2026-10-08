// Prometeo Continue Chat v1.2
const VERSION='1.2.0';
const WORKSPACE_PROMPT='/prometeo/shared/continuity/v1/CONTINUE_CHAT_PROMPT.txt';
const FALLBACK_PROMPT=WORKSPACE_PROMPT;

function asUrl(v){
  try{return new URL(String(v||''),globalThis.location?.href||'https://juanmanuelpm.github.io/prometeo/')}
  catch{return null}
}

export function resolvePromptUrl(page=null){
  const href=page?.href||page?.public_url||globalThis.location?.href||'';
  const path=asUrl(href)?.pathname||'';
  if(path.includes('/ui-workspace-v1/'))return WORKSPACE_PROMPT;
  if(globalThis.location?.pathname?.includes('/prometeo/'))return WORKSPACE_PROMPT;
  return FALLBACK_PROMPT;
}

async function fetchText(url){
  const r=await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error('Continuity prompt '+r.status);
  return r.text();
}

let primaryPrefetch=fetchText(WORKSPACE_PROMPT).catch(()=>null);

async function templateFor(url){
  if(url!==WORKSPACE_PROMPT)return fetchText(url);
  const prefetched=await primaryPrefetch;
  if(prefetched)return prefetched;
  primaryPrefetch=fetchText(WORKSPACE_PROMPT).catch(()=>null);
  const retried=await primaryPrefetch;
  if(!retried)throw new Error('No pude cargar el prompt de continuidad');
  return retried;
}

function fill(t,page){
  const href=page?.href||page?.public_url||globalThis.location?.href||'';
  const id=page?.id||'unknown',title=page?.title||id;
  return String(t)
    .replaceAll('{{PAGE_ID}}',String(id))
    .replaceAll('{{PAGE_TITLE}}',String(title))
    .replaceAll('{{PAGE_HREF}}',String(href))
    .replaceAll('{{COPIED_AT}}',new Date().toISOString());
}

async function copyText(v){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(v);return}
  const t=document.createElement('textarea');
  t.value=v;t.style.position='fixed';t.style.opacity='0';
  document.body.appendChild(t);t.select();
  const ok=document.execCommand('copy');t.remove();
  if(!ok)throw new Error('Clipboard unavailable');
}

export async function buildPrompt({page=null}={}){
  const promptUrl=resolvePromptUrl(page);
  const template=await templateFor(promptUrl);
  return{promptUrl,prompt:fill(template,page),version:VERSION};
}

export async function copyAndOpen({page=null,openChat=true}={}){
  const opened=openChat?window.open('https://chatgpt.com/','_blank','noopener'):null;
  const built=await buildPrompt({page});
  await copyText(built.prompt);
  return{...built,copied:true,opened:!!opened};
}

export const CONTINUE_CHAT_VERSION=VERSION;
