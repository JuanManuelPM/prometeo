((global)=>{
 'use strict';if(global.PrometeoOperatorView)return;
 function project({currentGraph,pending,catalog}){
  const visible=currentGraph?.pointers?.visible_frontend_current?.artifact_id||null;
  return Object.freeze({
   schema:'prometeo.operator-view/v1',
   frontend:visible,
   pages:(catalog?.pages||[]).map(p=>({id:p.page_id,title:p.title||p.page_id,href:p.href})),
   pending:(pending?.items||[]).filter(x=>!['COMPLETE','ARCHIVED'].includes(x.state)).map(x=>({id:x.id,title:x.title,state:x.state,next:x.next_action})),
   actions:['OPEN_PAGE','SEARCH','USE','REQUEST_CHANGE','CREATE','BACK']
  });
 }
 global.PrometeoOperatorView=Object.freeze({version:'1.0.0-candidate',project});
})(typeof globalThis!=='undefined'?globalThis:window);
