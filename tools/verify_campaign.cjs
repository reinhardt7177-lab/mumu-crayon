'use strict';
// Independent acceptance replay. Uses only the same drawing/deletion API as play.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),M=require('../vendor/matter.min.js'),C=require('../src/core.js');
const {levels,chapters}=require('../src/campaign-levels.js');
const certificates=JSON.parse(fs.readFileSync(path.join(root,'qa/campaign-solutions.json'),'utf8')).certificates;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const physicsHash=hash(fs.readFileSync(path.join(root,'src/core.js')));
assert.equal(levels.length,100);assert.equal(chapters.length,10);assert.equal(certificates.length,100);
assert.equal(new Set(levels.map(l=>l.source)).size,100);assert.equal(new Set(levels.map(l=>l.title)).size,100);
const layouts=levels.map(l=>JSON.stringify({bodies:l.bodies.map(b=>[b.x,b.y,b.width,b.height,b.angle,b.mass,b.removable]),stars:l.stars,joints:l.joints}));
assert.equal(new Set(layouts).size,100,'Every page must have a distinct physical composition.');
for(const ch of chapters){const list=levels.filter(l=>l.chapter===ch.id);assert.equal(list.length,10);assert.equal(list[0].id,ch.start);assert.equal(list[9].id,ch.end);}
function polygon(r){const c=Math.cos(r.angle||0),s=Math.sin(r.angle||0);return[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([x,y])=>({x:r.x+x*r.width/2*c-y*r.height/2*s,y:r.y+x*r.width/2*s+y*r.height/2*c}));}
function replay(l,cert,jitter=0){
 let rescue=0,starEvents=0,winEvents=0,contacts=0;const w=C.makeWorld(l,{rescue:()=>rescue++,star:()=>starEvents++,complete:()=>winEvents++,collision:()=>contacts++}),drawings=[];
 const actions=cert.actions.map(a=>a.type==='draw'?{...a,rect:{...a.rect,x:a.rect.x+jitter,y:a.rect.y-jitter*.4}}:{...a});
 let ai=0,maxJointAngle=0,maxJointSpeed=0,maxAnchorError=0,maxTilt=0,drawCount=0,eraseCount=0;
 const tilted=new Set();
 for(let tick=0;tick<Math.max(cert.winTick+240,1200);tick++){
  while(ai<actions.length&&actions[ai].at===tick){
   const a=actions[ai++];
   if(a.type==='draw'){
    const r=a.rect,points=polygon(r);for(const p of points)assert.ok(p.x>=-1&&p.x<=801&&p.y>=-1&&p.y<=601,'A solution drawing must be possible inside the canvas.');
    const b=Math.abs(r.angle||0)>.001?C.addFreehand(w,points,{color:'#678f99'}):C.addDrawing(w,r,{color:'#678f99'});assert.ok(b);drawings.push(b);drawCount++;
    if(!jitter)assert.ok(!M.Collision.collides(b,w.ball),'A solution may not spawn a drawing inside the red ring.');
   }else{
    assert.equal(a.type,'erase');const b=a.bodyId?M.Composite.allBodies(w.engine.world).find(b=>b.mumu.id===a.bodyId):drawings[a.drawingIndex];assert.ok(b);assert.ok(b.position.x>=0&&b.position.x<=800&&b.position.y>=0&&b.position.y<=600);assert.equal(C.eraseAt(w,b.position),b);eraseCount++;
   }
  }
  C.step(w);
  for(const b of M.Composite.allBodies(w.engine.world)){
   assert.ok(Number.isFinite(b.position.x)&&Number.isFinite(b.position.y)&&Number.isFinite(b.angle));
   const angle=Math.abs(b.angle-(b.mumu.angle||0));if(b.mumu.pinned){maxJointAngle=Math.max(maxJointAngle,angle);maxJointSpeed=Math.max(maxJointSpeed,Math.abs(b.angularVelocity));}
   if(b.mumu.kind==='pillar'&&angle>.25)tilted.add(b.mumu.id);maxTilt=Math.max(maxTilt,angle);
  }
  for(const c of M.Composite.allConstraints(w.engine.world)){const ax=c.bodyA.position.x+c.pointA.x,ay=c.bodyA.position.y+c.pointA.y,bx=c.bodyB.position.x+c.pointB.x,by=c.bodyB.position.y+c.pointB.y;maxAnchorError=Math.max(maxAnchorError,Math.hypot(ax-bx,ay-by));}
  assert.ok(maxJointSpeed<1.5,'Hinge angular velocity became unstable.');assert.ok(maxAnchorError<5,'Hinge anchor drifted too far.');assert.ok(maxJointAngle<100,'Hinge accumulated an unrealistic number of rotations.');
  if(w.completed){assert.ok(drawCount>0);assert.ok(contacts>0);assert.equal(rescue,0);assert.equal(starEvents,l.stars.length);assert.equal(winEvents,1);assert.ok(w.stars.every(s=>s.collected));return{won:true,winTick:tick+1,drawCount,eraseCount,stars:starEvents,contacts,maxJointAngle,maxJointSpeed,maxAnchorError,tiltedPillars:tilted.size};}
 }
 return{won:false,drawCount,eraseCount,stars:starEvents,contacts,maxJointAngle,tiltedPillars:tilted.size,rescue};
}
const rows=[];let noInputCompletions=0;
for(let i=0;i<100;i++){
 const l=levels[i],cert=certificates[i];assert.equal(l.id,i);assert.equal(cert.stage,i+1);assert.equal(cert.source,l.source);assert.equal(cert.dataHash,hash(JSON.stringify(l)));assert.equal(cert.physicsHash,physicsHash);
 assert.ok(l.title&&l.hint&&l.mission.length===2&&l.artNote);assert.ok(l.stars.length>=1&&l.stars.length<=5);assert.equal(l.bodies.filter(b=>b.special==='da_ball').length,1);
 for(const s of l.stars)assert.ok(s.x>=24&&s.x<=776&&s.y>=24&&s.y<=576);
 assert.ok(cert.actions.every((a,j)=>Number.isInteger(a.at)&&a.at>=0&&(!j||a.at>=cert.actions[j-1].at)));
 const baseline=C.makeWorld(l);for(let t=0;t<1800;t++){C.step(baseline);if(baseline.completed){noInputCompletions++;break;}}
 assert.ok(!baseline.completed,'No page may finish without drawing.');
 const result=replay(l,cert);assert.ok(result.won,'Stage '+(i+1)+' did not complete.');
 if([4,5,9].includes(l.chapter))assert.ok(result.maxJointAngle>.1,'The hinge must actually move.');
 if(l.chapter===3)assert.ok(result.tiltedPillars>=2,'The domino chain must tip more than one crayon.');
 const perturbations=[-.6,.6].map(j=>{try{return replay(l,cert,j).won}catch{return false}});
 rows.push({stage:i+1,title:l.title,chapter:l.chapter+1,...result,perturbationsPassed:perturbations.filter(Boolean).length});
 console.log(JSON.stringify({stage:i+1,won:result.won,draws:result.drawCount,jitter:perturbations.filter(Boolean).length}));
}
const report={at:new Date().toISOString(),levels:100,chapters:10,distinctLayouts:100,completions:rows.filter(r=>r.won).length,noInputCompletions,physicsHash,sourceHash:hash(fs.readFileSync(path.join(root,'src/campaign-levels.js'))),method:'Fixed 60Hz physics; player-visible drawing and erasing only. No player transforms, star edits, win flags or rescue-based solutions.',checks:{allStarsCollected:true,allCompositionsUnique:true,allTitlesUnique:true,noSpawningDrawingsInsidePlayer:true,allDrawingsInCanvas:true,hingesActuallyMove:true,hingeSpeedAndAnchorErrorBounded:true,dominoChainsActuallyTip:true},rows};
fs.writeFileSync(path.join(root,'qa/campaign-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({complete:report.completions,total:report.levels,chapters:10,perturbationChecks:rows.reduce((n,r)=>n+r.perturbationsPassed,0)+'/200'}));
