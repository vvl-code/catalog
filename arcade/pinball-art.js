/**
 * Original, hand-drawn retro mechanical pinball playfield.
 * Inspired by the dense metallic space-table aesthetic of 1990s desktop
 * pinball, without shipping or tracing any proprietary game assets.
 */
function path(ctx, points, close = false) {
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);
  for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
  if (close) ctx.closePath();
}
function capsule(ctx,x,y,w,h,r) {
  const radius=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+radius,y);
  ctx.lineTo(x+w-radius,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+radius);
  ctx.lineTo(x+w,y+h-radius);
  ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);
  ctx.lineTo(x+radius,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-radius);
  ctx.lineTo(x,y+radius);
  ctx.quadraticCurveTo(x,y,x+radius,y);
  ctx.closePath();
}
function disc(ctx,x,y,r,fill,stroke=null,width=1) {
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}
}
function gradient(ctx,x,y,r,mid,edge) {
  const g=ctx.createRadialGradient(x-r*.3,y-r*.35,1,x,y,r);
  g.addColorStop(0,mid);g.addColorStop(1,edge);
  return g;
}
function tube(ctx,pts,color='#bd3c50',width=7,highlight='#ffe4c5') {
  ctx.save();
  ctx.lineJoin='round';ctx.lineCap='round';
  path(ctx,pts);ctx.strokeStyle='#080b1a';ctx.lineWidth=width+5;ctx.stroke();
  path(ctx,pts);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  path(ctx,pts);ctx.strokeStyle=highlight;ctx.lineWidth=Math.max(1,width*.18);ctx.stroke();
  ctx.restore();
}
function light(ctx,x,y,lit,color,r=4) {
  const g=ctx.createRadialGradient(x,y,0,x,y,lit?r*3:r);
  g.addColorStop(0,lit?color:'#5d4962');
  g.addColorStop(.45,lit?color+'a8':'#675b5e77');
  g.addColorStop(1,'#00000000');
  ctx.fillStyle=g;
  ctx.beginPath();ctx.arc(x,y,lit?r*3:r,0,Math.PI*2);ctx.fill();
  disc(ctx,x,y,r,lit?color:'#664e54','#171b2a',.9);
  if(lit)disc(ctx,x-1,y-1,r*.35,'#ffffffd9');
}
function arrow(ctx,x,y,color,rotation=0,scale=1) {
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(scale,scale);
  path(ctx,[[0,-10],[9,3],[3,3],[3,11],[-3,11],[-3,3],[-9,3]],true);
  ctx.fillStyle=color;ctx.shadowBlur=9;ctx.shadowColor=color;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#06102a';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
function drawBumper(ctx,b,now) {
  const {x,y,r}=b,hot=b.hitAt&&(now-b.hitAt<230);
  ctx.save();
  ctx.shadowBlur=hot?24:9;ctx.shadowColor=hot?'#f8f1a0':'#ff8085aa';
  disc(ctx,x,y,r+7,gradient(ctx,x,y,r+7,'#9caec5','#2c334b'),'#10192f',2);
  ctx.shadowBlur=0;
  disc(ctx,x,y,r+3,gradient(ctx,x,y,r+4,hot?'#fff9c9':'#fce9ef','#ab3144'),'#f7d5e2',1.5);
  disc(ctx,x,y,r-3,gradient(ctx,x,y,r,'#f8ffff','#a1b4c8'),'#541e45',2.5);
  const teeth=8;
  for(let n=0;n<teeth;n++){
    const a=n*Math.PI*2/teeth;
    const px=x+Math.cos(a)*(r-9),py=y+Math.sin(a)*(r-9);
    disc(ctx,px,py,2.1,n%2===0?'#d24257':'#784a9a');
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);
  path(ctx,[[0,-8],[5,-2],[10,0],[5,3],[0,8],[-5,3],[-10,0],[-5,-2]],true);
  ctx.fillStyle=hot?'#ffe878':'#b42e4b';ctx.fill();ctx.strokeStyle='#ffffffcc';ctx.lineWidth=1.5;ctx.stroke();
  ctx.restore();
  disc(ctx,x-5,y-7,3,'#ffffffd6');
  ctx.restore();
}
function launcher(ctx) {
  const g=ctx.createLinearGradient(282,0,309,0);
  g.addColorStop(0,'#182439');g.addColorStop(.35,'#69354d');g.addColorStop(.7,'#a44e42');g.addColorStop(1,'#282436');
  ctx.fillStyle=g;capsule(ctx,282,83,29,371,12);ctx.fill();
  tube(ctx,[[281,92],[281,430]],'#c33d4d',5,'#f5ccaa');
  tube(ctx,[[311,90],[311,470]],'#bd654c',5,'#f4d9a4');
  ctx.strokeStyle='#8b9dab';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(289,351);ctx.lineTo(306,351);ctx.stroke();
  for(let i=0;i<5;i++)light(ctx,296,130+i*54,i%2===0,'#ffcf5a',3);
  capsule(ctx,289,412,11,34,4);ctx.fillStyle='#8d9ead';ctx.fill();ctx.strokeStyle='#f0cc8b';ctx.lineWidth=1;ctx.stroke();
  ctx.save();ctx.textAlign='center';ctx.fillStyle='#ffe5a6';ctx.font='bold 7px monospace';ctx.fillText('PLUNGER',295,464);ctx.restore();
}
function ramp(ctx) {
  ctx.save();
  // Raised lavender transit ramp, rather than a flat decorative arc.
  ctx.beginPath();ctx.moveTo(13,224);ctx.bezierCurveTo(20,174,44,137,80,134);
  ctx.bezierCurveTo(114,136,118,174,118,216);
  ctx.lineTo(99,216);ctx.bezierCurveTo(100,174,89,162,78,163);
  ctx.bezierCurveTo(49,163,43,198,38,241);ctx.closePath();
  const grad=ctx.createLinearGradient(15,130,120,228);
  grad.addColorStop(0,'#d6d3ff');grad.addColorStop(.45,'#8988d2');grad.addColorStop(1,'#4a4d91');
  ctx.fillStyle=grad;ctx.shadowBlur=8;ctx.shadowColor='#c1aaff88';ctx.fill();
  ctx.shadowBlur=0;ctx.strokeStyle='#eef5ff';ctx.lineWidth=3;ctx.stroke();
  ctx.beginPath();ctx.moveTo(24,220);ctx.bezierCurveTo(35,168,50,144,79,146);ctx.bezierCurveTo(104,146,111,181,110,216);
  ctx.strokeStyle='#52428c';ctx.setLineDash([7,6]);ctx.lineWidth=4;ctx.stroke();ctx.setLineDash([]);
  for(let i=0;i<4;i++)arrow(ctx,61+i*11,172+i*9,'#eee2ff',Math.PI*.5,.33);
  ctx.restore();
}
function reactor(ctx,now,score) {
  const x=158,y=312,r=47;
  disc(ctx,x,y,r+8,'#151f48','#714fa2',5);
  ctx.save();ctx.shadowBlur=13;ctx.shadowColor='#61a9f8';
  disc(ctx,x,y,r+2,gradient(ctx,x,y,54,'#8dd5ff','#1d5481'),'#b4d4fa',3);
  ctx.restore();
  for(let i=0;i<22;i++){
    const theta=i*Math.PI*2/22+Math.PI/2;
    const lx=x+Math.cos(theta)*57,ly=y+Math.sin(theta)*57;
    light(ctx,lx,ly,(i+Math.floor(now/280))%4!==0,i%3===0?'#ffd86b':'#47bfff',3.2);
  }
  for(let i=0;i<10;i++){
    const theta=i*Math.PI*2/10;
    light(ctx,x+Math.cos(theta)*34,y+Math.sin(theta)*34,(i+Math.floor(score/100))%3===0,'#ffb659',3.7);
  }
  disc(ctx,x,y,27,gradient(ctx,x,y,29,'#6ed4ef','#316399'),'#102e4d',3);
  disc(ctx,x,y,8,'#9df4ff','#2355a0',3);
  disc(ctx,x-5,y-8,3,'#efffff');
  ctx.save();ctx.textAlign='center';ctx.fillStyle='#c7d9ee';ctx.font='bold 8px monospace';ctx.fillText('CORE',x,y+18);ctx.restore();
}
function slingshot(ctx,side) {
  ctx.save();const left=side==='left';
  const points=left?[[41,353],[117,394],[95,420]]:[[278,353],[201,394],[223,420]];
  path(ctx,points,true);
  ctx.fillStyle=gradient(ctx,left?85:235,393,53,'#2e3054','#090b1c');
  ctx.fill();ctx.strokeStyle='#b72f55';ctx.lineWidth=5;ctx.stroke();
  path(ctx,points);ctx.strokeStyle='#ffe6da';ctx.lineWidth=1.2;ctx.stroke();
  path(ctx,left?[[63,365],[90,389],[76,388],[103,410]]:[[255,365],[230,389],[244,388],[217,410]]);
  ctx.strokeStyle='#b4ebf1';ctx.lineWidth=3;ctx.shadowBlur=8;ctx.shadowColor='#8cd9ef';ctx.stroke();ctx.shadowBlur=0;
  ctx.restore();
}
function flipper(ctx,px,py,tx,ty,power) {
  ctx.save();
  ctx.lineCap='round';ctx.shadowBlur=power?15:4;ctx.shadowColor=power?'#f8a9ed':'#f5a0b176';
  ctx.lineWidth=17;ctx.strokeStyle='#1b0d29';path(ctx,[[px,py],[tx,ty]]);ctx.stroke();
  const grad=ctx.createLinearGradient(px,py-8,px,py+10);
  grad.addColorStop(0,'#f2c6ec');grad.addColorStop(.5,power?'#d164b9':'#a75da0');grad.addColorStop(1,'#502c75');
  ctx.lineWidth=12;ctx.strokeStyle=grad;path(ctx,[[px,py],[tx,ty]]);ctx.stroke();
  ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle='#fff4f3';path(ctx,[[px,py-3],[tx,ty-3]]);ctx.stroke();
  disc(ctx,px,py,8,gradient(ctx,px,py,8,'#b3b5e0','#563959'),'#ffceee',1.3);
  ctx.restore();
}
export function drawPlayfield(ctx,{ball,balls,leftDown,rightDown,bumpers,score,now,phase='ready',dropTargets=[false,false,false],reentry=[false,false,false],kickerLights=[false,false],attackHits=0,bonusMultiplier=1}) {
  const W=320,H=500;
  ctx.save();
  const outer=ctx.createLinearGradient(0,0,W,H);
  outer.addColorStop(0,'#20233e');outer.addColorStop(.5,'#090b17');outer.addColorStop(1,'#1b1c31');
  ctx.fillStyle=outer;ctx.fillRect(0,0,W,H);
  capsule(ctx,8,8,304,482,13);ctx.fillStyle='#080c1a';ctx.fill();
  ctx.save();ctx.beginPath();ctx.rect(14,14,292,470);ctx.clip();
  const bg=ctx.createRadialGradient(155,320,22,160,215,320);
  bg.addColorStop(0,'#30376d');bg.addColorStop(.38,'#1a214b');bg.addColorStop(1,'#080d23');
  ctx.fillStyle=bg;ctx.fillRect(13,13,294,477);
  // Woven metallic backdrop like a classic densely packed pinball table.
  ctx.lineWidth=1;ctx.strokeStyle='#48529433';
  for(let x=-170;x<460;x+=22){
    path(ctx,[[x,0],[x+160,500]]);ctx.stroke();
    path(ctx,[[x,500],[x+160,0]]);ctx.stroke();
  }
  for(let i=0;i<70;i++){
    const x=20+(i*83)%274,y=18+(i*113)%453;
    disc(ctx,x,y,i%9===0?1.1:.55,i%4===0?'#e9d3ff70':'#7d9ae160');
  }
  // Space lanes with sweeping ruby and brass guards at the top.
  tube(ctx,[[24,230],[24,70],[39,33],[104,19],[218,19],[262,40],[276,80]],'#a63a48',8,'#edb1a2');
  tube(ctx,[[35,110],[52,51],[101,38],[198,38],[244,58],[266,104]],'#93794f',5,'#fff0ac');
  for(let i=0;i<9;i++)light(ctx,66+i*23,42+i%2*2,i%2===0,'#ffd66e',3);
  // Three independent yellow drop targets; physical collisions and lamps match.
  for(let i=0;i<3;i++){
    const x=129+i*22,hit=dropTargets[i];
    capsule(ctx,x,65,16,29,3);
    const metal=ctx.createLinearGradient(x,65,x+16,94);
    metal.addColorStop(0,hit?'#614b55':'#fff1a6');
    metal.addColorStop(.55,hit?'#783647':'#eab762');
    metal.addColorStop(1,hit?'#371e30':'#875647');
    ctx.fillStyle=metal;ctx.fill();
    ctx.strokeStyle='#f8ecdb';ctx.lineWidth=1.2;ctx.stroke();
    capsule(ctx,x+4,68,8,21,2);ctx.strokeStyle='#ad8c62';ctx.lineWidth=1;ctx.stroke();
    light(ctx,x+8,60,!hit,'#ffe36b',3);
  }
  ctx.save();ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle='#c9cbff';
  ctx.fillText('MISSION TARGETS',168,108);
  ctx.restore();
  // Three re-entry lanes with round amber light indicators.
  for(let i=0;i<3;i++){
    const lx=96+i*57;
    light(ctx,lx,39,reentry[i],reentry[i]?'#7bf9a7':'#ffbd54',4);
    tube(ctx,[[lx-21,25],[lx-21,57]],'#5d455c',3,'#cec6d1');
  }
  ctx.fillStyle='#b7a0db';ctx.textAlign='center';ctx.font='bold 7px monospace';
  ctx.fillText('RE-ENTRY',165,22);
  // Raised warp-ramp on the left and arrow guides on the right.
  ramp(ctx);
  launcher(ctx);
  // Mechanical details visible in the classic Windows space-table silhouette:
  // fuel-lamp bank, a black-hole kickout, three-mission bank and wormhole.
  ctx.save();
  capsule(ctx,45,101,22,76,7);ctx.fillStyle='#191b3e';ctx.fill();
  ctx.strokeStyle='#9c91ab';ctx.lineWidth=2;ctx.stroke();
  for(let i=0;i<5;i++)light(ctx,56,111+i*13,(i+Math.floor(now/380))%4<3,'#d6ff65',2.8);
  ctx.fillStyle='#d2a8e8';ctx.font='bold 7px monospace';ctx.save();
  ctx.translate(41,134);ctx.rotate(-Math.PI/2);ctx.fillText('FUEL',0,0);ctx.restore();

  const hole=gradient(ctx,236,179,22,'#465078','#0b0a23');
  disc(ctx,236,179,22,hole,'#c98e95',3.7);
  disc(ctx,236,179,14,'#050713','#84829d',2);
  ctx.strokeStyle='#ad8ba7';ctx.lineWidth=3;
  for(let a=0;a<5;a++){ctx.beginPath();ctx.arc(236,179,18,a*Math.PI*.38,(a+.55)*Math.PI*.38);ctx.stroke();}
  light(ctx,234,159,attackHits>=4,'#facc63',3);
  ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillStyle='#c6d3f3';
  ctx.fillText('HYPER',236,209);

  // Three white-rimmed spot targets on the right-hand mission bank.
  for(let i=0;i<3;i++){
    const y=220+i*23;
    capsule(ctx,241,y,11,13,2);
    ctx.fillStyle=i%2===0?'#f2edb2':'#e9cb88';ctx.fill();
    ctx.strokeStyle='#b9565c';ctx.lineWidth=2;ctx.stroke();
    light(ctx,260,y+6,(attackHits+i)%3===0,'#ffcf65',2.7);
  }

  // Purple wormhole with red inset and orbit registration markers.
  disc(ctx,58,260,14,gradient(ctx,58,260,15,'#b1adfb','#5a417d'),'#f7b5d9',2);
  disc(ctx,58,260,8,'#241a47','#eed8fc',1.6);
  disc(ctx,58,260,3,'#fe5371');
  for(let i=0;i<5;i++)light(ctx,46+i*7,283,(i+Math.floor(now/250))%2===0,'#7ae9ff',2.6);
  ctx.fillStyle='#aeb4eb';ctx.font='bold 7px monospace';ctx.fillText('WORMHOLE',60,295);
  ctx.restore();
  tube(ctx,[[235,56],[258,87],[269,132],[263,187]],'#a23a59',6,'#f4c5b3');
  for(let i=0;i<6;i++)light(ctx,247+i%3*7,87+i*20,i%2===0,'#ffd864',3);
  for(const bumper of bumpers){
    if(bumper.r>=18 && bumper.y<250)drawBumper(ctx,bumper,now);
  }
  // Distinct smaller posts below the upper bumper cluster.
  for(const b of bumpers){
    if(b.r>=18 && b.y<250)continue;
    if(b.r>23)continue;
    disc(ctx,b.x,b.y,b.r+4,gradient(ctx,b.x,b.y,b.r+4,'#cfddeb','#33496d'),'#f99b73',2);
    disc(ctx,b.x,b.y,b.r-3,gradient(ctx,b.x,b.y,b.r,'#f7b861','#8a274a'),'#ffebd8',2);
  }
  ctx.save();ctx.translate(155,243);
  path(ctx,[[-16,-18],[12,-11],[20,9],[-6,21],[-20,9]],true);
  ctx.fillStyle='#be2c68';ctx.shadowBlur=12;ctx.shadowColor='#e54f9d';ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#ffe3fd';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText('WARP',0,4);ctx.restore();
  // Large illuminated reactor ring near the mid/lower part of the board.
  reactor(ctx,now,score);
  // Raised pink-purple bottom plates, a distinctive Space Cadet silhouette.
  ctx.save();
  path(ctx,[[120,459],[131,422],[144,455],[152,414],[160,459],[176,413],[189,459]],true);
  const purple=ctx.createLinearGradient(120,414,170,461);
  purple.addColorStop(0,'#f3b3e6');purple.addColorStop(.5,'#9055a8');purple.addColorStop(1,'#3a2f67');
  ctx.fillStyle=purple;ctx.shadowColor='#ca8df1';ctx.shadowBlur=9;ctx.fill();
  ctx.strokeStyle='#eab7ec';ctx.lineWidth=1.3;ctx.stroke();
  ctx.restore();
  // Active outlane kickers have practical gameplay effects.
  for(let i=0;i<2;i++)light(ctx,i===0?47:270,460,!!kickerLights[i],'#fdca6b',4.2);
  // Mechanical triangular kickbacks above the flippers.
  slingshot(ctx,'left');slingshot(ctx,'right');
  arrow(ctx,49,321,'#e8e761',-.2,.65);
  arrow(ctx,267,330,'#efde62',.3,.65);
  tube(ctx,[[21,310],[28,375],[67,423]],'#b85d56',5,'#fad6b7');
  tube(ctx,[[273,424],[285,380],[286,300]],'#ab5860',5,'#ffd0a4');
  for(let i=0;i<4;i++){light(ctx,38+i*10,282+i*6,i%2===0,'#ffdf78',2.5);light(ctx,273-i*7,281+i*8,i%2===1,'#f4c669',2.5);}
  // Inlane guides, rubber bump stops and illuminated return arrows.
  tube(ctx,[[30,365],[76,408],[87,429]],'#d77b62',4,'#fff0db');
  tube(ctx,[[289,365],[242,408],[230,429]],'#d77b62',4,'#fff0db');
  arrow(ctx,58,435,'#f8e06a',.8,.5);arrow(ctx,263,435,'#f8e06a',-.8,.5);
  flipper(ctx,91,436,leftDown?154:144,leftDown?415:450,leftDown);
  flipper(ctx,228,436,rightDown?166:176,rightDown?415:450,rightDown);
  for(const x of [75,160,242])light(ctx,x,461,x===160,'#ffe66d',4);
  ctx.save();ctx.textAlign='center';
  ctx.font='bold 10px monospace';ctx.fillStyle='#e2af77';
  ctx.fillText('STELLAR',158,485);ctx.restore();
  ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillStyle='#a3b7d6';
  ctx.fillText('×'+bonusMultiplier+' BONUS',157,472);
  // Chrome ball and launch lane ready state.
  if(ball.active){
    ctx.save();ctx.shadowBlur=12;ctx.shadowColor='#8dceff';
    disc(ctx,ball.x+2,ball.y+3,7,'#050b25');
    disc(ctx,ball.x,ball.y,7,gradient(ctx,ball.x,ball.y,8,'#ffffff','#5b789d'),'#f2fdff',1);
    ctx.shadowBlur=0;disc(ctx,ball.x-2,ball.y-2,2,'#ffffff');ctx.restore();
  }else if(balls>0&&phase==='ready'){
    disc(ctx,294,455,7,gradient(ctx,294,455,8,'#ffffff','#6e8fac'),'#efffff',1);
  }
  ctx.restore();
  // Outer bevel, frame edge and rivets remain fixed above the playfield.
  capsule(ctx,8,8,304,482,13);ctx.strokeStyle='#8c93ae';ctx.lineWidth=5;ctx.stroke();
  capsule(ctx,13,13,294,473,11);ctx.strokeStyle='#3b415c';ctx.lineWidth=2;ctx.stroke();
  for(const x of [17,303])for(const y of [18,480])disc(ctx,x,y,3,'#a4a3b7','#181b29',1);
  ctx.restore();
}
