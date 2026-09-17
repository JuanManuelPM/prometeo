#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arr = value => Array.isArray(value) ? value : [];
const uniq = values => [...new Set(arr(values).filter(Boolean).map(String))].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
const externalRef = value => /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);

function localPathFromRef(ref) {
  return String(ref).split('#', 1)[0];
}

function fragmentFromRef(ref) {
  const value = String(ref);
  const index = value.indexOf('#');
  return index >= 0 ? value.slice(index + 1) : '';
}

function validateKnownLocalFragment(ref, absolute, localPath) {
  const fragment = fragmentFromRef(ref);
  if (!fragment || localPath !== 'coordination/portfolio/PORTFOLIO.json') return null;

  let portfolio;
  try {
    portfolio = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch {
    return { ref, usable: false, kind: 'INVALID_REPO_LOCAL_FRAGMENT_SOURCE', local_path: localPath, fragment };
  }

  const projects = arr(portfolio?.projects);
  const projectJob = fragment.match(/^project:([^:]+):job:(.+)$/);
  if (projectJob) {
    const [, projectId, jobId] = projectJob;
    const project = projects.find(row => row?.project_id === projectId);
    const found = Boolean(project && arr(project.jobs).some(job => job?.job_id === jobId));
    return found
      ? { ref, usable: true, kind: 'REPO_LOCAL_FRAGMENT_RESOLVED', local_path: localPath, fragment }
      : { ref, usable: false, kind: 'MISSING_REPO_LOCAL_FRAGMENT', local_path: localPath, fragment };
  }

  const projectOnly = fragment.match(/^project:(.+)$/);
  if (projectOnly) {
    const found = projects.some(row => row?.project_id === projectOnly[1]);
    return found
      ? { ref, usable: true, kind: 'REPO_LOCAL_FRAGMENT_RESOLVED', local_path: localPath, fragment }
      : { ref, usable: false, kind: 'MISSING_REPO_LOCAL_FRAGMENT', local_path: localPath, fragment };
  }

  const jobOnly = fragment.match(/^job:(.+)$/);
  if (jobOnly) {
    const found = projects.some(project => arr(project?.jobs).some(job => job?.job_id === jobOnly[1]));
    return found
      ? { ref, usable: true, kind: 'REPO_LOCAL_FRAGMENT_RESOLVED', local_path: localPath, fragment }
      : { ref, usable: false, kind: 'MISSING_REPO_LOCAL_FRAGMENT', local_path: localPath, fragment };
  }

  return null;
}

export function classifyRoleEvidenceRef(ref, repoRoot = '.') {
  const value = String(ref || '').trim();
  const root = path.resolve(repoRoot);
  if (!value) return { ref: value, usable: false, kind: 'INVALID_EMPTY', local_path: null };

  if (value.startsWith('missing:')) {
    const localPath = localPathFromRef(value.slice('missing:'.length));
    return { ref: value, usable: false, kind: 'MISSING_REPO_LOCAL', local_path: localPath || null, explicit_missing: true };
  }

  if (externalRef(value)) {
    return { ref: value, usable: true, kind: 'EXTERNAL_OR_ANNOTATED', local_path: null };
  }

  const localPath = localPathFromRef(value);
  if (!localPath) return { ref: value, usable: false, kind: 'INVALID_EMPTY_LOCAL_PATH', local_path: null };
  const absolute = path.resolve(root, localPath);
  const insideRoot = absolute === root || absolute.startsWith(`${root}${path.sep}`);
  if (!insideRoot) return { ref: value, usable: false, kind: 'INVALID_REPO_LOCAL_ESCAPE', local_path: localPath };
  if (!fs.existsSync(absolute)) return { ref: value, usable: false, kind: 'MISSING_REPO_LOCAL', local_path: localPath, explicit_missing: false };
  const fragmentResult = validateKnownLocalFragment(value, absolute, localPath);
  if (fragmentResult) return fragmentResult;
  return { ref: value, usable: true, kind: 'REPO_LOCAL_RESOLVED', local_path: localPath };
}

export function validateRoleEvidenceRefs(evidence = [], repoRoot = '.') {
  const classified = uniq(evidence).map(ref => classifyRoleEvidenceRef(ref, repoRoot));
  const usable = classified.filter(row => row.usable).map(row => row.ref);
  const diagnostics = classified
    .filter(row => !row.usable)
    .map(({ usable, ...row }) => row)
    .sort((a, b) => Buffer.from(`${a.kind}:${a.ref}`).compare(Buffer.from(`${b.kind}:${b.ref}`)));
  const external_preserved = classified.filter(row => row.usable && row.kind === 'EXTERNAL_OR_ANNOTATED').map(row => row.ref);
  return { usable, diagnostics, external_preserved };
}

export function applyRoleEvidenceIntegrity(allocator = {}, repoRoot = '.') {
  const roleReady = arr(allocator.role_ready);
  const emitted = [];
  const missing = [];
  const suppressed = [];
  const externalPreserved = [];

  for (const candidate of roleReady) {
    const result = validateRoleEvidenceRefs(candidate.evidence, repoRoot);
    const candidateDiagnostics = result.diagnostics.map(row => ({
      ...row,
      role_id: candidate.role_id || candidate.guide_work_id || null,
      role: candidate.role || null,
      trigger: candidate.trigger || null
    }));
    missing.push(...candidateDiagnostics.filter(row => row.kind === 'MISSING_REPO_LOCAL' || row.kind === 'MISSING_REPO_LOCAL_FRAGMENT'));
    externalPreserved.push(...result.external_preserved);

    if (!result.usable.length) {
      suppressed.push({
        role_id: candidate.role_id || candidate.guide_work_id || null,
        role: candidate.role || null,
        trigger: candidate.trigger || null,
        fingerprint: candidate.fingerprint || null,
        reason: 'NO_USABLE_EVIDENCE_AFTER_REPO_LOCAL_VALIDATION',
        evidence_diagnostics: candidateDiagnostics
      });
      continue;
    }

    emitted.push({
      ...candidate,
      evidence: result.usable,
      evidence_diagnostics: candidateDiagnostics,
      claim_payload_shape: candidate.claim_payload_shape ? {
        ...candidate.claim_payload_shape,
        evidence: result.usable
      } : candidate.claim_payload_shape
    });
  }

  return {
    ...allocator,
    counts: {
      ...(allocator.counts || {}),
      role_ready: emitted.length
    },
    role_ready: emitted,
    diagnostics: {
      ...(allocator.diagnostics || {}),
      role_evidence_integrity: {
        schema: 'prometeo.role-evidence-integrity/v1',
        checked_candidates: roleReady.length,
        emitted_candidates: emitted.length,
        suppressed_candidates: suppressed,
        missing_repo_local_refs: missing,
        missing_repo_local_fragment_refs: missing.filter(row => row.kind === 'MISSING_REPO_LOCAL_FRAGMENT'),
        external_refs_preserved: uniq(externalPreserved)
      }
    }
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const [inputPath, outputPath, repoRoot = '.'] = argv;
  if (!inputPath || !outputPath) {
    throw new Error('usage: apply-role-evidence-integrity.mjs <allocator-in.json> <allocator-out.json> [repo-root]');
  }
  const allocator = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const next = applyRoleEvidenceIntegrity(allocator, repoRoot);
  fs.writeFileSync(outputPath, `${JSON.stringify(next, null, 2)}\n`);
  const diag = next.diagnostics.role_evidence_integrity;
  process.stdout.write(`role-evidence-integrity checked=${diag.checked_candidates} emitted=${diag.emitted_candidates} suppressed=${diag.suppressed_candidates.length} missing=${diag.missing_repo_local_refs.length}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}
