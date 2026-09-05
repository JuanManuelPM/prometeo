#!/usr/bin/env bash
set -euo pipefail
CAND="${CAND_DIR:-cand}"
PAGES="${PAGES_DIR:-pagesout}"
EVID="${EVIDENCE_DIR:-evidence}"
mkdir -p "$EVID"
BASE="https://juanmanuelpm.github.io/prometeo"
ACCEPTED="b199b91f9cbac36df4f6ef5b75489c33737b89a4"
V53_BLOB="7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418"
CAL_BLOB="b14ea3a451540156d1279d3518139584ff4e7aac"

pushd "$CAND" >/dev/null
node - <<'NODE'
const fs=require('fs');const j=p=>JSON.parse(fs.readFileSync(p));
const c=j('state/CURRENT_GRAPH.json'),a=j('coordination/P3_13_ACCEPTANCE_SCOPE.json'),h=j('state/HEAD.json'),d=j('state/DOT_STATE.json'),p=j('state/PARENT.json');
if(c.revision!==11||c.last_durable_receipt!=='R-P3-13-CONTINUITY-0012')throw new Error('continuity frontier mismatch');
if(a.status!=='HUMAN_ACCEPTED'||a.release_blocked)throw new Error('P3-13 acceptance missing');
if(h.artifact_id!=='p3-final-candidate'||d.last_receipt!=='R-P3-13-CONTINUITY-0012'||p.child!=='p3-final-candidate')throw new Error('durable pointer drift');
const ledger=fs.readFileSync('receipts/ledger.jsonl','utf8').trim().split(/\n+/).map(JSON.parse);
if(ledger.at(-1)?.id!=='R-P3-13-CONTINUITY-0012')throw new Error('ledger frontier mismatch');
NODE
test "$(git hash-object navigator/index.html)" = "$V53_BLOB"
test "$(git hash-object pages/calendar/app-04-finance.js)" = "$CAL_BLOB"
CAND_HEAD=$(git rev-parse HEAD)
CAND_SHORT=${CAND_HEAD:0:12}
NAV_SHA=$(sha256sum navigator/index.html|awk '{print $1}')
CAL_SHA=$(sha256sum pages/calendar/app-04-finance.js|awk '{print $1}')
popd >/dev/null

BASE_GH=$(git -C "$PAGES" rev-parse HEAD)
A_NAV_SHA=$(sha256sum "$PAGES/navigator/index.html"|awk '{print $1}')
A_CAL_SHA=$(sha256sum "$PAGES/pages/calendar/app-04-finance.js"|awk '{print $1}')
CANARY_ID="p3-14-${CAND_SHORT}"
CANARY_PREFIX="__canary/${CANARY_ID}"
CANARY_URL="${BASE}/${CANARY_PREFIX}"
ROLLBACK_URL="${BASE}/__rollback/current/"

rm -rf stage && mkdir stage
for x in navigator pages shared arte ai catalog; do [ ! -e "$CAND/$x" ] || cp -a "$CAND/$x" stage/; done
for x in index.html projects.json; do [ ! -e "$CAND/$x" ] || cp -a "$CAND/$x" stage/; done
node - <<NODE
const fs=require('fs');fs.writeFileSync('stage/__PROMETEO_RELEASE.json',JSON.stringify({schema:'prometeo.canary/v1',canary_id:'${CANARY_ID}',accepted_candidate:'gitcommit:${ACCEPTED}',candidate_branch_head:'${CAND_HEAD}',acceptance_receipt:'R-P3-13-ACCEPT-0011',continuity_receipt:'R-P3-13-CONTINUITY-0012',navigator_sha256:'${NAV_SHA}',calendar_sha256:'${CAL_SHA}',pre_release_navigator_sha256:'${A_NAV_SHA}',pre_release_calendar_sha256:'${A_CAL_SHA}',created_at:new Date().toISOString()},null,2)+'\n');
NODE
pushd "$PAGES" >/dev/null
git config user.name 'github-actions[bot]';git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git pull --rebase origin gh-pages
rm -rf "$CANARY_PREFIX";mkdir -p "$CANARY_PREFIX";rsync -a --delete ../stage/ "$CANARY_PREFIX/"
git add "$CANARY_PREFIX";git commit -m "p3: publish isolated accepted canary $CANARY_ID";git push origin HEAD:gh-pages
GH_CANARY=$(git rev-parse HEAD)
popd >/dev/null

poll_stage(){ local url="$1" file="$2" key="$3" want="$4"; for i in $(seq 1 120); do if curl -fsSL -H 'Cache-Control: no-cache' "$url?cb=${GITHUB_RUN_ID:-local}-$i" -o "$file" 2>/dev/null && node -e "process.exit(String(require('./$file')['$key'])==='${want}'?0:1)"; then return 0; fi;sleep 2;done;return 1; }
poll_stage "$CANARY_URL/__PROMETEO_RELEASE.json" "$EVID/canary-marker.json" canary_id "$CANARY_ID"
CANARY_NAV=$(curl -fsSL -H 'Cache-Control: no-cache' "$CANARY_URL/navigator/index.html?cb=${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')
CANARY_CAL=$(curl -fsSL -H 'Cache-Control: no-cache' "$CANARY_URL/pages/calendar/app-04-finance.js?cb=${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')
test "$CANARY_NAV" = "$NAV_SHA";test "$CANARY_CAL" = "$CAL_SHA"
T_CANARY=$(date -u +%FT%TZ)

S=p3-canary-v3
agent-browser --session "$S" open >/dev/null
agent-browser --session "$S" set viewport 399 800 >/dev/null
agent-browser --session "$S" navigate "$CANARY_URL/navigator/" >/dev/null
agent-browser --session "$S" wait --load networkidle >/dev/null
agent-browser --session "$S" wait --fn "window.__PROMETEO_BUILD__==='PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901'" >/dev/null
agent-browser --session "$S" errors --json >"$EVID/canary-nav-errors.json"
node -e "const x=require('./$EVID/canary-nav-errors.json'),a=Array.isArray(x)?x:(x.errors||[]);if(a.length)process.exit(1)"
agent-browser --session "$S" navigate "$CANARY_URL/pages/calendar/" >/dev/null
agent-browser --session "$S" wait --load networkidle >/dev/null
agent-browser --session "$S" errors --json >"$EVID/canary-calendar-errors.json"
node -e "const x=require('./$EVID/canary-calendar-errors.json'),a=Array.isArray(x)?x:(x.errors||[]);if(a.length)process.exit(1)"
agent-browser --session "$S" screenshot "$EVID/canary-calendar.png" --full >/dev/null
agent-browser --session "$S" close >/dev/null

pushd "$PAGES" >/dev/null
mkdir -p __rollback/current
cat >__rollback/current/index.html <<'HTML'
<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prometeo rollback probe</title><body><pre id="out">loading</pre><script>(async()=>{const k='prometeo.p3.rollback.sentinel';if(!localStorage.getItem(k))localStorage.setItem(k,'P3_ROLLBACK_SENTINEL');const m=await fetch('./manifest.json?cb='+Date.now(),{cache:'no-store'}).then(r=>r.json());window.__ROLLBACK_MANIFEST__=m;window.__ROLLBACK_SENTINEL__=localStorage.getItem(k);out.textContent=m.stage+' '+m.target_prefix+' '+window.__ROLLBACK_SENTINEL__;})()</script>
HTML
node - <<NODE
const fs=require('fs');fs.writeFileSync('__rollback/current/manifest.json',JSON.stringify({schema:'prometeo.rollback-alias/v1',stage:'A1',target_prefix:'/prometeo/',navigator_sha256:'${A_NAV_SHA}',calendar_sha256:'${A_CAL_SHA}',sequence:'A>B>A',updated_at:new Date().toISOString()},null,2)+'\n');
NODE
git add __rollback/current;git commit -m 'p3: rollback proof A1';git push origin HEAD:gh-pages;GH_A1=$(git rev-parse HEAD)
popd >/dev/null
poll_stage "$ROLLBACK_URL/manifest.json" "$EVID/rb-a1.json" stage A1
test "$(curl -fsSL "$BASE/navigator/index.html?cb=A1-${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')" = "$A_NAV_SHA"
test "$(curl -fsSL "$BASE/pages/calendar/app-04-finance.js?cb=A1-${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')" = "$A_CAL_SHA"
S=p3-rollback-v3;agent-browser --session "$S" open >/dev/null;agent-browser --session "$S" navigate "$ROLLBACK_URL?cb=A1" >/dev/null;agent-browser --session "$S" wait --fn "window.__ROLLBACK_MANIFEST__?.stage==='A1'" >/dev/null;test "$(agent-browser --session "$S" eval 'window.__ROLLBACK_SENTINEL__'|tr -d '"')" = 'P3_ROLLBACK_SENTINEL'

pushd "$PAGES" >/dev/null
node - <<NODE
const fs=require('fs');fs.writeFileSync('__rollback/current/manifest.json',JSON.stringify({schema:'prometeo.rollback-alias/v1',stage:'B',target_prefix:'/prometeo/${CANARY_PREFIX}/',navigator_sha256:'${NAV_SHA}',calendar_sha256:'${CAL_SHA}',sequence:'A>B>A',updated_at:new Date().toISOString()},null,2)+'\n');
NODE
git add __rollback/current/manifest.json;git commit -m 'p3: rollback proof B';git push origin HEAD:gh-pages;GH_B=$(git rev-parse HEAD)
popd >/dev/null
poll_stage "$ROLLBACK_URL/manifest.json" "$EVID/rb-b.json" stage B
test "$(curl -fsSL "$CANARY_URL/navigator/index.html?cb=B-${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')" = "$NAV_SHA"
test "$(curl -fsSL "$CANARY_URL/pages/calendar/app-04-finance.js?cb=B-${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')" = "$CAL_SHA"
agent-browser --session "$S" navigate "$ROLLBACK_URL?cb=B" >/dev/null;agent-browser --session "$S" wait --fn "window.__ROLLBACK_MANIFEST__?.stage==='B'" >/dev/null;test "$(agent-browser --session "$S" eval 'window.__ROLLBACK_SENTINEL__'|tr -d '"')" = 'P3_ROLLBACK_SENTINEL'

pushd "$PAGES" >/dev/null
node - <<NODE
const fs=require('fs');fs.writeFileSync('__rollback/current/manifest.json',JSON.stringify({schema:'prometeo.rollback-alias/v1',stage:'A2',target_prefix:'/prometeo/',navigator_sha256:'${A_NAV_SHA}',calendar_sha256:'${A_CAL_SHA}',sequence:'A>B>A',updated_at:new Date().toISOString()},null,2)+'\n');
NODE
git add __rollback/current/manifest.json;git commit -m 'p3: rollback proof A2 restored';git push origin HEAD:gh-pages;GH_A2=$(git rev-parse HEAD)
popd >/dev/null
poll_stage "$ROLLBACK_URL/manifest.json" "$EVID/rb-a2.json" stage A2
test "$(curl -fsSL "$BASE/navigator/index.html?cb=A2-${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')" = "$A_NAV_SHA"
test "$(curl -fsSL "$BASE/pages/calendar/app-04-finance.js?cb=A2-${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')" = "$A_CAL_SHA"
agent-browser --session "$S" navigate "$ROLLBACK_URL?cb=A2" >/dev/null;agent-browser --session "$S" wait --fn "window.__ROLLBACK_MANIFEST__?.stage==='A2'" >/dev/null;test "$(agent-browser --session "$S" eval 'window.__ROLLBACK_SENTINEL__'|tr -d '"')" = 'P3_ROLLBACK_SENTINEL';agent-browser --session "$S" close >/dev/null
T_ROLLBACK=$(date -u +%FT%TZ)

pushd "$PAGES" >/dev/null
cp ../"$CAND"/navigator/index.html navigator/index.html
cp ../"$CAND"/pages/calendar/app-04-finance.js pages/calendar/app-04-finance.js
mkdir -p release
node - <<NODE
const fs=require('fs');fs.writeFileSync('release/PROMETEO_RELEASE_CURRENT.json',JSON.stringify({schema:'prometeo.served-release/v1',release_id:'P3-17-${CAND_SHORT}',accepted_candidate:'gitcommit:${ACCEPTED}',candidate_branch_head:'${CAND_HEAD}',acceptance_receipt:'R-P3-13-ACCEPT-0011',continuity_receipt:'R-P3-13-CONTINUITY-0012',canary_url:'${CANARY_URL}/navigator/',rollback_url:'${ROLLBACK_URL}',navigator_sha256:'${NAV_SHA}',calendar_sha256:'${CAL_SHA}',previous_navigator_sha256:'${A_NAV_SHA}',previous_calendar_sha256:'${A_CAL_SHA}',promotion_scope:['navigator/index.html','pages/calendar/app-04-finance.js'],navigator_restored_to_human_accepted_v53:true,promoted_at:new Date().toISOString()},null,2)+'\n');
NODE
test "$(git hash-object navigator/index.html)" = "$V53_BLOB"
git add navigator/index.html pages/calendar/app-04-finance.js release/PROMETEO_RELEASE_CURRENT.json;git commit -m 'p3: promote accepted V53 and Calendar repair';git push origin HEAD:gh-pages;GH_PROMOTED=$(git rev-parse HEAD)
popd >/dev/null
RELEASE_URL="$BASE/release/PROMETEO_RELEASE_CURRENT.json"
for i in $(seq 1 120);do if curl -fsSL "$RELEASE_URL?cb=P-$i" -o "$EVID/stable-release.json" 2>/dev/null&&node -e "process.exit(require('./$EVID/stable-release.json').calendar_sha256==='${CAL_SHA}'?0:1)";then break;fi;sleep 2;done
STABLE_CAL=$(curl -fsSL "$BASE/pages/calendar/app-04-finance.js?cb=P-${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')
STABLE_NAV=$(curl -fsSL "$BASE/navigator/index.html?cb=P-${GITHUB_RUN_ID:-x}"|sha256sum|awk '{print $1}')
test "$STABLE_CAL" = "$CAL_SHA";test "$STABLE_NAV" = "$NAV_SHA"
S=p3-stable-v3;agent-browser --session "$S" open >/dev/null;agent-browser --session "$S" set viewport 399 800 >/dev/null;agent-browser --session "$S" navigate "$BASE/pages/calendar/" >/dev/null;agent-browser --session "$S" wait --load networkidle >/dev/null;agent-browser --session "$S" errors --json >"$EVID/stable-calendar-errors.json";node -e "const x=require('./$EVID/stable-calendar-errors.json'),a=Array.isArray(x)?x:(x.errors||[]);if(a.length)process.exit(1)";agent-browser --session "$S" navigate "$BASE/navigator/" >/dev/null;agent-browser --session "$S" wait --load networkidle >/dev/null;agent-browser --session "$S" wait --fn "window.__PROMETEO_BUILD__==='PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901'" >/dev/null;agent-browser --session "$S" errors --json >"$EVID/stable-nav-errors.json";node -e "const x=require('./$EVID/stable-nav-errors.json'),a=Array.isArray(x)?x:(x.errors||[]);if(a.length)process.exit(1)";agent-browser --session "$S" close >/dev/null
T_STABLE=$(date -u +%FT%TZ)

pushd "$CAND" >/dev/null
node - <<NODE
const fs=require('fs');const e={schema:'prometeo.p3-14-17-evidence/v1',candidate_identity:'gitcommit:${ACCEPTED}',candidate_branch_head:'${CAND_HEAD}',candidate_nav_sha256:'${NAV_SHA}',candidate_calendar_sha256:'${CAL_SHA}',baseline_gh_pages:'${BASE_GH}',pre_release_nav_sha256:'${A_NAV_SHA}',pre_release_calendar_sha256:'${A_CAL_SHA}',canary_prefix:'${CANARY_PREFIX}',canary_url:'${CANARY_URL}/navigator/',canary_nav_sha256:'${CANARY_NAV}',canary_calendar_sha256:'${CANARY_CAL}',gh_pages_canary:'${GH_CANARY}',rollback:{baseline_identity:'ghpages:${BASE_GH}',alias_path:'__rollback/current',alias_url:'${ROLLBACK_URL}',a_nav_sha256:'${A_NAV_SHA}',a_calendar_sha256:'${A_CAL_SHA}',b_nav_sha256:'${NAV_SHA}',b_calendar_sha256:'${CAL_SHA}',gh_pages_a1:'${GH_A1}',gh_pages_b:'${GH_B}',gh_pages_a2:'${GH_A2}',sentinel:'P3_ROLLBACK_SENTINEL'},stable_navigator_url:'${BASE}/navigator/',stable_calendar_url:'${BASE}/pages/calendar/',stable_nav_sha256:'${STABLE_NAV}',stable_calendar_sha256:'${STABLE_CAL}',release_marker_url:'${RELEASE_URL}',gh_pages_promoted:'${GH_PROMOTED}',navigator_restored_to_human_accepted_v53:true,timestamps:{canary_verified:'${T_CANARY}',rollback_verified:'${T_ROLLBACK}',stable_verified:'${T_STABLE}'}};fs.writeFileSync('coordination/P3_14_17_SERVED_EVIDENCE.json',JSON.stringify(e,null,2)+'\n');
NODE
node scripts/p3-14-17-close.mjs
node scripts/p3-00-rehydrate.mjs >"../$EVID/post17-wake.json"
git config user.name 'github-actions[bot]';git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add coordination/P3_14_17_SERVED_EVIDENCE.json state/CURRENT_GRAPH.json state/HEAD.json state/DOT_STATE.json state/PARENT.json state/PENDING.json receipts/ledger.jsonl
git commit -m 'part3: freeze canary rollback and stable served proof';git push origin HEAD:candidate/prometeo-final-20260904
popd >/dev/null
printf '%s\n' "P3_RELEASE_V3_PASS canary=$CANARY_URL rollback=$ROLLBACK_URL stable=$BASE/navigator/ gh_pages=$GH_PROMOTED" | tee "$EVID/result.txt"
