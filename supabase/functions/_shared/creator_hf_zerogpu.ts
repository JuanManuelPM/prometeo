export async function getHfZeroGpuToken(db:any,ownerId:string):Promise<string>{
  try{
    const {data,error}=await db.from('creator_provider_connections')
      .select('provider,mode,vault_secret_id,verified_at')
      .eq('owner_id',ownerId).eq('kind','media')
      .in('provider',['huggingface_zerogpu','huggingface']);
    if(error)return '';
    const rows=(data||[]).filter((x:any)=>x.mode==='VERIFIED_REAL'&&x.vault_secret_id);
    const conn=rows.find((x:any)=>x.provider==='huggingface_zerogpu')||rows.find((x:any)=>x.provider==='huggingface');
    if(!conn)return '';
    const {data:raw,error:ve}=await db.rpc('creator_vault_read',{p_secret_id:conn.vault_secret_id});
    if(ve||!raw)return '';
    try{const x=JSON.parse(String(raw));return String(x.token||x.api_token||'').trim()}catch{return String(raw).trim()}
  }catch{return ''}
}

export function hfHeaders(token:string,base:Record<string,string>={}):Record<string,string>{
  return token?{...base,Authorization:`Bearer ${token}`}:{...base};
}
