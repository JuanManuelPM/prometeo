import test from "node:test";import assert from "node:assert/strict";import {spawnSync} from "node:child_process";import fs from "node:fs";import os from "node:os";import path from "node:path";
const dir=path.resolve(import.meta.dirname,".."),sample=path.join(dir,"ejemplos/masculinidad/recipe.json");
test("three real non-overlapping editorial sample excerpts",()=>{const x=JSON.parse(fs.readFileSync(sample)),a=x.slides.filter(z=>z.kind==="video");assert.equal(a.length,3);for(let i=0;i<a.length;i++){assert.ok(a[i].end>a[i].start);if(i)assert.ok(a[i].start>=a[i-1].end)}});
test("renderer preserves V2 typography, only two arrows and external player",()=>{
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"av-test-")),dest=path.join(tmp,"index.html");
const p=spawnSync(process.execPath,[path.join(dir,"render.mjs"),"--recipe",sample,"--out",dest],{encoding:"utf8"});assert.equal(p.status,0,p.stderr);
const html=fs.readFileSync(dest,"utf8");
assert.match(html,/--paper:#f0ebde/);assert.match(html,/youtube\.com\/iframe_api/);
assert.equal((html.match(/class="arrow /g)||[]).length,2);
assert.equal((html.match(/data-kind="video"/g)||[]).length,3);
});
test("sample uses embed-only rights",()=>assert.equal(JSON.parse(fs.readFileSync(sample)).source.rights,"third-party-embed-only"));
