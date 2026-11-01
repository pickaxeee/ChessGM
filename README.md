# Chess GM

A Chrome extension for **chess.com** and **lichess.org** that lets you think
with your hands while you wait for your opponent.

After you make a move, right-click and drag pieces on the live board to play
out a line. Move your pieces, move your opponent's pieces, capture, whatever
you want to look at. Nothing is sent to the site. It is a scratch copy drawn
on top of the real board, and it vanishes the moment your opponent actually
moves (or you do).

## Controls

| Action | What happens |
| --- | --- |
| Right-click and drag a piece | Moves it on the scratch board. Any piece, either color, no legality check. Captures replace the captured piece. A pawn reaching the last rank becomes a queen. |
| Double right-click a square | Marks it red, like chess.com's highlight. Double right-click again to clear it. |
| Esc | Clears the scratch line and all marks. |
| Opponent moves (or you move) | Everything resets to the real position. |
| Left-click | Untouched. You play your real moves exactly as before. |

Right-click arrows are replaced by this, so the site's arrow drawing and
single right-click highlight are off while the extension is active on the
board. Everywhere else on the page, right-click works normally.

A small badge in the corner of the board shows how many scratch moves you have
played, and the from and to squares of the latest one are tinted.

## Install

### Option 1: run it from the command line

Clone or download this repo, then:

```bat
start.bat
```

on Windows, or

```bash
./start.sh
```

on macOS and Linux. The script opens a Chromium-based browser with the
extension loaded, using its own profile folder (`.profile/` inside the repo)
so it does not touch your normal browser. Sign in to chess.com or lichess in
that window once and you are set.

It looks for Chromium, Brave, and Edge first, then Google Chrome. Set the
`CHESS_GM_BROWSER` environment variable to a browser executable to override
the choice.

**Google Chrome 137 and newer ignore the `--load-extension` flag**, so if
Chrome is the only browser found, the script opens `chrome://extensions`
instead and copies the extension folder path to your clipboard. Turn on
Developer mode, click **Load unpacked**, and paste the path.

### Option 2: load it by hand

1. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.
4. Open a game on chess.com or lichess.

## How it works

- `src/core.js` is pure logic: square math for both board orientations,
  position parsing, scratch moves, and the double-click detector. It has no
  DOM access and is covered by the unit tests.
- `src/adapters.js` knows each site's board markup: how to find the live
  board, read the pieces, tell which way the board is facing, and borrow the
  site's piece images so scratch pieces match your theme.
- `src/content.js` runs at `document_start` so its window-level listeners
  come before the site's. It swallows right-button events over the board,
  keeps a scratch position, hides the real pieces that the scratch line moved,
  and draws the scratch pieces and marks on a `pointer-events: none` overlay.
  A `MutationObserver` on the board resets everything when the real position
  changes.

The extension requests no permissions beyond running on the two sites. It has
no background worker, no network access, and stores nothing.

## Development

```bash
npm test
```

runs the unit tests with Node's built-in test runner (Node 18 or newer, no
dependencies).

```bash
npm i -D playwright && npx playwright install chromium
npm run test:e2e
```

loads the extension into Chromium, serves stand-in chess.com and lichess
pages that use each site's real board markup, and drives the mouse through
scratch moves, captures, marks, Escape, and a live move on both board
orientations.

## Fair play

This is a visualization aid, not an engine, and it never makes a move for
you. Still, moving pieces around during a live game is "using an analysis
board" under some sites' rules. Check the fair play policy of the site you
play on and use this where it is allowed, such as casual games, training, and
reviewing positions. You are responsible for how you use it.

## Not yet

- Touch and pen input
- Arrows (right-drag is taken by scratch moves)
- Keyboard shortcuts for undoing a single scratch move
