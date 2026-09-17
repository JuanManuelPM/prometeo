#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const NEGATIVE_TERMINAL = /(FAILED|FAILURE|CONFLICT|CANCELLED|CANCELED|BOUNDARY|REJECTED|INVALID)/i;
const CONFLICT_STATE = /CONFLICT/i;
const DONE_STATE = /^DONE$/i;
const RETURN_STATE = /RETURN/i;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const asArray = value => Array.isArray(value) ? value : [];
const norm = value => String(value ?? '').trim();

export function isNegativeTerminalState(state) {
  return NEGATIVE_TERMINAL.test(norm(state));
}

export function isQualifyingReturn(doc) {
  const state = norm(doc?.state);
  return RETURN_STATE.test(state) && !isNegativeTerminalState(state);
}

export function isDoneRun(doc) {
  return DONE_STATE.test(norm(doc?.state));
}

function authorityBlockFor(opportunity, explicitBlockedIds = new Set()) {
  const id = opportunity?.opportunity_id;
  if (explicitBlockedIds.has(id)) return {blocked:true, code:'AUTHORITY_BLOCK_EXPLICIT'};
  if (opportunity?.authority_block === true) return {blocked:true, code:'AUTHORITY_BLOCK_FIELD'};
  if (/^BLOCKED/i.test(norm(opportunity?.authority_status))) return {blocked:true, code:'AUTHORITY_STATUS_BLOCKED'};
  if (opportunity?.authority_gate && opportunity.authority_gate.resolved === false) {
    return {blocked:true, code:'AUTHORITY_GATE_UNRESOLVED'};
  }
  return {blocked:false};
}

function opportunityMapFromQueues(queues) {
  const map = new Map();
  for (const queue of queues) {
    for (const opp of asArray(queue?.opportunities)) {
      const id = norm(opp?.opportunity_id);
      if (!id) continue;
      if (!map.has(id)) map.set(id, opp);
    }
  }
  return map;
}

export function detectDependencyCycles(queues) {
  const opportunities = opportunityMapFromQueues(queues);
  const color = new Map();
  const stack = [];
  const inCycle = new Set();

  const visit = id => {
    color.set(id, 1);
    stack.push(id);
    const opp = opportunities.get(id);
    for (const dep of asArray(opp?.dependencies ?? opp?.dependency_ids)) {
      if (!opportunities.has(dep)) continue;
      const c = color.get(dep) ?? 0;
      if (c === 0) visit(dep);
      else if (c === 1) {
        const start = stack.lastIndexOf(dep);
        for (const member of stack.slice(start)) inCycle.add(member);
      }
    }
    stack.pop();
    color.set(id, 2);
  };

  for (const id of opportunities.keys()) if ((color.get(id) ?? 0) === 0) visit(id);
  return inCycle;
}

function matchingDoneRunForReturn(returnDoc, runs) {
  return runs.find(run => {
    if (!isDoneRun(run)) return false;
    if (norm(run?.opportunity_id) !== norm(returnDoc?.opportunity_id)) return false;
    const sameRun = norm(run?.run_id) && norm(run?.run_id) === norm(returnDoc?.run_id);
    const pathMatch = norm(run?.return_ref) && norm(returnDoc?.__path) && norm(run?.return_ref) === norm(returnDoc?.__path);
    return sameRun || pathMatch;
  });
}

export function classifyDependencyEvidence(opportunityId, {runs = [], returns = []} = {}) {
  const depRuns = runs.filter(x => norm(x?.opportunity_id) === opportunityId);
  const depReturns = returns.filter(x => norm(x?.opportunity_id) === opportunityId);

  const conflictingReturns = depReturns.filter(x => CONFLICT_STATE.test(norm(x?.state)));
  if (conflictingReturns.length) {
    return {
      opportunity_id: opportunityId,
      state: 'CONFLICTED',
      satisfied: false,
      reason_code: 'CONFLICTED_DEPENDENCY_EVIDENCE',
      run_ids: depRuns.map(x => x.run_id).filter(Boolean),
      return_refs: conflictingReturns.map(x => x.__path ?? x.run_id).filter(Boolean)
    };
  }

  for (const ret of depReturns.filter(isQualifyingReturn)) {
    const run = matchingDoneRunForReturn(ret, depRuns);
    if (run) {
      return {
        opportunity_id: opportunityId,
        state: 'SATISFIED',
        satisfied: true,
        reason_code: 'RETURN_AND_DONE_PROVEN',
        run_id: run.run_id ?? null,
        return_ref: ret.__path ?? run.return_ref ?? null,
        return_state: ret.state ?? null,
        run_state: run.state ?? null
      };
    }
  }

  const negativeRuns = depRuns.filter(x => isNegativeTerminalState(x?.state));
  const negativeReturns = depReturns.filter(x => isNegativeTerminalState(x?.state));
  const activeRuns = depRuns.filter(x => !isDoneRun(x) && !isNegativeTerminalState(x?.state));
  const qualifyingReturns = depReturns.filter(isQualifyingReturn);
  const doneRuns = depRuns.filter(isDoneRun);

  if ((negativeRuns.length || negativeReturns.length) && !activeRuns.length && !qualifyingReturns.length) {
    return {
      opportunity_id: opportunityId,
      state: 'FAILED_TERMINAL',
      satisfied: false,
      reason_code: 'DEPENDENCY_FAILED_OR_BOUNDARY',
      run_ids: negativeRuns.map(x => x.run_id).filter(Boolean),
      return_refs: negativeReturns.map(x => x.__path ?? x.run_id).filter(Boolean)
    };
  }

  if (qualifyingReturns.length && !doneRuns.length) {
    return {
      opportunity_id: opportunityId,
      state: 'RETURNED_NOT_TERMINAL',
      satisfied: false,
      reason_code: 'RETURN_WITHOUT_DONE',
      return_refs: qualifyingReturns.map(x => x.__path ?? x.run_id).filter(Boolean)
    };
  }

  if (doneRuns.length && !qualifyingReturns.length) {
    return {
      opportunity_id: opportunityId,
      state: 'DONE_MISSING_RETURN',
      satisfied: false,
      reason_code: 'DONE_WITHOUT_RETURN',
      run_ids: doneRuns.map(x => x.run_id).filter(Boolean)
    };
  }

  if (depRuns.length || depReturns.length) {
    return {
      opportunity_id: opportunityId,
      state: 'PENDING',
      satisfied: false,
      reason_code: 'DEPENDENCY_INCOMPLETE',
      run_ids: depRuns.map(x => x.run_id).filter(Boolean),
      return_refs: depReturns.map(x => x.__path ?? x.run_id).filter(Boolean)
    };
  }

  return {
    opportunity_id: opportunityId,
    state: 'MISSING',
    satisfied: false,
    reason_code: 'NO_RETURN_DONE_EVIDENCE'
  };
}

export function deriveOpportunityReadiness({queues = [], runs = [], returns = [], authorityBlockedIds = []} = {}) {
  const explicitAuthorityBlocks = new Set(authorityBlockedIds);
  const cycles = detectDependencyCycles(queues);
  const all = [];

  for (const queue of queues) {
    for (const opportunity of asArray(queue?.opportunities)) {
      const id = norm(opportunity?.opportunity_id);
      if (!id) continue;
      const sourceStatus = norm(opportunity?.status || opportunity?.source_state || 'UNKNOWN');
      const deps = asArray(opportunity?.dependencies ?? opportunity?.dependency_ids);
      const activationRule = norm(opportunity?.activation_rule);
      const authority = authorityBlockFor(opportunity, explicitAuthorityBlocks);

      const result = {
        opportunity_id: id,
        queue_id: queue?.queue_id ?? null,
        source_status: sourceStatus,
        activation_rule: activationRule || null,
        dependencies: deps,
        derived_status: sourceStatus,
        claimable_if_unclaimed: /^READY$/i.test(sourceStatus),
        reasons: [],
        dependency_evidence: []
      };

      if (authority.blocked) {
        result.derived_status = 'BLOCKED_AUTHORITY';
        result.claimable_if_unclaimed = false;
        result.reasons.push(authority.code);
        all.push(result);
        continue;
      }

      if (!/^BLOCKED_DEPENDENCY$/i.test(sourceStatus)) {
        result.derived_status = /^READY$/i.test(sourceStatus) ? 'READY_SOURCE' : sourceStatus;
        result.claimable_if_unclaimed = /^READY$/i.test(sourceStatus);
        result.reasons.push(/^READY$/i.test(sourceStatus) ? 'SOURCE_ALREADY_READY' : 'NOT_DEPENDENCY_GATED');
        all.push(result);
        continue;
      }

      if (cycles.has(id)) {
        result.derived_status = 'BLOCKED_DEPENDENCY';
        result.claimable_if_unclaimed = false;
        result.reasons.push('DEPENDENCY_CYCLE');
        all.push(result);
        continue;
      }

      result.dependency_evidence = deps.map(dep => classifyDependencyEvidence(dep, {runs, returns}));

      if (result.dependency_evidence.some(x => x.state === 'CONFLICTED')) {
        result.derived_status = 'BLOCKED_DEPENDENCY';
        result.claimable_if_unclaimed = false;
        result.reasons.push('CONFLICTED_PREREQUISITE');
        all.push(result);
        continue;
      }
      if (result.dependency_evidence.some(x => x.state === 'FAILED_TERMINAL')) {
        result.derived_status = 'BLOCKED_DEPENDENCY';
        result.claimable_if_unclaimed = false;
        result.reasons.push('FAILED_PREREQUISITE');
        all.push(result);
        continue;
      }

      let activated = false;
      if (activationRule === 'ALL_DEPENDENCIES_HAVE_RETURN') {
        activated = deps.length > 0 && result.dependency_evidence.every(x => x.satisfied);
      } else if (activationRule === 'ANY_MAJOR_INTEGRATION_RETURN') {
        activated = result.dependency_evidence.some(x => x.satisfied);
      } else {
        result.derived_status = 'BLOCKED_DEPENDENCY';
        result.claimable_if_unclaimed = false;
        result.reasons.push('UNSUPPORTED_ACTIVATION_RULE');
        all.push(result);
        continue;
      }

      if (activated) {
        result.derived_status = 'READY_DERIVED';
        result.claimable_if_unclaimed = true;
        result.reasons.push('ACTIVATION_RULE_PROVEN');
      } else {
        result.derived_status = 'BLOCKED_DEPENDENCY';
        result.claimable_if_unclaimed = false;
        const missing = result.dependency_evidence.filter(x => !x.satisfied).map(x => `${x.opportunity_id}:${x.reason_code}`);
        result.reasons.push('ACTIVATION_RULE_NOT_PROVEN', ...missing);
      }
      all.push(result);
    }
  }

  return {
    schema: 'prometeo.dynamic-readiness-projection/v1',
    generated_at: new Date().toISOString(),
    authority: 'DERIVED_PROJECTION_ONLY_NO_QUEUE_MUTATION_NO_GLOBAL_PROMOTION',
    rules: {
      dependency_success: 'A prerequisite is satisfied only by matching qualifying RETURN + run state DONE evidence for the same opportunity/run.',
      return_without_done: 'BLOCKED',
      done_without_return: 'BLOCKED',
      failed_or_conflicted_prerequisite: 'BLOCKED',
      cycles: 'BLOCKED; edges are never deleted implicitly',
      authority: 'Authority blocks take precedence over priority/readiness.'
    },
    summary: {
      total: all.length,
      ready_derived: all.filter(x => x.derived_status === 'READY_DERIVED').length,
      ready_source: all.filter(x => x.derived_status === 'READY_SOURCE').length,
      blocked_dependency: all.filter(x => x.derived_status === 'BLOCKED_DEPENDENCY').length,
      blocked_authority: all.filter(x => x.derived_status === 'BLOCKED_AUTHORITY').length
    },
    opportunities: all
  };
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function walkJson(dir, baseRoot = process.cwd()) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJson(full, baseRoot));
    else if (entry.isFile() && entry.name.endsWith('.json')) {
      const doc = readJsonFile(full);
      doc.__path = path.relative(baseRoot, full).split(path.sep).join('/');
      out.push(doc);
    }
  }
  return out;
}

function parseArgs(argv) {
  const result = {queues:[], repoRoot:process.cwd(), out:null, authorityBlockedIds:[]};
  for (let i=0; i<argv.length; i++) {
    const arg = argv[i];
    if (arg === '--queue') result.queues.push(argv[++i]);
    else if (arg === '--repo-root') result.repoRoot = argv[++i];
    else if (arg === '--out') result.out = argv[++i];
    else if (arg === '--authority-blocked') result.authorityBlockedIds.push(argv[++i]);
    else if (arg === '--help') result.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

export function buildProjectionFromRepository({repoRoot, queuePaths, authorityBlockedIds = []}) {
  const queues = queuePaths.map(rel => readJsonFile(path.resolve(repoRoot, rel)));
  const runs = walkJson(path.resolve(repoRoot, 'coordination/opportunities/runs'), repoRoot);
  const returns = walkJson(path.resolve(repoRoot, 'coordination/opportunities/returns'), repoRoot);
  const projection = deriveOpportunityReadiness({queues, runs, returns, authorityBlockedIds});
  projection.sources = {
    queues: queuePaths.map(rel => {
      const abs = path.resolve(repoRoot, rel);
      const bytes = fs.readFileSync(abs);
      return {path:rel, sha256:sha256(bytes)};
    }),
    runs_root: 'coordination/opportunities/runs',
    returns_root: 'coordination/opportunities/returns',
    runs_loaded: runs.length,
    returns_loaded: returns.length
  };
  return projection;
}

function printHelp() {
  console.log(`Usage: node scripts/derive-opportunity-readiness.mjs [options]\n\n` +
    `  --queue <path>             Queue JSON path (repeatable)\n` +
    `  --repo-root <path>         Repository root (default cwd)\n` +
    `  --out <path>               Write projection JSON (otherwise stdout)\n` +
    `  --authority-blocked <id>   Add explicit authority-blocked opportunity id\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    const queuePaths = args.queues.length ? args.queues : ['coordination/opportunities/UNIVERSAL_COGNITIVE_SWARM_QUEUE_V1.json'];
    const projection = buildProjectionFromRepository({repoRoot:args.repoRoot, queuePaths, authorityBlockedIds:args.authorityBlockedIds});
    const text = JSON.stringify(projection, null, 2) + '\n';
    if (args.out) {
      const target = path.resolve(args.repoRoot, args.out);
      fs.mkdirSync(path.dirname(target), {recursive:true});
      fs.writeFileSync(target, text);
    } else {
      process.stdout.write(text);
    }
  } catch (error) {
    console.error(JSON.stringify({ok:false,error:error.message}, null, 2));
    process.exit(1);
  }
}
