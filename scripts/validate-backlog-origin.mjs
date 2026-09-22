#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const ORIGIN_SCHEMA='prometeo.backlog-item-origin/v1';
export const POLICY_SCHEMA='prometeo.backlog-origin-policy/v1';
const KINDS=new Set(['USER','WORKER','POST_HOC_ANALYSIS','UNKNOWN_LEGACY']);
const CONFIDENCE=new Set(['DIRECT','ATTRIBUTED','UNKNOWN']);

const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const isIso=v=>typeof v==='string'&&!Number.isNaN(Date.parse(v));

export function validateBacklogOrigin(origin){
  const errors=[];
  if(!isObj(origin)) return {valid:false,errors:['origin must be an object']};
  if(origin.schema!==ORIGIN_SCHEMA) errors.push('origin.schema invalid');
  if(!KINDS.has(origin.author_kind)) errors.push('origin.author_kind invalid');
  if(typeof origin.source_ref!=='string'||!origin.source_ref.trim()) errors.push('origin.source_ref required');
  if(origin.authored_at!==null&&!isIso(origin.authored_at)) errors.push('origin.authored_at must be ISO date-time or null');
  if(!isIso(origin.recorded_at)) errors.push('origin.recorded_at must be ISO date-time');
  if(!CONFIDENCE.has(origin.confidence)) errors.push('origin.confidence invalid');

  if(origin.author_kind==='UNKNOWN_LEGACY'){
    if(origin.author_ref!==null) errors.push('UNKNOWN_LEGACY author_ref must be null');
    if(origin.confidence!=='UNKNOWN') errors.push('UNKNOWN_LEGACY confidence must be UNKNOWN');
  } else if(origin.author_kind==='USER'){
    if(origin.author_ref!=='USER') errors.push('USER author_ref must be USER');
  } else if(origin.author_kind==='WORKER'||origin.author_kind==='POST_HOC_ANALYSIS'){
    if(typeof origin.author_ref!=='string'||!origin.author_ref.trim()) errors.push(origin.author_kind+' author_ref required');
  }
  return {valid:errors.length===0,errors};
}

export function validateBacklogOriginPolicy(backlog){
  const errors=[];
  if(!isObj(backlog)) return {valid:false,errors:['backlog must be an object']};
  const p=backlog.origin_policy;
  if(!isObj(p)) return {valid:false,errors:['origin_policy required']};
  if(p.schema!==POLICY_SCHEMA) errors.push('origin_policy.schema invalid');
  if(p.origin_schema!==ORIGIN_SCHEMA) errors.push('origin_policy.origin_schema invalid');
  if(!Number.isInteger(p.legacy_cutoff_id)||p.legacy_cutoff_id<0) errors.push('origin_policy.legacy_cutoff_id invalid');
  if(p.new_items_require_origin!==true) errors.push('origin_policy.new_items_require_origin must be true');
  if(p.legacy_missing_origin!=='UNKNOWN_LEGACY') errors.push('origin_policy.legacy_missing_origin must be UNKNOWN_LEGACY');

  const items=Array.isArray(backlog.items)?backlog.items:[];
  if(!Array.isArray(backlog.items)) errors.push('items must be an array');
  for(const item of items){
    if(!Number.isInteger(item?.id)){ errors.push('item id must be integer'); continue; }
    if(item.origin!==undefined){
      const r=validateBacklogOrigin(item.origin);
      for(const e of r.errors) errors.push('item '+item.id+': '+e);
    } else if(item.id>p.legacy_cutoff_id){
      errors.push('item '+item.id+': origin required for post-legacy item');
    }
  }
  return {valid:errors.length===0,errors};
}

const isMain=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isMain){
  try{
    const file=process.argv[2];
    if(!file) throw new Error('usage: node scripts/validate-backlog-origin.mjs <backlog.json>');
    const backlog=JSON.parse(fs.readFileSync(file,'utf8'));
    const result=validateBacklogOriginPolicy(backlog);
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    process.exitCode=result.valid?0:2;
  }catch(error){
    process.stderr.write(String(error?.message||error)+'\n');
    process.exitCode=1;
  }
}
