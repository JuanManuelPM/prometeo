import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';

const tree=JSON.parse(await readFile(new URL('../catalog/tree.json',import.meta.url),'utf8'));
const registry=JSON.parse(await readFile(new URL('../catalog/pages.json',import.meta.url),'utf8'));
const pages=new Map(registry.pages.map(page=>[page.id,page]));

assert.equal(registry.schema,'prometeo.page-registry/v1');
assert.equal(pages.size,registry.pages.length,'No puede haber IDs de página duplicados');

const nodeIds=new Set();
const pageRefs=[];
function walk(node,path=[]){
  assert.ok(node.id,`Nodo sin ID en ${path.join('/')}`);
  assert.ok(!nodeIds.has(node.id),`ID de nodo duplicado: ${node.id}`);
  nodeIds.add(node.id);
  if(node.page_id){
    assert.ok(pages.has(node.page_id),`Referencia inexistente: ${node.page_id}`);
    pageRefs.push(node.page_id);
    assert.ok(!node.children,'Una página no debe declarar hijos');
  }
  for(const child of node.children||[])walk(child,[...path,node.id]);
}
walk(tree);

assert.equal(new Set(pageRefs).size,pageRefs.length,'Una página no debe aparecer dos veces en el árbol visible');

for(const page of registry.pages){
  assert.ok(['live','recovered','archived'].includes(page.status),`Estado inválido: ${page.id}`);
  if(page.status==='live'){
    assert.ok(page.href,`Página live sin URL: ${page.id}`);
    const target=new URL(page.href,new URL('../navigator/index.html',import.meta.url));
    if(/^https:\/\//.test(page.href)){
      assert.equal(target.protocol,'https:');
    }else{
      assert.equal(target.protocol,'file:',`Destino local inválido: ${page.id}`);
      await access(target);
    }
  }else{
    assert.ok(!page.href,`Una página no publicada no debe fingir una URL live: ${page.id}`);
    assert.ok(page.artifact_url||page.source,`Página recuperada sin procedencia: ${page.id}`);
  }
}

function resolveDestination(start){
  const chain=[];
  const seen=new Set();
  let node=start;
  while(node){
    assert.ok(!seen.has(node.id),`Ciclo: ${node.id}`);
    seen.add(node.id);
    chain.push(node);
    if(!Array.isArray(node.children)||node.children.length!==1)break;
    node=node.children[0];
  }
  return {node,chain};
}

const leaf={id:'leaf',page_id:'x'};
const single={id:'single',children:[leaf]};
const nested={id:'nested',children:[single]};
const branch={id:'branch',children:[leaf,{id:'other',page_id:'y'}]};
assert.equal(resolveDestination(leaf).node,leaf);
assert.deepEqual(resolveDestination(nested).chain.map(node=>node.id),['nested','single','leaf']);
assert.equal(resolveDestination(branch).node,branch);

const firstLevel=tree.children||[];
assert.ok(firstLevel.length>=2,'La raíz debe ofrecer decisiones reales');
assert.ok(firstLevel.every(node=>(node.children?.length||0)!==1),'El árbol inicial no debe contener carpetas visualmente inútiles');

console.log(JSON.stringify({ok:true,pages:pages.size,visible_page_refs:pageRefs.length,node_ids:nodeIds.size,live:registry.pages.filter(page=>page.status==='live').length,recovered:registry.pages.filter(page=>page.status==='recovered').length},null,2));
