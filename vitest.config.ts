import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    // Build lib/ once before workers spawn; see tests/helpers/global-setup.ts.
    globalSetup: ['./tests/helpers/global-setup.ts'],
    include: ['tests/**/*.{test,spec}.ts'],
    // '**/node_modules/**' rather than 'node_modules': the bare form only matches the
    // top-level directory, so once tests/typecheck-fixtures had its own install, vitest
    // collected third-party test files out of it — pino's and @jest/pattern's — and ran them
    // as part of this suite.
    exclude: ['**/node_modules/**', 'dist', 'coverage', 'lib', 'package'],
    testTimeout: 300000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
    // Explicit reporters configuration (Vitest v3 deprecates implicit 'basic' reporter)
    // Matches former 'basic' output minus the final summary per deprecation guidance.
    reporters: [
      [
        'default',
        {
          summary: false,
        },
      ],
    ],
    // Increase worker timeout to handle long-running tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        useAtomics: true,
      },
    },
    // Concurrency: allow overriding via env; default to parallel unless explicitly forced sequential.
    maxWorkers: process.env.VITEST_MAX_WORKERS
      ? Number(process.env.VITEST_MAX_WORKERS)
      : process.env.FEATURE_TESTS_SEQUENTIAL === '1'
        ? 1
        : undefined,
    minWorkers: process.env.VITEST_MIN_WORKERS ? Number(process.env.VITEST_MIN_WORKERS) : undefined,
    // Nothing in package.json uses this block — `test:coverage` and `test:coverage:ci` both
    // run under c8. It exists so that a bare `vitest --coverage`, typed by hand, at least
    // measures `src/` rather than the *generated schemas* it used to point at
    // (`tests/multi-provider/schemas/*/generated`, `prisma/generated`) with every threshold
    // at 0 — a configuration that measured the output instead of the code producing it and
    // could not fail.
    //
    // Do not trust the number it produces. Most of the suite exercises the generator by
    // spawning `prisma generate`, which runs `node ./lib/generator.js` in a child process,
    // and in-process V8 coverage cannot observe that — so the engine reads at a fraction of
    // how well it is actually tested. Use the scripts; see CLAUDE.md.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules',
        '**/node_modules/**',
        '**/*.d.ts',
        // Generated output, not our code — the same three directories tsconfig.json excludes
        // from compilation. `src/schemas` is written by `pnpm run gen-example`, which is CI's
        // build step, so leaving it in counted several hundred generated files at 0% there and
        // nowhere locally: a 10-point gap between the same nominal measurement on the two
        // machines, and the reason the first CI run of the coverage gate failed.
        'src/dsrc/**',
        'src/schemas/**',
        'src/generated/**',
        // Declaration modules. These are interfaces and type aliases that erase at
        // compile time, so they can only ever report 0% — measuring them says
        // nothing about how well the generator is tested.
        'src/types/**',
        'src/types.ts',
      ],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      '@': './prisma/generated/schemas',
    },
  },
});
