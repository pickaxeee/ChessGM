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

## Install in one command

You need a Chromium-based browser: Chromium, Brave, Microsoft Edge, or Google
Chrome. Edge is already on every Windows PC, so you probably have one.

**Windows.** Open CMD (or PowerShell) and paste:

```bat
powershell -c "irm https://raw.githubusercontent.com/pickaxeee/ChessGM/main/install.ps1 | iex"
```

**macOS and Linux.** Open a terminal and paste:

```bash
curl -fsSL https://raw.githubusercontent.com/pickaxeee/ChessGM/main/install.sh | sh
```

What it does:

- Downloads the latest code into `%LocalAppData%\ChessGM` on Windows or
  `~/.chessgm` on Mac and Linux. Nothing else on your PC is touched.
- On Windows, adds a **Chess GM** entry to the Start menu so next time you can
  launch it without a terminal.
- Launches it right away: a browser window opens on chess.com with the
  extension loaded. Sign in once in that window (it has its own profile) and
  play. See the Google Chrome note below if the window opens on the
  extensions page instead.

Next time, search the Start menu for "Chess GM", or run
`%LocalAppData%\ChessGM\run.bat` (Windows) or `sh ~/.chessgm/run.sh` (Mac and
Linux). Paste the install command again whenever you want the latest version;
your sign-in is kept.

To uninstall, delete that folder and the Start menu shortcut.

**If the browser that opened is Google Chrome:** Chrome 137 and newer refuse
to load extensions from the command line, so the launcher opens Chrome's
extensions page instead and copies the folder path to your clipboard. In that
window, turn on **Developer mode** (top right), click **Load unpacked**, paste
the path into the folder box, and click **Select Folder**. Then switch to the
chess.com tab. You only do this once per profile.

If you would rather read a script before running it, both installers are in
this repo: `install.ps1` and `install.sh`. They are short.

## Install by hand on Windows

**1. Get the files.**
On the repo page, click the green **Code** button, then **Download ZIP**.
Or, if you have git:

```bat
git clone https://github.com/pickaxeee/ChessGM.git
```

**2. Unzip.**
Right-click the downloaded `ChessGM-main.zip` and choose **Extract All**.
You get a folder named `ChessGM-main`. Open it. You should see `run.bat`,
`manifest.json`, and a `src` folder inside.

**3. Run `run.bat`.**
Double-click `run.bat` in that folder. A black window appears with a few
lines of text, and a browser window opens on chess.com.

If you would rather use CMD, open CMD, go to the folder, and type the file
name:

```bat
cd /d "C:\Users\you\Downloads\ChessGM-main"
```

```bat
run.bat
```

Type `run.bat` exactly, not `run .bat`, and not `start run.bat` (Windows'
`start` command is unrelated and will complain it cannot find the file).

If Windows shows "Windows protected your PC", click **More info**, then
**Run anyway**. That is SmartScreen reacting to a script downloaded from the
internet. You can read the script first: it is plain text.

**4. Sign in and play.**
The browser window that opens has its own profile, stored in a `.profile`
folder inside `ChessGM-main`, so you need to sign in to chess.com or lichess
in it once. Start a game and right-click-drag a piece to try it. Close that
window when you are done; next time, run `run.bat` again.

To force a specific browser, set `CHESS_GM_BROWSER` to its exe path before
running (this works for the one-command install too):

```bat
set "CHESS_GM_BROWSER=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
```

## Install by hand on macOS and Linux

Download and unzip the repo as above, or clone it. Then in a terminal:

```bash
cd ChessGM-main
```

```bash
sh run.sh
```

It finds Chromium, Brave, Edge, or Chrome and behaves exactly like the Windows
launcher, including the Chrome 137 fallback. Set `CHESS_GM_BROWSER` to a
browser binary to override the choice.

## Install in your everyday browser instead

If you would rather not use a separate browser profile, load the extension
into the browser you already use:

1. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `ChessGM-main` folder.
4. Open a game on chess.com or lichess.

Keep the folder where it is. The browser loads the extension from it every
time it starts, so deleting or moving the folder removes the extension.

## Troubleshooting

**The install command says "irm is not recognized" or "running scripts is disabled"**
Make sure you pasted the whole line, starting with `powershell -c`. If you are
already inside PowerShell, this shorter form also works:

```powershell
irm https://raw.githubusercontent.com/pickaxeee/ChessGM/main/install.ps1 | iex
```

**"Windows cannot find '.bat'"**
You typed `start .bat` or `start run.bat` in CMD, or typed into the Run
dialog. Open the extracted folder in File Explorer and double-click `run.bat`,
or in CMD `cd` into the folder and type `run.bat` by itself.

**The browser opened but there is no Chess GM extension**
That browser ignores `--load-extension` (Google Chrome 137 and newer). Follow
the "Load unpacked" steps in the Chrome note above. The `run.bat` window tells
you the exact folder path to paste.

**A popup says "Disable developer mode extensions"**
Chrome shows this on every start for unpacked extensions. Click the X or
**Cancel**. The extension keeps working.

**Right-drag does nothing**
Make sure you are on a game page (the board must be visible), then reload the
page once. The extension only runs on chess.com and lichess.org. If the site
changed its board markup, open an issue with the page URL.

**Arrow keys stopped moving through the game's move list**
A scratch line is open and has taken the arrows. Press Esc to close it.

**Nothing happens when I double-click this folder's `run.sh` on a Mac**
Finder opens `.sh` files in a text editor. Run it from Terminal with
`sh run.sh` instead.

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
