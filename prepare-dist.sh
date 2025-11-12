#!/bin/bash
# Prepare dist folder for Chrome loading
# This copies manifest, assets, and static files to the dist folder

echo "📦 Preparing dist/ for Chrome extension loading..."

# Copy manifest
cp manifest.json dist/

# Copy assets
cp -r assets dist/

# Copy static files
cp content/*.css dist/content/ 2>/dev/null || true
cp content/*.html dist/content/ 2>/dev/null || true
cp options/*.html dist/options/ 2>/dev/null || true
cp popup/*.html dist/popup/ 2>/dev/null || true
cp -r config dist/ 2>/dev/null || true

echo "✅ dist/ folder is ready for Chrome loading!"
echo ""
echo "📍 Path to load in Chrome: /Users/bernardj/languagebridge-chromestore-main/dist"
echo ""
echo "Instructions:"
echo "1. Open chrome://extensions"
echo "2. Enable 'Developer mode' (top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist' folder"
