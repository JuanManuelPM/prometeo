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

function canonicalKey(url:string){
  try{
    const u=new URL(url);
    const bits=u.pathname.split("/").filter(Boolean);
    if(bits.length<2)return url;
    if(/^(originals|\d+x|\d+x\d+)$/.test(bits[0])) bits.shift();
    return bits.join("/");
  }catch{return url}
}

async function fetchPinterestJson(url:string){
  const r=await fetch(url,{
    headers:{
      "User-Agent":UA,
      "Accept":"application/json, text/javascript, */*, q=0.01",
      "X-Requested-With":"XMLHttpRequest",
      "X-Pinterest-AppState":"active",
      "X-Pinterest-Source-Url":"/ideas/",
      "X-Pinterest-PWS-Handler":"www/ideas.js"
    },
    redirect:"follow",
    signal:AbortSignal.timeout(15000)
  });
  if(!r.ok) throw new Error("PINTEREST_HTTP_"+r.status);
  return await r.json();
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

function extractPinImages(raw:string){
  const html=raw
    .replace(/\\u002F/gi,"/")
    .replace(/\\u0026/gi,"&")
    .replace(/\\u003D/gi,"=")
    .replace(/\\\//g,"/")
    .replace(/&amp;/g,"&");
  const re=/https:\/\/i\.pinimg\.com\/(?:originals|\d+x|\d+x\d+)\/[A-Za-z0-9_./%~-]+?\.(?:jpg|jpeg|png|webp)/gi;
  const seen=new Set<string>();
  const out:string[]=[];
  for(const match of html.matchAll(re)){
    const url=match[0].replace(/[),.;]+$/,"");
    const key=canonicalKey(url);
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

async function resolvePin(id:string){
  const pinUrl="https://www.pinterest.com/pin/"+id+"/";
  try{
    const oembed=await fetchJson("https://www.pinterest.com/oembed.json?url="+encodeURIComponent(pinUrl)) as any;
    const thumb=String(oembed?.thumbnail_url||"");
    if(/^https:\/\/i\.pinimg\.com\//.test(thumb)){
      return {id,image:thumb,source_url:pinUrl,title:String(oembed?.title||"")};
    }
  }catch{}

  try{
    const images=extractPinImages(await fetchText(pinUrl));
    if(images[0]) return {id,image:images[0],source_url:pinUrl,title:""};
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

function pinTitle(pin:any){
  const title=String(pin?.title||pin?.grid_title||"").trim();
  if(title.length>=3) return title;
  const visual=pin?.pin_join?.visual_annotation;
  if(Array.isArray(visual)&&visual[0]) return String(visual[0]);
  return String(pin?.name||pin?.auto_alt_text||"").trim();
}

async function pinterestSearchPage(query:string,bookmark:string|null){
  const payload={
    options:{
      query,
      bookmarks:[bookmark||""]
    },
    context:{}
  };
  const u=new URL("https://www.pinterest.com/resource/BaseSearchResource/get/");
  u.searchParams.set("data",JSON.stringify(payload));
  const body:any=await fetchPinterestJson(u.toString());
  const rr=body?.resource_response||{};
  if(rr.status && rr.status!=="success") throw new Error("PINTEREST_"+String(rr.status).toUpperCase());
  const raw=Array.isArray(rr?.data?.results)?rr.data.results:[];
  const results=raw
    .filter((pin:any)=>pin?.type!=="story")
    .map((pin:any)=>{
      const image=String(pin?.images?.orig?.url||"");
      if(!/^https:\/\/i\.pinimg\.com\//.test(image)) return null;
      const id=String(pin?.id||"").trim();
      if(!id) return null;
      return {
        id,
        image,
        source_url:"https://www.pinterest.com/pin/"+id+"/",
        title:pinTitle(pin),
        width:Number(pin?.images?.orig?.width||0),
        height:Number(pin?.images?.orig?.height||0)
      };
    })
    .filter(Boolean);
  return {results,bookmark:String(rr?.bookmark||"")};
}

async function searchPinterest(query:string,limit:number){
  const wanted=Math.max(1,Math.min(limit,20));
  const results:any[]=[];
  const seen=new Set<string>();
  let bookmark:string|null=null;

  for(let page=0;page<2 && results.length<wanted;page++){
    const batch=await pinterestSearchPage(query,bookmark);
    for(const item of batch.results){
      const key=canonicalKey(item.image);
      if(seen.has(key)) continue;
      seen.add(key);
      results.push(item);
      if(results.length>=wanted) break;
    }
    if(!batch.bookmark || batch.bookmark===bookmark) break;
    bookmark=batch.bookmark;
  }

  return {
    provider:"pinterest-native-search",
    source_url:"https://www.pinterest.com/search/pins/?q="+encodeURIComponent(query),
    results:results.slice(0,wanted)
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
