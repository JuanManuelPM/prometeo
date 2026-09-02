import assert from 'node:assert/strict';
import {access,readFile,stat} from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const names=['class','student-world','pagekit','study','controls','feedback','operation'];
const htmlByName=new Map();

for(const name of names){
  const base=new URL(`pages/proposals/${name}/`,root);
  await access(new URL('index.html',base));
  await access(new URL('PAGE_CONTRACT.json',base));
  const html=await readFile(new URL('index.html',base),'utf8');
  const contract=JSON.parse(await readFile(new URL('PAGE_CONTRACT.json',base),'utf8'));
  htmlByName.set(name,html);
  assert.equal(contract.authority.startsWith('PROPOSAL'),true,`${name}: autoridad inválida`);
  assert.match(html,/<meta name="viewport"/i,`${name}: sin viewport`);
  assert.match(html,/shared\/proposals\/v1\/proposal\.css/,`${name}: no consume el template compartido`);
  assert.match(html,/shared\/components\/v1\/components\.js/,`${name}: no consume componentes compartidos`);
  assert.doesNotMatch(html,/font-size:\s*(?:[0-9]|1[01])px/i,`${name}: texto menor a 12px`);
  const bytes=(await stat(new URL('index.html',base))).size;
  assert.ok(bytes<20000,`${name}: HTML demasiado pesado (${bytes})`);
  const inline=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
  inline.forEach((source,index)=>new vm.Script(source,{filename:`${name}:inline-${index}`}));
}

for(const name of ['class','pagekit']){
  const html=htmlByName.get(name);
  assert.match(html,/shared\/widgets\/whiteboard\/v1\/whiteboard\.css/);
  assert.match(html,/shared\/widgets\/whiteboard\/v1\/whiteboard\.js/);
  assert.doesNotMatch(html,/class PrometeoWhiteboard|function mount\(host=document\.body\)/,`${name}: reimplementa el pizarrón`);
}

assert.doesNotMatch(htmlByName.get('controls'),/Controles táctiles\s*·\s*V9/i,'La propuesta no puede fingir ser V9');
assert.match(htmlByName.get('controls'),/no reemplaza V9/i);
assert.match(htmlByName.get('controls'),/pointerdown/);
assert.match(htmlByName.get('class'),/Comprobar/);
assert.match(htmlByName.get('class'),/Pista 1 de 3/);

const componentCss=await readFile(new URL('shared/components/v1/components.css',root),'utf8');
assert.match(componentCss,/box-shadow:var\(--p-control-shadow\)/);
assert.match(componentCss,/min-height:46px/);
const kernel=await readFile(new URL('shared/design-kernel/v1/tokens.css',root),'utf8');
assert.match(kernel,/--p-control-shadow:/);
assert.match(kernel,/inset 0 1px 0 var\(--p-highlight\)/);

const whiteboard=await readFile(new URL('shared/widgets/whiteboard/v1/whiteboard.js',root),'utf8');
new vm.Script(whiteboard,{filename:'whiteboard.js'});
for(const tool of ['laser','pen','highlighter','eraser'])assert.match(whiteboard,new RegExp(`data-tool="${tool}"`));

console.log(JSON.stringify({ok:true,proposals:names.length,shared_whiteboard_consumers:['proposal-class','proposal-pagekit'],html_budget:'PASS',inline_javascript:'PASS'},null,2));
