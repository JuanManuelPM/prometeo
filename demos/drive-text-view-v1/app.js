const docs=[
{
 id:'1hugwcx3p_IWWEVEJrCNiuqYAqDdog0o8',
 file:'Miller La_revolucion_cognitiva_una_perspectiva 2006.pdf',
 title:'La revolución cognitiva: una perspectiva histórica',
 author:'George A. Miller',
 size:'65 KB',
 chars:'21.231 caracteres extraídos',
 modified:'29 abr 2025',
 sections:[
  {h:'Resumen',p:[
   'La Ciencia Cognitiva es una criatura de los años cincuenta, producto de una época cuando la psicología, la antropología y la lingüística se redefinían a sí mismas y la ciencia de la computación y la neurociencia surgían como disciplinas.',
   'La psicología no podía participar en la revolución cognitiva hasta tanto no se librara del conductismo, restableciéndole así a la cognición respetabilidad científica. Para entonces empezaba a resultar evidente en varias disciplinas que la solución a algunos de sus problemas dependía de resolver problemas que tradicionalmente se asignaban a otras disciplinas.'
  ]},
  {h:'La revolución cognitiva en psicología',p:[
   'La revolución cognitiva en psicología fue una contra revolución. La primera revolución ocurrió mucho antes cuando un grupo de psicólogos experimentales, influido por Pavlov y otros fisiólogos, propusieron redefinir a la psicología como la ciencia de la conducta.',
   'La percepción se convirtió en discriminación, la memoria en aprendizaje, el lenguaje en comportamiento verbal y la inteligencia se convirtió en lo que las pruebas de inteligencia medían.'
  ]}
 ]
},
{
 id:'1WL_vbL3hjwBDYsevXALX0H5gGCDAX6Qq',
 file:'Rojas paradigma simbolico computacional 2022.pdf',
 title:'Paradigma simbólico computacional, modularidad de la mente y lenguaje',
 author:'Carlos Rodrigo Rojas Zepeda',
 size:'168 KB',
 chars:'56.384 caracteres extraídos',
 modified:'29 abr 2025',
 sections:[
  {h:'Resumen',p:[
   'El paradigma simbólico computacional propone que la mente es un sistema de procesamiento compuesto por un conjunto de estructuras organizadas que operan siguiendo reglas precisas para tratar y transformar la información.',
   'Jerry Fodor presenta un modelo que supone una organización modular de la mente. En esta línea, Noam Chomsky concibe el lenguaje como una capacidad inherente del ser humano, modular y específica, que se desarrolla a partir de procesos madurativos.'
  ]},
  {h:'Generalidades de la ciencia cognitiva',p:[
   'A partir de las investigaciones de Fodor, Pylyshyn, Simon entre otros, la ciencia cognitiva ha crecido como un campo interdisciplinario cuyo objeto de estudio se basa en la naturaleza de la mente, entendiendo el conocimiento como un sistema que constantemente almacena, recupera, transmite y transforma información.'
  ]}
 ]
},
{
 id:'1VhggV-9Ivmiijqoex-xpIrUlQItoPPzz',
 file:'Mieles barrera Aportes de la ciencia cognitiva a la comprension de la cognicion 2024.pdf',
 title:'Aportes de la ciencia cognitiva a la comprensión de la cognición',
 author:'María Dilia Mieles Barrera',
 size:'251 KB',
 chars:'26.068 caracteres extraídos',
 modified:'3 ago 2026',
 sections:[
  {h:'Inicio del texto',p:[
   'El surgimiento de la denominada Ciencia Cognitiva ocurrió en los años 50 del siglo XX en los Estados Unidos, a raíz de la crisis del conductismo que restaba importancia al funcionamiento de la mente en la explicación de la conducta de los seres humanos.',
   'Esta nueva perspectiva se traza el propósito de investigar los principios del procesamiento cognitivo, el pensamiento, el comportamiento inteligente y la representación del conocimiento desde la psicología experimental y con una perspectiva interdisciplinar.'
  ]},
  {h:'Una disciplina interdisciplinar',p:[
   'En 1977 se publica el primer número de la revista Cognitive Science, dedicada de manera específica a la Ciencia Cognitiva. El objetivo era crear un espacio para la difusión de nuevos análisis y teorías sobre representación y procesamiento cognitivo.'
  ]}
 ]
}
];
const $=id=>document.getElementById(id);
const list=$('fileList'),title=$('docTitle'),meta=$('docMeta'),source=$('sourceLine'),body=$('docBody'),driveId=$('driveId');
let active=0;
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderList(){
 list.innerHTML=docs.map((d,i)=>`<button class="file" type="button" data-i="${i}" data-active="${i===active?'1':'0'}"><span class="file-num">${String(i+1).padStart(2,'0')}</span><span><span class="file-name">${esc(d.title)}</span><span class="file-info">PDF · ${esc(d.size)} · ${esc(d.chars)}</span></span></button>`).join('');
 list.querySelectorAll('.file').forEach(b=>b.addEventListener('click',()=>{active=Number(b.dataset.i);render();}));
}
function renderDoc(){
 const d=docs[active];
 source.textContent='GOOGLE DRIVE / PDF REAL';
 title.textContent=d.title;
 meta.textContent=`${d.author} · ${d.file} · modificado ${d.modified}`;
 body.innerHTML=d.sections.map(s=>`<section><h3>${esc(s.h)}</h3>${s.p.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('');
 driveId.textContent=`drive:${d.id}`;
}
function render(){renderList();renderDoc()}
render();