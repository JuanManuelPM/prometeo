"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const child = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const core = require("./readiness.cjs");
function cli(...args){
  return child.spawnSync(process.execPath, [path.join(root, "readiness.cjs"), ...args],
    {encoding:"utf8",timeout:10000,env:{PATH:process.env.PATH}});
}
test("schema, ranks and IDs are consistent",()=>{
  const all=core.build(core.parseArgs(["--all"]));
  assert.equal(all.actions.length,30);
  assert.equal(new Set(all.actions.map(x=>x.id)).size,30);
  assert.deepEqual(all.actions.map(x=>x.rank),Array.from({length:30},(_,i)=>i+1));
  assert.equal(all.schema,"prometeo.chatgpt-readiness-route/v2");
});
test("offline plan NEVER claims live availability, installation or OAuth",()=>{
  const all=core.build(core.parseArgs(["--all"]));
  assert.equal(all.mode,"DRY_RUN_ONLY");
  assert.equal(all.live_permissions_checked,false);
  assert.equal(all.tools_installed,0);
  assert.equal(all.oauth_grants,0);
  assert.equal(all.code_deployed,false);
  assert.equal(all.changes_published,false);
  assert(all.actions.every(x=>x.callable_now==="NOT_ATTESTED_BY_OFFLINE_PLANNER"));
});
test("connected snapshot still requires a live probe",()=>{
  const all=core.build(core.parseArgs(["--id","github,superpowers,context7"]));
  const gh=all.actions.find(x=>x.id==="github");
  const sup=all.actions.find(x=>x.id==="superpowers");
  const ctx=all.actions.find(x=>x.id==="context7");
  assert.equal(gh.next,"PROBE_CONNECTED_TOOL_LIVE");
  assert.equal(sup.next,"PROBE_CONNECTED_TOOL_LIVE");
  assert.equal(ctx.next,"CONSENT_REQUIRED");
  assert.equal(ctx.callable_now,"NOT_ATTESTED_BY_OFFLINE_PLANNER");
});
test("OAuth/local boundaries not accidentally selected for zero friction",()=>{
  const zero=core.build(core.parseArgs(["--zero-friction"]));
  assert(zero.actions.length>=5);
  assert(!zero.actions.some(x=>["awaiting_oauth","external_auth","local_bridge_required","automation_buildable"].includes(x.snapshot_state)));
  assert(!zero.actions.some(x=>x.id==="context7" || x.id==="whatsapp"));
});
test("user goal routes to needed components in practical order",()=>{
  const result=core.build(core.parseArgs(["--goal","Corregir errores en la interfaz HTML responsive"]));
  assert.equal(result.actions[0].id,"github");
  assert(result.actions.some(x=>x.id==="verification"));
  assert(result.actions.some(x=>x.id==="playwright"));
  assert(result.matched_routes.includes("programming") || result.matched_routes.includes("design"));
});
test("other chats can request relevant tools with a single goal in Spanish",()=>{
  for(const [goal,expected] of [
    ["conectar WhatsApp con calendario","integrations"],
    ["estudiar un PDF de Blackboard","study"],
    ["quiero agentes multiagente y colas","agents"],
    ["controlar ubuntu local","local"],
    ["revisar seguridad y OAuth","security"],
    ["transcribir videos YouTube","content"]
  ]){
    const p=core.build(core.parseArgs(["--goal",goal]));
    assert(p.actions.length>0,goal);
    assert(p.matched_routes.includes(expected),goal+" expected "+expected);
  }
});
test("unknown task falls back conservatively",()=>{
  const r=core.build(core.parseArgs(["--goal","xyzzy quux invented"]));
  assert.equal(r.actions[0].id,"github");
  assert.equal(r.actions.length,8);
});
test("explicit selection deduplicated and preserves order",()=>{
  const p=core.build(core.parseArgs(["--id","vercel,github,vercel,context7","--json"]));
  assert.deepEqual(p.actions.map(x=>x.id),["vercel","github","context7"]);
});
test("hard limits and invalid names fail closed",()=>{
  for(const args of [
    ["--all","--limit","999"],
    ["--id","imaginary-tool"],
    ["--goal"],
    ["--unrecognized"],
    ["--goal","a".repeat(501)]
  ]) {
    const out=cli(...args);
    assert.equal(out.status,2,args.join(" "));
    assert.match(out.stderr,/INVALID_READINESS|UNKNOWN_OPTION/);
  }
});
test("CLI outputs valid JSON and no secrets",()=>{
  const r=cli("--goal","Aplicar skills a Prometeo","--json");
  assert.equal(r.status,0,r.stderr);
  const d=JSON.parse(r.stdout);
  assert.equal(d.live_permissions_checked,false);
  assert.equal(d.oauth_grants,0);
  const catalog=fs.readFileSync(path.join(root,"capabilities.json"),"utf8");
  const routes=fs.readFileSync(path.join(root,"intents.json"),"utf8");
  assert(!/perezmenendez\.jm@gmail\.com|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}/i.test(catalog+routes));
});
test("self-test proves offline integrity only",()=>{
  const t=cli("--self-test");
  assert.equal(t.status,0,t.stderr);
  const j=JSON.parse(t.stdout);
  assert.equal(j.status,"PASS");
  assert.equal(j.no_live_claim,true);
  assert.equal(j.capabilities,30);
});
