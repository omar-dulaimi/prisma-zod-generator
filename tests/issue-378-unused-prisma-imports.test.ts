import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  TestEnvironment,
} from './helpers';

const PRISMA_IMPORT_REGEX = /import\s+(type\s+)?\{\s*Prisma\s*\}/;

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (entry.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Asserts that every generated file importing `Prisma` actually references it
 * in its post-import body (no unused Prisma imports).
 */
function expectNoUnusedPrismaImports(schemasDir: string): void {
  const offenders: string[] = [];
  for (const filePath of collectTsFiles(schemasDir)) {
    const content = readFileSync(filePath, 'utf-8');
    if (!PRISMA_IMPORT_REGEX.test(content)) continue;
    const body = content
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('import '))
      .join('\n');
    if (!/\bPrisma[.[]/.test(body)) {
      offenders.push(filePath);
    }
  }
  expect(offenders).toEqual([]);
}

describe('Issue #378 — unused Prisma imports in generated schemas', () => {
  describe('default config (typed exports)', () => {
    let testEnv: Awaited<ReturnType<typeof TestEnvironment.createTestEnv>> | null = null;

    beforeAll(async () => {
      testEnv = await TestEnvironment.createTestEnv('issue-378-default');

      const config = {
        ...ConfigGenerator.createBasicConfig(),
        addSelectType: true,
        addIncludeType: true,
      };
      writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));

      const schema = `
generator client {
  provider = "prisma-client-js"
  output   = "${testEnv.outputDir}/client"
}

datasource db {
  provider = "postgresql"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  price    Decimal
  author   User    @relation(fields: [authorId], references: [id])
  authorId Int
}
`;

      writeFileSync(testEnv.schemaPath, schema.trimStart());
      await testEnv.runGeneration();
    }, GENERATION_TIMEOUT);

    afterAll(async () => {
      if (testEnv) await testEnv.cleanup();
    });

    it('omits the Prisma import from Args object schemas (exported untyped)', () => {
      if (!testEnv) throw new Error('Test environment not initialized');

      const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
      for (const file of [
        'PostArgs.schema.ts',
        'UserArgs.schema.ts',
        'UserCountOutputTypeArgs.schema.ts',
        'UserCountOutputTypeCountPostsArgs.schema.ts',
      ]) {
        const content = readFileSync(join(objectsDir, file), 'utf-8');
        expect(content).not.toMatch(PRISMA_IMPORT_REGEX);
      }
    });

    it('never emits a Prisma import without a Prisma reference in the file body', () => {
      if (!testEnv) throw new Error('Test environment not initialized');
      expectNoUnusedPrismaImports(join(testEnv.outputDir, 'schemas'));
    });

    it('keeps the Prisma import where typed exports reference it', () => {
      if (!testEnv) throw new Error('Test environment not initialized');

      const schemasDir = join(testEnv.outputDir, 'schemas');

      const selectContent = readFileSync(
        join(schemasDir, 'objects', 'PostSelect.schema.ts'),
        'utf-8',
      );
      expect(selectContent).toMatch(PRISMA_IMPORT_REGEX);
      expect(selectContent).toContain('z.ZodType<Prisma.PostSelect>');

      const findManyContent = readFileSync(join(schemasDir, 'findManyPost.schema.ts'), 'utf-8');
      expect(findManyContent).toMatch(PRISMA_IMPORT_REGEX);
      expect(findManyContent).toContain('z.ZodType<Prisma.PostFindManyArgs>');
    });

    it('keeps the Prisma value import for Decimal instanceof checks', () => {
      if (!testEnv) throw new Error('Test environment not initialized');

      const decimalFilterContent = readFileSync(
        join(testEnv.outputDir, 'schemas', 'objects', 'DecimalFilter.schema.ts'),
        'utf-8',
      );
      expect(decimalFilterContent).toMatch(/import\s+\{\s*Prisma\s*\}/);
      expect(decimalFilterContent).toContain('z.instanceof(Prisma.Decimal)');
    });
  });

  describe('zod-only mode (exportTypedSchemas=false)', () => {
    let testEnv: Awaited<ReturnType<typeof TestEnvironment.createTestEnv>> | null = null;

    beforeAll(async () => {
      testEnv = await TestEnvironment.createTestEnv('issue-378-zod-only');

      const schema = PrismaSchemaGenerator.createBasicSchema({
        models: ['User', 'Post'],
        outputPath: `${testEnv.outputDir}/schemas`,
        generatorOptions: {
          exportTypedSchemas: 'false',
          exportZodSchemas: 'true',
        },
      });

      writeFileSync(testEnv.schemaPath, schema);
      await testEnv.runGeneration();
    }, GENERATION_TIMEOUT);

    afterAll(async () => {
      if (testEnv) await testEnv.cleanup();
    });

    it('emits CRUD operation schemas without any Prisma import', () => {
      if (!testEnv) throw new Error('Test environment not initialized');

      const schemasDir = join(testEnv.outputDir, 'schemas');
      for (const file of [
        'findManyPost.schema.ts',
        'createOnePost.schema.ts',
        'groupByPost.schema.ts',
        'countPost.schema.ts',
      ]) {
        const content = readFileSync(join(schemasDir, file), 'utf-8');
        expect(content).not.toMatch(PRISMA_IMPORT_REGEX);
      }

      // Schemas stay functional: the Zod exports are still emitted
      const findManyContent = readFileSync(join(schemasDir, 'findManyPost.schema.ts'), 'utf-8');
      expect(findManyContent).toContain('export const PostFindManyZodSchema');
    });

    it('never emits a Prisma import without a Prisma reference in the file body', () => {
      if (!testEnv) throw new Error('Test environment not initialized');
      expectNoUnusedPrismaImports(join(testEnv.outputDir, 'schemas'));
    });
  });
});
