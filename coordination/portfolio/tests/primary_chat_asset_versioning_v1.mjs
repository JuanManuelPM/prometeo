#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assetVersion, versionAssetReference, compilePrimaryChatAssets, PAGE_REL, ASSETS } from '../../../scripts/version-primary-chat-assets.mjs';

const argv = process.argv.slice(2);
const value=(name,fallback=null)=>{const i=argv.indexOf(name);return i>=0&&i+1<argv.length?argv[i+1]:fallback};
const repoRoot=path.resolve(value('--repo-root',process.cwd()));
const pagesRootRaw=value('--pages-root',null);
const pagesRoot=pagesRootRaw?path.resolve(pagesRootRaw):null;

const sourcePage=fs.readFileSync(path.join(repoRoot,PAGE_REL),'utf8');
let expected=sourcePage;
const versions={};
for(const asset of ASSETS){
  const bytes=fs.readFileSync(path.join(repoRoot,asset.rel));
  const version=assetVersion(bytes);
  versions[asset.rel]=version;
  expected=versionAssetReference(expected,asset.ref,version);
  assert.ok(expected.includes('src="'+asset.ref+'?v='+version+'"'),'compiled page missing versioned '+asset.ref);
}
const scratch=fs.mkdtempSync('/tmp/prometeo-primary-chat-assets-');
for(const asset of ASSETS){
  const dst=path.join(scratch,asset.rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(repoRoot,asset.rel),dst);
}
const pageDst=path.join(scratch,PAGE_REL);fs.mkdirSync(path.dirname(pageDst),{recursive:true});fs.copyFileSync(path.join(repoRoot,PAGE_REL),pageDst);
const compiled=compilePrimaryChatAssets(scratch);
assert.equal(fs.readFileSync(pageDst,'utf8'),expected,'generic compiler must produce expected versioned page');
assert.equal(compiled.assets.length,ASSETS.length);

const result={schema:'prometeo.primary-chat-asset-versioning-test/v2',ok:true,asset_count:ASSETS.length,versions,staged_pages_verified:false};
if(pagesRoot){
  const stagedPage=fs.readFileSync(path.join(pagesRoot,PAGE_REL),'utf8');
  assert.equal(stagedPage,expected,'staged gh-pages HTML must equal deterministic compiled source HTML');
  for(const asset of ASSETS){
    const staged=fs.readFileSync(path.join(pagesRoot,asset.rel));
    const source=fs.readFileSync(path.join(repoRoot,asset.rel));
    assert.equal(staged.equals(source),true,'main/staged bytes diverge for '+asset.rel);
  }
  result.staged_pages_verified=true;
}
console.log(JSON.stringify(result,null,2));
