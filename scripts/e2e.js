/*
 * End-to-end check. Loads the extension into Chromium with Playwright, serves
 * stand-in chess.com and lichess pages that use each site's real board markup,
 * and drives the mouse the way a player would.
 *
 *   npm run test:e2e
 *
 * Needs Playwright and its Chromium build: npm i -D playwright && npx playwright install chromium
 */
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const EXT = path.resolve(__dirname, '..');
const PROFILE = path.join(EXT, '.e2e-profile');

const svg = (fill, label) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><circle cx='5' cy='5' r='4' fill='${fill}'/><text x='5' y='6.5' font-size='4' text-anchor='middle'>${label}</text></svg>`,
  )}")`;

// Board at (100,100), 400px square, so each square is 50px.
const CHESSCOM_PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; }
  wc-chess-board { display: block; position: absolute; left: 100px; top: 100px; width: 400px; height: 400px; background: #769656; }
  .piece { position: absolute; width: 12.5%; height: 12.5%; background-size: 100%; }
  .piece.wp { background-image: ${svg('#fff', 'P')}; }
  .piece.bp { background-image: ${svg('#000', 'P')}; }
  .piece.wk { background-image: ${svg('#fff', 'K')}; }
  .piece.bk { background-image: ${svg('#000', 'K')}; }
  .piece.bn { background-image: ${svg('#000', 'N')}; }
</style></head><body>
<wc-chess-board class="board" id="board-single">
  <div class="piece wp square-52"></div>
  <div class="piece bp square-47"></div>
  <div class="piece wk square-51"></div>
  <div class="piece bk square-58"></div>
  <div class="piece bn square-28"></div>
</wc-chess-board>
<script>
  window.__right = { pointerdown: 0, mousedown: 0, contextmenu: 0, auxclick: 0 };
  window.__left = 0;
  const b = document.querySelector('wc-chess-board');
  for (const t of Object.keys(window.__right)) b.addEventListener(t, (e) => { if (e.button === 2 || t === 'contextmenu') window.__right[t]++; });
  b.addEventListener('pointerdown', (e) => { if (e.button === 0) window.__left++; });
</script>
</body></html>`;

// Black at the bottom, to exercise the flipped orientation.
const LICHESS_PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; }
  .cg-wrap { position: absolute; left: 100px; top: 100px; width: 400px; height: 400px; display: block; }
  cg-container, cg-board { display: block; position: absolute; inset: 0; background: #8ca2ad; }
  piece { position: absolute; display: block; width: 12.5%; height: 12.5%; background-size: 100%; }
  piece.white.pawn { background-image: ${svg('#fff', 'P')}; }
  piece.black.pawn { background-image: ${svg('#000', 'P')}; }
</style></head><body>
<div class="cg-wrap orientation-black"><cg-container><cg-board>
  <piece class="white pawn" style="transform: translate(150px, 50px)"></piece>
  <piece class="black pawn" style="transform: translate(150px, 300px)"></piece>
</cg-board></cg-container></div>
<script>
  window.__right = { mousedown: 0, contextmenu: 0 };
  const b = document.querySelector('cg-board');
  b.addEventListener('mousedown', (e) => { if (e.button === 2) window.__right.mousedown++; });
  b.addEventListener('contextmenu', () => window.__right.contextmenu++);
</script>
</body></html>`;

let failures = 0;
function check(cond, msg) {
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
  if (!cond) failures++;
}

// Screen center of a square on a 400px board at (100,100), from white's side unless flipped.
function center(square, flipped) {
  let col = 'abcdefgh'.indexOf(square[0]);
  let row = 8 - Number(square[1]);
  if (flipped) { col = 7 - col; row = 7 - row; }
  return { x: 100 + col * 50 + 25, y: 100 + row * 50 + 25 };
}

async function rightDrag(page, from, to, flipped) {
  const a = center(from, flipped);
  const b = center(to, flipped);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up({ button: 'right' });
}

async function doubleRightClick(page, square, flipped) {
  const c = center(square, flipped);
  await page.mouse.click(c.x, c.y, { button: 'right' });
  await page.mouse.click(c.x, c.y, { button: 'right' });
}

const overlayState = (page) =>
  page.evaluate(() => {
    const ov = document.querySelector('.cgm-overlay');
    const pieces = [...document.querySelectorAll('.cgm-piece:not(.cgm-drag)')].map((p) => ({
      left: p.style.left,
      top: p.style.top,
      hasImage: p.style.backgroundImage !== '',
      glyph: p.textContent,
    }));
    const marks = [...document.querySelectorAll('.cgm-mark')].map((m) => ({ left: m.style.left, top: m.style.top }));
    return {
      visible: !!ov && ov.classList.contains('cgm-visible'),
      rect: ov ? { left: ov.style.left, top: ov.style.top, width: ov.style.width } : null,
      pieces,
      marks,
      lastMove: document.querySelectorAll('.cgm-lastmove').length,
      badge: ov ? ov.querySelector('.cgm-badge').textContent : '',
    };
  });

async function testChesscom(context) {
  console.log('chess.com board (white at the bottom)');
  const page = await context.newPage();
  await page.route('https://www.chess.com/**', (route) => route.fulfill({ contentType: 'text/html', body: CHESSCOM_PAGE }));
  await page.goto('https://www.chess.com/play/online');
  await page.waitForTimeout(300);

  const hiddenOf = (sel) => page.evaluate((s) => getComputedStyle(document.querySelector(s)).visibility, sel);

  // 1. Right-drag my pawn e2 -> e4.
  await rightDrag(page, 'e2', 'e4', false);
  let st = await overlayState(page);
  check(st.visible, 'overlay shows after a right-drag');
  check(st.rect && st.rect.left === '100px' && st.rect.top === '100px' && st.rect.width === '400px', 'overlay sits exactly over the board');
  check(st.pieces.length === 1 && st.pieces[0].left === '50%' && st.pieces[0].top === '50%', 'scratch pawn drawn on e4');
  check(st.pieces[0] && st.pieces[0].hasImage, "scratch pawn reuses the site's piece image");
  check((await hiddenOf('.piece.wp.square-52')) === 'hidden', 'real pawn on e2 is hidden');
  check(st.lastMove === 2, 'from and to squares of the last scratch move are highlighted');
  check(st.badge.startsWith('Scratch line: 1 move'), 'badge reads 1 move: ' + JSON.stringify(st.badge));

  // 2. Right-drag the opponent's knight b8 -> c6 while the scratch line is open.
  await rightDrag(page, 'b8', 'c6', false);
  st = await overlayState(page);
  check(st.pieces.length === 2, "opponent's knight moved on the scratch board too");
  check(st.pieces.some((p) => p.left === '25%' && p.top === '25%'), 'scratch knight drawn on c6');
  check((await hiddenOf('.piece.bn.square-28')) === 'hidden', 'real knight on b8 is hidden');
  check(st.badge.startsWith('Scratch line: 2 moves'), 'badge reads 2 moves');

  // 3. Capture: the scratch pawn on e4 takes the pawn on d7 (no legality check).
  await rightDrag(page, 'e4', 'd7', false);
  st = await overlayState(page);
  check(st.pieces.some((p) => p.left === '37.5%' && p.top === '12.5%'), 'capturing pawn drawn on d7');
  check(!st.pieces.some((p) => p.left === '50%' && p.top === '50%'), 'e4 is empty again');
  check((await hiddenOf('.piece.bp.square-47')) === 'hidden', 'captured real pawn on d7 is hidden');

  // 4. Double right-click marks d5 red; a second double click clears it.
  await doubleRightClick(page, 'd5', false);
  st = await overlayState(page);
  check(st.marks.length === 1 && st.marks[0].left === '37.5%' && st.marks[0].top === '37.5%', 'double right-click marks d5');
  await doubleRightClick(page, 'd5', false);
  st = await overlayState(page);
  check(st.marks.length === 0, 'double right-click again clears the mark');
  await doubleRightClick(page, 'd5', false);

  // 5. The site never saw any right-button activity, but left clicks still get through.
  const right = await page.evaluate(() => window.__right);
  check(Object.values(right).every((n) => n === 0), 'site received no right-button events: ' + JSON.stringify(right));
  const e2 = center('e2', false);
  await page.mouse.click(e2.x, e2.y);
  check((await page.evaluate(() => window.__left)) === 1, 'left click still reaches the board');

  // 6. Escape resets everything.
  await page.keyboard.press('Escape');
  st = await overlayState(page);
  check(!st.visible && st.pieces.length === 0 && st.marks.length === 0, 'Escape clears the scratch line and the marks');
  check((await hiddenOf('.piece.wp.square-52')) === 'visible', 'real pawn is visible again after Escape');

  // 7. A real move on the live board (the opponent moved) resets the scratch line.
  await rightDrag(page, 'e2', 'e4', false);
  await doubleRightClick(page, 'h5', false);
  st = await overlayState(page);
  check(st.pieces.length === 1 && st.marks.length === 1, 'scratch line and mark set up before the live move');
  await page.evaluate(() => {
    const p = document.querySelector('.piece.bp.square-47');
    p.classList.replace('square-47', 'square-45');
  });
  await page.waitForTimeout(150);
  st = await overlayState(page);
  check(!st.visible && st.pieces.length === 0 && st.marks.length === 0, 'live move resets the scratch line and the marks');
  check((await hiddenOf('.piece.wp.square-52')) === 'visible', 'hidden pieces restored after the live move');

  // 8. Dragging from an empty square does nothing.
  await rightDrag(page, 'a4', 'a5', false);
  st = await overlayState(page);
  check(!st.visible && st.pieces.length === 0, 'right-drag from an empty square leaves nothing behind');

  await page.close();
}

async function testLichess(context) {
  console.log('lichess board (black at the bottom)');
  const page = await context.newPage();
  await page.route('https://lichess.org/**', (route) => route.fulfill({ contentType: 'text/html', body: LICHESS_PAGE }));
  await page.goto('https://lichess.org/abcdefgh');
  await page.waitForTimeout(300);

  // Black pawn e7 -> e5, dragged from black's side of the board.
  await rightDrag(page, 'e7', 'e5', true);
  let st = await overlayState(page);
  check(st.visible, 'overlay shows after a right-drag');
  // e5 from black's view: column 3, row 4
  check(st.pieces.length === 1 && st.pieces[0].left === '37.5%' && st.pieces[0].top === '50%', 'scratch pawn drawn on e5 in flipped orientation');
  check(st.pieces[0] && st.pieces[0].hasImage, "scratch pawn reuses lichess's piece image");
  const hidden = await page.evaluate(() => getComputedStyle(document.querySelector('piece.black.pawn')).visibility);
  check(hidden === 'hidden', 'real black pawn is hidden');

  // White pawn e2 -> e4 too, from the same side.
  await rightDrag(page, 'e2', 'e4', true);
  st = await overlayState(page);
  // e4 from black's view: column 3, row 3
  check(st.pieces.length === 2 && st.pieces.some((p) => p.left === '37.5%' && p.top === '37.5%'), 'white pawn drawn on e4 in flipped orientation');

  await doubleRightClick(page, 'd4', true);
  st = await overlayState(page);
  // d4 from black's view: column 4, row 3
  check(st.marks.length === 1 && st.marks[0].left === '50%' && st.marks[0].top === '37.5%', 'double right-click marks d4 in flipped orientation');

  const right = await page.evaluate(() => window.__right);
  check(Object.values(right).every((n) => n === 0), 'lichess board received no right-button events: ' + JSON.stringify(right));

  // chessground moves a piece by changing its transform.
  await page.evaluate(() => {
    document.querySelector('piece.white.pawn').style.transform = 'translate(150px, 150px)';
  });
  await page.waitForTimeout(150);
  st = await overlayState(page);
  check(!st.visible && st.pieces.length === 0 && st.marks.length === 0, 'live move on lichess resets everything');

  await page.close();
}

(async () => {
  fs.rmSync(PROFILE, { recursive: true, force: true });
  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  try {
    await testChesscom(context);
    await testLichess(context);
  } finally {
    await context.close();
    fs.rmSync(PROFILE, { recursive: true, force: true });
  }
  console.log(failures === 0 ? '\nall end-to-end checks passed' : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
