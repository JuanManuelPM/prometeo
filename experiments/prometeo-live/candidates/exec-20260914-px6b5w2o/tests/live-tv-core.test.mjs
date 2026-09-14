import assert from 'node:assert/strict';
import {PROTOCOL,makeJoinHash,parseJoinHash,normalizeSurface,emptyState,reduceDisplayState,slotCount} from '../live-tv-core.mjs';

const session='a'.repeat(32), secret='b'.repeat(48);
const join=makeJoinHash(session,secret);
assert.deepEqual(parseJoinHash(join),{sessionId:session,secret},'QR join capability round-trips');
assert.equal(parseJoinHash('#controller:bad:bad'),null,'invalid session is rejected');

assert.equal(normalizeSurface({url:'javascript:alert(1)'}),null,'non-http surface is rejected');
const page=normalizeSurface({id:'page',title:'Page',url:'https://example.com/a',kind:'iframe'});
const video=normalizeSurface({id:'video',title:'Video',url:'https://example.com/v.mp4',kind:'video'});
assert.equal(page.kind,'iframe');
assert.deepEqual(video.capabilities,['media.play','media.pause','media.seek','media.mute']);

let state=emptyState([page,video]);
assert.equal(state.slots[0],'page');
let r=reduceDisplayState(state,{protocol:PROTOCOL,id:'1',at:Date.now(),actor:'controller',action:'layout.set',payload:{layout:'split'}});
assert.equal(r.changed,true);state=r.state;
assert.equal(slotCount(state.layout),2);assert.equal(state.slots.length,2,'layout creates the required slots');

r=reduceDisplayState(state,{protocol:PROTOCOL,id:'2',at:Date.now(),actor:'controller',action:'surface.select',payload:{slot:1,surfaceId:'video'}});
assert.equal(r.changed,true);state=r.state;assert.equal(state.slots[1],'video','controller switches a target slot');

r=reduceDisplayState(state,{protocol:PROTOCOL,id:'3',at:Date.now(),actor:'controller',action:'media.seek',payload:{slot:1,value:10}});
assert.deepEqual(r.effect,{type:'media.seek',slot:1,value:10},'video controls produce a scoped effect');

const before=structuredClone(state);
r=reduceDisplayState(state,{protocol:PROTOCOL,id:'4',at:Date.now(),actor:'display',action:'surface.select',payload:{slot:0,surfaceId:'video'}});
assert.equal(r.changed,false);assert.deepEqual(r.state,before,'display-originated control commands are ignored');

r=reduceDisplayState(state,{protocol:PROTOCOL,id:'5',at:Date.now(),actor:'controller',action:'surface.open',payload:{slot:0,surface:{id:'preview',title:'Worker preview',url:'https://example.com/preview'}}});
assert.equal(r.changed,true);assert.equal(r.state.slots[0],'preview');assert.ok(r.state.catalog.some(s=>s.id==='preview'),'extensible URL surfaces join the catalog');

console.log('live-tv-core: 10 focused checks passed');
