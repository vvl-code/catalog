/**
 * Pure game state and fixed-step physics for the original "Stellar" pinball.
 * Coordinates are expressed in logical 320 × 500 playfield units.
 * No browser APIs, timers, DOM or external assets; deterministic with injected RNG.
 */
export const FIELD = Object.freeze({width:320,height:500,ballRadius:7});
export const BUMPERS = Object.freeze([
  {id:'attack-1',x:97,y:125,r:20,kind:'attack'},
  {id:'attack-2',x:157,y:119,r:19,kind:'attack'},
  {id:'attack-3',x:129,y:163,r:20,kind:'attack'},
  {id:'attack-4',x:57,y:199,r:15,kind:'attack'},
  {id:'engine-left',x:82,y:266,r:12,kind:'engine'},
  {id:'engine-right',x:225,y:268,r:12,kind:'engine'}
]);
export const DROP_TARGETS = Object.freeze([
  {id:'drop-0',x:137,y:70,r:9},
  {id:'drop-1',x:159,y:70,r:9},
  {id:'drop-2',x:181,y:70,r:9}
]);
export const PHASE = Object.freeze({READY:'ready',PLAYING:'playing',OVER:'over'});
const initialBall=()=>({x:292,y:453,vx:0,vy:0,active:false,inLauncher:true});
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const validRandom=n=>Number.isFinite(n)?clamp(n,0,.999999):.5;

export class PinballEngine {
  constructor({random=Math.random}={}) {
    if(typeof random!=='function')throw new TypeError('random must be a function');
    this.random=random;
    this.newGame();
  }
  newGame() {
    this.score=0;
    this.remaining=3;
    this.ballNumber=1;
    this.phase=PHASE.READY;
    this.ball=initialBall();
    this.leftDown=false;this.rightDown=false;
    this.attackHits=0;
    this.completedMissions=0;
    this.bonusMultiplier=1;
    this.dropTargets=[false,false,false];
    this.reentry=[false,false,false];
    this.bumpers=BUMPERS.map(b=>({...b,lastHit:-1000,hitAt:0}));
    this.lastFlipHit=-1000;
    this.tick=0;
    this.launchTick=0;
    this.lastRingInside=false;
    this.extraBalls=0;
    this.kickerLights=[false,false];
    this.message='ОЖИДАНИЕ ЗАПУСКА';
    this.event='new-game';
    this.serial=1;
  }
  emit(event,message=this.message) {
    this.event=event;
    this.message=message;
    this.serial++;
  }
  setFlipper(which,pressed) {
    if(which==='left')this.leftDown=!!pressed;
    else if(which==='right')this.rightDown=!!pressed;
    else throw new RangeError('unknown flipper');
  }
  launch(power=1) {
    if(this.phase!==PHASE.READY)return false;
    const strength=clamp(Number.isFinite(power)?power:1,.45,1);
    const variation=validRandom(this.random());
    this.ball={x:292,y:453,vx:-2.9-(variation*.8),vy:-15.4*strength-2,active:true,inLauncher:true};
    this.launchTick=this.tick;
    this.phase=PHASE.PLAYING;
    this.lastRingInside=false;
    this.emit('launch','ШАР '+this.ballNumber+' В ИГРЕ');
    return true;
  }
  addScore(amount,reason='target') {
    if(!Number.isFinite(amount)||amount<=0)return false;
    this.score+=Math.round(amount*this.bonusMultiplier);
    this.emit(reason);
    return true;
  }
  missionAdvance(kind) {
    if(kind==='attack'){
      this.attackHits++;
      if(this.attackHits>=8) {
        this.attackHits=0;this.completedMissions++;
        this.score+=15000;
        this.emit('mission','ТРЕНИРОВКА МИШЕНЕЙ — ЗАВЕРШЕНА');
      }
    }
    if(kind==='drop'&&this.dropTargets.every(Boolean)) {
      this.dropTargets=[false,false,false];
      this.bonusMultiplier=Math.min(this.bonusMultiplier+1,5);
      this.completedMissions++;
      this.score+=5000;
      if(this.completedMissions%4===0)this.extraBalls++;
      this.emit('mission',this.extraBalls?'НАГРАДА: БОНУСНЫЙ ШАР':'МИССИЯ: БОНУС ×'+this.bonusMultiplier);
    }
    if(kind==='reentry'&&this.reentry.every(Boolean)){
      this.reentry=[false,false,false];
      this.completedMissions++;
      this.score+=10000;
      this.kickerLights=[true,true];
      this.emit('mission','ВОЗВРАЩЕНИЕ НА ОРБИТУ — ВЫПОЛНЕНО');
    }
  }
  loseBall() {
    if(this.phase!==PHASE.PLAYING)return false;
    this.ball=initialBall();
    this.leftDown=false;this.rightDown=false;
    this.dropTargets=[false,false,false];
    this.reentry=[false,false,false];
    this.kickerLights=[false,false];
    this.lastRingInside=false;
    if(this.extraBalls>0){
      this.extraBalls--;
      this.phase=PHASE.READY;
      this.emit('extra','БОНУСНЫЙ ШАР — ПОДГОТОВЛЕН');
      return true;
    }
    this.remaining=Math.max(0,this.remaining-1);
    if(this.remaining>0){
      this.ballNumber=4-this.remaining;
      this.phase=PHASE.READY;
      this.emit('drain','ШАР ПОТЕРЯН. ЗАПУСТИ ШАР '+this.ballNumber);
    } else {
      this.phase=PHASE.OVER;
      this.ballNumber=3;
      this.emit('over','ИГРА ОКОНЧЕНА — НОВАЯ ПАРТИЯ');
    }
    return true;
  }
  bump(b) {
    const p=this.ball;
    const dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy);
    const collision=b.r+FIELD.ballRadius;
    if(d>=collision)return false;
    const nx=d>.0001?dx/d:0,ny=d>.0001?dy/d:-1;
    p.x=b.x+nx*(collision+.8);
    p.y=b.y+ny*(collision+.8);
    const dot=p.vx*nx+p.vy*ny;
    if(dot<0){
      const boost=b.kind==='engine'?1.1:1.5;
      p.vx=(p.vx-1.92*dot*nx)+nx*boost;
      p.vy=(p.vy-1.92*dot*ny)+ny*boost;
    }
    if(this.tick-b.lastHit>15){
      b.lastHit=this.tick;b.hitAt=this.tick;
      this.addScore(b.kind==='engine'?750:500,b.kind+'-bumper');
      this.missionAdvance('attack');
    }
    return true;
  }
  hitDrop(t,index) {
    const p=this.ball,dx=p.x-t.x,dy=p.y-t.y;
    if(Math.abs(dx)>t.r+FIELD.ballRadius||Math.abs(dy)>t.r+FIELD.ballRadius)return;
    if(!this.dropTargets[index]){
      this.dropTargets[index]=true;
      this.addScore(500,'drop-target');
      this.missionAdvance('drop');
    }
    p.vy=Math.abs(p.vy)+1.4;p.vx+=Math.sign(dx||1)*1.1;
    p.y=t.y+t.r+FIELD.ballRadius+1;
  }
  flipper(pivotX,tipX,tipY,pressed,side) {
    const p=this.ball,dx=tipX-pivotX,dy=tipY-436,den=dx*dx+dy*dy;
    const t=clamp(((p.x-pivotX)*dx+(p.y-436)*dy)/den,0,1);
    const sx=pivotX+dx*t,sy=436+dy*t;
    if(Math.hypot(p.x-sx,p.y-sy)<15 && p.vy>.5 && this.tick-this.lastFlipHit>8) {
      this.lastFlipHit=this.tick;
      p.y=sy-16;
      p.vy=pressed?-12.8:-6.5;
      p.vx=side*(pressed?3.9:1.6)+(validRandom(this.random())-.5)*.8;
      if(pressed)this.addScore(25,'flipper-shot');
    }
  }
  nudge(side=0) {
    if(this.phase!==PHASE.PLAYING)return false;
    this.ball.vx+=clamp(side,-1,1)*1.65;
    this.ball.vy-=.8;
    this.emit('nudge','НАКЛОН СТОЛА');
    return true;
  }
  step(delta=1) {
    if(this.phase!==PHASE.PLAYING)return;
    const dt=clamp(Number.isFinite(delta)?delta:1,0,2.5);
    if(dt<=0)return;
    const count=Math.ceil(dt*3),step=dt/count;
    for(let iteration=0;iteration<count;iteration++) {
      const p=this.ball;
      this.tick+=step;
      p.vy=clamp(p.vy+.18*step,-19,15);
      p.x+=p.vx*step;p.y+=p.vy*step;
      p.vx*=Math.pow(.999,step);
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.vx)||!Number.isFinite(p.vy)){
        this.loseBall();break;
      }

      // A drain must be reachable from all lower lanes. Never bounce a ball
      // indefinitely below the flipper pivots.
      if(p.y>=FIELD.height+FIELD.ballRadius){
        this.loseBall();
        break;
      }
      if(p.x<17){p.x=17;p.vx=Math.abs(p.vx)*.87;}
      if(p.x>303){p.x=303;p.vx=-Math.abs(p.vx)*.87;}
      if(p.y<17){p.y=17;p.vy=Math.abs(p.vy)*.87;}

      if(p.inLauncher && p.y<95) {
        p.inLauncher=false;p.x=258;p.vx=-4.8;
        this.addScore(1500,'skill-shot');
      }

      for(const b of this.bumpers)this.bump(b);
      for(let i=0;i<DROP_TARGETS.length;i++)this.hitDrop(DROP_TARGETS[i],i);

      // Lane rollovers: 3 lamps above the upper bumpers, a Space Cadet hallmark.
      if(p.y<77&&p.y>48&&p.vy<0) {
        const lane=clamp(Math.floor((p.x-64)/58),0,2);
        if(!this.reentry[lane]){
          this.reentry[lane]=true;
          this.addScore(500,'reentry-lane');this.missionAdvance('reentry');
        }
      }

      // A rollover ring scores, but does not physically block the ball.
      const inRing=Math.hypot(p.x-155,p.y-315)<51;
      if(inRing&&!this.lastRingInside){
        this.addScore(750,'reactor-rollover');
      }
      this.lastRingInside=inRing;

      // Genuine upper return lanes. Only the area above the flippers funnels
      // the ball inward; below them it must be able to drain normally.
      if(p.y>350&&p.y<424) {
        const leftEdge=31+(p.y-350)*.45;
        const rightEdge=279-(p.y-350)*.45;
        if(p.x<leftEdge&&p.vx<0){p.x=leftEdge;p.vx=Math.abs(p.vx)*.83;p.vy-=.25;}
        if(p.x>rightEdge&&p.vx>0){p.x=rightEdge;p.vx=-Math.abs(p.vx)*.83;p.vy-=.25;}
      }

      if(p.y>=448&&p.y<=478&&(p.x<70||p.x>248)){
        const side=p.x<160?0:1;
        if(this.kickerLights[side]){
          this.kickerLights[side]=false;
          p.vy=-12;p.vx=side===0?4.5:-4.5;
          this.addScore(2000,'kickback');
        }
      }

      if(p.y>=391&&p.y<=461){
        this.flipper(91,this.leftDown?154:144,this.leftDown?415:450,this.leftDown,1);
        this.flipper(228,this.rightDown?166:176,this.rightDown?415:450,this.rightDown,-1);
      }
      // Damp unbounded velocity to protect simulation and touch controls.
      p.vx=clamp(p.vx,-16,16);
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.vx)||!Number.isFinite(p.vy)){
        this.loseBall();break;
      }
    }
  }
  snapshot() {
    return {
      phase:this.phase,score:this.score,ballNumber:this.ballNumber,
      remaining:this.remaining,extraBalls:this.extraBalls,bonusMultiplier:this.bonusMultiplier,
      completedMissions:this.completedMissions,attackHits:this.attackHits,
      dropTargets:[...this.dropTargets],reentry:[...this.reentry],kickerLights:[...this.kickerLights],
      message:this.message,event:this.event,serial:this.serial,
      ball:{...this.ball},
      bumpers:this.bumpers.map(b=>({...b})),
      leftDown:this.leftDown,rightDown:this.rightDown
    };
  }
}
