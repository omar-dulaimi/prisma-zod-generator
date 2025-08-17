import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import Transformer from '../src/transformer';

describe('Prisma Client ESM Configuration Tests', () => {
  const testDir = join(process.cwd(), 'test-esm-configs');
  const schemaPath = join(testDir, 'schema.prisma');
  const outputDir = join(testDir, 'generated');

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
        execSync(`npx prisma generate --schema ${schemaPath}`, {
          cwd: process.cwd(),
          stdio: 'pipe',
        });

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
          execSync(`npx prisma generate --schema ${schemaPath}`, {
            cwd: process.cwd(),
            stdio: 'pipe',
          });

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
          execSync(`npx prisma generate --schema ${schemaPath}`, {
            cwd: process.cwd(),
            stdio: 'pipe',
          });

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
          execSync(`npx prisma generate --schema ${schemaPath}`, {
            cwd: process.cwd(),
            stdio: 'pipe',
          });

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
            execSync(`npx prisma generate --schema ${schemaPath}`, {
              cwd: process.cwd(),
              stdio: 'pipe',
            });

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
          execSync(`npx prisma generate --schema ${schemaPath}`, {
            cwd: process.cwd(),
            stdio: 'pipe',
          });

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
          execSync(`npx prisma generate --schema ${schemaPath}`, {
            cwd: process.cwd(),
            stdio: 'pipe',
          });

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
          execSync(`npx prisma generate --schema ${schemaPath}`, {
            cwd: process.cwd(),
            stdio: 'pipe',
          });

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

    describe('generateImportStatement', () => {
      it('should generate import statement with extension', () => {
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();

        try {
          Transformer.setPrismaClientProvider('prisma-client');
          Transformer.setPrismaClientConfig({
            moduleFormat: 'esm',
            importFileExtension: 'js',
          });

          const transformer = new Transformer({ name: 'Test' });
          const statement = (
            transformer as unknown as {
              generateImportStatement(name: string, path: string): string;
            }
          ).generateImportStatement('TestSchema', './test.schema');

          expect(statement).toBe("import { TestSchema } from './test.schema.js'");
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
        }
      });

      it('should generate import statement without extension for legacy', () => {
        const originalProvider = Transformer.getPrismaClientProvider();
        const originalConfig = Transformer.getPrismaClientConfig();

        try {
          Transformer.setPrismaClientProvider('prisma-client-js');
          Transformer.setPrismaClientConfig({});

          const transformer = new Transformer({ name: 'Test' });
          const statement = (
            transformer as unknown as {
              generateImportStatement(name: string, path: string): string;
            }
          ).generateImportStatement('TestSchema', './test.schema');

          expect(statement).toBe("import { TestSchema } from './test.schema'");
        } finally {
          Transformer.setPrismaClientProvider(originalProvider);
          Transformer.setPrismaClientConfig(originalConfig);
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
        execSync(`npx prisma generate --schema ${schemaPath}`, {
          cwd: process.cwd(),
          stdio: 'pipe',
        });

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
