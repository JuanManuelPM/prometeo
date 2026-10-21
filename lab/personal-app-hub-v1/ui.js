
const status=document.getElementById("status"),events=document.getElementById("events"),proposals=document.getElementById("proposals");
const fragment=new URLSearchParams(location.hash.slice(1));
if(fragment.get("key")){sessionStorage.setItem("prometeo-hub-key",fragment.get("key"));history.replaceState(null,"",location.pathname)}
const key=sessionStorage.getItem("prometeo-hub-key")||"";
function e(tag,text,className=""){const n=document.createElement(tag);n.textContent=text;n.className=className;return n}
function draw(rows,actions){
  events.replaceChildren();proposals.replaceChildren();
  if(!rows.length)events.append(e("p","No hay eventos reales."));
  rows.forEach(x=>{const card=e("article","");card.append(e("div",x.source+" · "+x.occurred_at,"minor"),e("strong",x.title||x.kind),e("p",x.text||"Solo metadatos."));events.append(card)});
  if(!actions.length)proposals.append(e("p","Todavía no hay acciones propuestas."));
  actions.forEach(x=>{const card=e("article","");card.append(e("strong","Revisar elemento"),e("div",x.event_id+" · NO EJECUTADA","minor"));proposals.append(card)});
}
async function get(route){const r=await fetch(route,{headers:{"x-prometeo-key":key},cache:"no-store"});if(!r.ok)throw Error("API "+r.status);return r.json()}
async function load(){
  if(!key){status.textContent="Abrí la URL local que imprime el servidor para autorizar esta sesión.";return}
  try{
    const [s,a,b]=await Promise.all([get("/api/status"),get("/api/events"),get("/api/proposals")]);
    status.textContent="LOCAL · "+s.events+" eventos · Proveedores conectados: "+s.provider_sessions+" · Escrituras externas: DESACTIVADAS";
    draw(a.items,b.items);
  }catch(err){status.textContent="Conexión sin verificar: "+err.message}
}
document.getElementById("reload").onclick=load;document.getElementById("real").onclick=load;
document.getElementById("demo").onclick=()=>{
  status.textContent="DEMO FICTICIA: no se leyó WhatsApp ni se guardaron datos.";
  draw([{source:"whatsapp_notification",kind:"message.received",title:"Consulta de clase (ficticia)",text:"¿Podemos vernos el jueves?",occurred_at:"2026-01-01"}],
       [{event_id:"DEMO:1"}]);
};load();
