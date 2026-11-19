/**
 * PROMETEO · AV flow engine. Pure, deterministic, no external runtime.
 * Timed text only; never infer seconds from untimed prose.
 */
export function seconds(s){
  const p=s.trim().replace(",",".").split(":").map(Number);
  if(!(p.length===2||p.length===3)||p.some(x=>!Number.isFinite(x)||x<0))throw Error("INVALID_TIMESTAMP");
  return p.reduce((a,v)=>a*60+v,0);
}
export function parseVtt(vtt){
  if(typeof vtt!=="string")throw Error("VTT_REQUIRED");
  const blocks=vtt.replace(/\r/g,"").split(/\n\s*\n/), cues=[];
  for(const block of blocks){
    const lines=block.trim().split("\n"), at=lines.findIndex(s=>/-->/.test(s));
    if(at<0)continue;
    const m=lines[at].match(/(\d{1,2}:\d\d(?::\d\d)?[.,]\d+|\d{1,2}:\d\d(?::\d\d)?)\s+-->\s+(\d{1,2}:\d\d(?::\d\d)?[.,]\d+|\d{1,2}:\d\d(?::\d\d)?)/);
    if(!m)continue;
    const text=lines.slice(at+1).join(" ").replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
    if(text)cues.push({start:seconds(m[1]),end:seconds(m[2]),text});
  }
  return normalize(cues);
}
export function normalize(cues){
  if(!Array.isArray(cues)||!cues.length)throw Error("NO_TIMED_TRANSCRIPT");
  const a=cues.map((c,i)=>{
    const start=Number(c.start),end=Number(c.end),text=String(c.text||"").trim();
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end-start>120||!text)throw Error("INVALID_CUE_"+i);
    return {start,end,text};
  }).sort((a,b)=>a.start-b.start);
  for(let i=1;i<a.length;i++)if(a[i].start<a[i-1].start)throw Error("DISORDERED_CUES");
  return a;
}
function fold(s){return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
const stop=new Set("el la los las de del un una unos unas en y o a que por para es son se su sus con como sobre al lo qué como cual este esta otro otra por qué".split(" "));
export function keywords(text){
  return [...new Set(fold(text).match(/[a-zñ]{4,}/g)||[])].filter(w=>!stop.has(w));
}
export function selectHighlights(raw,topic="",opts={}){
  const cues=normalize(raw), min=Math.max(5,Number(opts.minSeconds||8)), max=Math.min(45,Number(opts.maxSeconds||26));
  const limit=Math.min(5,Math.max(1,Number(opts.count||3)));
  const terms=keywords(topic), candidates=[];
  for(let i=0;i<cues.length;i++){
    let content="",start=cues[i].start,end=start,j=i;
    while(j<cues.length && cues[j].end-start<=max && (j===i||cues[j].start-end<3)){
      content+=(content?" ":"")+cues[j].text;end=cues[j].end;j++;
      if(end-start<min)continue;
      const words=keywords(content);
      const matched=terms.filter(w=>words.some(x=>x===w||x.startsWith(w)||w.startsWith(x))).length;
      const density=matched/Math.max(1,terms.length);
      const score=(terms.length?density*20:3)+Math.min(content.length/90,4)+(j-i>2?1.5:0)-Math.abs((end-start)-19)*.06;
      candidates.push({start:Math.round(start*10)/10,end:Math.round(end*10)/10,score:Math.round(score*100)/100,evidence:content.slice(0,420),cueCount:j-i});
    }
  }
  if(!candidates.length)throw Error("NO_USABLE_TIMED_EXCERPTS");
  candidates.sort((a,b)=>b.score-a.score||a.start-b.start);
  const selected=[];
  for(const c of candidates){
    if(selected.every(q=>c.start>q.end+Math.max(4,Number(opts.minGap||12))||c.end<q.start-Math.max(4,Number(opts.minGap||12))))selected.push(c);
    if(selected.length===limit)break;
  }
  if(!selected.length)throw Error("NO_DISTINCT_EXCERPTS");
  return selected.sort((a,b)=>a.start-b.start);
}
export function makeRecipe({videoId,title,channel="",topic="",cues,count=3,rights="embed",commentary=[]}){
  if(!/^[A-Za-z0-9_-]{11}$/.test(videoId||""))throw Error("VIDEO_ID_INVALID");
  if(!["embed","owned"].includes(rights))throw Error("RIGHTS_INVALID");
  const highlights=selectHighlights(cues,topic,{count});
  const slides=[{kind:"cover",text:title.slice(0,95)}];
  for(let i=0;i<highlights.length;i++){
    const clip=highlights[i],label=commentary[i]||("MOMENTO "+String(i+1).padStart(2,"0")+"\n"+(topic.toUpperCase().slice(0,65)||"UNA IDEA PARA MIRAR"));
    slides.push({kind:"statement",text:label,durationMs:6500});
    slides.push({kind:"video",start:clip.start,end:clip.end,videoId,evidence:clip.evidence,score:clip.score});
  }
  slides.push({kind:"ending",text:"FIN."});
  return {schema:"prometeo.av.video-recipe/v1",source:{url:"https://www.youtube.com/watch?v="+videoId,videoId,title,channel,rights},topic,slides,provenance:"timed transcript (verified source required)",editorialMode:commentary.length?"human-or-agent-reviewed":"extractive-fallback"};
}
