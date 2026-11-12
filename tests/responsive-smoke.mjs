import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin=process.env.PREVIEW_URL||'http://127.0.0.1:8123';
const cases=[
  ['small-phone',320,568],
  ['large-phone',430,932],
  ['landscape',844,390]
];
const selectors={
 blocks:'#board-frame',
 match3:'.board-shell',
 solitaire:'#tableau',
 word:'.word-board',
 mines:'.mine-grid',
 game2048:'.number-grid',
 snake:'.snake-stage',
 sudoku:'.sudoku-grid',
 reversi:'.disc-grid',
 checkers:'.checker-grid',
 chess:'.chess-grid',
 pinball:'.pinball-wrapper'
};
const ids=Object.keys(selectors);
const samples=new Set(['blocks','match3','solitaire','chess','pinball']);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const failures=[];
try {
 for(const [name,width,height] of cases){
  const context=await browser.newContext({
   viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const dest='qa/screenshots/responsive/'+name;
  await mkdir(dest,{recursive:true});
  try{
   await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:20000});
   await page.waitForFunction(()=>document.querySelectorAll('[data-game]').length===12);
   const catalogWidth=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(catalogWidth<=3,name+' catalog overflow: '+catalogWidth);
   await page.screenshot({path:dest+'/catalog.png',fullPage:true});
   for(const id of ids){
    await page.locator('[data-game="'+id+'"]').click();
    const frame=page.frameLocator('#game-frame');
    await frame.locator(selectors[id]).waitFor({state:'visible',timeout:15000});
    const geometry=await frame.locator(selectors[id]).evaluate(el=>{
     const rect=el.getBoundingClientRect();
     return {x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height,
       viewWidth:innerWidth,viewHeight:innerHeight,
       overflow:document.documentElement.scrollWidth-innerWidth,
       documentHeight:document.documentElement.scrollHeight};
    });
    assert.ok(geometry.overflow<=3,name+' '+id+' horizontal overflow '+JSON.stringify(geometry));
    assert.ok(geometry.x>=-2&&geometry.right<=geometry.viewWidth+2,
      name+' '+id+' playfield clipped horizontally '+JSON.stringify(geometry));
    assert.ok(geometry.height>0&&geometry.width>0,name+' '+id+' playfield missing');

    if(name==='landscape' && ['blocks','match3','game2048','mines','reversi','checkers','chess','sudoku','pinball'].includes(id)){
      assert.ok(geometry.y>=-2&&geometry.bottom<=geometry.viewHeight+3,
        id+' must fit vertically in landscape view, got '+JSON.stringify(geometry));
    }

    if(['match3','sudoku','reversi','checkers','chess','game2048'].includes(id)){
      const ratio=geometry.width/geometry.height;
      assert.ok(ratio>=.92&&ratio<=1.08,name+' '+id+' game board distorted: '+ratio);
    }
    if(id==='solitaire'){
     const card=frame.locator('.tableau-col[data-column="0"] .card[data-source="tableau"]');
     await card.click({position:{x:5,y:5}});
     const result=await frame.locator('.tableau-col[data-column="0"]').evaluate(el=>({
      border:getComputedStyle(el).borderColor,
      active:!!el.querySelector('.card.selected')
     }));
     assert.equal(result.active,true,name+' Solitaire card selection failed');
     assert.match(result.border,/rgba?\(0,\s*0,\s*0,\s*0\)/,
       name+' Solitaire selected column has unwanted outline: '+result.border);
    }
    if(id==='pinball'){
     const bounds=await frame.locator('body').evaluate(()=>{
      const stage=document.querySelector('.pinball-wrapper').getBoundingClientRect();
      const flippers=[...document.querySelectorAll('.flipper-controls button')].map(e=>e.getBoundingClientRect());
      return {stage:{left:stage.left,right:stage.right},controls:flippers.map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),w:innerWidth};
     });
     assert.equal(bounds.controls.length,2,'Pinball left/right flippers exist');
     assert.ok(bounds.controls.every(r=>r.left>=-2&&r.right<=bounds.w+2),
       name+' Pinball flippers extend beyond available width: '+JSON.stringify(bounds));
    }
    if(samples.has(id)) await page.screenshot({path:dest+'/'+id+'.png',fullPage:false});
    await page.locator('#back-to-games').click();
    await page.locator('#catalog-view').waitFor({state:'visible'});
   }
   assert.deepEqual(errors,[],name+' no JavaScript errors');
   console.log('PASS '+name+' ('+width+'x'+height+'): 12 games are responsive; screenshots captured');
  }catch(e){
   failures.push(name+': '+e.message);
   console.error('FAIL '+name+': '+e.stack);
   await page.screenshot({path:dest+'/failure.png',fullPage:false}).catch(()=>{});
  }finally{await context.close();}
 }
}finally{await browser.close();}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
