#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PAGE_REL = 'current-tree/control-v11/chat-canary/index.html';
export const PROGRESS_REL = 'current-tree/control-v11/chat-canary/progress-v1.js';

export function assetVersion(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
}

export function versionProgressReference(html, version) {
  const pattern = /src=(['"])\.\/progress-v1\.js(?:\?v=[0-9a-f]{12})?\1/g;
  const matches = [...html.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`EXPECTED_ONE_PROGRESS_REFERENCE_GOT_${matches.length}`);
  }
  return html.replace(pattern, `src="./progress-v1.js?v=${version}"`);
}

export function compilePrimaryChatAssets(root) {
  const pagePath = path.join(root, PAGE_REL);
  const progressPath = path.join(root, PROGRESS_REL);
  const progressBytes = fs.readFileSync(progressPath);
  const version = assetVersion(progressBytes);
  const before = fs.readFileSync(pagePath, 'utf8');
  const after = versionProgressReference(before, version);
  fs.writeFileSync(pagePath, after);
  return { page_rel: PAGE_REL, progress_rel: PROGRESS_REL, version, changed: before !== after };
}

const invokedAsCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsCli) {
  const args = process.argv.slice(2);
  const rootFlag = args.indexOf('--root');
  const root = path.resolve(rootFlag >= 0 && args[rootFlag + 1] ? args[rootFlag + 1] : process.cwd());
  console.log(JSON.stringify(compilePrimaryChatAssets(root)));
}
