(function(global){
  'use strict';

  var cache={index:null,projects:Object.create(null),lastCheck:null};

  function config(){
    return global.PROMETEO_CONTROL_CONFIG_V1||{};
  }

  function uniq(values){
    var seen=Object.create(null),out=[];
    values.forEach(function(value){
      if(!value||seen[value])return;
      seen[value]=true;out.push(value);
    });
    return out;
  }

  function upperIndexVariant(url){
    return typeof url==='string'&&/\/index\.json(?:[?#].*)?$/i.test(url)
      ? url.replace(/\/index\.json(?=([?#].*)?$)/i,'/INDEX.json')
      : null;
  }

  function indexCandidates(){
    var c=config();
    var raw=(c.githubRawBase||'')+'coordination/project-context-v1/INDEX.json';
    var pages=(c.githubPagesBase||'')+'coordination/project-context-v1/INDEX.json';
    return uniq([c.projectContextUrl,upperIndexVariant(c.projectContextUrl),raw,pages]);
  }

  function projectCandidates(ref){
    var c=config();
    return uniq([
      c.githubRawBase?c.githubRawBase+ref:null,
      c.githubPagesBase?c.githubPagesBase+ref:null
    ]);
  }

  function validIndex(value){
    return !!(value&&
      value.schema==='prometeo.project-context-index/v1'&&
      value.projection_status==='NON_AUTHORITATIVE_PROJECTION'&&
      typeof value.authority_boundary==='string'&&
      Array.isArray(value.projects));
  }

  function validProject(value,id){
    return !!(value&&
      value.schema==='prometeo.project-context/v1'&&
      value.projection_status==='NON_AUTHORITATIVE_PROJECTION'&&
      value.project_id===id&&
      value.owner_refs&&
      typeof value.owner_refs.state==='string'&&
      value.freshness);
  }

  async function fetchJson(url){
    var response=await global.fetch(url,{method:'GET',cache:'no-store',credentials:'omit'});
    if(!response.ok)throw new Error('HTTP_'+response.status);
    return response.json();
  }

  async function firstValid(urls,validator){
    var errors=[];
    for(var i=0;i<urls.length;i++){
      var url=urls[i];
      try{
        var value=await fetchJson(url);
        if(!validator(value))throw new Error('INVALID_PROJECTION');
        return {value:value,url:url,errors:errors};
      }catch(error){
        errors.push({url:url,error:String(error&&error.message||error)});
      }
    }
    return {value:null,url:null,errors:errors};
  }

  async function loadIndex(){
    var checkedAt=new Date().toISOString();
    var result=await firstValid(indexCandidates(),validIndex);
    cache.lastCheck={checked_at:checkedAt,index_url:result.url,errors:result.errors};
    if(!result.value){
      return {
        status:'UNAVAILABLE',
        checked_at:checkedAt,
        observed_at:null,
        authority:'NON_AUTHORITATIVE_PROJECTION',
        source_url:null,
        errors:result.errors,
        data:null
      };
    }
    cache.index=result.value;
    return {
      status:'OK',
      checked_at:checkedAt,
      observed_at:result.value.compiled_at||null,
      authority:'NON_AUTHORITATIVE_PROJECTION',
      source_url:result.url,
      errors:result.errors,
      data:result.value
    };
  }

  async function loadProject(projectId){
    var id=String(projectId||'').trim();
    if(!id)return {status:'INVALID_ARGUMENT',project_id:id,data:null};
    var indexResult=cache.index
      ? {status:'OK',data:cache.index,source_url:cache.lastCheck&&cache.lastCheck.index_url,errors:[]}
      : await loadIndex();
    if(indexResult.status!=='OK')return {
      status:'INDEX_UNAVAILABLE',
      project_id:id,
      data:null,
      index:indexResult
    };
    var entry=indexResult.data.projects.find(function(item){return item&&item.project_id===id;});
    if(!entry||!entry.context_ref)return {status:'NOT_FOUND',project_id:id,data:null};
    var result=await firstValid(projectCandidates(entry.context_ref),function(value){return validProject(value,id);});
    var checkedAt=new Date().toISOString();
    if(!result.value)return {
      status:'UNAVAILABLE',
      project_id:id,
      checked_at:checkedAt,
      observed_at:entry.source_updated_at||null,
      authority:'NON_AUTHORITATIVE_PROJECTION',
      source_ref:entry.source_ref||null,
      errors:result.errors,
      data:null
    };
    cache.projects[id]=result.value;
    return {
      status:'OK',
      project_id:id,
      checked_at:checkedAt,
      observed_at:result.value.freshness.source_updated_at||null,
      authority:'NON_AUTHORITATIVE_PROJECTION',
      source_url:result.url,
      source_ref:result.value.owner_refs.state,
      errors:result.errors,
      data:result.value
    };
  }

  function readCache(projectId){
    if(projectId){
      return cache.projects[String(projectId)]||null;
    }
    return {index:cache.index,projects:Object.assign({},cache.projects),lastCheck:cache.lastCheck};
  }

  global.PROMETEO_PROJECT_CONTEXT_V1=Object.freeze({
    loadIndex:loadIndex,
    loadProject:loadProject,
    readCache:readCache,
    indexCandidates:indexCandidates
  });
})(window);
