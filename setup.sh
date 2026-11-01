#!/usr/bin/env sh
# Chess GM one-time setup for macOS and Linux.
# Opens your browser's extensions page and a file manager window so you can
# add this folder with "Load unpacked". After that the extension stays
# installed in your browser; you never need to run this again.
#   sh setup.sh

EXT_DIR="$(cd "$(dirname "$0")" && pwd)"
BROWSER="${CHESS_GM_BROWSER:-}"

find_browser() {
  for c in "$@"; do
    if [ -x "$c" ]; then printf '%s' "$c"; return 0; fi
    if command -v "$c" >/dev/null 2>&1; then command -v "$c"; return 0; fi
  done
  return 1
}

if [ -z "$BROWSER" ]; then
  BROWSER="$(find_browser \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    google-chrome google-chrome-stable brave-browser brave microsoft-edge microsoft-edge-stable \
    chromium chromium-browser || true)"
fi

echo "Chess GM folder:  $EXT_DIR"
echo

if [ -z "$BROWSER" ]; then
  echo "Could not find Chrome, Brave, Edge, or Chromium."
  echo "Chess GM needs one of them (Firefox and Safari are not supported)."
  echo
  echo "If you do have one, open it, go to  chrome://extensions , turn on"
  echo "Developer mode (top right), click Load unpacked, and pick the folder above."
  exit 1
fi

if command -v pbcopy >/dev/null 2>&1; then printf '%s' "$EXT_DIR" | pbcopy
elif command -v xclip >/dev/null 2>&1; then printf '%s' "$EXT_DIR" | xclip -selection clipboard
elif command -v wl-copy >/dev/null 2>&1; then printf '%s' "$EXT_DIR" | wl-copy
fi

"$BROWSER" "chrome://extensions" >/dev/null 2>&1 &
if command -v open >/dev/null 2>&1; then open -R "$EXT_DIR" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$(dirname "$EXT_DIR")" >/dev/null 2>&1 || true
fi

echo "Your browser's extensions page is opening. In it:"
echo
echo "  1. Turn on Developer mode (switch in the top right)"
echo "  2. Click Load unpacked"
echo "  3. Pick the Chess GM folder above (its path is on your clipboard)"
echo "     ...or drag the folder from the file manager onto the extensions page"
echo
echo "That is it. Open chess.com or lichess and right-click-drag a piece."
echo "The extension stays installed as long as this folder exists, so leave it where it is."
