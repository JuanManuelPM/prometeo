// Prometeo · regresión antideriva. Contract test, NOT a deployed router/LLM evaluator.
// Ejecutar: node tv/chat/relevo/tests/priority-drift-regression.mjs
// Los intentos (TASK / STRATEGIC_OVERRIDE / RETURN / TEMP_FOCUS) son etiquetas semánticas
// dadas por el evaluador. Clasificar lenguaje natural sigue siendo NO VERIFICADO.
function decide(state, request) {
  const next={...state, history:[...state.history]};
  if (request.intent === "STRATEGIC_OVERRIDE" &&
      request.speaker === "human" && request.explicit === true &&
      request.scope === "global" && typeof request.target === "string" &&
      request.target.trim() && request.target !== state.mission) {
    next.history.push({from:state.mission,to:request.target,why:request.reason||"explicit human decision"});
    next.mission=request.target;
    return {state:next,action:"ACK_STRATEGIC_CHANGE"};
  }
  if (request.intent === "RETURN") return {state:next,action:"ADVANCE:"+state.mission};
  if (request.intent === "TASK" || request.intent === "TEMP_FOCUS")
    return {state:next,action:"EXECUTE:"+request.project};
  return {state:next,action:"REVIEW_WITHOUT_REPRIORITIZING"};
}
function runPriorityRegressions(anchors=null) {
  const mission="PERSISTENCE", initial={mission,history:[]}, results=[];
  function check(id,condition){results.push({id,pass:!!condition});}
  const game=decide(initial,{intent:"TASK",speaker:"human",project:"EMBLEM-001"});
  check("DRIFT-2 game task executes without mission mutation",game.action==="EXECUTE:EMBLEM-001" && game.state.mission===mission);
  const study=decide(initial,{intent:"TASK",speaker:"human",project:"facultad"});
  check("FACULTAD requested work is honored",study.action==="EXECUTE:facultad" && study.state.mission===mission);
  const tv=decide(initial,{intent:"TASK",speaker:"human",project:"tv"});
  check("TV quick request is honored",tv.action==="EXECUTE:tv" && tv.state.mission===mission);
  const returned=decide(initial,{intent:"RETURN",speaker:"human"});
  check("DRIFT-1 where next returns persistent mission",returned.action==="ADVANCE:PERSISTENCE");
  const temporary=decide(initial,{intent:"TEMP_FOCUS",speaker:"human",project:"EMBLEM-001"});
  check("Temporary focus does not silently promote",temporary.state.mission===mission && temporary.action==="EXECUTE:EMBLEM-001");
  const quoted=decide(initial,{intent:"STRATEGIC_OVERRIDE",speaker:"quotation",explicit:true,scope:"global",target:"GAME"});
  check("Quoted override is not an instruction",quoted.state.mission===mission);
  const assistant=decide(initial,{intent:"STRATEGIC_OVERRIDE",speaker:"assistant",explicit:true,scope:"global",target:"GAME"});
  check("Assistant proposal cannot unilaterally replace mission",assistant.state.mission===mission);
  const vague=decide(initial,{intent:"STRATEGIC_OVERRIDE",speaker:"human",explicit:false,scope:"global",target:"GAME"});
  check("Underspecified directive does not silently promote",vague.state.mission===mission);
  const local=decide(initial,{intent:"STRATEGIC_OVERRIDE",speaker:"human",explicit:true,scope:"project",target:"GAME"});
  check("Project scope cannot change global mission",local.state.mission===mission);
  const missing=decide(initial,{intent:"STRATEGIC_OVERRIDE",speaker:"human",explicit:true,scope:"global"});
  check("Missing replacement target cannot erase mission",missing.state.mission===mission);
  const changed=decide(initial,{intent:"STRATEGIC_OVERRIDE",speaker:"human",explicit:true,scope:"global",target:"GAME",reason:"explicit reprioritization"});
  check("Explicit global human override is respected",changed.state.mission==="GAME" && changed.state.history.length===1);
  const restored=decide(changed.state,{intent:"STRATEGIC_OVERRIDE",speaker:"human",explicit:true,scope:"global",target:"PERSISTENCE",reason:"explicit restoration"});
  check("Override can be reversed with audit lineage",restored.state.mission===mission && restored.state.history.length===2 && restored.state.history[0].from===mission);
  const seq=["EMBLEM-001","facultad","tv"].reduce((s,project)=>decide(s,{intent:"TASK",speaker:"human",project}).state,initial);
  check("Multiple recent tasks cannot rewrite global mission",seq.mission===mission && seq.history.length===0);
  const naive_mission="EMBLEM-001"; // baseline recency heuristic: last task wrongly becomes global mission
  check("Naive recency baseline reproduces documented failure",naive_mission!==mission && game.state.mission!==naive_mission);
  if(anchors) {
    check("LIVE owner has at least one registered earlier hop",anchors.last_hop>=1 && anchors.history_count===anchors.last_hop);
    check("LIVE next mission points to persistence",anchors.primary_mission_id==="PERSISTENCE-HOP-NEXT");
    check("LIVE game remains secondary",anchors.secondary_project==="EMBLEM-001" && anchors.secondary_priority==="OPTIONAL_SECONDARY");
  }
  return {pass:results.every(x=>x.pass),passed:results.filter(x=>x.pass).length,total:results.length,results,scope:"deterministic decision-contract only; NO free-text NLP, deployed runtime, or independent chat test"};
}
if (typeof process!=="undefined" && process.versions?.node) {
  const report=runPriorityRegressions();
  console.log(JSON.stringify(report,null,2));
  if(!report.pass) process.exitCode=1;
}
