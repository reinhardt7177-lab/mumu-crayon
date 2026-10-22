/* 10 chapters, 100 pages. The picker never changes or clears saved artwork. */
(function(g){
'use strict';
const $=id=>document.getElementById(id),levels=g.MUMU_LEVELS,chapters=g.MUMU_CHAPTERS;
let onSelect,current=0,free=false,completed=[],browsing=0;
function button(label,cls,click){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=click;return b;}
function select(index){$('stagesDialog').close();onSelect(index);}
function renderMap(){
 $('chapterMap').replaceChildren();
 for(const c of chapters){const done=completed.filter(n=>n>=c.start&&n<=c.end).length,b=button(String(c.id+1).padStart(2,'0')+' '+c.title+' · '+done+'/10','chapter-choice'+(browsing===c.id?' active':''),()=>{browsing=c.id;$('stageSearch').value='';renderMap();});b.setAttribute('aria-pressed',String(browsing===c.id));$('chapterMap').append(b);}
 const query=$('stageSearch').value.trim().toLocaleLowerCase(),list=query?levels.filter(l=>String(l.id+1)===query||l.title.toLocaleLowerCase().includes(query)||l.chapterTitle.includes(query)):levels.filter(l=>l.chapter===browsing);
 $('mapChapterTitle').textContent=query?'찾은 페이지 · '+list.length+'개':chapters[browsing].title+' · '+(browsing*10+1)+'–'+(browsing*10+10);
 $('stageGrid').replaceChildren();
 for(const l of list){const b=button('','stage-choice'+(completed.includes(l.id)?' cleared':'')+(current===l.id&&!free?' selected':''),()=>select(l.id)),n=document.createElement('strong'),title=document.createElement('span'),status=document.createElement('small');n.textContent=String(l.id+1).padStart(3,'0');title.textContent=l.title;status.textContent=completed.includes(l.id)?'✓ 완성한 페이지':'☆ '.repeat(l.stars.length).trim();b.append(n,title,status);b.setAttribute('aria-label',(l.id+1)+'스테이지 '+l.title+(completed.includes(l.id)?' 완료':''));b.setAttribute('aria-current',current===l.id&&!free?'page':'false');$('stageGrid').append(b);}
 if(!list.length){const p=document.createElement('p');p.textContent='페이지 번호나 다른 제목으로 찾아보세요.';$('stageGrid').append(p);}
 $('mapProgress').textContent=completed.length+' / '+levels.length+' 페이지 완성';
}
function refresh(index,asFree,done){
 current=index;free=asFree;completed=[...new Set(done)].filter(n=>Number.isInteger(n)&&n>=0&&n<levels.length);
 const chapter=levels[index].chapter;
 $('chapterSelect').value=String(chapter);$('chapterSelect').disabled=asFree;
 $('levelTabs').replaceChildren();
 for(const l of levels.filter(l=>l.chapter===chapter)){const b=button(String(l.id+1),'level-tab'+(!free&&l.id===index?' current':'')+(completed.includes(l.id)?' done':''),()=>onSelect(l.id));b.title=l.title;b.setAttribute('aria-label',(l.id+1)+'스테이지 '+l.title);b.setAttribute('aria-pressed',String(!free&&l.id===index));$('levelTabs').append(b);}
 $('prevPageBtn').disabled=asFree||index===0;$('nextPageBtn').disabled=asFree||index===levels.length-1;
 $('stageCounter').textContent=asFree?'자유 그림':(index+1)+' / '+levels.length;
 $('progressCount').textContent=completed.length+'/'+levels.length;
 $('stagesBtn').setAttribute('aria-label','스테이지 목차 · '+levels.length+'개 중 '+completed.length+'개 완료');
 if($('stagesDialog').open)renderMap();
}
function init(callback){
 onSelect=callback;
 for(const c of chapters){const o=document.createElement('option');o.value=c.id;o.textContent=String(c.id+1).padStart(2,'0')+' '+c.title;$('chapterSelect').append(o);}
 $('chapterSelect').onchange=()=>onSelect(chapters[Number($('chapterSelect').value)].start);
 $('prevPageBtn').onclick=()=>onSelect(Math.max(0,current-1));$('nextPageBtn').onclick=()=>onSelect(Math.min(levels.length-1,current+1));
 $('stagesBtn').onclick=open;$('stageSearch').oninput=renderMap;
}
function open(){browsing=levels[current].chapter;$('stageSearch').value='';renderMap();$('stagesDialog').showModal();}
g.MumuNavigator={init,refresh,open};
})(window);
