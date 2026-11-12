import {SIZE, COLORS, swap, adjacent, matches, hasMove, makeBoard, applyGravity, validSavedBoard} from './engine.js';
'use strict';
const $ = (id) => document.getElementById(id);
const boardEl = $('board'), statusEl = $('status'), finishEl = $('finish');
const scoreEl = $('score'), movesEl = $('moves'), levelEl = $('level'), bestEl = $('best');
const SAVE_KEY = 'mygames-match3-state-v1', BEST_KEY = 'mygames-match3-best-v1';
const START_MOVES = 30, LEVEL_POINTS = 1200;
const labels = ['бирюзовый', 'красный', 'фиолетовый', 'жёлтый', 'зелёный', 'синий'];
function getSaved(key) { try { return localStorage.getItem(key); } catch { return null; } }
function store(key, value) { try { localStorage.setItem(key, value); } catch (error) { console.warn('Storage unavailable', error); } }
function readBest() { const n = Number.parseInt(getSaved(BEST_KEY) || '0', 10); return Number.isSafeInteger(n) && n >= 0 ? n : 0; }
function newState() { return {board: makeBoard(), score: 0, moves: START_MOVES, ended: false}; }
function loadState() {
  try {
    const saved = JSON.parse(getSaved(SAVE_KEY));
    if (saved && validSavedBoard(saved.board) &&
      Number.isSafeInteger(saved.score) && saved.score >= 0 &&
      Number.isInteger(saved.moves) && saved.moves >= 0 && saved.moves <= START_MOVES &&
      typeof saved.ended === 'boolean' && (saved.ended || saved.moves > 0) &&
      (saved.ended || (matches(saved.board).length === 0 && hasMove(saved.board)))) return saved;
  } catch {}
  return newState();
}
let state = loadState(), best = readBest(), selection = null, busy = false;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function save() {
  if (state.score > best) { best = state.score; store(BEST_KEY, String(best)); }
  store(SAVE_KEY, JSON.stringify(state));
}
function status(message) { statusEl.textContent = message; }
function paint() {
  const fragment = document.createDocumentFragment();
  state.board.forEach((color, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'gem' + (color === null ? ' empty' : '') + (selection === i ? ' selected' : '');
    el.dataset.i = String(i); if (color !== null) el.dataset.type = String(color);
    el.setAttribute('aria-label', 'Ряд ' + (Math.floor(i / SIZE) + 1) + ', столбец ' + (i % SIZE + 1) + ': ' + (color === null ? 'пусто' : labels[color]));
    el.disabled = state.ended || busy;
    fragment.appendChild(el);
  });
  boardEl.replaceChildren(fragment);
  scoreEl.textContent = state.score.toLocaleString('ru-RU');
  movesEl.textContent = String(state.moves);
  levelEl.textContent = String(1 + Math.floor(state.score / LEVEL_POINTS));
  bestEl.textContent = best.toLocaleString('ru-RU');
  $('next-label').textContent = String(LEVEL_POINTS - (state.score % LEVEL_POINTS));
  $('progress').style.width = ((state.score % LEVEL_POINTS) / LEVEL_POINTS * 100) + '%';
  finishEl.hidden = !state.ended;
  if (state.ended) $('finish-score').textContent = 'Ты набрал ' + state.score.toLocaleString('ru-RU') + ' очков.';
}
async function move(a, b) {
  if (busy || state.ended || !adjacent(a, b)) return;
  busy = true; selection = null; swap(state.board, a, b); paint();
  await sleep(130);
  if (!matches(state.board).length) {
    swap(state.board, a, b); busy = false; status('Этот обмен не создаёт ряд из трёх.'); paint(); return;
  }
  state.moves--;
  let chain = 0, cleared = 0;
  while (chain < 40) {
    const ids = matches(state.board);
    if (!ids.length) break;
    chain++; cleared += ids.length;
    state.score += ids.length * 10 * chain;
    ids.forEach(i => { state.board[i] = null; });
    paint(); await sleep(120);
    applyGravity(state.board); paint(); await sleep(110);
  }
  if (matches(state.board).length) {
    // Defensive safety net for a pathological cascading board.
    state.board = makeBoard();
  }
  if (!state.ended && !hasMove(state.board) && state.moves > 0) {
    state.board = makeBoard(); status('Ходов не осталось — поле перемешано!');
  } else {
    status(chain > 1 ? 'Комбо ×' + chain + '! Убрано кристаллов: ' + cleared : 'Отлично! Убрано кристаллов: ' + cleared);
  }
  state.ended = state.moves <= 0;
  busy = false; save(); paint();
}
function choose(i) {
  if (busy || state.ended) return;
  if (selection === null || selection === i) { selection = selection === i ? null : i; paint(); return; }
  const prev = selection;
  if (adjacent(prev, i)) void move(prev, i);
  else { selection = i; paint(); }
}
boardEl.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; return; }
  const btn = e.target.closest('.gem');
  if (btn) choose(Number(btn.dataset.i));
});
let touchStart = null, suppressClick = false;
boardEl.addEventListener('pointerdown', e => {
  const btn = e.target.closest('.gem');
  if (!btn || busy || state.ended) return;
  touchStart = {i: Number(btn.dataset.i), x: e.clientX, y: e.clientY, id: e.pointerId};
});
boardEl.addEventListener('pointerup', e => {
  if (!touchStart || touchStart.id !== e.pointerId) return;
  const start = touchStart; touchStart = null;
  const dx = e.clientX - start.x, dy = e.clientY - start.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 17) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 120);
  const x = start.i % SIZE, y = Math.floor(start.i / SIZE);
  const tx = x + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0);
  const ty = y + (Math.abs(dx) < Math.abs(dy) ? Math.sign(dy) : 0);
  if (tx >= 0 && tx < SIZE && ty >= 0 && ty < SIZE) void move(start.i, ty * SIZE + tx);
});
boardEl.addEventListener('pointercancel', () => { touchStart = null; });
function restart() {
  if (busy) return;
  if (!state.ended && state.score > 0 && !window.confirm('Начать новую игру? Текущий результат будет потерян.')) return;
  state = newState(); selection = null; status('Новая игра! Собери три кристалла в ряд.'); save(); paint();
}
$('restart').addEventListener('click', restart);
$('again').addEventListener('click', restart);
window.addEventListener('pagehide', () => { if (!busy) save(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !busy) save(); });
paint();
