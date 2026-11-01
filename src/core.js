/*
 * Chess GM core: pure helpers shared by the content script and the tests.
 * No DOM access in this file. It attaches to globalThis.ChessGM in the
 * browser and to module.exports under Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ChessGM = Object.assign(root.ChessGM || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FILES = 'abcdefgh';
  const LICHESS_TYPES = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
  const GLYPHS = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };

  // Squares are named "e4". file and rank are 0-based, so a1 is {file: 0, rank: 0}.
  function squareName(file, rank) {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return FILES[file] + (rank + 1);
  }

  function parseSquareName(name) {
    if (typeof name !== 'string' || name.length !== 2) return null;
    const file = FILES.indexOf(name[0]);
    const rank = Number(name[1]) - 1;
    if (file < 0 || !(rank >= 0 && rank <= 7)) return null;
    return { file, rank };
  }

  // fx, fy: pointer position as a fraction of the board, measured from the
  // top-left corner as drawn on screen. flipped means black is at the bottom.
  function squareFromFraction(fx, fy, flipped) {
    if (!(fx >= 0 && fx < 1 && fy >= 0 && fy < 1)) return null;
    let file = Math.floor(fx * 8);
    let rank = 7 - Math.floor(fy * 8);
    if (flipped) {
      file = 7 - file;
      rank = 7 - rank;
    }
    return squareName(file, rank);
  }

  // Top-left corner of a square as a fraction of the board, as drawn on screen.
  function fractionFromSquare(name, flipped) {
    const sq = parseSquareName(name);
    if (!sq) return null;
    let col = sq.file;
    let row = 7 - sq.rank;
    if (flipped) {
      col = 7 - col;
      row = 7 - row;
    }
    return { x: col / 8, y: row / 8 };
  }

  // Pieces are {color: 'w' | 'b', type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'}.
  function pieceCode(piece) {
    return piece ? piece.color + piece.type : null;
  }

  function parsePieceCode(code) {
    if (typeof code !== 'string' || !/^[wb][pnbrqk]$/.test(code)) return null;
    return { color: code[0], type: code[1] };
  }

  function samePiece(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.color === b.color && a.type === b.type;
  }

  function glyphFor(piece) {
    return piece ? GLYPHS[piece.color][piece.type] : '';
  }

  // chess.com renders <div class="piece wp square-52">. square-XY is file X, rank Y, both 1-based.
  function chesscomPieceFromClasses(classes) {
    let code = null;
    let square = null;
    for (const c of classes) {
      if (/^[wb][pnbrqk]$/.test(c)) code = c;
      else if (/^square-[1-8][1-8]$/.test(c)) square = squareName(Number(c[7]) - 1, Number(c[8]) - 1);
    }
    if (!code || !square) return null;
    return { square, piece: parsePieceCode(code) };
  }

  // lichess renders <piece class="white knight" style="transform: translate(300px, 350px)">,
  // where the translation is measured in pixels from the board's top-left corner.
  function lichessPieceFromElement(classes, transform, squareSize, flipped) {
    let color = null;
    let type = null;
    for (const c of classes) {
      if (c === 'white') color = 'w';
      else if (c === 'black') color = 'b';
      else if (LICHESS_TYPES[c]) type = LICHESS_TYPES[c];
    }
    if (!color || !type || !(squareSize > 0)) return null;
    const m = /translate(?:3d)?\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/.exec(transform || '');
    if (!m) return null;
    const col = Math.round(parseFloat(m[1]) / squareSize);
    const row = Math.round(parseFloat(m[2]) / squareSize);
    const square = squareFromFraction((col + 0.5) / 8, (row + 0.5) / 8, flipped);
    if (!square) return null;
    return { square, piece: { color, type } };
  }

  // A position is a plain object: {e2: {color: 'w', type: 'p'}, ...}.
  function clonePosition(pos) {
    const out = {};
    for (const k in pos) out[k] = { color: pos[k].color, type: pos[k].type };
    return out;
  }

  function positionsEqual(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if (!samePiece(a[k], b[k])) return false;
    return true;
  }

  // A scratch move has no legality check: any piece goes to any square, a
  // capture replaces whatever was there, and a pawn reaching the last rank
  // becomes a queen. Returns null when there is nothing to move.
  function applyScratchMove(pos, from, to) {
    const piece = pos[from];
    const dest = parseSquareName(to);
    if (!piece || !dest || from === to) return null;
    const next = clonePosition(pos);
    const captured = next[to] || null;
    delete next[from];
    const lastRank = piece.color === 'w' ? 7 : 0;
    const promoted = piece.type === 'p' && dest.rank === lastRank;
    next[to] = { color: piece.color, type: promoted ? 'q' : piece.type };
    return { position: next, captured, promoted };
  }

  // Squares where two positions disagree, sorted by name.
  function diffPositions(live, scratch) {
    const out = [];
    const keys = [...new Set([...Object.keys(live), ...Object.keys(scratch)])].sort();
    for (const k of keys) {
      if (!samePiece(live[k], scratch[k])) {
        out.push({ square: k, live: live[k] || null, scratch: scratch[k] || null });
      }
    }
    return out;
  }

  // Returns detect(square, now). It is true on the second click on the same
  // square within windowMs, and resets after each detection.
  function createDoubleClickDetector(windowMs) {
    let lastSquare = null;
    let lastTime = -Infinity;
    return function detect(square, now) {
      const isDouble = square === lastSquare && now - lastTime <= windowMs;
      if (isDouble) {
        lastSquare = null;
        lastTime = -Infinity;
        return true;
      }
      lastSquare = square;
      lastTime = now;
      return false;
    };
  }

  return {
    FILES,
    squareName,
    parseSquareName,
    squareFromFraction,
    fractionFromSquare,
    pieceCode,
    parsePieceCode,
    samePiece,
    glyphFor,
    chesscomPieceFromClasses,
    lichessPieceFromElement,
    clonePosition,
    positionsEqual,
    applyScratchMove,
    diffPositions,
    createDoubleClickDetector,
  };
});
