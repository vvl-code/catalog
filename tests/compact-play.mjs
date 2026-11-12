import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const origin=process.env.PREVIEW_URL||'http://127.0.0.1:8123';
const games={blocks:'#board-frame',match3:'.board-shell',solitaire:'.table',word:'.word-board',mines:'.mine-grid',game2048:'.number-grid',snake:'.snake-stage',sudoku:'.sudoku-grid',reversi:'.disc-grid',checkers:'.checker-grid',chess:'.chess-grid',pinball:'.pinball-stage'};
const views=[['phone',390,740],['small-phone',320,568],['tablet',768,1024],['landscape',844,390],['desktop',1725,900]];
const report=[];
const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,vw:innerWidth,vh:innerHeight};};
for(const [browserName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const [name,width,height] of browserName==='webkit'?views.slice(0,1):views){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<960});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.route('https://telegram.org/**',route=>route.fulfill({status:200,contentType:'text/javascript',body:''}));
   const shots='qa/screenshots/compact/'+browserName+'/'+name;await mkdir(shots,{recursive:true});
   try{
    await page.goto(origin+'/',{waitUntil:'load'});
    for(const [game,selector] of Object.entries(games)){
     await page.locator('.game-card[data-game="'+game+'"]').click();
     const frame=page.frameLocator('#game-frame');
     await frame.locator('body.mg-play').waitFor();
     await page.waitForFunction(()=>!document.getElementById('game-menu-button').disabled);
     await page.waitForTimeout(150);
     const bounds=await frame.locator(selector).evaluate(rect);
     assert.ok(bounds.x>=-2&&bounds.right<=bounds.vw+2,game+' horizontally clipped '+JSON.stringify(bounds));
     assert.ok(bounds.y>=-2&&bounds.bottom<=bounds.vh+3,game+' vertically clipped '+JSON.stringify(bounds));
     assert.equal(await frame.locator('.shell>.top:visible,.app-shell>.top-bar:visible').count(),0,game+' duplicate header');
     assert.equal(await frame.locator('.mg-shell>.metrics:visible,.mg-shell>.instructions:visible,.mg-shell>.help:visible').count(),0,game+' unnecessary permanent panels');
     const hud=await page.locator('.player-bar').evaluate(rect);
     assert.ok(hud.height<=49,'Common bar must fit one 48px row');
     assert.ok((await page.locator('.mg-hud-item').count())>=1,game+' lacks score/turn in compact bar');
     await page.locator('#game-menu-button').click();
     await frame.locator('#mg-game-menu[open]').waitFor();
     assert.ok(await frame.locator('.mg-rules').isVisible(),game+' instructions are missing from menu');
     await frame.locator('.mg-resume').click();
     await frame.locator('#mg-game-menu').waitFor({state:'hidden'});
     if(game==='pinball'){
      const buttons=await frame.locator('.flipper-controls button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};}));
      for(const button of buttons){
       assert.ok(button.h>=44&&button.w>=44,'Touch targets are too small');
       const overlap=Math.max(0,Math.min(bounds.right,button.right)-Math.max(bounds.x,button.x))*Math.max(0,Math.min(bounds.bottom,button.bottom)-Math.max(bounds.y,button.y));
       assert.equal(overlap,0,'Flipper controls cover the playfield');
      }
      assert.ok(bounds.height>=Math.min((bounds.vw-20)/.64,bounds.vh-120)*.93,'Pinball still wastes available space');
      const launch=frame.locator('#pinball-launch');assert.ok(await launch.isVisible(),'Launch must be available between balls');
      await page.screenshot({path:shots+'/pinball-ready.png'});
      await launch.click();await launch.waitFor({state:'hidden'});
      const playBounds=await frame.locator(selector).evaluate(rect);
      assert.ok(playBounds.height>=bounds.height,'Playing field shrank after launching');
      await page.screenshot({path:shots+'/pinball-playing.png'});
      await page.locator('#game-menu-button').click();await frame.locator('#mg-game-menu[open]').waitFor();
      const phase=await frame.locator('.pinball-layout').getAttribute('data-phase');
      await page.waitForTimeout(350);assert.equal(await frame.locator('.pinball-layout').getAttribute('data-phase'),phase,'Menu did not suspend gameplay');
      await frame.locator('#restart').click();await launch.waitFor({state:'visible'});
     }else if(game==='blocks'){
      await frame.locator('#overlay-button').click();await page.waitForTimeout(100);
      await page.locator('#game-menu-button').click();await frame.locator('#mg-game-menu[open]').waitFor();
      await page.waitForFunction(()=>document.getElementById('game-frame').contentDocument.getElementById('overlay-title').textContent==='Пауза');
      await frame.locator('.mg-resume').click();await frame.locator('#overlay').waitFor({state:'hidden'});
     }
     if(['blocks','match3','solitaire','chess','sudoku','word'].includes(game))await page.screenshot({path:shots+'/'+game+'.png'});
     report.push({browser:browserName,view:name,game,field:bounds});
     await page.locator('#back-to-games').click();await page.locator('#catalog-view').waitFor({state:'visible'});
    }
    assert.deepEqual(errors,[],'No game should crash when compact menus are opened');
    // All four independent HTML entry points also work without the catalog iframe.
    if(name==='phone')for(const url of ['blocks/','match3/','solitaire/','arcade/?game=pinball']){
     await page.goto(origin+'/'+url,{waitUntil:'load'});await page.locator('body.mg-play[data-embedded="false"]').waitFor();
     assert.equal(await page.locator('.mg-bar:visible').count(),1,'Standalone play needs exactly one bar');
     await page.locator('.mg-more').click();await page.locator('#mg-game-menu[open]').waitFor();await page.locator('.mg-close').click();
    }
    console.log('PASS compact '+browserName+' '+name+': 12 games, menu, HUD, no overlap, pause and launch');
   }catch(error){await page.screenshot({path:shots+'/failure.png'}).catch(()=>{});throw error;}
   finally{await context.close();}
  }
 }finally{await browser.close();}
}
await mkdir('qa/screenshots/compact',{recursive:true});
await writeFile('qa/screenshots/compact/metrics.json',JSON.stringify(report,null,2));
