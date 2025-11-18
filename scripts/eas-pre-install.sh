#!/usr/bin/env bash
set -euo pipefail

COCOAPODS_VERSION="1.15.2"

install_with_sudo() {
  if command -v sudo >/dev/null 2>&1; then
    if sudo gem install cocoapods -v "$COCOAPODS_VERSION" --no-document; then
      echo "Installed CocoaPods with sudo"
      return 0
    fi
    echo "Failed to install CocoaPods with sudo"
  else
    echo "sudo not available"
  fi
  return 1
}

install_without_sudo() {
  if gem install cocoapods -v "$COCOAPODS_VERSION" --no-document; then
    echo "Installed CocoaPods without sudo"
    return 0
  fi
  echo "Failed to install CocoaPods without sudo"
  return 1
}

if ! install_with_sudo && ! install_without_sudo; then
  echo "Unable to install CocoaPods" >&2
  exit 1
fi

GEM_BIN_DIR="$(ruby -e 'print Gem.user_dir')/bin"
echo "Adding $GEM_BIN_DIR to PATH via BASH_ENV"
echo "export PATH=\"$GEM_BIN_DIR:$PATH\"" >> "$BASH_ENV"
