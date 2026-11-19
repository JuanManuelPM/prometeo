import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
const dir=path.resolve(import.meta.dirname,".."),data=JSON.parse(fs.readFileSync(path.join(dir,"versions/1.0.1/flow.json")));
const nodes=new Map(data.nodes.map(n=>[n.id,n]));
test("6 stages, 27 nodes, 36 directed edges",()=>{assert.equal(data.stages.length,6);assert.equal(nodes.size,27);assert.equal(data.nodes.reduce((sum,n)=>sum+(n.yes?1:0)+(n.no?1:0),0),36)});
test("all edges refer to actual nodes",()=>{for(const n of data.nodes){assert.ok(data.stages.some(s=>s.id===n.stage));for(const key of ["yes","no"])if(n[key])assert.ok(nodes.has(n[key]),n.id+" -> "+n[key])}});
test("all nodes reachable from A01",()=>{const done=new Set(),stack=["A01"];while(stack.length){const id=stack.pop();if(done.has(id))continue;done.add(id);const n=nodes.get(id);assert.ok(n);for(const x of [n.yes,n.no])if(x)stack.push(x)}assert.equal(done.size,27)});
test("rights and no-timed-caption gates",()=>{assert.equal(nodes.get("B01").no,"B03");assert.match(nodes.get("B03").contract,/YouTube/);assert.match(nodes.get("C07").contract,/NOT_RUN/)});
test("node diagram reflects real node references without external graph libs",()=>{const page=fs.readFileSync(path.join(dir,"mapa-completo.html"),"utf8");assert.match(page,/versions\/1\.0\.1\/flow\.json/);assert.match(page,/for\(const key of \['yes','no'\]\)/);assert.doesNotMatch(page,/https?:\/\/(?:unpkg|cdn\.jsdelivr|cdnjs)/)});
