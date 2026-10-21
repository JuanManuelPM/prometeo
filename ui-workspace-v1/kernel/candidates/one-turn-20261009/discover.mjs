import {readdir,readFile,lstat,realpath} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {compileCatalog} from './cartridges.js';

export async function discover(root,composition){
  const allowed=await realpath(root),manifests=[];
  async function walk(dir){
    for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
      const path=resolve(dir,entry.name),stat=await lstat(path);
      if(stat.isSymbolicLink())throw new Error('CARTRIDGE_SYMLINK_DENIED');
      if(entry.isDirectory())await walk(path);
      else if(entry.name==='plugin.manifest.json'){
        if(stat.size>32768)throw new Error('MANIFEST_TOO_LARGE');
        const m=JSON.parse(await readFile(path,'utf8'));
        const target=resolve(dirname(path),String(m.entry||'')),inside=relative(allowed,target);
        if(inside.startsWith('..')||inside.startsWith('/'))throw new Error('ENTRY_OUTSIDE_ROOT');
        const entryStat=await lstat(target);if(entryStat.isSymbolicLink()||!entryStat.isFile())throw new Error('ENTRY_INVALID');
        m.source=relative(allowed,path);m.entryRef=relative(allowed,target);manifests.push(m);
      }
    }
  }
  await walk(allowed);return compileCatalog(manifests,composition);
}
// Caller is the existing build owner. This module neither writes CURRENT nor
// rewrites HTML nor executes a discovered module. Activation remains separate.
