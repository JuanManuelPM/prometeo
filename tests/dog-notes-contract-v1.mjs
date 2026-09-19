import fs from 'node:fs';
import path from 'node:path';
const dir=path.resolve(process.argv[2]||'');
if(!dir||!fs.existsSync(dir)) throw new Error('usage: node tests/dog-notes-contract-v1.mjs <slot-directory>');
const file=path.join(dir,'index.html');
if(!fs.existsSync(file)) throw new Error('index.html missing');
const html=fs.readFileSync(file,'utf8');
for(const id of ['dog-note-input','dog-note-add','dog-note-list']){
  if(!new RegExp('id=["\\\']'+id+'["\\\']').test(html)) throw new Error('missing #'+id);
}
if(!/localStorage/.test(html)) throw new Error('localStorage persistence missing');
if(!/(remove|delete|borrar|eliminar)/i.test(html)) throw new Error('remove-note behavior not evident');
if(/\\bTODO\\b|not implemented|placeholder control/i.test(html)) throw new Error('placeholder marker present');
console.log(JSON.stringify({ok:true,file}));
