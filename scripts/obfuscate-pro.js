#!/usr/bin/env node

/**
 * Obfuscate Pro Features
 *
 * This script obfuscates the compiled pro features to protect intellectual property.
 * Uses medium-level obfuscation to balance protection and performance.
 */

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const PRO_DIR = path.join(__dirname, '../lib/pro');

/**
 * Obfuscation configuration
 * Medium preset: balances protection with performance and debuggability
 */
const OBFUSCATION_CONFIG = {
  // General
  compact: true,
  simplify: true,

  // Control flow flattening
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,

  // Dead code injection (disabled for performance)
  deadCodeInjection: false,
  deadCodeInjectionThreshold: 0,

  // String array
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,

  // Identifiers
  identifierNamesGenerator: 'hexadecimal',
  identifiersPrefix: 'pzg_',
  renameGlobals: false,
  renameProperties: false,

  // Self defending (disabled for Node.js compatibility)
  selfDefending: false,

  // Target
  target: 'node',

  // Source maps (disabled for production)
  sourceMap: false,
  sourceMapMode: 'separate',

  // Transformers
  transformObjectKeys: true,
  unicodeEscapeSequence: false,

  // Debugging
  disableConsoleOutput: false,
  debugProtection: false,
  debugProtectionInterval: 0,

  // Options
  ignoreImports: true,
  numbersToExpressions: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
};

/**
 * Check if pro directory exists
 */
function checkProDirectory() {
  if (!fs.existsSync(PRO_DIR)) {
    console.error(`❌ Error: Pro directory not found at ${PRO_DIR}`);
    console.error('   Run "pnpm build" first to compile TypeScript');
    process.exit(1);
  }
}

/**
 * Get all JavaScript files in pro directory
 */
function getProFiles() {
  const pattern = path.join(PRO_DIR, '**/*.js').replace(/\\/g, '/');
  const files = glob.sync(pattern, {
    ignore: ['**/*.min.js', '**/*.obfuscated.js', '**/node_modules/**'],
  });

  if (files.length === 0) {
    console.warn('⚠️  Warning: No JavaScript files found in pro directory');
  }

  return files;
}

/**
 * Obfuscate a single file
 */
function obfuscateFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');

    // Skip if file is already obfuscated
    if (code.includes('pzg_0x')) {
      console.log(`⏭️  Skipping already obfuscated: ${path.relative(process.cwd(), filePath)}`);
      return;
    }

    console.log(`🔒 Obfuscating: ${path.relative(process.cwd(), filePath)}`);

    const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_CONFIG);
    fs.writeFileSync(filePath, obfuscated.getObfuscatedCode(), 'utf8');

    const originalSize = Buffer.byteLength(code, 'utf8');
    const obfuscatedSize = Buffer.byteLength(obfuscated.getObfuscatedCode(), 'utf8');
    const sizeIncrease = ((obfuscatedSize / originalSize - 1) * 100).toFixed(1);

    console.log(
      `   ✓ ${(originalSize / 1024).toFixed(1)}KB → ${(obfuscatedSize / 1024).toFixed(1)}KB (+${sizeIncrease}%)`,
    );
  } catch (error) {
    console.error(`❌ Error obfuscating ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('\n🔐 PZG Pro Features Obfuscation\n');
  console.log('Configuration: Medium-level protection (balanced)');
  console.log('Target: Node.js\n');

  const startTime = Date.now();

  // Check pro directory exists
  checkProDirectory();

  // Get all pro files
  const files = getProFiles();
  console.log(`Found ${files.length} JavaScript files to obfuscate\n`);

  // Obfuscate each file
  files.forEach(obfuscateFile);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Obfuscation complete in ${duration}s`);
  console.log('\nPro features are now protected with:');
  console.log('  • String array encoding (base64)');
  console.log('  • Control flow flattening (50% threshold)');
  console.log('  • Identifier mangling (hexadecimal)');
  console.log('  • Object keys transformation');
  console.log('  • String splitting and rotation\n');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { obfuscateFile, OBFUSCATION_CONFIG };
