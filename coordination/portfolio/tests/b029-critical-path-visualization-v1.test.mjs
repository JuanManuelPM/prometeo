import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const app=fs.readFileSync(path.join(root,'current-tree/control-v11/work-score/app.html'),'utf8');

assert.ok(app.includes('<script type="module">'),'work-score app must execute as a module');
assert.ok(app.includes("import { buildCriticalPathOverlay } from './critical-path-model.mjs';"),'app must import the tested critical path model');
assert.ok(app.includes('cp=buildCriticalPathOverlay(bs,Object.fromEntries(st))'),'app must derive critical path from current rendered states');
assert.ok(app.includes('criticalSet=new Set(cp.remaining.critical_block_ids)'),'app must visualize the remaining critical path');
assert.ok(app.includes("${criticalSet.has(b.block_id)?'crit':''}"),'block critical styling must come from the computed remaining path');
assert.ok(!app.includes("${b.critical?'crit':''}"),'static plan critical flag must not drive live visualization');

console.log('b029-critical-path-visualization: PASS');
