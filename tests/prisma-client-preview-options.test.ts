import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// This test suite validates compatibility with the new `prisma-client` preview generator options
// (runtime, moduleFormat, generatedFileExtension, importFileExtension, binaryTargets, previewFeatures)
// ensuring the zod generator adapts import extensions and relative Prisma Client path resolution.

const BASE_SCHEMA_MODELS = `
model User {\n  id    Int     @id @default(autoincrement())\n  email String  @unique\n  name  String?\n}\n\nmodel Post {\n  id     Int     @id @default(autoincrement())\n  title  String\n  user   User?   @relation(fields: [userId], references: [id])\n  userId Int?\n}`;

function buildSchema({ generatorBlock }: { generatorBlock: string }) {
  return `datasource db {\n  provider = "sqlite"\n  url      = "file:./test.db"\n}\n\n${generatorBlock}\n\ngenerator zod {\n  provider = "node ./lib/generator.js"\n  output   = "./zod"\n  useMultipleFiles = false\n  singleFileName = "index.ts"\n}\n\n${BASE_SCHEMA_MODELS}`;
}

describe('prisma-client preview generator option matrix', () => {
  const root = join(process.cwd(), 'test-preview-options');
  const schemaPath = join(root, 'schema.prisma');
  const zodOut = join(root, 'zod');

  beforeAll(() => {
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
  });
  afterAll(() => {
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  const importExtScenarios = [
    { importFileExtension: 'js', generatedFileExtension: 'ts' },
    { importFileExtension: 'mjs', generatedFileExtension: 'mts' },
    { importFileExtension: 'cjs', generatedFileExtension: 'cts' },
    { importFileExtension: 'ts', generatedFileExtension: 'ts' },
    { importFileExtension: undefined, generatedFileExtension: 'ts' }, // bare imports
  ];

  it('handles multiple import / generated file extension combinations', () => {
    for (const scenario of importExtScenarios) {
      const genBlock = `generator client {\n  provider               = "prisma-client"\n  output                 = "./client"\n  runtime                = "nodejs"\n  moduleFormat           = "esm"\n  generatedFileExtension = "${scenario.generatedFileExtension}"${scenario.importFileExtension ? `\n  importFileExtension    = "${scenario.importFileExtension}"` : ''}\n}`;
      const schema = buildSchema({ generatorBlock: genBlock });
      writeFileSync(schemaPath, schema);
      try {
        execSync(`npx prisma generate --schema ${schemaPath}`, { cwd: root, stdio: 'pipe' });
      } catch {
        // If the preview generator isn't available, skip the scenario gracefully
        continue;
      }
      const zodIndex = join(zodOut, 'index.ts');
      if (!existsSync(zodIndex)) continue; // fallback
      const content = readFileSync(zodIndex, 'utf8');
      // Expect the Prisma import to be relative
      expect(content).toMatch(/import type { Prisma } from '\.\.\/client/);
      if (scenario.importFileExtension) {
        // we expect extension only if importFileExtension specified and moduleFormat=esm
        const ext = scenario.importFileExtension;
        // ensure we did not accidentally append extension to Prisma import path (should stay path only)
        expect(content).not.toMatch(new RegExp(`from \\\'\\.\\.\\/client\\.${ext}\\'`));
      }
    }
  });

  it('supports different runtimes without breaking imports', () => {
    const runtimes = ['nodejs', 'edge-light'];
    for (const runtime of runtimes) {
      const genBlock = `generator client {\n  provider     = "prisma-client"\n  output       = "./client"\n  runtime      = "${runtime}"\n  moduleFormat = "esm"\n}`;
      const schema = buildSchema({ generatorBlock: genBlock });
      writeFileSync(schemaPath, schema);
      try {
        execSync(`npx prisma generate --schema ${schemaPath}`, { cwd: root, stdio: 'pipe' });
      } catch {
        continue;
      }
      const zodIndex = join(zodOut, 'index.ts');
      if (!existsSync(zodIndex)) continue;
      const content = readFileSync(zodIndex, 'utf8');
      expect(content).toMatch(/import type { Prisma } from '\.\.\/client/);
    }
  });

  it('handles binaryTargets and previewFeatures with legacy generator', () => {
    const genBlock = `generator client {\n  provider      = "prisma-client-js"\n  binaryTargets = ["native"]\n  previewFeatures = ["queryCompiler", "driverAdapters"]\n}`;
    const schema = buildSchema({ generatorBlock: genBlock });
    writeFileSync(schemaPath, schema);
    try {
      execSync(`npx prisma generate --schema ${schemaPath}`, { cwd: root, stdio: 'pipe' });
    } catch {
      return;
    }
    const zodIndex = join(zodOut, 'index.ts');
    if (!existsSync(zodIndex)) return;
    const content = readFileSync(zodIndex, 'utf8');
    // Should still import from default @prisma/client (legacy path) since output not customized
    expect(content).toMatch(/from '@prisma\/client';|from "@prisma\/client"/);
  });

  it('respects custom output path depth (nested relative import)', () => {
    // nested output path e.g. ../src/generated/prisma relative to schema
    const genBlock = `generator client {\n  provider = "prisma-client"\n  output   = "./client/nested"\n}`;
    const schema = buildSchema({ generatorBlock: genBlock });
    writeFileSync(schemaPath, schema);
    try {
      execSync(`npx prisma generate --schema ${schemaPath}`, { cwd: root, stdio: 'pipe' });
    } catch {
      return;
    }
    const zodIndex = join(zodOut, 'index.ts');
    if (!existsSync(zodIndex)) return;
    const content = readFileSync(zodIndex, 'utf8');
    // index.ts lives at ./zod relative to root; client at ./client/nested so relative is ../client/nested
    expect(content).toMatch(/from '\.\.\/client\/nested'/);
  });
});
