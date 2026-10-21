/**
 * Prometeo Three.js research / navigation kernel v0.
 * Pure JS: no renderer, input listeners, timers or external dependencies.
 * World: +Y up, player moves on XZ, forward at yaw=0 is -Z.
 * Candidate only; not a published widget.
 */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function cameraOrbit(camera, dx, dy, sensitivity = 0.005) {
  return { ...camera, yaw: camera.yaw - dx * sensitivity,
    pitch: clamp(camera.pitch - dy * sensitivity, -1.10, 1.10) };
}
export function cameraDistanceForSphere(radius, verticalFovDeg, aspect, margin = 1.25) {
  if (!(radius > 0 && verticalFovDeg > 0 && verticalFovDeg < 180 && aspect > 0)) throw new Error('Invalid camera bounds');
  const v = verticalFovDeg * Math.PI / 180;
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
  return margin * radius / Math.sin(Math.min(v, h) / 2);
}
export function cameraRelativeVector(keys, yaw) {
  const side = Number(Boolean(keys.right)) - Number(Boolean(keys.left));
  const ahead = Number(Boolean(keys.forward)) - Number(Boolean(keys.backward));
  let x = side * Math.cos(yaw) + ahead * Math.sin(yaw);
  let z = side * Math.sin(yaw) - ahead * Math.cos(yaw);
  const n = Math.hypot(x, z);
  return n ? {x: x/n, z: z/n} : {x:0,z:0};
}
export function groundIntersection(origin, direction, groundY = 0) {
  if (Math.abs(direction.y) < 1e-8) return null;
  const t = (groundY-origin.y)/direction.y;
  if (t <= 0) return null;
  return {x:origin.x+direction.x*t, z:origin.z+direction.z*t};
}
export function isClear(point, obstacles = [], radius = 0.32) {
  return obstacles.every(o => Math.hypot(point.x-o.x, point.z-o.z) >= radius + o.radius);
}
export function moveWithSlide(position, delta, obstacles = [], radius = 0.32) {
  const full = {x:position.x+delta.x,z:position.z+delta.z};
  if (isClear(full, obstacles, radius)) return full;
  const px = {x:full.x,z:position.z};
  const pz = {x:position.x,z:full.z};
  if (isClear(px,obstacles,radius)) return px;
  if (isClear(pz,obstacles,radius)) return pz;
  return {...position};
}
/** A* cells: no cutting diagonally between two obstructed corners. */
export function routeGrid(start, end, width, height, isWalkable) {
  if (![width,height].every(v=>Number.isInteger(v)&&v>0)) throw new Error('Invalid grid');
  const valid = (x,z)=>x>=0&&z>=0&&x<width&&z<height&&isWalkable(x,z);
  if (!valid(start.x,start.z)||!valid(end.x,end.z)) return null;
  const key=(x,z)=>z*width+x;
  const src=key(start.x,start.z), dst=key(end.x,end.z);
  const h=(x,z)=>{const dx=Math.abs(end.x-x),dz=Math.abs(end.z-z);return dx+dz+(Math.SQRT2-2)*Math.min(dx,dz)};
  const g=new Map([[src,0]]), parent=new Map(), seen=new Set(), open=[{x:start.x,z:start.z,f:h(start.x,start.z)}];
  const moves=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  while(open.length) {
    open.sort((a,b)=>a.f-b.f);
    const p=open.shift(), k=key(p.x,p.z);
    if(seen.has(k))continue;
    if(k===dst) {
      const path=[]; let q=k;
      while(q!==src){path.unshift({x:q%width,z:Math.floor(q/width)});q=parent.get(q);}
      return path;
    }
    seen.add(k);
    for(const [dx,dz] of moves) {
      const x=p.x+dx,z=p.z+dz, nk=key(x,z);
      if(!valid(x,z)||seen.has(nk))continue;
      if(dx&&dz&&(!valid(p.x+dx,p.z)||!valid(p.x,p.z+dz)))continue;
      const cost=g.get(k)+Math.hypot(dx,dz);
      if(cost < (g.get(nk)??Infinity)){
        parent.set(nk,k);g.set(nk,cost);open.push({x,z,f:cost+h(x,z)});
      }
    }
  }
  return null;
}
export function stepNavigation(state, keys, obstacles = [], dt = 1/60) {
  const next={...state, position:{...state.position}, path:(state.path||[]).map(p=>({...p}))};
  dt=clamp(dt,0,0.05);
  const input=cameraRelativeVector(keys,next.camera.yaw);
  const manual=Math.hypot(input.x,input.z)>0;
  if(manual) next.path=[]; // manual input always takes priority over click-to-walk
  let direction=input;
  if(!manual && next.path.length){
    const target=next.path[0], dx=target.x-next.position.x, dz=target.z-next.position.z;
    const dist=Math.hypot(dx,dz);
    if(dist < 0.075){next.path.shift();return stepNavigation(next,keys,obstacles,dt);}
    direction={x:dx/dist,z:dz/dist};
  }
  const speed=Math.max(0,next.speed ?? 2.4), distance=speed*dt;
  if(!manual&&next.path.length){
    const target=next.path[0];
    const remain=Math.hypot(target.x-next.position.x,target.z-next.position.z);
    const scale=Math.min(distance,remain);
    direction={x:direction.x*scale,z:direction.z*scale};
  } else direction={x:direction.x*distance,z:direction.z*distance};
  const old={...next.position};
  next.position=moveWithSlide(old,direction,obstacles,next.radius??0.32);
  next.moving=Math.hypot(next.position.x-old.x,next.position.z-old.z)>1e-6;
  if(next.moving)next.heading=Math.atan2(next.position.x-old.x,-(next.position.z-old.z));
  return next;
}
