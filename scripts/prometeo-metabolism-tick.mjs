#!/usr/bin/env node
import process from 'node:process';
import {
  assertPinnedHead,
  currentGitHead,
  deriveMetabolism,
  loadMetabolismInputs,
  semanticDigest,
  writeShadowOutputs
} from './prometeo-metabolism-lib.mjs';
import {
  deriveOrthogonalVerifierMaterialization,
  loadOrthogonalVerifierMatrix,
  writeOrthogonalVerifierShadow
} from './guide-orthogonal-verifier-materializer-v1.mjs';

function arg(name, fallback=null) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find(x => x.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const root = arg('root', process.cwd());
const now = arg('now', new Date().toISOString());
const trigger = arg('trigger', process.env.PROMETEO_TRIGGER ?? 'manual');
const dryRun = process.argv.includes('--dry-run');
const expectedHead = arg('head', process.env.PROMETEO_PINNED_HEAD ?? null);

try {
  const startHead = currentGitHead(root);
  if (!startHead) throw new Error('SOURCE_HEAD_UNRESOLVED');
  if (expectedHead) assertPinnedHead(expectedHead, startHead);
  const inputs = loadMetabolismInputs(root);
  const derived = deriveMetabolism({sourceHead:startHead, ...inputs, now});
  const verifierMatrix = loadOrthogonalVerifierMatrix(root);
  const orthogonalVerifier = deriveOrthogonalVerifierMaterialization({
    matrix: verifierMatrix,
    proposals: inputs.proposals,
    now
  });
  const orthogonalVerifierDigest = semanticDigest({...orthogonalVerifier, generated_at: null});
  const beforeWriteHead = currentGitHead(root);
  assertPinnedHead(startHead, beforeWriteHead);
  if (dryRun) {
    console.log(JSON.stringify({
      ok:true,
      dry_run:true,
      source_head:startHead,
      semantic_bundle_digest:derived.semantic_bundle_digest,
      orthogonal_verifier_digest:orthogonalVerifierDigest,
      outputs:{...derived.outputs, ORTHOGONAL_VERIFIER_SLICES:orthogonalVerifier}
    }, null, 2));
    process.exit(0);
  }
  const written = writeShadowOutputs(root, derived, {trigger});
  const verifierWrite = writeOrthogonalVerifierShadow(root, orthogonalVerifier);
  const changedPaths = verifierWrite.changed
    ? [...written.changed, verifierWrite.path]
    : written.changed;
  const afterWriteHead = currentGitHead(root);
  assertPinnedHead(startHead, afterWriteHead);
  console.log(JSON.stringify({
    ok:true,
    source_head:startHead,
    semantic_bundle_digest:derived.semantic_bundle_digest,
    orthogonal_verifier_digest:orthogonalVerifierDigest,
    orthogonal_verifier_metrics:orthogonalVerifier.metrics,
    changed_paths:changedPaths,
    next_boundary:written.lastTick.next_boundary
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ok:false,error:String(error?.message ?? error)}, null, 2));
  process.exit(1);
}
