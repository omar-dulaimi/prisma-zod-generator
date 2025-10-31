#!/bin/bash
set -e  # Exit on error

START_TIME=$SECONDS

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   PZG Package Build (with Pro)         ║"
echo "╚════════════════════════════════════════╝"
echo ""

PRO_ENABLED=true

# Step 1: Verify submodule (optional in OSS builds)
echo "🔍 Step 1/6: Verifying pro submodule..."
if [ ! -f "src/pro/index.ts" ]; then
  PRO_ENABLED=false
  echo "⚠️ Pro submodule not found. Proceeding with core-only package build."
  echo "   Run: git submodule update --init --recursive to include Pro assets."
else
  echo "✅ Pro submodule verified"
fi
echo ""

# Step 2: Clean previous build
echo "🧹 Step 2/6: Cleaning previous build..."
rm -rf lib
rm -rf package
echo "✅ Clean complete"
echo ""

# Step 3: Compile TypeScript (core + pro)
echo "📦 Step 3/6: Compiling TypeScript..."
pnpm exec tsc
if [ $? -ne 0 ]; then
  echo "❌ TypeScript compilation failed"
  exit 1
fi
echo "✅ TypeScript compiled"
echo ""

# Step 4: Obfuscate pro features
if [ "$PRO_ENABLED" = true ]; then
  echo "🔒 Step 4/6: Obfuscating pro features..."
  node scripts/obfuscate-pro.js
  if [ $? -ne 0 ]; then
    echo "❌ Obfuscation failed"
    exit 1
  fi
  echo ""
else
  echo "🔒 Step 4/6: Skipping pro obfuscation (pro submodule not present)"
fi

# Step 5: Prepare package directory
echo "📂 Step 5/6: Preparing package..."
mkdir package

# Copy files
cp -r lib package/lib
mkdir -p package/scripts
cp scripts/postinstall.js package/scripts/
cp package.json README.md LICENSE package

# Make package.json public
sed -i 's/"private": true/"private": false/' ./package/package.json

echo "✅ Package prepared"
echo ""

# Step 6: Report package size
echo "📊 Step 6/6: Package analysis..."
CORE_SIZE=$(du -sh package/lib 2>/dev/null | cut -f1 || echo "N/A")
PRO_SIZE="N/A (skipped)"
if [ "$PRO_ENABLED" = true ] && [ -d package/lib/pro ]; then
  CORE_SIZE=$(du -sh --exclude=pro package/lib 2>/dev/null | cut -f1 || echo "N/A")
  PRO_SIZE=$(du -sh package/lib/pro 2>/dev/null | cut -f1 || echo "N/A")
fi
TOTAL_SIZE=$(du -sh package/lib 2>/dev/null | cut -f1 || echo "N/A")

echo "   Core features: $CORE_SIZE"
if [ "$PRO_ENABLED" = true ] && [ "$PRO_SIZE" != "N/A (skipped)" ]; then
  echo "   Pro features:  $PRO_SIZE (obfuscated)"
else
  echo "   Pro features:  $PRO_SIZE"
fi
echo "   Total:         $TOTAL_SIZE"
echo ""

ELAPSED_TIME=$(($SECONDS - $START_TIME))
echo "╔════════════════════════════════════════╗"
echo "║  ✅ Build complete in ${ELAPSED_TIME}s              ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  • Test: cd package && pnpm publish --dry-run"
echo "  • Publish: cd package && pnpm publish"
echo ""
