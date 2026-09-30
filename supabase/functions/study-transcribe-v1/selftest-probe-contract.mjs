import fs from "node:fs";

const src = fs.readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const checks = [
  ['probe route', 'selftestMode === "probe"'],
  ['full selftest preserved', 'selftestMode === "1"'],
  ['deadline contract', 'SELFTEST_PROBE_DEADLINES'],
  ['TTS timeout code', '"TTS_TIMEOUT"'],
  ['Whisper connect timeout code', '"WHISPER_CONNECT_TIMEOUT"'],
  ['Whisper API timeout code', '"WHISPER_API_TIMEOUT"'],
  ['probe cannot claim E2E', 'full_e2e_pass: false'],
  ['normal POST preserved', 'if (req.method !== "POST")'],
  ['normal metadata preserved', 'mode: "canonical-long-window"']
];
for (const [label, needle] of checks) {
  if (!src.includes(needle)) throw new Error(`missing ${label}: ${needle}`);
}
if (src.indexOf('selftestMode === "probe"') > src.indexOf('selftestMode === "1"')) {
  throw new Error("probe route must be checked before full selftest");
}
console.log(JSON.stringify({ok:true, checks:checks.map(([label])=>label), count:checks.length}));
