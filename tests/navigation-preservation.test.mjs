import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const current=await read('navigator/index.html');
const v53=await read('navigator/candidates/v53-complete-example-atlas-20260901/index.html');
const normalize=html=>html.replace(/<meta name="prometeo-build" content="[^"]+">/,'<meta name="prometeo-build" content="NORMALIZED">');
assert.equal(normalize(current),normalize(v53),'V54 no puede cambiar la física V53');

const v50=await read('../upload/01-PROMETEO_V50_VERTICAL_X_LOCK_RIGHTMOST_SEAL.html');
const sha=createHash('sha256').update(v50).digest('hex');
assert.equal(sha,'85968e5ccdea0b56ac37ee77a3e1e0562c9e65c8218c11e6d2eb0b6e6605b187','La V50 congelada cambió');

for(const law of ['resolveDestination','renderTerminalSurface','renderSideTooth','rewindVerticalToEntry','measurePreloadGap','verticalInvariant','responsiveInvariant'])assert.match(current,new RegExp(law),`Falta la ley ${law}`);
console.log(JSON.stringify({ok:true,v53_physics_delta:'NONE',v50_sha256:sha,laws:7},null,2));
