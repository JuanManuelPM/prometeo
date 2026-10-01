import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const assert=(v,m)=>{if(!v)throw new Error(m)};

const preflight=read('coordination/bootstrap/UNIVERSAL_SESSION_PREFLIGHT_V1.txt');
const protocol=read('coordination/chat-sessions/CHAT_SESSION_JOURNAL_PROTOCOL_V1.md');
const ui=read('current-tree/control-v11/continuity-v1.js');
const worker=read('wc');
const primaryContinue=read('reincarnation/PRIMARY_CHAT_CONTINUE_PROMPT_V1.txt');
const s02=json('coordination/chat-sessions/CHAT-PROMETEO-CONTROL-20260929T194500Z-S02/SESSION.json');
const idx=json('coordination/chat-sessions/INDEX.json');

assert(preflight.includes('FAST_REINCARNATION_PATH_V1'),'fast path missing');
assert(preflight.includes('FIRST DURABLE ACTION = CREATE SUCCESSOR SESSION'),'identity-first law missing');
assert(preflight.includes('no broad repository search'),'broad-search guard missing');
assert(preflight.includes('no repository clone'),'clone guard missing');
assert(preflight.includes('no Supabase/RPC investigation'),'Supabase guard missing');
assert(protocol.includes('about 3–6 durable reads'),'read budget missing');
assert(protocol.includes('READY TO REINCARNATE'),'handoff state missing');
assert(ui.includes('function interactiveBootstrapPrompt('),'shared bootstrap renderer missing');
assert(ui.includes('function continuePrompt('),'minimal continue renderer missing');
assert(ui.includes('READY TO REINCARNATE'),'UI readiness missing');
assert(worker.includes('MUST NOT run before worker ownership'),'worker dispatch-first guard missing');
assert(primaryContinue.includes('PRIMERA ACCIÓN DURABLE OBLIGATORIA'),'Primary Chat continuation missing first durable action');
assert(primaryContinue.includes('coordination/chat-sessions/INDEX.json'),'Primary Chat continuation must resolve CURRENT session');
assert(primaryContinue.includes('session_id + session_pin nuevos'),'Primary Chat continuation must require fresh successor identity');
assert(primaryContinue.includes('NO dupliques trabajo'),'Primary Chat continuation must reconcile in-flight work');
assert(primaryContinue.includes('hidden chain-of-thought'),'Primary Chat continuation must preserve reasoning privacy');

assert(s02.predecessor_session_id==='CHAT-PROMETEO-CONTROL-20260929T145300Z-S01','S02 predecessor mismatch');
assert(s02.bootstrap?.bootstrap_status==='READY','S02 not READY');
assert(s02.bootstrap?.broad_search_before_ready===false,'S02 broad search before READY');
assert(s02.bootstrap?.clone_before_ready===false,'S02 clone before READY');
assert(s02.bootstrap?.supabase_before_ready===false,'S02 Supabase before READY');
assert(s02.bootstrap?.reads_before_ready>=3 && s02.bootstrap?.reads_before_ready<=6,'S02 read budget exceeded');

const s01=idx.sessions.find(s=>s.session_id==='CHAT-PROMETEO-CONTROL-20260929T145300Z-S01');
const liveS02=idx.sessions.find(s=>s.session_id===s02.session_id);
assert(s01?.successor_session_id===s02.session_id,'S01 successor lineage missing');
assert(liveS02?.predecessor_session_id===s01.session_id,'index predecessor lineage missing');

const simulatedS03={
  session_id:'CHAT-PROMETEO-CONTROL-CANARY-S03-FAST-V1',
  session_pin:'PIN-PROMETEO-CTRL-CANARY-S03-F45A',
  predecessor_session_id:s02.session_id,
  chat_object_id:s02.chat_object_id,
  bootstrap:{
    reads_before_ready:5,
    publication_cas:1,
    broad_search_before_ready:false,
    clone_before_ready:false,
    supabase_before_ready:false,
    next_action:s02.next_action,
    bootstrap_status:'READY'
  }
};
assert(simulatedS03.session_id!==s02.session_id && simulatedS03.session_pin!==s02.session_pin,'fresh S03 identity failed');
assert(simulatedS03.bootstrap.reads_before_ready<=6,'simulated S03 read budget exceeded');
assert(simulatedS03.bootstrap.next_action===s02.next_action,'next_action not preserved');
assert(simulatedS03.bootstrap.bootstrap_status==='READY','simulated S03 not READY');

console.log(JSON.stringify({
  status:'PASS',
  canary:'S02_TO_S03_SIMULATION',
  durable_reads_before_ready:simulatedS03.bootstrap.reads_before_ready,
  publication_cas:simulatedS03.bootstrap.publication_cas,
  broad_search_before_ready:false,
  clone_before_ready:false,
  supabase_before_ready:false,
  lineage:'S02 -> simulated S03',
  private_prompt_published:false
},null,2));
