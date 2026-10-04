import fs from 'node:fs';

const path = 'current-tree/control-v11/work-score/index.html';
const src = fs.readFileSync(path, 'utf8');

const checks = [
  ['stable media storage key', /MEDIA='prometeo\.control\.media\.v1'/],
  ['source is persisted on selection', /localStorage\.setItem\(MEDIA,src\|\|''\)/],
  ['saved source is restored on load', /const saved=localStorage\.getItem\(MEDIA\)\|\|''/],
  ['saved source repopulates input', /\$\('mediaUrl'\)\.value=saved/],
  ['saved source rehydrates player', /if\(saved\)setMedia\(saved\)/],
  ['YouTube privacy embed branch', /youtube-nocookie\.com\/embed\//],
  ['direct media branch', /v\.src=src/],
  ['mobile inline playback preserved', /v\.playsInline=true/],
];

for (const [label, pattern] of checks) {
  if (!pattern.test(src)) throw new Error(`B011 media persistence contract missing: ${label}`);
}

if (!/mediaSave'\)\.onclick=\(\)=>setMedia\(\$\('mediaUrl'\)\.value\.trim\(\)\)/.test(src)) {
  throw new Error('B011 media persistence contract missing: explicit save action');
}

console.log(`PASS B011 media persistence contract (${checks.length + 1} checks)`);
