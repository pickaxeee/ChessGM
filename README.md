# Chess GM

A Chrome extension for **chess.com** and **lichess.org** that lets you think
with your hands while you wait for your opponent.

After you make a move, right-click and drag pieces on the live board to play
out a line. Move your pieces, move your opponent's pieces, capture, step back
and forward with the arrow keys. Nothing is sent to the site. It is a scratch
copy drawn on top of the real board, and it vanishes the moment your opponent
actually moves (or you do).

## Controls

| Action | What happens |
| --- | --- |
| Right-click and drag a piece | Moves it on the scratch board. Any piece, either color, no legality check. Captures replace the captured piece. A pawn reaching the last rank becomes a queen. |
| Left arrow | Undoes the last scratch move. |
| Right arrow | Redoes a scratch move you undid. Making a new move after an undo drops the old redo branch. |
| Double right-click a square | Marks it red, like chess.com's highlight. Double right-click again to clear it. |
| Esc | Clears the scratch line and all marks. |
| Opponent moves (or you move) | Everything resets to the real position. |
| Left-click | Untouched. You play your real moves exactly as before. |

While a scratch line is open, the arrow keys belong to it, so the site's own
move-list navigation is paused until you press Esc or the line resets. The
arrows still work normally inside the chat box and other text fields.

Right-click arrows are replaced by scratch moves, so the site's arrow drawing
and single right-click highlight are off while the extension is active on the
board. Everywhere else on the page, right-click works normally.

A small badge in the corner of the board shows how many scratch moves you have
played and which keys are available. The from and to squares of the latest
scratch move are tinted.

## Install

You need a Chromium-based browser: Google Chrome, Brave, Microsoft Edge, or
Chromium. Edge is already on every Windows PC, so you probably have one.
Firefox and Safari are not supported.

Installing is two steps: get the files, then add the folder to your browser
once with **Load unpacked**. After that the extension stays installed and
there is nothing to launch; just open chess.com.

### Windows

Open CMD and paste this one line:

```bat
curl -L -o "%TEMP%\chessgm.zip" https://github.com/pickaxeee/ChessGM/archive/refs/heads/main.zip && tar -xf "%TEMP%\chessgm.zip" -C "%LocalAppData%" && "%LocalAppData%\ChessGM-main\setup.bat"
```

If your terminal is PowerShell instead of CMD, paste this one:

```powershell
curl.exe -L -o "$env:TEMP\chessgm.zip" https://github.com/pickaxeee/ChessGM/archive/refs/heads/main.zip; tar -xf "$env:TEMP\chessgm.zip" -C $env:LOCALAPPDATA; & "$env:LOCALAPPDATA\ChessGM-main\setup.bat"
```

Both use only tools built into Windows 10 and 11 (`curl` and `tar`). They
download the code into `%LocalAppData%\ChessGM-main` and run `setup.bat`,
which opens two windows: your browser's extensions page and a File Explorer
window with the Chess GM folder selected. In the browser:

1. Turn on **Developer mode** (switch in the top right).
2. Click **Load unpacked**.
3. Paste the folder path (it is already on your clipboard, so Ctrl+V) and
   click **Select Folder**. Or drag the `ChessGM-main` folder from the
   Explorer window onto the extensions page.

Open chess.com or lichess and right-click-drag a piece. Done.

### macOS and Linux

Open a terminal and paste:

```bash
curl -fsSL https://raw.githubusercontent.com/pickaxeee/ChessGM/main/install.sh | sh
```

It downloads the code into `~/.chessgm` and runs `setup.sh`, which opens your
browser's extensions page and a Finder or file manager window. Then the same
three steps: Developer mode, Load unpacked, pick the folder (its path is on
your clipboard). Set `CHESS_GM_HOME` first to install somewhere else.

### Updating

Paste the same install command again. It replaces the files in place. Then go
to `chrome://extensions` and click the reload icon on the Chess GM card, or
restart the browser.

### Uninstalling

Click **Remove** on the Chess GM card in `chrome://extensions`, then delete
the folder.

### By hand, without the terminal

1. On the repo page, click the green **Code** button, then **Download ZIP**.
2. Right-click the downloaded `ChessGM-main.zip` and choose **Extract All**.
3. Double-click `setup.bat` inside the extracted folder (Mac: run
   `sh setup.sh` in a terminal), or skip it and go straight to
   `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**,
   and pick the `ChessGM-main` folder.

Keep the folder where it is. The browser loads the extension from it every
time it starts, so deleting or moving the folder removes the extension.

## Troubleshooting

**Windows Security said "Threats found" after running an earlier version**
The first installer launched the browser from a script with the
`--load-extension` flag, a separate profile, and a Start menu shortcut. That
is the exact pattern the ChromeLoader malware family uses to sideload
extensions, so Defender flagged it. This version does none of that: the
extension is added through the browser's own Load unpacked, which Defender
does not object to. Open **Windows Security**, then **Protection history**, to
see what was quarantined; if it is a file inside a ChessGM folder you can
remove it and run the current install command. Do not turn Defender off for
this.

**"Windows cannot find ..." or "is not recognized" after pasting the command**
Make sure you pasted the whole line into CMD, not PowerShell (or use the
PowerShell variant). The line starts with `curl` and ends with `setup.bat"`.

**Nothing happens when I double-click `setup.bat`, or a window flashes by**
Open CMD, `cd` into the extracted folder, and type `setup.bat` so you can read
its output. If it cannot find a browser, add the folder by hand through
`chrome://extensions` as described above.

**The extension card shows an error after an update**
Click the reload icon on the card. If the error stays, click **Remove** and
load the folder again.

**A popup says "Disable developer mode extensions"**
Chrome shows this on every start for unpacked extensions. Click the X or
**Cancel**. The extension keeps working.

**Right-drag does nothing**
Make sure you are on a game page (the board must be visible), then reload the
page once. The extension only runs on chess.com and lichess.org. If the site
changed its board markup, open an issue with the page URL.

**Arrow keys stopped moving through the game's move list**
A scratch line is open and has taken the arrows. Press Esc to close it.

## How it works

- `src/core.js` is pure logic: square math for both board orientations,
  position parsing, scratch moves, the undo/redo history, and the double-click
  detector. It has no DOM access and is covered by the unit tests.
- `src/adapters.js` knows each site's board markup: how to find the live
  board, read the pieces, tell which way the board is facing, and borrow the
  site's piece images so scratch pieces match your theme.
- `src/content.js` runs at `document_start` so its window-level listeners
  come before the site's. It swallows right-button events over the board,
  keeps the scratch history, hides the real pieces that the scratch line
  moved, and draws the scratch pieces and marks on a `pointer-events: none`
  overlay. A `MutationObserver` on the board resets everything when the real
  position changes.

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
pages that use each site's real board markup, and drives the mouse and
keyboard through scratch moves, captures, undo and redo, marks, Escape, and a
live move on both board orientations.

## Fair play

This is a visualization aid, not an engine, and it never makes a move for
you. Still, moving pieces around during a live game counts as "using an
analysis board" under some sites' rules. Check the fair play policy of the
site you play on and use this where it is allowed, such as casual games,
training, and reviewing positions. You are responsible for how you use it.

## Not yet

- Touch and pen input
- Arrows (right-drag is taken by scratch moves)
