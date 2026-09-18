import fs from 'node:fs';

const tv = fs.readFileSync(new URL('../experiments/prometeo-live/remote-room-v1.js', import.meta.url), 'utf8');
const remote = fs.readFileSync(new URL('../experiments/prometeo-remote/index.html', import.meta.url), 'utf8');

const scrub = "if(location.hash)history.replaceState(null,'',location.pathname+location.search);";
const parse = "const code=params.get('room')||'',token=params.get('t')||'';";

const checks = [
  ['tv room secret writes sessionStorage', tv.includes('sessionStorage.setItem(STORE,JSON.stringify(room))')],
  ['tv room secret reads sessionStorage', tv.includes('sessionStorage.getItem(STORE)')],
  ['tv room secret clears sessionStorage', tv.includes('sessionStorage.removeItem(STORE)')],
  ['tv room secret never uses localStorage', !/localStorage\\.(?:setItem|getItem|removeItem)\\(STORE\\b/.test(tv)],
  ['remote parses pairing fragment', remote.includes(parse)],
  ['remote scrubs fragment after parse', remote.includes(scrub) && remote.indexOf(scrub) > remote.indexOf(parse)],
  ['remote token remains memory-only', !/localStorage\\.(?:setItem|getItem)\\([^)]*(?:token|\\bt\\b)/i.test(remote)],
  ['remote client id persistence preserved', remote.includes("localStorage.getItem('prometeo.remote.client.v1')") && remote.includes("localStorage.setItem('prometeo.remote.client.v1',clientId)")],
  ['room create semantics preserved', tv.includes("action:'create_room'")],
  ['room poll semantics preserved', tv.includes("action:'poll'") && remote.includes("action:'poll'")],
  ['room emit semantics preserved', tv.includes("action:'emit'") && remote.includes("action:'emit'")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`FAILED ${failed}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS ${checks.length}/${checks.length} tele room secret hygiene`);
