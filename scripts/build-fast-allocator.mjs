#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import * as core from './build-fast-allocator-core-v3.mjs';

export * from './build-fast-allocator-core-v3.mjs';

const arr = value => Array.isArray(value) ? value : [];
const normalizeBoundaryValue = value => String(value || '').trim().toUpperCase();
const transportBoundaryValues = doc => [
  doc?.reason,
  doc?.outcome,
  doc?.classification,
  doc?.transport_boundary_v1?.classification
].map(normalizeBoundaryValue);

export function isExplicitClaimTransportBlocked(doc = {}) {
  return transportBoundaryValues(doc).includes('CLAIM_TRANSPORT_BLOCKED');
}

function normalizeTransportBoundaryAliases(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;
  if (!isExplicitClaimTransportBlocked(doc)) return doc;
  if ([doc.reason, doc.outcome].map(normalizeBoundaryValue).includes('CLAIM_TRANSPORT_BLOCKED')) return doc;
  return { ...doc, reason: 'CLAIM_TRANSPORT_BLOCKED' };
}

function normalizeRoleContext(roleContext) {
  if (!roleContext || typeof roleContext !== 'object') return roleContext;
  return {
    ...roleContext,
    noAlloc: arr(roleContext.noAlloc).map(row => ({
      ...row,
      doc: normalizeTransportBoundaryAliases(row?.doc)
    }))
  };
}

function normalizeEfficiency(efficiency) {
  if (!efficiency || typeof efficiency !== 'object') return efficiency;
  const causes = efficiency.no_allocation_causes;
  if (!causes || typeof causes !== 'object') return efficiency;
  return {
    ...efficiency,
    no_allocation_causes: {
      ...causes,
      recent_receipts: arr(causes.recent_receipts).map(row =>
        typeof row === 'string' ? row : normalizeTransportBoundaryAliases(row)
      )
    }
  };
}

export function compileRoleFrontier(feed = {}, efficiency = {}, jobs = [], ready = [], queueReady = [], recovery = [], roleContext = null) {
  return core.compileRoleFrontier(
    feed,
    normalizeEfficiency(efficiency),
    jobs,
    ready,
    queueReady,
    recovery,
    normalizeRoleContext(roleContext)
  );
}

export function buildFastAllocator(feed = {}, efficiency = {}, options = {}) {
  return core.buildFastAllocator(feed, normalizeEfficiency(efficiency), {
    ...options,
    roleContext: normalizeRoleContext(options?.roleContext || null)
  });
}

export function runCli(argv = process.argv.slice(2)) {
  const [feedPath, efficiencyPath, outPath, root = '.'] = argv;
  if (!feedPath || !efficiencyPath || !outPath) {
    throw new Error('usage: build-fast-allocator.mjs <feed.json> <efficiency.json> <allocator.json> [repo-root]');
  }
  const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
  const efficiency = JSON.parse(fs.readFileSync(efficiencyPath, 'utf8'));
  const recoveryPolicies = core.loadRecoveryPolicies(root);
  const roleContext = core.loadRoleContext(root);
  const allocator = buildFastAllocator(feed, efficiency, { recoveryPolicies, roleContext });
  fs.writeFileSync(outPath, `${JSON.stringify(allocator, null, 2)}\n`);
  process.stdout.write(`allocator ${allocator.schema} ready=${allocator.counts.ready} queue=${allocator.counts.queue_ready} roles=${allocator.counts.role_ready} recovery=${allocator.counts.recovery}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}
