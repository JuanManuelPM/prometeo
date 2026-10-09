#!/usr/bin/env node
// Self-contained static contract smoke + real parser. Run from repo root on PR #71.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseFire} from './prometeo-fire-router.mjs';
const read=p=>fs.readFileSync(p,'utf8');
const method='coordination/one-turn/v1/PROOF_FIRST_BUILD_METHOD_V1.md';
const books='coordination/one-turn/v1/PROOF_FIRST_BOOKS_MAPPING_V1.md';
const m=read(method),b=read(books);
for(const part of ['HUMAN CAPABILITY','DESIGN THE DEMO FIRST','ACCEPTANCE BEFORE CODE','MINIMAL IMPLEMENTATION','GREEN / REGRESSION','REAL DEMO','RELEASE GATE','PERSIST / REINCARNATE','QUICK_SHOW'])assert(m.includes(part),'Missing method phase '+part);
for(const author of ['Kent Beck','Gojko Adzic','Steve Freeman & Nat Pryce'])assert(b.includes(author),'Missing source '+author);
for(const file of ['.agents/skills/prometeo-web-change/SKILL.md','.agents/skills/prometeo-verify-release/SKILL.md','.agents/skills/prometeo-fire/SKILL.md','.agents/skills/prometeo-tv-show/SKILL.md','.agents/skills/prometeo-knowledge/SKILL.md','AGENTS.md','coordination/one-turn/v1/FIRE_PROJECT_BOOTSTRAP_V1.txt'])assert(read(file).includes(method),'Missing dispatch link '+file);
const cat=JSON.parse(read('coordination/one-turn/v1/SKILLS_CATALOG_V1.json'));assert.equal(cat.proof_first_build_method,method);
const evo=JSON.parse(read('ui-workspace-v1/continuity/evolution-v1/IDEA_INDEX_V1.json'));assert.equal(evo.idea_count,45);assert.equal(evo.ideas.length,45);assert(evo.ideas.every(i=>i.status==='DESIGN_REQUIREMENT_NOT_TESTED'),'No EVO auto-completion');
for(const s of ['🔥tv calendario','🔥tv demo V6']){const a=parseFire(s);assert.equal(a.action,'TV_SHOW_SCENE');assert.equal(a.requires_prepared_plan,false)}
assert.equal(parseFire('🔥prometeo mejorar un widget').action,'EXECUTE_ONE_TURN_SCOPED');
assert.equal(parseFire('🔥preparar mejorar un widget').action,'PREPARE_SKILLS_AND_PLAN');
console.log('PASS proof-first source and fast-path invariants; V6 real demo and publication NOT TESTED');
