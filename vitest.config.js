import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'coverage', 'lib', 'package'],
    testTimeout: 300000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
    // Increase worker timeout to handle long-running tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        useAtomics: true
      }
    },
    // Add worker timeout configuration
    maxWorkers: 1,
    minWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'prisma/schemas/*/generated/**/*.ts',
        'prisma/generated/schemas/**/*.ts'
      ],
      exclude: [
        'node_modules', 
        '**/index.ts',
        '**/node_modules/**',
        '**/*.d.ts'
      ],
      thresholds: {
        statements: 8,
        branches: 5,
        functions: 0,
        lines: 8
      },
      reportsDirectory: './coverage'
    }
  },
  resolve: {
    alias: {
      '@': './prisma/generated/schemas'
    }
  }
});