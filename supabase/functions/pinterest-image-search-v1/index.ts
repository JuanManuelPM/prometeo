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

function decodeEntities(raw:string){
  return raw
    .replace(/&quot;/g,'"')
    .replace(/&#34;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/&apos;/g,"'")
    .replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<")
    .replace(/&gt;/g,">");
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

function parseBingImageResults(raw:string){
  const html=cleanHtml(raw);
  const out:any[]=[];
  const seen=new Set<string>();

  for(const match of html.matchAll(/<a\b[^>]*>/gi)){
    const tag=match[0];
    if(!/\bclass=(["'])[^"']*\biusc\b[^"']*\1/i.test(tag)) continue;
    const meta=tag.match(/\bm=(["'])([\s\S]*?)\1/i);
    if(!meta) continue;

    try{
      const data=JSON.parse(decodeEntities(meta[2]));
      const image=String(data?.murl||"");
      const source=String(data?.purl||"");
      const thumb=String(data?.turl||"");
      const title=String(data?.t||data?.desc||"").trim();

      if(!/^https:\/\/i\.pinimg\.com\//i.test(image)) continue;
      if(source && !/^https:\/\/(?:www\.)?pinterest\.[^/]+\/pin\//i.test(source)) continue;

      const key=canonicalKey(image);
      if(seen.has(key)) continue;
      seen.add(key);

      out.push({
        image,
        source_url:source || "https://www.pinterest.com/",
        thumbnail:thumb,
        title
      });
    }catch{}
  }

  return out.sort((a,b)=>quality(b.image)-quality(a.image));
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

async function searchPinterest(query:string,limit:number){
  const pinterestUrl="https://www.pinterest.com/search/pins/?q="+encodeURIComponent(query)+"&rs=typed";
  const results:any[]=[];
  const seen=new Set<string>();

  // Bing's image-result metadata is much safer than scanning the page for any
  // pinimg URL: it couples the full image to its actual Pinterest Pin page.
  for(const first of [1,20,40]){
    if(results.length>=limit) break;
    try{
      const bing=new URL("https://www.bing.com/images/search");
      bing.searchParams.set("q",query+" site:pinterest.com/pin/");
      bing.searchParams.set("form","HDRSC3");
      bing.searchParams.set("first",String(first));
      bing.searchParams.set("count","35");
      const parsed=parseBingImageResults(await fetchText(bing.toString()));
      for(const item of parsed){
        const key=canonicalKey(item.image);
        if(seen.has(key)) continue;
        seen.add(key);
        results.push(item);
        if(results.length>=limit) break;
      }
    }catch{}
  }

  // Fallback: direct Pinterest search page, but only after structured Bing
  // results. It is intentionally lower-priority because Pinterest also serves
  // decorative pinimg assets that are not search-result Pins.
  if(results.length<limit){
    try{
      const direct=extractPinImages(await fetchText(pinterestUrl));
      for(const image of direct){
        const key=canonicalKey(image);
        if(seen.has(key)) continue;
        seen.add(key);
        results.push({image,source_url:pinterestUrl,title:""});
        if(results.length>=limit) break;
      }
    }catch{}
  }

  return {
    provider:results.some(x=>/\/pin\//.test(x.source_url))?"bing-pinterest-pins":"pinterest-fallback",
    source_url:pinterestUrl,
    results:results
      .slice(0,Math.max(1,Math.min(limit,20)))
      .map((item,index)=>({id:String(index+1),...item}))
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
