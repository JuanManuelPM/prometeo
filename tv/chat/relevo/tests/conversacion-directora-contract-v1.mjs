#!/usr/bin/env node
/** Structural regression for chat-kind distinction. Not a real ChatGPT cold-chat test.
 * Real-world acceptance REQUIRES a second independent ChatGPT conversation. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=process.cwd();
const entry=await readFile(root+'/tv/chat/AGENT_ENTRY_V1.md','utf8');
const capsule=await readFile(root+'/tv/chat/relevo/CONVERSACION_DIRECTORA_V1.md','utf8');
const relay=JSON.parse(await readFile(root+'/tv/chat/relevo/STATE_V1.json','utf8'));
const cases=[
 ['continuar última charla','DIALOGUE'],
 ['seguimos donde nos quedamos','DIALOGUE'],
 ['quiero seguir hablando como antes','DIALOGUE'],
 ['desarrollá J12','EXECUTOR'],
 ['cómo va J01','STATUS'],
 ['continuemos la charla sobre X','DIALOGUE_EXPLICIT'],
];
assert.match(entry,/## Modo conversacional, distinto de los chats ejecutores/);
assert.match(entry,/CONVERSACION_DIRECTORA_V1\.md/);
assert.match(entry,/CONTINUIDAD_INTELECTUAL_V2\.md/);
assert.ok(entry.indexOf('## Modo conversacional')<entry.indexOf('## 2026-10-09'),'dialogue route should precede generic bridge');
assert.match(capsule,/\bDIALOGUE\b/);
assert.match(capsule,/\bEXECUTOR\b/);
assert.match(capsule,/LATEST_KNOWN_DIALOGUE/);
assert.match(capsule,/no es.*(último chat|chat completo)|no sabe cuál fue literalmente el último chat abierto/i);
assert.match(capsule,/NO.*(transcripciones|transcripción)/i);
assert.ok(relay.last_hop>=8,'do not reset relay history');
assert.ok(Array.isArray(relay.history)&&relay.history.length>=relay.last_hop,'do not prune historical relay');
for(const [phrase,type] of cases){
 assert.ok(entry.includes(phrase)||capsule.includes(phrase),'missing fixture: '+phrase);
 assert.ok(['DIALOGUE','EXECUTOR','STATUS','DIALOGUE_EXPLICIT'].includes(type));
}
console.log('PASS: structural entry, safe dialogue checkpoint, role examples, historical state retained');
console.log('NOT RUN: independent ChatGPT cold-start, private memory completeness, actual latest-chat ordering');
