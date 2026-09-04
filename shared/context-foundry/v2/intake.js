((global)=>{
 'use strict';if(global.PrometeoContextIntakeV2)return;
 const VALID_PRIVACY=new Set(['PUBLIC','PROJECT','LOCAL']);
 function fail(code,msg){const e=new Error(msg);e.code=code;throw e}
 function normalize(input,{defaultPrivacy='LOCAL'}={}){
   if(!input?.id)fail('PROMETEO_RAW_ID','Raw record id required');
   const privacy=input.privacy||defaultPrivacy;if(!VALID_PRIVACY.has(privacy))fail('PROMETEO_RAW_PRIVACY','Invalid raw privacy');
   return Object.freeze({schema:'prometeo.raw-record/v1',authority:'RAW_UNCURATED',captured_at:new Date().toISOString(),...structuredClone(input),privacy});
 }
 function validate(record){
   if(record?.schema!=='prometeo.raw-record/v1'||record.authority!=='RAW_UNCURATED')fail('PROMETEO_RAW_SCHEMA','Invalid raw record');
   if(!VALID_PRIVACY.has(record.privacy))fail('PROMETEO_RAW_PRIVACY','Invalid raw privacy');
   if(!record.source_ref)fail('PROMETEO_RAW_SOURCE','Raw record source required');
   return {ok:true,id:record.id};
 }
 global.PrometeoContextIntakeV2=Object.freeze({version:'2.0.0-candidate',normalize,validate});
})(typeof globalThis!=='undefined'?globalThis:window);
