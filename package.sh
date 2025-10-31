#!/bin/bash
set -e  # Exit on error

START_TIME=$SECONDS

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   PZG Package Build (with Pro)         ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Verify submodule
echo "🔍 Step 1/6: Verifying pro submodule..."
if [ ! -e "src/pro/.git" ]; then
  echo "❌ Error: Pro submodule not initialized"
  echo "   Run: git submodule update --init --recursive"
  exit 1
fi

# Check if submodule has content
if [ ! -f "src/pro/index.ts" ]; then
  echo "❌ Error: Pro submodule is empty"
  echo "   Run: git submodule update --init --recursive"
  exit 1
fi

echo "✅ Pro submodule verified"
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
echo "🔒 Step 4/6: Obfuscating pro features..."
node scripts/obfuscate-pro.js
if [ $? -ne 0 ]; then
  echo "❌ Obfuscation failed"
  exit 1
fi
echo ""

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
CORE_SIZE=$(du -sh package/lib --exclude=package/lib/pro 2>/dev/null | cut -f1 || echo "N/A")
PRO_SIZE=$(du -sh package/lib/pro 2>/dev/null | cut -f1 || echo "N/A")
TOTAL_SIZE=$(du -sh package/lib 2>/dev/null | cut -f1 || echo "N/A")

echo "   Core features: $CORE_SIZE"
echo "   Pro features:  $PRO_SIZE (obfuscated)"
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
