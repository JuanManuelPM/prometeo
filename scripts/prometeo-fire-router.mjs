#!/usr/bin/env node
// Prometeo FIRE command parser. Parses text only; no network, mutation, skill execution or authority.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir=path.dirname(fileURLToPath(import.meta.url));
const registry=JSON.parse(fs.readFileSync(path.resolve(dir,'../coordination/one-turn/v1/FIRE_COMMANDS_V1.json'),'utf8'));
const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function parseFire(raw) {
  const original=String(raw ?? '');
  const t=original.trimStart();
  if(t.trim()==='.')return {triggered:true,key:'dot',action:registry.execution_confirmation.action,topic:'',unknown:false,requires_authority:true,requires_prepared_plan:true,skills:['prometeo-one-turn']};
  if(!t.startsWith('🔥'))return {triggered:false};
  // Support optional VS16, spaces and separators before command.
  const rest=t.slice('🔥'.length).replace(/^\uFE0F/,'').replace(/^[\s:/·]+/u,'');
  const found=rest.match(/^([\p{L}\p{N}-]{1,32})(?:\b|(?=\s)|$)/u);
  const first=found?found[1]:'';
  const suffix=found?rest.slice(first.length).trim():'';
  const token=fold(first);
  const all=[registry.default,...registry.commands];
  const chosen=all.find(x=>(x.aliases||[]).some(a=>fold(a)===token));
  if(chosen){
    const action=chosen.key==='prometeo' && suffix ? chosen.topic_action : (chosen.action||chosen.kind);
    return {triggered:true,key:chosen.key,action,topic:suffix,unknown:false,requires_authority:true,requires_prepared_plan:false,skills:chosen.skills||['prometeo-one-turn']};
  }
  return {triggered:true,key:registry.default.key,action:registry.default.kind,topic:rest.trim(),unknown:!!rest.trim(),requires_authority:true,skills:['prometeo-one-turn']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log(JSON.stringify(parseFire(process.argv.slice(2).join(' ')),null,2));
}
