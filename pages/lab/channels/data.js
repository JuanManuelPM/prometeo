const IMG={
  pear:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/The_Apple_and_pear_as_vintage_fruits_%28Page_191%29_BHL6364698.jpg/960px-The_Apple_and_pear_as_vintage_fruits_%28Page_191%29_BHL6364698.jpg",
  skull:"https://upload.wikimedia.org/wikipedia/commons/5/56/Skull_with_hourglass.jpg",
  person:"https://upload.wikimedia.org/wikipedia/commons/4/4c/Nuremberg_chronicles_-_Strange_People_-_No_Nose_%28XIIr%29.jpg",
  deer:"https://upload.wikimedia.org/wikipedia/commons/3/38/Musk_1616.jpg"
};
let FRUTI=IMG.person;
fetch("https://raw.githubusercontent.com/JuanManuelPM/prometeo/bc8c5ceb178c3d5562a41dd0aa7c100e40bb1063/pages/lab/channels/index.html")
  .then(r=>r.text()).then(t=>{
    const m=t.match(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/);
    if(!m)return;
    FRUTI=m[0];
    document.querySelectorAll("[data-fruti]").forEach(x=>x.src=FRUTI);
    document.querySelectorAll('[data-imgkey="fruti"]').forEach(x=>x.src=FRUTI);
  }).catch(()=>{});

const data={
"Frutidrama":[
 {title:"La boda secreta de Banana",copy:"Banana se casa con Durazno. Frutilla aparece con un compromiso anterior.",eps:[["Banana propone matrimonio en secreto","fruti","idea"],["Limón encuentra el anillo equivocado","pear","guion"],["Frutilla llega sin invitación","person","idea"],["Durazno descubre el pacto","skull","idea"]]},
 {title:"La herencia de Sandía",copy:"El testamento sólo premia a quien nunca le haya mentido a la abuela.",eps:[["Sandía deja una condición imposible","deer","listo"],["Manzana falsifica una carta","person","guion"],["Pera acusa al heredero equivocado","pear","idea"],["El abogado también estaba a prueba","skull","idea"]]},
 {title:"La doble vida de Frutilla",copy:"Dos familias creen que Frutilla vive con ellas. Los cumpleaños caen el mismo día.",eps:[["Dos cumpleaños, una Frutilla","fruti","idea"],["Uva la ve entrar en otra casa","person","idea"],["Las dos familias compran la misma torta","deer","idea"],["Frutilla inventa una gemela","skull","idea"]]}
],
"Tiny Science":[
 {title:"El animal que ve colores imposibles",copy:"Una percepción que el ojo humano nunca puede experimentar.",eps:[["Lo que ve una mantis marina","pear","idea"],["Un color fuera de tu visión","deer","idea"],["Por qué tus ojos tienen un límite","person","guion"]]},
 {title:"El tiempo no corre igual",copy:"Dos relojes idénticos dejan de coincidir.",eps:[["Dos relojes se separan","skull","idea"],["El piso de arriba envejece distinto","person","idea"],["Cómo medirlo","pear","guion"]]},
 {title:"Lo que atraviesa tu cuerpo",copy:"Miles de partículas cruzan tu cuerpo sin que lo notes.",eps:[["Una lluvia invisible","deer","idea"],["Por qué no la sentís","pear","idea"],["Cómo sabemos que existe","person","idea"]]}
],
"Dark Maps":[
 {title:"La ciudad debajo de la ciudad",copy:"Un mapa conserva calles que ya no existen en la superficie.",eps:[["Calles enterradas","skull","guion"],["La entrada que quedó escondida","person","idea"],["El mapa viejo","pear","idea"]]},
 {title:"La isla que nunca estuvo ahí",copy:"Décadas de mapas insistieron en un lugar inexistente.",eps:[["La isla fantasma","deer","idea"],["Quién la inventó","person","idea"],["Cuándo desapareció del mapa","pear","guion"]]},
 {title:"La frontera móvil",copy:"Una frontera física cambia con el terreno.",eps:[["Dónde empieza el país","person","idea"],["El río mueve la línea","pear","idea"],["La casa entre dos países","deer","idea"]]}
],
"Forgotten Machines":[
 {title:"La computadora antes de la electricidad",copy:"Una máquina calculaba cuando la computadora aún no existía.",eps:[["La máquina imposible","person","guion"],["Cómo calculaba","pear","idea"],["Por qué nadie la terminó","skull","idea"]]},
 {title:"El correo por tubos",copy:"Una red urbana estuvo cerca de ser infraestructura cotidiana.",eps:[["La ciudad de tubos","deer","idea"],["Un mensaje a 60 km/h","person","idea"],["Por qué desapareció","skull","guion"]]},
 {title:"El avión nuclear",copy:"Una idea enorme que avanzó demasiado antes de ser cancelada.",eps:[["El reactor dentro del avión","skull","idea"],["Cómo protegían a la tripulación","person","idea"],["Por qué no voló","pear","guion"]]}
],
"Odd Cities":[
 {title:"La ciudad dentro de un edificio",copy:"Miles de personas resuelven casi toda su vida sin salir.",eps:[["Una ciudad vertical","deer","idea"],["Qué hay adentro","person","idea"],["Quién vive ahí","pear","guion"]]},
 {title:"La estación fantasma",copy:"Una estación cerrada sigue intacta debajo de una línea activa.",eps:[["El tren que no para","skull","guion"],["Qué quedó adentro","person","idea"],["Por qué cerró","pear","idea"]]},
 {title:"El barrio sin autos",copy:"Una regla simple reorganizó toda la calle.",eps:[["La calle sin motores","deer","idea"],["Cómo llega la gente","pear","idea"],["Qué pasó con los comercios","person","guion"]]}
]
};

const ready={
"Frutidrama":[["Sandía deja una condición imposible","deer","hoy · 18:00"],["Limón encuentra el anillo equivocado","pear","hoy · 22:00"],["Manzana falsifica una carta","person","mañana"]],
"Tiny Science":[["El color imposible","pear","hoy · 18:00"],["Dos relojes se separan","skull","hoy · 22:00"],["Una lluvia invisible","deer","mañana"]],
"Dark Maps":[["La estación enterrada","skull","hoy · 18:00"],["La isla fantasma","deer","hoy · 22:00"],["El mapa viejo","pear","mañana"]],
"Forgotten Machines":[["La máquina imposible","person","hoy · 18:00"],["La ciudad de tubos","deer","hoy · 22:00"],["El reactor volador","skull","mañana"]],
"Odd Cities":[["La ciudad vertical","deer","hoy · 18:00"],["El tren no para","skull","hoy · 22:00"],["La calle sin motores","pear","mañana"]]
};

const frutiPublished=[
 ["La carta escondida de Manzana","2026-08-02","02 ago","pear",78,420,61,5.4,24,"inicio parejo"],
 ["Banana mintió en la cena","2026-08-05","05 ago","fruti",112,610,68,6.8,32,"sube el ritmo"],
 ["La llamada de Limón","2026-08-08","08 ago","person",95,350,64,5.9,27,"pierde velocidad"],
 ["Frutilla abre la puerta","2026-08-12","12 ago","fruti",168,980,74,8.2,48,"aceleración fuerte"],
 ["Sandía cambia el testamento","2026-08-15","15 ago","deer",143,760,72,7.4,42,"sostiene"],
 ["Durazno escucha todo","2026-08-19","19 ago","skull",181,1200,77,8.8,57,"nuevo máximo"],
 ["Pera acusa a la hermana","2026-08-22","22 ago","pear",154,830,71,7.6,45,"cede"],
 ["Banana desaparece","2026-08-26","26 ago","person",126,540,66,6.2,35,"caída clara"],
 ["La boda empieza igual","2026-08-30","30 ago","fruti",196,1460,79,9.1,64,"rebote fuerte"],
 ["Frutilla aparece en la iglesia","2026-09-03","03 sep","fruti",212,1600,81,9.4,71,"máximo del período"]
];
function obj(r){return {title:r[0],date:r[1],label:r[2],img:r[3],views:r[4],subs:r[5],retention:r[6],ctr:r[7],revenue:r[8],note:r[9]}}
function genericPublished(prefix,seed){
  const dates=["2026-08-02","2026-08-06","2026-08-10","2026-08-14","2026-08-18","2026-08-22","2026-08-26","2026-08-30","2026-09-03"];
  const labels=["02 ago","06 ago","10 ago","14 ago","18 ago","22 ago","26 ago","30 ago","03 sep"];
  const imgs=["pear","person","deer","skull","person","pear","deer","skull","pear"];
  const shape=[0,28,15,55,44,78,63,91,84];
  return dates.map((d,i)=>({title:prefix+" "+(i+1),date:d,label:labels[i],img:imgs[i],views:70+seed+shape[i],subs:180+seed*4+shape[i]*5,retention:60+Math.round(shape[i]/6),ctr:5+shape[i]/25,revenue:20+seed/3+shape[i]/3,note:i&&shape[i]<shape[i-1]?"cede":"sube"}));
}
const published={
 "Frutidrama":frutiPublished.map(obj),
 "Tiny Science":genericPublished("Experimento",18),
 "Dark Maps":genericPublished("Mapa",5),
 "Forgotten Machines":genericPublished("Máquina",24),
 "Odd Cities":genericPublished("Ciudad",11)
};
const changes={
 "Frutidrama":[["2026-08-11","Frutilla protagonista"],["2026-08-18","cliffhanger doble"],["2026-08-25","52 s"],["2026-08-29","18:00"]],
 "Tiny Science":[["2026-08-13","hook visual"],["2026-08-21","voz B"],["2026-08-28","25 s"]],
 "Dark Maps":[["2026-08-13","mapa primero"],["2026-08-21","menos texto"],["2026-08-29","serie isla"]],
 "Forgotten Machines":[["2026-08-13","objeto primero"],["2026-08-21","30 s"],["2026-08-29","voz nueva"]],
 "Odd Cities":[["2026-08-13","plano aéreo"],["2026-08-21","42 s"],["2026-08-29","serie estaciones"]]
};
const metricMeta={views:{label:"vistas/día"},subs:{label:"subs/día"},retention:{label:"retención"},ctr:{label:"CTR"},revenue:{label:"ingreso/día"}};
