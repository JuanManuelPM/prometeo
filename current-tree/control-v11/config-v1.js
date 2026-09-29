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
  storageMode:'auto'
});
