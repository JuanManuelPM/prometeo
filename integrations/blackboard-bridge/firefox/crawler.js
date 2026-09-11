const BB_BASE='https://palermo.blackboard.com';
const bbClean=(x,n=2000)=>String(x||'').replace(/\s+/g,' ').trim().slice(0,n);
const bbAbs=(x,b=BB_BASE)=>{try{return new URL(x,b).href}catch{return ''}};
function bbHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function bbCourseKey(url){try{const u=new URL(url),q=u.searchParams;if(q.get('course_id'))return q.get('course_id');if(q.get('courseId'))return q.get('courseId');if((q.get('type')||'').toLowerCase()==='course'&&q.get('id'))return q.get('id');const m=u.pathname.match(/\/courses\/([^/?#]+)/i);return m?decodeURIComponent(m[1]):''}catch{return''}}
const bbCourseLink=h=>/course_id=|courseId=|type=Course|\/ultra\/courses\//i.test(h);
function bbUseful(h){return !!h&&h.startsWith(BB_BASE)&&!/logout|logoff|delete|remove|modify|editMode|gradebook\/do|email/i.test(h)&&/course_id=|courseId=|type=Course|\/courses\/|\/ultra\/(?:course|stream|calendar|grades|messages)|outline|listContent|announcement|message|mygrades|grade|content|calendar|bbcswebdav|attachment|resource/i.test(h)}
const bbFile=(h,t='')=>/bbcswebdav|\.(pdf|pptx?|docx?|xlsx?|zip|rar|7z|txt|rtf|csv|jpg|jpeg|png|gif|mp4|mp3|wav)(?:[?#]|$)/i.test(h)||/download|attachment|\.pdf|\.ppt|\.doc|\.xls|\.zip/i.test(h+' '+t);
const bbAssignment=(h,t='')=>/assignment|assessment|test|quiz|gradable|submit/i.test(h+' '+t);
const bbAnnouncement=(h,t='')=>/announcement|anuncio/i.test(h+' '+t);
const bbMessage=(h,t='')=>/message|mensaj/i.test(h+' '+t);
function bbDue(text){const m=bbClean(text,900).match(/(?:fecha de entrega|vencimiento|vence|due date|due)\s*[:\-]?\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/i);if(!m)return null;let y=+m[3];if(y<100)y+=2000;const d=new Date(y,+m[2]-1,+m[1],+(m[4]||23),+(m[5]||59));return isNaN(d)?null:d.toISOString()}
function bbPageType(url,title=''){const s=(url+' '+title).toLowerCase();return s.includes('announcement')?'announcement-page':s.includes('message')?'messages-page':s.includes('grade')?'grades-page':s.includes('calendar')?'calendar-page':s.includes('/ultra/stream')?'activity-page':'page'}
function bbCourseTitleScore(title,key=''){const t=bbClean(title,500),n=t.toLowerCase();let s=Math.min(40,t.length/4);if(!t)s-=100;if(/\.(png|jpe?g|gif|pdf|pptx?|docx?|xlsx?|zip)$/i.test(t))s-=80;if(/^https?:|abrir enlaces rapidos|enlaces rapidos|ir$/i.test(n))s-=70;if(/202\dC\dC_/i.test(t))s+=45;if(/[A-Z_]{8,}/.test(t))s+=12;if(key&&t.includes(key))s+=18;if(/\([^)]*202\dC\dC_[^)]+\)/i.test(t))s+=35;return s}
function bbPrettyCourseTitle(label='',code=''){
 let s=bbClean(label,500)||String(code||'').replace(/^202\dC\dC_/i,'');
 s=s.replace(/^[-\s]+/,'').replace(/\s*\([^)]*\)\s*$/,'');
 s=s.replace(/_M_[A-Z]{2}_[\d.]+-\d{2}_\d{2}_\d{4}.*$/i,'').replace(/_M_[A-Z]{2}_[\d.]+.*$/i,'');
 s=s.replace(/_/g,' ').replace(/\s+/g,' ').trim();
 return s||code;
}
function bbCourseCodeFromText(text=''){const m=String(text).match(/202\dC\dC_[A-Z0-9ÁÉÍÓÚÑ._-]+/i);return m?m[0]:''}
function bbBodyCourses(text=''){
 const out=new Map(),src=String(text||'');
 const re=/-?([A-ZÁÉÍÓÚÑ0-9._-]{5,}?)\s*\((202\dC\dC_[^)]+)\)/gi;let m;
 while((m=re.exec(src))){const code=bbClean(m[2],300),label=bbPrettyCourseTitle(m[1],code);if(code)out.set(code,{course_key:code,title:`${label} (${code})`,href:'',raw:{discovered_from:'page_text'}})}
 const re2=/202\dC\dC_[A-Z0-9ÁÉÍÓÚÑ._-]+/gi;while((m=re2.exec(src))){const code=bbClean(m[0],300);if(code&&!out.has(code))out.set(code,{course_key:code,title:bbPrettyCourseTitle('',code),href:'',raw:{discovered_from:'page_text_code'}})}
 return [...out.values()];
}
function parseBBPage(html,url){
 const d=new DOMParser().parseFromString(html,'text/html'),title=bbClean(d.querySelector('h1')?.textContent||d.querySelector('#pageTitleText')?.textContent||d.title||'',500),password=!!d.querySelector('input[type=password]'),body=bbClean(d.body?.innerText||d.body?.textContent||'',30000),ck=bbCourseKey(url),courses=new Map(),items=new Map(),enqueue=[];
 const addCourse=(k,n,h,raw={})=>{if(!k)return;const next={course_key:k,title:bbClean(n,500)||k,href:h||'',raw:{discovered_from:url,...raw}},prev=courses.get(k);if(!prev||bbCourseTitleScore(next.title,k)>bbCourseTitleScore(prev.title,k))courses.set(k,{...prev,...next});else if(prev&&!prev.href&&h&&!bbFile(h,n))prev.href=h};
 if(ck&&!bbFile(url,title))addCourse(ck,title,url,{via:'page'});
 for(const c of bbBodyCourses(body))addCourse(c.course_key,c.title,c.href,c.raw);
 for(const a of d.querySelectorAll('a[href]')){const href=bbAbs(a.getAttribute('href'),url);if(!href||!href.startsWith(BB_BASE))continue;const text=bbClean(a.textContent||a.title||a.getAttribute('aria-label')||'',600),near=bbClean(a.closest('li,article,div,tr')?.textContent||'',1200),k=bbCourseKey(href)||ck||bbCourseCodeFromText(near);if(bbCourseLink(href)){const kk=bbCourseKey(href);addCourse(kk,text,href,{via:'link'})}else if(k&&/202\dC\dC_/i.test(k))addCourse(k,bbPrettyCourseTitle('',k),'',{via:'context'});let type='link';if(bbFile(href,text))type='file';else if(bbAssignment(href,text))type='assignment';else if(bbAnnouncement(href,text))type='announcement';else if(bbMessage(href,text))type='message-link';if(type!=='link'||(text&&k)){const stable=(a.id||a.closest('[id]')?.id||href).slice(0,1200),key=(k||'global')+':'+bbHash(stable+'|'+text);items.set(key,{item_key:key,course_key:k||null,item_type:type,title:text||href.split('/').pop()||type,href,file_name:type==='file'?(text||null):null,due_at:bbDue(near),source_page:url,raw:{anchor_id:a.id||null}})}if(bbUseful(href)&&!bbFile(href,text))enqueue.push(href)}
 for(const b of [...d.querySelectorAll('li[id^="contentListItem"],.contentListItem,.liItem,.announcementList li,[class*="announcement"]')].slice(0,600)){const text=bbClean(b.innerText||b.textContent||'',5000);if(text.length<3)continue;const a=b.querySelector('a[href]'),href=a?bbAbs(a.getAttribute('href'),url):url,k=ck||bbCourseKey(href)||bbCourseCodeFromText(text)||null,type=bbAnnouncement(href,text)?'announcement':bbAssignment(href,text)?'assignment':'content',key=(k||'global')+':block:'+(b.id||bbHash(text.slice(0,500)+href));if(k&&/202\dC\dC_/i.test(k))addCourse(k,bbPrettyCourseTitle('',k),'',{via:'content_text'});items.set(key,{item_key:key,course_key:k,item_type:type,title:bbClean(b.querySelector('h2,h3,h4,.item')?.textContent||a?.textContent||text,800),body_text:text,href,due_at:bbDue(text),source_page:url,raw:{dom_id:b.id||null}})}
 const pk=(ck||'global')+':page:'+bbHash(url);items.set(pk,{item_key:pk,course_key:ck||null,item_type:bbPageType(url,title),title:title||url,body_text:body,href:url,due_at:bbDue(body),source_page:url,raw:{}});
 return{title,password,courses:[...courses.values()],items:[...items.values()],enqueue:[...new Set(enqueue)]};
}
