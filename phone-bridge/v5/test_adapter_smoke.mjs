import test from 'node:test';
import assert from 'node:assert/strict';
import {createDispatchGhAdapter} from './dispatch-gh-adapter.mjs';
test('repo configuration must be valid',()=>{
 assert.throws(()=>createDispatchGhAdapter({repo:'https://bad.example'}));
});
test('publication is blocked before approval',async()=>{
 const client=createDispatchGhAdapter({repo:'example/empty',runner:()=>{throw Error('Should not invoke external tool')}});
 await assert.rejects(()=>client.publish('files/doc.txt','content'),/approval/);
});
