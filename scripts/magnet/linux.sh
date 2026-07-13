#!/usr/bin/env bash

APPS_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$APPS_DIR/windskye.desktop"

mkdir -p "$APPS_DIR" || { echo "Failed to create $APPS_DIR. Please check your permissions."; exit 1; }

cat <<EOF > "$DESKTOP_FILE" || { echo "Failed to write to $DESKTOP_FILE. Please check your permissions."; exit 1; }
[Desktop Entry]
Version=1.0
Type=Application
Name=Windskye
GenericName=Torrent Client
Comment=Terminal-native torrent search and client
Exec=windskye "%u"
Terminal=true
Categories=Network;FileTransfer;P2P;
MimeType=x-scheme-handler/magnet;
EOF

if command -v xdg-mime >/dev/null 2>&1; then
  xdg-mime default windskye.desktop x-scheme-handler/magnet || echo "Warning: xdg-mime command failed."
else
  echo "Warning: xdg-mime not found. You may need to set the default magnet handler manually."
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPS_DIR" || echo "Warning: update-desktop-database command failed."
fi

echo "Registered Windskye as magnet handler for Linux."
