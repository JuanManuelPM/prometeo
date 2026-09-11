(()=>{'use strict';
if(window.__STUDY_BB_PAIR_FIX_V2)return;window.__STUDY_BB_PAIR_FIX_V2=true;
const TOKEN_KEY='study_bb_workspace_token';
const PROBE='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-blackboard-probe-v1';
let extension=false,paired=false,pairing=false,lastPair=0,syncKicked=false;
const token=()=>localStorage.getItem(TOKEN_KEY)||'';
const send=(type,data={})=>window.postMessage({source:'prometeo-study-library',type,...data},'*');
const session=(()=>{const k='study_bb_probe_session';let v=sessionStorage.getItem(k);if(!v){v=(crypto.randomUUID?.()||String(Date.now())+Math.random());sessionStorage.setItem(k,v)}return v})();
async function probe(phase,extra={}){const t=token();if(!t)return;try{await fetch(PROBE,{method:'POST',headers:{'content-type':'application/json','x-study-token':t,'x-study-workspace':'colo-study'},body:JSON.stringify({phase,extension,paired,device_id:session,version:'pair-fix-v2',page:location.pathname,...extra}),cache:'no-store'})}catch{}}
function status(){send('PROMETEO_BB_STATUS')}
function pair(){
  const t=token();
  if(!t||!extension||paired||pairing)return;
  const now=Date.now();if(now-lastPair<1200)return;
  lastPair=now;pairing=true;probe('pair_requested');send('PROMETEO_BB_PAIR',{token:t});
  setTimeout(()=>{pairing=false;if(!paired)status()},3000);
}
function needsFreshSync(lastSync){if(!lastSync?.at)return true;const n=Number(lastSync.at);return !Number.isFinite(n)||Date.now()-n>5*60*1000}
function kickSync(reason,lastSync){if(!extension||!paired||syncKicked||!needsFreshSync(lastSync))return;syncKicked=true;probe('sync_requested',{reason});send('PROMETEO_BB_SYNC');setTimeout(()=>{syncKicked=false},15000)}
function maybeOpenLogin(result){if(!result?.needs_login)return;probe('needs_login',{result});if(sessionStorage.getItem('study_bb_opened_login'))return;sessionStorage.setItem('study_bb_opened_login','1');send('PROMETEO_BB_OPEN')}
window.addEventListener('message',e=>{
  const m=e.data;
  if(e.source!==window||!m||m.source!=='prometeo-blackboard-bridge')return;
  if(m.type==='PROMETEO_BB_READY'){
    extension=true;probe('extension_ready');
    setTimeout(()=>{status();pair()},30);
    return;
  }
  if(m.type==='PROMETEO_BB_STATUS_RESULT'){
    extension=true;paired=!!m.result?.paired;pairing=false;probe('status',{result:m.result||{}});
    if(token()&&!paired)setTimeout(pair,80);
    else if(paired)kickSync('status',m.result?.lastSync);
    return;
  }
  if(m.type==='PROMETEO_BB_RESULT'){
    extension=true;pairing=false;
    if(m.request==='pair')paired=true;
    probe(m.request==='pair'?'pair_result':m.request==='sync'?'sync_result':'bridge_result',{result:m.result||{state:m.error?'error':'unknown',error:m.error||''}});
    maybeOpenLogin(m.result);
    setTimeout(status,120);
  }
  if(m.type==='PROMETEO_BB_EVENT'){
    extension=true;
    const d=m.data||{};probe('event',{result:{ok:d.state==='ok',needs_login:d.state==='needs_login',state:d.state||'',error:d.error||'',pages:d.pages||0,courses:d.courses||0,items:d.items||0}});
    if(d.state==='needs_login')maybeOpenLogin({needs_login:true,state:d.state});
  }
});
setTimeout(()=>probe('host_loaded'),40);
[80,350,900,1800,3600].forEach(ms=>setTimeout(status,ms));
})();
