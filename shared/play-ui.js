/* Mini Games compact play shell. One HUD, modal utilities, unobstructed playfield.
 * Game engines and save keys are intentionally left unchanged.
 */
const TITLE = {blocks:'Блоки',match3:'Три в ряд',solitaire:'Косынка',word:'5 букв',mines:'Сапёр',game2048:'2048',snake:'Змейка',sudoku:'Судоку',reversi:'Реверси',checkers:'Шашки',chess:'Шахматы',pinball:'Пинбол'};
const CHANNEL = 'mini-games-ui-v10';
const $ = s => document.querySelector(s);
const text = s => (s?.textContent || '').trim();
const make = (tag,cls,caption) => {const el=document.createElement(tag);if(cls)el.className=cls;if(caption)el.textContent=caption;return el;};

function boot() {
  const segments = location.pathname.split('/').filter(Boolean);
  const folder = segments.at(-1)==='index.html' ? segments.at(-2) : segments.at(-1);
  const id = folder === 'arcade' ? new URLSearchParams(location.search).get('game') || 'word' : folder;
  if (!TITLE[id] || document.body.classList.contains('mg-play')) return;
  const shell = $('.shell') || $('.app-shell');
  const stage = id==='blocks'?$('.game-area'):id==='match3'?$('.board-section'):id==='solitaire'?$('.table'):$('#game');
  if (!shell || !stage) return;
  let embedded=false;
  try {embedded=parent!==window && !!parent.document.getElementById('game-frame');} catch { /* Standalone when cross-origin. */ }
  document.body.classList.add('mg-play');
  document.documentElement.classList.add('mg-play');
  document.body.dataset.game=id;
  document.body.dataset.embedded=String(embedded);
  shell.classList.add('mg-shell');stage.classList.add('mg-stage');
  const sourceStats = $('.metrics') || $('.score-strip') || $('#stats');
  const originalHeader = $('.top') || $('.top-bar');
  const controls = id==='blocks'?$('.control-bar'):$('.controls');
  const instructions = $('.instructions') || $('.help') || $('.gesture-hint');
  const status = $('#message') || $('#status');

  const menu=make('dialog','mg-menu');menu.id='mg-game-menu';menu.setAttribute('aria-labelledby','mg-menu-title');
  const menuHeader=make('div','mg-menu-head');
  const menuTitle=make('h2','',TITLE[id]);menuTitle.id='mg-menu-title';
  const close=make('button','mg-close','✕');close.type='button';close.setAttribute('aria-label','Закрыть меню');
  menuHeader.append(menuTitle,close);
  const actions=make('div','mg-menu-actions');
  const resume=make('button','mg-resume','Продолжить');resume.type='button';
  menu.append(menuHeader,actions);document.body.append(menu);
  if(sourceStats){sourceStats.classList.add('mg-all-stats');menu.append(sourceStats);}
  if(instructions){instructions.classList.add('mg-rules');menu.append(instructions);}
  menu.append(resume);
  let previouslyFocused=null;
  const send=data=>{if(embedded)parent.postMessage({channel:CHANNEL,...data},location.origin);};
  function setOpen(open) {
    if(open===menu.open)return;
    document.body.dataset.menuOpen=String(open);
    if(open){previouslyFocused=document.activeElement;menu.showModal();close.focus();}
    else {menu.close();if(previouslyFocused?.isConnected)previouslyFocused.focus({preventScroll:true});}
    window.dispatchEvent(new CustomEvent('minigames:menu',{detail:{open}}));
    send({type:'menu',open});
  }
  close.addEventListener('click',()=>setOpen(false));resume.addEventListener('click',()=>setOpen(false));
  menu.addEventListener('cancel',e=>{e.preventDefault();setOpen(false);});
  menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false);}});
  function moveAction(el,label,closeOnClick=true) {
    if(!el)return;
    if(label){el.textContent=label;el.setAttribute('aria-label',label);}
    el.classList.add('mg-menu-action');actions.append(el);
    if(closeOnClick)el.addEventListener('click',()=>setTimeout(()=>setOpen(false),0));
  }
  moveAction($('#restart'),'Новая партия');moveAction($('#new-button'),'Новая партия');
  moveAction($('#pause-button'));
  moveAction($('#sound-button'),null,false);
  if(id==='solitaire'){for(const [key,label] of [['undo','Отменить ход'],['auto','Перенести в домик'],['hint','Подсказка']])moveAction($('#'+key),label);}
  if(id==='pinball'){
    for(const el of document.querySelectorAll('.pinball-nudge'))moveAction(el,null,false);
    const cabinet=$('.pinball-scoreboard');if(cabinet){cabinet.classList.add('mg-cabinet-info');menu.insertBefore(cabinet,resume);}
    const flippers=$('.flipper-controls');if(flippers&&controls)controls.prepend(flippers);
  }
  if(id==='sudoku')moveAction($('.number-pad .erase'),'Стереть число');
  if(id==='chess'){for(const b of controls?.querySelectorAll('button')||[])moveAction(b);}
  if(originalHeader)originalHeader.hidden=true;
  for(const el of shell.querySelectorAll('footer,.sidebar-decor,.board-accent,.separator,.key-legend'))el.hidden=true;
  const progress=$('.progress-area');if(progress){progress.classList.add('mg-detail');menu.insertBefore(progress,resume);}
  if(controls)controls.classList.add('mg-controls');

  let ownBar=null;
  if(!embedded){
    ownBar=make('header','mg-bar');
    const back=make('a','mg-back','‹');back.href='../';back.setAttribute('aria-label','Каталог игр');
    const title=make('strong','mg-name',TITLE[id]);
    const metrics=make('div','mg-hud');metrics.setAttribute('aria-label','Текущая игра');
    const more=make('button','mg-more','⋯');more.type='button';more.setAttribute('aria-label','Меню игры');more.setAttribute('aria-haspopup','dialog');more.addEventListener('click',()=>setOpen(true));
    ownBar.append(back,title,metrics,more);shell.prepend(ownBar);
  }
  function readStats(){
    if(!sourceStats)return [];
    const all=[...sourceStats.children].map(el=>({label:text(el.querySelector('span')),value:text(el.querySelector('strong'))}));
    if(id==='blocks')return all.filter(s=>['ОЧКИ','УРОВЕНЬ'].includes(s.label));
    if(id==='match3')return all.filter(s=>['ОЧКИ','ХОДЫ'].includes(s.label));
    if(id==='solitaire')return all.filter(s=>['ХОДЫ','В ДОМИКАХ'].includes(s.label));
    if(id==='pinball')return all.filter(s=>['ОЧКИ','ШАР'].includes(s.label));
    if(id==='word')return all.filter(s=>['ПОПЫТКИ','СТАТУС'].includes(s.label));
    if(id==='mines')return all.filter(s=>['МИНЫ','ФЛАГИ'].includes(s.label));
    if(id==='sudoku')return all.filter(s=>['ЗАПОЛНЕНО'].includes(s.label));
    if(id==='chess'||id==='checkers')return all.filter(s=>['ХОД','НОМЕР'].includes(s.label));
    if(id==='reversi')return all.filter(s=>['ТВОИ','КОМПЬЮТЕР'].includes(s.label));
    return all.filter(s=>s.label==='ОЧКИ');
  }
  let lastStats='';
  const renderStats=()=>{
    const metrics=readStats();const serialized=JSON.stringify(metrics);if(lastStats===serialized)return;lastStats=serialized;
    if(ownBar){const hud=ownBar.querySelector('.mg-hud');hud.replaceChildren();for(const s of metrics){const item=make('span','mg-hud-item');item.title=s.label;item.append(make('small','',s.label),make('b','',s.value));hud.append(item);}}
    send({type:'hud',game:id,title:TITLE[id],metrics});
  };
  const statsObserver=new MutationObserver(renderStats);if(sourceStats)statsObserver.observe(sourceStats,{subtree:true,childList:true,characterData:true});
  renderStats();
  function messageHandler(e){if(!embedded||e.source!==parent||e.origin!==location.origin||e.data?.channel!==CHANNEL)return;if(e.data.type==='open-menu')setOpen(true);if(e.data.type==='close-menu')setOpen(false);if(e.data.type==='request-hud'){lastStats='';renderStats();}}
  window.addEventListener('message',messageHandler);
  // Keep keyboard shortcuts out of an open dialog, including Space/Enter handlers.
  const keyGuard=e=>{if(menu.open&&e.key!=='Tab')e.stopImmediatePropagation();};
  window.addEventListener('keydown',keyGuard,true);window.addEventListener('keyup',keyGuard,true);
  // Status remains announced for screen readers, without reserving an extra row.
  let toastTimer=0;
  if(status){
    status.classList.add('mg-toast');
    new MutationObserver(()=>{
      clearTimeout(toastTimer);
      const important=/побед|закон|окончен|заверш|мат[.! ]|пат[.! ]|ошиб|нельзя|недопуст|повтор|верно|ответ:|проигр|столк|ходов нет|шах!/i.test(text(status));
      status.classList.toggle('mg-toast-visible',important);
      if(important)toastTimer=setTimeout(()=>status.classList.remove('mg-toast-visible'),4500);
    }).observe(status,{subtree:true,childList:true,characterData:true});
  }

  let fitFrame=0;
  const requestFit=()=>{if(!fitFrame)fitFrame=requestAnimationFrame(fit);};
  function fit(){
    fitFrame=0;
    if(!stage.isConnected)return;
    if(controls){
      const launch=$('#pinball-launch');if(launch)launch.hidden=launch.disabled;
      controls.hidden=![...controls.children].some(el=>!el.hidden&&el.childElementCount+text(el).length>0);
    }
    const w=Math.max(1,stage.clientWidth-2),h=Math.max(1,stage.clientHeight-2);
    const props={};
    props['--mg-square']=Math.floor(Math.min(w,h))+'px';
    if(id==='word'){
      props['--mg-word-w']=Math.floor(Math.min(w,Math.max(90,h-62)*5/6))+'px';
    }
    if(id==='pinball'){
      const height=Math.floor(Math.min(h,w/0.64));props['--mg-pin-h']=height+'px';props['--mg-pin-w']=Math.floor(height*0.64)+'px';
    }
    if(id==='blocks'){
      props['--board-width']=Math.floor(Math.max(70,Math.min(h/2,(w-68))))+'px';
    }
    if(id==='solitaire'){
      const card=Math.floor(Math.min((w-36)/7,(h-32)/3.1));
      props['--card-w']=Math.max(30,card)+'px';
      props['--face-step']=Math.round(Math.max(16,Math.min(card*.35,(h-card*3.0-30)/13)))+'px';
      props['--back-step']=Math.round(Math.max(10,Math.min(card*.22,20)))+'px';
    }
    let changed=false;
    for(const [key,value] of Object.entries(props)){if(shell.style.getPropertyValue(key)!==value){shell.style.setProperty(key,value);changed=true;}}
    if(changed&&id==='solitaire')window.dispatchEvent(new Event('minigames:layout'));
  }
  const resizeObserver=new ResizeObserver(requestFit);resizeObserver.observe(stage);resizeObserver.observe(shell);
  if(controls)resizeObserver.observe(controls);
  const changes=new MutationObserver(requestFit);changes.observe(stage,{childList:true,subtree:true});
  if(id==='pinball')changes.observe(controls,{attributes:true,subtree:true,attributeFilter:['disabled']});
  window.addEventListener('resize',requestFit);window.visualViewport?.addEventListener('resize',requestFit);
  send({type:'ready',game:id,title:TITLE[id]});requestFit();
  window.addEventListener('pagehide',()=>{resizeObserver.disconnect();changes.disconnect();statsObserver.disconnect();cancelAnimationFrame(fitFrame);clearTimeout(toastTimer);},{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
