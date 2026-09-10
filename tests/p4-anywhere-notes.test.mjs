import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChangeLoopClient} from '../shared/capture/v1/change-loop.js';

const secret='x'.repeat(48);
const calls=[];
const storage={getItem:key=>key.includes('workspace.secret')?secret:null,setItem(){}};
const fetchImpl=async(url,options={})=>{
  calls.push({url:String(url),options});
  return {ok:true,status:200,json:async()=>({ok:true,chatgpt_url:'https://chatgpt.com/?q=PROMETEO',job:null})};
};
const client=createChangeLoopClient({endpoint:'https://example.invalid/functions/v1/change',storage,fetchImpl});
const page={id:'calendar',title:'Calendario',href:'https://example.test/calendar'};

await client.trabajar(page);
let body=JSON.parse(calls.at(-1).options.body);
assert.equal(body.action,'prepare_execution');
assert.equal(body.intent,'WORK_PAGE');
assert.equal(body.human_approved,true);
assert.equal(body.page_id,'calendar');

await client.pensar(page);
body=JSON.parse(calls.at(-1).options.body);
assert.equal(body.action,'prepare_research');
assert.equal(body.intent,'THINK_PAGE');
assert.equal(body.human_approved,true);

const audio=new Blob(['abc'],{type:'audio/webm'});
await client.uploadAudio(audio,{id:'cap-1',created:123,sourceTitle:'Calendario'},page);
assert.match(calls.at(-1).url,/\/audio$/);
assert.match(String(calls.at(-1).options.headers.authorization),/^Bearer /);
assert.equal(calls.at(-1).url.includes(secret),false);

const ui=fs.readFileSync('shared/capture/v1/change-loop.js','utf8');
assert.match(ui,/page-change-loop-ui\/v3/);
assert.match(ui,/>Pensar</);
assert.match(ui,/>Trabajar/);
assert.match(ui,/Grabar/);
assert.match(ui,/Pausar/);
assert.match(ui,/Continuar/);
assert.match(ui,/Audio guardado · esperando transcripción/);
assert.match(ui,/prepare_research/);
assert.match(ui,/ALL_UNWORKED|WORK_PAGE/);
assert.doesNotMatch(ui,/Activar HACER/);
assert.doesNotMatch(ui,/grant_status/);

const save=fs.readFileSync('pages/capture/save-session/index.html','utf8');
assert.match(save,/location\.hash/);
assert.match(save,/#t=/);
assert.match(save,/session-save/);
assert.match(save,/history\.replaceState/);
assert.doesNotMatch(save,/location\.search/);

const protocol=fs.readFileSync('coordination/AI_DESIGN_SESSION_PROTOCOL_V1.md','utf8');
assert.match(protocol,/AI_DERIVED/);
assert.match(protocol,/Guardar en Prometeo/);
assert.match(protocol,/#t=<encoded_save_token>&p=<encoded_payload>/);
assert.match(protocol,/does not need this ChatGPT transcript/i);

const worker=fs.readFileSync('shared/prometeo-shell/v1/prometeo-voice-worker-v2.js','utf8');
assert.match(worker,/whisper-tiny/);
assert.match(worker,/whisper-small/);
assert.match(worker,/Android|iPhone|iPad|Mobile/);

console.log('P4 anywhere notes contract tests PASS');
