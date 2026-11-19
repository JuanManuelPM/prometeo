#!/usr/bin/env node
import fs from "node:fs";import path from "node:path";
const flag=(k,d="")=>{const i=process.argv.indexOf("--"+k);return i<0?d:process.argv[i+1]};
const recipe=JSON.parse(fs.readFileSync(flag("recipe"),"utf8"));
const src=fs.readFileSync(new URL("./ejemplos/masculinidad/index.html",import.meta.url),"utf8");
const esc=s=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const item=(s,i)=>{
 if(s.kind==="cover"){
  const title=(s.text||recipe.topic||recipe.source.title||"SECUENCIA").trim().toUpperCase().slice(0,62),words=title.split(/\s+/),k=Math.max(1,Math.floor(words.length/2));
  return '<section class="slide cover is-current" data-kind="cover"><div class="stage-inner opening"><div class="editorial-rule"></div><h1>'+esc(words.slice(0,k).join(" "))+'<br><em>'+esc(words.slice(k).join(" ")||"SECUENCIA")+'</em></h1><div class="opening-bottom"><span>PROMETEO · ESTUDIO AUDIOVISUAL</span><span>01 / SECUENCIA</span></div></div></section>';
 }
 if(s.kind==="video")return '<section class="slide clip" data-kind="video" aria-label="Fragmento '+i+'" aria-hidden="true"></section>';
 if(s.kind==="ending")return '<section class="slide ending" data-kind="ending" aria-label="Final" aria-hidden="true"><div class="stage-inner end-layout"><span class="small-kicker">SECUENCIA / 01</span><h2>FIN<span>.</span></h2><div class="editorial-rule"></div></div></section>';
 const words=String(s.text||"UNA IDEA").trim().toUpperCase().split(/\s+/),lines=[];let cur="";
 for(const w of words){if(cur.length+w.length+1>16&&cur){lines.push(cur);cur=w}else cur+=(cur?" ":"")+w}
 if(cur)lines.push(cur);
 const out=lines.slice(0,4).map((text,k)=>k===Math.min(lines.length,4)-1?"<em>"+esc(text)+"</em>":esc(text)).join("<br>");
 return '<section class="slide statement" data-kind="statement" aria-hidden="true"><div class="stage-inner pause-layout"><span class="small-kicker">EL PRÓXIMO MOMENTO</span><h2>'+out+'</h2><div class="pause-line"></div></div></section>';
};
const a=src.indexOf('<div id="slides"'),b=src.indexOf('<div id="film"');
if(a<0||b<=a)throw Error("TEMPLATE_INVALID");
let html=src.slice(0,a)+'<div id="slides" aria-live="off">'+recipe.slides.map(item).join("\n")+'</div>\n'+src.slice(b);
html=html.replace(/<script type="application\/json" id="sequence-recipe">[\s\S]*?<\/script>/,'<script type="application/json" id="sequence-recipe">'+JSON.stringify(recipe).replace(/<\/script/gi,"<\\/script")+'</script>');
const dest=flag("out","dist/presentacion/index.html");fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,html);
console.log(JSON.stringify({state:"HTML_BUILT",out:dest,slides:recipe.slides.length,bytes:Buffer.byteLength(html)}));
