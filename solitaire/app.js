import {SUITS,SUIT_NAMES,rankName,rank,suit,red,newGame,validGame,selectionCards,canMove,moveCards,dealStock,hint} from './engine.js';
'use strict';
const $ = id=>document.getElementById(id);
const SAVE_KEY='mygames-solitaire-state-v1', WINS_KEY='mygames-solitaire-wins-v1';
const tableauEl=$('tableau'), statusEl=$('status'), foundations=[...document.querySelectorAll('.foundation')];
const read=(key)=>{try{return localStorage.getItem(key);}catch{return null;}};
const write=(key,value)=>{try{localStorage.setItem(key,value);}catch(e){console.warn('Storage unavailable:',e);}};
let wins=Math.max(0,Number.parseInt(read(WINS_KEY)||'0',10)||0);
function load(){
  try{
    const data=JSON.parse(read(SAVE_KEY));
    if(data && validGame(data.game) && Array.isArray(data.past)){
      const past=data.past.filter(x=>typeof x==='string' && x.length<5000).slice(-70);
      return {game:data.game,past};
    }
  }catch{}
  return {game:newGame(),past:[]};
}
let {game,past}=load(), selected=null, hintFrom=null, suppressClick=false;
function store(){
  write(SAVE_KEY,JSON.stringify({game,past}));
}
function say(message){statusEl.textContent=message;}
function selectionEquals(a,b){
  if(!a||!b||a.kind!==b.kind)return false;
  if(a.kind==='tableau')return a.column===b.column && a.index===b.index;
  if(a.kind==='foundation')return a.suit===b.suit;
  return true;
}
function getCardWidth(){return Math.min(70, (window.innerWidth-34)/7-2);}
function getFaceStep(){return window.innerWidth>=500?27:Math.min(26,Math.max(17,window.innerWidth*.05));}
function getBackStep(){return window.innerWidth>=500?16:Math.min(14,Math.max(10,window.innerWidth*.028));}
function sourceFrom(el){
  if(!el||!el.dataset.source)return null;
  const kind=el.dataset.source;
  if(kind==='waste')return {kind};
  if(kind==='foundation')return {kind,suit:Number(el.dataset.suit)};
  if(kind==='tableau')return {kind,column:Number(el.dataset.column),index:Number(el.dataset.index)};
  return null;
}
function destinationFrom(el){
  const pile=el?.closest('[data-dest]');
  if(!pile)return null;
  const kind=pile.dataset.dest;
  if(kind==='tableau')return {kind,column:Number(pile.dataset.column)};
  if(kind==='foundation')return {kind,suit:Number(pile.dataset.suit)};
  return null;
}
function makeCard(id,up,from){
  const button=document.createElement('button');
  button.type='button';
  button.className='card'+(up?(red(id)?' red':''):' back');
  button.dataset.cardId=String(id);
  if(up){
    button.setAttribute('aria-label',rankName(id)+' '+SUIT_NAMES[suit(id)]);
    const label=document.createElement('span');label.className='corner';label.textContent=rankName(id)+SUITS[suit(id)];
    const large=document.createElement('span');large.className='large-suit';large.textContent=SUITS[suit(id)];
    const lower=document.createElement('span');lower.className='lower';lower.textContent=rankName(id);
    button.append(label,large,lower);
    button.dataset.source=from.kind;
    if(from.kind==='tableau'){button.dataset.column=String(from.column);button.dataset.index=String(from.index);}
    if(from.kind==='foundation')button.dataset.suit=String(from.suit);
    if(selectionEquals(selected,from))button.classList.add('selected');
    if(selectionEquals(hintFrom,from))button.classList.add('hint');
  }else{
    button.tabIndex=-1;
    button.setAttribute('aria-label','Закрытая карта');
    button.textContent='✥';
    button.disabled=true;
  }
  return button;
}
function paint(){
  $('moves').textContent=String(game.moves);
  $('score').textContent=String(game.score);
  $('wins').textContent=String(wins);
  $('placed').textContent=String(game.foundations.reduce((total,pile)=>total+pile.length,0))+'/52';
  $('undo').disabled=!past.length||game.won;
  $('auto').disabled=game.won;
  $('hint').disabled=game.won;
  const stock=$('stock');
  stock.replaceChildren();stock.classList.toggle('empty',!game.stock.length);
  stock.disabled=!game.stock.length&&!game.waste.length;
  if(game.stock.length){
    const back=document.createElement('span');
    back.className='card back';back.textContent='✥';
    stock.appendChild(back);
    const count=document.createElement('span');count.className='card-label';count.textContent=String(game.stock.length);
    stock.appendChild(count);stock.setAttribute('aria-label','Взять карту, осталось '+game.stock.length);
  }else if(game.waste.length){stock.textContent='↻';stock.setAttribute('aria-label','Перевернуть сброс обратно в колоду');}
  else{stock.textContent='—';stock.setAttribute('aria-label','Колода пуста');}
  const waste=$('waste');waste.replaceChildren();
  if(game.waste.length)waste.appendChild(makeCard(game.waste[game.waste.length-1],true,{kind:'waste'}));
  for(let s=0;s<4;s++){
    const f=foundations[s];f.replaceChildren();
    const ids=game.foundations[s];
    if(ids.length)f.appendChild(makeCard(ids[ids.length-1],true,{kind:'foundation',suit:s}));
    else f.textContent=SUITS[s];
  }
  const fragment=document.createDocumentFragment();
  for(let c=0;c<7;c++){
    const col=document.createElement('div');col.className='tableau-col';col.dataset.dest='tableau';col.dataset.column=String(c);
    col.setAttribute('aria-label','Столбец '+(c+1));
    const pile=game.tableau[c];
    if(!pile.length)col.classList.add('empty');
    let top=0;const faceStep=getFaceStep(),backStep=getBackStep();
    for(let idx=0;idx<pile.length;idx++){
      const card=pile[idx],el=makeCard(card.id,card.up,{kind:'tableau',column:c,index:idx});
      el.style.top=top+'px';el.style.zIndex=String(idx+1);
      col.appendChild(el);
      if(idx<pile.length-1)top+=card.up?faceStep:backStep;
    }
    col.style.minHeight=pile.length?Math.max(230,top+getCardWidth()*1.48)+'px':'';
    fragment.appendChild(col);
  }
  tableauEl.replaceChildren(fragment);
  $('victory').hidden=!game.won;
}
function remember(){
  past.push(JSON.stringify(game));
  if(past.length>70)past.shift();
}
function captureCardPositions(ids) {
  const result=new Map();
  for (const id of ids) {
    const el=document.querySelector('[data-card-id="'+id+'"]');
    if (el) result.set(String(id),el.getBoundingClientRect());
  }
  return result;
}
function animateFromPrevious(previous, ids, originRect=null) {
  // FLIP: preserve intuitive physical card movement even though the tableau is re-rendered.
  if (!('animate' in Element.prototype) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const [index,id] of ids.entries()) {
    const el=document.querySelector('[data-card-id="'+id+'"]');
    const old=previous.get(String(id)) || originRect;
    if (!el || !old) continue;
    const next=el.getBoundingClientRect();
    const dx=old.left-next.left, dy=old.top-next.top;
    const delay=index*28;
    el.style.zIndex='2000';
    el.animate(
      [{transform:'translate('+dx+'px,'+dy+'px) scale(.96)',opacity:.82},
       {transform:'translate(0,0) scale(1)',opacity:1}],
      {duration:310+delay,delay,easing:'cubic-bezier(.18,.72,.19,1.02)'}
    ).finished.catch(()=>{}).finally(()=>{if(el.isConnected)el.style.zIndex='';});
  }
}
function commitMove(from,to){
  if(!canMove(game,from,to))return false;
  const moving=selectionCards(game,from);
  const previous=captureCardPositions(moving);
  remember();
  moveCards(game,from,to);
  selected=null;hintFrom=null;
  if(game.won){
    wins++;write(WINS_KEY,String(wins));
    say('Поздравляем! Все карты собраны.');
  }else say('Ход выполнен.');
  store();paint();
  animateFromPrevious(previous,moving);
  return true;
}
function draw(){
  if(game.won)return;
  if(!game.stock.length&&!game.waste.length){say('Колода пуста.');return;}
  const origin=$('stock').getBoundingClientRect();
  remember();dealStock(game);selected=null;hintFrom=null;
  say(game.stock.length||game.waste.length?'Карта открыта.':'Колода пуста.');
  store();paint();
  if(game.waste.length)animateFromPrevious(new Map(),[game.waste[game.waste.length-1]],origin);
}
function automatic(from){
  if(!from)return false;
  for(let s=0;s<4;s++)if(commitMove(from,{kind:'foundation',suit:s}))return true;
  return false;
}
function handleClick(event){
  if(suppressClick){suppressClick=false;event.preventDefault();return;}
  if(event.target.closest('#stock')){draw();return;}
  const from=sourceFrom(event.target.closest('[data-source]'));
  const to=destinationFrom(event.target);
  if(selected&&to&&commitMove(selected,to))return;
  if(from){
    if(selectionEquals(from,selected)){
      if(!automatic(from)){selected=null;hintFrom=null;say('Выбор снят.');paint();}
    }else{
      selected=from;hintFrom=null;
      say('Выбери столбец или домик для переноса.');
      paint();
    }
  }else if(selected&&to){say('Эту карту сюда положить нельзя.');}
}
$('stock').addEventListener('click',handleClick);
$('waste').addEventListener('click',handleClick);
tableauEl.addEventListener('click',handleClick);
foundations.forEach(f=>f.addEventListener('click',handleClick));

let gesture=null;
document.addEventListener('pointerdown',(event)=>{
  const el=event.target.closest('[data-source]');
  if(!el || game.won)return;
  gesture={from:sourceFrom(el),x:event.clientX,y:event.clientY,id:event.pointerId};
},{passive:true});
document.addEventListener('pointerup',(event)=>{
  if(!gesture || gesture.id!==event.pointerId)return;
  const start=gesture;gesture=null;
  if(Math.hypot(event.clientX-start.x,event.clientY-start.y)<22)return;
  suppressClick=true;setTimeout(()=>{suppressClick=false;},200);
  const target=document.elementFromPoint(event.clientX,event.clientY);
  const to=destinationFrom(target);
  if(to&&commitMove(start.from,to))return;
  say('Сюда переместить карту нельзя.');
});
document.addEventListener('pointercancel',()=>{gesture=null;});
$('undo').addEventListener('click',()=>{
  if(!past.length||game.won)return;
  try{
    const prev=JSON.parse(past.pop());
    if(!validGame(prev))throw new Error('Invalid undo state');
    game=prev;selected=null;hintFrom=null;store();paint();say('Последний ход отменён.');
  }catch(error){past=[];store();say('Не удалось отменить ход.');console.warn(error);}
});
$('auto').addEventListener('click',()=>{
  if(game.won)return;
  if(automatic(selected))return;
  const candidates=[];
  if(game.waste.length)candidates.push({kind:'waste'});
  for(let c=0;c<7;c++){const pile=game.tableau[c];if(pile.length&&pile[pile.length-1].up)candidates.push({kind:'tableau',column:c,index:pile.length-1});}
  for(const from of candidates)if(automatic(from))return;
  say('Пока нет подходящих карт для домика.');
});
$('hint').addEventListener('click',()=>{
  const h=hint(game);
  if(!h){say('Возможных ходов не найдено.');return;}
  if(h.to.kind==='stock'){say('Попробуй взять карту из колоды.');hintFrom=null;}
  else{hintFrom=h.from;say(h.to.kind==='foundation'?'Эту карту можно перенести в домик.':'Эту карту можно переложить в другой столбец.');}
  paint();
});
function restart(){
  if(!game.won&&game.moves>0&&!window.confirm('Раздать новую партию? Текущий расклад будет потерян.'))return;
  game=newGame();past=[];selected=null;hintFrom=null;store();paint();say('Новая раздача. Удачи!');
}
$('restart').addEventListener('click',restart);
$('again').addEventListener('click',restart);
window.addEventListener('pagehide',store);
window.addEventListener('resize',paint);
paint();
