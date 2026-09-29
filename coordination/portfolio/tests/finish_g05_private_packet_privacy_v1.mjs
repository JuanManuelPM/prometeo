#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const [sourceRoot='.',...publicFiles]=process.argv.slice(2);
const resolver=JSON.parse(fs.readFileSync(path.join(sourceRoot,'coordination/workspaces/PAGE_CHANGE_PRIVATE_CONTEXT_RESOLVER_CONTRACT_V1.json'),'utf8'));
const protocol=fs.readFileSync(path.join(sourceRoot,'coordination/workspaces/PAGE_CHANGE_WORKER_PROTOCOL_V1.md'),'utf8');
const bridge=fs.readFileSync(path.join(sourceRoot,'shared/capture/v1/github-change-loop.js'),'utf8');
const ingress=fs.readFileSync(path.join(sourceRoot,'current-tree/control-v11/ingress-v1.js'),'utf8');

assert.equal(resolver.phase,'POST_CLAIM_ONLY');
assert.equal(resolver.mandatory_provider,null);
assert.match(protocol,/Do not retrieve private Page Change context before the claim succeeds/);
assert.match(protocol,/does \*\*not\*\* require one storage\/provider/);
assert(bridge.includes('FORBIDDEN_PUBLIC_KEYS'));
assert(bridge.includes('grants_authority:false'));
assert(ingress.includes('raw_text_public: false'));
assert(ingress.includes('credentials_public: false'));

const forbidden=new Set(resolver.public_forbidden_keys.map(x=>String(x).toLowerCase()));
const forbiddenValueMarkers=['PRIVATE_CANARY_','PRIVATE_MANUAL_CANARY_','Bearer sb_','sb_secret_'];
function scan(value,where='$'){
  if(Array.isArray(value)){value.forEach((v,i)=>scan(v,`${where}[${i}]`));return}
  if(value&&typeof value==='object'){
    for(const [key,v] of Object.entries(value)){
      assert(!forbidden.has(String(key).toLowerCase()),`G05_PRIVACY_LEAK forbidden key ${where}.${key}`);
      scan(v,`${where}.${key}`);
    }
    return;
  }
  if(typeof value==='string'){
    for(const marker of forbiddenValueMarkers) assert(!value.includes(marker),`G05_PRIVACY_LEAK marker ${marker} at ${where}`);
  }
}
for(const file of publicFiles){
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  scan(doc,file);
}
console.log(JSON.stringify({status:'PASS',contract:resolver.schema,scanned_public_files:publicFiles.length,post_claim_only:true,mandatory_provider:null}));
