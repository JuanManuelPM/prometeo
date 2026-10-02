#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  assetVersion,
  versionInputReference,
  versionProgressReference,
  PAGE_REL,
  INPUT_REL,
  PROGRESS_REL
} from '../../../scripts/version-primary-chat-assets.mjs';

const argv = process.argv.slice(2);
const value = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
};
const repoRoot = path.resolve(value('--repo-root', process.cwd()));
const pagesRootRaw = value('--pages-root', null);
const pagesRoot = pagesRootRaw ? path.resolve(pagesRootRaw) : null;

const sourcePage = fs.readFileSync(path.join(repoRoot, PAGE_REL), 'utf8');
const sourceInput = fs.readFileSync(path.join(repoRoot, INPUT_REL));
const sourceProgress = fs.readFileSync(path.join(repoRoot, PROGRESS_REL));
const inputVersion = assetVersion(sourceInput);
const progressVersion = assetVersion(sourceProgress);
const compiled = versionProgressReference(versionInputReference(sourcePage, inputVersion), progressVersion);
const expectedInputRef = `src="./input-module-v1.js?v=${inputVersion}"`;
const expectedProgressRef = `src="./progress-v1.js?v=${progressVersion}"`;

assert.ok(compiled.includes(expectedInputRef), 'compiled page must reference input-module-v1.js with content-derived version');
assert.ok(compiled.includes(expectedProgressRef), 'compiled page must reference progress-v1.js with content-derived version');
assert.equal(versionInputReference(versionProgressReference(compiled, progressVersion), inputVersion), compiled, 'asset version compilation must be idempotent');
assert.doesNotMatch(compiled, /src=(['"])\.\/input-module-v1\.js\1/, 'compiled page may not retain an unversioned input reference');
assert.doesNotMatch(compiled, /src=(['"])\.\/progress-v1\.js\1/, 'compiled page may not retain an unversioned progress reference');

const result = {
  schema: 'prometeo.primary-chat-asset-versioning-test/v1',
  ok: true,
  input_version: inputVersion,
  progress_version: progressVersion,
  source_input_bytes: sourceInput.length,
  source_progress_bytes: sourceProgress.length,
  compiled_input_reference: `./input-module-v1.js?v=${inputVersion}`,
  compiled_progress_reference: `./progress-v1.js?v=${progressVersion}`,
  staged_pages_verified: false
};

if (pagesRoot) {
  const stagedPage = fs.readFileSync(path.join(pagesRoot, PAGE_REL), 'utf8');
  const stagedInput = fs.readFileSync(path.join(pagesRoot, INPUT_REL));
  const stagedProgress = fs.readFileSync(path.join(pagesRoot, PROGRESS_REL));
  assert.equal(stagedInput.equals(sourceInput), true, 'main/staged gh-pages input bytes diverge');
  assert.equal(stagedProgress.equals(sourceProgress), true, 'main/staged gh-pages progress bytes diverge');
  assert.equal(stagedPage, compiled, 'staged gh-pages HTML must equal deterministic compiled source HTML');
  assert.ok(stagedPage.includes(expectedInputRef), 'staged gh-pages HTML missing expected versioned input reference');
  assert.ok(stagedPage.includes(expectedProgressRef), 'staged gh-pages HTML missing expected versioned progress reference');
  result.staged_pages_verified = true;
}

console.log(JSON.stringify(result, null, 2));
