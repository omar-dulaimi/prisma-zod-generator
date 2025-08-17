import { promises as fs } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT, PrismaSchemaGenerator, TestEnvironment } from './helpers';

// Ensures dynamic Prisma client import path resolution works when client generator has custom output
// (e.g. output = "./prismaClient").
// We assert generated schemas do NOT reference '@prisma/client' directly and instead use a relative path.

describe('Custom Prisma Client output path integration', () => {
  it(
    'emits relative Prisma import when client output customized',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('custom-client-output');
      try {
        const clientRel = './prismaClient';
        // Build a basic schema then inject a custom client output line.
        const base = PrismaSchemaGenerator.createBasicSchema({
          outputPath: './generated',
        });
        const schema = base.replace(
          'generator client {',
          `generator client {\n  output = "${clientRel}"`,
        );
        await fs.writeFile(testEnv.schemaPath, schema, 'utf8');

        await testEnv.runGeneration();

        // Look at any generated object schema (UserWhereUniqueInput etc.)
        const objectsDir = join(testEnv.testDir, 'generated', 'schemas', 'objects');
        const files = await fs.readdir(objectsDir);
        const target = files.find((f) => /User.*\.schema\.ts$/.test(f)) || files[0];
        const content = await fs.readFile(join(objectsDir, target), 'utf8');

        expect(content).not.toContain("from '@prisma/client'");
        // Relative path from generated/schemas/objects -> prismaClient is ../../../prismaClient
        expect(content).toMatch(/from '\.\.\/\.\.\/\.\.\/prismaClient'/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits relative Prisma import in CRUD operation schema files',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('custom-client-output-crud');
      try {
        const clientRel = './prismaClient';
        const base = PrismaSchemaGenerator.createBasicSchema({
          outputPath: './generated',
        });
        const schema = base.replace(
          'generator client {',
          `generator client {\n  output = "${clientRel}"`,
        );
        await fs.writeFile(testEnv.schemaPath, schema, 'utf8');

        await testEnv.runGeneration();

        const schemasDir = join(testEnv.testDir, 'generated', 'schemas');
        const schemaFiles = await fs.readdir(schemasDir);
        const crudFile =
          schemaFiles.find((f) => /findMany.*\.schema\.ts$/.test(f)) ||
          schemaFiles.find((f) => /findFirst.*\.schema\.ts$/.test(f)) ||
          schemaFiles.find((f) => /findUnique.*\.schema\.ts$/.test(f)) ||
          schemaFiles.find((f) => /createOne.*\.schema\.ts$/.test(f)) ||
          schemaFiles.find((f) => /createMany.*\.schema\.ts$/.test(f)) ||
          null;
        expect(crudFile, 'Expected at least one CRUD operation schema file').not.toBeNull();
        if (!crudFile) return; // TS narrowing
        const content = await fs.readFile(join(schemasDir, crudFile), 'utf8');
        expect(content).not.toContain("from '@prisma/client'");
        expect(content).toMatch(/from '\.\.\/\.\.\/prismaClient'/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
