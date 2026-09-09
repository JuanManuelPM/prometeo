import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../navigator/index.html',import.meta.url),'utf8');
const must=(label,pattern)=>assert.match(source,pattern,label);
const capture=(label,pattern)=>{
  const match=source.match(pattern);
  assert.ok(match,label);
  return match[1]??match[0];
};

must('V53 build identity must remain explicit',/<meta\s+name="prometeo-build"\s+content="PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901">/);
must('Navigator must load Catalog hierarchy',/loadJson\('\.\.\/catalog\/tree\.json'\)/);
must('Navigator must load Catalog page registry',/loadJson\('\.\.\/catalog\/pages\.json'\)/);

const entrySnapshot=capture(
  'RIGHT entry must capture a semantic parent snapshot',
  /const snapshot=(\{node:currentNode,path:\[\.\.\.currentPath\],selectedIndex:activeIndex,paletteOffset:currentWorld\.paletteOffset\});/
);
assert.doesNotMatch(entrySnapshot,/\b(?:clientX|clientY|pageX|pageY|screenX|screenY)\b/,'RIGHT semantic snapshot must not contain pointer coordinates');
must('Committed RIGHT entry must push the semantic snapshot',/history\.push\(snapshot\);/);

must('Exact Back must pop the parent semantic snapshot',/const snap=history\.pop\(\);/);
must(
  'Exact Back must rebuild the parent from semantic node/path/selection/palette identity',
  /makeWorld\(snap\.node,snap\.path,snap\.selectedIndex,snap\.paletteOffset\|\|0\)/
);
must(
  'Exact Back commit must restore semantic node and path',
  /onCommit:\(\)=>commitTarget\(target,snap\.node,snap\.path\)/
);

must(
  'LEFT from a scrolled child collection must normalize vertically before parent reveal',
  /if\(!currentWorld\?\.detail&&activeIndex>0\)\{\s*rewindVerticalToEntry\(\(\)=>performBack\(\)\);\s*return;\s*\}/s
);

const gestureSnapshot=capture(
  'Pointer RIGHT must use the same semantic hSnapshot contract',
  /gesture\.hSnapshot=(\{node:currentNode,path:\[\.\.\.currentPath\],selectedIndex:activeIndex,paletteOffset:currentWorld\.paletteOffset,targetNode:destination\.node,targetPath\})/
);
assert.doesNotMatch(gestureSnapshot,/\b(?:clientX|clientY|pageX|pageY|screenX|screenY)\b/,'Gesture semantic snapshot must not contain pointer coordinates');
must(
  'Committed pointer RIGHT must publish only semantic parent snapshot fields to history',
  /history\.push\(\{node:g\.hSnapshot\.node,path:g\.hSnapshot\.path,selectedIndex:g\.hSnapshot\.selectedIndex,paletteOffset:g\.hSnapshot\.paletteOffset\}\)/
);

const resizeBody=capture(
  'Navigator must retain an explicit resize canonicalization handler',
  /window\.addEventListener\('resize',\(\)=>\{([\s\S]*?)\}\);/
);
assert.match(resizeBody,/configureWorldGeometry\(\)/,'Resize must recompute geometry');
assert.match(resizeBody,/canonicalizeVertical\(\)/,'Resize must canonicalize vertical geometry');
assert.match(resizeBody,/setWorldX\(currentWorld,0\)/,'Resize must re-anchor the current world');
assert.doesNotMatch(resizeBody,/\b(?:currentNode|currentPath|history)\s*=/,'Resize must not derive semantic identity from resized pixels');
assert.doesNotMatch(resizeBody,/\b(?:clientX|clientY|pageX|pageY|screenX|screenY)\b/,'Resize must not use pointer pixels as semantic restore input');

must('V53 native terminal frame must remain present',/\.terminal-frame\s*\{/);
must('V53 native return tooth must remain present',/\.return-tooth\s*\{/);
must('Navigator diagnostic API must expose semantic state',/getState:\(\)=>\(\{state,currentNode:currentNode\.id,path:currentPath\.map\(n=>n\.id\),selectedIndex:activeIndex/);

console.log(JSON.stringify({
  ok:true,
  guard:'spatial-navigator-r04-exact-back',
  snapshot:['node','path','selectedIndex','paletteOffset'],
  gestureSnapshot:['node','path','selectedIndex','paletteOffset'],
  resize:'GEOMETRY_ONLY',
  restore:'SEMANTIC_IDENTITY_FIRST'
},null,2));
