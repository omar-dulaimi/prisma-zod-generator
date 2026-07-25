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

        // Assert on the files that actually reference the Prisma namespace.
        // Picking an arbitrary User* file is order-dependent and unreliable:
        // untyped objects (e.g. UserArgs) legitimately carry no Prisma import
        // at all, since unused imports are no longer emitted.
        const objectsDir = join(testEnv.testDir, 'generated', 'schemas', 'objects');
        const files = await fs.readdir(objectsDir);
        const withPrismaImport: string[] = [];
        for (const file of files) {
          const body = await fs.readFile(join(objectsDir, file), 'utf8');
          expect(body).not.toContain("from '@prisma/client'");
          if (/import\s+(?:type\s+)?\{\s*Prisma\s*\}/.test(body)) withPrismaImport.push(body);
        }

        expect(withPrismaImport.length).toBeGreaterThan(0);
        // Relative path from generated/schemas/objects -> prismaClient is ../../../prismaClient
        for (const body of withPrismaImport) {
          expect(body).toMatch(/from '\.\.\/\.\.\/\.\.\/prismaClient'/);
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'targets the browser-safe entrypoint for the new prisma-client provider',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('custom-client-output-new-provider');
      try {
        const clientRel = './prismaClient';
        const base = PrismaSchemaGenerator.createBasicSchema({
          outputPath: './generated',
        });
        const schema = base.replace(
          'generator client {\n  provider = "prisma-client-js"\n}',
          `generator client {\n  provider = "prisma-client"\n  output   = "${clientRel}"\n}`,
        );
        expect(schema).toContain('provider = "prisma-client"');
        await fs.writeFile(testEnv.schemaPath, schema, 'utf8');

        await testEnv.runGeneration();

        const objectsDir = join(testEnv.testDir, 'generated', 'schemas', 'objects');
        const files = await fs.readdir(objectsDir);
        const withPrismaImport: string[] = [];
        for (const file of files) {
          const body = await fs.readFile(join(objectsDir, file), 'utf8');
          expect(body).not.toContain("from '@prisma/client'");
          if (/import\s+(?:type\s+)?\{\s*Prisma\s*\}/.test(body)) withPrismaImport.push(body);
        }

        expect(withPrismaImport.length).toBeGreaterThan(0);
        // New generator: imports must target the browser-safe entry, never the server entry
        for (const body of withPrismaImport) {
          expect(body).toMatch(/from '\.\.\/\.\.\/\.\.\/prismaClient\/browser'/);
          expect(body).not.toMatch(/prismaClient\/client'/);
        }
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

  it(
    'hoists decimal helper import from the generated client path',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('custom-client-output-decimal');
      try {
        const clientRel = './prismaClient';
        const base = PrismaSchemaGenerator.createBasicSchema({
          outputPath: './generated',
        });
        const schemaWithDecimal = `${base}
model Invoice {
  id    Int     @id @default(autoincrement())
  total Decimal
}`;
        const schema = schemaWithDecimal.replace(
          'generator client {',
          `generator client {\n  output = "${clientRel}"`,
        );
        await fs.writeFile(testEnv.schemaPath, schema, 'utf8');

        await testEnv.runGeneration();

        const decimalHelpersPath = join(
          testEnv.testDir,
          'generated',
          'helpers',
          'decimal-helpers.ts',
        );
        const helperContent = await fs.readFile(decimalHelpersPath, 'utf8');

        expect(helperContent).not.toContain("from '@prisma/client'");
        expect(helperContent).toMatch(/from '\.\.\/\.\.\/prismaClient'/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
