// Original space-themed pinball: custom table, graphics and physics.
import {drawPlayfield} from './pinball-art.js';
export function mountPinball({mount,stats,message,controls}) {
  const canvas=document.createElement('canvas');
  canvas.width=320;canvas.height=500;canvas.className='pinball-stage';
  canvas.setAttribute('aria-label','Космический пинбол: левая и правая лапки, запуск шарика');
  const stage=document.createElement('div');stage.className='pinball-wrapper';
  stage.appendChild(canvas);mount.replaceChildren(stage);
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas 2D unavailable');
  const ui=document.createElement('div');ui.className='flipper-controls';
  const left=document.createElement('button'),right=document.createElement('button');
  left.textContent='◀ ЛЕВАЯ';right.textContent='ПРАВАЯ ▶';
  ui.append(left,right);stage.appendChild(ui);
  const launch=document.createElement('button');launch.textContent='ЗАПУСК ШАРА';controls.appendChild(launch);
  const W=320,H=500, gravity=.18, bumpers=[
    {x:105,y:146,r:20,c:'#64f1e1'},
    {x:190,y:127,r:19,c:'#ffca65'},
    {x:146,y:213,r:22,c:'#e882fa'},
    {x:81,y:288,r:14,c:'#6da6ff'},
    {x:223,y:274,r:15,c:'#69fab4'}];
  // Keep the playfield crisp when its CSS size grows on large displays.
  // Physics and all render coordinates remain in logical 320x500 units.
  function resizeBitmap() {
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const physicalWidth = Math.max(W, Math.round(canvas.clientWidth * dpr));
    const physicalHeight = Math.max(H, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
    }
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  const observer = typeof ResizeObserver === 'function'
    ? new ResizeObserver(resizeBitmap) : null;
  observer?.observe(canvas);
  window.addEventListener('resize',resizeBitmap);
  resizeBitmap();

  let running=true,last=0,request=0;
  let leftDown=false,rightDown=false,score=0,balls=3,bumperGlow=new Map();
  let ball={x:291,y:455,vx:0,vy:0,active:false},playing=false;
  const refresh=()=>stats([['ОЧКИ',score],['ШАРЫ',balls],['РЕКОРД',best()]]);
  const key='mygames-pinball-best-v1';
  function best(){try{return Number(localStorage.getItem(key))||0}catch{return 0}}
  function saveBest(){if(score>best())try{localStorage.setItem(key,String(score))}catch{}}
  function start(){
    score=0;balls=3;playing=false;ball={x:291,y:455,vx:0,vy:0,active:false};
    message('Нажми «Запуск шара», затем управляй лапками.');refresh();
  }
  function fire(){
    if(ball.active||balls<=0)return;
    ball.active=true;ball.x=291;ball.y=453;
    ball.vx=-3.5-(Math.random()*1.4);ball.vy=-13.5;playing=true;
    message('Лови шар лапками!');launch.disabled=true;
  }
  function strike(v){
    score+=v;bumperGlow.set(v,performance.now());
    saveBest();refresh();
  }
  function wallCollision(){
    const radius=7;
    if(ball.x<17){ball.x=17;ball.vx=Math.abs(ball.vx)*.89;}
    if(ball.x>303){ball.x=303;ball.vx=-Math.abs(ball.vx)*.89;}
    if(ball.y<17){ball.y=17;ball.vy=Math.abs(ball.vy)*.9;}
    if(ball.y>H+12){
      ball.active=false;balls--;launch.disabled=balls<=0;
      if(balls<=0){message('Игра окончена. Нажми «Заново».');saveBest();}
      else message('Шар потерян. Запускай следующий!');
      refresh();
    }
  }
  function bump(b) {
    const dx=ball.x-b.x,dy=ball.y-b.y,dist=Math.hypot(dx,dy);
    if(dist>=b.r+7||dist<.001)return;
    b.hitAt=performance.now();
    const nx=dx/dist,ny=dy/dist;
    ball.x=b.x+nx*(b.r+7);ball.y=b.y+ny*(b.r+7);
    const dot=ball.vx*nx+ball.vy*ny;
    ball.vx=(ball.vx-2*dot*nx)*.95+nx*.45;
    ball.vy=(ball.vy-2*dot*ny)*.95+ny*.45;
    const speed=Math.hypot(ball.vx,ball.vy);
    if(speed<3){ball.vx+=nx*3;ball.vy+=ny*3;}
    strike(100);
  }
  function flipper(pivotX,tipX,tipY,pressed,dir){
    const px=pivotX,py=436,rx=tipX-px,ry=tipY-py;
    const len2=rx*rx+ry*ry;
    const t=Math.max(0,Math.min(1,((ball.x-px)*rx+(ball.y-py)*ry)/len2));
    const closestX=px+rx*t,closestY=py+ry*t;
    const dx=ball.x-closestX,dy=ball.y-closestY;
    if(Math.hypot(dx,dy)<14&&ball.vy>-.7){
      ball.y=closestY-15;
      ball.vy=pressed?-10.8:-6.0;
      ball.vx=dir*(pressed?3.1:1.6)+(Math.random()-.5)*1.4;
      if(pressed)strike(5);
    }
  }
  function physics(dt) {
    if(!ball.active)return;
    const steps=Math.max(1,Math.ceil(dt*3));
    for(let i=0;i<steps;i++){
      const s=dt/steps;
      ball.vy=Math.min(14,ball.vy+gravity*s);
      ball.x+=ball.vx*s;ball.y+=ball.vy*s;
      ball.vx*=.999;
      wallCollision();
      if(!ball.active)break;
      for(const b of bumpers)bump(b);
      // Side rails funnel the ball towards the flippers.
      if(ball.y>357&&ball.y<437){
        if(ball.x<43+(ball.y-357)*.5){ball.x=43+(ball.y-357)*.5;ball.vx=Math.abs(ball.vx)*.8;ball.vy-=.3;}
        if(ball.x>276-(ball.y-357)*.5){ball.x=276-(ball.y-357)*.5;ball.vx=-Math.abs(ball.vx)*.8;ball.vy-=.3;}
      }
      flipper(91,leftDown?154:144,leftDown?415:450,leftDown,1);
      flipper(228,rightDown?166:176,rightDown?415:450,rightDown,-1);
      if(ball.y>455&&(ball.x<104||ball.x>216)){ball.vy=-Math.abs(ball.vy)*.68;ball.vx+=ball.x<160?1.2:-1.2;}
    }
  }
  function circle(x,y,r,fill,stroke='#ffffff40'){
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
  }
  const stars=Array.from({length:50},(_,i)=>({x:(i*73+37)%W,y:(i*109+27)%H,r:i%5===0?1.4:.65}));
  function draw(){
    drawPlayfield(ctx,{ball,balls,leftDown,rightDown,bumpers,score,now:performance.now()});
  }
  function frame(now){
    if(!running)return;
    const dt=last?Math.min(2.5,(now-last)/16.667):1;last=now;
    if(!document.hidden)physics(dt);
    draw();
    request=requestAnimationFrame(frame);
  }
  function keyboard(e){
    if(e.key==='ArrowLeft'||e.key==='a') {leftDown=e.type==='keydown';if(e.cancelable)e.preventDefault();}
    if(e.key==='ArrowRight'||e.key==='d'){rightDown=e.type==='keydown';if(e.cancelable)e.preventDefault();}
    if(e.type==='keydown'&&e.code==='Space'){fire();e.preventDefault();}
  }
  function buttonHold(button,kind){
    const set=state=>{if(kind==='left')leftDown=state;else rightDown=state;};
    button.addEventListener('pointerdown',e=>{button.setPointerCapture(e.pointerId);set(true);e.preventDefault();});
    button.addEventListener('pointerup',()=>set(false));
    button.addEventListener('pointercancel',()=>set(false));
    button.addEventListener('lostpointercapture',()=>set(false));
  }
  buttonHold(left,'left');buttonHold(right,'right');
  launch.addEventListener('click',fire);
  window.addEventListener('keydown',keyboard);
  window.addEventListener('keyup',keyboard);
  start();request=requestAnimationFrame(frame);
  return {restart:start,cleanup(){running=false;cancelAnimationFrame(request);observer?.disconnect();window.removeEventListener('resize',resizeBitmap);window.removeEventListener('keydown',keyboard);window.removeEventListener('keyup',keyboard);}};
}
