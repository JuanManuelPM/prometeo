#!/usr/bin/env node
/**
 * Prometeo ChatGPT capability router v2. Node >=18, standard library only.
 * Pure local planner: NO OAuth, no network, no filesystem writes, no execution.
 * The static catalog is NEVER evidence of a live connector or served app.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const folder = __dirname;
const catalogBytes = fs.readFileSync(path.join(folder, "capabilities.json"));
const catalog = JSON.parse(catalogBytes.toString("utf8"));
const routes = JSON.parse(fs.readFileSync(path.join(folder, "intents.json"), "utf8"));
const states = new Set(["ready_connected", "ready_available", "connected_unverified",
  "awaiting_oauth", "automation_buildable", "adaptable", "local_bridge_required",
  "external_auth"]);
const assert = (condition, why) => { if (!condition) throw Error("INVALID_READINESS: " + why); };
const ids = new Set();
assert(catalog.schema === "prometeo.chatgpt-skill-readiness/v1", "catalog schema");
assert(catalog.mode === "NON_DESTRUCTIVE_STAGING", "must remain staging");
assert(catalog.capabilities?.length === 30, "exactly 30 capabilities");
assert(catalog.activation_rules.auto_install === false, "no automatic installation");
assert(catalog.activation_rules.auto_authorize === false, "no automatic OAuth");
assert(catalog.activation_rules.never_commit_secrets === true, "credentials cannot be published");
catalog.capabilities.forEach((entry, i) => {
  assert(entry.rank === i + 1, "rank order at " + i);
  assert(/^[a-z0-9-]+$/.test(entry.id) && !ids.has(entry.id), "ID collision");
  ids.add(entry.id);
  assert(states.has(entry.state), "unknown state: " + entry.state);
  assert([0, 1].includes(entry.human_actions_min), "invalid gesture count");
  assert(typeof entry.name === "string" && entry.name.length >= 3, "name");
  assert(typeof entry.caveat === "string" && entry.caveat.length, "missing caveat");
  assert(/^(https:\/\/|mcp__|skills:\/\/)/.test(entry.source), "untrusted source");
});
assert(routes.schema === "prometeo.chatgpt-task-routes/v1", "routes schema");
assert(Array.isArray(routes.routes) && routes.routes.length >= 6, "no routes");
const routeIds = new Set();
routes.routes.forEach(route => {
  assert(/^[a-z0-9-]+$/.test(route.id) && !routeIds.has(route.id), "route ID");
  routeIds.add(route.id);
  assert(Array.isArray(route.words) && route.words.length, "missing keywords");
  assert(Array.isArray(route.priority) && route.priority.length, "missing priorities");
  route.priority.forEach(id => assert(ids.has(id), "unknown routed skill: " + id));
  route.words.forEach(w => assert(/^[a-z0-9-]+$/.test(w), "invalid routing word"));
});
for (const section of ["requires_explicit_user_auth", "local_bridge_required"])
  catalog.activation_rules[section].forEach(id => assert(ids.has(id), "invalid boundary: " + id));

function normalized(text) {
  return String(text).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function parseArgs(argv) {
  const option = { all:false, zero:false, json:false, selfTest:false, ids:[], goal:"", limit:0 };
  for (let i = 0; i < argv.length; i++) {
    const arg=argv[i];
    if (arg === "--all") option.all=true;
    else if (arg === "--zero-friction") option.zero=true;
    else if (arg === "--json") option.json=true;
    else if (arg === "--self-test") option.selfTest=true;
    else if (arg === "--goal" || arg === "--id" || arg === "--limit") {
      const val=argv[++i];
      assert(typeof val === "string" && val.length && !val.startsWith("--"), "missing "+arg);
      if (arg === "--goal") { assert(val.length <= 500, "goal too long"); option.goal=val; }
      if (arg === "--id") option.ids.push(...val.split(",").filter(Boolean));
      if (arg === "--limit") { option.limit=Number(val); assert(Number.isInteger(option.limit) && option.limit >= 1 && option.limit <= 30, "limit 1..30"); }
    } else throw Error("UNKNOWN_OPTION: "+arg);
  }
  option.ids.forEach(id => assert(ids.has(id), "unknown capability: "+id));
  return option;
}
function classify(item) {
  const remoteTool=["ready_connected", "connected_unverified"].includes(item.state);
  const localMethod=["ready_available", "adaptable"].includes(item.state);
  const blockedOAuth=["awaiting_oauth", "external_auth"].includes(item.state);
  const blockedLocal=item.state === "local_bridge_required";
  // The human gesture count is an estimate of consent, NOT an operational state.
  let next = blockedOAuth ? "CONSENT_REQUIRED" :
    blockedLocal ? "LOCAL_ACTIVATION_REQUIRED" :
    remoteTool ? "PROBE_CONNECTED_TOOL_LIVE" :
    localMethod ? "READ_RECIPE_AND_APPLY_WITH_TEST" :
    "BUILD_ISOLATED_ADAPTER_THEN_TEST";
  return { rank:item.rank, id:item.id, name:item.name, kind:item.kind,
    snapshot_state:item.state, method_without_setup:localMethod,
    callable_now:"NOT_ATTESTED_BY_OFFLINE_PLANNER", next,
    human_consent_estimate:item.human_actions_min, blocker:item.blocker,
    caveat:item.caveat, source:item.source };
}
function matchedRoutes(goal) {
  const words=new Set(normalized(goal).split(/\s+/).filter(Boolean));
  // A concrete fix/bug request must put code ownership and safe edits before
  // cosmetic design advice, even when many UI-related terms are present.
  const isRepair=["corregir","arreglar","bug","bugs","errores","error","implementar"].some(w=>words.has(w));
  const scored=routes.routes.map(route => ({
    route, score:route.words.filter(word => words.has(word)).length +
      (isRepair && route.id==="programming" ? 2 : 0)
  })).filter(x=>x.score>0).sort((a,b)=> b.score-a.score);
  return scored.slice(0,2).map(x=>x.route);
}
function build(options) {
  const hit=options.goal ? matchedRoutes(options.goal) : [];
  let ordered;
  if(options.ids.length) ordered=[...new Set(options.ids)];
  else if(options.goal && hit.length) ordered=[...new Set(hit.flatMap(x=>x.priority))];
  else if(options.goal) ordered=routes.fallback;
  else ordered=catalog.capabilities.map(x=>x.id);
  assert(ordered.every(id=>ids.has(id)), "unknown fallback skill");
  if(options.all) ordered=catalog.capabilities.map(x=>x.id);
  const dict=new Map(catalog.capabilities.map(x=>[x.id,x]));
  let actions=ordered.map(id=>dict.get(id));
  if (options.zero)
    actions=actions.filter(x => ["ready_connected","ready_available","adaptable"].includes(x.state));
  if(options.goal && !options.all) actions=actions.slice(0, options.limit || 8);
  else if(options.limit) actions=actions.slice(0,options.limit);
  const classified=actions.map(classify);
  return {
    schema:"prometeo.chatgpt-readiness-route/v2",
    mode:"DRY_RUN_ONLY",
    generated_at:new Date().toISOString(),
    catalog_as_of:catalog.as_of,
    catalog_sha256:crypto.createHash("sha256").update(catalogBytes).digest("hex"),
    live_permissions_checked:false,
    tools_installed:0, oauth_grants:0, code_deployed:false, changes_published:false,
    goal:options.goal||null,
    matched_routes:hit.map(x=>x.id),
    selected:classified.length,
    actions:classified,
    instruction:"Recheck the relevant connected tools at execution time. Apply methods separately from executable tools. Ask only for unavoidable explicit consent. Run real tests and preserve Prometeo authorities."
  };
}
function main(argv) {
  const opts=parseArgs(argv);
  if(opts.selfTest){
    const data=build({all:true,goal:"",zero:false,ids:[],limit:0});
    assert(data.actions.length===30 && data.actions.every(x=>x.callable_now==="NOT_ATTESTED_BY_OFFLINE_PLANNER"), "fail-closed live-check semantics");
    console.log(JSON.stringify({status:"PASS",capabilities:30,routes:routes.routes.length,
      no_install:true,no_oauth:true,no_live_claim:true,digest:data.catalog_sha256.slice(0,16)},null,2));
    return;
  }
  const output=build(opts);
  if(opts.json) { console.log(JSON.stringify(output,null,2)); return; }
  console.log("Prometeo ChatGPT readiness: DRY RUN, "+output.selected+" candidates.");
  console.log("Connected-app status must be checked LIVE. No installation, consent or deployment performed.");
  for(const item of output.actions){
    console.log("\n"+item.rank+". "+item.name+" ["+item.snapshot_state+"]");
    console.log("   "+item.next+" · "+item.caveat);
  }
}
if(require.main===module) {
  try { main(process.argv.slice(2)); }
  catch(error) { console.error(error.message); process.exitCode=2; }
}
module.exports={catalog,routes,parseArgs,normalized,matchedRoutes,build,main,classify};
