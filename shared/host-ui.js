/* Same-origin iframe protocol. No Telegram identity or game data leaves the site. */
(() => {
  const channel='mini-games-ui-v10';
  const frame=document.getElementById('game-frame'),bar=document.querySelector('.player-bar');
  if(!frame||!bar)return;
  bar.classList.add('mg-bar');
  const back=document.getElementById('back-to-games');back.classList.add('mg-back');back.textContent='‹';back.setAttribute('aria-label','Каталог игр');
  const title=document.getElementById('player-title');title.classList.add('mg-name');
  bar.querySelector('.player-spacer')?.remove();
  const hud=document.createElement('div');hud.className='mg-hud';hud.setAttribute('aria-label','Текущая игра');
  const menu=document.createElement('button');menu.id='game-menu-button';menu.type='button';menu.className='mg-more';menu.textContent='⋯';menu.setAttribute('aria-label','Меню игры');menu.setAttribute('aria-haspopup','dialog');menu.disabled=true;
  bar.append(hud,menu);
  const send=type=>frame.contentWindow?.postMessage({channel,type},location.origin);
  menu.addEventListener('click',()=>send('open-menu'));
  new MutationObserver(()=>{hud.replaceChildren();menu.disabled=true;menu.setAttribute('aria-expanded','false');}).observe(frame,{attributes:true,attributeFilter:['src']});
  frame.addEventListener('load',()=>send('request-hud'));
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.channel!==channel)return;
    const data=event.data;
    if(data.type==='ready'||data.type==='hud'){
      menu.disabled=false;
      title.textContent=String(data.title||'Игра').slice(0,24);
    }
    if(data.type==='hud'&&Array.isArray(data.metrics)){
      hud.replaceChildren();
      for(const s of data.metrics.slice(0,2)){
        const item=document.createElement('span');item.className='mg-hud-item';
        const label=String(s.label||'').slice(0,18),value=String(s.value||'').slice(0,24);
        item.title=label;item.setAttribute('aria-label',label+': '+value);
        const small=document.createElement('small');small.textContent=label;
        const number=document.createElement('b');number.textContent=value;item.append(small,number);hud.append(item);
      }
    }
    if(data.type==='menu')menu.setAttribute('aria-expanded',String(!!data.open));
  });
})();
