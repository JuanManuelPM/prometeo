import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const base = dirname(fileURLToPath(import.meta.url));
const get = p => readFileSync(resolve(base,p),'utf8');
const html = get('index.html');
const data = JSON.parse(get('conocimiento.json'));
const embedded = html.match(/<script id="atlas-data" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
const executable = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];

test('atlas source and embedded JSON are equivalent', () => {
  assert.ok(embedded,'Inline data required by opaque iframe');
  assert.deepEqual(JSON.parse(embedded),data);
});

test('knowledge is genuinely sourced and clearly classified', () => {
  assert.equal(data.schema,'prometeo.pixijs-knowledge-atlas/v1');
  assert.equal(data.library,'pixijs');
  assert.equal(data.provenance.userTutorialsRecovered,1);
  assert.ok(data.sources.length>=8);
  assert.equal(data.sources.filter(x=>x.id==='HUGO-SNAKE').length,1);
  assert.equal(data.sources.find(x=>x.id==='HUGO-SNAKE').url,null);
  assert.equal(data.sources.find(x=>x.id==='HUGO-SNAKE').outline.length,11);
  assert.ok(data.sources.find(x=>x.id==='HUGO-SNAKE').knownIssues.length>=5);
  assert.ok(data.sources.filter(x=>x.kind.includes('DOCUMENTACIÓN')).length>=3);
});

test('capabilities have every required practical field', () => {
  const keys=['id','title','family','what','how','parts','from','limits','avoid','projects','pattern','qa','code'];
  assert.ok(data.capabilities.length>=14);
  assert.equal(new Set(data.capabilities.map(x=>x.id)).size,data.capabilities.length);
  for(const row of data.capabilities){
    for(const key of keys)assert.ok(typeof row[key]==='string'&&row[key].trim().length>5,key+' missing in '+row.id);
  }
});

test('every related concept and internal file is resolvable', () => {
  const ids=new Set(data.capabilities.map(c=>c.id));
  for(const source of data.sources)for(const concept of source.concepts||[])assert.ok(ids.has(concept),concept);
  const docs=[
   'README.md','PLAN_FASE2.md','PROCEDENCIA_Y_ESTADO.md',
   'docs/01_DESPIECE_DEL_TUTORIAL.md','docs/02_MOTOR_Y_VARIACIONES.md'];
  for(const doc of docs)assert.ok(existsSync(resolve(base,doc)),doc);
  assert.equal(data.next.length,3);
  assert.equal(data.ideas.length,12);
  assert.equal(data.projects.length,4);
});

test('JavaScript compiles without bundler or external network',()=>{
  assert.ok(executable);
  new Script(executable,{filename:'atlas-ui.js'});
  assert.ok(!/src=["']https?:\/\//.test(html),'forbid runtime CDNs');
  assert.ok(!/\blocalStorage\b/.test(executable),'not usable inside opaque iframe');
  assert.ok(!/\bfetch\(/.test(executable),'Atlas must be self-contained');
  assert.ok(/id="search"/.test(html));
  assert.ok(/id="filters"/.test(html));
});

test('only valid HTTPS sources are published',()=>{
  for(const source of data.sources){
    if(source.url===null)continue;
    assert.match(source.url,/^https:\/\//);
  }
});
