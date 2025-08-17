import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'coverage', 'lib', 'package'],
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['prisma/schemas/*/generated/**/*.ts', 'prisma/generated/schemas/**/*.ts'],
      exclude: ['node_modules', '**/index.ts', '**/node_modules/**', '**/*.d.ts'],
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
