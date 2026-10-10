#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {checkPreparedDot} from "./prometeo-fire-dot-gate.mjs";
const cases=JSON.parse(fs.readFileSync("coordination/one-turn/v1/FIRE_DOT_EVAL_V1.json","utf8"));
for(const t of cases.cases) {
 const x={...cases.base,...t.overrides,plan:t.overrides.plan===null?null:{...cases.base.plan,...(t.overrides.plan||{})}};
 const got=checkPreparedDot(x);
 assert.equal(got.reason,t.expected,t.id);
 console.log("PASS",t.id,got.reason);
}
console.log("PASS",cases.cases.length,"pure dot eligibility cases. Not backend CAS or private owner tests.");
