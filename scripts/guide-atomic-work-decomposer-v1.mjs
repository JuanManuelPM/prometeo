import crypto from 'node:crypto';

const enc = new TextEncoder();
const byteCompare = (a,b) => Buffer.from(String(a)).compare(Buffer.from(String(b)));
const sortUnique = xs => [...new Set((xs || []).map(x => String(x).trim()).filter(Boolean))].sort(byteCompare);
const slug = s => String(s || 'task').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'task';

export function shouldAtomize(signals = {}) {
  const positive = [
    Number(signals.independent_done_when_clusters || 0) >= 2,
    Number(signals.independent_lifecycle_phases || 0) >= 2,
    Number(signals.distinct_capability_lanes || 0) >= 2 && !signals.shared_mutation,
    !!signals.failure_gate_blocks_unrelated_work,
    Number(signals.independent_consumers_or_validators || 0) >= 2
  ].some(Boolean);
  const veto = [
    !!signals.small_shared_serial_object,
    Number(signals.coordination_cost || 0) >= Number(signals.execution_or_recovery_savings || Infinity),
    !!signals.context_duplication_dominates,
    !!signals.requires_new_authority,
    !!signals.missing_concrete_output_done_when_consumer
  ].some(Boolean);
  return { atomize: positive && !veto, positive, veto };
}

function canonicalIdentity(parentJobId, atom, dependencyIds) {
  return {
    parent_job_id: String(parentJobId).trim(),
    phase: String(atom.phase).trim(),
    output: String(atom.output).trim(),
    done_when: sortUnique(atom.done_when),
    consumer: String(atom.consumer).trim(),
    dependencies: sortUnique(dependencyIds),
    required_capabilities: sortUnique(atom.required_capabilities)
  };
}

function fingerprint(identity) {
  return crypto.createHash('sha256').update(enc.encode(JSON.stringify(identity))).digest('hex').slice(0,12);
}

export function decompose(parent) {
  if (!parent || !parent.job_id) throw new Error('PARENT_JOB_ID_REQUIRED');
  const decision = shouldAtomize(parent.signals || {});
  if (!decision.atomize) return { decision, atoms: [] };
  const specs = Array.isArray(parent.candidate_atoms) ? parent.candidate_atoms : [];
  if (specs.length < 2) throw new Error('AT_LEAST_TWO_CANDIDATE_ATOMS_REQUIRED');
  const byKey = new Map(specs.map(a => [String(a.key), a]));
  if (byKey.size !== specs.length) throw new Error('DUPLICATE_ATOM_KEY');

  const provisional = new Map();
  const visit = (key, stack=[]) => {
    if (provisional.has(key)) return provisional.get(key);
    if (stack.includes(key)) throw new Error('DEPENDENCY_CYCLE');
    const atom = byKey.get(key);
    if (!atom) throw new Error(`UNKNOWN_DEPENDENCY:${key}`);
    for (const req of ['phase','output','owner','consumer','recovery_checkpoint']) if (!String(atom[req] || '').trim()) throw new Error(`ATOM_${req.toUpperCase()}_REQUIRED:${key}`);
    if (!Array.isArray(atom.done_when) || atom.done_when.length === 0) throw new Error(`ATOM_DONE_WHEN_REQUIRED:${key}`);
    const depKeys = sortUnique(atom.dependencies);
    const depIds = depKeys.map(d => visit(d, [...stack,key]).atomic_task_id);
    const identity = canonicalIdentity(parent.job_id, atom, depIds);
    const id = `atom-${slug(parent.job_id)}-${slug(atom.phase)}-${fingerprint(identity)}`;
    const out = {
      schema: 'prometeo.atomic-task/v1',
      atomic_task_id: id,
      parent_job_id: String(parent.job_id).trim(),
      phase: String(atom.phase).trim(),
      input_refs: sortUnique(atom.input_refs),
      output: String(atom.output).trim(),
      done_when: sortUnique(atom.done_when),
      owner: String(atom.owner).trim(),
      consumer: String(atom.consumer).trim(),
      dependencies: sortUnique(depIds),
      required_capabilities: sortUnique(atom.required_capabilities),
      recovery_checkpoint: String(atom.recovery_checkpoint).trim(),
      authority: 'PLANNING_ONLY_NO_CLAIM_AUTHORITY'
    };
    provisional.set(key, out);
    return out;
  };
  for (const key of [...byKey.keys()].sort(byteCompare)) visit(key);
  const atoms = [...provisional.values()];
  const depth = new Map();
  const depthOf = id => {
    if (depth.has(id)) return depth.get(id);
    const a = atoms.find(x => x.atomic_task_id === id);
    const d = a.dependencies.length ? 1 + Math.max(...a.dependencies.map(depthOf)) : 0;
    depth.set(id,d); return d;
  };
  atoms.sort((a,b)=>depthOf(a.atomic_task_id)-depthOf(b.atomic_task_id) || byteCompare(a.phase,b.phase) || byteCompare(a.atomic_task_id,b.atomic_task_id));
  return { decision, atoms };
}

export function validateAtomicTask(task) {
  const required=['schema','atomic_task_id','parent_job_id','phase','input_refs','output','done_when','owner','consumer','dependencies','required_capabilities','recovery_checkpoint','authority'];
  const missing=required.filter(k=>task?.[k]===undefined || task?.[k]===null || task?.[k]==='');
  if(task?.schema!=='prometeo.atomic-task/v1') missing.push('schema_value');
  if(task?.authority!=='PLANNING_ONLY_NO_CLAIM_AUTHORITY') missing.push('authority_value');
  if(!Array.isArray(task?.done_when)||task.done_when.length===0) missing.push('done_when_nonempty');
  return {ok:missing.length===0,missing};
}
