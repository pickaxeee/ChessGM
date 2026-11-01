/*
 * Chess GM content script.
 *
 * Runs at document_start so its window-level capture listeners are
 * registered before the site's own handlers. Right-button events over the
 * board are swallowed here, which disables the site's arrow drawing and
 * right-click highlights. In their place:
 *
 *   right-drag a piece         move it on a scratch copy of the position
 *                              (any piece, either color, no legality check)
 *   double right-click         toggle a red mark on that square
 *   left / right arrow         undo / redo the last scratch move
 *   Escape                     clear the scratch line and the marks
 *
 * The scratch line is drawn on an overlay above the real board. Live pieces
 * that the scratch line moved are hidden while it is active. The moment the
 * real position changes (your opponent moved, or you did), everything resets.
 */
(function () {
  'use strict';

  const core = globalThis.ChessGM;
  const adapter = core.pickAdapter(location.hostname);
  if (!adapter) return;

  const DOUBLE_CLICK_MS = 400;
  const DRAG_THRESHOLD_PX = 4;
  const MUTATION_SETTLE_MS = 30;

  let board = null;
  let observer = null;
  let overlay = null;
  let marksLayer = null;
  let piecesLayer = null;
  let dragLayer = null;
  let badge = null;

  let base = null; // live position when the scratch line or the marks began
  let line = null; // scratch history (core.createScratchHistory), or null when inactive
  let hidden = []; // live piece elements hidden under scratch pieces
  const marks = new Set();
  let drag = null; // {from, x, y, moved, piece, node}
  const isDoubleClick = core.createDoubleClickDetector(DOUBLE_CLICK_MS);
  const imageCache = new Map();
  let rafId = 0;
  let mutationTimer = 0;

  // ---------- overlay ----------

  function el(tag, className) {
    const node = document.createElement(tag);
    node.className = className;
    return node;
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = el('div', 'cgm-overlay');
    marksLayer = el('div', 'cgm-layer');
    piecesLayer = el('div', 'cgm-layer');
    dragLayer = el('div', 'cgm-layer');
    badge = el('div', 'cgm-badge');
    overlay.append(marksLayer, piecesLayer, dragLayer, badge);
    (document.body || document.documentElement).appendChild(overlay);
  }

  function isActive() {
    return !!line || marks.size > 0 || !!drag;
  }

  function syncRect() {
    if (!overlay || !board) return;
    const r = board.getBoundingClientRect();
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    overlay.style.setProperty('--cgm-square', r.width / 8 + 'px');
  }

  // Keep the overlay glued to the board while anything is showing on it.
  function loop() {
    rafId = 0;
    if (!isActive()) return;
    syncRect();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function placeOnSquare(node, square) {
    const f = core.fractionFromSquare(square, adapter.isFlipped(board));
    node.style.left = f.x * 100 + '%';
    node.style.top = f.y * 100 + '%';
  }

  function pieceImage(piece) {
    const code = core.pieceCode(piece);
    if (!imageCache.has(code)) imageCache.set(code, adapter.pieceImage(board, piece));
    return imageCache.get(code);
  }

  // Scratch pieces reuse the site's own piece images, so they match the
  // user's theme. A piece type that is no longer on the board (say, a queen
  // after a trade) falls back to a Unicode glyph.
  function makePiece(piece) {
    const node = el('div', 'cgm-piece');
    const img = pieceImage(piece);
    if (img) {
      node.style.backgroundImage = img;
    } else {
      node.classList.add('cgm-glyph');
      node.textContent = core.glyphFor(piece);
    }
    return node;
  }

  function badgeText() {
    const n = line.moveCount;
    let text = 'Scratch line: ' + n + (n === 1 ? ' move' : ' moves');
    if (line.canUndo && line.canRedo) text += ' · ← undo · → redo';
    else if (line.canUndo) text += ' · ← undo';
    else if (line.canRedo) text += ' · → redo';
    return text + ' · Esc clears';
  }

  function render() {
    if (!board) return;
    ensureOverlay();
    for (const node of hidden) node.style.visibility = '';
    hidden = [];
    piecesLayer.replaceChildren();
    marksLayer.replaceChildren();

    if (line) {
      const { position, elements } = adapter.readPieces(board);
      for (const d of core.diffPositions(position, line.position)) {
        if (d.live && elements[d.square]) {
          elements[d.square].style.visibility = 'hidden';
          hidden.push(elements[d.square]);
        }
        if (d.scratch) {
          const node = makePiece(d.scratch);
          placeOnSquare(node, d.square);
          piecesLayer.appendChild(node);
        }
      }
      if (line.lastMove) {
        for (const sq of [line.lastMove.from, line.lastMove.to]) {
          const m = el('div', 'cgm-lastmove');
          placeOnSquare(m, sq);
          marksLayer.appendChild(m);
        }
      }
    }

    for (const sq of marks) {
      const m = el('div', 'cgm-mark');
      placeOnSquare(m, sq);
      marksLayer.appendChild(m);
    }

    if (line) {
      badge.textContent = badgeText();
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }

    overlay.classList.toggle('cgm-visible', isActive());
    syncRect();
    if (isActive()) startLoop();
  }

  // ---------- state ----------

  function ensureBase() {
    if (!base) base = adapter.readPieces(board).position;
  }

  function startLine() {
    ensureBase();
    line = core.createScratchHistory(base);
  }

  function cancelDrag() {
    if (!drag) return;
    if (drag.node) drag.node.remove();
    drag = null;
  }

  function clearState() {
    cancelDrag();
    base = null;
    line = null;
    marks.clear();
  }

  function resetAll() {
    clearState();
    render();
  }

  // ---------- live board tracking ----------

  function onBoardMutation() {
    if (mutationTimer) return;
    mutationTimer = setTimeout(() => {
      mutationTimer = 0;
      if (!base || !board) return;
      const { position } = adapter.readPieces(board);
      if (!core.positionsEqual(position, base)) resetAll();
    }, MUTATION_SETTLE_MS);
  }

  function attachBoard(next) {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    board = next;
    imageCache.clear();
    if (!board) return;
    observer = new MutationObserver(onBoardMutation);
    observer.observe(board, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  // The board can be swapped out when the site navigates between games
  // without a full page load, so keep checking for it.
  function findBoard() {
    if (board && document.contains(board) && board.getBoundingClientRect().width > 0) return;
    const next = adapter.findBoard();
    if (next === board) return;
    if (isActive()) {
      for (const node of hidden) node.style.visibility = '';
      hidden = [];
      clearState();
    }
    attachBoard(next);
    if (overlay) render();
  }

  // ---------- pointer handling ----------

  function boardRect() {
    return board ? board.getBoundingClientRect() : null;
  }

  function inBoard(x, y) {
    const r = boardRect();
    return !!r && r.width > 0 && x >= r.left && x < r.right && y >= r.top && y < r.bottom;
  }

  function squareAt(x, y) {
    const r = boardRect();
    return core.squareFromFraction((x - r.left) / r.width, (y - r.top) / r.height, adapter.isFlipped(board));
  }

  function swallow(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  function onDown(e) {
    if (e.button !== 2) return;
    if (!board) findBoard();
    if (!inBoard(e.clientX, e.clientY)) return;
    swallow(e);
    if (drag) return; // the mousedown that follows a pointerdown, or a second pointer
    const from = squareAt(e.clientX, e.clientY);
    if (!from) return;
    const position = line ? line.position : adapter.readPieces(board).position;
    drag = { from, x: e.clientX, y: e.clientY, moved: false, piece: position[from] || null, node: null };
    render();
  }

  function onMove(e) {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) >= DRAG_THRESHOLD_PX) {
      drag.moved = true;
      if (drag.piece) {
        drag.node = makePiece(drag.piece);
        drag.node.classList.add('cgm-drag');
        dragLayer.appendChild(drag.node);
      }
    }
    if (drag.node) {
      const r = boardRect();
      const half = r.width / 16;
      drag.node.style.left = e.clientX - r.left - half + 'px';
      drag.node.style.top = e.clientY - r.top - half + 'px';
    }
  }

  function onUp(e) {
    if (e.button !== 2) return;
    if (!drag) {
      if (inBoard(e.clientX, e.clientY)) swallow(e);
      return;
    }
    swallow(e);
    const d = drag;
    cancelDrag();
    const to = inBoard(e.clientX, e.clientY) ? squareAt(e.clientX, e.clientY) : null;

    if (d.moved && to && to !== d.from) {
      const started = !line;
      if (started) startLine();
      const result = core.applyScratchMove(line.position, d.from, to);
      if (result) {
        line.push(result.position, { from: d.from, to });
      } else if (started) {
        // Dragged from an empty square before any move: nothing to show.
        line = null;
        if (marks.size === 0) base = null;
      }
    } else if (to === d.from && isDoubleClick(d.from, e.timeStamp)) {
      ensureBase();
      if (marks.has(d.from)) marks.delete(d.from);
      else marks.add(d.from);
    }
    render();
  }

  function onContextMenu(e) {
    if (inBoard(e.clientX, e.clientY)) swallow(e);
  }

  function onAuxClick(e) {
    if (e.button === 2 && inBoard(e.clientX, e.clientY)) swallow(e);
  }

  // ---------- keyboard ----------

  function isTyping(e) {
    const t = e.target;
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (isActive()) resetAll();
      return;
    }
    // While a scratch line is open, the arrow keys step through it instead of
    // the site's move list. Plain presses only, and not while typing in chat.
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && line && !isTyping(e) && !e.altKey && !e.ctrlKey && !e.metaKey) {
      swallow(e);
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') line.undo();
      else line.redo();
      render();
    }
  }

  function onKeyUp(e) {
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && line && !isTyping(e)) swallow(e);
  }

  function onCancel() {
    if (!drag) return;
    cancelDrag();
    render();
  }

  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('mousedown', onDown, true);
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('mouseup', onUp, true);
  window.addEventListener('pointercancel', onCancel, true);
  window.addEventListener('blur', onCancel);
  window.addEventListener('contextmenu', onContextMenu, true);
  window.addEventListener('auxclick', onAuxClick, true);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('scroll', syncRect, true);
  window.addEventListener('resize', syncRect);

  findBoard();
  document.addEventListener('DOMContentLoaded', findBoard);
  setInterval(findBoard, 1000);
})();
