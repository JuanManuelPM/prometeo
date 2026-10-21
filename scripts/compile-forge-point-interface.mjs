#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateForgePointInterface } from './validate-forge-point-interface.mjs';

const FORBIDDEN_DRAFT_KEYS = new Set(['schema','point_id','source']);
const REQUIRED_DRAFT_ARRAYS = [
  'inputs','outputs','states','operations','events',
  'invariants','dependencies','tests','open_decisions'
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
}

function pointId(pointNo) {
  requirePositiveInteger(pointNo, 'point_no');
  if (pointNo > 999) throw new Error('point_no must be <= 999');
  return `P${String(pointNo).padStart(3, '0')}`;
}

function sourceHash(canonicalText) {
  return 'sha256:' + crypto.createHash('sha256').update(canonicalText, 'utf8').digest('hex');
}

export function compileForgePointInterface(canonical, draft) {
  if (!isObject(canonical)) throw new Error('canonical metadata must be an object');
  if (!isObject(draft)) throw new Error('draft must be an object');

  const blueprintId = canonical.blueprint_id;
  if (typeof blueprintId !== 'string' || !/^[A-Za-z0-9._-]+$/.test(blueprintId)) {
    throw new Error('canonical.blueprint_id must be a stable identifier');
  }

  const canonicalText = canonical.canonical_text;
  if (typeof canonicalText !== 'string' || !canonicalText.trim()) {
    throw new Error('canonical.canonical_text must be non-empty');
  }

  requirePositiveInteger(canonical.canonical_version, 'canonical.canonical_version');
  requirePositiveInteger(draft.interface_version, 'draft.interface_version');

  for (const key of FORBIDDEN_DRAFT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(draft, key)) {
      throw new Error(`draft must not set compiler-owned field: ${key}`);
    }
  }
  if (typeof draft.purpose !== 'string' || !draft.purpose.trim()) {
    throw new Error('draft.purpose is required');
  }
  for (const key of REQUIRED_DRAFT_ARRAYS) {
    if (!Array.isArray(draft[key])) throw new Error(`draft.${key} must be an array`);
  }

  const pid = pointId(canonical.point_no);
  const hash = sourceHash(canonicalText);
  const compiled = {
    schema: 'prometeo.forge-point-interface/v1',
    point_id: pid,
    interface_version: draft.interface_version,
    source: {
      canonical_ref: `forge://blueprint/${blueprintId}/${pid}/canonical`,
      canonical_version: canonical.canonical_version,
      source_hash: hash
    },
    purpose: draft.purpose,
    inputs: draft.inputs,
    outputs: draft.outputs,
    states: draft.states,
    operations: draft.operations,
    events: draft.events,
    invariants: draft.invariants,
    dependencies: draft.dependencies,
    tests: draft.tests,
    open_decisions: draft.open_decisions
  };

  const validation = validateForgePointInterface(compiled, {
    canonicalVersion: canonical.canonical_version,
    sourceHash: hash
  });
  if (!validation.valid || validation.stale) {
    const detail = [...validation.errors, ...validation.stale_reasons].join('; ');
    throw new Error(`compiled interface failed validation: ${detail || 'unknown validation error'}`);
  }

  return compiled;
}

function parseJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    const [canonicalPath, draftPath, outputPath] = process.argv.slice(2);
    if (!canonicalPath || !draftPath) {
      throw new Error('usage: node scripts/compile-forge-point-interface.mjs <canonical.json> <draft.json> [output.json]');
    }
    const compiled = compileForgePointInterface(parseJson(canonicalPath), parseJson(draftPath));
    const serialized = JSON.stringify(compiled, null, 2) + '\n';
    if (outputPath) fs.writeFileSync(outputPath, serialized);
    else process.stdout.write(serialized);
  } catch (error) {
    process.stderr.write(String(error?.message || error) + '\n');
    process.exitCode = 1;
  }
}
