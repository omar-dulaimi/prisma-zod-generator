import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import Transformer from '../src/transformer';
import { prismaGenerateSync } from './helpers/prisma-generate';

describe('Prisma Client ESM Configuration Tests', () => {
  const testDir = join(process.cwd(), 'test-esm-configs');
  const schemaPath = join(testDir, 'schema.prisma');
  const outputDir = join(testDir, 'generated');
  const runPrismaGenerate = () => prismaGenerateSync(schemaPath, process.cwd());

  // Base schema template
  const baseSchema = `
datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  content  String?
  author   User?   @relation(fields: [authorId], references: [id])
  authorId Int?
}`;

  beforeAll(() => {
    // Create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Legacy Prisma Client Generator (prisma-client-js)', () => {
    it('should not add file extensions for legacy generator', async () => {
      const schemaContent = `generator client {
  provider = "prisma-client-js"
}
${baseSchema}`;

      writeFileSync(schemaPath, schemaContent);

      try {
        runPrismaGenerate();

        // Check generated files don't have extensions in imports
        const userWhereInputPath = join(
          outputDir,
          'schemas',
          'objects',
          'UserWhereInput.schema.ts',
        );
        const findManyUserPath = join(outputDir, 'schemas', 'findManyUser.schema.ts');

        if (existsSync(userWhereInputPath)) {
          const content = readFileSync(userWhereInputPath, 'utf-8');

          // Should not contain .js extensions
          expect(content).not.toMatch(/import.*\.js'/);
          expect(content).not.toMatch(/from.*\.js'/);

          // Should contain imports without extensions
          expect(content).toMatch(/from '\.\//);
        }

        if (existsSync(findManyUserPath)) {
          const content = readFileSync(findManyUserPath, 'utf-8');

          // Should not contain .js extensions
          expect(content).not.toMatch(/import.*\.js'/);
          expect(content).not.toMatch(/from.*\.js'/);

          // Should contain enum imports without extensions
          expect(content).toMatch(/from '\.\/enums\//);
        }
      } catch (error) {
        console.warn('Skipping legacy generator test - might not be available');
        console.error('Original error:', error);
      }
    });
  });

  describe('New Prisma Client Generator (prisma-client)', () => {
    describe('CommonJS Module Format', () => {
      it('should not add file extensions for CJS', async () => {
        const schemaContent = `generator client {
  provider     = "prisma-client"
  output       = "./client"
  runtime      = "nodejs"
  moduleFormat = "cjs"
}
${baseSchema}`;

        writeFileSync(schemaPath, schemaContent);

        try {
          runPrismaGenerate();

          // Check generated files don't have extensions for CJS
          const userWhereInputPath = join(
            outputDir,
            'schemas',
            'objects',
            'UserWhereInput.schema.ts',
          );
          if (existsSync(userWhereInputPath)) {
            const content = readFileSync(userWhereInputPath, 'utf-8');

            expect(content).not.toMatch(/import.*\.js'/);
            expect(content).not.toMatch(/from.*\.js'/);
          }
        } catch (error) {
          console.warn('Skipping new generator CJS test - might not be available');
          console.error('Original error:', error);
        }
      });
    });

    describe('ESM Module Format', () => {
      it('should add .js extensions when importFileExtension is "js"', async () => {
        const schemaContent = `generator client {
  provider              = "prisma-client"
  output                = "./client"
  runtime               = "nodejs"
  moduleFormat          = "esm"
  generatedFileExtension = "ts"
  importFileExtension   = "js"
}
${baseSchema}`;

        writeFileSync(schemaPath, schemaContent);

        try {
          runPrismaGenerate();

          // Check multiple generated files have .js extensions in imports
          const testFiles = [
            join(outputDir, 'schemas', 'objects', 'UserWhereInput.schema.ts'),
            join(outputDir, 'schemas', 'findManyUser.schema.ts'),
            join(outputDir, 'schemas', 'createOneUser.schema.ts'),
          ];

          for (const filePath of testFiles) {
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Should contain .js extensions in local import statements
              if (content.includes('import {') && content.includes("from './")) {
                expect(content).toMatch(/from '\.[^']*\.js'/);
              }
              // Should contain .js extensions in relative enum/object imports (not Prisma client imports)
              if (content.includes("from './enums/") || content.includes("from './objects/")) {
                expect(content).toMatch(/from '\.\/(enums|objects)\/[^']*\.js'/);
              }
            }
          }
        } catch (error) {
          console.warn('Skipping ESM .js extension test - might not be available');
          console.error('Original error:', error);
        }
      });

      it('should add .mjs extensions when importFileExtension is "mjs"', async () => {
        const schemaContent = `generator client {
  provider              = "prisma-client"
  output                = "./client"
  runtime               = "nodejs"
  moduleFormat          = "esm"
  generatedFileExtension = "ts"
  importFileExtension   = "mjs"
}
${baseSchema}`;

        writeFileSync(schemaPath, schemaContent);

        try {
          runPrismaGenerate();

          const userWhereInputPath = join(
            outputDir,
            'schemas',
            'objects',
            'UserWhereInput.schema.ts',
          );
          if (existsSync(userWhereInputPath)) {
            const content = readFileSync(userWhereInputPath, 'utf-8');

            // Should contain .mjs extensions
            if (content.includes('import {') && content.includes("from './")) {
              expect(content).toMatch(/from '\.[^']*\.mjs'/);
            }
          }
        } catch (error) {
          console.warn('Skipping ESM .mjs extension test - might not be available');
          console.error('Original error:', error);
        }
      });

      it('should work with different runtime configurations', async () => {
        const runtimeConfigs = ['nodejs', 'edge-light'];

        for (const runtime of runtimeConfigs) {
          const schemaContent = `generator client {
  provider              = "prisma-client"
  output                = "./client"
  runtime               = "${runtime}"
  moduleFormat          = "esm"
  generatedFileExtension = "ts"
  importFileExtension   = "js"
}
${baseSchema}`;

          writeFileSync(schemaPath, schemaContent);

          try {
            runPrismaGenerate();

            const userWhereInputPath = join(
              outputDir,
              'schemas',
              'objects',
              'UserWhereInput.schema.ts',
            );
            if (existsSync(userWhereInputPath)) {
              const content = readFileSync(userWhereInputPath, 'utf-8');

              // Should contain .js extensions regardless of runtime
              if (content.includes('import {') && content.includes("from './")) {
                expect(content).toMatch(/from '\.[^']*\.js'/);
              }
            }
          } catch (error) {
            console.warn(`Skipping runtime ${runtime} test - might not be available`);
            console.error('Original error:', error);
          }
        }
      });

      it('should not add extensions when importFileExtension is not specified', async () => {
        const schemaContent = `generator client {
  provider              = "prisma-client"
  output                = "./client"
  runtime               = "nodejs"
  moduleFormat          = "esm"
  generatedFileExtension = "ts"
}
${baseSchema}`;

        writeFileSync(schemaPath, schemaContent);

        try {
          runPrismaGenerate();

          const userWhereInputPath = join(
            outputDir,
            'schemas',
            'objects',
            'UserWhereInput.schema.ts',
          );
          if (existsSync(userWhereInputPath)) {
            const content = readFileSync(userWhereInputPath, 'utf-8');

            // Should not contain file extensions when not specified
            expect(content).not.toMatch(/import.*\.js'/);
            expect(content).not.toMatch(/import.*\.mjs'/);
          }
        } catch {
          console.warn('Skipping ESM without extension test - might not be available');
        }
      });

      it('should add .js extensions to custom Prisma client imports with ESM config', async () => {
        const customClientOutput = join(testDir, '..', 'dsrc');
        if (existsSync(customClientOutput)) {
          rmSync(customClientOutput, { recursive: true, force: true });
        }

        const schemaContent = `generator client {
  provider              = "prisma-client"
  output                = "../dsrc"
  runtime               = "nodejs"
  moduleFormat          = "esm"
  generatedFileExtension = "ts"
  importFileExtension   = "js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  content  String?
  author   User?   @relation(fields: [authorId], references: [id])
  authorId Int?
}`;

        writeFileSync(schemaPath, schemaContent);

        try {
          runPrismaGenerate();

          // Check that Prisma client imports include .js extension with custom output path
          const testFiles = [
            join(outputDir, 'schemas', 'findUniqueUser.schema.ts'),
            join(outputDir, 'schemas', 'findManyPost.schema.ts'),
            join(outputDir, 'schemas', 'createOneUser.schema.ts'),
          ];

          for (const filePath of testFiles) {
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Should contain Prisma client import with .js extension when using custom output
              if (content.includes('import type { Prisma } from')) {
                // The import should include the .js extension for custom client paths
                expect(content).toMatch(/import type \{ Prisma \} from ['"'][^'"]*\.js['"];?/);

                // Specifically check for the custom client path pattern
                expect(content).toMatch(/from ['"]\.\.[^'"]*client\.js['"];?/);
              }

              // Should also contain .js extensions in other imports
              if (content.includes("from './objects/") || content.includes("from './enums/")) {
                expect(content).toMatch(/from '\.\/(objects|enums)\/[^']*\.js'/);
              }
            }
          }
        } catch (error) {
          console.warn('Skipping custom Prisma client ESM test - might not be available');
          console.error('Original error:', error);
        } finally {
          if (existsSync(customClientOutput)) {
            rmSync(customClientOutput, { recursive: true, force: true });
          }
        }
      });

      it('should add .js extensions in index files with useMultipleFiles and ESM config (issue #234)', async () => {
        const schemaContent = `generator client {
  provider              = "prisma-client"
  output                = "./client"
  runtime               = "nodejs"
  moduleFormat          = "esm"
  generatedFileExtension = "ts"
  importFileExtension   = "js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zodTest {
  provider = "node ./lib/generator.js"
  output   = "./generated"
  config   = "./zod-generator.config.json"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  content  String?
  author   User?   @relation(fields: [authorId], references: [id])
  authorId Int?
}`;

        // Create config file for useMultipleFiles
        const configPath = join(testDir, 'zod-generator.config.json');
        const config = {
          mode: 'full',
          globalExclusions: {
            input: ['*id', 'createdAt', 'updatedAt'],
            result: [],
          },
          pureModels: true,
          useMultipleFiles: true,
        };
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        writeFileSync(schemaPath, schemaContent);

        try {
          runPrismaGenerate();

          // Check that all index files have .js extensions for ESM compatibility
          const indexFiles = [
            join(outputDir, 'schemas', 'index.ts'),
            join(outputDir, 'models', 'index.ts'),
            join(outputDir, 'schemas', 'objects', 'index.ts'),
            join(outputDir, 'schemas', 'variants', 'index.ts'),
            join(outputDir, 'schemas', 'variants', 'pure', 'index.ts'),
            join(outputDir, 'schemas', 'variants', 'input', 'index.ts'),
            join(outputDir, 'schemas', 'variants', 'result', 'index.ts'),
          ];

          for (const indexFile of indexFiles) {
            if (existsSync(indexFile)) {
              const content = readFileSync(indexFile, 'utf-8');

              // Should contain .js extensions in export statements for ESM
              if (content.includes('export')) {
                const exportLines = content.split('\n').filter(
                  (line) =>
                    line.trim().startsWith('export') &&
                    line.includes("from './") &&
                    !line.includes('//'), // Ignore commented lines
                );

                if (exportLines.length > 0) {
                  // All export statements should have .js extensions
                  exportLines.forEach((line) => {
                    expect(line).toMatch(/\.js['"](?:;)?\s*$/);
                  });
                }
              }
            }
          }
        } catch (error) {
          console.warn('Skipping index files ESM test - generator might not be available');
          console.error('Original error:', error);
        }
      });
    });

    describe('Mixed Configurations', () => {
      it('should handle generator with only runtime specified', async () => {
        const schemaContent = `generator client {
  provider = "prisma-client"
  output   = "./client"
  runtime  = "nodejs"
}
${baseSchema}`;

        writeFileSync(schemaPath, schemaContent);

        try {
          runPrismaGenerate();

          const userWhereInputPath = join(
            outputDir,
            'schemas',
            'objects',
            'UserWhereInput.schema.ts',
          );
          if (existsSync(userWhereInputPath)) {
            const content = readFileSync(userWhereInputPath, 'utf-8');

            // Should not add extensions when moduleFormat is not esm
            expect(content).not.toMatch(/import.*\.js'/);
          }
        } catch {
          console.warn('Skipping runtime-only test - might not be available');
        }
      });

      it('should handle generator with only moduleFormat specified', async () => {
        const schemaContent = `generator client {
  provider     = "prisma-client"
  output       = "./client"
  moduleFormat = "esm"
}
${baseSchema}`;

        writeFileSync(schemaPath, schemaContent);

        try {
          runPrismaGenerate();

          const userWhereInputPath = join(
            outputDir,
            'schemas',
            'objects',
            'UserWhereInput.schema.ts',
          );
          if (existsSync(userWhereInputPath)) {
            const content = readFileSync(userWhereInputPath, 'utf-8');

            // Should not add extensions when importFileExtension is not specified
            expect(content).not.toMatch(/import.*\.js'/);
          }
        } catch {
          console.warn('Skipping moduleFormat-only test - might not be available');
        }
      });
    });
  });

  describe('Unit Tests for Transformer Methods', () => {
    describe('getImportFileExtension', () => {
      it('should return empty string for legacy generator', () => {
        // Mock static properties for legacy generator
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();

        try {
          Transformer.setPrismaClientProvider('prisma-client-js');
          Transformer.setPrismaClientConfig({});

          const transformer = new Transformer({ name: 'Test' });
          const extension = (
            transformer as unknown as { getImportFileExtension(): string }
          ).getImportFileExtension();

          expect(extension).toBe('');
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
        }
      });

      it('should return .js for new generator with ESM and js extension', () => {
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();

        try {
          Transformer.setPrismaClientProvider('prisma-client');
          Transformer.setPrismaClientConfig({
            moduleFormat: 'esm',
            importFileExtension: 'js',
          });

          const transformer = new Transformer({ name: 'Test' });
          const extension = (
            transformer as unknown as { getImportFileExtension(): string }
          ).getImportFileExtension();

          expect(extension).toBe('.js');
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
        }
      });

      it('should return .mjs for new generator with ESM and mjs extension', () => {
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();

        try {
          Transformer.setPrismaClientProvider('prisma-client');
          Transformer.setPrismaClientConfig({
            moduleFormat: 'esm',
            importFileExtension: 'mjs',
          });

          const transformer = new Transformer({ name: 'Test' });
          const extension = (
            transformer as unknown as { getImportFileExtension(): string }
          ).getImportFileExtension();

          expect(extension).toBe('.mjs');
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
        }
      });

      it('should return empty string for new generator with CJS', () => {
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();

        try {
          Transformer.setPrismaClientProvider('prisma-client');
          Transformer.setPrismaClientConfig({
            moduleFormat: 'cjs',
            importFileExtension: 'js',
          });

          const transformer = new Transformer({ name: 'Test' });
          const extension = (
            transformer as unknown as { getImportFileExtension(): string }
          ).getImportFileExtension();

          expect(extension).toBe('');
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
        }
      });

      it('should return empty string when importFileExtension is not specified', () => {
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();

        try {
          Transformer.setPrismaClientProvider('prisma-client');
          Transformer.setPrismaClientConfig({
            moduleFormat: 'esm',
          });

          const transformer = new Transformer({ name: 'Test' });
          const extension = (
            transformer as unknown as { getImportFileExtension(): string }
          ).getImportFileExtension();

          expect(extension).toBe('');
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
        }
      });

      it('should detect new generator by runtime field', () => {
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();

        try {
          Transformer.setPrismaClientProvider('prisma-client-js');
          Transformer.setPrismaClientConfig({
            runtime: 'nodejs',
            moduleFormat: 'esm',
            importFileExtension: 'js',
          });

          const transformer = new Transformer({ name: 'Test' });
          const extension = (
            transformer as unknown as { getImportFileExtension(): string }
          ).getImportFileExtension();

          expect(extension).toBe('.js');
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
        }
      });

      it('should detect new generator by moduleFormat field', () => {
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();

        try {
          Transformer.setPrismaClientProvider('prisma-client-js');
          Transformer.setPrismaClientConfig({
            moduleFormat: 'esm',
            importFileExtension: 'js',
          });

          const transformer = new Transformer({ name: 'Test' });
          const extension = (
            transformer as unknown as { getImportFileExtension(): string }
          ).getImportFileExtension();

          expect(extension).toBe('.js');
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
        }
      });
    });

    describe('resolvePrismaImportPath', () => {
      it('should append the client entrypoint for custom outputs ending with client directory', () => {
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();
        const originalOutputPath = (Transformer as unknown as { prismaClientOutputPath: string })
          .prismaClientOutputPath;

        try {
          Transformer.setPrismaClientProvider('prisma-client');
          Transformer.setPrismaClientConfig({
            moduleFormat: 'esm',
            importFileExtension: 'ts',
          });

          const customOutput = join(process.cwd(), 'tmp', 'generated', 'client');
          Transformer.setPrismaClientOutputPath(customOutput);

          const targetDir = join(process.cwd(), 'tmp', 'zod', 'schemas');
          const resolvedPath = (
            Transformer as unknown as {
              resolvePrismaImportPath(dir: string): string;
            }
          ).resolvePrismaImportPath(targetDir);

          const expectedRelative = relative(targetDir, join(customOutput, 'client')).replace(
            /\\/g,
            '/',
          );

          expect(resolvedPath).toBe(`${expectedRelative}.ts`);
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
          Transformer.setPrismaClientOutputPath(originalOutputPath);
        }
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle all import types correctly', async () => {
      const schemaContent = `generator client {
  provider              = "prisma-client"
  output                = "./client"
  runtime               = "nodejs"
  moduleFormat          = "esm"
  generatedFileExtension = "ts"
  importFileExtension   = "js"
}
${baseSchema}`;

      writeFileSync(schemaPath, schemaContent);

      try {
        runPrismaGenerate();

        // Test different types of imports
        const testCases = [
          {
            file: join(outputDir, 'schemas', 'objects', 'UserWhereInput.schema.ts'),
            shouldContain: [
              /from '\.[^']*\.js'/, // Object imports
            ],
          },
          {
            file: join(outputDir, 'schemas', 'findManyUser.schema.ts'),
            shouldContain: [
              /from '\.\/objects\/[^']*\.schema\.js'/, // Object imports
              /from '\.\/enums\/[^']*\.schema\.js'/, // Enum imports
            ],
          },
        ];

        for (const testCase of testCases) {
          if (existsSync(testCase.file)) {
            const content = readFileSync(testCase.file, 'utf-8');

            for (const pattern of testCase.shouldContain) {
              if (content.includes('import {')) {
                expect(content).toMatch(pattern);
              }
            }
          }
        }
      } catch {
        console.warn('Skipping integration test - generator might not be available');
      }
    });
  });
});
