import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'coverage', 'lib', 'package'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['prisma/generated/schemas/**/*.ts'],
      exclude: ['node_modules', '**/index.ts'],
    },
    typecheck: {
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
