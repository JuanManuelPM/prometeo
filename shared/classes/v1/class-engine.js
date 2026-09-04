/* Prometeo Classes Engine v1 — CANDIDATE
   Pure pedagogy/state engine. Content, theme and renderer are separate.
*/
((global)=>{
  'use strict';
  if(global.PrometeoClasses) return;
  const clone=v=>structuredClone(v);
  const now=()=>new Date().toISOString();

  function normalizeConfig(c){
    if(!c?.id) throw new Error('Class id required');
    const topics=(c.topics||[]).map((t,ti)=>({id:t.id||`topic-${ti+1}`,title:t.title||`Tema ${ti+1}`,theory:t.theory||[],exercises:(t.exercises||[]).map((e,ei)=>({id:e.id||`${t.id||`topic-${ti+1}`}-ex-${ei+1}`,required:e.required!==false,maxHints:e.maxHints??3,...e}))}));
    const ids=new Set(); topics.flatMap(t=>t.exercises).forEach(e=>{if(ids.has(e.id))throw new Error(`Duplicate exercise ${e.id}`);ids.add(e.id);});
    return Object.freeze({...clone(c),topics});
  }

  function initialState(config,seed={}){
    const exercises={};
    config.topics.flatMap(t=>t.exercises).forEach((e,i)=>{exercises[e.id]={status:i===0?'AVAILABLE':'LOCKED',attempts:0,hintsUsed:0,lastAnswer:null,correct:false,postponed:false,updatedAt:null};});
    const state={schema:'prometeo.class-state/v1',classId:config.id,studentId:seed.studentId||config.studentId||null,startedAt:seed.startedAt||null,updatedAt:null,currentExerciseId:seed.currentExerciseId||Object.keys(exercises)[0]||null,exercises,events:[],...clone(seed)};
    state.exercises={...exercises,...clone(seed.exercises||{})}; unlock(config,state); return state;
  }

  function flat(config){return config.topics.flatMap(t=>t.exercises);}
  function unlock(config,state){
    const list=flat(config);
    for(let i=0;i<list.length;i++){
      const e=list[i],s=state.exercises[e.id]; if(!s)continue;
      if(i===0){if(s.status==='LOCKED')s.status='AVAILABLE';continue;}
      const prev=state.exercises[list[i-1].id];
      if((prev?.correct||prev?.postponed)&&s.status==='LOCKED')s.status='AVAILABLE';
    }
  }
  function record(state,type,payload={}){state.updatedAt=now();state.events.push({seq:state.events.length+1,type,at:state.updatedAt,...clone(payload)});}
  function answerMatches(e,answer){
    if(typeof e.check==='function') return !!e.check(answer);
    const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
    if(Array.isArray(e.correctAnswer)) return e.correctAnswer.map(norm).includes(norm(answer));
    return norm(answer)===norm(e.correctAnswer);
  }
  function reduce(config,state,action){
    const next=clone(state); const e=flat(config).find(x=>x.id===(action.exerciseId||next.currentExerciseId));
    if(!e&&action.type!=='START') throw new Error('Exercise not found');
    const s=e?next.exercises[e.id]:null;
    switch(action.type){
      case 'START': next.startedAt=next.startedAt||now(); record(next,'CLASS_STARTED'); break;
      case 'FOCUS': if(next.exercises[action.exerciseId]?.status==='LOCKED')throw new Error('Exercise locked'); next.currentExerciseId=action.exerciseId; record(next,'EXERCISE_FOCUSED',{exerciseId:action.exerciseId}); break;
      case 'ANSWER': {
        if(s.status==='LOCKED')throw new Error('Exercise locked'); s.attempts++; s.lastAnswer=action.answer; s.correct=answerMatches(e,action.answer); s.status=s.correct?'DONE':'AVAILABLE'; s.updatedAt=now(); record(next,s.correct?'ANSWER_CORRECT':'ANSWER_INCORRECT',{exerciseId:e.id,attempt:s.attempts});
        if(s.correct){const list=flat(config),idx=list.findIndex(x=>x.id===e.id),n=list[idx+1]; if(n){next.exercises[n.id].status='AVAILABLE'; next.currentExerciseId=n.id;}}
        break;
      }
      case 'HINT': if(s.status==='LOCKED')throw new Error('Exercise locked'); s.hintsUsed=Math.min(e.maxHints,s.hintsUsed+1); record(next,'HINT_USED',{exerciseId:e.id,level:s.hintsUsed}); break;
      case 'POSTPONE': s.postponed=true; if(s.status==='LOCKED')s.status='AVAILABLE'; record(next,'EXERCISE_POSTPONED',{exerciseId:e.id}); {const list=flat(config),idx=list.findIndex(x=>x.id===e.id),n=list[idx+1]; if(n){next.exercises[n.id].status='AVAILABLE';next.currentExerciseId=n.id;}} break;
      case 'RESET_EXERCISE': next.exercises[e.id]={status:'AVAILABLE',attempts:0,hintsUsed:0,lastAnswer:null,correct:false,postponed:false,updatedAt:now()}; record(next,'EXERCISE_RESET',{exerciseId:e.id}); break;
      default: throw new Error(`Unknown class action ${action.type}`);
    }
    unlock(config,next); return next;
  }
  function progress(config,state){const list=flat(config).filter(e=>e.required!==false);const done=list.filter(e=>state.exercises[e.id]?.correct).length;return {done,total:list.length,ratio:list.length?done/list.length:1};}
  function create(configInput,seed={}){
    const config=normalizeConfig(configInput); let state=initialState(config,seed); const listeners=new Set();
    const api={config,getState:()=>clone(state),dispatch:a=>{state=reduce(config,state,a);listeners.forEach(fn=>fn(clone(state),a));return clone(state);},progress:()=>progress(config,state),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};
    return Object.freeze(api);
  }
  global.PrometeoClasses=Object.freeze({version:'1.0.0-candidate',create,normalizeConfig,initialState,reduce,progress});
})(typeof globalThis!=='undefined'?globalThis:window);
