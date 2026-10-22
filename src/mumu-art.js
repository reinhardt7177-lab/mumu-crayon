/* Original Mumu paper-garden art. No Crayon Physics bitmap or brush is used. */
(function(g){
'use strict';
const W=800,H=600,brushes=new Map(),pages=new Map();
const paper=new Image();
const ready=new Promise(resolve=>{paper.onload=resolve;paper.onerror=resolve;paper.src='assets/mumu/paper-garden-v1.png';});
function random(seed){let n=seed>>>0;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
function surface(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;}
function brush(color,variant){
 const key=color+variant;if(brushes.has(key))return brushes.get(key);
 const c=surface(36,36),x=c.getContext('2d'),r=random(1499+variant*859);
 // Independent wax nib: irregular pigment particles with open paper between them.
 for(let i=0;i<680;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*16,px=18+Math.cos(a)*d,py=18+Math.sin(a)*d;x.globalAlpha=(.08+r()*.44)*(1-d/24);x.fillStyle=color;x.fillRect(px,py,.6+r()*2.6,.4+r()*2);}
 brushes.set(key,c);return c;
}
function line(x,points,color,width=3,seed=1,alpha=1){
 if(!points.length)return;const r=random(seed);x.save();x.globalAlpha=alpha;
 const stamp=(a,b)=>{const nib=brush(color,Math.floor(r()*4)),s=width*2.1;x.save();x.translate(a+(r()-.5)*.7,b+(r()-.5)*.7);x.rotate(r()*Math.PI*2);x.drawImage(nib,-s/2,-s/2,s,s);x.restore();};
 stamp(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/Math.max(.8,width*.3)));for(let k=1;k<=n;k++)stamp(a.x+(b.x-a.x)*k/n,a.y+(b.y-a.y)*k/n);}
 x.restore();
}
const path=(pairs)=>pairs.map(p=>({x:p[0],y:p[1]}));
function circle(x,cx,cy,r,color,width,seed){const p=[];for(let i=0;i<=70;i++){const a=i/70*Math.PI*2;const radius=r+Math.sin(a*3+seed)*.45;p.push({x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius});}line(x,p,color,width,seed);}
function waxFill(x,p,color,seed,spacing=5){
 const xs=p.map(v=>v.x),ys=p.map(v=>v.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),r=random(seed);
 x.save();x.beginPath();p.forEach((v,i)=>i?x.lineTo(v.x,v.y):x.moveTo(v.x,v.y));x.closePath();x.clip();
 x.fillStyle=color;x.globalAlpha=.06;x.fillRect(left,top,right-left,bottom-top);x.globalAlpha=1;
 for(let y=top-20;y<bottom+25;y+=spacing)line(x,path([[left-12,y],[right+12,y-12+r()*5]]),color,3+r()*2,seed+Math.round(y*17),.48);
 x.restore();
}
function lettering(x,text,px,py,size=27,color='#57839d',angle=0){
 const c=surface(650,110),a=c.getContext('2d');a.font='700 '+size+'px CrayonHand';a.textBaseline='top';a.fillStyle=color;
 text.split('\n').forEach((s,i)=>a.fillText(s,6,i*size*1.12));
 const r=random(text.length*973+Math.round(px));a.globalCompositeOperation='destination-out';
 for(let i=0;i<2600;i++){a.globalAlpha=r()*.65;a.fillRect(r()*c.width,r()*c.height,.4+r()*1.8,.6+r()*1.4);}
 x.save();x.translate(px,py);x.rotate(angle);x.globalAlpha=.84;x.drawImage(c,-6,0);x.restore();
}
function arrow(x,p,color='#7d9c8b',seed=9){line(x,p,color,2.7,seed,.65);const b=p[p.length-1],a=p[p.length-2],t=Math.atan2(b.y-a.y,b.x-a.x);line(x,[{x:b.x-Math.cos(t-.55)*13,y:b.y-Math.sin(t-.55)*13},b,{x:b.x-Math.cos(t+.55)*13,y:b.y-Math.sin(t+.55)*13}],color,2.7,seed+1,.65);}
const notes=[
 ['조그만 힘으로,\n커다란 산책.',335,105,36,-.06],
 ['빈 곳에도\n길을 그릴 수 있어.',310,118,34,.035],
 ['이쪽에 한 조각,\n저쪽에 한 조각.',340,105,32,-.04],
 ['느긋하게 내려오는\n선 하나의 여행.',300,62,31,.035],
 ['하나가 톡,\n다음 것도 톡.',345,110,35,-.035],
 ['빙글,\n바람을 그리는 날.',355,105,34,.03],
 ['여기저기 흩어진 빛을\n한 장의 그림으로.',365,160,30,-.035]
];
function page(world,free){
 const key=free?'free':world.level.source;if(pages.has(key)){const page=pages.get(key);pages.delete(key);pages.set(key,page);return page;}
 const c=surface(W,H),x=c.getContext('2d');x.fillStyle='#f8edca';x.fillRect(0,0,W,H);
 if(paper.naturalWidth)x.drawImage(paper,0,0,W,H);
 x.fillStyle='#fffbdf';x.globalAlpha=.17;x.fillRect(0,0,W,H);x.globalAlpha=1;
 if(free){lettering(x,'오늘은 어떤 색의 하루였나요?',42,36,24,'#8e956f',-.025);}
 else{
  lettering(x,world.level.poem||world.level.title,305,68,28,'#5b8498',-.035);
  lettering(x,world.level.chapterTitle+' · '+String(world.level.id+1).padStart(3,'0'),34,29,18,'#9b9777',-.025);
  if(world.level.id===0){lettering(x,'네모를 떨어뜨려\n빨간 원을 톡!',53,166,27,'#a98161',-.07);arrow(x,path([[117,239],[140,257],[157,289],[164,325]]));lettering(x,'햇살 한 조각',535,415,23,'#9d9855',.04);}
  else lettering(x,world.level.artNote,305,110,20,'#928e68',-.02);
 }
 // Small marginal seed marks are drawings, outside the playable ground surface.
 for(let i=0;i<6;i++){const px=30+i*21;line(x,path([[px,592],[px+3,574-i%2*6]]),'#829b6a',2.5,77+i,.65);line(x,path([[px+2,581],[px-5,576]]),'#829b6a',2.7,99+i,.7);}
 lettering(x,'무무의 종이 정원',625,568,18,'#a19172',-.045);
 pages.set(key,c);if(pages.size>4)pages.delete(pages.keys().next().value);return c;
}
function background(x,world,free){x.drawImage(page(world,free),0,0);}
function body(x,b){
 const d=b.mumu;if(!d||d.kind==='mumu')return;
 if(b.isStatic&&(b.bounds.max.y<0||b.bounds.min.y>610))return;
 if(!d.inkTexture){
  const w=d.width,h=d.height,c=surface(w+24,h+24),a=c.getContext('2d');a.translate(c.width/2,c.height/2);
  const p=path([[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2],[-w/2,-h/2]]);
  if(d.kind==='drawing')line(a,d.stroke||p,d.color,d.penWidth,d.seed,.94);
  else if(d.kind==='platform'){
   const ink=d.tint||'#84976a';waxFill(a,p,ink,d.seed,5.5);line(a,p,ink,2.4,d.seed+44,.7);line(a,path([[-w/2,-h/2],[w/2,-h/2]]),ink,3.7,d.seed+2,.95);
  }else if(d.kind==='plank'){
   waxFill(a,p,'#bd855e',d.seed,3);line(a,p,'#aa7958',3,d.seed,.95);line(a,path([[-w/2+8,0],[w/2-8,-1]]),'#d5a25f',2,d.seed+8,.7);
   if(d.pinned){circle(a,d.pinAt?.x||0,d.pinAt?.y||0,4,'#6e91a0',2.5,d.seed+7);}
  }else{
   const ink=d.tint||'#819db1';waxFill(a,p,ink,d.seed,4);line(a,p,ink,3.4,d.seed,.95);
   const band=Math.min(40,h*.24),y=-h*.12;
   waxFill(a,path([[-w/2+3,y-band/2],[w/2-3,y-band/2],[w/2-3,y+band/2],[-w/2+3,y+band/2]]),'#e0af67',d.seed+11,3);
   line(a,path([[-w/2+3,y-band/2],[w/2-3,y-band/2]]),'#a88d63',1.5,d.seed+3,.65);
   line(a,path([[-w/2+3,y+band/2],[w/2-3,y+band/2]]),'#a88d63',1.5,d.seed+5,.65);
   line(a,path([[-w/2+4,-h/2+18],[0,-h/2+3],[w/2-4,-h/2+18]]),ink,2.2,d.seed+7,.8);
  }
  d.inkTexture=c;
 }
 x.save();x.translate(b.position.x,b.position.y);x.rotate(b.angle);x.drawImage(d.inkTexture,-d.inkTexture.width/2,-d.inkTexture.height/2);x.restore();
}
let ballTexture;
function ball(x,b){
 if(!ballTexture){ballTexture=surface(66,66);circle(ballTexture.getContext('2d'),33,33,24,'#cf6852',4.4,741);}
 x.save();x.translate(b.position.x,b.position.y);x.rotate(b.angle);x.drawImage(ballTexture,-33,-33);x.restore();
}
let starTexture;
function star(x,s,i,time){
 if(!starTexture){starTexture=surface(76,76);const a=starTexture.getContext('2d'),p=[];for(let j=0;j<=10;j++){const t=-Math.PI/2+j/10*Math.PI*2,r=j%2?12:26;p.push({x:38+Math.cos(t)*r,y:38+Math.sin(t)*r});}waxFill(a,p,'#d5ad3f',121,2.3);line(a,p,'#9b914f',3,222,.95);}
 x.save();x.translate(s.x,s.y);x.rotate(Math.sin(time*1.7+i)*.055);x.drawImage(starTexture,-38,-38);x.restore();
}
g.MumuArt={ready,line,background,body,ball,star};
})(window);
