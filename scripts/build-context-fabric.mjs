#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assertPublicSafe,buildContextFabric,validateFabric} from './context-fabric-lib.mjs';

function args(argv){const o={};for(let i=0;i<argv.length;i++){if(argv[i].startsWith('--')){const k=argv[i].slice(2);const v=argv[i+1]?.startsWith('--')?true:argv[++i];o[k]=v;}}return o;}
const a=args(process.argv.slice(2));
const repo=path.resolve(a.repo || process.cwd());
const configPath=path.resolve(repo,a.config || 'coordination/context-fabric/CONFIG_V1.json');
const out=path.resolve(repo,a.out || 'dist/context-fabric');
const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
let sourceHead=a['source-head'];
if(!sourceHead){try{sourceHead=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();}catch{sourceHead='UNKNOWN';}}
const built=buildContextFabric({repoRoot:repo,config,sourceHead});
const validation=validateFabric(built); if(!validation.ok) throw new Error(`CONTEXT_FABRIC_INVALID:${validation.errors.join(',')}`); assertPublicSafe(built);
fs.mkdirSync(out,{recursive:true});
const writes=[['inventory.json',built.inventory],['graph.json',built.graph],['namespaces/index.json',built.namespaceIndex],['build-state.json',built.buildState]];
for(const [rel,obj] of writes){const p=path.join(out,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n');}
console.log(JSON.stringify({ok:true,source_head:sourceHead,index_hash:built.buildState.index_hash,file_count:built.buildState.file_count,edge_count:built.buildState.edge_count,out},null,2));
