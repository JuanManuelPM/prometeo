import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
export const ROOT=new URL('../',import.meta.url);
export function read(rel){return fs.readFileSync(new URL(rel,ROOT),'utf8')}
export function json(rel){return JSON.parse(read(rel))}
export function jsonl(rel){return read(rel).trim().split(/\n+/).filter(Boolean).map(JSON.parse)}
export function context(extra={}){
 const c={console,structuredClone,TextEncoder,TextDecoder,crypto:webcrypto,URL,Date,Math,JSON,setTimeout,clearTimeout,queueMicrotask,...extra};c.globalThis=c;c.window=c;return c;
}
export function load(rel,c){vm.createContext(c);vm.runInContext(read(rel),c,{filename:rel});return c}
