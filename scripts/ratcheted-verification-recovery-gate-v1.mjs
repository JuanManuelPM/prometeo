import fs from 'node:fs';
import path from 'node:path';

const arr = value => Array.isArray(value) ? value : [];
const RATCHeT_REF_PREFIX = 'coordination/efficiency/RATCHET_BASELINE_V1.json#';
const SATISFIED_RUNTIME_STATUSES = new Set(['OBSERVED', 'VERIFIED', 'PASS', 'PASSED', 'SATISFIED', 'COMPLETE', 'COMPLETED', 'DONE']);

const normalize = value => String(value || '').trim().toUpperCase();

const ratchetRefs = job => [...new Set([
  ...arr(job?.evidence),
  ...arr(job?.evidence_refs),
  ...arr(job?.artifacts),
  ...arr(job?.source_refs)
].filter(value => typeof value === 'string' && value.startsWith(RATCHeT_REF_PREFIX)))];

const ratchetItemId = ref => String(ref || '').slice(RATCHeT_REF_PREFIX.length).trim();

const isSatisfiedRatchetItem = item => {
  if (!item || normalize(item.status) !== 'RATCHETED') return false;
  if (!item.runtime_evidence || typeof item.runtime_evidence !== 'object') return true;
  return SATISFIED_RUNTIME_STATUSES.has(normalize(item.runtime_evidence.status));
};

const isVerificationDebt = job => String(job?.kind || '').toLowerCase().includes('verification');

export function compileRatchetedVerificationRecoveryGate(feed = {}, ratchetBaseline = null) {
  const items = arr(ratchetBaseline?.items);
  if (!items.length) return { feed, decisions: [] };
  const byId = new Map(items.filter(item => item?.id).map(item => [String(item.id), item]));
  const decisions = [];
  const projects = arr(feed?.projects).map(project => ({
    ...project,
    jobs: arr(project?.jobs).map(job => {
      if (!isVerificationDebt(job)) return job;
      const refs = ratchetRefs(job);
      if (!refs.length) return job;
      const satisfied = refs
        .map(ref => ({ ref, item: byId.get(ratchetItemId(ref)) || null }))
        .find(row => isSatisfiedRatchetItem(row.item));
      if (!satisfied) {
        decisions.push({
          job_id: job?.job_id || null,
          suppressed: false,
          reason: 'RATCHET_REFERENCE_NOT_CANONICALLY_SATISFIED',
          ratchet_refs: refs
        });
        return job;
      }
      const runtimeEvidence = satisfied.item?.runtime_evidence && typeof satisfied.item.runtime_evidence === 'object'
        ? satisfied.item.runtime_evidence
        : null;
      decisions.push({
        job_id: job?.job_id || null,
        suppressed: true,
        reason: 'CANONICALLY_RATCHETED_VERIFICATION_DEBT_SATISFIED',
        ratchet_id: satisfied.item.id,
        ratchet_ref: satisfied.ref,
        ratchet_status: satisfied.item.status,
        runtime_evidence_status: runtimeEvidence?.status || null,
        observed_at: runtimeEvidence?.observed_at || satisfied.item?.updated_at || ratchetBaseline?.updated_at || null,
        prior_state: job?.state || null
      });
      return {
        ...job,
        state: 'done',
        ratchet_satisfaction: {
          schema: 'prometeo.ratcheted-verification-satisfaction/v1',
          status: 'SATISFIED',
          ratchet_id: satisfied.item.id,
          ratchet_ref: satisfied.ref,
          ratchet_status: satisfied.item.status,
          runtime_evidence_status: runtimeEvidence?.status || null,
          observed_at: runtimeEvidence?.observed_at || satisfied.item?.updated_at || ratchetBaseline?.updated_at || null,
          prior_state: job?.state || null
        }
      };
    })
  }));
  return { feed: { ...feed, projects }, decisions };
}

export function loadRatchetBaseline(root = '.') {
  const file = path.join(root, 'coordination', 'efficiency', 'RATCHET_BASELINE_V1.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
