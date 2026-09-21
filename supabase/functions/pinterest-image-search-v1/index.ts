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
  if(url.includes("/originals/")) return 100;
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
  return [...byKey.values()];
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

async function searchPinterest(query:string,limit:number){
  const pinterestUrl="https://www.pinterest.com/search/pins/?q="+encodeURIComponent(query)+"&rs=typed";
  let images:string[]=[];
  let provider="pinterest";
  try{
    images=extractPinImages(await fetchText(pinterestUrl));
  }catch{}

  if(images.length<limit){
    provider=images.length?"pinterest+bing-index":"bing-index";
    try{
      const bing="https://www.bing.com/images/search?q="+encodeURIComponent(query+" site:pinterest.com");
      const fromBing=extractPinImages(await fetchText(bing));
      const seen=new Set(images.map(canonicalKey));
      for(const url of fromBing){
        const key=canonicalKey(url);
        if(!seen.has(key)){ seen.add(key); images.push(url); }
      }
    }catch{}
  }

  images=images
    .sort((a,b)=>quality(b)-quality(a))
    .slice(0,Math.max(1,Math.min(limit,20)));

  return {
    provider,
    source_url:pinterestUrl,
    results:images.map((image,index)=>({
      id:String(index+1),
      image,
      source_url:pinterestUrl
    }))
  };
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:CORS});
  if(req.method!=="GET") return json({ok:false,error:"METHOD_NOT_ALLOWED"},405);

  const url=new URL(req.url);
  if(url.searchParams.get("k")!==LAB_KEY) return json({ok:false,error:"UNAUTHORIZED"},401);

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
