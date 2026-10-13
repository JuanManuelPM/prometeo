import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraOrbit,cameraDistanceForSphere,cameraRelativeVector,groundIntersection,isClear,moveWithSlide,routeGrid,stepNavigation} from './navigation.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`expected ${a} ~= ${b}`);
test('orbital drag does not mutate player',()=>{
 const cam={yaw:0,pitch:0.3}, result=cameraOrbit(cam,100,40);
 near(cam.yaw,0);near(result.yaw,-0.5);near(result.pitch,0.1);
});
test('camera portrait fitting is further than landscape',()=>{
 assert.ok(cameraDistanceForSphere(2,50,0.55)>cameraDistanceForSphere(2,50,1.8));
});
test('camera input is camera-relative, diagonal normalized',()=>{
 let p=cameraRelativeVector({forward:true,right:true},0);near(Math.hypot(p.x,p.z),1);assert.ok(p.x>0&&p.z<0);
 p=cameraRelativeVector({forward:true},Math.PI/2);near(p.x,1);near(p.z,0);
});
test('ray-plane click returns destination only in front of camera',()=>{
 const p=groundIntersection({x:1,y:5,z:1},{x:0,y:-1,z:-2});near(p.x,1);near(p.z,-9);
 assert.equal(groundIntersection({x:0,y:5,z:0},{x:0,y:1,z:0}),null);
});
test('obstacles prevent intersections and allow sliding',()=>{
 const obstacles=[{x:1,z:1,radius:.4}];
 assert.equal(isClear({x:1,z:1},obstacles,.32),false);
 const p=moveWithSlide({x:0,z:0},{x:1,z:1},obstacles,.32);
 assert.notDeepEqual(p,{x:1,z:1});
});
test('A-star detours around walls and disallows corner cutting',()=>{
 const blocked=new Set(['1,0','1,1','1,2']);
 const waypoints=routeGrid({x:0,z:1},{x:4,z:1},5,5,(x,z)=>!blocked.has(`${x},${z}`));
 assert.ok(waypoints.length>4); assert.deepEqual(waypoints.at(-1),{x:4,z:1});
 const denied=routeGrid({x:0,z:0},{x:1,z:1},2,2,(x,z)=>x===z);
 assert.equal(denied,null);
});
test('WASD overrides path without moving camera',()=>{
 const s={position:{x:0,z:0},camera:{yaw:.4,pitch:.5},heading:0,speed:3,path:[{x:10,z:10}]};
 const t=stepNavigation(s,{forward:true},[],1/60);
 assert.deepEqual(t.camera,s.camera); assert.deepEqual(t.path,[]);
 assert.ok(t.position.x>0&&t.position.z<0);
});
test('dt is bounded, no frame-rate jump after tab suspension',()=>{
 const s={position:{x:0,z:0},camera:{yaw:0},speed:3,path:[]};
 const t=stepNavigation(s,{forward:true},[],60);
 assert.ok(t.position.z>=-.150001); assert.equal(t.moving,true);
});
test('click goal arrives and does not overshoot',()=>{
 let s={position:{x:0,z:0},camera:{yaw:0},speed:4,path:[{x:.15,z:0}]};
 for(let i=0;i<10;i++) s=stepNavigation(s,{},[],1/60);
 assert.ok(s.position.x>=.075&&s.position.x<=.15); assert.equal(s.path.length,0);
});
test('camera invalid params reject',()=>assert.throws(()=>cameraDistanceForSphere(2,0,1)));
