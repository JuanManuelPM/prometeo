const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'continuity-capsule-v1.js'), 'utf8');
const store = new Map([
  ['draft-key','SECRET_DRAFT_DO_NOT_PROJECT'],
  ['context-key',JSON.stringify([{at:'2026-10-05T00:00:00Z',text:'SECRET_CONTEXT_DO_NOT_PROJECT'}])]
]);
const localStorage = {
  getItem:k => store.has(k) ? store.get(k) : null,
  setItem:(k,v) => store.set(k,String(v)),
  removeItem:k => store.delete(k)
};
const inputApi = {
  local_state:{draft_key:'draft-key',private_context_key:'context-key'},
  outbox:{read:()=>[{request_id:'r1',text:'SECRET_OUTBOX_DO_NOT_PROJECT'}]}
};
const context = { console, localStorage, PROMETEO_CHAT_CANARY_INPUT_V1:inputApi };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, {filename:'continuity-capsule-v1.js'});
const api = context.PROMETEO_PRIMARY_CHAT_CONTINUITY_V1;
assert(api);

const sessionIndex = {
  sessions:[
    {session_id:'S-OLD',chat_object_id:'chat-object-prometeo-chat-control-main',status:'SUPERSEDED',last_activity_at:'2026-10-05T00:03:00Z'},
    {
      session_id:'S-ACTIVE',session_pin:'PIN-X',chat_object_id:'chat-object-prometeo-chat-control-main',context_key:'PROMETEO:PRIMARY',
      status:'ACTIVE',last_activity_at:'2026-10-05T00:01:00Z',current_summary:'Resumen público durable',next_action:'Seguir desde CURRENT real',
      session_url:'./S-ACTIVE/SESSION.json',journal_url:'./S-ACTIVE/JOURNAL.json',continue_url:'./S-ACTIVE/CONTINUE.txt',
      last_checkpoint_ref:'./S-ACTIVE/JOURNAL.json#J002',raw_prompt:'SECRET_SESSION_RAW_DO_NOT_PROJECT'
    }
  ]
};
const recoveryIndex = {
  entries:[
    {chat_locator_id:'CHATLOC-1',title:'Prometeo ideas',project:'prometeo',status:['INDEXED'],entry_ref:'entries/CHATLOC-1.json',reopenability_class:'STRONG_SEARCH_LOCATOR',raw_text:'SECRET_RECOVERY_RAW_DO_NOT_PROJECT',search_anchors:['SECRET_ANCHOR_DO_NOT_PROJECT']},
    {chat_locator_id:'CHATLOC-OTHER',title:'Otro',project:'otro',status:['INDEXED'],entry_ref:'entries/OTHER.json'}
  ]
};

const capsule = api.buildCapsule({sessionIndex,recoveryIndex,inputApi,now:'2026-10-05T00:05:00Z'});
assert.equal(capsule.session.session_id,'S-ACTIVE');
assert.equal(capsule.local_private_state.draft_present,true);
assert.equal(capsule.local_private_state.draft_length,'SECRET_DRAFT_DO_NOT_PROJECT'.length);
assert.equal(capsule.local_private_state.private_context_entries,1);
assert.equal(capsule.local_private_state.outbox_pending,1);
assert.equal(capsule.recovery_locators.length,1);
assert.equal(capsule.recovery_locators[0].chat_locator_id,'CHATLOC-1');
for (const secret of ['SECRET_DRAFT_DO_NOT_PROJECT','SECRET_CONTEXT_DO_NOT_PROJECT','SECRET_OUTBOX_DO_NOT_PROJECT','SECRET_SESSION_RAW_DO_NOT_PROJECT','SECRET_RECOVERY_RAW_DO_NOT_PROJECT','SECRET_ANCHOR_DO_NOT_PROJECT']) {
  assert.equal(JSON.stringify(capsule).includes(secret),false,`secret leaked into capsule: ${secret}`);
}
const prompt = api.buildReincarnationPrompt(capsule);
assert.match(prompt,/S-ACTIVE/);
assert.match(prompt,/Resumen público durable/);
assert.match(prompt,/Seguir desde CURRENT real/);
assert.match(prompt,/SESSION\.json/);
for (const secret of ['SECRET_DRAFT_DO_NOT_PROJECT','SECRET_CONTEXT_DO_NOT_PROJECT','SECRET_OUTBOX_DO_NOT_PROJECT']) assert.equal(prompt.includes(secret),false);

const payloads = new Map([
  ['session-url',sessionIndex],
  ['recovery-url',recoveryIndex]
]);
const fetchImpl = async url => ({ok:true,status:200,json:async()=>payloads.get(url)});
(async()=>{
  const refreshed = await api.refresh({fetchImpl,sessionIndexUrl:'session-url',recoveryIndexUrl:'recovery-url',inputApi,now:'2026-10-05T00:05:30Z'});
  assert.equal(refreshed.session.session_id,'S-ACTIVE');
  assert.equal(api.read().session.session_id,'S-ACTIVE');
  assert.equal(JSON.stringify(api.read()).includes('SECRET_CONTEXT_DO_NOT_PROJECT'),false);
  console.log(JSON.stringify({ok:true,schema:api.schema,session:refreshed.session.session_id,recovery_locators:refreshed.recovery_locators.length,private_projection:'counts_only',secrets_leaked:false},null,2));
})().catch(err=>{console.error(err);process.exitCode=1});
