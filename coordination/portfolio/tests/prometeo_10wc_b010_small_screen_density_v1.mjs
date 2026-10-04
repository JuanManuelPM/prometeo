import assert from 'node:assert/strict';
import {
  SMALL_SCREEN_DENSITY_TIERS,
  densityTierForViewport,
  smallScreenDensityStrategy,
  truncateForDensity
} from '../../../current-tree/control-v11/work-score/small-screen-density.mjs';

assert.equal(densityTierForViewport({ width: 360, height: 800 }), 'NARROW');
assert.equal(densityTierForViewport({ width: 412, height: 915 }), 'COMPACT');
assert.equal(densityTierForViewport({ width: 900, height: 700 }), 'STANDARD');
assert.equal(densityTierForViewport({ width: 1440, height: 900 }), 'WIDE');

for (const tier of Object.values(SMALL_SCREEN_DENSITY_TIERS)) assert.ok(tier.minTapPx >= 44);

const phone = smallScreenDensityStrategy({ width: 412, height: 915, coarsePointer: true });
assert.equal(phone.tier, 'COMPACT');
assert.equal(phone.pinchZoomEnabled, true);
assert.equal(phone.horizontalPanEnabled, true);
assert.equal(phone.coreControlsMinPx, 44);
assert.ok(phone.preserve.includes('LIFECYCLE_STATE'));
assert.ok(phone.defer.includes('NONSELECTED_BLOCK_METADATA'));

const desktop = smallScreenDensityStrategy({ width: 1440, height: 900, coarsePointer: false });
assert.equal(desktop.tier, 'WIDE');
assert.equal(desktop.pinchZoomEnabled, false);
assert.equal(desktop.horizontalPanEnabled, false);

assert.equal(truncateForDensity('dependency highlight interaction', 12), 'dependency…');
assert.equal(truncateForDensity('short', 12), 'short');
assert.equal(truncateForDensity('abc', 1), '…');

console.log('PASS B010 small screen density');
