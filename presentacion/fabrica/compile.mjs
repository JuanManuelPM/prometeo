#!/usr/bin/env node
import fs from "node:fs";import path from "node:path";import {makeRecipe} from "./engine.mjs";
const flag=(k,d="")=>{const i=process.argv.indexOf("--"+k);return i<0?d:process.argv[i+1]};
const t=JSON.parse(fs.readFileSync(flag("transcript"),"utf8"));
const recipe=makeRecipe({videoId:t.videoId,title:t.title||t.videoId,channel:t.channel||"",topic:t.topic||flag("topic",""),cues:t.cues,count:3,rights:"embed"});
if(recipe.slides.filter(x=>x.kind==="video").length<2)throw Error("NOT_ENOUGH_DISTINCT_EXCERPTS");
const f=flag("out","dist/recipe.json");fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(recipe,null,2)+"\n");
console.log(JSON.stringify({state:"RECIPE_BUILT",slides:recipe.slides.length,clips:recipe.slides.filter(x=>x.kind==="video").length}));
