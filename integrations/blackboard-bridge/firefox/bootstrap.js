const bbBootApi=typeof browser!=='undefined'?browser:chrome;
function bbWakeStudyLibrary(){
  bbBootApi.tabs.query({url:'https://juanmanuelpm.github.io/prometeo/pages/study-library/*'}).then(tabs=>{
    if(tabs?.length){for(const t of tabs)if(t.id!=null)bbBootApi.tabs.reload(t.id).catch(()=>{})}
    else bbBootApi.tabs.create({url:'https://juanmanuelpm.github.io/prometeo/pages/study-library/'}).catch(()=>{});
  }).catch(()=>{});
}
bbBootApi.runtime.onInstalled.addListener(()=>setTimeout(bbWakeStudyLibrary,500));
setTimeout(bbWakeStudyLibrary,1200);
