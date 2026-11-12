import {parseFen,PIECES,legalMoves,applyMove,inCheck,status as chessStatus,chooseAiMove,gridIndexToBoardIndex} from './chess.js';
import {mountPinball} from './pinball.js?v=2';

'use strict';
const $=id=>document.getElementById(id);
const root=$('game'),message=$('message'),controls=$('controls'),statsEl=$('stats'),help=$('help');
const params=new URLSearchParams(location.search);
const gameId=params.get('game')||'word';
if(gameId==='pinball')document.body.classList.add('pinball-mode');
const MODES={
  word:['5 БУКВ','УГАДАЙ СЛОВО','Угадай русское слово из пяти букв за шесть попыток. Зелёный — буква на месте, жёлтый — есть в слове.'],
  mines:['САПЁР','КЛАССИКА WINDOWS','Открой все безопасные клетки. Долгое нажатие ставит флажок, первое открытие всегда безопасно.'],
  game2048:['2048','ЧИСЛОВАЯ ГОЛОВОЛОМКА','Сдвигай плитки жестом и соединяй одинаковые числа, пока не получишь 2048.'],
  snake:['ЗМЕЙКА','АРКАДА','Собирай еду и не врезайся в стену или собственный хвост. Управление кнопками или свайпом.'],
  sudoku:['СУДОКУ','ЛОГИЧЕСКАЯ ГОЛОВОЛОМКА','Заполни сетку 1–9 без повторений в строке, столбце и квадрате 3×3.'],
  reversi:['РЕВЕРСИ','ПРОТИВ КОМПЬЮТЕРА','Зажми фишки соперника между своими, чтобы перевернуть их. Ты играешь чёрными.'],
  checkers:['ШАШКИ','ПРОТИВ КОМПЬЮТЕРА','Русские шашки: обязательное взятие, цепочки и дальнобойные дамки. Ты играешь белыми.'],
  chess:['ШАХМАТЫ','ПРОТИВ КОМПЬЮТЕРА','Полные правила: шах, мат, рокировка, взятие на проходе и превращение пешки. Ты играешь белыми.'],
  pinball:['КОСМИЧЕСКИЙ ПИНБОЛ','ОРБИТАЛЬНАЯ АРКАДА','Авторский стол с бамперами и физикой шара. Удерживай левую и правую лапки, чтобы набрать очки.']
};
const meta=MODES[gameId]||MODES.word;
$('title').textContent=meta[0]+'.';$('subtitle').textContent=meta[1];help.textContent=meta[2];document.title=meta[0]+' — My Games';
const safeRead=(k)=>{try{return localStorage.getItem(k)}catch{return null}};
const safeWrite=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){console.warn('Local storage unavailable:',e)}};
const load=(k)=>{try{return JSON.parse(safeRead(k))}catch{return null}};
const notify=t=>{message.textContent=t};
const stat=entries=>{statsEl.replaceChildren();for(const [key,val] of entries){const div=document.createElement('div');div.className='stat';const k=document.createElement('span'),v=document.createElement('strong');k.textContent=key;v.textContent=String(val);div.append(k,v);statsEl.appendChild(div)}};
const addControl=(label,handler,secondary=false)=>{
 const b=document.createElement('button');b.type='button';b.textContent=label;if(secondary)b.className='secondary';
 b.addEventListener('click',handler);controls.appendChild(b);return b;
};
const makeGrid=(size,className,renderCell)=>{
 const grid=document.createElement('div');grid.className=className;grid.style.gridTemplateColumns='repeat('+size+',minmax(0,1fr))';grid.style.gridTemplateRows='repeat('+size+',minmax(0,1fr))';
 for(let i=0;i<size*size;i++)grid.appendChild(renderCell(i));
 root.replaceChildren(grid);return grid;
};
const playBest=(key,val)=>{
 const old=load(key)||0;
 if(val>old){safeWrite(key,val);return val;}
 return old;
};
const randomInt=n=>Math.floor(Math.random()*n);
const makeButton=(text,cls='square')=>{const el=document.createElement('button');el.type='button';el.className=cls;el.textContent=text;return el;};

function wordGame(){
 const words=['КОШКА','КНИГА','МАСКА','ПЕСНЯ','ВОЙНА','КАРТА','ТУФЛЯ','ОЗЕРО','СОСНА','ВЕСНА','ОСЕНЬ','КРЫША','СЛОВО','ПТИЦА','РУЧКА','СУМКА','ЛАМПА','КРОНА','КЛЮЧИ','СЕТКА','ШКОЛА','НОСКИ','ЛОЖКА','БЕЛКА','ГРУША','ВИШНЯ','САЛАТ','РЫБАК','БЕРЕГ','ЗАВОД','ПИЛОТ','ВЕТКА','НОЧКА','ЗЕМЛЯ','КОРОБ','КРЫЛО','ДОСКА','МЕТРО','СЦЕНА','РАДИО','СФЕРА','ТЕАТР','СЛЕЗА','МЕЧТА','ОБЛАК','БАНКА','ФИНИК','КРЕСТ','ГОРОД','ОКЕАН','ПАРТА','СТЕНА','ОГОНЬ','ПОЧТА','МЫШКА','МОРЯК','РУБИН','НОЖКА','ДВЕРЬ','ДОМЫ?'];
 const validWords=words.filter(w=>/^[А-ЯЁ]{5}$/.test(w));
 const key='mygames-word-state-v1';
 let state=load(key);
 const valid=s=>s&&validWords.includes(s.answer)&&Array.isArray(s.guesses)&&s.guesses.length<=6&&s.guesses.every(w=>/^[А-ЯЁ]{5}$/.test(w))&&typeof s.finished==='boolean';
 if(!valid(state))state={answer:validWords[randomInt(validWords.length)],guesses:[],finished:false};
 const evaluate=guess=>{
  const res=Array(5).fill('absent'),remaining={};
  for(let i=0;i<5;i++){if(guess[i]===state.answer[i])res[i]='correct';else remaining[state.answer[i]]=(remaining[state.answer[i]]||0)+1;}
  for(let i=0;i<5;i++)if(res[i]!=='correct'&&remaining[guess[i]]>0){res[i]='present';remaining[guess[i]]--;}
  return res;
 };
 function show(){
  const grid=document.createElement('div');grid.className='word-board';
  for(let row=0;row<6;row++){
   const guess=state.guesses[row]||'';
   const colors=guess?evaluate(guess):[];
   for(let col=0;col<5;col++){const el=document.createElement('div');el.className='letter '+(colors[col]||'');el.textContent=guess[col]||'';grid.appendChild(el);}
  }
  const form=document.createElement('form');form.className='word-input';
  const input=document.createElement('input');input.id='guess';input.maxLength=5;input.autocomplete='off';input.autocapitalize='characters';input.spellcheck=false;input.placeholder='СЛОВО';input.pattern='[А-Яа-яЁё]{5}';input.setAttribute('aria-label','Твоё слово из пяти букв');
  const send=makeButton('ПРОВЕРИТЬ');send.type='submit';form.append(input,send);
  input.disabled=send.disabled=state.finished;
  form.addEventListener('submit',e=>{e.preventDefault();const g=input.value.trim().toUpperCase().replace(/Ё/g,'Е');if(!/^[А-Я]{5}$/.test(g)){notify('Нужно ровно пять русских букв.');return;}
   state.guesses.push(g);state.finished=g===state.answer||state.guesses.length>=6;safeWrite(key,state);show();
   if(state.finished)notify(g===state.answer?'Верно! Слово угадано 🎉':'Попытки закончились. Ответ: '+state.answer);
   else notify('Попытка '+state.guesses.length+' из 6.');
  });
  const legend=document.createElement('div');legend.className='key-legend';legend.innerHTML='<span><i></i>На месте</span><span><i></i>Есть в слове</span><span><i></i>Нет</span>';
  root.replaceChildren(grid,form,legend);
  stat([['ПОПЫТКИ',state.guesses.length+'/6'],['РЕЖИМ','5 БУКВ'],['СТАТУС',state.finished?'ФИНИШ':'ИГРА']]);
 }
 function restart(){state={answer:validWords[randomInt(validWords.length)],guesses:[],finished:false};safeWrite(key,state);show();notify('Новое слово загадано.');}
 show();if(!state.guesses.length)notify('Угадай слово за шесть попыток.');else notify(state.finished?'Ответ: '+state.answer:'Продолжай угадывать.');
 return {restart};
}

function game2048(){
 const key='mygames-2048-v1',bestKey='mygames-2048-best-v1';
 let s=load(key);if(!s||!Array.isArray(s.grid)||s.grid.length!==16||s.grid.some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isInteger(s.score))s={grid:Array(16).fill(0),score:0,ended:false};
 function put(){const empty=s.grid.map((x,i)=>x?null:i).filter(x=>x!==null);if(empty.length)s.grid[empty[randomInt(empty.length)]]=Math.random()<.9?2:4;}
 if(!s.grid.some(Boolean)){put();put();}
 const save=()=>safeWrite(key,s);
 function move(dir){
  if(s.ended)return;
  const old=[...s.grid];let gain=0;
  for(let lane=0;lane<4;lane++){
   const idx=Array.from({length:4},(_,j)=>dir==='left'?lane*4+j:dir==='right'?lane*4+3-j:dir==='up'?j*4+lane:(3-j)*4+lane);
   const nums=idx.map(i=>s.grid[i]).filter(Boolean),out=[];
   for(let j=0;j<nums.length;j++){
    if(j+1<nums.length&&nums[j]===nums[j+1]){out.push(nums[j]*2);gain+=nums[j]*2;j++;}
    else out.push(nums[j]);
   }
   idx.forEach((i,j)=>s.grid[i]=out[j]||0);
  }
  if(old.every((v,i)=>v===s.grid[i]))return;
  s.score+=gain;put();
  s.ended=!s.grid.includes(0)&&!['left','right','up','down'].some(d=>canMove(d));
  const best=playBest(bestKey,s.score);save();show();
  notify(s.ended?'Ходы закончились. Начни заново.':gain?'Объединено: +'+gain:'Собирай одинаковые числа!');
  return best;
 }
 function canMove(dir){
  for(let i=0;i<16;i++){
   const r=Math.floor(i/4),c=i%4;
   const j=dir==='left'&&c>0?i-1:dir==='right'&&c<3?i+1:dir==='up'&&r>0?i-4:dir==='down'&&r<3?i+4:-1;
   if(j>=0&&(s.grid[j]===0||s.grid[j]===s.grid[i]))return true;
  }return false;
 }
 function show(){
  const board=document.createElement('div');board.className='number-grid';
  s.grid.forEach(n=>{const cell=document.createElement('div');cell.className='num-cell';cell.dataset.v=String(n);cell.textContent=n?n:'';board.appendChild(cell);});root.replaceChildren(board);
  stat([['ОЧКИ',s.score],['РЕКОРД',load(bestKey)||0],['МАКСИМУМ',Math.max(...s.grid)]]);
 }
 let start=null;
 root.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};});
 root.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));});
 const keyHandler=e=>{const m={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(m){e.preventDefault();move(m);}};
 window.addEventListener('keydown',keyHandler);
 for(const [label,dir] of [['◀','left'],['▲','up'],['▼','down'],['▶','right']])addControl(label,()=>move(dir),true);
 function restart(){s={grid:Array(16).fill(0),score:0,ended:false};put();put();save();show();notify('Новая игра!');}
 show();return {restart,cleanup(){window.removeEventListener('keydown',keyHandler)}};
}

function minesGame(){
 const key='mygames-mines-v1',n=9,mines=10;
 let s=load(key);
 const valid=v=>v&&Array.isArray(v.bombs)&&v.bombs.length===81&&Array.isArray(v.open)&&v.open.length===81&&Array.isArray(v.flags)&&v.flags.length===81&&typeof v.started==='boolean'&&typeof v.ended==='boolean';
 if(!valid(s))s={bombs:Array(81).fill(false),open:Array(81).fill(false),flags:Array(81).fill(false),started:false,ended:false,won:false};
 let flagMode=false,hold=null,skipTap=false;
 const neighbors=i=>{const r=Math.floor(i/n),c=i%n,a=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n)a.push(rr*n+cc);}return a;};
 const count=i=>neighbors(i).filter(j=>s.bombs[j]).length;
 function plant(safe){const exclude=new Set([safe,...neighbors(safe)]),spots=Array.from({length:81},(_,i)=>i).filter(i=>!exclude.has(i));for(let k=0;k<mines;k++){const ix=randomInt(spots.length),p=spots.splice(ix,1)[0];s.bombs[p]=true;}s.started=true;}
 function reveal(i){
  if(s.ended||s.flags[i]||s.open[i])return;
  if(!s.started)plant(i);
  if(s.bombs[i]){s.open[i]=true;s.ended=true;s.won=false;notify('Бум! Попробуй ещё раз.');save();show();return;}
  const queue=[i],seen=new Set();
  while(queue.length){const x=queue.pop();if(seen.has(x)||s.flags[x]||s.open[x])continue;seen.add(x);s.open[x]=true;if(count(x)===0)for(const j of neighbors(x))if(!s.bombs[j])queue.push(j);}
  if(s.open.filter(Boolean).length===81-mines){s.ended=true;s.won=true;notify('Победа! Все безопасные клетки открыты.');playBest('mygames-mines-wins-v1',(load('mygames-mines-wins-v1')||0)+1);}
  save();show();
 }
 function flag(i){if(s.ended||s.open[i])return;s.flags[i]=!s.flags[i];save();show();}
 function save(){safeWrite(key,s)}
 function show(){
  const grid=makeGrid(9,'grid mine-grid',i=>{
   const v=makeButton('');const opened=s.open[i]||(s.ended&&s.bombs[i]);v.className='square'+(opened?' open':'')+(opened&&s.bombs[i]?' bomb':'')+(s.flags[i]?' flag':'');
   const num=s.open[i]&&!s.bombs[i]?count(i):0;
   v.dataset.n=String(num);
   v.textContent=s.flags[i]?'⚑':opened&&s.bombs[i]?'✹':num?String(num):'';
   v.setAttribute('aria-label','Клетка '+(Math.floor(i/9)+1)+','+(i%9+1));
   v.addEventListener('contextmenu',e=>{e.preventDefault();flag(i);});
   v.addEventListener('pointerdown',()=>{clearTimeout(hold);hold=setTimeout(()=>{flag(i);skipTap=true;},520);});
   for(const ev of ['pointerup','pointercancel','pointerleave'])v.addEventListener(ev,()=>clearTimeout(hold));
   v.addEventListener('click',()=>{if(skipTap){skipTap=false;return;}flagMode?flag(i):reveal(i);});
   return v;
  });
  stat([['МИНЫ',mines],['ФЛАГИ',s.flags.filter(Boolean).length],['ПОБЕДЫ',load('mygames-mines-wins-v1')||0]]);
 }
 const flagToggle=addControl('⚑ ФЛАЖКИ: ВЫКЛ',()=>{flagMode=!flagMode;flagToggle.textContent=flagMode?'⚑ ФЛАЖКИ: ВКЛ':'⚑ ФЛАЖКИ: ВЫКЛ'},true);
 function restart(){s={bombs:Array(81).fill(false),open:Array(81).fill(false),flags:Array(81).fill(false),started:false,ended:false,won:false};save();show();notify('Новое поле. Первый ход безопасен.');}
 show();notify(s.ended?'Партия завершена.':'Открой клетку. Долгое касание — флажок.');return {restart,cleanup(){clearTimeout(hold)}};
}

function snakeGame(){
 const key='mygames-snake-best-v1',size=20;
 const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.className='snake-stage';root.replaceChildren(canvas);
 const c=canvas.getContext('2d');if(!c)throw new Error('Canvas unavailable');
 let snake,food,direction,nextDirection,score,ended,timer;
 function randomFood(){const available=Array.from({length:size*size},(_,i)=>[i%size,Math.floor(i/size)]).filter(([x,y])=>!snake.some(p=>p[0]===x&&p[1]===y));return available.length?available[randomInt(available.length)]:null;}
 function draw(){
  c.fillStyle='#0b1d30';c.fillRect(0,0,400,400);
  c.strokeStyle='#203a5280';for(let i=0;i<=20;i++){c.beginPath();c.moveTo(i*20,0);c.lineTo(i*20,400);c.moveTo(0,i*20);c.lineTo(400,i*20);c.stroke();}
  if(food){c.fillStyle='#ff7181';c.beginPath();c.arc(food[0]*20+10,food[1]*20+10,8,0,Math.PI*2);c.fill();}
  snake.forEach((p,i)=>{c.fillStyle=i===0?'#75fff2':'#29c6a8';c.fillRect(p[0]*20+2,p[1]*20+2,16,16);});
 }
 function turn(dir){const dx=direction[0],dy=direction[1];if(dir[0]===-dx&&dir[1]===-dy)return;nextDirection=dir;}
 function tick(){
  if(ended||document.hidden)return;
  direction=nextDirection;
  const [x,y]=snake[0],head=[x+direction[0],y+direction[1]],ate=food&&head[0]===food[0]&&head[1]===food[1];
  const body=ate?snake:snake.slice(0,-1);
  if(head[0]<0||head[1]<0||head[0]>=size||head[1]>=size||body.some(p=>p[0]===head[0]&&p[1]===head[1])){
   ended=true;notify('Змейка столкнулась. Очки: '+score);playBest(key,score);clearInterval(timer);draw();return;
  }
  snake.unshift(head);if(ate){score+=10;food=randomFood();}else snake.pop();
  if(!food){ended=true;notify('Победа! Поле заполнено.');clearInterval(timer);}
  stat([['ОЧКИ',score],['РЕКОРД',playBest(key,score)],['ДЛИНА',snake.length]]);draw();
 }
 const mapping={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
 const keyboard=e=>{if(mapping[e.key]){e.preventDefault();turn(mapping[e.key]);}};
 window.addEventListener('keydown',keyboard);
 const pad=document.createElement('div');pad.className='snake-pad';
 for(const [cls,symbol,dir] of [['up','▲',[0,-1]],['left','◀',[-1,0]],['down','▼',[0,1]],['right','▶',[1,0]]]){
  const b=makeButton(symbol);b.className=cls;b.addEventListener('click',()=>turn(dir));pad.appendChild(b);
 }
 controls.appendChild(pad);
 let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointerup',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag=null;if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;turn(Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)]);});
 function restart(){clearInterval(timer);snake=[[10,10],[9,10],[8,10]];direction=[1,0];nextDirection=[1,0];food=randomFood();score=0;ended=false;timer=setInterval(tick,135);notify('Собирай красные точки.');stat([['ОЧКИ',0],['РЕКОРД',load(key)||0],['ДЛИНА',3]]);draw();}
 restart();return {restart,cleanup(){clearInterval(timer);window.removeEventListener('keydown',keyboard)}};
}

function sudokuGame(){
 const key='mygames-sudoku-v1';
 function shuffle(a){for(let i=a.length-1;i>0;i--){let j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 const pattern=(r,c)=>(r*3+Math.floor(r/3)+c)%9;
 function solveCount(board,stopAt=2) {
  const b=board.slice();let solutions=0;
  function search(){
   let best=-1,bestOptions=null;
   for(let i=0;i<81;i++)if(!b[i]){
    const r=Math.floor(i/9),c=i%9,seen=new Set();
    for(let j=0;j<9;j++){seen.add(b[r*9+j]);seen.add(b[j*9+c]);}
    const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
    for(let dr=0;dr<3;dr++)for(let dc=0;dc<3;dc++)seen.add(b[(br+dr)*9+bc+dc]);
    const opts=Array.from({length:9},(_,n)=>n+1).filter(n=>!seen.has(n));
    if(!opts.length)return;
    if(!bestOptions||opts.length<bestOptions.length){best=i;bestOptions=opts;if(opts.length===1)break;}
   }
   if(best<0){solutions++;return;}
   for(const val of bestOptions){b[best]=val;search();if(solutions>=stopAt){b[best]=0;return;}b[best]=0;}
  } search();return solutions;
 }
 function generate(){
  const rows=shuffle([0,1,2]).flatMap(b=>shuffle([0,1,2]).map(r=>b*3+r));
  const cols=shuffle([0,1,2]).flatMap(b=>shuffle([0,1,2]).map(r=>b*3+r));
  const digits=shuffle([1,2,3,4,5,6,7,8,9]);
  const answer=Array.from({length:81},(_,i)=>digits[pattern(rows[Math.floor(i/9)],cols[i%9])]);
  const puzzle=answer.slice();
  let holes=0;for(const i of shuffle(Array.from({length:81},(_,i)=>i))){
   const old=puzzle[i];puzzle[i]=0;
   if(solveCount(puzzle)!==1)puzzle[i]=old;
   else holes++;
   if(holes>=43)break;
  }
  return {puzzle,answer,values:puzzle.slice(),wins:false};
 }
 let s=load(key);
 if(!s||!['puzzle','answer','values'].every(k=>Array.isArray(s[k])&&s[k].length===81)||!s.values.every(n=>Number.isInteger(n)&&n>=0&&n<=9))s=generate();
 let selected=null;
 const conflicts=(i)=>{const n=s.values[i];if(!n)return false;const r=Math.floor(i/9),c=i%9;for(let k=0;k<81;k++){if(k===i||s.values[k]!==n)continue;const rr=Math.floor(k/9),cc=k%9;if(r===rr||c===cc||Math.floor(r/3)===Math.floor(rr/3)&&Math.floor(c/3)===Math.floor(cc/3))return true;}return false;};
 function show(){
  const grid=makeGrid(9,'sudoku-grid',i=>{
   const b=makeButton(s.values[i]||'');b.className=(s.puzzle[i]?'given ':'')+(selected===i?'selected ':'')+(conflicts(i)?'error ':'');
   b.setAttribute('aria-label','Строка '+(Math.floor(i/9)+1)+', столбец '+(i%9+1)+', число '+(s.values[i]||'пусто'));
   b.addEventListener('click',()=>{selected=i;show();});return b;
  });
  stat([['ЗАПОЛНЕНО',s.values.filter(Boolean).length+'/81'],['ПОДСКАЗКИ','1–9'],['СТАТУС',s.wins?'ГОТОВО':'ИГРА']]);
 }
 function setNumber(n){
  if(selected===null||s.puzzle[selected]||s.wins)return;
  s.values[selected]=n;safeWrite(key,s);show();
  if(s.values.every((v,i)=>v===s.answer[i])){s.wins=true;safeWrite(key,s);show();notify('Судоку решено! 🎉');}
  else notify(conflicts(selected)?'Внимание: повторяющееся число.':'Число установлено.');
 }
 const pad=document.createElement('div');pad.className='number-pad';
 for(let n=1;n<=9;n++){const b=makeButton(String(n));b.addEventListener('click',()=>setNumber(n));pad.appendChild(b);}
 const erase=makeButton('СТЕРЕТЬ');erase.className='erase';erase.addEventListener('click',()=>setNumber(0));pad.appendChild(erase);controls.appendChild(pad);
 function restart(){if(s.values.some((v,i)=>!s.puzzle[i]&&v)&&!window.confirm('Создать новое судоку? Текущий прогресс будет потерян.'))return;s=generate();selected=null;safeWrite(key,s);show();notify('Новое судоку готово.');}
 show();notify(s.wins?'Судоку решено.':'Выбери клетку, затем число.');return {restart};
}

function reversiGame(){
 const key='mygames-reversi-v1',N=8;
 let s=load(key);
 if(!s||!Array.isArray(s.cells)||s.cells.length!==64||!s.cells.every(v=>v===0||v===1||v===2))s={cells:Array(64).fill(0),turn:1,finished:false};
 if(!s.cells.some(Boolean)){s.cells[27]=2;s.cells[28]=1;s.cells[35]=1;s.cells[36]=2;}
 let thinking=false,timer=null;
 const dirs=[-1,0,1].flatMap(y=>[-1,0,1].filter(x=>x||y).map(x=>[x,y]));
 function flips(i,who){
  if(s.cells[i])return [];
  const row=Math.floor(i/N),col=i%N,out=[];
  for(const [dx,dy] of dirs){
   let x=col+dx,y=row+dy;const trail=[];
   while(x>=0&&x<8&&y>=0&&y<8&&s.cells[y*8+x]===3-who){trail.push(y*8+x);x+=dx;y+=dy;}
   if(trail.length&&x>=0&&x<8&&y>=0&&y<8&&s.cells[y*8+x]===who)out.push(...trail);
  }
  return out;
 }
 const moves=who=>Array.from({length:64},(_,i)=>i).filter(i=>flips(i,who).length);
 function updateTurn(){
  s.turn=3-s.turn;
  if(!moves(s.turn).length){s.turn=3-s.turn;if(!moves(s.turn).length)s.finished=true;else notify('У соперника нет ходов — пропуск.');}
 }
 function place(i){
  if(s.finished||thinking||s.turn!==1)return;
  const f=flips(i,1);if(!f.length)return;
  s.cells[i]=1;for(const j of f)s.cells[j]=1;
  updateTurn();save();show();scheduleBot();
 }
 function save(){safeWrite(key,s)}
 function scheduleBot(){
  if(s.finished){notify('Партия окончена.');return;}
  if(s.turn!==2)return;
  thinking=true;timer=setTimeout(()=>{
   const choices=moves(2);let best=-Infinity,chosen=null;
   for(const i of choices){const corner=[0,7,56,63].includes(i)?100:0;const val=flips(i,2).length+corner+Math.random();if(val>best){best=val;chosen=i;}}
   if(chosen!==null){s.cells[chosen]=2;for(const j of flips(chosen,2))s.cells[j]=2;}
   thinking=false;updateTurn();save();show();
   if(s.finished)notify('Игра завершена.');else notify('Твой ход.');if(s.turn===2&&!s.finished)scheduleBot();
  },260);
 }
 function show(){
  const possibles=s.finished||s.turn!==1?[]:moves(1);
  makeGrid(8,'grid disc-grid',i=>{
   const b=makeButton('');b.dataset.piece=s.cells[i]===1?'b':s.cells[i]===2?'w':'';
   b.className='square'+(possibles.includes(i)?' possible':'');b.disabled=!possibles.includes(i);
   b.setAttribute('aria-label','Клетка '+(Math.floor(i/8)+1)+','+(i%8+1));
   b.addEventListener('click',()=>place(i));return b;
  });
  const black=s.cells.filter(v=>v===1).length,white=s.cells.filter(v=>v===2).length;
  stat([['ТВОИ',black],['КОМПЬЮТЕР',white],['ХОД',s.finished?'ФИНИШ':s.turn===1?'ТВОЙ':'ИИ']]);
  if(s.finished)notify(black===white?'Ничья.':black>white?'Ты победил! 🎉':'Победил компьютер.');
 }
 function restart(){clearTimeout(timer);thinking=false;s={cells:Array(64).fill(0),turn:1,finished:false};s.cells[27]=2;s.cells[28]=1;s.cells[35]=1;s.cells[36]=2;save();show();notify('Начинают чёрные — твой ход.');}
 show();scheduleBot();return {restart,cleanup(){clearTimeout(timer)}};
}

function checkersGame(){
 const key='mygames-checkers-v1';
 let s=load(key);
 const make=()=>{const board=Array(64).fill(0);for(let r=0;r<3;r++)for(let c=0;c<8;c++)if((r+c)%2===1)board[r*8+c]=2;for(let r=5;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2===1)board[r*8+c]=1;return {board,turn:1,chain:null,finished:false};};
 if(!s||!Array.isArray(s.board)||s.board.length!==64||!s.board.every(v=>Number.isInteger(v)&&v>=0&&v<=4))s=make();
 let selected=null,timer=null,thinking=false;
 function owner(piece){return piece===1||piece===3?1:piece===2||piece===4?2:0}
 const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8,ds=[[-1,-1],[-1,1],[1,-1],[1,1]];
 function attacks(i){
  const piece=s.board[i],who=owner(piece),r=Math.floor(i/8),c=i%8,res=[];
  if(!who)return res;
  for(const [dr,dc] of ds){
   if(piece>=3){
    let rr=r+dr,cc=c+dc,enemy=-1;
    while(inside(rr,cc)){
     const j=rr*8+cc,v=s.board[j];
     if(!v){if(enemy>=0)res.push({from:i,to:j,capture:enemy});}
     else if(owner(v)===who||enemy>=0)break;
     else enemy=j;
     rr+=dr;cc+=dc;
    }
   }else{
    const mr=r+dr,mc=c+dc,lr=r+2*dr,lc=c+2*dc;
    if(inside(lr,lc)&&owner(s.board[mr*8+mc])===3-who&&s.board[lr*8+lc]===0)res.push({from:i,to:lr*8+lc,capture:mr*8+mc});
   }
  }
  return res;
 }
 function allMoves(who){
  const captures=[];
  for(let i=0;i<64;i++)if(owner(s.board[i])===who&&(!s.chain||s.chain===i))captures.push(...attacks(i));
  if(captures.length)return captures;
  if(s.chain!==null)return [];
  const out=[];
  for(let i=0;i<64;i++){
   const piece=s.board[i];if(owner(piece)!==who)continue;
   const r=Math.floor(i/8),c=i%8;
   for(const [dr,dc] of ds){
    if(piece<3&&dr!==(who===1?-1:1))continue;
    let rr=r+dr,cc=c+dc;
    while(inside(rr,cc)&&!s.board[rr*8+cc]){
     out.push({from:i,to:rr*8+cc,capture:-1});
     if(piece<3)break;
     rr+=dr;cc+=dc;
    }
   }
  }
  return out;
 }
 function perform(m){
  s.board[m.to]=s.board[m.from];s.board[m.from]=0;
  if(m.capture>=0)s.board[m.capture]=0;
  const row=Math.floor(m.to/8);
  if(s.board[m.to]===1&&row===0)s.board[m.to]=3;
  if(s.board[m.to]===2&&row===7)s.board[m.to]=4;
  if(m.capture>=0&&attacks(m.to).length){s.chain=m.to;}
  else{s.chain=null;s.turn=3-s.turn;}
  if(!allMoves(s.turn).length)s.finished=true;
  safeWrite(key,s);
 }
 function turnMove(i){
  if(thinking||s.finished||s.turn!==1)return;
  const moves=allMoves(1);
  if(selected===null){if(moves.some(m=>m.from===i))selected=i;}
  else{
   const m=moves.find(m=>m.from===selected&&m.to===i);
   if(m){perform(m);selected=s.chain;if(s.finished)notify('Ты победил!');else if(s.turn===2)bot();else notify('Продолжай обязательное взятие.');}
   else selected=moves.some(m=>m.from===i)?i:null;
  }show();
 }
 function bot(){
  if(s.turn!==2||s.finished)return;
  thinking=true;
  timer=setTimeout(()=>{
   const options=allMoves(2);
   if(!options.length){s.finished=true;thinking=false;show();return;}
   const caps=options.filter(m=>m.capture>=0),choices=caps.length?caps:options;
   const m=choices[randomInt(choices.length)];perform(m);
   thinking=false;show();
   if(s.turn===2&&!s.finished)bot();else notify(s.finished?'Партия окончена.':'Твой ход.');
  },350);
 }
 function show(){
  const moves=s.finished?[]:allMoves(s.turn),targets=selected===null?[]:moves.filter(m=>m.from===selected).map(m=>m.to);
  makeGrid(8,'grid checker-grid',i=>{
   const piece=s.board[i],r=Math.floor(i/8),c=i%8;
   const b=makeButton('','square '+((r+c)%2===0?'light':'dark')+(selected===i?' selected':'')+(targets.includes(i)?' can':''));
   b.dataset.checker=String(piece);
   b.setAttribute('aria-label',piece?'Шашка '+(owner(piece)===1?'белых':'чёрных')+(piece>=3?' дамка':''):'Клетка');
   b.addEventListener('click',()=>turnMove(i));return b;
  });
  stat([['БЕЛЫЕ',s.board.filter(x=>x===1||x===3).length],['ЧЁРНЫЕ',s.board.filter(x=>x===2||x===4).length],['ХОД',s.finished?'КОНЕЦ':s.turn===1?'ТВОЙ':'ИИ']]);
  if(s.finished)notify(s.turn===1?'Компьютер победил.':'Ты победил! 🎉');
 }
 function restart(){clearTimeout(timer);thinking=false;s=make();selected=null;safeWrite(key,s);show();notify('Белые начинают.');}
 show();if(s.turn===2&&!s.finished)bot();return {restart,cleanup(){clearTimeout(timer)}};
}

function chessGame(){
 const key='mygames-chess-v1';
 let s=load(key);
 if(!s||!Array.isArray(s.b)||s.b.length!==128||![1,-1].includes(s.t)||!Number.isInteger(s.c))s=parseFen();
 let selected=-1,timer=null,thinking=false;
 function legal(){try{return legalMoves(s)}catch{return []}}
 function makeMove(move) {
  s=applyMove(s,move);selected=-1;safeWrite(key,s);show();
 }
 function human(i){
  if(thinking||s.t!==1||chessStatus(s).done)return;
  const moves=legal();
  if(s.b[i]!=='.'&&s.b[i]===s.b[i].toUpperCase()){selected=selected===i?-1:i;show();return;}
  const options=moves.filter(m=>m[0]===selected&&m[1]===i);
  if(!options.length)return;
  let move=options[0];
  if(options.length>1){
   const promptValue=window.prompt('Превращение пешки: ферзь (Q), ладья (R), слон (B), конь (N)','Q');
   const promotion=(promptValue||'Q').trim().toLowerCase()[0];
   move=options.find(m=>m[2]===(['q','r','b','n'].includes(promotion)?promotion:'q'))||options[0];
  }
  makeMove(move);
  if(!chessStatus(s).done)bot();
 }
 function bot(){
  if(s.t!==-1||chessStatus(s).done)return;
  thinking=true;timer=setTimeout(()=>{
   const move=chooseAiMove(s);
   thinking=false;if(move)makeMove(move);
   notify(chessStatus(s).text);
  },300);
 }
 function show(){
  const moves=legal(),possible=selected<0?[]:moves.filter(m=>m[0]===selected).map(m=>m[1]);
  makeGrid(8,'grid chess-grid',cellIndex=>{
   // CSS grid uses 0..63; the chess engine uses a 0x88 (128-entry) board.
   const i=gridIndexToBoardIndex(cellIndex);
   const p=s.b[i],r=cellIndex>>3,c=cellIndex&7;
   const cell=makeButton(PIECES[p]||'','square '+((r+c)%2?'dark':'light')+(selected===i?' selected':'')+(possible.includes(i)?' possible':''));
   cell.dataset.side=p==='.'?'':p===p.toUpperCase()?'white':'black';
   cell.setAttribute('aria-label',p==='.'?'Пустая клетка':p+' '+String.fromCharCode(97+c)+(8-r));
   cell.addEventListener('click',()=>human(i));return cell;
  });
  const state=chessStatus(s);
  stat([['ХОД',s.t===1?'БЕЛЫЕ':'ЧЁРНЫЕ'],['НОМЕР',s.full],['СТАТУС',state.done?'КОНЕЦ':inCheck(s)?'ШАХ':'ИГРА']]);
  notify(state.text);
 }
 const undo=addControl('↶ ОТМЕНА',()=>{notify('Для простоты сохранение партии не поддерживает историю отмен.');},true);
 undo.disabled=true;undo.title='Отмена появится в следующем обновлении';
 function restart(){clearTimeout(timer);thinking=false;s=parseFen();selected=-1;safeWrite(key,s);show();notify('Белые начинают.');}
 show();if(s.t===-1&&!chessStatus(s).done)bot();return {restart,cleanup(){clearTimeout(timer)}};
}

const factories={word:wordGame,mines:minesGame,game2048,snake:snakeGame,sudoku:sudokuGame,reversi:reversiGame,checkers:checkersGame,chess:chessGame,pinball:()=>mountPinball({mount:root,stats:stat,message:notify,controls})};
let game=null;
try{
 const factory=factories[gameId]||factories.word;
 game=factory();
 $('restart').addEventListener('click',()=>{try{game.restart();}catch(error){console.error(error);notify('Не удалось начать новую игру.');}});
 window.addEventListener('pagehide',()=>{try{game.cleanup?.();}catch{}});
}catch(error){
 console.error(error);
 notify('Ошибка запуска игры. Перезапусти Mini App.');
}
