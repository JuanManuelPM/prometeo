import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/pages.json'), 'utf8'));
const legacyStub = fs.readFileSync(path.join(ROOT, 'shared/prometeo-shell/v2/prometeo-shell.js'), 'utf8');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/universal-shell/v5/SINGLE_SHELL_HOST_CONTRACT_v1.json'), 'utf8'));

test('legacy global shell path is a no-UI compatibility stub', () => {
  assert.match(legacyStub, /RETIRED COMPATIBILITY STUB/);
  assert.match(legacyStub, /exactly one global Prometeo shell/i);
  assert.doesNotMatch(legacyStub, /appendChild\s*\(/);
});

test('catalog never points a page leaf back at the Prometeo root shell', () => {
  for (const page of catalog.pages || []) {
    const href = String(page.href || '');
    assert.notEqual(href, '../', `${page.id} points at root`);
    assert.notEqual(href, '../index.html', `${page.id} points at root index`);
    assert.notEqual(href, 'https://juanmanuelpm.github.io/prometeo/', `${page.id} points at root shell`);
    assert.notEqual(href, 'https://juanmanuelpm.github.io/prometeo/index.html', `${page.id} points at root index`);
  }
});

test('same-repo catalog pages do not embed the Universal V5 payload themselves', () => {
  const checked = [];
  for (const page of catalog.pages || []) {
    const href = String(page.href || '');
    if (!href.startsWith('../pages/')) continue;
    const rel = href.replace(/^\.\.\//, '').split(/[?#]/)[0];
    const full = path.resolve(ROOT, rel);
    if (!full.startsWith(ROOT + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    const text = fs.readFileSync(full, 'utf8');
    assert.doesNotMatch(text, /Universal Shell V5 Integrated Control/, `${page.id} embeds global V5`);
    assert.doesNotMatch(text, /shared\/universal-shell\/v5\/chunk-/, `${page.id} boots global V5 chunks`);
    checked.push(page.id);
  }
  assert.ok(checked.length > 0, 'expected at least one local catalog page to inspect');
});

test('single-shell contract explicitly preserves child page visuals and local controls', () => {
  assert.equal(contract.schema, 'prometeo.universal-shell-single-host/v1');
  assert.match(contract.host.page_render_rule, /unchanged/i);
  assert.ok(contract.single_shell_invariants.some(x => /Exactly one global Universal Control/.test(x)));
  assert.ok(contract.single_shell_invariants.some(x => /local page-specific controls/.test(x)));
  assert.ok(contract.reposition_invariants.some(x => /dragged again/.test(x)));
  assert.ok(contract.reposition_invariants.some(x => /re-grabbed while/.test(x)));
});
