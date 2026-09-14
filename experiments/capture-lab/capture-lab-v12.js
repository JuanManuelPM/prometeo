const SEED_VERSION='prometeo-reorg-20260914-v1';
const SEED_KEY='captureLabSeedVersionV12';
const NOTES_KEY='captureLabNotes';
const ARCHIVED_KEY='captureLabArchivedV9';
const BACKUP_KEY='captureLabBackupBeforeReorgV12';

function readJson(k,fallback){try{const v=JSON.parse(localStorage.getItem(k)||'');return v??fallback}catch{return fallback}}
function textNote(id,text,offset){const t=Date.now()-offset;return{id,parts:[{type:'text',text}],ts:t,updated:t}}

const seedNotes=[
  textNote('reorg-01-shell',`Quiero empezar un Prometeo nuevo, mucho más chico y simple. No quiero que la home intente mostrar todo el sistema viejo. Quiero una entrada limpia desde la que pueda abrir pocas herramientas claras y empezar a construir cosas nuevas.`,12000),
  textNote('reorg-02-navigation',`Por ahora dejemos de lado el botón/navegador espacial complejo. Para esta etapa quiero una navegación simple tipo carpetas o lista: tocar una carpeta, ver sus páginas, tocar una página y abrirla. Más adelante podemos volver a diseñar un control espacial lindo sin bloquear el uso del sistema.`,11000),
  textNote('reorg-03-legacy',`No quiero perder nada de Prometeo viejo. Quiero una carpeta o sección Legado desde la que se pueda acceder al Prometeo viejo y a todas las páginas históricas útiles, con links reales y sin promoverlas automáticamente como Current. Lo viejo queda accesible, pero fuera del núcleo nuevo.`,10000),
  textNote('reorg-04-tools-home',`Quiero una carpeta Herramientas. Cada herramienta tiene que tener una función muy clara, una página propia y un nombre simple. La home nueva no debería llenarse de dashboards ni de información técnica: sólo navegar y abrir herramientas.`,9000),
  textNote('reorg-05-stt',`Dentro de Herramientas quiero Voz → Texto. Reutilizá el Capture que ya comprobamos que funciona en Android: grabación con MediaRecorder, audio guardado primero, Whisper local, español, Small con fallback a Base, y transcripción sin bloquear la interfaz. Quiero convertir eso en una herramienta clara y después poder experimentar con transcripción más en vivo/por fragmentos sin romper el baseline que ya funciona.`,8000),
  textNote('reorg-06-tts',`También quiero Texto → Voz como herramienta separada. Ya estoy trabajando esto en otra página, así que antes de reconstruir buscá el donor/página real que exista y recuperá lo útil. La herramienta debería dejarme escribir o pegar texto, generar/reproducir audio y ser simple de probar desde celular y PC.`,7000),
  textNote('reorg-07-live-tv',`Quiero Prometeo Live / TV como una herramienta principal: una pantalla grande universal donde pueda mostrar páginas, dashboards, videos, juegos, previews de workers o varias superficies a la vez. No debe estar limitada a un tipo de contenido.`,6000),
  textNote('reorg-08-remote',`Quiero que Prometeo Live tenga un modo control remoto rápido sin IA: la TV muestra un QR, lo escaneo con el celular y ese celular controla la sesión directamente. Tiene que servir para cambiar superficies, controlar video y, más adelante, para que varios amigos entren a una room y jueguen juntos desde sus teléfonos.`,5000),
  textNote('reorg-09-calendar',`Quiero Calendario como una herramienta clara del Prometeo nuevo. Antes de rehacerlo, recuperá el mejor Calendar existente y su estado real. La nueva entrada debería abrir un calendario usable y simple, conservando lo valioso que ya exista como Month/Week/Day y la identidad compartida de eventos cuando corresponda.`,4000),
  textNote('reorg-10-study',`Student World, José, PageKit, Class Player y whiteboard siguen siendo valiosos, pero no quiero que vuelvan a convertir la home nueva en un sistema enorme. Por ahora deben quedar accesibles desde una sección de Proyectos/Legado o Herramientas especializadas, preservando sus mejores donors y sin reconstruirlos sólo para meterlos en la home.`,3000),
  textNote('reorg-11-registry',`Me gustaría que agregar una herramienta nueva después sea barato: registrar nombre, ruta, una frase de función y estado, y que aparezca en la carpeta correcta. No quiero tener que rediseñar toda la navegación cada vez que nace una página nueva.`,2000),
  textNote('reorg-12-design-law',`Regla visual para este nuevo Prometeo: simple, móvil primero, pocas palabras, superficies planas y profundidad sólo en controles manipulables. Cada página debe explicar su función por lo que permite hacer, no por títulos enormes ni paneles decorativos.`,1000),
];

if(localStorage.getItem(SEED_KEY)!==SEED_VERSION){
  const existing=readJson(NOTES_KEY,[]);
  localStorage.setItem(BACKUP_KEY,JSON.stringify({at:Date.now(),notes:existing}));
  const archived=new Set(readJson(ARCHIVED_KEY,[]).map(String));
  for(const n of existing){if(n?.id)archived.add(String(n.id))}
  for(const n of seedNotes)archived.delete(n.id);
  const existingWithoutSeed=existing.filter(n=>!seedNotes.some(s=>s.id===String(n?.id||'')));
  localStorage.setItem(NOTES_KEY,JSON.stringify([...seedNotes,...existingWithoutSeed]));
  localStorage.setItem(ARCHIVED_KEY,JSON.stringify([...archived]));
  localStorage.setItem(SEED_KEY,SEED_VERSION);
}

await import('./capture-lab-v11.js?v=12');
