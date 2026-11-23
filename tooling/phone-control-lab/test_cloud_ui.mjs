import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('./cloud-preview/index.html',import.meta.url),'utf8');
test('cloud editor is responsive, isolated and does not claim real phone control',()=>{
 assert.match(html,/name="viewport"/);
 assert.match(html,/@media\(max-width:650px\)/);
 assert.match(html,/NO PRODUCCIÓN/);
 assert.match(html,/No controla el teléfono/);
 assert.doesNotMatch(html,/<script[^>]+src=/);
 assert.doesNotMatch(html,/localStorage|fetch\(|XMLHttpRequest|WebSocket\(/);
});
test('form generates an evidence-based multi-step prompt in memory only',()=>{
 const callbacks={};const elements={};
 for(const id of ['mode','objective','output','copy','generate','clear','copyStatus']){
  elements[id]={value:id==='mode'?'control':'',textContent:'',addEventListener:(ev,fn)=>callbacks[id+':'+ev]=fn};
 }
 const sandbox={document:{getElementById:id=>elements[id]},navigator:{clipboard:{writeText:async()=>{}}}};
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script,'Embedded script missing');
 vm.runInNewContext(script,sandbox,{timeout:1000});
 elements.objective.value='Verificar si puedo controlar el reproductor sin leer chats';
 callbacks['generate:click']();
 assert.match(elements.output.textContent,/Verificar si puedo controlar el reproductor/);
 assert.match(elements.output.textContent,/REAL EN DISPOSITIVO/);
 assert.match(elements.output.textContent,/No root/);
 assert.match(elements.output.textContent,/regresión|reversi|reversión/i);
 assert.match(elements.output.textContent,/autorización|aprobación/i);
 callbacks['clear:click']();
 assert.equal(elements.objective.value,'');
});
