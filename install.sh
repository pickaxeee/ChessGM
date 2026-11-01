#!/usr/bin/env sh
# Chess GM installer for macOS and Linux.
#
# Paste this into a terminal:
#   curl -fsSL https://raw.githubusercontent.com/pickaxeee/ChessGM/main/install.sh | sh
#
# It downloads the latest code into ~/.chessgm and runs the one-time setup,
# which opens your browser's extensions page so you can add the folder with
# "Load unpacked". Run the same command again to update the files (then click
# the reload icon on the Chess GM card in chrome://extensions).
# Set CHESS_GM_HOME to install somewhere else.
set -e

REPO="pickaxeee/ChessGM"
BRANCH="main"
DEST="${CHESS_GM_HOME:-$HOME/.chessgm}"
URL="${CHESS_GM_ARCHIVE_URL:-https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz}"

TMP="$(mktemp -d 2>/dev/null || mktemp -d -t chessgm)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading Chess GM from $URL ..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL" -o "$TMP/chessgm.tar.gz"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP/chessgm.tar.gz" "$URL"
else
  echo "This installer needs curl or wget."
  exit 1
fi

mkdir -p "$TMP/x"
tar -xzf "$TMP/chessgm.tar.gz" -C "$TMP/x"
SRC="$(find "$TMP/x" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [ -z "$SRC" ] || [ ! -f "$SRC/manifest.json" ]; then
  echo "The downloaded archive did not contain the extension."
  exit 1
fi

mkdir -p "$DEST"
rm -rf "$DEST"/* "$DEST"/.[!.]* 2>/dev/null || true
cp -R "$SRC"/. "$DEST"/
chmod +x "$DEST/setup.sh"

echo "Installed to $DEST"
echo "Re-run the install command any time to update."
echo

exec sh "$DEST/setup.sh"
