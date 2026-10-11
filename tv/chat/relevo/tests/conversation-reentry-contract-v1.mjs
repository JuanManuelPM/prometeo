#!/usr/bin/env node
/* Contract/readback regression only. NOT a real ChatGPT cold-chat behavioral test. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=(p)=>readFile(p,'utf8');
const dir='tv/chat/relevo/conversaciones/';
const [entry,intellectual,route,checkpoint,json,state]=await Promise.all([
 read('tv/chat/AGENT_ENTRY_V1.md'),
 read('tv/chat/relevo/CONTINUIDAD_INTELECTUAL_V2.md'),
 read(dir+'CONTINUAR_ULTIMA_CHARLA_V1.md'),
 read(dir+'DIRECTOR_20261010_CHECKPOINT_V1.md'),
 read(dir+'LATEST_PUBLIC_V1.json').then(JSON.parse),
 read('tv/chat/relevo/STATE_V1.json').then(JSON.parse)
]);
const cases=[
 ['entry routes dialogue',entry.includes('CONTINUIDAD_INTELECTUAL_V2.md')],
 ['intellectual owner routes precise phrase',intellectual.includes('«Continuar última charla»')&&intellectual.includes('CONTINUAR_ULTIMA_CHARLA_V1.md')],
 ['contract differentiates executor and dialogue',route.includes('CONVERSACION_CONTINUA')&&route.includes('EJECUTOR_PUNTUAL')],
 ['route gives priority to native previous conversation if accessible',route.includes('historial')&&route.includes('última conversación personal')],
 ['no false same-model identity',route.includes('nueva instancia')],
 ['never publish private transcript',route.includes('GitHub público')&&route.includes('mensajes, audio')],
 ['does not create task for conversation intent',route.includes('no crear un')&&route.includes('REQUEST_CAPTURED')],
 ['checkpoint has unresolved question',checkpoint.includes('Pregunta abierta exacta en sustancia')],
 ['pointer is public checkpoint not actual latest private chat',json.pointer_is_global_latest_chat===false&&json.private_last_chat_verified===false],
 ['source time is unknown not fabricated',json.last_message_time_utc===null],
 ['pointer is typed as conversation',json.kind==='CONVERSACION_CONTINUA'],
 ['pointer route and checkpoint align',json.checkpoint_path===dir+'DIRECTOR_20261010_CHECKPOINT_V1.md'&&json.contract_path===dir+'CONTINUAR_ULTIMA_CHARLA_V1.md'],
 ['does not overwrite work relays',state.schema==='prometeo.cross-chat-role-relay/v1'&&state.last_hop>=8],
 ['explicitly admits no cold-chat verification',route.includes('Gates reales pendientes')&&checkpoint.includes('NO')]];
for(const [name,pass] of cases){
 if(!pass)throw Error('FAIL '+name);
 console.log('PASS '+name);
}
console.log(JSON.stringify({suite:'conversation-reentry-contract-v1',passed:cases.length,total:cases.length,
 evidence:'STATIC_CONTRACT_ONLY_NOT_REAL_NEW_CHAT'}));
