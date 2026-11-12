export const SIZE = 8;
export const COLORS = 6;
const randomColor = () => Math.floor(Math.random() * COLORS);
export function swap(board, a, b) {
  if (a < 0 || a >= SIZE * SIZE || b < 0 || b >= SIZE * SIZE) throw new RangeError('Invalid cell');
  [board[a], board[b]] = [board[b], board[a]];
}
export function adjacent(a, b) {
  const ax = a % SIZE, ay = Math.floor(a / SIZE);
  const bx = b % SIZE, by = Math.floor(b / SIZE);
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}
export function matches(board) {
  const found = new Set();
  for (let y = 0; y < SIZE; y++) {
    let x = 0;
    while (x < SIZE) {
      const color = board[y * SIZE + x]; let end = x + 1;
      if (color !== null && color !== undefined) {
        while (end < SIZE && board[y * SIZE + end] === color) end++;
        if (end - x >= 3) for (let k = x; k < end; k++) found.add(y * SIZE + k);
      }
      x = end;
    }
  }
  for (let x = 0; x < SIZE; x++) {
    let y = 0;
    while (y < SIZE) {
      const color = board[y * SIZE + x]; let end = y + 1;
      if (color !== null && color !== undefined) {
        while (end < SIZE && board[end * SIZE + x] === color) end++;
        if (end - y >= 3) for (let k = y; k < end; k++) found.add(k * SIZE + x);
      }
      y = end;
    }
  }
  return [...found];
}
export function hasMove(board) {
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (const next of [i + 1, i + SIZE]) {
      if (!adjacent(i, next) || next >= SIZE * SIZE || board[i] === board[next]) continue;
      swap(board, i, next);
      const valid = matches(board).length > 0;
      swap(board, i, next);
      if (valid) return true;
    }
  }
  return false;
}
export function makeBoard() {
  for (let attempt = 0; attempt < 400; attempt++) {
    const board = Array(SIZE * SIZE).fill(null);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const banned = new Set();
        if (x >= 2 && board[y * SIZE + x - 1] === board[y * SIZE + x - 2]) banned.add(board[y * SIZE + x - 1]);
        if (y >= 2 && board[(y - 1) * SIZE + x] === board[(y - 2) * SIZE + x]) banned.add(board[(y - 1) * SIZE + x]);
        const allowed = Array.from({length: COLORS}, (_, i) => i).filter(i => !banned.has(i));
        board[y * SIZE + x] = allowed[Math.floor(Math.random() * allowed.length)];
      }
    }
    if (hasMove(board)) return board;
  }
  throw new Error('Unable to generate a playable board');
}
export function applyGravity(board) {
  for (let x = 0; x < SIZE; x++) {
    let target = SIZE - 1;
    for (let y = SIZE - 1; y >= 0; y--) {
      const color = board[y * SIZE + x];
      if (color !== null && color !== undefined) {
        board[target * SIZE + x] = color;
        target--;
      }
    }
    while (target >= 0) board[target-- * SIZE + x] = randomColor();
  }
}
export function validSavedBoard(value) {
  return Array.isArray(value) && value.length === SIZE * SIZE &&
    value.every(v => Number.isInteger(v) && v >= 0 && v < COLORS);
}
