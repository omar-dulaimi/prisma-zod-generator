#!/usr/bin/env node

/**
 * Verify Build Checksums
 *
 * This script verifies that pro features are properly obfuscated
 * and generates checksums for transparency.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const LIB_DIR = path.join(__dirname, '../lib');
const PRO_DIR = path.join(LIB_DIR, 'pro');

/**
 * Calculate SHA-256 checksum of a file
 */
function calculateChecksum(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Check if file appears to be obfuscated
 */
function isObfuscated(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Obfuscation indicators
  const indicators = [
    /pzg_0x[0-9a-f]+/, // Hexadecimal identifiers
    /_0x[0-9a-f]+\(/, // String array functions
    /\\x[0-9a-f]{2}/, // Hex escape sequences
  ];

  return indicators.some((regex) => regex.test(content));
}

/**
 * Verify pro features are obfuscated
 */
function verifyProObfuscation() {
  console.log('\n🔍 Verifying Pro Feature Obfuscation\n');

  if (!fs.existsSync(PRO_DIR)) {
    console.error('❌ Error: Pro directory not found');
    return false;
  }

  const pattern = path.join(PRO_DIR, '**/*.js').replace(/\\/g, '/');
  const files = glob.sync(pattern, {
    ignore: ['**/*.min.js', '**/*.d.ts'],
  });

  if (files.length === 0) {
    console.error('❌ Error: No JavaScript files found in pro directory');
    return false;
  }

  let obfuscatedCount = 0;
  let unobfuscatedFiles = [];

  files.forEach((file) => {
    const relativePath = path.relative(process.cwd(), file);

    if (isObfuscated(file)) {
      console.log(`✅ ${relativePath}`);
      obfuscatedCount++;
    } else {
      console.log(`❌ ${relativePath} - NOT OBFUSCATED`);
      unobfuscatedFiles.push(relativePath);
    }
  });

  console.log(`\n📊 Results: ${obfuscatedCount}/${files.length} files obfuscated`);

  if (unobfuscatedFiles.length > 0) {
    console.error('\n❌ The following files are NOT obfuscated:');
    unobfuscatedFiles.forEach((file) => console.error(`   • ${file}`));
    console.error('\nRun: pnpm obfuscate:pro');
    return false;
  }

  console.log('✅ All pro features are properly obfuscated\n');
  return true;
}

/**
 * Generate checksums for all files
 */
function generateChecksums() {
  console.log('🔐 Generating Build Checksums\n');

  const checksums = {
    timestamp: new Date().toISOString(),
    core: {},
    pro: {},
  };

  // Core files
  const corePattern = path.join(LIB_DIR, '*.js').replace(/\\/g, '/');
  const coreFiles = glob.sync(corePattern);

  console.log('Core Files:');
  coreFiles.forEach((file) => {
    const relativePath = path.relative(LIB_DIR, file);
    const checksum = calculateChecksum(file);
    checksums.core[relativePath] = checksum;
    console.log(`  ${relativePath}: ${checksum.substring(0, 16)}...`);
  });

  // Pro files
  if (fs.existsSync(PRO_DIR)) {
    const proPattern = path.join(PRO_DIR, '**/*.js').replace(/\\/g, '/');
    const proFiles = glob.sync(proPattern, {
      ignore: ['**/*.min.js', '**/*.d.ts'],
    });

    console.log('\nPro Files (Obfuscated):');
    proFiles.forEach((file) => {
      const relativePath = path.relative(PRO_DIR, file);
      const checksum = calculateChecksum(file);
      checksums.pro[relativePath] = checksum;
      console.log(`  ${relativePath}: ${checksum.substring(0, 16)}...`);
    });
  }

  // Write checksums file
  const checksumsPath = path.join(LIB_DIR, 'CHECKSUMS.json');
  fs.writeFileSync(checksumsPath, JSON.stringify(checksums, null, 2));

  console.log(`\n✅ Checksums written to: ${path.relative(process.cwd(), checksumsPath)}\n`);

  return checksums;
}

/**
 * Main execution
 */
function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   PZG Build Verification               ║');
  console.log('╚════════════════════════════════════════╝');

  // Verify obfuscation
  const obfuscationValid = verifyProObfuscation();

  if (!obfuscationValid) {
    console.error('\n❌ Build verification failed\n');
    process.exit(1);
  }

  // Generate checksums
  generateChecksums();

  console.log('╔════════════════════════════════════════╗');
  console.log('║   ✅ Build verification complete       ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { calculateChecksum, isObfuscated, verifyProObfuscation, generateChecksums };
