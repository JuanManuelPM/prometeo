import fs from 'node:fs';

const p='scripts/build-fast-allocator.mjs';
let s=fs.readFileSync(p,'utf8');
const replaceOnce=(from,to,label)=>{
  if(s.includes(to)) return;
  const n=s.split(from).length-1;
  if(n!==1) throw new Error(`${label}: expected exactly one patch point, found ${n}`);
  s=s.replace(from,to);
};
replaceOnce(
  "import { pathToFileURL } from 'node:url';",
  "import { pathToFileURL } from 'node:url';\nimport { applyUsefulReserveOrdering } from './useful-reserve-allocator-v1.mjs';",
  'import'
);
replaceOnce(
  "  if (batchCandidates.length < 8) pushBatch('role_ready', infraRoles.slice(0, Math.max(0, 8 - batchCandidates.length)));\n\n  return {",
  "  if (batchCandidates.length < 8) pushBatch('role_ready', infraRoles.slice(0, Math.max(0, 8 - batchCandidates.length)));\n\n  // USEFUL_RESERVE is an ordering refinement inside the existing allocator, never a new queue.\n  // Invalid reserve-shaped candidates are omitted; verified reserve stays behind human/product/system work.\n  const usefulReserve = applyUsefulReserveOrdering(batchCandidates, { jobs, policy: roleContext?.usefulReservePolicy });\n\n  return {",
  'ordering-call'
);
replaceOnce(
  "    batch_strategy: 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD',\n    batch_candidates: batchCandidates.slice(0, 40),",
  "    batch_strategy: 'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD',\n    useful_reserve: usefulReserve.report,\n    batch_candidates: usefulReserve.ordered.slice(0, 40),",
  'allocator-output'
);
replaceOnce(
  "    metabolism: JSON.parse(fs.readFileSync(metabolismPath, 'utf8')),\n    projectGuideMesh:",
  "    metabolism: JSON.parse(fs.readFileSync(metabolismPath, 'utf8')),\n    usefulReservePolicy: fs.existsSync(path.join(root, 'coordination', 'guide', 'USEFUL_RESERVE_POLICY_V1.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'coordination', 'guide', 'USEFUL_RESERVE_POLICY_V1.json'), 'utf8')) : null,\n    projectGuideMesh:",
  'role-context-policy'
);
fs.writeFileSync(p,s);
console.log('PASS patch-useful-reserve-allocator-wiring-v1');
