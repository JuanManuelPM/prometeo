#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('proof.html'),css=read('skin.css');let done=0;
function check(ok,name){assert.ok(ok,name);console.log('PASS '+name);done++;}
check(html.includes('name="viewport"'),'viewport');
check(html.includes('DATOS ILUSTRATIVOS'),'truthful fixtures');
check(['home','project','chat'].every(x=>html.includes('data-view="'+x+'"')),'three compositions');
check(html.includes('history.pushState')&&html.includes('popstate'),'history navigation');
check(html.includes('data-project')&&html.includes('data-go'),'visual interaction');
check(css.includes('scroll-snap-type:x mandatory')&&css.includes('68vw'),'portrait carousel');
check(css.includes('font-size:16px')&&css.includes('font-size:14px'),'legible text');
check(css.includes('min-height:47px')&&css.includes('min-height:48px'),'touch');
check(html.includes('disabled aria-label="Envío no disponible"'),'no fake submit');
check(!html.includes('https://api.github.com')&&!html.includes('navigator.mediaDevices'),'no runtime network');
check(css.includes('prefers-reduced-motion'),'reduced motion');
const arts=['estudio','pulso','notas'].map(x=>read('art/'+x+'.svg'));
check(arts.every(s=>s.startsWith('<svg')&&s.includes('</svg>')),'three original SVG artworks');
const pigments=[...new Set((css+arts.join('')).match(/#[a-fA-F0-9]{6}\b/g))].sort();
check(JSON.stringify(pigments)===JSON.stringify(['#111111','#f4f2eb']),'two exact pigments');
console.log('BICOLOR_ATELIER_SOURCE_PASS '+done);
