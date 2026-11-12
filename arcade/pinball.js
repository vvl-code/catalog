// Stellar Pinball: original retro space cabinet, state machine and physics.
import {PinballEngine, PHASE, FIELD} from './pinball-engine.js';
import {drawPlayfield} from './pinball-art.js';

export function mountPinball({mount,stats,message,controls}) {
  const game=new PinballEngine();
  const layout=document.createElement('div');
  layout.className='pinball-layout';
  layout.dataset.phase=game.phase;

  const stage=document.createElement('div');
  stage.className='pinball-wrapper';
  const canvas=document.createElement('canvas');
  canvas.width=FIELD.width;
  canvas.height=FIELD.height;
  canvas.className='pinball-stage';
  canvas.setAttribute('aria-label','Космический пинбол: механический стол, флипперы и три шара');
  stage.appendChild(canvas);

  const flippers=document.createElement('div');
  flippers.className='flipper-controls';
  const left=document.createElement('button'),right=document.createElement('button');
  for(const button of [left,right])button.type='button';
  left.textContent='◀ ЛЕВАЯ';right.textContent='ПРАВАЯ ▶';
  left.setAttribute('aria-label','Левый флиппер');
  right.setAttribute('aria-label','Правый флиппер');
  flippers.append(left,right);
  stage.appendChild(flippers);

  const cabinet=document.createElement('aside');
  cabinet.className='pinball-scoreboard';
  cabinet.setAttribute('aria-label','Табло космического пинбола');
  cabinet.innerHTML=[
    '<div class="cabinet-head">',
    '<div class="cabinet-space">STELLAR</div>',
    '<div class="cabinet-cadet">CADET</div>',
    '<svg class="cabinet-ship" viewBox="0 0 210 95" aria-hidden="true">',
    '<defs><linearGradient id="ship" x1="0" y1="0" x2="1" y2="1">',
    '<stop stop-color="#f0f6ff"/><stop offset=".55" stop-color="#8898b7"/>',
    '<stop offset="1" stop-color="#333b67"/></linearGradient></defs>',
    '<ellipse cx="113" cy="70" rx="69" ry="17" fill="#52637c" opacity=".48"/>',
    '<path d="M20 64 Q55 26 109 32 Q165 23 198 69 L141 78 L103 84 L70 72Z"',
    ' fill="url(#ship)" stroke="#efffff" stroke-width="2"/>',
    '<ellipse cx="109" cy="50" rx="27" ry="19" fill="#3b345d" stroke="#cac9ff" stroke-width="3"/>',
    '<circle cx="107" cy="43" r="11" fill="#b7eaf6"/>',
    '<path d="M93 61 L109 45 L126 65" fill="none" stroke="#c297fa" stroke-width="7"/>',
    '<ellipse cx="47" cy="69" rx="11" ry="5" fill="#ffcb70"/>',
    '<ellipse cx="163" cy="72" rx="13" ry="5" fill="#ff8e55"/>',
    '<path d="M9 60 L30 64 L29 73 L7 78Z" fill="#a9557d"/>',
    '</svg>',
    '<div class="cabinet-ball">ШАР <strong id="cabinet-ball">1</strong></div></div>',
    '<div class="cabinet-digital"><div class="digital-label">ИГРОК 1 ',
    '<span id="cabinet-rank">CADET</span></div>',
    '<strong id="cabinet-score">0000000</strong></div>',
    '<div class="cabinet-status"><span class="digital-label">СОСТОЯНИЕ</span>',
    '<strong id="cabinet-message">ОЖИДАНИЕ ЗАПУСКА</strong></div>',
    '<div class="cabinet-mission"><span class="digital-label">МИССИЯ · ТРЕНИРОВКА</span>',
    '<div id="cabinet-progress" class="mission-lamps" aria-hidden="true"></div>',
    '<span id="cabinet-objective">ПОРАЗИ МИШЕНИ 0/8</span></div>',
    '<div class="cabinet-footer">Z / ← ЛЕВАЯ ЛАПКА<br>/ / → ПРАВАЯ ЛАПКА<br>',
    'ПРОБЕЛ — ЗАПУСК</div>'
  ].join('');
  layout.append(stage,cabinet);
  mount.replaceChildren(layout);

  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Pinball Canvas 2D unavailable');

  const launch=document.createElement('button');
  launch.type='button';
  launch.id='pinball-launch';
  launch.className='pinball-launch';
  launch.setAttribute('aria-label','Запустить следующий шар');
  controls.appendChild(launch);

  const nudgeLeft=document.createElement('button');
  const nudgeRight=document.createElement('button');
  for(const [button,label] of [[nudgeLeft,'НАКЛОН ←'],[nudgeRight,'НАКЛОН →']]){
    button.type='button';button.textContent=label;button.classList.add('secondary','pinball-nudge');
    controls.appendChild(button);
  }

  const dashboard={
    ball:cabinet.querySelector('#cabinet-ball'),
    rank:cabinet.querySelector('#cabinet-rank'),
    score:cabinet.querySelector('#cabinet-score'),
    message:cabinet.querySelector('#cabinet-message'),
    progress:cabinet.querySelector('#cabinet-progress'),
    objective:cabinet.querySelector('#cabinet-objective')
  };
  const highKey='mygames-pinball-best-v1';
  let high=0;
  try {high=Math.max(0,Number.parseInt(localStorage.getItem(highKey)||'0',10)||0);}catch{}
  const saveHigh=()=>{
    if(game.score<=high)return;
    high=game.score;
    try {localStorage.setItem(highKey,String(high));}catch{}
  };
  let lastSerial=-1;
  const ranks=['CADET','ENSIGN','LIEUTENANT','CAPTAIN','COMMANDER'];
  function updateUI(force=false) {
    if(!force&&game.serial===lastSerial)return;
    lastSerial=game.serial;
    saveHigh();
    const snapshot=game.snapshot();
    layout.dataset.phase=snapshot.phase;
    stats([
      ['ОЧКИ',snapshot.score.toLocaleString('ru-RU')],
      ['ШАР',snapshot.phase===PHASE.OVER?'КОНЕЦ':snapshot.ballNumber+' / 3'],
      ['РЕКОРД',high.toLocaleString('ru-RU')]
    ]);
    message(snapshot.phase===PHASE.OVER
      ? 'Все три шара потеряны. Нажми «Заново» для новой партии.'
      : snapshot.phase===PHASE.READY
      ? 'Шар '+snapshot.ballNumber+' готов. Нажми «Запуск шара».'
      : 'Управляй флипперами и выполняй миссии.');
    launch.disabled=snapshot.phase!==PHASE.READY;
    launch.textContent=snapshot.phase===PHASE.OVER?'ПАРТИЯ ЗАВЕРШЕНА'
      :snapshot.phase===PHASE.READY?'ЗАПУСК ШАРА '+snapshot.ballNumber:'ШАР '+snapshot.ballNumber+' В ИГРЕ';
    dashboard.ball.textContent=String(snapshot.ballNumber);
    dashboard.rank.textContent=ranks[Math.min(ranks.length-1,Math.floor(snapshot.completedMissions/3))];
    dashboard.score.textContent=String(snapshot.score).padStart(7,'0');
    dashboard.message.textContent=snapshot.message;
    dashboard.objective.textContent='МИШЕНИ '+snapshot.attackHits+'/8 · БОНУС ×'+snapshot.bonusMultiplier;
    dashboard.progress.replaceChildren();
    for(let index=0;index<8;index++){
      const led=document.createElement('i');
      led.className=index<snapshot.attackHits?'lit':'';
      dashboard.progress.appendChild(led);
    }
  }

  let last=0,frameId=0,running=true,spaceDownAt=null;
  function resizeBitmap(){
    const dpr=Math.min(3,Math.max(1,window.devicePixelRatio||1));
    const width=Math.max(FIELD.width,Math.ceil(canvas.clientWidth*dpr)+2);
    const height=Math.max(FIELD.height,Math.ceil(canvas.clientHeight*dpr)+2);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    ctx.setTransform(canvas.width/FIELD.width,0,0,canvas.height/FIELD.height,0,0);
  }
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(resizeBitmap):null;
  observer?.observe(canvas);
  window.addEventListener('resize',resizeBitmap);

  function draw(now){
    const snap=game.snapshot();
    drawPlayfield(ctx,{
      ball:snap.ball,balls:snap.remaining,leftDown:snap.leftDown,rightDown:snap.rightDown,
      bumpers:snap.bumpers,score:snap.score,now,phase:snap.phase,dropTargets:snap.dropTargets,
      reentry:snap.reentry,attackHits:snap.attackHits,kickerLights:snap.kickerLights,
      bonusMultiplier:snap.bonusMultiplier
    });
  }
  function loop(now){
    if(!running)return;
    if(!document.hidden){
      const dt=last?Math.min(2.5,(now-last)/16.667):1;
      game.step(dt);
      updateUI();
    }
    last=now;
    draw(now);
    frameId=requestAnimationFrame(loop);
  }
  function launchBall(power=1){if(game.launch(power)){spaceDownAt=null;updateUI(true);return true;}return false;}
  function restart(){
    game.newGame();spaceDownAt=null;
    updateUI(true);
  }

  function setFlipper(side,down){
    game.setFlipper(side,down);
    const button=side==='left'?left:right;
    button.classList.toggle('is-pressed',down);
  }
  function hold(button,side) {
    button.addEventListener('pointerdown',event=>{
      if(event.button>0)return;
      button.setPointerCapture(event.pointerId);
      setFlipper(side,true);event.preventDefault();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])
      button.addEventListener(type,()=>setFlipper(side,false));
  }
  hold(left,'left');hold(right,'right');
  launch.addEventListener('click',()=>launchBall(1));
  nudgeLeft.addEventListener('click',()=>game.nudge(-1));
  nudgeRight.addEventListener('click',()=>game.nudge(1));

  function keydown(event){
    if(event.repeat&&event.code==='Space')return;
    const key=event.key.toLowerCase();
    if(key==='z'||key==='a'||event.key==='ArrowLeft'){setFlipper('left',true);event.preventDefault();}
    if(key==='/'||key==='d'||event.key==='ArrowRight'){setFlipper('right',true);event.preventDefault();}
    if(event.code==='Space'){
      if(spaceDownAt===null)spaceDownAt=performance.now();
      event.preventDefault();
    }
    if(key==='q')game.nudge(-1);
    if(key==='e')game.nudge(1);
  }
  function keyup(event){
    const key=event.key.toLowerCase();
    if(key==='z'||key==='a'||event.key==='ArrowLeft'){setFlipper('left',false);event.preventDefault();}
    if(key==='/'||key==='d'||event.key==='ArrowRight'){setFlipper('right',false);event.preventDefault();}
    if(event.code==='Space'){
      const held=spaceDownAt===null?0:performance.now()-spaceDownAt;
      spaceDownAt=null;
      launchBall(Math.max(.5,Math.min(1,.5+held/900)));
      event.preventDefault();
    }
  }
  function blurred(){
    game.setFlipper('left',false);game.setFlipper('right',false);
    left.classList.remove('is-pressed');right.classList.remove('is-pressed');
    spaceDownAt=null;last=0;
  }
  window.addEventListener('keydown',keydown);
  window.addEventListener('keyup',keyup);
  window.addEventListener('blur',blurred);
  resizeBitmap();
  updateUI(true);
  frameId=requestAnimationFrame(loop);

  return {
    restart,
    cleanup(){
      running=false;cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('resize',resizeBitmap);
      window.removeEventListener('keydown',keydown);
      window.removeEventListener('keyup',keyup);
      window.removeEventListener('blur',blurred);
    }
  };
}
