#!/usr/bin/env node
/**
 * Prometeo / ChatGPT skill readiness planner.
 * Node 18+. No third-party dependencies, side effects, tokens, network or installs.
 * "connected" is an observed snapshot, NOT live auth attestation.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const catalogPath = path.join(__dirname, "capabilities.json");
const c = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const allowedStates = new Set([
  "ready_connected","ready_available","connected_unverified","awaiting_oauth",
  "automation_buildable","adaptable","local_bridge_required","external_auth"
]);
const rankIds = new Set();
function assert(ok, message) { if (!ok) throw Error("INVALID_CATALOG: " + message); }
assert(c.schema === "prometeo.chatgpt-skill-readiness/v1", "schema");
assert(c.mode === "NON_DESTRUCTIVE_STAGING", "mode");
assert(Array.isArray(c.capabilities) && c.capabilities.length === 30, "exact 30 entries");
assert(c.activation_rules.auto_install === false && c.activation_rules.auto_authorize === false, "unsafe activation");
assert(c.activation_rules.never_commit_secrets === true, "secret handling");
for (const [i, item] of c.capabilities.entries()) {
  assert(item.rank === i + 1, "stable rank " + (i + 1));
  assert(/^[a-z0-9-]+$/.test(item.id), "invalid id");
  assert(!rankIds.has(item.id), "duplicate " + item.id);
  rankIds.add(item.id);
  assert(allowedStates.has(item.state), "unknown state " + item.state);
  assert(item.human_actions_min === 0 || item.human_actions_min === 1, "human action minimum");
  assert(/^https:\/\/|^mcp__|^skills:\/\//.test(item.source), "unsupported source");
  assert(typeof item.blocker === "string" && typeof item.caveat === "string", "missing boundaries");
}
for (const id of c.activation_rules.requires_explicit_user_auth) {
  assert(rankIds.has(id), "unknown OAuth boundary " + id);
}
for (const id of c.activation_rules.local_bridge_required) {
  assert(rankIds.has(id), "unknown local boundary " + id);
}
const argv = process.argv.slice(2);
const selfTest = argv.includes("--self-test");
const all = argv.includes("--all");
const json = argv.includes("--json");
const zero = argv.includes("--zero-friction");
const requested = argv.flatMap((arg, i) => arg === "--id" ? (argv[i + 1] || "").split(",") : [])
  .filter(Boolean);
if (selfTest) {
  console.log(JSON.stringify({status:"PASS", items:30, unique:rankIds.size,
    schema:c.schema, no_auto_install:true, no_auto_auth:true,
    digest:crypto.createHash("sha256").update(fs.readFileSync(catalogPath)).digest("hex").slice(0,16)},null,2));
  process.exit(0);
}
assert(all || requested.length || zero, "use --all, --zero-friction, or --id one,two");
for (const id of requested) assert(rankIds.has(id), "unknown requested skill " + id);
const items = c.capabilities.filter(x => all || requested.includes(x.id) ||
  (zero && x.human_actions_min === 0 && ["ready_connected","ready_available"].includes(x.state)));
function kindFor(x) {
  if (["ready_connected","ready_available"].includes(x.state))
    return "can-use-existing-tools-or-method";
  if (x.state === "connected_unverified") return "plugin-connected-check-actual-tools";
  if (x.state === "awaiting_oauth" || x.state === "external_auth") return "human-auth-required";
  if (x.state === "local_bridge_required") return "human-local-activation-required";
  return "needs-isolated-adapter-and-verification";
}
const plan=items.map(x=>({rank:x.rank,id:x.id,name:x.name,readiness:x.state,
  action:kindFor(x),human_actions_min:x.human_actions_min,
  use_case:x.use_case,blocker:x.blocker,caveat:x.caveat,source:x.source,
  execute_now:["ready_connected","ready_available"].includes(x.state)}));
if(json) console.log(JSON.stringify({schema:"prometeo.chatgpt-skill-activation-plan/v1",
  dry_run:true,no_side_effects:true,generated_at:new Date().toISOString(),
  selected:plan.length,actions:plan},null,2));
else {
  console.log("# ChatGPT skills activation plan (DRY RUN ONLY)\n");
  console.log("No connectors installed. No privileges granted. No code deployed.\n");
  for(const x of plan)
    console.log(x.rank+". "+x.name+" ["+x.readiness+"] → "+x.action+
      "\n   "+x.use_case+"\n   Boundary: "+x.caveat);
}
