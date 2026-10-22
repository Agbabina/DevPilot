#!/usr/bin/env sh
set -eu
REPO="Agbabina/DevPilot"
INSTALL_DIR="${DEVPILOT_INSTALL_DIR:-$HOME/.local/bin}"
mkdir -p "$INSTALL_DIR"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$OS" in darwin) OS="darwin" ;; linux) OS="linux" ;; *) echo "Unsupported OS: $OS" >&2; exit 1 ;; esac
case "$ARCH" in x86_64|amd64) ARCH="amd64" ;; aarch64|arm64) ARCH="arm64" ;; *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;; esac
BINARY="$INSTALL_DIR/devpilot"
ASSET="https://github.com/$REPO/releases/latest/download/devpilot-$OS-$ARCH"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "Installing DevPilot for $OS/$ARCH..."
if curl -fsSL "$ASSET" -o "$BINARY"; then
  chmod +x "$BINARY"
else
  echo "No release binary yet; trying a source build."
  command -v go >/dev/null 2>&1 || { echo "Install Go 1.25.7+ from https://go.dev/dl/ or wait for a published release." >&2; exit 1; }
  command -v unzip >/dev/null 2>&1 || { echo "Source fallback requires unzip." >&2; exit 1; }
  curl -fsSL "https://github.com/$REPO/archive/refs/heads/main.zip" -o "$TMP/source.zip"
  mkdir "$TMP/source"
  unzip -q "$TMP/source.zip" -d "$TMP/source"
  MOD_FILE="$(find "$TMP/source" -path '*/cli/go.mod' -print -quit)"
  [ -n "$MOD_FILE" ] || { echo "Could not find cli/go.mod in source archive." >&2; exit 1; }
  CLI_DIR="$(dirname "$MOD_FILE")"
  (cd "$CLI_DIR" && go build -trimpath -o "$BINARY" .)
  chmod +x "$BINARY"
fi
case ":$PATH:" in *":$INSTALL_DIR:"*) ;; *) echo "Add to your shell profile: export PATH=\"$INSTALL_DIR:\$PATH\"" ;; esac
echo "DevPilot installed to $BINARY"
echo "Try: devpilot help"
