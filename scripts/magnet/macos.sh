#!/usr/bin/env bash

APPS_DIR="$HOME/Applications"
APP_NAME="WindskyeMagnetHandler.app"
APP_PATH="$APPS_DIR/$APP_NAME"
TMP_SCRIPT="/tmp/windskye-magnet.applescript"

mkdir -p "$APPS_DIR" || { echo "Failed to create $APPS_DIR. Please check your permissions."; exit 1; }

cat <<EOF > "$TMP_SCRIPT" || { echo "Failed to write to temporary file. Please check your permissions."; exit 1; }
on open location this_URL
  tell application "Terminal"
    do script "windskye " & quoted form of this_URL
    activate
  end tell
end open location
EOF

echo "Compiling AppleScript application..."
osacompile -o "$APP_PATH" "$TMP_SCRIPT" || { echo "Failed to compile AppleScript. Please check your permissions."; rm -f "$TMP_SCRIPT"; exit 1; }
rm -f "$TMP_SCRIPT"

INFO_PLIST="$APP_PATH/Contents/Info.plist"

echo "Updating Info.plist..."
perl -pi -e 's/<\/dict>\s*<\/plist>/<key>CFBundleURLTypes<\/key><array><dict><key>CFBundleURLName<\/key><string>Magnet Link<\/string><key>CFBundleURLSchemes<\/key><array><string>magnet<\/string><\/array><\/dict><\/array><\/dict><\/plist>/g' "$INFO_PLIST" || { echo "Failed to update Info.plist. Please check your permissions."; exit 1; }

echo "Registering with LaunchServices..."
/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -f "$APP_PATH" || echo "Warning: lsregister command failed. You may need to open the app manually once to register it."

echo "Registered Windskye as magnet handler for macOS."
