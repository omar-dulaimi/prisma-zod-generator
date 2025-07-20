import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'coverage', 'lib', 'package'],
    testTimeout: 300000,
    hookTimeout: 60000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
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
    },
    typecheck: {
      enabled: false
    }
  },
  resolve: {
    alias: {
      '@': './prisma/generated/schemas'
    }
  }
});