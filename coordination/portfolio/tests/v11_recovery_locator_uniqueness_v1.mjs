#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const sourcePath=path.join(repoRoot,'current-tree/control-v11/recovery-now-v1.js');
const source=fs.readFileSync(sourcePath,'utf8');

const sections=[];
const root={
  querySelector(selector){
    if(selector==='.recovery-now-v1')return sections[0]||null;
    return null;
  },
  querySelectorAll(selector){
    if(selector==='.recovery-now-v1')return [...sections];
    return [];
  },
  prepend(section){sections.unshift(section);}
};
const document={
  readyState:'loading',
  addEventListener(){},
  getElementById(id){return id==='now'?root:null;},
  querySelector(){return null;},
  createElement(){
    const section={
      className:'',
      innerHTML:'',
      querySelectorAll(){return [];},
      remove(){
        const i=sections.indexOf(section);
        if(i>=0)sections.splice(i,1);
      }
    };
    return section;
  }
};
const window={
  PROMETEO_CONTINUITY_V1:{},
  addEventListener(){}
};
const projected=(id,ref,stamp='2026-09-30T01:00:00Z')=>({
  chat_locator_id:id,
  entry_ref:ref,
  source_last_material_at:stamp,
  ui_projection:{control_room_now:true,authority_effect:'NONE'}
});
const servedIndex={entries:[
  projected('CHATLOC-A-20260930','entries/CHATLOC-A-20260930.json'),
  projected('CHATLOC-B-20260930','entries/CHATLOC-B-20260930.json')
]};
let fetchCall=0;
const fetch=async url=>{
  const call=fetchCall++;
  await new Promise(resolve=>setTimeout(resolve,call===0?20:5));
  if(String(url).includes('INDEX.json'))return {ok:true,json:async()=>servedIndex};
  return {ok:true,json:async()=>({purpose:'fixture'})};
};
const context={window,document,location:{href:'https://example.test/current-tree/control-v11/'},fetch,URL,setTimeout,clearTimeout,console};
vm.runInNewContext(source,context,{filename:sourcePath});

const api=window.PROMETEO_RECOVERY_NOW_V1;
assert(api,'recovery API must be exported');

const normalized=api.eligibleEntries({entries:[
  projected('CHATLOC-A-20260930','entries/CHATLOC-A-20260930.json','2026-09-30T01:03:00Z'),
  projected('CHATLOC-A-20260930','entries/CHATLOC-A-20260930.json','2026-09-30T01:02:00Z'),
  projected('CHATLOC-B-20260930','entries/CHATLOC-B-20260930.json'),
  projected('', 'entries/UNKNOWN.json'),
  projected('CHATLOC-BAD-REF','../escape.json'),
  projected('CHATLOC-CONFLICT','entries/CHATLOC-CONFLICT.json'),
  projected('CHATLOC-CONFLICT','entries/CHATLOC-CONFLICT-OTHER.json')
]});
assert.deepEqual(
  normalized.map(row=>row.chat_locator_id),
  ['CHATLOC-A-20260930','CHATLOC-B-20260930'],
  'exact duplicates must collapse, malformed identity must fail closed, and conflicting same-locator refs must be suppressed'
);

await Promise.all([api.render(),api.render()]);
assert.equal(sections.length,1,'overlapping async renders must leave exactly one generic recovery section');
const locators=[...sections[0].innerHTML.matchAll(/data-now-conversation="([^"]+)"/g)].map(m=>m[1]);
assert.equal(locators.length,2,'two source entries must render exactly two locator cards');
assert.equal(new Set(locators).size,2,'rendered locator identities must be unique');
assert.deepEqual(locators.sort(),['CHATLOC-A-20260930','CHATLOC-B-20260930']);

console.log('V11_RECOVERY_LOCATOR_UNIQUENESS_PASS');
