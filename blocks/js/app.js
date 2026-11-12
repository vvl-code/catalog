import { TetrisEngine, COLS, ROWS, PIECES } from './engine.js';

const $ = (selector) => document.querySelector(selector);
const board = $('#board'), next = $('#next'), frame = $('#board-frame');
const ctx = board.getContext('2d', { alpha: false });
const nctx = next.getContext('2d', { alpha: false });
const overlay = $('#overlay'), overlayTitle = $('#overlay-title');
const overlayDescription = $('#overlay-description'), overlayButton = $('#overlay-button');
const pauseButton = $('#pause-button'), newButton = $('#new-button');
const soundButton = $('#sound-button');
const metrics = { score: $('#score'), lines: $('#lines'), level: $('#level'), best: $('#best') };
const BEST_KEY = 'classic-blocks-best-v1';
const SOUND_KEY = 'classic-blocks-sound-v1';
const SESSION_KEY = 'classic-blocks-session-v2';
const read = (key, fallback = null) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };
const remove = (key) => { try { localStorage.removeItem(key); } catch {} };
let record = Math.max(0, Number.parseInt(read(BEST_KEY, '0'), 10) || 0);
let soundOn = read(SOUND_KEY, 'true') !== 'false';
let audio = null, dirty = true, previousTime = 0, saveTimeout = null, restored = false;
const fmt = (value) => Number(value).toLocaleString('ru-RU');

function unlockAudio() {
  if (!soundOn) return;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch {}
}
function beep(freq, duration = .08, delay = 0) {
  if (!soundOn || !audio || audio.state !== 'running') return;
  try {
    const osc = audio.createOscillator(), gain = audio.createGain();
    const start = audio.currentTime + delay;
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(.025, start);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    osc.connect(gain); gain.connect(audio.destination);
    osc.start(start); osc.stop(start + duration);
  } catch {}
}
function recordScore() {
  if (engine.score > record) { record = engine.score; write(BEST_KEY, record); }
}
function saveSession() {
  clearTimeout(saveTimeout); saveTimeout = null;
  if (engine.phase === 'playing' || engine.phase === 'paused') {
    write(SESSION_KEY, JSON.stringify(engine.snapshot()));
  } else remove(SESSION_KEY);
}
function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveSession, 250);
}
const engine = new TetrisEngine({
  onEvent(event, value) {
    dirty = true;
    if (event === 'rotate') beep(440, .04);
    if (event === 'lock' || event === 'harddrop') beep(180, .07);
    if (event === 'lines') { beep(600, .13); beep(value === 4 ? 950 : 750, .15, .10); $('#announcements').textContent = 'Очищено линий: ' + value; }
    if (event === 'gameover') { beep(320, .18); recordScore(); }
    if (event !== 'reset') scheduleSave();
  },
});
try {
  const saved = JSON.parse(read(SESSION_KEY, 'null'));
  restored = !!saved && engine.restore(saved);
  if (saved && !restored) remove(SESSION_KEY);
} catch { remove(SESSION_KEY); }

function updateUI() {
  metrics.score.textContent = fmt(engine.score);
  metrics.lines.textContent = fmt(engine.lines);
  metrics.level.textContent = fmt(engine.level);
  metrics.best.textContent = fmt(Math.max(record, engine.score));
  const state = engine.phase;
  overlay.hidden = state === 'playing';
  pauseButton.disabled = state === 'ready' || state === 'gameover';
  pauseButton.querySelector('.side-icon').textContent = state === 'paused' ? '▶' : 'Ⅱ';
  pauseButton.lastElementChild.textContent = state === 'paused' ? 'ИГРАТЬ' : 'ПАУЗА';
  if (state === 'ready') {
    overlayTitle.textContent = 'Готов играть?';
    overlayDescription.textContent = 'Собирай линии и побей свой рекорд.';
    overlayButton.textContent = 'НАЧАТЬ ИГРУ';
  } else if (state === 'paused') {
    overlayTitle.textContent = 'Пауза';
    overlayDescription.textContent = restored ? 'Партия восстановлена на этом устройстве.' : 'Игра остановлена.';
    overlayButton.textContent = 'ПРОДОЛЖИТЬ';
  } else if (state === 'gameover') {
    overlayTitle.textContent = 'Игра окончена';
    overlayDescription.textContent = 'Твой счёт: ' + fmt(engine.score);
    overlayButton.textContent = 'ИГРАТЬ СНОВА';
  }
}
function resizeCanvas(canvas, context, width, height) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  dirty = true;
}
function resize() {
  resizeCanvas(board, ctx, COLS, ROWS);
  resizeCanvas(next, nctx, 5, 5);
}
function tile(context, x, y, type) {
  context.fillStyle = '#071222';
  context.fillRect(x + .025, y + .025, .95, .95);
  context.fillStyle = PIECES[type].color;
  context.fillRect(x + .055, y + .055, .89, .89);
  context.fillStyle = '#ffffff4a';
  context.fillRect(x + .10, y + .09, .80, .105);
  context.fillRect(x + .095, y + .09, .105, .72);
  context.fillStyle = '#0713234f';
  context.fillRect(x + .12, y + .82, .78, .09);
  context.fillRect(x + .81, y + .13, .09, .73);
}
function drawBoard() {
  ctx.fillStyle = '#0c1728';
  ctx.fillRect(0, 0, COLS, ROWS);
  ctx.beginPath();
  ctx.strokeStyle = '#ffffff0a';
  ctx.lineWidth = .022;
  for (let x = 1; x < COLS; ++x) { ctx.moveTo(x, 0); ctx.lineTo(x, ROWS); }
  for (let y = 1; y < ROWS; ++y) { ctx.moveTo(0, y); ctx.lineTo(COLS, y); }
  ctx.stroke();
  for (let y = 0; y < ROWS; ++y) for (let x = 0; x < COLS; ++x) {
    if (engine.board[y][x]) tile(ctx, x, y, engine.board[y][x]);
  }
  if (engine.piece) {
    const { matrix, x, y, type } = engine.piece;
    for (let r = 0; r < matrix.length; ++r) for (let c = 0; c < matrix[r].length; ++c) {
      if (matrix[r][c] && y + r >= 0) tile(ctx, x + c, y + r, type);
    }
  }
}
function drawNext() {
  nctx.fillStyle = '#142139';
  nctx.fillRect(0, 0, 5, 5);
  const type = engine.queue[0];
  if (!type) return;
  const matrix = PIECES[type].matrix, cells = [];
  for (let r = 0; r < matrix.length; ++r) for (let c = 0; c < matrix[r].length; ++c) {
    if (matrix[r][c]) cells.push([c, r]);
  }
  const left = Math.min(...cells.map(p => p[0]));
  const right = Math.max(...cells.map(p => p[0]));
  const top = Math.min(...cells.map(p => p[1]));
  const bottom = Math.max(...cells.map(p => p[1]));
  const ox = (5 - (right - left + 1)) / 2 - left;
  const oy = (5 - (bottom - top + 1)) / 2 - top;
  for (const [x,y] of cells) tile(nctx, x + ox, y + oy, type);
}
function render() {
  if (!dirty) return;
  dirty = false;
  drawBoard(); drawNext(); updateUI();
}
function frameLoop(time) {
  engine.tick(previousTime ? time - previousTime : 0);
  previousTime = time;
  render();
  requestAnimationFrame(frameLoop);
}
function action(name) {
  if (engine.phase !== 'playing') return;
  if (name === 'left') engine.move(-1);
  else if (name === 'right') engine.move(1);
  else if (name === 'rotate') engine.rotate();
  else if (name === 'down') engine.softDrop();
  else if (name === 'drop') engine.hardDrop();
}
function start() { unlockAudio(); engine.start(); restored = false; previousTime = 0; dirty = true; }
overlayButton.addEventListener('click', start);
pauseButton.addEventListener('click', () => {
  unlockAudio(); engine.togglePause(); previousTime = 0; dirty = true;
});
newButton.addEventListener('click', () => {
  if ((engine.phase === 'playing' || engine.phase === 'paused') &&
      !confirm('Начать новую игру? Текущий счёт будет потерян.')) return;
  recordScore(); unlockAudio(); engine.restart(); restored = false; previousTime = 0; dirty = true;
});
function updateSound() {
  soundButton.textContent = soundOn ? '♫' : '♪̸';
  soundButton.setAttribute('aria-label', soundOn ? 'Выключить звук' : 'Включить звук');
}
soundButton.addEventListener('click', () => {
  soundOn = !soundOn; write(SOUND_KEY, soundOn); updateSound(); if (soundOn) unlockAudio();
});
updateSound();

for (const button of document.querySelectorAll('[data-action]')) {
  const name = button.dataset.action;
  let delay = null, repeat = null;
  const stop = () => {
    clearTimeout(delay); clearInterval(repeat);
    delay = null; repeat = null; button.classList.remove('is-pressed');
  };
  button.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (engine.phase !== 'playing') return;
    unlockAudio(); stop(); button.classList.add('is-pressed');
    button.setPointerCapture?.(e.pointerId);
    action(name);
    if (['left','right','down'].includes(name)) delay = setTimeout(() => {
      repeat = setInterval(() => action(name), name === 'down' ? 55 : 72);
    }, name === 'down' ? 125 : 175);
  }, { passive: false });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, stop);
  window.addEventListener('blur', stop);
}

let gesture = null;
frame.addEventListener('pointerdown', e => {
  if (engine.phase !== 'playing' || e.target.closest('button')) return;
  e.preventDefault(); unlockAudio();
  gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false,
    cell: frame.getBoundingClientRect().width / COLS };
  frame.setPointerCapture?.(e.pointerId);
}, { passive: false });
frame.addEventListener('pointermove', e => {
  if (!gesture || gesture.id !== e.pointerId || engine.phase !== 'playing') return;
  e.preventDefault();
  const step = gesture.cell * .85;
  const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
  if (Math.abs(dx) >= Math.abs(dy) * .7) {
    let relative = e.clientX - gesture.lx;
    while (Math.abs(relative) >= step) {
      action(relative > 0 ? 'right' : 'left');
      gesture.lx += Math.sign(relative) * step;
      gesture.moved = true;
      relative = e.clientX - gesture.lx;
    }
  } else if (dy > 0) {
    let relative = e.clientY - gesture.ly;
    while (relative >= step) {
      action('down'); gesture.ly += step; gesture.moved = true;
      relative = e.clientY - gesture.ly;
    }
  }
}, { passive: false });
frame.addEventListener('pointerup', e => {
  if (!gesture || gesture.id !== e.pointerId) return;
  const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
  if (engine.phase === 'playing' && dy < -Math.max(28, gesture.cell * 1.5) && Math.abs(dy) > Math.abs(dx)) action('drop');
  else if (engine.phase === 'playing' && !gesture.moved && Math.abs(dx) < 14 && Math.abs(dy) < 14) action('rotate');
  gesture = null;
});
frame.addEventListener('pointercancel', () => { gesture = null; });
window.addEventListener('keydown', e => {
  const keymap = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'rotate', ArrowDown:'down', ' ':'drop' };
  const name = keymap[e.key];
  if (name) {
    e.preventDefault();
    if (e.repeat && ['rotate','drop'].includes(name)) return;
    unlockAudio(); action(name);
  } else if (['Escape','p','P','з','З'].includes(e.key)) {
    e.preventDefault(); engine.togglePause(); previousTime = 0; dirty = true;
  } else if (e.key === 'Enter' && !e.repeat && engine.phase !== 'playing') start();
});
function suspend() {
  engine.pause(); recordScore(); saveSession(); previousTime = 0; dirty = true;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
window.addEventListener('pagehide', suspend);
function onlineStatus() { $('#offline-badge').hidden = navigator.onLine; }
window.addEventListener('online', onlineStatus);
window.addEventListener('offline', onlineStatus);
onlineStatus();

if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(frame);
  new ResizeObserver(resize).observe(next);
} else window.addEventListener('resize', resize);
resize(); render(); requestAnimationFrame(frameLoop);
// Mini Games root service worker handles offline caching.
