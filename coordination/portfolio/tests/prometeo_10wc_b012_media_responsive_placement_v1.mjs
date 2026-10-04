import assert from 'node:assert/strict';
import { mediaResponsivePlacement } from '../../../current-tree/control-v11/work-score/media-responsive-placement.mjs';

const wide = mediaResponsivePlacement(1440);
assert.equal(wide.mode, 'rail');
assert.match(wide.top_grid_columns, /minmax\(240px/);
assert.equal(wide.media_min_height_px, 150);

const edgeWide = mediaResponsivePlacement(901);
assert.equal(edgeWide.mode, 'rail');
const stacked = mediaResponsivePlacement(900);
assert.equal(stacked.mode, 'stacked');
assert.equal(stacked.top_grid_columns, '1fr');
assert.equal(stacked.media_min_height_px, 180);

assert.equal(mediaResponsivePlacement(521).mode, 'stacked');
const phone = mediaResponsivePlacement(520);
assert.equal(phone.mode, 'phone_compact');
assert.equal(phone.controls_wrap, true);
assert.equal(phone.url_input_full_row, true);
assert.equal(phone.frame_min_height_px, 104);

assert.equal(mediaResponsivePlacement(NaN).mode, 'phone_compact');
assert.equal(mediaResponsivePlacement(-1).mode, 'phone_compact');
console.log('B012_MEDIA_RESPONSIVE_PLACEMENT_PASS');
