/* Prometeo Three.js / shared game kit v1. Original code; CDN Three.js separately MIT. */
(function(root){
"use strict";
const TAU=Math.PI*2, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rnd(seed,x,z,salt=0){let n=Math.imul((Math.floor(x*1031)+seed+salt*19)|0,1597334677)^Math.imul((Math.floor(z*1009)-seed)|0,3812015801);n^=n>>>16;n=Math.imul(n,2246822507);n^=n>>>13;return (n>>>0)/4294967296}
function height(x,z,seed=42,amp=1){return amp*(.9*Math.sin(x*.085+seed*.1)*Math.cos(z*.067)+.45*Math.cos(x*.17-z*.11)+.22*Math.sin(z*.33+x*.21))}
function makeWorld(T,config={}){
 const size=config.size||44,seed=config.seed??42,amp=config.amp??1,segments=config.segments||64;
 const scene=new T.Scene(),top=new T.Color(config.top||"#17384a"),ground=new T.Color(config.fog||"#a8c6b0");
 scene.background=ground;scene.fog=new T.FogExp2(ground,config.fogDensity??.012);
 const hemi=new T.HemisphereLight(config.hemisphere||"#f5f0c9",config.base||"#40574e",2.15);scene.add(hemi);
 const sun=new T.DirectionalLight(config.sun||"#ffe3a5",2.3);sun.position.set(-20,33,24);sun.castShadow=false;scene.add(sun);
 const skyGeo=new T.SphereGeometry(300,24,14);
 const sky=new T.Mesh(skyGeo,new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{uTop:{value:top},uBottom:{value:ground}},vertexShader:"varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"varying vec3 d;uniform vec3 uTop,uBottom;void main(){float t=smoothstep(-.2,.85,normalize(d).y);gl_FragColor=vec4(mix(uBottom,uTop,t),1.);}" }));scene.add(sky);
 const geo=new T.PlaneGeometry(size*2,size*2,segments,segments);geo.rotateX(-Math.PI/2);
 const a=geo.getAttribute("position"),colors=[];const c1=new T.Color(config.low||"#314f46"),c2=new T.Color(config.high||"#8fa68a"),c3=new T.Color(config.patch||"#b8ae83");
 for(let i=0;i<a.count;i++){let x=a.getX(i),z=a.getZ(i),y=height(x,z,seed,amp);a.setY(i,y);let t=clamp((y+amp*1.6)/(amp*3.2),0,1);const cc=c1.clone().lerp(c2,t);if(rnd(seed,x,z,4)>.86)cc.lerp(c3,.18);colors.push(cc.r,cc.g,cc.b)}
 geo.setAttribute("color",new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
 const terrain=new T.Mesh(geo,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));terrain.receiveShadow=true;terrain.name="Terrain";scene.add(terrain);
 const water=null;return {scene,terrain,ground:(x,z)=>height(x,z,seed,amp),seed,size,sky,sun,hemi,water};
}
function makeRenderer(T,host,config={}){const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=config.exposure??1.2;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,config.dpr??1.5));host.appendChild(renderer.domElement);
const camera=config.ortho?new T.OrthographicCamera(-16,16,16,-16,.1,900):new T.PerspectiveCamera(config.fov||56,1,.1,900);
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);if(camera.isPerspectiveCamera){camera.aspect=w/h}else{let d=config.ortho||16;camera.left=-d*w/h;camera.right=d*w/h;camera.top=d;camera.bottom=-d}camera.updateProjectionMatrix();}
resize();const obs=new ResizeObserver(resize);obs.observe(host);
return {renderer,camera,canvas:renderer.domElement,dispose(){obs.disconnect();renderer.dispose();renderer.domElement.remove()},resize};
}
function blob(T){const g=new T.SphereGeometry(1,10,8),a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i);const d=1+.09*Math.sin(x*10+y*5)+.12*Math.cos(z*6-x*4);a.setXYZ(i,x*d,y*d,z*d)}g.computeVertexNormals();return g}
function addForest(T,world,cfg={}){
 const size=world.size,seed=world.seed,density=cfg.density??.6,kind=cfg.kind||"forest",except=cfg.except||[];
 const obstacles=[],treeInfo=[],stems=[],leaves=[],stones=[],tiny=[],tmp=new T.Object3D();
 const ground=world.ground,scene=world.scene;
 function mtx(x,y,z,sx,sy,sz,rot=0){tmp.position.set(x,y,z);tmp.rotation.set(0,rot,0);tmp.scale.set(sx,sy,sz);tmp.updateMatrix();return tmp.matrix.clone()}
 function branch(a,b,r){const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A),len=v.length();tmp.position.copy(A.add(B).multiplyScalar(.5));tmp.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());tmp.scale.set(r,len,r);tmp.updateMatrix();stems.push(tmp.matrix.clone())}
 const a=cfg.leaves||["#a8b48a","#728e78","#3b675f","#244f52"];
 const colors=a.map(s=>new T.Color(s)),rockMat=new T.MeshStandardMaterial({color:cfg.rock||"#697369",roughness:1,flatShading:true});
 const leafMat=new T.MeshLambertMaterial({color:colors[1],roughness:1,flatShading:true,vertexColors:false});
 const trunkMat=new T.MeshStandardMaterial({color:cfg.bark||"#48443c",roughness:1,flatShading:true});
 const areas=[];
 for(let x=-size+5;x<size-5;x+=4.5)for(let z=-size+5;z<size-5;z+=4.5){
  const r=rnd(seed,x,z,0),xp=x+(rnd(seed,x,z,1)-.5)*2.8,zp=z+(rnd(seed,x,z,2)-.5)*2.8;
  if(Math.hypot(xp,zp)<7 || except.some(v=>Math.hypot(xp-v[0],zp-v[1])<(v[2]||5)))continue;
  if(r<density*.85){let s=.72+rnd(seed,x,z,5)*.65,y=ground(xp,zp),h=s*(2.8+rnd(seed,x,z,6)*1.5);
   if(kind==="stone"){stones.push(mtx(xp,y+h*.35,zp,s*.68,h*.6,s*.48,r*TAU));obstacles.push({x:xp,z:zp,r:s*.65});continue}
   branch([xp,y-.1,zp],[xp+.12*Math.sin(r*13),y+h,zp+.12*Math.cos(r*9)],s*.17);
   for(let j=0;j<3;j++){const an=j*2.09+r*TAU,p=[xp+Math.cos(an)*s*1.1,y+h*(.67+j*.06),zp+Math.sin(an)*s*1.1];
    branch([xp,y+h*(.47+j*.08),zp],p,s*.075);leaves.push(mtx(p[0],p[1],p[2],s*.96,s*.85,s*.92,an));
   }
   leaves.push(mtx(xp,y+h*.98,zp,s*1.08,s*.89,s*1.03,r*TAU));
   obstacles.push({x:xp,z:zp,r:s*.38});treeInfo.push([xp,zp,h]);
  }else if(r>.93){const s=.3+r*.4;stones.push(mtx(xp,ground(xp,zp)+s*.2,zp,s*1.6,s*.85,s,TAU*r))}
 }
 function inst(geometry,material,matrices,cast=false,instanceColors=null){if(!matrices.length)return null;const mesh=new T.InstancedMesh(geometry,material,matrices.length);for(let i=0;i<matrices.length;i++){mesh.setMatrixAt(i,matrices[i]);if(instanceColors)mesh.setColorAt(i,instanceColors[i%instanceColors.length]);}
 mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=cast;scene.add(mesh);return mesh}
 inst(new T.CylinderGeometry(.9,.75,1,7),trunkMat,stems,true);
 inst(blob(T),leafMat,leaves,false,colors);
 inst(new T.DodecahedronGeometry(1,0),rockMat,stones,true);
 return {obstacles,treeInfo};
}
function addMarker(T,w,p,i,kind="forest"){const g=new T.Group(),x=p.x,z=p.z,y=w.ground(x,z);g.position.set(x,y,z);
 const stone=new T.MeshStandardMaterial({color:kind==="stone"?"#776a70":"#837d63",roughness:.9,metalness:0});
 const dark=new T.MeshStandardMaterial({color:kind==="stone"?"#594856":"#5c4843",roughness:1});
 const gemMat=new T.MeshStandardMaterial({color:kind==="stone"?"#af9cf3":"#ffdab0",emissive:kind==="stone"?"#704ebd":"#df8e45",emissiveIntensity:1.7});
 const base=new T.Mesh(new T.CylinderGeometry(1.12,1.34,.35,12),stone);base.position.y=.18;g.add(base);
 for(const side of [-1,1]){let post=new T.Mesh(new T.CylinderGeometry(.17,.24,3.1,8),dark);post.position.set(side*.95,1.75,0);g.add(post)}
 const beam=new T.Mesh(new T.BoxGeometry(2.5,.22,.38),stone);beam.position.y=3.25;g.add(beam);
 const gem=new T.Mesh(new T.OctahedronGeometry(.47,1),gemMat);gem.position.y=2.2;g.add(gem);
 const halo=new T.PointLight(gemMat.color,2.0,7);halo.position.y=2.18;g.add(halo);
 w.scene.add(g);return {g,gem,halo,x,z,id:p.id,title:p.title,index:i,found:false};
}
function bindOrbit(T,view,target,cfg={}){let yaw=cfg.yaw??.6,pitch=cfg.pitch??.4,dist=cfg.distance??10;
 let down=null;const canvas=view.canvas,camera=view.camera;
 const onTap=cfg.onTap||(()=>{});
 canvas.style.touchAction="none";
 canvas.addEventListener("pointerdown",e=>{down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};try{canvas.setPointerCapture(e.pointerId)}catch{}});
 canvas.addEventListener("pointermove",e=>{if(!down)return;const dx=e.clientX-down.lx,dy=e.clientY-down.ly;down.lx=e.clientX;down.ly=e.clientY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>9)down.moved=true;
 if(down.moved){yaw-=dx*.005;pitch=clamp(pitch+dy*.004,-.1,1.19)}});
 canvas.addEventListener("pointerup",e=>{if(down&&!down.moved)onTap(e,camera);down=null});canvas.addEventListener("pointercancel",()=>down=null);
 canvas.addEventListener("wheel",e=>{e.preventDefault();dist=clamp(dist+e.deltaY*.012,4,24)},{passive:false});
 function update(){const v=typeof target==="function"?target():target;camera.position.set(v.x+Math.sin(yaw)*Math.cos(pitch)*dist,v.y+1.4+Math.sin(pitch)*dist,v.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(v.x,v.y+1.15,v.z)}
 update();return {update,get yaw(){return yaw},get dist(){return dist}};
}
function route(start,end,blocked,lim=42,step=2){const toGrid=v=>[Math.round(v[0]/step),Math.round(v[1]/step)];
const a=toGrid(start),b=toGrid(end),key=(x,z)=>x+","+z,k0=key(...a),goal=key(...b);
const q=[{x:a[0],z:a[1],g:0,f:0}],g=new Map([[k0,0]]),from=new Map(),seen=new Set(),max=Math.ceil(lim/step);
let iterations=0;
while(q.length&&iterations++<7000){q.sort((a,b)=>a.f-b.f);const n=q.shift(),k=key(n.x,n.z);if(seen.has(k))continue;seen.add(k);if(k===goal){const path=[];let s=k;while(s!==k0){const [x,z]=s.split(",").map(Number);path.push([x*step,z*step]);s=from.get(s);if(!s)return null}return path.reverse()}
for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,xx=x*step,zz=z*step;
if(Math.abs(x)>max||Math.abs(z)>max||blocked(xx,zz))continue;
if(dx&&dz&&(blocked((n.x+dx)*step,n.z*step)||blocked(n.x*step,(n.z+dz)*step)))continue;
const kk=key(x,z),tent=n.g+Math.hypot(dx,dz);
if(tent<(g.get(kk)??Infinity)){g.set(kk,tent);from.set(kk,k);q.push({x,z,g:tent,f:tent+Math.hypot(b[0]-x,b[1]-z)})}
}}
return null}
function download(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000)}
function bindKeys(onChange){const pressed=new Set(),map={ArrowUp:"w",ArrowLeft:"a",ArrowDown:"s",ArrowRight:"d",KeyW:"w",KeyA:"a",KeyS:"s",KeyD:"d"};
const key=(e,pressedNow)=>{const k=map[e.code];if(!k||e.target?.matches?.("input,textarea,select"))return;e.preventDefault();pressedNow?pressed.add(k):pressed.delete(k);onChange(pressed)};
window.addEventListener("keydown",e=>key(e,true));window.addEventListener("keyup",e=>key(e,false));window.addEventListener("blur",()=>{pressed.clear();onChange(pressed)});
for(const b of document.querySelectorAll("[data-move]")){const k=b.dataset.move;b.addEventListener("pointerdown",e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch{}pressed.add(k);onChange(pressed)});for(const ev of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(ev,()=>{pressed.delete(k);onChange(pressed)})}return pressed}
function notify(message){let box=document.getElementById("toast");if(!box)return;box.textContent=message;box.classList.add("show");clearTimeout(notify.t);notify.t=setTimeout(()=>box.classList.remove("show"),3800)}
root.PrometeoThreeKit={rnd,height,makeWorld,makeRenderer,addForest,addMarker,bindOrbit,route,download,bindKeys,notify,clamp};
})(globalThis);