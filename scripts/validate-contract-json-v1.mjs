#!/usr/bin/env node
import fs from 'node:fs';

const [schemaPath, dataPath] = process.argv.slice(2);
if (!schemaPath || !dataPath) throw new Error('usage: validate-contract-json-v1.mjs SCHEMA DATA');
const root = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const errors = [];
const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
function resolve(ref) {
  if (!ref.startsWith('#/')) throw new Error(`unsupported ref ${ref}`);
  return ref.slice(2).split('/').reduce((o,k)=>o[k.replace(/~1/g,'/').replace(/~0/g,'~')], root);
}
function fail(path,msg){errors.push(`${path}: ${msg}`)}
function validate(schema,value,path='$') {
  if (schema.$ref) return validate(resolve(schema.$ref), value, path);
  if (schema.oneOf) {
    const matches = schema.oneOf.filter(s=>{const before=errors.length;validate(s,value,path);const ok=errors.length===before;errors.splice(before);return ok;}).length;
    if (matches!==1) fail(path,`oneOf matched ${matches}`);
    return;
  }
  if (Object.hasOwn(schema,'const') && value!==schema.const) fail(path,`expected const ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some(x=>x===value)) fail(path,`not in enum`);
  if (schema.type) {
    const allowed=Array.isArray(schema.type)?schema.type:[schema.type];
    const actual=typeOf(value);
    const typeOk=allowed.includes(actual) || (actual==='integer'&&allowed.includes('number'));
    if (!typeOk) { fail(path,`type ${actual}, expected ${allowed.join('|')}`); return; }
  }
  if (typeof value==='string') {
    if (schema.minLength!=null && value.length<schema.minLength) fail(path,'too short');
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) fail(path,`pattern ${schema.pattern}`);
    if (schema.format==='date-time' && Number.isNaN(Date.parse(value))) fail(path,'invalid date-time');
  }
  if (typeof value==='number') {
    if (schema.minimum!=null && value<schema.minimum) fail(path,`below minimum ${schema.minimum}`);
    if (schema.maximum!=null && value>schema.maximum) fail(path,`above maximum ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems!=null && value.length<schema.minItems) fail(path,'too few items');
    if (schema.maxItems!=null && value.length>schema.maxItems) fail(path,'too many items');
    if (schema.items) value.forEach((v,i)=>validate(schema.items,v,`${path}[${i}]`));
  } else if (value && typeof value==='object') {
    for (const k of schema.required||[]) if (!Object.hasOwn(value,k)) fail(path,`missing ${k}`);
    for (const [k,v] of Object.entries(value)) {
      if (schema.properties?.[k]) validate(schema.properties[k],v,`${path}.${k}`);
      else if (schema.additionalProperties===false) fail(`${path}.${k}`,'additional property');
    }
  }
}
validate(root,data);
if (errors.length) {
  console.error(errors.slice(0,50).join('\n'));
  process.exit(1);
}
console.log(`PASS ${root.$id || schemaPath} <- ${dataPath}`);
