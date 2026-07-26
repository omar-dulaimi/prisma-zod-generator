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
    // Coverage of the generator itself. This used to point at the *generated
    // schemas* (`tests/multi-provider/schemas/*/generated`, `prisma/generated`)
    // with every threshold at 0, so it measured the output rather than the code
    // that produces it and could not fail — `src/` had never been measured at all.
    //
    // Note what this number can and cannot see: most of the suite exercises the
    // generator by spawning `prisma generate`, which runs `node ./lib/generator.js`
    // in a child process, and in-process V8 coverage does not observe that. So the
    // engine (transformer, generators/, prisma-generator) reads far lower here than
    // it is actually tested. `pnpm run test:coverage:full` runs the same suite under
    // c8, which does capture the child processes; that is the honest figure.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules',
        '**/node_modules/**',
        '**/*.d.ts',
        // Generated Prisma client, not our code.
        'src/dsrc/**',
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
