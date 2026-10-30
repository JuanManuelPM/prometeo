import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Isolated JS VMs emulate two unprimed clients; NOT a real ChatGPT fresh-chat test.
const source=fs.readFileSync(new URL('../shared/context-foundry/v2/scoped-context-ref-bridge.js',import.meta.url),'utf8');
function newClient(){const c={console,structuredClone};c.globalThis=c;vm.createContext(c);vm.runInContext(source,c);return c.PrometeoScopedContextRefBridgeV0}
const D='a'.repeat(64), E='b'.repeat(64), F='c'.repeat(64);
const assignment={entry_mode:'MANUAL_CHAT',work_item_id:'SYNTH-WI-001',assignment_generation:7,epoch:'SYNTH-EPOCH-001',page_id:'synthetic-page',packet_ref:'synthetic-packet-1',packet_digest:D,context_pack_ref:'synthetic-context-pack-1',context_pack_digest:E,target:'internal'};
const captures=[{capture_id:'synthetic-capture-1',revision:3,digest:F,ack_id:'synthetic-ack-1'}];
const privatePacket={work_item_id:assignment.work_item_id,assignment_generation:7,epoch:assignment.epoch,page_id:assignment.page_id,packet_ref:assignment.packet_ref,packet_digest:assignment.packet_digest,context_pack_ref:assignment.context_pack_ref,context_pack_digest:assignment.context_pack_digest,privacy:'LOCAL',capture_refs:captures};
const PRIVATE_TEXT='SYNTHETIC ONLY: prepare one orange card. Original literal preserved.';
function owner({packet=privatePacket,access=true,ack=true,corrupt=false}={}){return {
 async loadPrivateWorkItem(){return structuredClone(packet)},
 async authorizeRead(){return{allowed:access}},
 async verifyDurableAck(){return{verified:ack,capture_refs:structuredClone(captures)}},
 async reopenPrivateContext(){return {context_pack_ref:packet.context_pack_ref,context_pack_digest:corrupt?D:packet.context_pack_digest,capture_refs:structuredClone(captures),original_literal:PRIVATE_TEXT,interpretation:'make one orange card'};}
};}
const codes=[];
async function rejects(label,action,code){await assert.rejects(action,e=>e.code===code,label+' expected '+code);codes.push(label)}
const clientA=newClient(),clientB=newClient();
assert.notEqual(clientA,clientB);
const privateStore=owner(); // The stand-in is shared durable owner state, not chat state.
const ctxA=await clientA.resolve({assignment,owner:privateStore});
assert.equal((await ctxA.openPrivate()).original_literal,PRIVATE_TEXT);
const ctxB=await clientB.resolve({assignment:structuredClone(assignment),owner:privateStore});
assert.equal((await ctxB.openPrivate()).original_literal,PRIVATE_TEXT);
assert.equal(ctxA.work_item_id,ctxB.work_item_id);
assert.equal(ctxA.context_pack_digest,ctxB.context_pack_digest);
assert.ok(!JSON.stringify(ctxB).includes(PRIVATE_TEXT));
assert.ok(!JSON.stringify(ctxB).includes('synthetic-ack-1'));
codes.push('two-disposable-vm-clients-no-manual-handoff');
await rejects('missing-ack',()=>clientB.resolve({assignment,owner:owner({ack:false})}),'CONTEXT_CAPTURE_ACK_UNVERIFIED');
await rejects('access-denied',()=>clientB.resolve({assignment,owner:owner({access:false})}),'CONTEXT_ACCESS_DENIED');
await rejects('stale-generation',()=>clientB.resolve({assignment:{...assignment,assignment_generation:6},owner:privateStore}),'CONTEXT_STALE_OR_MISMATCH');
await rejects('wrong-page',()=>clientB.resolve({assignment:{...assignment,page_id:'foreign-page'},owner:privateStore}),'CONTEXT_STALE_OR_MISMATCH');
await rejects('wrong-packet-digest',()=>clientB.resolve({assignment:{...assignment,packet_digest:F},owner:privateStore}),'CONTEXT_STALE_OR_MISMATCH');
await rejects('external-forbidden',()=>clientB.resolve({assignment:{...assignment,target:'external'},owner:privateStore}),'CONTEXT_EXTERNAL_FORBIDDEN');
await rejects('no-owner',()=>clientB.resolve({assignment,owner:{}}),'CONTEXT_PRIVATE_OWNER_REQUIRED');
await rejects('invalid-mode',()=>clientB.resolve({assignment:{...assignment,entry_mode:'/o/'},owner:privateStore}),'CONTEXT_ASSIGNMENT_INVALID');
const bad=await clientB.resolve({assignment,owner:owner({corrupt:true})});
await rejects('reopen-digest-tamper',()=>bad.openPrivate(),'CONTEXT_REOPEN_INTEGRITY');
let active=true;
const revoked=owner();revoked.authorizeRead=async()=>({allowed:active});
const handle=await clientB.resolve({assignment,owner:revoked});active=false;
await rejects('recheck-after-revocation',()=>handle.openPrivate(),'CONTEXT_ACCESS_DENIED');
const badAckPacket={...privatePacket,capture_refs:[{...captures[0],ack_id:'wrong-ack'}]};
await rejects('ack-identity-swap',()=>clientB.resolve({assignment,owner:owner({packet:badAckPacket})}),'CONTEXT_CAPTURE_ACK_UNVERIFIED');
console.log(JSON.stringify({ok:true,cases:codes.length,checks:codes,scope:'isolated-vm-synthetic-owner',real_chat_e2e:'UNKNOWN',private_backend_e2e:'UNKNOWN'}));
