#!/usr/bin/env node
// Static and parser behavioral tests. Does NOT test ChatGPT skill installation, GitHub freshness, UI or private saves.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parseFire} from './prometeo-fire-router.mjs';
const base=path.resolve('coordination/one-turn/v1');
const registry=JSON.parse(fs.readFileSync(path.join(base,'FIRE_COMMANDS_V1.json'),'utf8'));
const suite=JSON.parse(fs.readFileSync(path.join(base,'FIRE_EVAL_CASES_V1.json'),'utf8'));
assert.equal(registry.schema,'prometeo.fire-command-registry/v1');
assert.equal(suite.case_count,suite.tests.length);
assert.equal(new Set(registry.commands.map(x=>x.id)).size,registry.commands.length);
const all=[registry.default,...registry.commands],aliases=new Set();
for(const command of all){
  for(const a of command.aliases){let f=a.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();assert(!aliases.has(f), 'Alias duplicado: '+a);aliases.add(f)}
  if(command.skills)for(const skill of command.skills)assert(['prometeo-one-turn','prometeo-web-change','prometeo-verify-release','prometeo-fire','prometeo-knowledge','prometeo-skill-scout'].includes(skill),'Unknown skill '+skill);
}
for(const tc of suite.tests){
  const got=parseFire(tc.input);
  assert.equal(got.triggered,tc.key!==null,tc.input);
  if(tc.key!==null){assert.equal(got.key,tc.key,tc.input);assert.equal(got.topic,tc.topic,tc.input);if(tc.action)assert.equal(got.action,tc.action,tc.input)}
  if(tc.unknown)assert.equal(got.unknown,true,tc.input);
  console.log('PASS',JSON.stringify(tc.input),got.key||'no-command');
}
for(const name of ['prometeo-fire','prometeo-knowledge','prometeo-skill-scout']){
  const file=path.resolve('.agents/skills',name,'SKILL.md'),s=fs.readFileSync(file,'utf8');
  assert(s.startsWith('---\n')&&s.includes('name: '+name)&&s.includes('description:'),'Bad skill '+name);
}
const catalog=JSON.parse(fs.readFileSync(path.join(base,'SKILLS_CATALOG_V1.json'),'utf8'));
assert(catalog.skills.some(s=>s.name==='prometeo-fire'),'Router not indexed in skill catalog');
assert(catalog.skills.some(s=>s.name==='prometeo-skill-scout'),'Skill scout not indexed');
console.log('PASS',suite.tests.length,'router cases,',suite.safety_cases.length,'review-only safety scenarios,',registry.commands.length,'commands');
console.log('BOUNDARY: safety scenarios are contract expectations, not runtime permission tests');
