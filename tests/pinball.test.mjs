import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballEngine,PHASE,BUMPERS,DROP_TARGETS,FIELD} from '../arcade/pinball-engine.js';

const newEngine=()=>new PinballEngine({random:()=>.5});
const forceDrain=engine=>{
  assert.equal(engine.phase,PHASE.PLAYING,'must be actively playing');
  engine.ball.y=FIELD.height+FIELD.ballRadius+2;
  engine.ball.x=160;engine.ball.vy=8;
  engine.step(1);
};

test('Pinball: first drain arms ball 2 instead of freezing or ending the game',()=>{
  const game=newEngine();
  assert.equal(game.phase,PHASE.READY);
  assert.equal(game.remaining,3);
  assert.equal(game.ballNumber,1);
  assert.equal(game.launch(),true);
  assert.equal(game.launch(),false,'cannot launch two balls simultaneously');
  forceDrain(game);
  assert.equal(game.phase,PHASE.READY);
  assert.equal(game.ballNumber,2);
  assert.equal(game.remaining,2);
  assert.equal(game.ball.active,false);
  assert.equal(game.launch(),true,'second ball must be launchable');
  assert.equal(game.phase,PHASE.PLAYING);
});

test('Pinball: third drain ends game and restart restores launch availability',()=>{
  const game=newEngine();
  for(let number=1;number<=3;number++){
    assert.equal(game.ballNumber,number);
    assert.equal(game.launch(),true);
    forceDrain(game);
  }
  assert.equal(game.remaining,0);
  assert.equal(game.phase,PHASE.OVER);
  assert.equal(game.launch(),false,'no fourth free ball');
  game.newGame();
  assert.equal(game.phase,PHASE.READY);
  assert.equal(game.remaining,3);
  assert.equal(game.score,0);
  assert.equal(game.ballNumber,1);
  assert.equal(game.launch(),true,'restart must permit the next launch');
});

test('Pinball: side out-lane genuinely drains; never loops forever below flippers',()=>{
  for(const x of [38,278]){
    const game=newEngine();
    game.launch();
    game.ball={x,y:467,vx:0,vy:7,active:true,inLauncher:false};
    for(let i=0;i<24&&game.phase===PHASE.PLAYING;i++)game.step(1);
    assert.equal(game.phase,PHASE.READY,'outlane at x='+x+' must lose a ball');
    assert.equal(game.remaining,2);
  }
});

test('Pinball: two flippers have independent controls and reset on drain',()=>{
  const game=newEngine();
  game.launch();
  game.setFlipper('left',true);game.setFlipper('right',false);
  assert.equal(game.leftDown,true);assert.equal(game.rightDown,false);
  forceDrain(game);
  assert.equal(game.leftDown,false);assert.equal(game.rightDown,false);
  assert.throws(()=>game.setFlipper('middle',true),RangeError);
});

test('Pinball: charged kickback returns ball, clears itself and consumes no life',()=>{
  const game=newEngine();
  game.launch();
  game.kickerLights[0]=true;
  game.ball={x:45,y:454,vx:0,vy:5,active:true,inLauncher:false};
  game.step(1);
  assert.equal(game.phase,PHASE.PLAYING);
  assert.equal(game.remaining,3);
  assert.equal(game.kickerLights[0],false);
  assert.ok(game.ball.vy<0);
});

test('Pinball: attack bumpers, drop targets and missions score without blocking launch',()=>{
  const game=newEngine();
  game.launch();
  const b=game.bumpers[0];
  game.ball={x:b.x-20,y:b.y,vx:6,vy:0,active:true,inLauncher:false};
  game.step(1);
  assert.ok(game.score>=500);
  assert.ok(game.attackHits>=1);
  game.dropTargets=[true,true,true];
  game.missionAdvance('drop');
  assert.equal(game.bonusMultiplier,2);
  assert.deepEqual(game.dropTargets,[false,false,false]);
  assert.ok(DROP_TARGETS.length>=3&&BUMPERS.length>=4);
});

test('Pinball: extra ball is consumed before a regular ball',()=>{
  const game=newEngine();
  game.launch();
  game.extraBalls=1;
  forceDrain(game);
  assert.equal(game.phase,PHASE.READY);
  assert.equal(game.ballNumber,1);
  assert.equal(game.remaining,3);
  assert.equal(game.extraBalls,0);
  assert.equal(game.launch(),true);
});

test('Pinball: numeric divergence in the physics simulation is recoverable',()=>{
  const game=newEngine();
  game.launch();
  game.ball.x=Number.NaN;
  game.step(1);
  assert.equal(game.phase,PHASE.READY);
  assert.equal(game.remaining,2);
});
