const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core.js');

const W = (type) => ({ color: 'w', type });
const B = (type) => ({ color: 'b', type });

test('square names round-trip through file and rank', () => {
  assert.equal(core.squareName(0, 0), 'a1');
  assert.equal(core.squareName(4, 3), 'e4');
  assert.equal(core.squareName(7, 7), 'h8');
  assert.equal(core.squareName(8, 0), null);
  assert.deepEqual(core.parseSquareName('e4'), { file: 4, rank: 3 });
  assert.equal(core.parseSquareName('i9'), null);
  assert.equal(core.parseSquareName('e'), null);
});

test('pointer fractions map to squares from white and from black', () => {
  // top-left corner of the board
  assert.equal(core.squareFromFraction(0.01, 0.01, false), 'a8');
  assert.equal(core.squareFromFraction(0.01, 0.01, true), 'h1');
  // bottom-right corner
  assert.equal(core.squareFromFraction(0.99, 0.99, false), 'h1');
  assert.equal(core.squareFromFraction(0.99, 0.99, true), 'a8');
  // e2 is the 5th column from the left and the 7th row from the top for white
  assert.equal(core.squareFromFraction(4.5 / 8, 6.5 / 8, false), 'e2');
  assert.equal(core.squareFromFraction(4.5 / 8, 6.5 / 8, true), 'd7');
  // outside the board
  assert.equal(core.squareFromFraction(1, 0.5, false), null);
  assert.equal(core.squareFromFraction(-0.1, 0.5, false), null);
});

test('fractionFromSquare is the inverse of squareFromFraction', () => {
  for (const flipped of [false, true]) {
    for (const file of core.FILES) {
      for (let rank = 1; rank <= 8; rank++) {
        const name = file + rank;
        const f = core.fractionFromSquare(name, flipped);
        assert.equal(core.squareFromFraction(f.x + 1 / 16, f.y + 1 / 16, flipped), name);
      }
    }
  }
  assert.deepEqual(core.fractionFromSquare('a8', false), { x: 0, y: 0 });
  assert.deepEqual(core.fractionFromSquare('a8', true), { x: 7 / 8, y: 7 / 8 });
  assert.equal(core.fractionFromSquare('z9', false), null);
});

test('piece codes parse and compare', () => {
  assert.deepEqual(core.parsePieceCode('wp'), W('p'));
  assert.deepEqual(core.parsePieceCode('bk'), B('k'));
  assert.equal(core.parsePieceCode('wx'), null);
  assert.equal(core.pieceCode(B('n')), 'bn');
  assert.equal(core.pieceCode(null), null);
  assert.equal(core.samePiece(W('q'), W('q')), true);
  assert.equal(core.samePiece(W('q'), B('q')), false);
  assert.equal(core.samePiece(null, null), true);
  assert.equal(core.samePiece(null, W('p')), false);
  assert.equal(core.glyphFor(W('k')), '♔');
  assert.equal(core.glyphFor(B('p')), '♟');
});

test('chess.com piece classes resolve to a square and a piece', () => {
  assert.deepEqual(core.chesscomPieceFromClasses(['piece', 'wp', 'square-52']), { square: 'e2', piece: W('p') });
  assert.deepEqual(core.chesscomPieceFromClasses(['piece', 'bk', 'square-58', 'dragging']), { square: 'e8', piece: B('k') });
  assert.equal(core.chesscomPieceFromClasses(['piece', 'square-52']), null);
  assert.equal(core.chesscomPieceFromClasses(['piece', 'wp']), null);
  assert.equal(core.chesscomPieceFromClasses(['piece', 'wp', 'square-90']), null);
});

test('lichess piece transforms resolve to a square in either orientation', () => {
  const sq = 50;
  // e2 from white: column 4, row 6
  assert.deepEqual(core.lichessPieceFromElement(['white', 'pawn'], 'translate(200px, 300px)', sq, false), {
    square: 'e2',
    piece: W('p'),
  });
  // the same screen position from black is d7
  assert.deepEqual(core.lichessPieceFromElement(['white', 'pawn'], 'translate(200px, 300px)', sq, true), {
    square: 'd7',
    piece: W('p'),
  });
  // translate3d and fractional pixels are tolerated
  assert.deepEqual(core.lichessPieceFromElement(['black', 'knight'], 'translate3d(49.6px, 0.2px, 0px)', sq, false), {
    square: 'b8',
    piece: B('n'),
  });
  assert.equal(core.lichessPieceFromElement(['white', 'pawn'], '', sq, false), null);
  assert.equal(core.lichessPieceFromElement(['pawn'], 'translate(0px, 0px)', sq, false), null);
  assert.equal(core.lichessPieceFromElement(['white', 'pawn'], 'translate(0px, 0px)', 0, false), null);
});

test('scratch moves are free, capture by replacement, and promote pawns to queens', () => {
  const pos = { e2: W('p'), d7: B('p'), g1: W('n'), a7: W('p'), h2: B('p') };

  const pawn = core.applyScratchMove(pos, 'e2', 'e4');
  assert.deepEqual(pawn.position.e4, W('p'));
  assert.equal(pawn.position.e2, undefined);
  assert.equal(pawn.captured, null);
  assert.equal(pawn.promoted, false);
  // the input is untouched
  assert.deepEqual(pos.e2, W('p'));

  // knights do not have to move like knights, and the opponent's pieces move too
  assert.deepEqual(core.applyScratchMove(pos, 'g1', 'g5').position.g5, W('n'));
  assert.deepEqual(core.applyScratchMove(pos, 'd7', 'd5').position.d5, B('p'));

  const capture = core.applyScratchMove(pos, 'g1', 'd7');
  assert.deepEqual(capture.captured, B('p'));
  assert.deepEqual(capture.position.d7, W('n'));

  const promo = core.applyScratchMove(pos, 'a7', 'a8');
  assert.equal(promo.promoted, true);
  assert.deepEqual(promo.position.a8, W('q'));
  const blackPromo = core.applyScratchMove(pos, 'h2', 'h1');
  assert.equal(blackPromo.promoted, true);
  assert.deepEqual(blackPromo.position.h1, B('q'));

  assert.equal(core.applyScratchMove(pos, 'e3', 'e4'), null, 'empty source');
  assert.equal(core.applyScratchMove(pos, 'e2', 'e2'), null, 'same square');
  assert.equal(core.applyScratchMove(pos, 'e2', 'z9'), null, 'bad destination');
});

test('positions compare and diff by square', () => {
  const a = { e2: W('p'), e8: B('k') };
  const b = { e4: W('p'), e8: B('k') };
  assert.equal(core.positionsEqual(a, core.clonePosition(a)), true);
  assert.equal(core.positionsEqual(a, b), false);
  assert.deepEqual(core.diffPositions(a, b), [
    { square: 'e2', live: W('p'), scratch: null },
    { square: 'e4', live: null, scratch: W('p') },
  ]);
  assert.deepEqual(core.diffPositions(a, a), []);
});

test('double right-click fires on the second click on one square within the window', () => {
  const detect = core.createDoubleClickDetector(400);
  assert.equal(detect('e4', 1000), false);
  assert.equal(detect('e4', 1300), true, 'second click within 400ms');
  assert.equal(detect('e4', 1500), false, 'the detector reset after firing');
  assert.equal(detect('d5', 1600), false, 'different square');
  assert.equal(detect('e4', 1700), false, 'square changed in between');
  assert.equal(detect('e4', 2500), false, 'too slow');
  assert.equal(detect('e4', 2900), true);
});

test('scratch history undoes, redoes, and drops the redo branch on a new move', () => {
  const base = { e2: W('p'), e7: B('p') };
  const h = core.createScratchHistory(base);
  assert.deepEqual(h.position, base);
  assert.notEqual(h.position, base, 'the base is copied, not shared');
  assert.equal(h.moveCount, 0);
  assert.equal(h.canUndo, false);
  assert.equal(h.canRedo, false);
  assert.equal(h.undo(), false);
  assert.equal(h.redo(), false);

  const m1 = core.applyScratchMove(h.position, 'e2', 'e4');
  h.push(m1.position, { from: 'e2', to: 'e4' });
  const m2 = core.applyScratchMove(h.position, 'e7', 'e5');
  h.push(m2.position, { from: 'e7', to: 'e5' });
  assert.equal(h.moveCount, 2);
  assert.deepEqual(h.lastMove, { from: 'e7', to: 'e5' });
  assert.deepEqual(h.position, { e4: W('p'), e5: B('p') });

  assert.equal(h.undo(), true);
  assert.equal(h.moveCount, 1);
  assert.equal(h.canRedo, true);
  assert.equal(h.redoCount, 1);
  assert.deepEqual(h.position, { e4: W('p'), e7: B('p') });
  assert.deepEqual(h.lastMove, { from: 'e2', to: 'e4' });

  assert.equal(h.undo(), true);
  assert.equal(h.moveCount, 0);
  assert.deepEqual(h.position, base);
  assert.equal(h.lastMove, null);
  assert.equal(h.undo(), false, 'nothing left to undo');

  assert.equal(h.redo(), true);
  assert.equal(h.redo(), true);
  assert.equal(h.redo(), false, 'nothing left to redo');
  assert.equal(h.moveCount, 2);

  // undo once, then a different move: the old redo branch is gone
  h.undo();
  const m3 = core.applyScratchMove(h.position, 'e7', 'e6');
  h.push(m3.position, { from: 'e7', to: 'e6' });
  assert.equal(h.moveCount, 2);
  assert.equal(h.canRedo, false);
  assert.deepEqual(h.position, { e4: W('p'), e6: B('p') });
});
