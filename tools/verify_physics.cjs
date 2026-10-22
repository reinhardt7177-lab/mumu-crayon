'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../vendor/matter.min.js'),C=require('../src/core.js'),{levels}=require('../src/campaign-levels.js');
const results=[];
for(const l of levels){
 const w=C.makeWorld(l);assert.equal(M.Composite.allBodies(w.engine.world).length,l.bodies.length);assert.equal(M.Composite.allConstraints(w.engine.world).length,l.joints.length);
 for(let i=0;i<360;i++)C.step(w);
 for(const b of M.Composite.allBodies(w.engine.world))assert.ok(Number.isFinite(b.position.x)&&Number.isFinite(b.position.y)&&Number.isFinite(b.angle));
 assert.equal(w.engine.gravity.scale,.00032);assert.equal(w.engine.velocityIterations,10);
 results.push({level:l.source,bodies:l.bodies.length,joints:l.joints.length,contacts:w.contacts,stable:true});
}
const w=C.makeWorld(levels[0]);for(let i=0;i<180;i++)C.step(w);
assert.equal(w.ball.vertices.length,96);assert.equal(w.ball.inertia,w.ball.mass*(48*48+48*48)/12);
const d=C.addDrawing(w,{x:400,y:100,width:64,height:32,angle:0});assert.equal(d.mass,4);assert.equal(d.mumu.special,'removeable');
assert.equal(d.inertia,d.mass*(64*64+32*32)/12);
const startY=d.position.y;for(let i=0;i<180;i++)C.step(w);assert.ok(d.position.y>startY+100);assert.ok(d.position.y<525);
assert.ok(w.contacts>0);assert.equal(C.eraseAt(w,d.position),d);assert.equal(w.drawings.length,0);assert.equal(C.eraseAt(w,w.ball.position),null);
const f=C.fitStroke([{x:50,y:50},{x:120,y:90},{x:110,y:108},{x:40,y:68},{x:50,y:50}]);assert.ok(Math.abs(f.angle)>.1);assert.ok(f.width*f.height<82*60);
const freehand=C.addFreehand(w,[{x:350,y:150},{x:410,y:155},{x:408,y:205},{x:348,y:200},{x:350,y:150}]);assert.ok(freehand);assert.ok(freehand.mumu.stroke.length>=4);
const beam=C.addFreehand(w,[{x:300,y:250},{x:350,y:260},{x:400,y:270}],{penWidth:5});assert.ok(beam);assert.ok(Math.min(beam.mumu.width,beam.mumu.height)>=8);
const eraseWorld=C.makeWorld(levels[70]),erasable=eraseWorld.drawings[0];assert.ok(erasable);assert.equal(C.eraseAt(eraseWorld,erasable.position),erasable);assert.equal(C.eraseAt(eraseWorld,eraseWorld.ball.position),null);
let solve=null;
outer:for(const width of [32,48,64,80])for(const height of [40,70,100,130])for(const leftOffset of [-72,-56,-40,-24])for(const y of [230,310,390]){
 const q=C.makeWorld(levels[0]);for(let i=0;i<180;i++)C.step(q);
 const x=q.ball.position.x+leftOffset;
 C.addDrawing(q,{x,y,width,height,angle:0});
 for(let i=0;i<600;i++){C.step(q);if(q.completed){solve={x,y,width,height,framesAfterDrop:i+1};break outer;}}
}
assert.ok(solve,'The first level must be solvable through physics with one drawn rectangle.');
const result={at:new Date().toISOString(),levels:results,core:{fall:true,groundCollision:true,deleteOwnDrawing:true,cannotDeletePlayer:true,drawMassFormula:true,originalMomentOfInertiaFormula:true,smooth96SidedRing:true,erasablePuzzleWall:true,orientedStrokeFit:true,freehandBody:true,starCollectionAndWin:true},firstLevelSolution:solve};
fs.writeFileSync(path.join(__dirname,'../qa/physics-results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({levels:results.length,stable:results.every(r=>r.stable),core:result.core,firstLevelSolution:solve},null,2));
