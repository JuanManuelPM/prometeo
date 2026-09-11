(()=>{'use strict';
if(window.__STUDY_BB_PAIR_FIX_V1)return;window.__STUDY_BB_PAIR_FIX_V1=true;
const TOKEN_KEY='study_bb_workspace_token';
let extension=false,paired=false,pairing=false,lastPair=0;
const token=()=>localStorage.getItem(TOKEN_KEY)||'';
const send=(type,data={})=>window.postMessage({source:'prometeo-study-library',type,...data},'*');
function status(){send('PROMETEO_BB_STATUS')}
function pair(){
  const t=token();
  if(!t||!extension||paired||pairing)return;
  const now=Date.now();if(now-lastPair<1200)return;
  lastPair=now;pairing=true;send('PROMETEO_BB_PAIR',{token:t});
  setTimeout(()=>{pairing=false;if(!paired)status()},2600);
}
window.addEventListener('message',e=>{
  const m=e.data;
  if(e.source!==window||!m||m.source!=='prometeo-blackboard-bridge')return;
  if(m.type==='PROMETEO_BB_READY'){
    extension=true;
    setTimeout(()=>{status();pair()},30);
    return;
  }
  if(m.type==='PROMETEO_BB_STATUS_RESULT'){
    extension=true;paired=!!m.result?.paired;pairing=false;
    if(token()&&!paired)setTimeout(pair,80);
    return;
  }
  if(m.type==='PROMETEO_BB_RESULT'){
    extension=true;pairing=false;
    setTimeout(status,100);
  }
});
[80,350,900,1800,3600].forEach(ms=>setTimeout(status,ms));
})();
