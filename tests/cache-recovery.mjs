import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin=process.env.PREVIEW_URL||'http://127.0.0.1:8123';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  await test('Mini Games: cached old JS/CSS are replaced by network assets, offline still works',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    try {
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/',{waitUntil:'load',timeout:20000});
      await page.waitForFunction(()=>document.querySelectorAll('.game-card[data-game]').length===12);
      await page.evaluate(async()=>{
        await navigator.serviceWorker.ready;
      });
      await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{timeout:15000});

      // Mimic a Telegram WebView left with old assets after a release. A
      // cache-first worker would serve these intentionally broken files.
      await page.evaluate(async()=>{
        const version=(await caches.keys()).find(x=>x.startsWith('mini-games-v'));
        if(!version)throw new Error('PWA cache was not created');
        const cache=await caches.open(version);
        await cache.put(new URL('/arcade/app.js',location.origin),new Response(
          "throw new Error('STALE ARCADE ASSET MUST NOT RUN');",
          {headers:{'Content-Type':'text/javascript'}}
        ));
        await cache.put(new URL('/solitaire/styles.css',location.origin),new Response(
          'body{display:none!important}',
          {headers:{'Content-Type':'text/css'}}
        ));
      });

      await page.goto(origin+'/arcade/?game=chess',{waitUntil:'domcontentloaded'});
      await page.locator('.chess-grid .square').first().waitFor({state:'visible',timeout:15000});
      assert.equal(await page.locator('.chess-grid .square').count(),64);
      assert.equal(errors.some(msg=>msg.includes('STALE ARCADE ASSET MUST NOT RUN')),false);

      const healed=await page.evaluate(async()=>{
        const version=(await caches.keys()).find(x=>x.startsWith('mini-games-v'));
        const cache=await caches.open(version);
        const response=await cache.match(new URL('/arcade/app.js',location.origin));
        return (await response.text()).includes("import {parseFen");
      });
      assert.equal(healed,true,'network must refresh stale cached scripts');

      await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelectorAll('.game-card[data-game]').length===12);
      await page.locator('[data-game="solitaire"]').click();
      const frame=page.frameLocator('#game-frame');
      await frame.locator('#tableau').waitFor({state:'visible',timeout:15000});
      const css=await frame.locator('body').evaluate(el=>getComputedStyle(el).display);
      assert.notEqual(css,'none','network-first CSS must replace stale cached style');

      // After revalidation, both the catalog and multiple games must work
      // while offline with no destructive clearing of localStorage.
      await context.setOffline(true);
      try{
        await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:15000});
        await page.waitForFunction(()=>document.querySelectorAll('.game-card[data-game]').length===12);
        await page.locator('[data-game="chess"]').click();
        await page.frameLocator('#game-frame').locator('.chess-grid .square').first().waitFor({state:'visible'});
      }finally{await context.setOffline(false);}
      assert.equal(errors.filter(msg=>msg.includes('STALE ARCADE ASSET MUST NOT RUN')).length,0);
      console.log('PASS: stale asset recovery + offline catalog/chess after network refresh');
    }finally{await context.close();}
  });
}finally{await browser.close();}
