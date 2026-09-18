#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGroundedReproductionMetric } from '../../../scripts/live-reproduction-metric.mjs';

const parentPath='coordination/portfolio/returns/job-parent/RETURN-parent.json';
const partialPath='coordination/portfolio/returns/job-partial/RETURN-partial.json';

const parent={job_id:'job-parent',origin:'seed',returns:[{path:parentPath,outcome:'DONE'}]};
const partial={job_id:'job-partial',origin:'seed',returns:[{path:partialPath,outcome:'PARTIAL'}]};
const linkedOne={job_id:'linked-one',origin:'derived',derived_from_return:parentPath};
const unrelated={job_id:'unrelated',origin:'derived',derived_from_return:'coordination/portfolio/returns/other/RETURN-other.json'};
const linkedPartial={job_id:'linked-to-partial',origin:'derived',derived_from_return:partialPath};

assert.deepEqual(
  buildGroundedReproductionMetric([parent,partial,linkedOne]),
  {grounded_successors:1,eligible_terminal_returns:1,ratio:1},
  'one durable terminal return with one causally linked successor must be 1/1'
);

assert.deepEqual(
  buildGroundedReproductionMetric([parent,partial,linkedOne,unrelated,linkedPartial]),
  {grounded_successors:1,eligible_terminal_returns:1,ratio:1},
  'unrelated derived jobs and links to nonterminal returns must not change grounded reproduction'
);

const linkedTwo={
  job_id:'linked-two',
  origin:'derived',
  derived_from_returns:[parentPath+'#evidence',partialPath]
};

assert.deepEqual(
  buildGroundedReproductionMetric([parent,partial,linkedOne,linkedTwo,unrelated,linkedPartial]),
  {grounded_successors:2,eligible_terminal_returns:1,ratio:2},
  'two distinct successors linked to one eligible return must count as two grounded successors'
);

assert.deepEqual(
  buildGroundedReproductionMetric(
    [parent,partial,linkedOne,linkedTwo,unrelated,linkedPartial],
    {excluded_return_refs:[parentPath]}
  ),
  {grounded_successors:0,eligible_terminal_returns:0,ratio:0},
  'a terminal receipt reconciled to NONTERMINAL_ROUTE_ABORT must not count as an eligible closure or ground successors'
);

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const normalize=fs.readFileSync(path.join(root,'.github/scripts/normalize-live-feed.mjs'),'utf8');
assert.ok(
  !normalize.includes('ps.reproduction = Number(ps.derived) / Math.max(1, ps.terminal_returns)'),
  'normalization must not restore the coarse derived/terminal_returns ratio'
);

console.log('LIVE_REPRODUCTION_METRIC_PROVENANCE_PASS');
