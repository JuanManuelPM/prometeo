#!/usr/bin/env bash
set -euo pipefail
PORT="${P3_PORT:-4177}"
BASE="http://127.0.0.1:${PORT}"
NAV="${BASE}/navigator/"
ART="${P3_ARTIFACT_DIR:-artifacts/p3-macro}"
S="${P3_SESSION:-p3-macro-clean}"
mkdir -p "$ART/viewports"
python3 -m http.server "$PORT" --bind 127.0.0.1 >"$ART/server.log" 2>&1 &
SERVER_PID=$!
cleanup(){ agent-browser --session "$S" close >/dev/null 2>&1||true; kill "$SERVER_PID" >/dev/null 2>&1||true; wait "$SERVER_PID" >/dev/null 2>&1||true; }
trap cleanup EXIT
for _ in $(seq 1 40); do curl -fsS "$NAV" >/dev/null 2>&1 && break; sleep .25; done
agent-browser --session "$S" open >/dev/null
setvp(){
  local w="$1"; local h="$2"
  if agent-browser --session "$S" set viewport "$w" "$h" >/dev/null 2>&1; then return 0; fi
  if agent-browser --session "$S" viewport "$w" "$h" >/dev/null 2>&1; then return 0; fi
  echo "agent-browser viewport command unavailable" >&2; return 88
}
waitidle(){ agent-browser --session "$S" wait --fn "!!window.__PROMETEO_V53__ && window.__PROMETEO_V53__.getState().state === 'IDLE'" >/dev/null; }
fresh_nav(){
  agent-browser --session "$S" navigate "$NAV" >/dev/null
  agent-browser --session "$S" wait --load networkidle >/dev/null
  agent-browser --session "$S" wait --fn "!!window.__PROMETEO_V53__" >/dev/null
  waitidle
}
checkvp(){
  local w="$1"; local h="$2"; local tag="${w}x${h}"
  setvp "$w" "$h"
  fresh_nav
  agent-browser --session "$S" eval '(()=>{const d=document,r=window.__PROMETEO_V53__,rect=d.querySelector(".viewport")?.getBoundingClientRect();return JSON.stringify({outer:{w:innerWidth,h:innerHeight},rect:{w:rect?.width||0,h:rect?.height||0,left:rect?.left||0,top:rect?.top||0},build:window.__PROMETEO_BUILD__,title:d.title,mainAria:d.querySelector("main#viewport")?.getAttribute("aria-label"),tabIndex:d.querySelector("main#viewport")?.tabIndex,bodyScroll:{w:d.documentElement.scrollWidth,h:d.documentElement.scrollHeight},rootResponsiveDiagnostic:r.responsiveInvariant?.(),invariants:{depth:r.depthSlotsInvariant?.(),solver:r.edgeSolverInvariant?.(),seal:r.rightmostSealInvariant?.(),backplate:r.backplateInvariant?.(),horizontal:r.horizontalInvariant?.()},state:r.getState(),layout:r.layout?.()})})()' >"$ART/viewports/${tag}-root.json"
  agent-browser --session "$S" eval 'window.__PROMETEO_V53__.right();true' >/dev/null
  waitidle
  agent-browser --session "$S" eval '(()=>{const r=window.__PROMETEO_V53__;return JSON.stringify({state:r.getState(),responsive:r.responsiveInvariant?.(),vertical:r.verticalInvariant?.(),depth:r.depthSlotsInvariant?.(),solver:r.edgeSolverInvariant?.(),seal:r.rightmostSealInvariant?.(),backplate:r.backplateInvariant?.(),horizontal:r.horizontalInvariant?.(),layout:r.layout?.()})})()' >"$ART/viewports/${tag}-entered.json"
  if [[ "$tag" == "160x120" || "$tag" == "320x240" || "$tag" == "399x800" || "$tag" == "1280x720" ]]; then
    agent-browser --session "$S" screenshot "$ART/viewports/${tag}.png" --full >/dev/null
  fi
}
for vp in 160x120 200x200 240x320 320x240 399x800 480x800 768x1024 1280x720 1440x900; do checkvp "${vp%x*}" "${vp#*x}"; done

setvp 1280 720
fresh_nav
agent-browser --session "$S" eval 'JSON.stringify(window.__PROMETEO_V53__.getState())' >"$ART/nav-0.json"
agent-browser --session "$S" eval 'window.__PROMETEO_V53__.right();true' >/dev/null; waitidle
agent-browser --session "$S" eval 'JSON.stringify(window.__PROMETEO_V53__.getState())' >"$ART/nav-1.json"
agent-browser --session "$S" eval 'window.__PROMETEO_V53__.down();true' >/dev/null; waitidle
agent-browser --session "$S" eval 'JSON.stringify(window.__PROMETEO_V53__.getState())' >"$ART/nav-2.json"
agent-browser --session "$S" eval 'window.__PROMETEO_V53__.right();true' >/dev/null; waitidle
agent-browser --session "$S" eval 'JSON.stringify(window.__PROMETEO_V53__.getState())' >"$ART/nav-3.json"
setvp 399 800; agent-browser --session "$S" wait 100 >/dev/null
agent-browser --session "$S" eval 'window.__PROMETEO_V53__.left();true' >/dev/null; waitidle
agent-browser --session "$S" eval 'JSON.stringify({state:window.__PROMETEO_V53__.getState(),normalize:window.__PROMETEO_V53__.backNormalizeInvariant?.(),layout:window.__PROMETEO_V53__.layout?.()})' >"$ART/nav-back-after-resize.json"
agent-browser --session "$S" console --json >"$ART/navigator-console.json"
agent-browser --session "$S" errors --json >"$ART/navigator-errors.json"

setvp 399 800
agent-browser --session "$S" navigate "${BASE}/pages/calendar/index.html" >/dev/null
agent-browser --session "$S" wait --load networkidle >/dev/null
agent-browser --session "$S" eval 'JSON.stringify({title:document.title,text:(document.body.innerText||"").slice(0,240),buttons:document.querySelectorAll("button").length,scrollW:document.documentElement.scrollWidth,innerW:innerWidth})' >"$ART/calendar.json"
agent-browser --session "$S" screenshot "$ART/calendar.png" --full >/dev/null
agent-browser --session "$S" console --json >"$ART/calendar-console.json"
agent-browser --session "$S" errors --json >"$ART/calendar-errors.json"

agent-browser --session "$S" navigate "${BASE}/arte/" >/dev/null
agent-browser --session "$S" wait --load networkidle >/dev/null
agent-browser --session "$S" eval 'JSON.stringify({title:document.title,text:(document.body.innerText||"").slice(0,240),links:document.querySelectorAll("a").length,scrollW:document.documentElement.scrollWidth,innerW:innerWidth})' >"$ART/arte.json"
agent-browser --session "$S" screenshot "$ART/arte.png" --full >/dev/null
agent-browser --session "$S" console --json >"$ART/arte-console.json"
agent-browser --session "$S" errors --json >"$ART/arte-errors.json"

P3_ARTIFACT_DIR="$ART" node scripts/p3-macro-validate-v2.mjs
