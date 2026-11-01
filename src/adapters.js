/*
 * Site adapters. Everything that depends on how chess.com or lichess build
 * their board DOM lives here, so a site redesign only touches this file.
 *
 * Each adapter provides:
 *   matches(host)          -> is this adapter for the current site
 *   findBoard()            -> the live board element, or null
 *   isFlipped(board)       -> true when black is at the bottom
 *   readPieces(board)      -> { position, elements } keyed by square name
 *   pieceImage(board, p)   -> CSS background-image for a piece, or null
 */
(function (root) {
  'use strict';
  const core = root.ChessGM;
  const LICHESS_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

  // Sidebars can hold mini boards, so the biggest board on the page is the live one.
  function largest(nodes) {
    let best = null;
    let bestArea = 0;
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea) {
        best = el;
        bestArea = area;
      }
    }
    return best;
  }

  function backgroundImageOf(el) {
    if (!el) return null;
    const bg = getComputedStyle(el).backgroundImage;
    return bg && bg !== 'none' ? bg : null;
  }

  const chesscom = {
    name: 'chess.com',
    matches(host) {
      return /(^|\.)chess\.com$/.test(host);
    },
    findBoard() {
      return largest(document.querySelectorAll('wc-chess-board, chess-board'));
    },
    isFlipped(board) {
      return board.classList.contains('flipped');
    },
    readPieces(board) {
      const position = {};
      const elements = {};
      for (const el of board.querySelectorAll('.piece')) {
        const hit = core.chesscomPieceFromClasses(el.classList);
        if (!hit) continue;
        position[hit.square] = hit.piece;
        elements[hit.square] = el;
      }
      return { position, elements };
    },
    pieceImage(board, piece) {
      return backgroundImageOf(board.querySelector('.piece.' + core.pieceCode(piece)));
    },
  };

  const lichess = {
    name: 'lichess',
    matches(host) {
      return /(^|\.)lichess\.org$/.test(host);
    },
    findBoard() {
      return largest(document.querySelectorAll('cg-board'));
    },
    isFlipped(board) {
      const wrap = board.closest('.cg-wrap');
      return !!wrap && wrap.classList.contains('orientation-black');
    },
    readPieces(board) {
      const position = {};
      const elements = {};
      const squareSize = board.getBoundingClientRect().width / 8;
      const flipped = this.isFlipped(board);
      for (const el of board.querySelectorAll('piece')) {
        // chessground adds a faded "ghost" copy of the piece being dragged.
        if (el.classList.contains('ghost')) continue;
        const hit = core.lichessPieceFromElement(el.classList, el.style.transform, squareSize, flipped);
        if (!hit) continue;
        position[hit.square] = hit.piece;
        elements[hit.square] = el;
      }
      return { position, elements };
    },
    pieceImage(board, piece) {
      const color = piece.color === 'w' ? 'white' : 'black';
      return backgroundImageOf(board.querySelector('piece.' + color + '.' + LICHESS_NAMES[piece.type]));
    },
  };

  root.ChessGM.adapters = [chesscom, lichess];
  root.ChessGM.pickAdapter = function pickAdapter(host) {
    return root.ChessGM.adapters.find((a) => a.matches(host)) || null;
  };
})(globalThis);
