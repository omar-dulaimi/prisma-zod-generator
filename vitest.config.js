/**
 * This project uses an ESM Vitest config to avoid CJS ↔ ESM interop issues.
 * Use:  vitest --config vitest.config.mjs
 * or any npm script that already passes --config vitest.config.mjs
 */
module.exports = (() => {
  throw new Error(
    'Do not use vitest.config.js. Use vitest.config.mjs with --config vitest.config.mjs instead.'
  );
})();
