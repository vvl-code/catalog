import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:8123';
const ids = ['blocks','match3','solitaire','word','mines','game2048','snake','sudoku','reversi','checkers','chess','pinball'];
const selectors = {
  blocks: '#board',
  match3: '#board .gem',
  solitaire: '#tableau .tableau-col',
  word: '#game .word-board',
  mines: '#game .mine-grid',
  game2048: '#game .number-grid',
  snake: '#game .snake-stage',
  sudoku: '#game .sudoku-grid',
  reversi: '#game .disc-grid',
  checkers: '#game .checker-grid',
  chess: '#game .chess-grid',
  pinball: '#game .pinball-stage',
};
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
let failures = [];
for (const [name, viewport] of [
  ['iphone', {width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}],
  ['android', {width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true}]
]) {
  const context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height},
    deviceScaleFactor:viewport.deviceScaleFactor,isMobile:viewport.isMobile,hasTouch:viewport.hasTouch});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', e => errors.push(e.message));
  const shots='qa/screenshots/'+name;
  await mkdir(shots,{recursive:true});
  try {
    await page.goto(origin+'/', {waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(() => document.querySelectorAll('.game-card.compact-card[data-game]').length === 12, {timeout:12000});
    const cards=await page.locator('.game-card.compact-card[data-game]').evaluateAll(elements=>elements.map(el=>el.dataset.game));
    console.log(name+' cards: '+JSON.stringify(cards));
    assert.equal(cards.length,12,'all games must use compact cards: '+JSON.stringify(cards));
    for (const id of ids) assert.equal(await page.locator('.game-card[data-game="'+id+'"]').count(),1,'game card '+id);
    const icon=page.locator('.blocks-card-icon');
    await icon.waitFor();
    const iconDetails=await icon.evaluate(el=>({naturalWidth:el.naturalWidth,displayWidth:el.getBoundingClientRect().width}));
    assert.ok(iconDetails.naturalWidth>0&&iconDetails.displayWidth>=90,'Blocks icon must render at readable size');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert.ok(overflow<=2,'catalog has horizontal overflow '+overflow);
    assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'), './manifest.webmanifest');
    assert.match(await page.title(), /Mini Games/);
    await page.screenshot({path:shots+'/catalog.png',fullPage:true});
    for(const id of ids){
      await page.locator('[data-game="'+id+'"]').click();
      const iframe=await page.$('#game-frame');
      assert.ok(iframe,'game iframe exists');
      const frame=await iframe.contentFrame();
      assert.ok(frame,'game iframe navigation works: '+id);
      await frame.waitForSelector(selectors[id],{timeout:10000});
      if (id === 'blocks') assert.equal(new URL(frame.url()).pathname, '/blocks/', 'Blocks must open inside Mini Games');
      if (id === 'pinball') {
        const controls = await frame.evaluate(() => {
          const flipper = document.querySelector('.flipper-controls button');
          const launcher = document.querySelector('#controls > button');
          if (!flipper || !launcher) return null;
          return {
            flipperBottom: flipper.getBoundingClientRect().bottom,
            launcherBottom: launcher.getBoundingClientRect().bottom,
            height: window.innerHeight
          };
        });
        assert.ok(controls, 'Pinball flipper and launcher buttons exist');
        assert.ok(controls.flipperBottom <= controls.height, 'Pinball flippers must fit without scrolling: ' + JSON.stringify(controls));
        assert.ok(controls.launcherBottom <= controls.height, 'Pinball launcher must fit without scrolling: ' + JSON.stringify(controls));
      }
      await page.screenshot({path:shots+'/'+id+'.png',fullPage:false});

      if (id === 'solitaire') {
        // A face-up partial run, not just the top card, must visibly follow the pointer.
        await frame.evaluate(async () => {
          const {validGame} = await import('./engine.js');
          const used = [12, 24, 36, 22, 38]; // K♠ Q♥ J♣ 10♥ | K♣
          const game = {
            stock:Array.from({length:52},(_,i)=>i).filter(card=>!used.includes(card)),
            waste:[],foundations:Array.from({length:4},()=>[]),
            tableau:Array.from({length:7},()=>[]),
            score:0,moves:0,won:false
          };
          game.tableau[0]=[12,24,36,22].map(card=>({id:card,up:true}));
          game.tableau[1]=[{id:38,up:true}];
          if(!validGame(game)) throw new Error('Invalid Klondike drag fixture');
          localStorage.setItem('mygames-solitaire-state-v1',JSON.stringify({game,past:[]}));
        });
        await frame.goto(origin+'/solitaire/',{waitUntil:'domcontentloaded'});
        await frame.waitForSelector('.tableau-col[data-column="0"] .card[data-index="1"]');
        const fromBox = await frame.locator('.tableau-col[data-column="0"] .card[data-index="1"]').boundingBox();
        const toBox = await frame.locator('.tableau-col[data-column="1"] .card[data-index="0"]').boundingBox();
        assert.ok(fromBox && toBox,'Klondike drag target cards exist');
        const originPoint = {x:fromBox.x+fromBox.width*.5,y:fromBox.y+6};
        const targetPoint = {x:toBox.x+toBox.width*.5,y:toBox.y+12};
        await page.mouse.move(originPoint.x,originPoint.y);
        await page.mouse.down();
        await page.mouse.move(originPoint.x+12,originPoint.y+30,{steps:9});
        assert.equal(await frame.locator('.motion-clone').count(),3,'Three-card face-up run follows the pointer');
        await page.screenshot({path:shots+'/solitaire-drag.png',fullPage:false});
        await page.mouse.move(targetPoint.x,targetPoint.y,{steps:10});
        await page.mouse.up();
        await frame.waitForTimeout(430);
        const saved = await frame.evaluate(() => JSON.parse(localStorage.getItem('mygames-solitaire-state-v1')).game);
        assert.equal(saved.moves,1,'Dragging a legal run completes one move');
        assert.deepEqual(saved.tableau[1].map(card=>card.id),[38,24,36,22],'Moving the upper face-up card carries the whole run');
        assert.deepEqual(saved.tableau[0].map(card=>card.id),[12],'Original column retains only the lower King');
        assert.equal(await frame.locator('.motion-clone').count(),0,'Card animation completes and removes previews');
      }

      const gameOverflow=await frame.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(gameOverflow<=3,id+' has horizontal overflow '+gameOverflow);
      await page.locator('#back-to-games').click();
      await page.locator('#catalog-view').waitFor({state:'visible'});
      assert.equal(await page.locator('#player-view').isVisible(),false,id+' returned on first tap');
    }
    // Validate icons used for iPhone installation; SVG card art alone isn't sufficient.
    const icons = await page.evaluate(async () => {
      const list = ['./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
      return Promise.all(list.map(async src => {
        const img = new Image();
        img.src = src;
        try { await img.decode(); return {src,ok:true,width:img.naturalWidth,height:img.naturalHeight}; }
        catch (error) { return {src,ok:false,error:String(error)}; }
      }));
    });
    assert.equal(icons.every(icon => icon.ok && icon.width>0),true,'All PWA icons must decode: '+JSON.stringify(icons));

    // The newly installed Mini Games PWA must launch more than one game offline.
    await page.goto(origin+'/', {waitUntil:'load',timeout:20000});
    await page.waitForFunction(() => document.querySelectorAll('.game-card.compact-card[data-game]').length === 12);
    await page.evaluate(async () => { if (!('serviceWorker' in navigator)) throw new Error('No Service Worker API'); await navigator.serviceWorker.ready; });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, {timeout:15000});
    await context.setOffline(true);
    try {
      await page.reload({waitUntil:'domcontentloaded',timeout:20000});
      await page.waitForFunction(() => document.querySelectorAll('.game-card.compact-card[data-game]').length === 12);
      for (const [game,selector] of [['blocks','#board'],['chess','#game .chess-grid']]) {
        await page.locator('[data-game="'+game+'"]').click();
        const frame=await (await page.$('#game-frame')).contentFrame();
        await frame.waitForSelector(selector,{timeout:10000});
        await page.locator('#back-to-games').click();
        await page.locator('#catalog-view').waitFor({state:'visible'});
      }
    } finally { await context.setOffline(false); }
    assert.deepEqual(errors,[],'No uncaught JavaScript errors');

    console.log('PASS '+name+': 12 cards, icon, game launch, return, screenshots');
  } catch(err) {
    failures.push(name+': '+err.message);
    console.error('FAIL '+name+': '+err.stack);
    await page.screenshot({path:shots+'/failure.png',fullPage:false}).catch(()=>{});
  } finally {
    await context.close();
  }
}
await browser.close();
if(failures.length) {
  console.error(failures.join('\n'));
  process.exitCode=1;
}
