/**
 * Game rules, intentionally independent of the browser and rendering layer.
 * Coordinates: x grows right, y grows down; cells above y=0 are allowed while spawning.
 */
export const COLS = 10;
export const ROWS = 20;

export const PIECES = Object.freeze({
  I: { color: '#45d8ee', matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { color: '#ffdc61', matrix: [[1, 1], [1, 1]] },
  T: { color: '#b68cff', matrix: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { color: '#71e5a2', matrix: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { color: '#ff727c', matrix: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { color: '#77a8ff', matrix: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { color: '#ffb370', matrix: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
});

const SCORE_BY_LINES = [0, 40, 100, 300, 1200];
const LINE_INTERVAL = 10;
const LOCK_DELAY_MS = 440;
const MAX_LOCK_RESETS = 12;
const SAVE_SCHEMA = 1;
const TYPES = new Set(Object.keys(PIECES));

function blankBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rotateClockwise(matrix) {
  const height = matrix.length;
  const width = matrix[0].length;
  return Array.from({ length: width }, (_, y) =>
    Array.from({ length: height }, (_, x) => matrix[height - x - 1][y]),
  );
}

function copyMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

function isValidPieceMatrix(type, matrix) {
  if (!TYPES.has(type) || !Array.isArray(matrix)) return false;
  let original = PIECES[type].matrix;
  for (let rotation = 0; rotation < 4; rotation += 1) {
    if (JSON.stringify(original) === JSON.stringify(matrix)) return true;
    original = rotateClockwise(original);
  }
  return false;
}

function isSafeCounter(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export class TetrisEngine {
  constructor({ random = Math.random, onEvent = () => {} } = {}) {
    this.random = random;
    this.onEvent = onEvent;
    this.reset();
  }

  reset() {
    this.board = blankBoard();
    this.bag = [];
    this.queue = [];
    this.piece = null;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.phase = 'ready';
    this.gravityElapsed = 0;
    this.lockElapsed = 0;
    this.lockResets = 0;
    this._fillQueue();
    this.onEvent('reset');
  }

  start() {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.onEvent('resume');
      return;
    }
    if (this.phase === 'playing') return;
    this.restart();
  }

  restart() {
    this.reset();
    this.phase = 'playing';
    this._spawnNext();
    this.onEvent('start');
  }

  snapshot() {
    return {
      schema: SAVE_SCHEMA,
      board: this.board.map((row) => row.slice()),
      bag: this.bag.slice(),
      queue: this.queue.slice(),
      piece: this.piece && { ...this.piece, matrix: copyMatrix(this.piece.matrix) },
      score: this.score,
      lines: this.lines,
      level: this.level,
      phase: this.phase,
      gravityElapsed: this.gravityElapsed,
      lockElapsed: this.lockElapsed,
      lockResets: this.lockResets,
    };
  }

  restore(data) {
    if (!data || typeof data !== 'object' || data.schema !== SAVE_SCHEMA) return false;
    if (!['playing', 'paused'].includes(data.phase)) return false;
    if (!Array.isArray(data.board) || data.board.length !== ROWS ||
        data.board.some((row) => !Array.isArray(row) || row.length !== COLS ||
          row.some((cell) => cell !== null && !TYPES.has(cell)))) return false;
    if (!Array.isArray(data.queue) || data.queue.length !== 5 ||
        data.queue.some((type) => !TYPES.has(type))) return false;
    if (!Array.isArray(data.bag) || data.bag.length > 7 ||
        data.bag.some((type) => !TYPES.has(type)) ||
        new Set(data.bag).size !== data.bag.length) return false;
    if (!isSafeCounter(data.score) || !isSafeCounter(data.lines) ||
        data.level !== Math.floor(data.lines / LINE_INTERVAL) + 1) return false;
    if (!Number.isFinite(data.gravityElapsed) || data.gravityElapsed < 0 || data.gravityElapsed > 10000 ||
        !Number.isFinite(data.lockElapsed) || data.lockElapsed < 0 || data.lockElapsed > LOCK_DELAY_MS ||
        !Number.isInteger(data.lockResets) || data.lockResets < 0 || data.lockResets > MAX_LOCK_RESETS) return false;
    const piece = data.piece;
    if (!piece || !isValidPieceMatrix(piece.type, piece.matrix) ||
        !Number.isInteger(piece.x) || !Number.isInteger(piece.y) ||
        piece.y < -4 || piece.y >= ROWS) return false;
    const previousBoard = this.board;
    this.board = data.board;
    const placementValid = this._canPlace(piece.matrix, piece.x, piece.y);
    this.board = previousBoard;
    if (!placementValid) return false;

    this.board = data.board.map((row) => row.slice());
    this.bag = data.bag.slice();
    this.queue = data.queue.slice();
    this.piece = { ...piece, matrix: copyMatrix(piece.matrix) };
    this.score = data.score;
    this.lines = data.lines;
    this.level = data.level;
    this.phase = 'paused';
    this.gravityElapsed = data.gravityElapsed;
    this.lockElapsed = data.lockElapsed;
    this.lockResets = data.lockResets;
    this.onEvent('restore');
    return true;
  }

  togglePause() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.onEvent('pause');
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.onEvent('resume');
    }
  }

  pause() {
    if (this.phase === 'playing') this.togglePause();
  }

  get dropInterval() {
    return Math.max(78, Math.round(860 * Math.pow(0.79, this.level - 1)));
  }

  _fillQueue() {
    while (this.queue.length < 5) {
      if (this.bag.length === 0) {
        const shuffled = Object.keys(PIECES);
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
          const j = Math.min(i, Math.floor(Math.max(0, this.random()) * (i + 1)));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        this.bag = shuffled;
      }
      this.queue.push(this.bag.pop());
    }
  }

  _spawnNext() {
    this._fillQueue();
    const type = this.queue.shift();
    this._fillQueue();
    const matrix = copyMatrix(PIECES[type].matrix);
    this.piece = {
      type,
      matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: -1,
    };
    this.gravityElapsed = 0;
    this.lockElapsed = 0;
    this.lockResets = 0;
    if (!this._canPlace(this.piece.matrix, this.piece.x, this.piece.y)) {
      this.phase = 'gameover';
      this.piece = null;
      this.onEvent('gameover');
      return false;
    }
    this.onEvent('spawn');
    return true;
  }

  _canPlace(matrix, x, y) {
    for (let row = 0; row < matrix.length; row += 1) {
      for (let col = 0; col < matrix[row].length; col += 1) {
        if (!matrix[row][col]) continue;
        const bx = x + col;
        const by = y + row;
        if (bx < 0 || bx >= COLS || by >= ROWS) return false;
        if (by >= 0 && this.board[by][bx] !== null) return false;
      }
    }
    return true;
  }

  _isGrounded() {
    return this.piece !== null && !this._canPlace(this.piece.matrix, this.piece.x, this.piece.y + 1);
  }

  _resetLockOnUserMove() {
    if (this.lockResets < MAX_LOCK_RESETS) {
      this.lockElapsed = 0;
      this.lockResets += 1;
    }
  }

  move(horizontal) {
    if (this.phase !== 'playing' || !this.piece || ![-1, 1].includes(horizontal)) return false;
    const { matrix, x, y } = this.piece;
    if (!this._canPlace(matrix, x + horizontal, y)) return false;
    const wasGrounded = this._isGrounded();
    this.piece.x += horizontal;
    if (wasGrounded) this._resetLockOnUserMove();
    this.onEvent('move');
    return true;
  }

  rotate() {
    if (this.phase !== 'playing' || !this.piece) return false;
    if (this.piece.type === 'O') return true;
    const newMatrix = rotateClockwise(this.piece.matrix);
    const { x, y } = this.piece;
    const wasGrounded = this._isGrounded();
    const kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1], [0, -2]];
    for (const [dx, dy] of kicks) {
      if (this._canPlace(newMatrix, x + dx, y + dy)) {
        this.piece.matrix = newMatrix;
        this.piece.x = x + dx;
        this.piece.y = y + dy;
        if (wasGrounded) this._resetLockOnUserMove();
        this.onEvent('rotate');
        return true;
      }
    }
    return false;
  }

  _moveDown() {
    if (!this.piece || !this._canPlace(this.piece.matrix, this.piece.x, this.piece.y + 1)) return false;
    this.piece.y += 1;
    this.lockElapsed = 0;
    return true;
  }

  softDrop() {
    if (this.phase !== 'playing' || !this.piece) return false;
    if (!this._moveDown()) return false;
    this.score += 1;
    this.onEvent('drop');
    return true;
  }

  hardDrop() {
    if (this.phase !== 'playing' || !this.piece) return 0;
    let distance = 0;
    while (this._moveDown()) distance += 1;
    this.score += distance * 2;
    this._lockPiece();
    this.onEvent('harddrop');
    return distance;
  }

  ghostY() {
    if (!this.piece) return null;
    let y = this.piece.y;
    while (this._canPlace(this.piece.matrix, this.piece.x, y + 1)) y += 1;
    return y;
  }

  _lockPiece() {
    if (!this.piece || this.phase !== 'playing') return;
    let overTop = false;
    const { matrix, x, y, type } = this.piece;
    for (let row = 0; row < matrix.length; row += 1) {
      for (let col = 0; col < matrix[row].length; col += 1) {
        if (!matrix[row][col]) continue;
        const by = y + row;
        if (by < 0) overTop = true;
        else this.board[by][x + col] = type;
      }
    }
    if (overTop) {
      this.phase = 'gameover';
      this.piece = null;
      this.onEvent('gameover');
      return;
    }
    let removed = 0;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (this.board[row].every((cell) => cell !== null)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(COLS).fill(null));
        removed += 1;
        row += 1;
      }
    }
    if (removed) {
      this.score += SCORE_BY_LINES[removed] * this.level;
      this.lines += removed;
      this.level = Math.floor(this.lines / LINE_INTERVAL) + 1;
      this.onEvent('lines', removed);
    } else {
      this.onEvent('lock');
    }
    this._spawnNext();
  }

  tick(deltaMilliseconds) {
    if (this.phase !== 'playing' || !this.piece) return;
    const delta = Math.max(0, Math.min(160, Number(deltaMilliseconds) || 0));
    if (this._isGrounded()) {
      this.lockElapsed += delta;
      if (this.lockElapsed >= LOCK_DELAY_MS) {
        this._lockPiece();
        return;
      }
    } else {
      this.lockElapsed = 0;
    }

    this.gravityElapsed += delta;
    const interval = this.dropInterval;
    if (this.gravityElapsed >= interval) {
      this.gravityElapsed -= interval;
      this._moveDown();
      this.onEvent('gravity');
    }
  }
}
