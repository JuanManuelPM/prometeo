window.PROMETEO_CONTROL_CONFIG_V1=Object.freeze({
  version:'PROMETEO_CONTROL_CONFIG_V1',
  rpcBase:'https://catnohyouxqjjtseaueb.supabase.co/rest/v1/rpc/',
  anonKey:'sb_publishable_eqh3PngXs4UjLLWiY3pz1w_nhHtf7X-',
  catalogUrl:'../../catalog/CATALOG_MANIFEST.json',
  legacyCatalogUrl:'../control-v8/catalog.json',
  pageChangeEndpoint:'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-change-loop-v1',
  pageChangeCanaryUrl:'../../coordination/canaries/page-change-pipeline-v1/latest.json',
  pageChangeDiagnosisUrl:'../../coordination/canaries/page-change-pipeline-v1/control-plane-diagnosis-latest.json',

  // PROMETEO-MP10-01 candidate sources. V11 remains CANDIDATE and RPC stays available.
  sourceMode:'auto',
  sourcePreference:Object.freeze(['rpc','github','last-good']),
  githubRawBase:'https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/',
  githubPagesBase:'https://juanmanuelpm.github.io/prometeo/',
  continuityStateUrl:'https://juanmanuelpm.github.io/prometeo/live/runtime.json',
  claimFrontierUrl:'https://juanmanuelpm.github.io/prometeo/live/claim-frontier.json',
  previewManifestUrl:'./previews/manifest.json',
  resultProjectionUrl:'./result-candidate-v1.json',
  g05VerificationUrl:'../../coordination/goal-progress/G05_VERIFICATION.json',
  statsUrl:'../../coordination/analytics/control-room-stats-v1/latest.json',
  projectContextUrl:'../../coordination/project-context-v1/INDEX.json',
  chatSessionsUrl:'../../coordination/chat-sessions/INDEX.json',
  chatRecoveryUrl:'../../coordination/chat-recovery/INDEX.json',
  chatRecoveryLineageUrl:'../../coordination/chat-recovery/LINEAGE.json',
  capabilityGraphUrl:'../../coordination/semantic-relations/CAPABILITY_GRAPH_V1.json',
  storageMode:'auto'
});

// Semantic notes URLs can be evaluated before the async catalog has populated V11's
// page map. Once the requested card is rendered, invoke the card's existing Notes owner
// instead of inventing a second routing implementation. Result routes stay on popstate.
window.addEventListener('PROMETEO_V11_DATA',()=>{
  const url=new URL(location.href);
  const pageId=url.searchParams.get('page');
  const panel=url.searchParams.get('panel');
  if(!pageId||!['notes','result'].includes(panel))return;
  const deadline=Date.now()+5000;
  const wake=()=>{
    const button=document.querySelector('[data-notes="'+CSS.escape(pageId)+'"]');
    if(button){
      if(panel==='notes')button.click();
      else window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
    if(Date.now()<deadline)setTimeout(wake,50);
  };
  setTimeout(wake,0);
});

// served-verification-trigger: wc-20261001T222735Z-2a198c54df16 / G000001 / 2026-10-01T22:47Z
