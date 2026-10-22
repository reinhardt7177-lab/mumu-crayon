/* One pointer stream for mouse, pen and touch. Coordinates stay in the paper. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.MumuCanvasInput=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function bind(canvas,options){
    let active=null,stroke=null;
    const preview=()=>options.preview?.(stroke);
    function point(event,clamp=false){
      const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/options.width,r.height/options.height);
      const p={x:(event.clientX-r.left-(r.width-options.width*scale)/2)/scale,y:(event.clientY-r.top-(r.height-options.height*scale)/2)/scale};
      return clamp?{x:Math.max(0,Math.min(options.width,p.x)),y:Math.max(0,Math.min(options.height,p.y))}:p;
    }
    function release(id){
      if(id!==null&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);
    }
    function cancel(){const id=active;active=null;stroke=null;release(id);preview();}
    function append(event){
      const p=point(event,true),last=stroke.points[stroke.points.length-1];
      if(Math.hypot(p.x-last.x,p.y-last.y)>.7)stroke.points.push(p);
    }
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{
      if(!options.enabled()||e.isPrimary===false)return;
      const p=point(e);
      if(p.x<0||p.x>options.width||p.y<0||p.y>options.height)return;
      if(e.button===2){e.preventDefault();options.erase(p);return;}
      if(e.button!==0||active!==null)return;
      e.preventDefault();canvas.focus({preventScroll:true});
      active=e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      const style=options.style();
      stroke={points:[p],...style,pointerType:e.pointerType||'mouse'};
      if(stroke.tool==='erase')options.erase(p);else options.begin?.();
      preview();
    },{passive:false});
    canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==active||!stroke)return;
      e.preventDefault();
      if(stroke.tool==='erase')options.erase(point(e,true));
      else{const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e])append(sample);}
      preview();
    },{passive:false});
    canvas.addEventListener('pointerup',e=>{
      if(e.pointerId!==active||!stroke)return;
      e.preventDefault();append(e);
      const done=stroke,id=active;active=null;stroke=null;release(id);preview();
      // A quick finger swipe can arrive with only a start and end sample.
      if(done.tool==='physics'&&done.points.length===2){
        const [a,b]=done.points;done.points.splice(1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});
      }
      if(done.tool!=='erase')options.commit(done);
    },{passive:false});
    canvas.addEventListener('pointercancel',e=>{if(e.pointerId===active)cancel();});
    canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===active)cancel();});
    return{cancel};
  }
  return{bind};
});
