#!/usr/bin/env sh
# Chess GM launcher for macOS and Linux. Opens a Chromium-based browser with
# the extension loaded from this folder, using a separate profile so it does
# not interfere with your normal browser windows.
set -e

EXT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_DIR="$EXT_DIR/.profile"
BROWSER="${CHESS_GM_BROWSER:-}"
BRANDED_CHROME=""

find_browser() {
  for c in "$@"; do
    if [ -x "$c" ]; then printf '%s' "$c"; return 0; fi
    if command -v "$c" >/dev/null 2>&1; then command -v "$c"; return 0; fi
  done
  return 1
}

# Google Chrome 137 and newer ignore --load-extension, so browsers that still
# honor it are tried first. Set CHESS_GM_BROWSER to force a specific binary.
if [ -z "$BROWSER" ]; then
  BROWSER="$(find_browser \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
    chromium chromium-browser brave-browser brave microsoft-edge microsoft-edge-stable || true)"
fi
if [ -z "$BROWSER" ]; then
  BROWSER="$(find_browser \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    google-chrome google-chrome-stable || true)"
  [ -n "$BROWSER" ] && BRANDED_CHROME=1
fi

if [ -z "$BROWSER" ]; then
  echo "Could not find Chromium, Brave, Edge, or Chrome."
  echo "Set CHESS_GM_BROWSER to your browser binary, or load the extension by hand:"
  echo "  open chrome://extensions, turn on Developer mode, click Load unpacked,"
  echo "  and pick this folder: $EXT_DIR"
  exit 1
fi

echo "Browser:   $BROWSER"
echo "Extension: $EXT_DIR"
echo "Profile:   $PROFILE_DIR"
echo

if [ -n "$BRANDED_CHROME" ]; then
  echo "Google Chrome ignores --load-extension since version 137, so the"
  echo "extensions page is opening instead. Turn on Developer mode, click"
  echo "Load unpacked, and pick this folder:"
  echo "  $EXT_DIR"
  if command -v pbcopy >/dev/null 2>&1; then printf '%s' "$EXT_DIR" | pbcopy; echo "(copied to clipboard)"; fi
  "$BROWSER" --user-data-dir="$PROFILE_DIR" --no-first-run --no-default-browser-check \
    "chrome://extensions" "https://www.chess.com/" >/dev/null 2>&1 &
else
  "$BROWSER" --user-data-dir="$PROFILE_DIR" --load-extension="$EXT_DIR" \
    --no-first-run --no-default-browser-check "https://www.chess.com/" >/dev/null 2>&1 &
  echo "If Chess GM is missing from the window that opened, load it by hand:"
  echo "  chrome://extensions, Developer mode, Load unpacked, pick $EXT_DIR"
fi
