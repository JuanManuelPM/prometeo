#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PAGE_REL = 'current-tree/control-v11/chat-canary/index.html';
export const INPUT_REL = 'current-tree/control-v11/chat-canary/input-module-v1.js';
export const PROGRESS_REL = 'current-tree/control-v11/chat-canary/progress-v1.js';

export function assetVersion(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
}

function versionAssetReference(html, assetName, version) {
  const escaped = assetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`src=(['"])\\./${escaped}(?:\\?v=[0-9a-f]{12})?\\1`, 'g');
  const matches = [...html.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`EXPECTED_ONE_${assetName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_REFERENCE_GOT_${matches.length}`);
  }
  return html.replace(pattern, `src="./${assetName}?v=${version}"`);
}

export function versionInputReference(html, version) {
  return versionAssetReference(html, 'input-module-v1.js', version);
}

export function versionProgressReference(html, version) {
  return versionAssetReference(html, 'progress-v1.js', version);
}

export function compilePrimaryChatAssets(root) {
  const pagePath = path.join(root, PAGE_REL);
  const inputPath = path.join(root, INPUT_REL);
  const progressPath = path.join(root, PROGRESS_REL);
  const inputBytes = fs.readFileSync(inputPath);
  const progressBytes = fs.readFileSync(progressPath);
  const inputVersion = assetVersion(inputBytes);
  const progressVersion = assetVersion(progressBytes);
  const before = fs.readFileSync(pagePath, 'utf8');
  const withInput = versionInputReference(before, inputVersion);
  const after = versionProgressReference(withInput, progressVersion);
  fs.writeFileSync(pagePath, after);
  return {
    page_rel: PAGE_REL,
    input_rel: INPUT_REL,
    progress_rel: PROGRESS_REL,
    input_version: inputVersion,
    progress_version: progressVersion,
    version: progressVersion,
    changed: before !== after
  };
}

const invokedAsCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsCli) {
  const args = process.argv.slice(2);
  const rootFlag = args.indexOf('--root');
  const root = path.resolve(rootFlag >= 0 && args[rootFlag + 1] ? args[rootFlag + 1] : process.cwd());
  console.log(JSON.stringify(compilePrimaryChatAssets(root)));
}
