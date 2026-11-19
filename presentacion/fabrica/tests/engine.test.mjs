import test from "node:test";
import assert from "node:assert/strict";
import {seconds,parseVtt,normalize,keywords,selectHighlights,makeRecipe} from "../engine.mjs";
const cues=[
{start:65,end:71,text:"Jorge ¿qué es ser hombre hoy?"},
{start:71,end:79,text:"Es una pregunta difícil porque hay polarización."},
{start:79,end:88,text:"La sociedad pone normas de masculinidad."},
{start:261,end:268,text:"El machismo no va nunca."},
{start:268,end:277,text:"Machismo no es ser masculino ni ser hombre."},
{start:277,end:287,text:"Hay que distinguir la fortaleza de la violencia."},
{start:355,end:365,text:"Desde siempre hubo rituales de paso."},
{start:365,end:375,text:"Esos rituales marcaban la transición a la adultez."}
];
test("timestamp formats",()=>{assert.equal(seconds("01:05.500"),65.5);assert.equal(seconds("00:01:05,500"),65.5);assert.throws(()=>seconds("not-time"))});
test("parse real VTT blocks",()=>{const c=parseVtt("WEBVTT\n\n00:01:05.000 --> 00:01:11.000\nQué es ser hombre\n\n00:01:11.000 --> 00:01:15.500\nUna cuestión");assert.equal(c.length,2);assert.equal(c[0].start,65)});
test("reject untimed transcript",()=>assert.throws(()=>normalize([{text:"hombres masculinidad"}]),/INVALID_CUE/));
test("reject fabricated invalid intervals",()=>assert.throws(()=>normalize([{start:7,end:7,text:"X"}]),/INVALID_CUE/));
test("score terms accented",()=>assert.ok(keywords("masculinidad, psicología").includes("psicologia")));
test("select diverse separate excerpts",()=>{const c=selectHighlights(cues,"machismo masculinidad",{count:3});assert.ok(c.length>=2);for(let i=1;i<c.length;i++)assert.ok(c[i].start>=c[i-1].end)});
test("make editable canonical recipe",()=>{const r=makeRecipe({videoId:"q6w1zahnVKI",title:"Hombres y psicología",topic:"masculinidad",cues,count:3,commentary:["IDEA UNO","IDEA DOS","IDEA TRES"]});assert.equal(r.source.rights,"embed");assert.equal(r.slides[0].kind,"cover");assert.ok(r.slides.some(s=>s.kind==="video"));assert.equal(r.slides.at(-1).kind,"ending")});
test("reject invalid YouTube ID and rights",()=>{assert.throws(()=>makeRecipe({videoId:"bad",title:"x",cues}));assert.throws(()=>makeRecipe({videoId:"q6w1zahnVKI",title:"x",cues,rights:"steal"}))});
test("reject transcript with no usable duration",()=>assert.throws(()=>selectHighlights([{start:0,end:1,text:"hola"}],"",{minSeconds:8}),/NO_USABLE/));
