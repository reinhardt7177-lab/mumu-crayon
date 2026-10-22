/* Original gameplay rules live here; UI and painting are separate. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('../vendor/matter.min.js'));
  else root.MumuCore=factory(root.Matter);
})(typeof globalThis!=='undefined'?globalThis:this,function(M){
  'use strict';
  const SCALE=32, STEP=1000/60;
  function makeWorld(level, callbacks={}){
    const engine=M.Engine.create({positionIterations:10,velocityIterations:10,constraintIterations:10,enableSleeping:false});
    engine.gravity.x=level.gravity.x/10; engine.gravity.y=level.gravity.y/10; engine.gravity.scale=.00032;
    const world={engine,level,ball:null,drawings:[],stars:level.stars.map(s=>({...s,collected:false})),tick:0,completed:false,contacts:0,callbacks,nextDrawing:1};
    const ids=new Map();
    for(const d of level.bodies){
      const options={isStatic:d.static,angle:d.angle,friction:d.friction,frictionStatic:1,frictionAir:0,restitution:0,slop:.025};
      // Bodies.circle caps its sides at the radius (24 here), which made the red
      // ring catch on facets. A 96-sided convex body rolls smoothly at this scale.
      const body=d.shape===1?M.Bodies.polygon(d.x,d.y,96,d.width/2,{...options,circleRadius:d.width/2}):M.Bodies.rectangle(d.x,d.y,d.width,d.height,options);
      body.mumu={...d,removable:Boolean(d.removable),seed:d.id*383,width:d.width,height:d.height};
      if(!d.static) {M.Body.setMass(body,d.mass);M.Body.setInertia(body,d.mass*(d.width*d.width+d.height*d.height)/12); M.Body.setVelocity(body,{x:d.vx,y:d.vy}); M.Body.setAngularVelocity(body,d.angularVelocity);}
      M.Composite.add(engine.world,body); ids.set(d.id,body);
      if(d.removable) world.drawings.push(body);
      if(d.special==='da_ball') world.ball=body;
    }
    for(const d of level.joints){
      const a=ids.get(d.a),b=ids.get(d.b);
      if(!a||!b) throw new Error('Missing joint body');
      // XML anchors rotate with the original bodies; Matter expects current world-oriented offsets.
      const rotate=(p,t)=>({x:p.x*Math.cos(t)-p.y*Math.sin(t),y:p.x*Math.sin(t)+p.y*Math.cos(t)});
      // End hinges have a large lever arm. Matter's positional constraint needs
      // lower stiffness with physical (unscaled) inertia to avoid adding energy.
      const leverage=(body,p)=>body.isStatic?0:(p.x*p.x+p.y*p.y)*body.inverseInertia/body.inverseMass;
      const arm=Math.max(leverage(a,d.pointA),leverage(b,d.pointB));
      const stiffness=arm>0?.75/(1+arm):.94;
      M.Composite.add(engine.world,M.Constraint.create({bodyA:a,bodyB:b,pointA:rotate(d.pointA,a.angle),pointB:rotate(d.pointB,b.angle),length:0,stiffness,damping:arm>0?.04:0,render:{visible:false}}));
    }
    if(!world.ball) throw new Error('Level has no player ball');
    world.spawn={position:{...world.ball.position},velocity:{...world.ball.velocity},angularVelocity:world.ball.angularVelocity};
    M.Events.on(engine,'collisionStart',e=>{
      world.contacts+=e.pairs.length;
      for(const p of e.pairs) callbacks.collision?.(p);
    });
    return world;
  }
  function fitStroke(points){
    if(points.length<2) return null;
    const angles=[0];
    for(let i=1;i<points.length;i++){
      const dx=points[i].x-points[i-1].x,dy=points[i].y-points[i-1].y;
      if(dx*dx+dy*dy>16) angles.push(Math.atan2(dy,dx));
    }
    let best=null;
    for(const angle of angles){
      const c=Math.cos(angle),s=Math.sin(angle);
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      for(const p of points){const x=p.x*c+p.y*s,y=-p.x*s+p.y*c;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
      const width=Math.max(3,maxX-minX),height=Math.max(3,maxY-minY),area=width*height;
      if(!best||area<best.area){const x=(minX+maxX)/2,y=(minY+maxY)/2;best={x:x*c-y*s,y:x*s+y*c,width,height,angle,area};}
    }
    return best;
  }
  function addDrawing(world,rect,visual={}){
    if(!rect||rect.width<=.05*SCALE||rect.height<=.05*SCALE||rect.width>1600||rect.height>1200) return null;
    if(world.drawings.length>=80) {world.callbacks.limit?.();return null;}
    const body=M.Bodies.rectangle(rect.x,rect.y,rect.width,rect.height,{angle:rect.angle||0,friction:.2,frictionStatic:1,frictionAir:0,restitution:0,slop:.025});
    M.Body.setMass(body,2*(rect.width/SCALE)*(rect.height/SCALE));
    M.Body.setInertia(body,body.mass*(rect.width*rect.width+rect.height*rect.height)/12);
    body.mumu={kind:'drawing',special:'removeable',removable:true,width:rect.width,height:rect.height,color:visual.color||'#477d9a',seed:world.nextDrawing++*827,stroke:visual.stroke||null,penWidth:visual.penWidth||4};
    M.Composite.add(world.engine.world,body);world.drawings.push(body);
    return body;
  }
  function addFreehand(world,points,visual={}){
    if(points.length<3) return null;
    const rect=fitStroke(points);if(!rect) return null;
    // A single ruled stroke is a beam. Its visible nib must have real thickness;
    // otherwise an apparently solid bridge weighs almost nothing and slides out.
    const thickness=visual.penWidth?Math.max(3,visual.penWidth+3):3;
    if(rect.width>rect.height*6)rect.height=Math.max(rect.height,thickness);
    else if(rect.height>rect.width*6)rect.width=Math.max(rect.width,thickness);
    const c=Math.cos(-rect.angle),s=Math.sin(-rect.angle);
    const stroke=points.map(p=>{const x=p.x-rect.x,y=p.y-rect.y;return {x:x*c-y*s,y:x*s+y*c};});
    return addDrawing(world,rect,{...visual,stroke});
  }
  function removeDrawing(world,body){
    if(!body?.mumu?.removable) return false;
    M.Composite.remove(world.engine.world,body);
    world.drawings=world.drawings.filter(b=>b!==body);
    return true;
  }
  function eraseAt(world,p){
    const hits=M.Query.point(world.drawings,p);
    return hits.length&&removeDrawing(world,hits[hits.length-1])?hits[hits.length-1]:null;
  }
  function collect(world){
    const first=world.stars.find(s=>!s.collected);
    if(!first||world.completed) return;
    const radius=world.ball.mumu.width/2+first.radius;
    for(const s of world.stars){
      if(s.collected)continue;
      const dx=world.ball.position.x-s.x,dy=world.ball.position.y-s.y;
      if(dx*dx+dy*dy<radius*radius){s.collected=true;world.callbacks.star?.(s);}
    }
    if(world.stars.every(s=>s.collected)){world.completed=true;world.callbacks.complete?.();}
  }
  function step(world){
    M.Engine.update(world.engine,STEP);world.tick++;collect(world);
    if(world.tick%101===0){
      if(world.ball.position.y>500+15*SCALE){
        M.Body.setPosition(world.ball,world.spawn.position);M.Body.setVelocity(world.ball,world.spawn.velocity);M.Body.setAngularVelocity(world.ball,world.spawn.angularVelocity);
        world.callbacks.rescue?.();
      }
      for(const body of [...M.Composite.allBodies(world.engine.world)]){
        if(body!==world.ball&&!body.isStatic&&body.position.y>500+30*SCALE){
          M.Composite.remove(world.engine.world,body,true);world.drawings=world.drawings.filter(b=>b!==body);
        }
      }
    }
  }
  return {makeWorld,fitStroke,addDrawing,addFreehand,eraseAt,removeDrawing,step,SCALE,STEP};
});
