import fs from 'node:fs/promises';

const html=await fs.readFile('current-tree/live-v6/index.html','utf8');
const sb=html.match(/const SB='([^']+)'/)?.[1];
const key=html.match(/const KEY='([^']+)'/)?.[1];
if(!sb||!key)throw new Error('Live V6 public RPC config not found');

const RPCS={
  tree:'prometeo_current_tree_v2',
  organism:'prometeo_organism_projection_v1_1',
  historyMetrics:'prometeo_history_metrics_v1',
  contexts:'prometeo_work_contexts_projection_v1'
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const one=x=>Array.isArray(x)&&x.length===1?x[0]:x;

async function rpc(name){
  let last;
  for(let attempt=1;attempt<=5;attempt++){
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),10000);
    try{
      const r=await fetch(sb+name,{
        method:'POST',
        headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
        body:'{}',
        cache:'no-store',
        signal:ctrl.signal
      });
      if(!r.ok)throw new Error(name+' · RPC '+r.status);
      return one(await r.json());
    }catch(e){
      last=e;
      if(attempt<5)await sleep(1000*attempt);
    }finally{clearTimeout(timer)}
  }
  throw last||new Error(name+' · unavailable');
}

const entries=Object.entries(RPCS);
const values=await Promise.all(entries.map(([,name])=>rpc(name)));
const bundle={cached_at:new Date().toISOString()};
entries.forEach(([key],i)=>bundle[key]=values[i]);
if(!bundle.tree?.generated_at)throw new Error('snapshot missing tree.generated_at');

const out=process.argv[2]||'current-tree/live-v6/fallback.json';
await fs.writeFile(out,JSON.stringify(bundle,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',cached_at:bundle.cached_at,tree_generated_at:bundle.tree.generated_at,bytes:(await fs.stat(out)).size}));
