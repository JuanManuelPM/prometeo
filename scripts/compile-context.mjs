#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {compileContext} from './context-fabric-lib.mjs';
function args(argv){const o={required:[]};for(let i=0;i<argv.length;i++){if(argv[i]==='--required-ref'){o.required.push(argv[++i]);continue;}if(argv[i].startsWith('--')){const k=argv[i].slice(2);const v=argv[i+1]?.startsWith('--')?true:argv[++i];o[k]=v;}}return o;}
const a=args(process.argv.slice(2)); const repo=path.resolve(a.repo||process.cwd()); const dist=path.resolve(repo,a.index||a.dist||'dist/context-fabric');
const read=n=>JSON.parse(fs.readFileSync(path.join(dist,n),'utf8')); const config=JSON.parse(fs.readFileSync(path.resolve(repo,a.config||'coordination/context-fabric/CONFIG_V1.json'),'utf8'));
const result=compileContext({inventory:read('inventory.json'),graph:read('graph.json'),buildState:read('build-state.json'),config,actorRole:a.role||'worker',mission:a.mission||'',projectId:a.project||null,rootId:a.root||null,opportunityId:a.opportunity||null,runId:a.run||null,requiredRefs:a.required,maxFiles:a['max-files']?Number(a['max-files']):null,expectedSourceHead:a['source-head']||null});
const out=path.resolve(repo,a.out||`dist/context-fabric/working-sets/${result.receipt.receipt_id}.json`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({ok:true,receipt_id:result.receipt.receipt_id,file_count:result.receipt.file_count,token_estimate:result.receipt.token_estimate,out},null,2));
