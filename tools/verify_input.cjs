'use strict';
// Touch PointerEvent fixtures exercise the shipping input controller and Matter
// world. These are event/physics integration checks, not physical-phone tests.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Input=require('../src/canvas-input.js'),Core=require('../src/core.js');
const {levels}=require('../src/campaign-levels.js');
class Canvas extends EventTarget{
  constructor(width){super();this.rect={left:8,top:130,width,height:width*.75};this.capture=new Set();}
  getBoundingClientRect(){return this.rect;}
  focus(){}
  setPointerCapture(id){this.capture.add(id);}
  hasPointerCapture(id){return this.capture.has(id);}
  releasePointerCapture(id){this.capture.delete(id);}
  send(type,x,y,extra={}){
    const e=new Event(type,{cancelable:true});
    Object.assign(e,{clientX:this.rect.left+x*this.rect.width/800,clientY:this.rect.top+y*this.rect.height/600,pointerId:1,pointerType:'touch',button:0,isPrimary:true,...extra});
    this.dispatchEvent(e);return e;
  }
}
const rows=[];
for(const width of [320,344,374,414,360]){
  const canvas=new Canvas(width),w=Core.makeWorld(levels[0]);
  let tool='box',commits=0,preview=null,touchCommits=0,erasures=0;
  const input=Input.bind(canvas,{width:800,height:600,enabled:()=>true,style:()=>({tool,color:'#c67d66',width:5}),
    preview:s=>{preview=s;},erase:p=>{if(Core.eraseAt(w,p))erasures++;},commit:s=>{
      commits++;if(s.pointerType==='touch')touchCommits++;
      if(s.tool==='box'){const a=s.points[0],b=s.points.at(-1);Core.addDrawing(w,{x:(a.x+b.x)/2,y:(a.y+b.y)/2,width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y),angle:0});}
      else Core.addFreehand(w,s.points,{penWidth:5});
    }});
  const drag=(a,b)=>{canvas.send('pointerdown',...a);canvas.send('pointermove',...b);canvas.send('pointerup',...b);};
  // Drawing and erasing a body by tapping the dedicated eraser.
  drag([470,75],[530,125]);assert.equal(w.drawings.length,1);
  tool='erase';canvas.send('pointerdown',500,100);canvas.send('pointerup',500,100);
  assert.equal(w.drawings.length,0);assert.equal(erasures,1);
  // Freehand beam, followed by erasing while moving a finger across it.
  tool='physics';drag([300,180],[450,210]);assert.equal(w.drawings.length,1);
  tool='erase';drag([375,100],[375,195]);assert.equal(w.drawings.length,0);
  // A second finger cannot create a second stroke or cancel the first.
  tool='box';canvas.send('pointerdown',100,60);
  canvas.send('pointerdown',700,80,{pointerId:2,isPrimary:false});
  canvas.send('pointercancel',700,80,{pointerId:2,isPrimary:false});
  assert.ok(preview);canvas.send('pointercancel',100,60);assert.equal(preview,null);
  const count=commits;canvas.send('pointerup',150,110);assert.equal(commits,count);
  // Rotation/focus loss uses cancel; capture loss must also leave no phantom body.
  canvas.send('pointerdown',100,60);input.cancel();canvas.send('pointerup',180,130);assert.equal(commits,count);
  canvas.send('pointerdown',100,60);canvas.send('lostpointercapture',110,70);assert.equal(preview,null);
  // Out-of-paper movement is clamped; no huge body can be created off screen.
  drag([700,20],[1200,-200]);assert.equal(w.drawings.length,1);
  const clipped=w.drawings[0];assert.ok(Math.abs(clipped.mumu.width-100)<1e-6);assert.ok(Math.abs(clipped.mumu.height-20)<1e-6);
  Core.removeDrawing(w,clipped);
  for(let i=0;i<180;i++)Core.step(w);
  // Draw the known first-page solution through touch coordinates, then simulate.
  const start=canvas.send('pointerdown',130,325);assert.ok(start.defaultPrevented);
  canvas.send('pointermove',162,455);canvas.send('pointerup',162,455);
  for(let i=0;i<700&&!w.completed;i++)Core.step(w);
  assert.ok(w.completed,'Touch-produced rectangle must collide, roll the ring and collect the star.');
  assert.equal(w.stars.filter(s=>s.collected).length,1);assert.equal(touchCommits,commits);
  rows.push({canvasWidth:width,draw:true,beam:true,eraseTap:true,eraseDrag:true,secondFingerIgnored:true,cancel:true,lostCapture:true,clamped:true,star:true,complete:true});
}
const report={at:new Date().toISOString(),method:'Synthetic touch PointerEvents through production controller + production Matter world; no physical device or native browser touch injection.',rows};
fs.mkdirSync(path.join(__dirname,'../qa'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'../qa/mobile-touch-input.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({touchInputCases:rows.length,passed:true,physicalPhoneTest:false}));
