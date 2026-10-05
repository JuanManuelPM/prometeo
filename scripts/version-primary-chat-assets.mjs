#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PAGE_REL = 'current-tree/control-v11/chat-canary/index.html';
export const ASSETS = Object.freeze([
  { ref: '../ingress-v1.js', rel: 'current-tree/control-v11/ingress-v1.js' },
  { ref: './private-correlation-v1.js', rel: 'current-tree/control-v11/chat-canary/private-correlation-v1.js' },
  { ref: './input-module-v1.js', rel: 'current-tree/control-v11/chat-canary/input-module-v1.js' },
  { ref: './continuity-capsule-v1.js', rel: 'current-tree/control-v11/chat-canary/continuity-capsule-v1.js' },
  { ref: './response-request-v1.js', rel: 'current-tree/control-v11/chat-canary/response-request-v1.js' },
  { ref: './rich-response-v1.js', rel: 'current-tree/control-v11/chat-canary/rich-response-v1.js' },
  { ref: './progress-v1.js', rel: 'current-tree/control-v11/chat-canary/progress-v1.js' }
]);
export const INPUT_REL = ASSETS.find(x => x.ref === './input-module-v1.js').rel;
export const PROGRESS_REL = ASSETS.find(x => x.ref === './progress-v1.js').rel;

export function assetVersion(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
}
function escapeRegex(value){ return value.replace(/[.*+?^$()|[\]\\]/g,'\\$&'); }
export function versionAssetReference(html, assetRef, version) {
  const escaped = escapeRegex(assetRef);
  const pattern = new RegExp('src=([\\\'\"])' + escaped + '(?:\\?v=[0-9a-f]{12})?\\1', 'g');
  const matches = [...html.matchAll(pattern)];
  if (matches.length !== 1) throw new Error('EXPECTED_ONE_' + assetRef + '_REFERENCE_GOT_' + matches.length);
  return html.replace(pattern, 'src="' + assetRef + '?v=' + version + '"');
}
export function versionInputReference(html, version) {
  return versionAssetReference(html, './input-module-v1.js', version);
}
export function versionProgressReference(html, version) {
  return versionAssetReference(html, './progress-v1.js', version);
}
export function compilePrimaryChatAssets(root) {
  const pagePath = path.join(root, PAGE_REL);
  let html = fs.readFileSync(pagePath, 'utf8');
  const versions = {};
  for (const asset of ASSETS) {
    const bytes = fs.readFileSync(path.join(root, asset.rel));
    const version = assetVersion(bytes);
    versions[asset.rel] = version;
    html = versionAssetReference(html, asset.ref, version);
  }
  const before = fs.readFileSync(pagePath, 'utf8');
  fs.writeFileSync(pagePath, html);
  return {
    page_rel: PAGE_REL,
    assets: ASSETS.map(asset => ({...asset, version:versions[asset.rel]})),
    input_rel: INPUT_REL,
    progress_rel: PROGRESS_REL,
    input_version: versions[INPUT_REL],
    progress_version: versions[PROGRESS_REL],
    version: assetVersion(Buffer.from(JSON.stringify(versions))),
    changed: before !== html
  };
}

const invokedAsCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsCli) {
  const args = process.argv.slice(2);
  const rootFlag = args.indexOf('--root');
  const root = path.resolve(rootFlag >= 0 && args[rootFlag + 1] ? args[rootFlag + 1] : process.cwd());
  console.log(JSON.stringify(compilePrimaryChatAssets(root)));
}
