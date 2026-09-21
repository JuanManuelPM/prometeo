import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS={
  "Access-Control-Allow-Origin":"https://juanmanuelpm.github.io",
  "Access-Control-Allow-Headers":"content-type, x-prometeo-lab",
  "Access-Control-Allow-Methods":"GET,OPTIONS",
  "Cache-Control":"public, max-age=300"
};

const LAB_KEY="pql-v1-7f2b9e31";
const UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8"}});
}

function cleanHtml(raw:string){
  return raw
    .replace(/\\u002F/gi,"/")
    .replace(/\\u0026/gi,"&")
    .replace(/\\u003D/gi,"=")
    .replace(/\\\//g,"/")
    .replace(/&amp;/g,"&");
}

function canonicalKey(url:string){
  try{
    const u=new URL(url);
    const bits=u.pathname.split("/").filter(Boolean);
    if(bits.length<2)return url;
    if(/^(originals|\d+x|\d+x\d+)$/.test(bits[0])) bits.shift();
    return bits.join("/");
  }catch{return url}
}

function quality(url:string){
  if(url.includes("/originals/")) return 10000;
  const m=url.match(/\/(\d+)x(?:\d+)?\//);
  return m?Number(m[1]):0;
}

function extractPinImages(raw:string){
  const html=cleanHtml(raw);
  const re=/https:\/\/i\.pinimg\.com\/(?:originals|\d+x|\d+x\d+)\/[A-Za-z0-9_./%~-]+?\.(?:jpg|jpeg|png|webp)/gi;
  const byKey=new Map<string,string>();
  for(const match of html.matchAll(re)){
    const url=match[0].replace(/[),.;]+$/,"");
    if(/\/(?:30x30|60x60|75x75|90x90|100x100|140x140|170x)\//.test(url)) continue;
    const key=canonicalKey(url);
    const prev=byKey.get(key);
    if(!prev || quality(url)>quality(prev)) byKey.set(key,url);
  }
  return [...byKey.values()].sort((a,b)=>quality(b)-quality(a));
}

async function fetchText(url:string){
  const r=await fetch(url,{
    headers:{
      "User-Agent":UA,
      "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language":"en-US,en;q=0.9,es;q=0.7"
    },
    redirect:"follow",
    signal:AbortSignal.timeout(12000)
  });
  if(!r.ok) throw new Error("HTTP_"+r.status);
  return await r.text();
}

async function fetchJson(url:string){
  const r=await fetch(url,{
    headers:{
      "User-Agent":UA,
      "Accept":"application/json,text/plain,*/*",
      "Accept-Language":"en-US,en;q=0.9,es;q=0.7"
    },
    redirect:"follow",
    signal:AbortSignal.timeout(12000)
  });
  if(!r.ok) throw new Error("HTTP_"+r.status);
  return await r.json();
}

async function resolvePin(id:string){
  const pinUrl="https://www.pinterest.com/pin/"+id+"/";
  try{
    const oembed=await fetchJson("https://www.pinterest.com/oembed.json?url="+encodeURIComponent(pinUrl)) as any;
    const thumb=String(oembed?.thumbnail_url||"");
    if(/^https:\/\/i\.pinimg\.com\//.test(thumb)){
      return {id,image:thumb,source_url:pinUrl};
    }
  }catch{}

  try{
    const images=extractPinImages(await fetchText(pinUrl));
    if(images[0]) return {id,image:images[0],source_url:pinUrl};
  }catch{}

  return null;
}

async function resolvePins(ids:string[]){
  const settled=await Promise.allSettled(ids.slice(0,12).map(resolvePin));
  const results=settled
    .map((x)=>x.status==="fulfilled"?x.value:null)
    .filter(Boolean);
  return {provider:"pinterest-pin",results};
}

function mergeUrls(target:string[], incoming:string[]){
  const seen=new Set(target.map(canonicalKey));
  for(const url of incoming){
    const key=canonicalKey(url);
    if(!seen.has(key)){ seen.add(key); target.push(url); }
  }
}

async function searchPinterest(query:string,limit:number){
  const pinterestUrl="https://www.pinterest.com/search/pins/?q="+encodeURIComponent(query)+"&rs=typed";
  const sources=[
    pinterestUrl,
    "https://www.bing.com/images/search?q="+encodeURIComponent(query+" site:pinterest.com"),
    "https://www.bing.com/images/search?q="+encodeURIComponent('"'+query+'" pinterest'),
    "https://www.google.com/search?tbm=isch&q="+encodeURIComponent(query+" site:pinterest.com"),
    "https://www.google.com/search?udm=2&q="+encodeURIComponent(query+" pinterest")
  ];

  const images:string[]=[];
  const providers:string[]=[];

  for(const source of sources){
    if(images.length>=limit) break;
    try{
      const found=extractPinImages(await fetchText(source));
      if(found.length){
        mergeUrls(images,found);
        if(source.includes("pinterest.com/search")) providers.push("pinterest");
        else if(source.includes("bing.com")) providers.push("bing-index");
        else providers.push("google-index");
      }
    }catch{}
  }

  const results=images
    .sort((a,b)=>quality(b)-quality(a))
    .slice(0,Math.max(1,Math.min(limit,20)))
    .map((image,index)=>({id:String(index+1),image,source_url:pinterestUrl}));

  return {
    provider:[...new Set(providers)].join("+")||"unavailable",
    source_url:pinterestUrl,
    results
  };
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:CORS});
  if(req.method!=="GET") return json({ok:false,error:"METHOD_NOT_ALLOWED"},405);

  const url=new URL(req.url);
  if(url.searchParams.get("k")!==LAB_KEY) return json({ok:false,error:"UNAUTHORIZED"},401);

  const pins=(url.searchParams.get("pins")||"")
    .split(",")
    .map(x=>x.trim())
    .filter(x=>/^\d{8,20}$/.test(x))
    .slice(0,12);

  if(pins.length){
    const resolved=await resolvePins(pins);
    if(!resolved.results.length) return json({ok:false,error:"PINS_UNRESOLVED",...resolved},404);
    return json({ok:true,query:null,...resolved});
  }

  const q=(url.searchParams.get("q")||"").trim().replace(/\s+/g," ").slice(0,120);
  const limit=Math.max(1,Math.min(Number(url.searchParams.get("limit")||"10")||10,20));
  if(!q) return json({ok:false,error:"QUERY_REQUIRED"},400);

  try{
    const found=await searchPinterest(q,limit);
    if(!found.results.length) return json({ok:false,error:"NO_RESULTS",query:q,...found},404);
    return json({ok:true,query:q,...found});
  }catch(error){
    return json({ok:false,error:String((error as Error)?.message||error),query:q},502);
  }
});
