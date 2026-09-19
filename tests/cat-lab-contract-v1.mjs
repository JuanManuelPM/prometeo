import fs from 'node:fs';
import path from 'node:path';

const dir=path.resolve(process.argv[2]||'');
if(!dir||!fs.existsSync(dir)) throw new Error('usage: node tests/cat-lab-contract-v1.mjs <slot-directory>');
const file=path.join(dir,'index.html');
if(!fs.existsSync(file)) throw new Error('index.html missing');
const html=fs.readFileSync(file,'utf8');
const fail=m=>{throw new Error(m)};
const count=re=>(html.match(re)||[]).length;

if(count(/data-catlab-chapter\b/g)!==4) fail('expected exactly 4 data-catlab-chapter sections');
for(const id of ['chapter-current','tts-play','tts-prev','tts-next','tts-rate','cat-radio-play','cat-radio-volume','cat-notes']){
  if(!new RegExp('id=["\\\']'+id+'["\\\']').test(html)) fail('missing #'+id);
}
if(count(/data-palette\b/g)<2) fail('need at least two palette controls');
if(!/speechSynthesis/.test(html)) fail('speechSynthesis integration missing');
if(!/(AudioContext|webkitAudioContext)/.test(html)) fail('local Web Audio integration missing');
if(!/localStorage/.test(html)) fail('localStorage persistence missing');
if(!/@media\b/.test(html)) fail('responsive media rule missing');
if(!/aria-pressed/.test(html)) fail('play controls need aria-pressed state');
if(/(?:src|href)=["']https?:\/\//i.test(html)) fail('core page must not depend on external http assets');
if(/\bTODO\b|not implemented|placeholder control/i.test(html)) fail('placeholder marker present');
console.log(JSON.stringify({ok:true,file,chapters:4,palettes:count(/data-palette\b/g)}));
