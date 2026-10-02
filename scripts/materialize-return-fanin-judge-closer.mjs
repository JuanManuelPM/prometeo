import fs from 'node:fs';
import path from 'node:path';
import { fanInReturns, judgeCampaign, closeCampaign, CAMPAIGN_CLOSE_SCHEMA } from './return-fanin-judge-closer-lib.mjs';

const root = process.cwd();
const contractArg = process.argv[2];
if (!contractArg) throw new Error('USAGE: node scripts/materialize-return-fanin-judge-closer.mjs <campaign-contract.json>');

const normalizeRel = value => String(value || '').replaceAll('\\', '/').replace(/^\/+/, '');
const safePart = value => String(value || '').trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'UNSCOPED';
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, normalizeRel(rel)), 'utf8'));
const writeStable = (rel, value) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const next = JSON.stringify(value, null, 2) + '\n';
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === next) return false;
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, file);
  return true;
};

const contractRel = normalizeRel(contractArg);
const contract = readJson(contractRel);
if (contract?.schema !== 'prometeo.campaign-judge-contract/v1') throw new Error('CAMPAIGN_CONTRACT_SHAPE_INCOMPATIBLE');
if (!contract.campaign_id || !contract.project_id || !Array.isArray(contract.required_lanes) || !Array.isArray(contract.return_refs)) {
  throw new Error('CAMPAIGN_CONTRACT_INCOMPLETE');
}

const returns = contract.return_refs.map(ref => {
  const rel = normalizeRel(ref);
  if (!rel.startsWith('coordination/portfolio/returns/')) throw new Error(`RETURN_REF_OUTSIDE_CANONICAL_ROOT:${rel}`);
  const ret = readJson(rel);
  return {...ret, return_ref: rel};
});

const fanin = fanInReturns(returns);
const verdict = judgeCampaign({campaign_id: contract.campaign_id, required_lanes: contract.required_lanes, returns});
const outRoot = `coordination/portfolio/evidence/${safePart(contract.project_id)}/campaigns/${safePart(contract.campaign_id)}`;
const closeRel = `${outRoot}/CLOSE.json`;
let priorClose = null;
if (fs.existsSync(path.join(root, closeRel))) {
  const candidate = readJson(closeRel);
  if (candidate?.schema === CAMPAIGN_CLOSE_SCHEMA && candidate?.status === 'CLOSED') priorClose = candidate;
}
const close = closeCampaign({verdict, durable_boundary: contract.durable_boundary || null, prior_close: priorClose});
const projection = {
  schema: 'prometeo.primary-chat-campaign-projection/v1',
  campaign_id: contract.campaign_id,
  project_id: contract.project_id,
  status: close.status,
  basis: close.basis,
  continuity_request: Array.isArray(close.continuity_request) ? close.continuity_request : [],
  fanin_ref: `${outRoot}/FANIN.json`,
  verdict_ref: `${outRoot}/VERDICT.json`,
  close_ref: closeRel,
  source_contract_ref: contractRel,
  privacy: 'PUBLIC_SANITIZED_REFERENCES_ONLY',
  authority: 'PROJECTION_ONLY_NO_CLOSE_OR_PROMOTION_AUTHORITY'
};

const writes = {
  fanin: writeStable(`${outRoot}/FANIN.json`, fanin),
  verdict: writeStable(`${outRoot}/VERDICT.json`, verdict),
  close: priorClose ? false : writeStable(closeRel, close),
  projection: writeStable(`${outRoot}/PRIMARY_CHAT_PROJECTION.json`, projection)
};
console.log(JSON.stringify({campaign_id: contract.campaign_id, status: close.status, writes, out_root: outRoot}));
