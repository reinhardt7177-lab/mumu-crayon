/* Mumu Crayon — original canvas artwork and a small physics sketchbook. */
(function(){
'use strict';
const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d'),M=Matter,C=MumuCore;
const W=800,H=600;
const A=MumuArt,bitmapReady=A.ready;
const colors=[['코랄','#c67d66'],['햇살','#d8b458'],['풀잎','#85a17b'],['바다','#6d9ea1'],['남색','#677f9c'],['라일락','#a192af'],['살구','#dfb391'],['연필','#646c65']];
const subtitles=['선 하나로 시작하는 작은 모험','작은 상상으로 건너는 틈','가벼움과 무거움 사이','나만의 길을 만드는 시간','조금 다른 시선으로 보는 숲','돌고 돌아 만나는 반짝임','모든 낙서가 하나의 이야기가 될 때'];
const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem('mumu-'+key))??fallback}catch{return fallback}},set(key,data){try{localStorage.setItem('mumu-'+key,JSON.stringify(data));return true}catch{return false}}};
let current=0,world,tool='box',color=colors[0][1],penWidth=5,stroke=null,art=[],history=[],particles=[],free=false,paused=false,audioOn=false,audio,clock=0,last=0,accumulator=0,winAt=0,seenWin=false,rescueNotice=0;
let canvasInput;
let demo=false,demoAction=0,demoDrawings=[],demoShownSecond=-1;
let completed=storage.get('campaign-completed-v1',[]),gallery=storage.get('gallery',[]);
if(!Array.isArray(completed))completed=[];completed=[...new Set(completed)].filter(n=>Number.isInteger(n)&&n>=0&&n<MUMU_LEVELS.length);
const dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.scale(dpr,dpr);
function random(seed){let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296}}
function icon(name){return '<svg><use href="#'+name+'"/></svg>'}
for(const [name,c]of colors){const b=document.createElement('button');b.className='crayon'+(c===color?' selected':'');b.style.setProperty('--color',c);b.title=name;b.setAttribute('aria-label',name+' 크레용');b.setAttribute('aria-pressed',String(c===color));b.onclick=()=>{color=c;document.querySelectorAll('.crayon').forEach(e=>{e.classList.toggle('selected',e===b);e.setAttribute('aria-pressed',String(e===b));});};$('palette').append(b);}
MumuNavigator.init(index=>load(index));
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function tone(freq,duration=.12,volume=.035,type='sine',delay=0){
  if(!audioOn)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.03);}catch{}
}
function sparkle(x,y,c='#d1ad4d',count=15){const r=random(Math.round(x*27+y*59+clock));for(let i=0;i<count;i++){const a=r()*Math.PI*2,s=r()*2.2+.3;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1.2,life:1,color:c,size:2+r()*4});}}
function status(){const n=world.stars.filter(s=>s.collected).length;$('starStatus').textContent=free?'자유그림':n+' / '+world.stars.length;$('undoBtn').disabled=history.length===0;}
function load(index,asFree=false,asDemo=false){
  index=Math.max(0,Math.min(MUMU_LEVELS.length-1,Number.isInteger(index)?index:0));
  if(world){M.Events.off(world.engine);M.Engine.clear(world.engine);}
  canvasInput?.cancel();
  current=index;free=asFree;demo=asDemo&&!asFree;demoAction=0;demoDrawings=[];demoShownSecond=-1;art=[];history=[];particles=[];stroke=null;paused=false;seenWin=false;winAt=0;accumulator=0;last=0;
  const level=asFree?{...MUMU_LEVELS[0],bodies:MUMU_LEVELS[0].bodies.filter(b=>b.static||b.special==='da_ball'),stars:[],joints:[]}:MUMU_LEVELS[index];
  world=C.makeWorld(level,{
    star:s=>{sparkle(s.x,s.y);tone(659,.25,.03);tone(880,.28,.025,'sine',.09);status();},
    complete:()=>{winAt=clock+1;if(!demo){completed=[...new Set([...completed,current])];if(!storage.set('campaign-completed-v1',completed))toast('진행을 저장하지 못했어요. 브라우저 저장 공간을 확인해주세요.');}refreshTabs();},
    collision:p=>{if(!p.bodyA.mumu?.removable&&!p.bodyB.mumu?.removable)return;const speed=Math.abs(p.bodyA.velocity.y-p.bodyB.velocity.y);if(speed>1.5&&clock-(tone.collisionAt||0)>.15){tone(100+speed*6,.07,.012,'triangle');tone.collisionAt=clock;}},
    rescue:()=>{if(clock-rescueNotice>2){toast('빨간 원이 다시 돌아왔어요. 다른 방법으로 그려볼까요?');rescueNotice=clock;}},
    limit:()=>toast('물체가 가득해요. 지우개로 조금 정리해보세요.')
  });
  if(asFree)world.completed=true;
  $('winCard').hidden=true;$('pageNumber').textContent=asFree?'∞':String(index+1).padStart(2,'0');$('levelTitle').textContent=asFree?'상상이 쉬어가는 페이지':level.title;$('chapterSubtitle').textContent=asFree?'오늘의 마음을 자유롭게 그려보세요':level.subtitle;$('hint').textContent=asFree?'목표 없이, 마음 가는 대로. 색연필로 풍경을 만들어보세요.':level.hint;$('modeLabel').textContent=asFree?'나만의 작은 세계':'빨간 원을 별까지 보내주세요';$('drawingTip').hidden=asFree||index!==0;$('pauseBtn').textContent='Ⅱ';$('pauseBtn').setAttribute('aria-label','물리 일시정지');
  document.body.classList.toggle('free-mode',asFree);$('freeBtn').innerHTML=asFree?'물리 퍼즐로 돌아갈래요 <span>↗</span>':'퍼즐 없이 자유롭게 그릴래요 <span>↗</span>';
  $('missionTitle').textContent=MUMU_LEVELS[index].mission[0];$('missionDescription').textContent=MUMU_LEVELS[index].mission[1];
  $('demoBtn').disabled=asFree||!window.MUMU_EXAMPLES?.[index];$('demoBtn').textContent=demo?'직접 해보기':'예시 재생';$('demoNotice').hidden=!demo;$('saveBtn').disabled=demo;$('decorateBtn').textContent=demo?'직접 그리기':'계속 꾸미기';
  refreshTabs();status();setTool(asFree?'art':'box');if(!asFree)storage.set('campaign-last-stage-v1',index);
}
function refreshTabs(){MumuNavigator.refresh(current,free,completed);}
function setTool(next){tool=next;for(const b of document.querySelectorAll('[data-tool]')){b.classList.toggle('selected',b.dataset.tool===tool);b.setAttribute('aria-pressed',String(b.dataset.tool===tool));}canvas.style.cursor=tool==='erase'?'cell':'crosshair';}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('penWidth').oninput=e=>{penWidth=Number(e.target.value);$('widthPreview').style.width=penWidth+'px';$('widthPreview').style.height=penWidth+'px';};
function lineDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
function erase(p){
  const body=C.eraseAt(world,p);
  if(body){sparkle(p.x,p.y,body.mumu.color,7);history=history.filter(h=>h.body!==body);tone(230,.045,.015);status();return true;}
  for(let i=art.length-1;i>=0;i--){const a=art[i];if(a.points.some((v,j)=>j?lineDistance(p,a.points[j-1],v)<a.width+8:Math.hypot(p.x-v.x,p.y-v.y)<a.width+8)){art.splice(i,1);history=history.filter(h=>h.art!==a);status();return true;}}
  return false;
}
function commitStroke(s){
  if(s.tool==='art'){const drawing={points:s.points,color:s.color,width:s.width,seed:art.length*773+3};art.push(drawing);history.push({art:drawing});tone(500,.035,.005);}
  else{
    let body=null;
    if(s.tool==='box'){const a=s.points[0],b=s.points[s.points.length-1],w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);if(w>=5&&h>=5)body=C.addDrawing(world,{x:(a.x+b.x)/2,y:(a.y+b.y)/2,width:w,height:h,angle:0},{color:s.color,penWidth:s.width});else toast('네모를 대각선으로 조금 더 크게 그려주세요.');}
    else{body=C.addFreehand(world,s.points,{color:s.color,penWidth:s.width});if(!body)toast('물리펜으로 조금 더 길게 그려주세요.');}
    if(body){history.push({body});tone(310,.08,.012,'triangle');}
  }
  status();
}
canvasInput=MumuCanvasInput.bind(canvas,{
  width:W,height:H,enabled:()=>!demo&&$('winCard').hidden,
  style:()=>({tool,color,width:penWidth}),erase,
  preview:s=>{stroke=s;},begin:()=>{$('drawingTip').hidden=true;},commit:commitStroke
});
window.addEventListener('blur',()=>canvasInput.cancel());
window.addEventListener('resize',()=>canvasInput.cancel());
$('undoBtn').onclick=()=>{const h=history.pop();if(h?.body)C.removeDrawing(world,h.body);if(h?.art)art=art.filter(a=>a!==h.art);status();};
$('resetBtn').onclick=()=>{load(current,free);toast('새 종이를 펼쳤어요. 다시 그려볼까요?');};
$('demoBtn').onclick=()=>{const keep=!demo&&(history.length||art.length);if(keep)saveArt();load(current,false,!demo);if(keep)toast('그리던 장면은 스케치북에 담았어요.');};
$('pauseBtn').onclick=()=>{paused=!paused;$('pauseBtn').textContent=paused?'▷':'Ⅱ';$('pauseBtn').setAttribute('aria-label',paused?'물리 재생':'물리 일시정지');toast(paused?'물리가 잠시 멈췄어요. 천천히 꾸며보세요.':'다시 움직여요.');};
$('soundBtn').onclick=()=>{audioOn=!audioOn;$('soundBtn').setAttribute('aria-pressed',String(audioOn));$('soundBtn').setAttribute('aria-label',audioOn?'소리 끄기':'소리 켜기');$('soundBtn').querySelector('i').hidden=audioOn;if(audioOn){tone(523,.25,.018);tone(784,.32,.012,'sine',.1);}};
$('decorateBtn').onclick=()=>{if(demo){load(current);return;}$('winCard').hidden=true;setTool('art');toast('이제 나만의 색으로 마무리해보세요.');};
$('nextBtn').onclick=()=>{if(current<MUMU_LEVELS.length-1)load(current+1);else MumuNavigator.open();};
$('freeBtn').onclick=()=>load(current,!free);
$('brand').onclick=e=>{e.preventDefault();load(0);};
function showDialog(id){$(id).showModal();}
for(const d of document.querySelectorAll('dialog')){d.querySelector('.close-dialog').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d&&!(e.clientX>d.getBoundingClientRect().left&&e.clientX<d.getBoundingClientRect().right&&e.clientY>d.getBoundingClientRect().top&&e.clientY<d.getBoundingClientRect().bottom))d.close();});}
$('missionBtn').onclick=()=>showDialog('missionDialog');document.querySelector('.close-dialog-button').onclick=()=>{$('missionDialog').close();setTool('art');};$('aboutBtn').onclick=()=>showDialog('aboutDialog');
$('quickHelpBtn').onclick=()=>showDialog('aboutDialog');
function saveArt(){
  if(demo)return false;
  const target=document.createElement('canvas');target.width=640;target.height=480;const cc=target.getContext('2d');cc.drawImage(canvas,0,0,640,480);
  const item={id:Date.now(),image:target.toDataURL('image/png'),title:free?'자유로운 상상':MUMU_LEVELS[current].title,date:new Date().toLocaleDateString('ko-KR')};
  const next=[item,...gallery];
  if(!storage.set('gallery',next)){const a=document.createElement('a');a.href=item.image;a.download='무무크레용-'+item.id+'.png';a.click();toast('스케치북이 가득해 현재 작품을 PNG로 내려받았어요.');return true;}
  gallery=next;$('galleryCount').textContent=gallery.length;toast('내 스케치북에 한 페이지를 담았어요.');tone(523,.17,.02);tone(784,.23,.015,'sine',.1);return true;
}
$('saveBtn').onclick=saveArt;
function showGallery(){
  const grid=$('galleryGrid');grid.replaceChildren();
  if(!gallery.length){const p=document.createElement('div');p.className='gallery-empty';p.textContent='아직 빈 스케치북이에요. 그림을 그리고 ‘작품 담기’를 눌러보세요.';grid.append(p);}
  for(const item of gallery){const f=document.createElement('figure');f.className='gallery-item';const img=document.createElement('img');img.src=item.image;img.alt=item.title+' 저장 작품';const caption=document.createElement('figcaption'),text=document.createElement('span'),b=document.createElement('button');text.textContent=item.title;b.textContent='PNG ↓';b.onclick=()=>{const a=document.createElement('a');a.href=item.image;a.download='무무크레용-'+item.id+'.png';a.click();};caption.append(text,b);f.append(img,caption);grid.append(f);}
  showDialog('galleryDialog');
}
$('galleryBtn').onclick=showGallery;$('galleryCount').textContent=gallery.length;
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement||document.querySelector('dialog[open]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('undoBtn').click();}
  else if(e.code==='Space'){e.preventDefault();$('resetBtn').click();}
  else if(e.key.toLowerCase()==='p')$('pauseBtn').click();
  else if(['1','2','3','4'].includes(e.key))setTool(['box','physics','art','erase'][Number(e.key)-1]);
  else if(e.key==='Escape'){$('winCard').hidden=true;canvasInput.cancel();}
});
function roughLine(...args){A.line(...args);}
function background(){A.background(ctx,world,free);}
function bodyArt(b){A.body(ctx,b);}
function mumu(b){A.ball(ctx,b);}
function star(s,i){A.star(ctx,s,i,clock);}
function drawStroke(s){if(s.tool==='box'){const a=s.points[0],b=s.points[s.points.length-1];ctx.save();ctx.fillStyle=s.color+'10';ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);ctx.restore();}else if(s.tool!=='erase')roughLine(ctx,s.points,s.color,s.width,43,.8);}
function render(){
 ctx.clearRect(0,0,W,H);background();
 for(const b of M.Composite.allBodies(world.engine.world).filter(b=>b!==world.ball))bodyArt(b);
 for(const a of art){
   if(!a.inkTexture){const xs=a.points.map(p=>p.x),ys=a.points.map(p=>p.y),pad=a.width*2+3;a.inkX=Math.min(...xs)-pad;a.inkY=Math.min(...ys)-pad;const image=document.createElement('canvas');image.width=Math.max(1,Math.ceil(Math.max(...xs)-a.inkX+pad));image.height=Math.max(1,Math.ceil(Math.max(...ys)-a.inkY+pad));const g=image.getContext('2d');g.translate(-a.inkX,-a.inkY);roughLine(g,a.points,a.color,a.width,a.seed);a.inkTexture=image;}
   ctx.drawImage(a.inkTexture,a.inkX,a.inkY);
 }
 world.stars.forEach((s,i)=>{if(!s.collected)star(s,i);});mumu(world.ball);if(stroke)drawStroke(stroke);
 for(const p of particles){ctx.save();ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.translate(p.x,p.y);ctx.rotate(p.life*3);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();}
}
function demonstrationStep(){
 const example=window.MUMU_EXAMPLES?.[current];if(!example)return;
 while(demoAction<example.actions.length&&example.actions[demoAction].at===world.tick){
  const a=example.actions[demoAction++];
  if(a.type==='draw'){
   setTool(Math.abs(a.rect.angle||0)>.001?'physics':'box');
   const r=a.rect,c=Math.cos(r.angle||0),s=Math.sin(r.angle||0),points=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([x,y])=>({x:r.x+x*r.width/2*c-y*r.height/2*s,y:r.y+x*r.width/2*s+y*r.height/2*c}));
   const b=Math.abs(r.angle||0)>.001?C.addFreehand(world,points,{color:'#a47b60',penWidth:4}):C.addDrawing(world,r,{color:'#a47b60',penWidth:4});demoDrawings.push(b);status();
  }else{
   setTool('erase');
   const b=a.bodyId?M.Composite.allBodies(world.engine.world).find(b=>b.mumu.id===a.bodyId):demoDrawings[a.drawingIndex];if(b)C.eraseAt(world,b.position);
  }
 }
}
function frame(time){
 const dt=last?Math.min((time-last)/1000,.1):0;last=time;clock+=dt;
 if(!paused&&(!world.completed||free)&&!document.hidden&&!document.querySelector('dialog[open]')){accumulator+=dt*1000;let steps=0;while(accumulator>=C.STEP&&steps<3){if(demo&&!world.completed)demonstrationStep();C.step(world);accumulator-=C.STEP;steps++;if(world.completed&&!free){accumulator=0;break;}}if(steps===3)accumulator=Math.min(accumulator,C.STEP);}
 if(demo&&Math.floor(world.tick/60)!==demoShownSecond){demoShownSecond=Math.floor(world.tick/60);$('demoNotice').textContent=world.completed?'예시 완료 · 이제 나만의 방법으로 그려보세요.':'예시 관찰 · '+demoShownSecond+'초 / 약 '+Math.ceil(window.MUMU_EXAMPLES[current].winTick/60)+'초 · 직접 해보기도 가능해요';}
 for(const p of particles){p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.vy+=dt*1.4;p.life-=dt*.9;}particles=particles.filter(p=>p.life>0);
 if(world.completed&&!free&&!seenWin&&clock>winAt){seenWin=true;const final=current===MUMU_LEVELS.length-1,all=completed.length===MUMU_LEVELS.length,chapterEnd=(current+1)%10===0;$('winTitle').textContent=demo?'이렇게도 풀 수 있어요.':all?'백 장의 정원이 완성됐어요!':final?'백 번째 종이 정원, 완성!':chapterEnd?'이 정원의 마지막 햇살!':'반짝! 해냈어요.';$('winText').textContent=demo?'이제 나만의 방법으로 그려볼까요?\n시범 재생은 완료 수에 기록되지 않아요.':all?'100페이지에 나만의 이야기를 남겼어요. 작품을 간직해볼까요?':final?'완성한 페이지 '+completed.length+' / 100\n목차에서 다른 정원도 펼쳐보세요.':chapterEnd?'한 챕터를 여행했어요. 다음 정원으로 가볼까요?':'이 장면에 나만의 색을 더해볼까요?';$('nextBtn').textContent=final?'목차 펼치기 →':'다음 페이지 →';$('winCard').hidden=false;tone(523,.4,.03);tone(659,.4,.025,'sine',.12);tone(784,.6,.025,'sine',.24);}
 render();requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;canvasInput.cancel();});
window.MumuGame={snapshot:()=>({level:current,total:MUMU_LEVELS.length,free,tool,paused,drawings:world.drawings.length,artStrokes:art.length,stars:world.stars.map(s=>({...s})),completed:world.completed,ball:{x:world.ball.position.x,y:world.ball.position.y},contacts:world.contacts,gallery:gallery.length}),version:'1.0.0'};
Promise.all([bitmapReady,document.fonts.ready]).then(()=>{load(storage.get('campaign-last-stage-v1',0));requestAnimationFrame(frame);});
})();
