#!/usr/bin/env bash
set -e

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

CONFIG="${1:-release}"
BUILD_DIR=".build/$CONFIG"
APP_NAME="GameBeam"
BUNDLE_DIR="build/${APP_NAME}.app"
CONTENTS_DIR="${BUNDLE_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"

echo "==> Building ${APP_NAME} (${CONFIG})..."
swift build -c "$CONFIG"

echo "==> Packaging ${APP_NAME}.app..."
rm -rf "$BUNDLE_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

cp "${BUILD_DIR}/${APP_NAME}" "${MACOS_DIR}/${APP_NAME}"
chmod +x "${MACOS_DIR}/${APP_NAME}"

if [ -f "src-tauri/icons/icon.icns" ]; then
    cp "src-tauri/icons/icon.icns" "${RESOURCES_DIR}/AppIcon.icns"
fi

# Copy SPM resource bundles if present
for bundle in "${BUILD_DIR}"/*.bundle; do
    if [ -e "$bundle" ]; then
        cp -R "$bundle" "${RESOURCES_DIR}/"
    fi
done

cat << 'PLIST' > "${CONTENTS_DIR}/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>GameBeam</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.gamebeam.macos</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>GameBeam</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>14.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>
PLIST

echo "==> Ad-hoc signing ${APP_NAME}.app..."
codesign --force --deep --sign - "$BUNDLE_DIR"

echo "==> Successfully packaged ${BUNDLE_DIR}"
