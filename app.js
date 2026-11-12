(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const catalog = $('catalog-view');
  const player = $('player-view');
  const gameFrame = $('game-frame');
  const backButton = $('back-to-games');
  const playerTitle = $('player-title');
  const arcadeUrl = (id) => new URL('./arcade/?game=' + encodeURIComponent(id), window.location.href).href;

  const games = Object.freeze({
    blocks: {title: 'БЛОКИ', description: 'Блоки — классическая игра', url: new URL('./blocks/', window.location.href).href},
    match3: {title: 'ТРИ В РЯД', description: 'Три в ряд — головоломка', url: new URL('./match3/', window.location.href).href},
    solitaire: {title: 'КОСЫНКА', description: 'Косынка — классический пасьянс', url: new URL('./solitaire/', window.location.href).href},
    word: {title: '5 БУКВ', description: '5 букв — угадай слово', url: arcadeUrl('word')},
    mines: {title: 'САПЁР', description: 'Сапёр — найди все мины', url: arcadeUrl('mines')},
    game2048: {title: '2048', description: '2048 — числовая головоломка', url: arcadeUrl('game2048')},
    snake: {title: 'ЗМЕЙКА', description: 'Змейка — классическая аркада', url: arcadeUrl('snake')},
    sudoku: {title: 'СУДОКУ', description: 'Судоку — логическая головоломка', url: arcadeUrl('sudoku')},
    reversi: {title: 'РЕВЕРСИ', description: 'Реверси — против компьютера', url: arcadeUrl('reversi')},
    checkers: {title: 'ШАШКИ', description: 'Русские шашки — против компьютера', url: arcadeUrl('checkers')},
    chess: {title: 'ШАХМАТЫ', description: 'Шахматы — против компьютера', url: arcadeUrl('chess')},
    pinball: {title: 'ПИНБОЛ', description: 'Космический пинбол — аркада', url: arcadeUrl('pinball')}
  });

  const extras = [
    {id:'word', tag:'СЛОВА', text:'Угадай русское слово за шесть попыток.', marks:['Б','У','К','В','Ы'], note:'5 БУКВ · 6 ПОПЫТОК'},
    {id:'mines', tag:'ГОЛОВОЛОМКА', text:'Открывай клетки, ищи мины и ставь флажки.', marks:['✦','8','⚑'], note:'САПЁР · КЛАССИКА'},
    {id:'game2048', tag:'ЛОГИКА', text:'Объединяй одинаковые плитки и доберись до 2048.', marks:['2','4','8'], key:'mygames-2048-best-v1', keyLabel:'РЕКОРД'},
    {id:'snake', tag:'АРКАДА', text:'Собирай еду и не наступи на собственный хвост.', marks:['●','●','●','◆'], key:'mygames-snake-best-v1', keyLabel:'РЕКОРД'},
    {id:'sudoku', tag:'ЛОГИКА', text:'Заполни таблицу без повторений по строкам и квадратам.', marks:['1','5','9'], note:'9 × 9 · ЦИФРЫ'},
    {id:'reversi', tag:'СТРАТЕГИЯ', text:'Захвати поле, переворачивая фишки соперника.', marks:['●','◯','◯','●'], note:'ПРОТИВ КОМПЬЮТЕРА'},
    {id:'checkers', tag:'НАСТОЛЬНАЯ', text:'Русские шашки с дамками и обязательным взятием.', marks:['⛀','⛂'], note:'ПРОТИВ КОМПЬЮТЕРА'},
    {id:'chess', tag:'НАСТОЛЬНАЯ', text:'Шах, мат, рокировка — сыграй партию против ИИ.', marks:['♞','♜'], note:'ПРОТИВ КОМПЬЮТЕРА'},
    {id:'pinball', tag:'АРКАДА', text:'Космический стол, бамперы, лапки и три шара.', marks:['✧','●','✧'], note:'3 ШАРА · ФИЗИКА'}
  ];

  function createExtraCards() {
    const list = document.querySelector('.section-games');
    if (!list) return;
    for (const meta of extras) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'game-card compact-card';
      button.dataset.game = meta.id;
      button.setAttribute('aria-label', 'Запустить игру ' + games[meta.id].title);

      const artwork = document.createElement('div');
      artwork.className = 'compact-art arcade-art arcade-' + meta.id;
      artwork.setAttribute('aria-hidden', 'true');
      for (const symbol of meta.marks) {
        const mark = document.createElement('span');
        mark.textContent = symbol;
        artwork.appendChild(mark);
      }

      const info = document.createElement('div');
      info.className = 'compact-info';
      const tag = document.createElement('span');
      tag.className = 'compact-tag';
      tag.textContent = meta.tag;
      const title = document.createElement('span');
      title.className = 'compact-title';
      title.textContent = games[meta.id].title;
      const dot = document.createElement('span');
      dot.className = 'title-dot';
      dot.textContent = '.';
      title.appendChild(dot);
      const description = document.createElement('span');
      description.className = 'compact-description';
      description.textContent = meta.text;
      const note = document.createElement('span');
      note.className = 'compact-record';
      note.id = 'record-' + meta.id;
      note.textContent = meta.note || meta.keyLabel + ' —';
      const play = document.createElement('span');
      play.className = 'compact-play';
      play.textContent = 'ИГРАТЬ ';
      const arrow = document.createElement('span');
      arrow.textContent = '↗';
      arrow.setAttribute('aria-hidden', 'true');
      play.appendChild(arrow);
      info.append(tag, title, description, note, play);
      button.append(artwork, info);
      list.appendChild(button);
    }
  }

  let telegram = null;
  try {
    telegram = window.Telegram?.WebApp || null;
    if (telegram) {
      telegram.ready();
      telegram.expand();
      telegram.BackButton?.onClick(goBack);
    }
  } catch (error) {
    console.warn('Telegram interface unavailable:', error);
    telegram = null;
  }

  function setTelegramBackButton(visible) {
    try {
      if (visible) telegram?.BackButton?.show();
      else telegram?.BackButton?.hide();
    } catch (error) {
      console.warn('Telegram BackButton unavailable:', error);
    }
  }

  function currentGame() {
    const id = new URLSearchParams(window.location.search).get('game');
    return Object.prototype.hasOwnProperty.call(games, id) ? id : null;
  }

  function formattedRecord(key) {
    try {
      const n = Number.parseInt(window.localStorage.getItem(key) || '0', 10);
      return Number.isSafeInteger(n) && n > 0 ? n.toLocaleString('ru-RU') : '—';
    } catch {
      return '—';
    }
  }

  function displayRecords() {
    $('record').textContent = 'РЕКОРД ' + formattedRecord('classic-blocks-best-v1');
    $('match3-record').textContent = 'РЕКОРД ' + formattedRecord('mygames-match3-best-v1');
    $('solitaire-record').textContent = 'ПОБЕДЫ ' + formattedRecord('mygames-solitaire-wins-v1');
    for (const meta of extras) {
      if (meta.key) $('record-' + meta.id).textContent = meta.keyLabel + ' ' + formattedRecord(meta.key);
    }
  }

  function render() {
    const id = currentGame();
    const config = id && games[id];
    if (!config) {
      if (gameFrame.hasAttribute('src')) gameFrame.removeAttribute('src');
      delete gameFrame.dataset.game;
      player.hidden = true;
      catalog.hidden = false;
      setTelegramBackButton(false);
      document.title = 'Mini Games — каталог игр';
      displayRecords();
      window.setTimeout(displayRecords, 100);
      return;
    }

    catalog.hidden = true;
    player.hidden = false;
    playerTitle.textContent = config.title + '.';
    gameFrame.title = config.description;
    if (gameFrame.dataset.game !== id) {
      gameFrame.dataset.game = id;
      gameFrame.src = config.url;
    }
    setTelegramBackButton(true);
    document.title = config.description + ' — Mini Games';
  }

  function startGame(id) {
    if (!Object.prototype.hasOwnProperty.call(games, id) || currentGame() === id) return;
    const url = new URL(window.location.href);
    url.searchParams.set('game', id);
    window.history.replaceState({myGamesView: id}, '', url.pathname + url.search + url.hash);
    render();
  }

  function goBack() {
    if (!currentGame()) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('game');
    window.history.replaceState({myGamesView: 'catalog'}, '', url.pathname + url.search + url.hash);
    render();
    applyUpdatedWorker();
  }

  createExtraCards();
  for (const button of document.querySelectorAll('[data-game]')) {
    button.addEventListener('click', () => startGame(button.dataset.game));
  }
  backButton.addEventListener('click', goBack);
  window.addEventListener('popstate', render);
  window.addEventListener('pageshow', render);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !currentGame()) displayRecords();
  });

  // Keep the PWA current without clearing savegames or localStorage.
  // A new worker is allowed to reload the catalog once, but never interrupt a game.
  const clientBuild = 'mini-games-v10';
  const hadControllerAtStartup = !!navigator.serviceWorker?.controller;
  let pendingVersionReload = false;
  function applyUpdatedWorker() {
    if (!pendingVersionReload || currentGame()) return;
    pendingVersionReload = false;
    try {
      const guard = 'reloaded-for-' + clientBuild;
      if (sessionStorage.getItem(guard)) return;
      sessionStorage.setItem(guard, '1');
    } catch { /* Private mode may restrict session storage. */ }
    window.location.reload();
  }
  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || ['localhost','127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadControllerAtStartup) return;
      pendingVersionReload = true;
      applyUpdatedWorker();
    });
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js', {
          scope:'./',updateViaCache:'none'
        });
        await registration.update().catch(error => {
          console.warn('Mini Games update check unavailable:',error);
        });
      } catch(error) {
        console.warn('Mini Games offline installation unavailable:',error);
      }
    });
  }

  render();
})();
