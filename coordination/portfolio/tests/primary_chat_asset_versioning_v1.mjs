#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assetVersion, versionProgressReference, PAGE_REL, PROGRESS_REL } from '../../../scripts/version-primary-chat-assets.mjs';

const argv = process.argv.slice(2);
const value = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
};
const repoRoot = path.resolve(value('--repo-root', process.cwd()));
const pagesRootRaw = value('--pages-root', null);
const pagesRoot = pagesRootRaw ? path.resolve(pagesRootRaw) : null;

const sourcePage = fs.readFileSync(path.join(repoRoot, PAGE_REL), 'utf8');
const sourceProgress = fs.readFileSync(path.join(repoRoot, PROGRESS_REL));
const version = assetVersion(sourceProgress);
const compiled = versionProgressReference(sourcePage, version);
const expectedRef = `src="./progress-v1.js?v=${version}"`;

assert.ok(compiled.includes(expectedRef), 'compiled page must reference progress-v1.js with content-derived version');
assert.equal(versionProgressReference(compiled, version), compiled, 'asset version compilation must be idempotent');
assert.doesNotMatch(compiled, /src=(['"])\.\/progress-v1\.js\1/, 'compiled page may not retain an unversioned progress reference');

const result = {
  schema: 'prometeo.primary-chat-asset-versioning-test/v1',
  ok: true,
  version,
  source_progress_bytes: sourceProgress.length,
  compiled_reference: `./progress-v1.js?v=${version}`,
  staged_pages_verified: false
};

if (pagesRoot) {
  const stagedPage = fs.readFileSync(path.join(pagesRoot, PAGE_REL), 'utf8');
  const stagedProgress = fs.readFileSync(path.join(pagesRoot, PROGRESS_REL));
  assert.equal(stagedProgress.equals(sourceProgress), true, 'main/staged gh-pages progress bytes diverge');
  assert.equal(stagedPage, compiled, 'staged gh-pages HTML must equal deterministic compiled source HTML');
  assert.ok(stagedPage.includes(expectedRef), 'staged gh-pages HTML missing expected versioned progress reference');
  result.staged_pages_verified = true;
}

console.log(JSON.stringify(result, null, 2));
