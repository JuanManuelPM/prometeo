(()=>{'use strict';
if(window.__STUDY_FIRST_CLASS_V16)return;window.__STUDY_FIRST_CLASS_V16=true;

function inSession16(){try{return typeof view!=='undefined'&&view==='session'&&typeof room!=='undefined'&&!!room}catch{return false}}
function recording16(){try{return inSession16()&&typeof recLive!=='undefined'&&!!recLive}catch{return false}}
function provisional16(){try{return typeof previewText!=='undefined'&&!!String(previewText||'').trim()}catch{return false}}
function patch16(){
 if(!inSession16())return;
 const tech=document.querySelector('#transcriptTools13>span');if(tech)tech.textContent='audio continuo · solape seguro';
 const p=document.querySelector('#preview');if(p&&!recording16()&&!provisional16())p.textContent='audio continuo · respaldo local · transcripción en paralelo';
 const share=document.querySelector('#shareTranscript13');if(share)share.title='Crear una copia pública de la transcripción, sin acceso a la clase';
 const ai=document.querySelector('#openAI13');if(ai)ai.title='Abrir ChatGPT con una copia pública de esta transcripción';
 const fin=document.querySelector('#recFinish');if(fin)fin.title='Cerrar la grabación; lo pendiente puede seguir transcribiéndose';
 const br=document.querySelector('#recBreak');if(br)br.title='Pausar por recreo y continuar luego como una nueva parte';
}

let patchQueued16=false;function queue16(){if(patchQueued16)return;patchQueued16=true;requestAnimationFrame(()=>{patchQueued16=false;patch16()})}
const app16=document.querySelector('#app');if(app16)new MutationObserver(queue16).observe(app16,{childList:true,subtree:true});
setTimeout(patch16,40);setTimeout(patch16,300);

window.addEventListener('beforeunload',e=>{if(!recording16())return;e.preventDefault();e.returnValue=''});
document.addEventListener('click',e=>{
 const leave=e.target.closest?.('#backCourse,#globalBack');if(!leave||!recording16())return;
 if(!confirm('Esta compu está grabando la clase. ¿Salir igual y cortar la grabación?')){e.preventDefault();e.stopImmediatePropagation()}
},true);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-theme13]'))setTimeout(()=>document.querySelector('#themeSheet13')?.remove(),0)});
window.addEventListener('offline',()=>{if(recording16())try{toast('Sin red · el audio local sigue grabándose')}catch{}});
window.addEventListener('online',()=>{if(inSession16())try{toast('Conexión recuperada')}catch{}});

window.PrometeoFirstClassV16={patch:patch16,isRecording:recording16};
})();
