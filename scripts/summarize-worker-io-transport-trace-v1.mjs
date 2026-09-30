const ALLOWED_CLASSES=new Set(['READ','WRITE','WAIT','RETRY']);
const ALLOWED_OUTCOMES=new Set(['SUCCESS','FAILURE','CONFLICT','TIMEOUT','CANCELLED','UNKNOWN']);
const ALLOWED_COVERAGE=new Set(['COMPLETE_FOR_SCOPE','PARTIAL','UNAVAILABLE']);
const COUNTERS=['external_read_ops','external_write_ops','workflow_waits','retries'];

const fail=m=>{throw new Error(m)};
const unique=a=>[...new Set(a)];

const opMatches=(op,counter)=>{
  if(counter==='external_read_ops') return op.class==='READ'||(op.class==='RETRY'&&op.retry_of_class_or_null==='READ');
  if(counter==='external_write_ops') return op.class==='WRITE'||(op.class==='RETRY'&&op.retry_of_class_or_null==='WRITE');
  if(counter==='workflow_waits') return op.class==='WAIT'||(op.class==='RETRY'&&op.retry_of_class_or_null==='WAIT');
  if(counter==='retries') return op.class==='RETRY';
  return false;
};

export function validateTransportTrace(trace){
  if(!trace||trace.schema!=='prometeo.worker-io-transport-trace/v1') fail('trace: invalid schema');
  for(const k of ['trace_id','worker_id','unit_ref']) if(typeof trace[k]!=='string'||!trace[k].trim()) fail('trace: '+k+' required');
  if(!trace.scope||typeof trace.scope!=='object') fail('trace: scope required');
  for(const k of ['starts_after','ends_at']) if(typeof trace.scope[k]!=='string'||!trace.scope[k].trim()) fail('trace.scope: '+k+' required');
  if(!Array.isArray(trace.scope.included_external_target_families)) fail('trace.scope: included_external_target_families required');
  if(trace.scope.local_work_excluded!==true) fail('trace.scope: local_work_excluded must be true');
  if(!Array.isArray(trace.operations)) fail('trace: operations required');
  const ids=new Set();
  for(const op of trace.operations){
    if(!op||typeof op!=='object') fail('operation: object required');
    if(typeof op.operation_id!=='string'||!op.operation_id.trim()) fail('operation: operation_id required');
    if(ids.has(op.operation_id)) fail('operation: duplicate '+op.operation_id);
    ids.add(op.operation_id);
    if(!ALLOWED_CLASSES.has(op.class)) fail('operation '+op.operation_id+': invalid class');
    if(typeof op.external_target_family!=='string'||!op.external_target_family.trim()) fail('operation '+op.operation_id+': external_target_family required');
    if(!ALLOWED_OUTCOMES.has(op.outcome)) fail('operation '+op.operation_id+': invalid outcome');
    if(!Object.prototype.hasOwnProperty.call(op,'durable_evidence_or_null')) fail('operation '+op.operation_id+': durable_evidence_or_null required');
    if(op.durable_evidence_or_null!==null&&(typeof op.durable_evidence_or_null!=='string'||!op.durable_evidence_or_null.trim())) fail('operation '+op.operation_id+': invalid durable evidence');
    if(op.class==='RETRY'){
      if(typeof op.retry_of_operation_id_or_null!=='string'||!op.retry_of_operation_id_or_null.trim()) fail('operation '+op.operation_id+': RETRY needs retry_of_operation_id_or_null');
      if(!['READ','WRITE','WAIT'].includes(op.retry_of_class_or_null)) fail('operation '+op.operation_id+': RETRY needs retry_of_class_or_null');
    } else {
      if(op.retry_of_operation_id_or_null!==null&&op.retry_of_operation_id_or_null!==undefined) fail('operation '+op.operation_id+': non-RETRY cannot carry retry_of_operation_id');
      if(op.retry_of_class_or_null!==null&&op.retry_of_class_or_null!==undefined) fail('operation '+op.operation_id+': non-RETRY cannot carry retry_of_class');
    }
  }
  if(!trace.coverage||typeof trace.coverage!=='object') fail('trace: coverage required');
  for(const counter of COUNTERS){
    const row=trace.coverage[counter];
    if(!row||typeof row!=='object') fail(counter+': coverage row required');
    if(!ALLOWED_COVERAGE.has(row.status)) fail(counter+': invalid coverage status');
    if(!Array.isArray(row.coverage_evidence_refs)) fail(counter+': coverage_evidence_refs required');
    if(row.status==='COMPLETE_FOR_SCOPE'&&row.coverage_evidence_refs.length===0) fail(counter+': complete coverage requires evidence');
    if(row.status!=='COMPLETE_FOR_SCOPE'&&(typeof row.unknown_reason!=='string'||!row.unknown_reason.trim())) fail(counter+': incomplete coverage requires unknown_reason');
  }
  return true;
}

export function summarizeTransportTrace(trace){
  validateTransportTrace(trace);
  const externally_observed={};
  for(const counter of COUNTERS){
    const coverage=trace.coverage[counter];
    const matched=trace.operations.filter(op=>opMatches(op,counter));
    const traceRefs=matched.map(op=>'trace:'+trace.trace_id+'#operation:'+op.operation_id);
    const durableRefs=matched.map(op=>op.durable_evidence_or_null).filter(Boolean);
    const evidence_refs=unique([...traceRefs,...durableRefs]);
    if(coverage.status==='COMPLETE_FOR_SCOPE'){
      if(matched.length>0&&evidence_refs.length===0) fail(counter+': positive count lacks evidence');
      externally_observed[counter]={
        value:matched.length,
        coverage:'COMPLETE_FOR_SCOPE',
        evidence_refs,
        coverage_evidence_refs:[...coverage.coverage_evidence_refs]
      };
    }else{
      externally_observed[counter]={
        value:'UNKNOWN',
        coverage:coverage.status,
        evidence_refs,
        coverage_evidence_refs:[...coverage.coverage_evidence_refs],
        unknown_reason:coverage.unknown_reason
      };
      if(matched.length>0) externally_observed[counter].observed_minimum=matched.length;
    }
  }
  return {
    schema:'prometeo.worker-io-transport-summary/v1',
    trace_id:trace.trace_id,
    worker_id:trace.worker_id,
    unit_ref:trace.unit_ref,
    measurement_scope:trace.scope,
    externally_observed,
    local_work_events_persisted:0,
    truth_boundary:'Numeric transport counters require COMPLETE_FOR_SCOPE coverage; incomplete coverage stays UNKNOWN.'
  };
}
