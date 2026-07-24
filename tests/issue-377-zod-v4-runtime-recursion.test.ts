import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Issue #377: Zod v4 target crashed at import time.
 * .strict() on getter-based object schemas spreads the shape eagerly (invoking
 * every field getter at module scope), and multi-inputType unions embedded bare
 * object references — both dereferenced consts before initialization
 * (TDZ ReferenceError / "Cannot read properties of undefined (reading 'optional')").
 * These tests import and execute the generated v4 output instead of only
 * string-matching it.
 */

const buildSchema = (outputDir: string) =>
  `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "sqlite"\n  url      = "file:./test.db"\n}\n\ngenerator zod {\n  provider = "node ./lib/generator.js"\n  output   = "${outputDir}/schemas"\n  config   = "./config.json"\n}\n\nmodel User {\n  id      Int      @id @default(autoincrement())\n  name    String\n  posts   Post[]\n  profile Profile?\n}\n\nmodel Post {\n  id       Int   @id\n  author   User? @relation(fields: [authorId], references: [id])\n  authorId Int?\n}\n\nmodel Profile {\n  id     Int   @id @default(autoincrement())\n  user   User? @relation(fields: [userId], references: [id])\n  userId Int?  @unique\n}`;

interface GeneratedSchemas {
  UserCreateInputObjectSchema: {
    safeParse: (input: unknown) => { success: boolean };
  };
  UserWhereInputObjectSchema: {
    safeParse: (input: unknown) => { success: boolean };
  };
  UserSelectObjectSchema: {
    safeParse: (input: unknown) => { success: boolean };
  };
}

const runParseAssertions = (m: GeneratedSchemas) => {
  // Nested circular create (User -> Post -> User)
  expect(
    m.UserCreateInputObjectSchema.safeParse({
      name: 'a',
      posts: { create: [{ id: 1 }] },
      profile: { create: {} },
    }).success,
  ).toBe(true);

  // Self-referential union (WhereInput AND)
  expect(m.UserWhereInputObjectSchema.safeParse({ AND: [{ id: 1 }] }).success).toBe(true);

  // Object -> operation schema reference (Select posts -> PostFindMany)
  expect(m.UserSelectObjectSchema.safeParse({ posts: { take: 1 } }).success).toBe(true);

  // Strictness preserved: unknown keys still rejected
  expect(m.UserCreateInputObjectSchema.safeParse({ name: 'a', bogus: 1 }).success).toBe(false);
};

describe('Issue #377: Zod v4 runtime recursion', () => {
  it(
    'single-file v4 bundle imports and parses (no TDZ/undefined crashes)',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-377-single-file-runtime');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          zodImportTarget: 'v4' as const,
          addSelectType: true,
          addIncludeType: true,
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));
        await testEnv.runGeneration();

        const bundlePath = join(testEnv.outputDir, 'schemas', 'schemas.ts');
        expect(existsSync(bundlePath)).toBe(true);

        // On master this import alone crashes with
        // "Cannot access 'UserWhereInputObjectSchema' before initialization"
        const m = (await import(bundlePath)) as unknown as GeneratedSchemas;
        runParseAssertions(m);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'multi-file v4 output imports and parses (ESM circular imports)',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-377-multi-file-runtime');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: true,
          zodImportTarget: 'v4' as const,
          addSelectType: true,
          addIncludeType: true,
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));
        await testEnv.runGeneration();

        const indexPath = join(testEnv.outputDir, 'schemas', 'index.ts');
        expect(existsSync(indexPath)).toBe(true);

        // On master this crashes with
        // "Cannot access 'UserArgsObjectSchema' before initialization"
        const m = (await import(indexPath)) as unknown as GeneratedSchemas;
        runParseAssertions(m);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
