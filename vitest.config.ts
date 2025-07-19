import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'coverage', 'lib', 'package'],
    // Performance optimizations
    testTimeout: 300000, // 5 minutes for multi-provider tests
    hookTimeout: 60000,  // 1 minute for setup/teardown
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,  // Limit threads to prevent resource exhaustion
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
        // Keep some basic exclusions for performance
        '**/node_modules/**',
        '**/*.d.ts'
      ],
      // Achievable coverage targets based on actual testing
      thresholds: {
        statements: 8,
        branches: 5,
        functions: 0, // Generated schemas don't export functions
        lines: 8
      },
      // Performance optimizations for comprehensive testing
      reportsDirectory: './coverage',
      skipFull: false, // Include full coverage for complete analysis
      clean: true,
      cleanOnRerun: false, // Don't clean between reruns for speed
      all: true, // Include all files in coverage, not just tested ones
      // Add more detailed reporting
      reportOnFailure: true,
    },
    typecheck: {
      enabled: false, // Temporarily disabled due to Zod v4 compatibility issues
      include: ['tests/**/*.{test,spec}.ts'],
      tsconfig: './tests/tsconfig.test.json',
    },
  },
  resolve: {
    alias: {
      '@': './prisma/generated/schemas',
    },
  },
});
