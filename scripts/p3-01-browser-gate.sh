#!/usr/bin/env bash
set -euo pipefail

PORT="${P3_PORT:-4173}"
BASE="http://127.0.0.1:${PORT}"
URL="${BASE}/lab/p3-01-browser-harness/"
ART="${P3_ARTIFACT_DIR:-artifacts/p3-01}"
SESSION="${P3_BROWSER_SESSION:-p3-01}"
mkdir -p "$ART"

EXPECTED_V53_BLOB="7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418"
EXPECTED_BUILD="PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901"
ACTUAL_V53_BLOB="$(git hash-object navigator/index.html)"
if [[ "$ACTUAL_V53_BLOB" != "$EXPECTED_V53_BLOB" ]]; then
  echo "V53 blob drift: $ACTUAL_V53_BLOB" >&2
  exit 31
fi

python3 -m http.server "$PORT" --bind 127.0.0.1 >"$ART/server.log" 2>&1 &
SERVER_PID=$!
cleanup(){
  agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if curl -fsS "$URL" >/dev/null 2>&1 && curl -fsS "${BASE}/navigator/index.html" >/dev/null 2>&1; then break; fi
  sleep .25
done
curl -fsS "$URL" >/dev/null
curl -fsS "${BASE}/navigator/index.html" >/dev/null

agent-browser --session "$SESSION" open >/dev/null
agent-browser --session "$SESSION" network har start --content none >/dev/null
agent-browser --session "$SESSION" navigate "$URL" >/dev/null
agent-browser --session "$SESSION" wait --load networkidle >/dev/null
agent-browser --session "$SESSION" wait --fn "document.documentElement.dataset.p3Ready === 'true'" >/dev/null

agent-browser --session "$SESSION" eval '(()=>{const s=window.__P3_HARNESS;if(!s?.ready)throw new Error("HARNESS_NOT_READY "+JSON.stringify(s));if(!s.sameOrigin)throw new Error("NOT_SAME_ORIGIN");if(s.navigatorBuild!=="PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901")throw new Error("BUILD_DRIFT "+s.navigatorBuild);if((s.errors||[]).length)throw new Error("HARNESS_ERRORS "+JSON.stringify(s.errors));return JSON.stringify(s)})()' >"$ART/harness-eval.txt"
agent-browser --session "$SESSION" screenshot "$ART/harness-full.png" --full >/dev/null
agent-browser --session "$SESSION" snapshot -i -C --json >"$ART/harness-snapshot.json"
agent-browser --session "$SESSION" console --json >"$ART/browser-console.json" || true
agent-browser --session "$SESSION" errors --json >"$ART/browser-errors.json" || true

agent-browser --session "$SESSION" frame "#prometeo-v53" >/dev/null
agent-browser --session "$SESSION" wait --load networkidle >/dev/null
agent-browser --session "$SESSION" eval '(()=>{const build=document.querySelector("meta[name=prometeo-build]")?.content;const out={title:document.title,build,bodyTextLength:(document.body?.innerText||"").trim().length,viewport:!!document.querySelector(".viewport"),track:!!document.querySelector(".track")};if(build!=="PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901")throw new Error("V53_BUILD_DRIFT "+JSON.stringify(out));if(document.title!=="Prometeo · Navegador"||!out.viewport||!out.track||out.bodyTextLength<1)throw new Error("V53_DOM_INCOMPLETE "+JSON.stringify(out));return JSON.stringify(out)})()' >"$ART/v53-eval.txt"
agent-browser --session "$SESSION" snapshot -i -C --json >"$ART/v53-snapshot.json"
agent-browser --session "$SESSION" frame main >/dev/null
agent-browser --session "$SESSION" network requests --json >"$ART/network-requests.json" || true
agent-browser --session "$SESSION" network har stop "$ART/network.har" >/dev/null
agent-browser --session "$SESSION" close >/dev/null

export P3_BASE="$BASE" P3_ART="$ART" P3_EXPECTED_BUILD="$EXPECTED_BUILD" P3_EXPECTED_BLOB="$EXPECTED_V53_BLOB"
node <<'NODE'
const fs=require('fs');
const {execFileSync}=require('child_process');
const art=process.env.P3_ART,base=process.env.P3_BASE;
const har=JSON.parse(fs.readFileSync(`${art}/network.har`,'utf8'));
const entries=har?.log?.entries||[];
const local=entries.filter(e=>String(e?.request?.url||'').startsWith(base));
const bad=local.filter(e=>Number(e?.response?.status||0)>=400 && !String(e.request.url).endsWith('/favicon.ico'));
if(bad.length)throw new Error('FAILED_LOCAL_RESOURCES '+JSON.stringify(bad.map(e=>({url:e.request.url,status:e.response.status}))));
const urls=new Set(local.map(e=>new URL(e.request.url).pathname));
if(!urls.has('/lab/p3-01-browser-harness/')&&!urls.has('/lab/p3-01-browser-harness/index.html'))throw new Error('HARNESS_REQUEST_MISSING');
if(!urls.has('/navigator/index.html'))throw new Error('V53_REQUEST_MISSING');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browserErrors=fs.existsSync(`${art}/browser-errors.json`)?JSON.parse(fs.readFileSync(`${art}/browser-errors.json`,'utf8')):null;
const browserConsole=fs.existsSync(`${art}/browser-console.json`)?JSON.parse(fs.readFileSync(`${art}/browser-console.json`,'utf8')):null;
const evidence={
  schema:'prometeo.p3-01-browser-evidence/v1',
  gate:'P3-01',
  runner:'agent-browser@0.34.0',
  checkout_commit:commit,
  origin:base,
  same_origin:true,
  harness_id:'P3-01-HARNESS-V1',
  navigator:{path:'navigator/index.html',git_blob_sha:process.env.P3_EXPECTED_BLOB,meta_build:process.env.P3_EXPECTED_BUILD,mutated:false},
  network:{request_count:entries.length,local_request_count:local.length,failed_local_resources:[]},
  diagnostics:{browser_errors:browserErrors,browser_console:browserConsole},
  captures:{screenshot:'harness-full.png',harness_snapshot:'harness-snapshot.json',v53_snapshot:'v53-snapshot.json',har:'network.har',console:'browser-console.json',page_errors:'browser-errors.json'},
  truth_ceiling:{browser_harness_pass_candidate:true,perceptual_human_pass:false,human_accepted:false,new_served_verification:false,production_changed:false}
};
fs.writeFileSync(`${art}/evidence.json`,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({ok:true,gate:'P3-01',commit,requests:entries.length,local:local.length,build:process.env.P3_EXPECTED_BUILD}));
NODE
