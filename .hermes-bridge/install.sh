#!/bin/sh
set -eu

HOME_DIR="/home/hermes"
BIN_DIR="$HOME_DIR/.local/bin"
UNIT_DIR="$HOME_DIR/.config/systemd/user"
WORKER="$BIN_DIR/hermes-cssguru-bridge.py"
BASE_URL="https://raw.githubusercontent.com/mobeats/cssguru/hermes/bridge-setup/.hermes-bridge"

if [ "$(id -un)" != "hermes" ]; then
  echo "Bitte als Benutzer hermes ausführen (nicht mit sudo)." >&2
  exit 1
fi

for tool in gh hermes python3 curl systemctl; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "Fehlt: $tool" >&2
    exit 1
  }
done

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI ist nicht angemeldet. Bitte zuerst gh auth login ausführen." >&2
  exit 1
fi

# Configure Git HTTPS operations to use the authenticated gh account.
gh auth setup-git

if [ ! -d "$HOME_DIR/projects/cssguru/.git" ]; then
  echo "CSSGuru fehlt unter $HOME_DIR/projects/cssguru." >&2
  exit 1
fi

mkdir -p "$BIN_DIR" "$UNIT_DIR"
curl -fsSL "$BASE_URL/worker.py" -o "$WORKER"
chmod 700 "$WORKER"

PYTHON_BIN="$(command -v python3)"
HERMES_DIR="$(dirname "$(command -v hermes)")"

cat > "$UNIT_DIR/hermes-cssguru-bridge.service" <<EOF
[Unit]
Description=Hermes CSSGuru GitHub task bridge (beta)

[Service]
Type=simple
WorkingDirectory=/home/hermes/projects/cssguru
Environment=HOME=/home/hermes
Environment=PATH=$HERMES_DIR:/home/hermes/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$PYTHON_BIN $WORKER
Restart=always
RestartSec=30

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now hermes-cssguru-bridge.service

echo
echo "Hermes CSSGuru Bridge wurde installiert."
echo "Status prüfen: systemctl --user status hermes-cssguru-bridge"
echo "Logs ansehen:  journalctl --user -u hermes-cssguru-bridge -f"
