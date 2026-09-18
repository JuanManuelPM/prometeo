#!/usr/bin/env node
import assert from 'node:assert/strict';
import { compileRoleFrontier } from '../../../scripts/build-fast-allocator.mjs';

const roleContext = {
  metabolism: {
    signals: {
      recent_launch_window_minutes: 10,
      frontier_floor_absolute: 8,
      frontier_per_recent_launch: 1.5,
      frontier_ceiling: 40,
      replaceable_trigger: 3,
      collision_pressure_trigger: 3,
      partial_loop_trigger: 2
    }
  },
  guideReceipts: [],
  guidePins: [],
  heartbeats: [],
  beacons: [],
  noAlloc: [],
  projectGuideMesh: null,
  projectGuideStates: [],
  portfolio: null
};
const feed = { source_sha: 'test-sha', workers: [] };
const efficiency = { status: 'OK', metrics: {}, reasons: [] };
const recovery = (prefix, capabilities) => Array.from({ length: 3 }, (_, i) => ({
  job_id: `${prefix}-${i + 1}`,
  source_path: `coordination/portfolio/derived/test/${prefix}-${i + 1}.json`,
  predecessor_pin_ref: `coordination/portfolio/pins/${prefix}-${i + 1}/G000001.json`,
  required_capabilities: capabilities
}));

const specialized = compileRoleFrontier(
  feed, efficiency, [], [], [], recovery('browser-recovery', ['representative_javascript_browser']), roleContext
);
assert.equal(specialized.metabolism.recovery_total, 3);
assert.equal(specialized.metabolism.generic_compatible_recovery, 0);
assert.equal(specialized.metabolism.recovery_capability_pressure.specialized_total, 3);
assert.equal(
  specialized.role_ready.some(row => row.role === 'GUIDE_RESCATE'),
  false,
  'specialized recovery pressure alone must not spawn generic GUIDE_RESCATE'
);

const generic = compileRoleFrontier(
  feed, efficiency, [], [], [], recovery('generic-recovery', []), roleContext
);
assert.equal(generic.metabolism.recovery_total, 3);
assert.equal(generic.metabolism.generic_compatible_recovery, 3);
assert.equal(generic.metabolism.recovery_capability_pressure.specialized_total, 0);
assert.equal(
  generic.role_ready.some(row => row.role === 'GUIDE_RESCATE' && row.trigger === 'LOW_YIELD'),
  true,
  'generic recovery pressure must preserve LOW_YIELD rescate'
);

const mixedRecovery = [
  ...recovery('mixed-generic', []).slice(0, 2),
  ...recovery('mixed-browser', ['representative_javascript_browser']).slice(0, 2)
];
const mixed = compileRoleFrontier(feed, efficiency, [], [], [], mixedRecovery, roleContext);
assert.equal(mixed.metabolism.recovery_total, 4);
assert.equal(mixed.metabolism.generic_compatible_recovery, 2);
assert.equal(
  mixed.role_ready.some(row => row.role === 'GUIDE_RESCATE'),
  false,
  'specialized rows must not push sub-threshold generic recovery over the rescate threshold'
);

console.log('GUIDE_RESCATE_CAPABILITY_RECOVERY_PRESSURE_PASS');
