(()=>{
  const summaries={
    'RAÍCES FILOSÓFICAS': '<b>La pregunta por la mente aparece mucho antes que la psicología científica.</b> Sócrates instala memoria y autoconocimiento; Platón trabaja percepción, memoria y pensamiento ligados al alma racional; Aristóteles retoma esos problemas desde una mirada más objetiva y distingue alma racional y sensitiva. Con Descartes y el racionalismo se refuerza la idea de una mente activa, capaz de razonar, discriminar, querer y decidir. Esa tradición comparte con el cognitivismo interés por razón, lógica, conciencia e intencionalidad; lo que cambia después es el intento de estudiar esos procesos con métodos empíricos y objetivos.',
    'LÍNEAS PREVIAS': '<b>El cognitivismo no aparece de la nada: responde a límites y aportes de corrientes anteriores.</b> El conductismo aporta rigor experimental y una explicación centrada en estímulo–respuesta, pero deja fuera lo que ocurre entre ambos. La Gestalt ya piensa la experiencia como una organización activa y por eso queda mucho más cerca de la futura preocupación cognitiva. El psicoanálisis forma parte del contexto histórico, aunque la cátedra aclara que en ese momento no se lo consideraba científico y que no tuvo el mismo peso directo en esta genealogía.',
    'ANTECEDENTES': '<b>Acá empieza a abrirse la “caja negra”.</b> James muestra que las creencias filtran y seleccionan la experiencia; Tolman da un paso más al proponer variables intervinientes, aprendizaje latente y mapas cognitivos. En paralelo aparecen herramientas que vuelven posible modelar operaciones internas: Frege aporta lógica simbólica, Turing computación, Shannon una teoría formal de la información y del bit, y Wiener cibernética y feedback. Juntos preparan la idea de una mente que recibe, transforma y utiliza información.',
    'PRIMERA REVOLUCIÓN': '<b>La primera revolución convierte esos antecedentes en un programa científico de estudio de la mente.</b> En Hixon, Von Neumann relaciona computadora y cerebro, McCulloch piensa procesamiento neural y lógica, y Lashley muestra que cadenas simples E→R no alcanzan para explicar conducta compleja. En MIT convergen otros tres frentes: Newell y Simon con una máquina lógica, Chomsky con gramática transformacional y Miller con límites de memoria a corto plazo. La computadora pasa a funcionar como modelo para pensar representaciones, reglas y procesamiento interno, y la ciencia cognitiva se consolida como campo interdisciplinario.',
    'SÍMBOLOS → SEGUNDA REVOLUCIÓN': '<b>El paradigma simbólico-computacional permite explicar mucho, pero también muestra su límite.</b> Fodor propone una mente modular y Marr aplica esa lógica a la visión mediante procesos especializados. El problema aparece cuando se intenta reducir al ser humano a un procesador lineal y aislado: la cátedra marca dos correcciones centrales, la recursividad de la conducta y el peso de la esfera social. Bruner acompaña ese giro desde New Look hasta cultura y significado; Bandura suma la reciprocidad triádica entre persona, conducta y ambiente. La segunda revolución no elimina el procesamiento: lo inserta en una realidad social, cultural y constructiva.'
  };
  const add=()=>{
    document.querySelectorAll('#history .stage').forEach(stage=>{
      if(stage.querySelector('.stageSummary')) return;
      const title=stage.querySelector('.stageTitle');
      if(!title) return;
      const key=title.textContent.trim().toUpperCase();
      const html=summaries[key];
      if(!html) return;
      const div=document.createElement('div');
      div.className='stageSummary';
      div.innerHTML=html;
      title.insertAdjacentElement('afterend',div);
    });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',add,{once:true}); else add();
})();
