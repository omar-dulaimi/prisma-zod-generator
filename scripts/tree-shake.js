#!/usr/bin/env node

/**
 * Tree Shake Pro Features
 *
 * This script performs tree-shaking and minification on pro features
 * to reduce bundle size and remove unused code.
 *
 * Note: This is optional and provides minimal benefit for Node.js packages,
 * but useful for generated browser SDKs.
 */

const { rollup } = require('rollup');
const terser = require('@rollup/plugin-terser');
const path = require('path');
const fs = require('fs');

const PRO_DIR = path.join(__dirname, '../lib/pro');
const PRO_INDEX = path.join(PRO_DIR, 'index.js');

/**
 * Check if pro index exists
 */
function checkProIndex() {
  if (!fs.existsSync(PRO_INDEX)) {
    console.error(`❌ Error: Pro index not found at ${PRO_INDEX}`);
    console.error('   Run "pnpm build" first to compile TypeScript');
    process.exit(1);
  }
}

/**
 * Tree shake and minify
 */
async function treeShake() {
  console.log('\n🌲 PZG Pro Tree Shaking\n');

  const startTime = Date.now();

  try {
    // Get original size
    const originalCode = fs.readFileSync(PRO_INDEX, 'utf8');
    const originalSize = Buffer.byteLength(originalCode, 'utf8');

    console.log(`📊 Original size: ${(originalSize / 1024).toFixed(1)}KB`);
    console.log('⚙️  Running rollup with terser...\n');

    // Bundle with rollup
    const bundle = await rollup({
      input: PRO_INDEX,
      external: (id) => {
        // Don't bundle node_modules or Node.js built-ins
        return (
          id.includes('node_modules') ||
          (!id.startsWith('.') && !id.startsWith('/') && !id.startsWith(PRO_DIR))
        );
      },
    });

    // Write minified output
    const { output } = await bundle.generate({
      format: 'cjs',
      exports: 'auto',
      plugins: [
        terser({
          compress: {
            dead_code: true,
            unused: true,
            drop_debugger: true,
            drop_console: false, // Keep console for debugging
            passes: 2,
          },
          mangle: {
            reserved: ['require', 'exports', 'module'],
          },
          format: {
            comments: false,
          },
        }),
      ],
    });

    // Get minified code
    const minifiedCode = output[0].code;
    const minifiedSize = Buffer.byteLength(minifiedCode, 'utf8');

    // Calculate savings
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

    console.log(`✅ Minified size: ${(minifiedSize / 1024).toFixed(1)}KB`);
    console.log(`💾 Size reduction: ${savings}%`);

    // Write minified file (optional - for inspection)
    const minifiedPath = PRO_INDEX.replace('.js', '.min.js');
    fs.writeFileSync(minifiedPath, minifiedCode, 'utf8');
    console.log(`📝 Minified file: ${path.relative(process.cwd(), minifiedPath)}`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Completed in ${duration}s\n`);

    return {
      originalSize,
      minifiedSize,
      savings,
    };
  } catch (error) {
    console.error('❌ Error during tree shaking:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  checkProIndex();
  await treeShake();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { treeShake };
