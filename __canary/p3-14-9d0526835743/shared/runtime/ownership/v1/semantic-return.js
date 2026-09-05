/* Prometeo Semantic Return v1 — CANDIDATE
   Exact Back stores semantic identity first; pixels are advisory only.
*/
((global)=>{
  'use strict';
  if(global.PrometeoSemanticReturn)return;
  const clean=v=>v==null?null:String(v);
  function capture(input={}){
    const point={schema:'prometeo.semantic-return/v1',route:clean(input.route),branchId:clean(input.branchId),pageId:clean(input.pageId),itemId:clean(input.itemId),anchorId:clean(input.anchorId),focusId:clean(input.focusId),scrollOwnerId:clean(input.scrollOwnerId),scroll:{left:Number.isFinite(input.scrollLeft)?input.scrollLeft:null,top:Number.isFinite(input.scrollTop)?input.scrollTop:null},viewport:{width:Number.isFinite(input.viewportWidth)?input.viewportWidth:null,height:Number.isFinite(input.viewportHeight)?input.viewportHeight:null,orientation:clean(input.orientation)},capturedAt:input.capturedAt||new Date().toISOString()};
    if(!point.route&&!point.pageId)throw new Error('Semantic return requires route or pageId');
    return Object.freeze(point);
  }
  function plan(point,current={}){
    if(!point||point.schema!=='prometeo.semantic-return/v1')throw new Error('Invalid semantic return checkpoint');
    const actions=[];
    if(point.route&&point.route!==current.route)actions.push({type:'RESOLVE_ROUTE',key:point.route});
    if(point.branchId)actions.push({type:'RESOLVE_BRANCH',key:point.branchId});
    if(point.pageId)actions.push({type:'RESOLVE_PAGE',key:point.pageId});
    if(point.itemId)actions.push({type:'RESOLVE_ITEM',key:point.itemId});
    if(point.anchorId)actions.push({type:'RESOLVE_ANCHOR',key:point.anchorId});
    if(point.scrollOwnerId)actions.push({type:'RESTORE_SCROLL_OWNER',key:point.scrollOwnerId,advisoryScroll:point.scroll,sourceViewport:point.viewport});
    if(point.focusId)actions.push({type:'RESTORE_FOCUS',key:point.focusId});
    return Object.freeze(actions);
  }
  global.PrometeoSemanticReturn=Object.freeze({version:'1.0.0-candidate',capture,plan});
})(typeof globalThis!=='undefined'?globalThis:window);
