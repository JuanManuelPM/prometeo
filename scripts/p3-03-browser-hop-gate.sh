#!/usr/bin/env bash
set -euo pipefail
PORT="${P3_PORT:-4174}"
BASE="http://127.0.0.1:${PORT}"
URL="${BASE}/lab/p3-03-hop-continuity/"
ART="${P3_ARTIFACT_DIR:-artifacts/p3-03}"
SESSION_A="${P3_SESSION_A:-p3-03-a}"
SESSION_B="${P3_SESSION_B:-p3-03-b}"
mkdir -p "$ART"

python3 -m http.server "$PORT" --bind 127.0.0.1 >"$ART/browser-server.log" 2>&1 &
SERVER_PID=$!
cleanup(){
  agent-browser --session "$SESSION_A" close >/dev/null 2>&1 || true
  agent-browser --session "$SESSION_B" close >/dev/null 2>&1 || true
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT
for _ in $(seq 1 40); do
  if curl -fsS "$URL" >/dev/null 2>&1 && curl -fsS "${BASE}/state/CURRENT_GRAPH.json" >/dev/null 2>&1; then break; fi
  sleep .25
done
curl -fsS "$URL" >/dev/null

run_session(){
  local session="$1" out="$2"
  agent-browser --session "$session" open >/dev/null
  agent-browser --session "$session" navigate "$URL" >/dev/null
  agent-browser --session "$session" wait --load networkidle >/dev/null
  agent-browser --session "$session" wait --fn "document.documentElement.dataset.p3Ready === 'true'" >/dev/null
  agent-browser --session "$session" eval '(()=>{const s=window.__P3_HOP;if(!s?.ready)throw new Error("HOP_NOT_READY "+JSON.stringify(s));if(s.persistence.localStorage!==0||s.persistence.sessionStorage!==0||s.persistence.cookie!=="")throw new Error("FORBIDDEN_BROWSER_PERSISTENCE "+JSON.stringify(s.persistence));return JSON.stringify(s)})()' >"$out"
  agent-browser --session "$session" console --json >"${out%.txt}-console.json"
  agent-browser --session "$session" errors --json >"${out%.txt}-errors.json"
}

run_session "$SESSION_A" "$ART/browser-a.txt"
agent-browser --session "$SESSION_A" close >/dev/null
# A is now gone. B is a separately named clean browser session.
run_session "$SESSION_B" "$ART/browser-b.txt"
agent-browser --session "$SESSION_B" screenshot "$ART/browser-b.png" --full >/dev/null
agent-browser --session "$SESSION_B" close >/dev/null

export P3_ART="$ART"
node <<'NODE'
const fs=require('fs'),{execFileSync}=require('child_process');
const art=process.env.P3_ART;
function parseEval(path){let v=JSON.parse(fs.readFileSync(path,'utf8').trim());if(typeof v==='string')v=JSON.parse(v);return v}
const A=parseEval(`${art}/browser-a.txt`),B=parseEval(`${art}/browser-b.txt`);
if(A.truth_digest!==B.truth_digest)throw new Error(`BROWSER_HOP_DIGEST_DRIFT ${A.truth_digest} ${B.truth_digest}`);
if(JSON.stringify(A.summary)!==JSON.stringify(B.summary))throw new Error('BROWSER_HOP_SUMMARY_DRIFT');
for(const [name,s] of [['A',A],['B',B]]){
  if(s.persistence.localStorage!==0||s.persistence.sessionStorage!==0||s.persistence.cookie!=='')throw new Error(`BROWSER_${name}_PERSISTENCE_LEAK`);
  if(s.source!=='durable-http-only')throw new Error(`BROWSER_${name}_SOURCE_DRIFT`);
  if(s.summary.revision!==6||s.summary.last_receipt!=='R-P3-02-FRESH-0007'||s.summary.phase!=='PART3_P3_02_COMPLETE'||s.summary.next_gate!=='P3-03_HOP_CONTINUITY')throw new Error(`BROWSER_${name}_FRONTIER_MISMATCH ${JSON.stringify(s.summary)}`);
  if(JSON.stringify(s.summary.ready_gates)!==JSON.stringify(['P3-03']))throw new Error(`BROWSER_${name}_READY_GATE_MISMATCH`);
}
function diagnostics(name){
  const errors=JSON.parse(fs.readFileSync(`${art}/browser-${name}-errors.json`,'utf8'))?.data?.errors||[];
  const messages=JSON.parse(fs.readFileSync(`${art}/browser-${name}-console.json`,'utf8'))?.data?.messages||[];
  const consoleErrors=messages.filter(m=>String(m?.type||m?.level||'').toLowerCase()==='error');
  if(errors.length||consoleErrors.length)throw new Error(`BROWSER_${name}_DIAGNOSTICS ${JSON.stringify({errors,consoleErrors})}`);
  return {page_errors:errors.length,console_errors:consoleErrors.length,console_messages:messages.length};
}
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const evidence={schema:'prometeo.p3-03-browser-hop-evidence/v1',gate:'P3-03',commit,runner:'agent-browser@0.34.0',sessions:{A:'distinct-clean-session',B:'distinct-clean-session',A_closed_before_B:true},truth_digest:A.truth_digest,summary:A.summary,persistence:{A:A.persistence,B:B.persistence},diagnostics:{A:diagnostics('a'),B:diagnostics('b')},reconstruction:{identical_after_restart:true,durable_http_only:true,local_storage_required:false,session_storage_required:false,cookie_required:false,hidden_singleton_required:false},truth_ceiling:{clean_browser_session_restart_pass:true,real_external_chat_restart_tested:false,human_accepted:false,new_served_verification:false,production_changed:false}};
fs.writeFileSync(`${art}/browser-evidence.json`,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({ok:true,gate:'P3-03',kind:'browser-hop',commit,truthDigest:A.truth_digest,restart:true}));
NODE
