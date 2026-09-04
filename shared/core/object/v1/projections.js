(function(global){
  "use strict";
  const Core=global.PrometeoObject;
  if(!Core)throw new Error("PrometeoObject must load before projections");

  function temporal(object){
    const t=object?.capabilities?.temporal;if(!t)return null;
    return {
      objectId:object.id,
      type:object.type,
      title:object.title,
      status:object.status,
      start:t.start??null,
      end:t.end??null,
      date:t.date??null,
      duration:t.duration??null,
      allDay:!!t.allDay,
      recurrence:t.recurrence||null,
      timezone:t.timezone||null,
      visualIdentity:t.visualIdentity||null
    };
  }

  function financial(object){
    const f=object?.capabilities?.financial;if(!f)return null;
    const direction=f.direction==="out"?"out":"in";
    const amount=Number(f.amount??f.rate??0)||0;
    return {
      objectId:object.id,
      type:object.type,
      title:object.title,
      status:object.status,
      direction,
      amount,
      rate:Number(f.rate)||null,
      currency:f.currency||"ARS",
      certainty:f.certainty||"confirmed",
      category:f.category||null,
      recurrence:object.capabilities?.repeatable?.recurrence||object.capabilities?.temporal?.recurrence||null
    };
  }

  function actionable(object){
    const a=object?.capabilities?.actionable;if(!a)return null;
    return {
      objectId:object.id,
      type:object.type,
      title:object.title,
      status:object.status,
      nextAction:a.nextAction||null,
      due:a.due||object.capabilities?.temporal?.date||null,
      priority:a.priority||null,
      blockedBy:a.blockedBy||[]
    };
  }

  function relations(object){return (object?.relations||[]).map(r=>({...Core.clone(r),sourceId:object.id}))}

  function project(objects,kind){
    const fn={temporal,financial,actionable,relations}[kind];
    if(!fn)throw new Error(`unknown projection: ${kind}`);
    return (objects||[]).flatMap(object=>{
      const value=fn(object);
      if(value==null)return [];
      return Array.isArray(value)?value:[value];
    });
  }

  global.PrometeoProjections=Object.freeze({temporal,financial,actionable,relations,project});
})(window);
