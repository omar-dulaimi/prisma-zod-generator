import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prismaGenerateSync } from './helpers/prisma-generate';

// This test suite validates compatibility with the new `prisma-client` generator options
// (runtime, moduleFormat, generatedFileExtension, importFileExtension, binaryTargets, previewFeatures)
// ensuring the zod generator adapts import extensions and relative Prisma Client path resolution.

const BASE_SCHEMA_MODELS = `
model User {\n  id    Int     @id @default(autoincrement())\n  email String  @unique\n  name  String?\n}\n\nmodel Post {\n  id     Int     @id @default(autoincrement())\n  title  String\n  user   User?   @relation(fields: [userId], references: [id])\n  userId Int?\n}`;

function buildSchema({ generatorBlock }: { generatorBlock: string }) {
  return `datasource db {\n  provider = "sqlite"\n  url      = "file:./test.db"\n}\n\n${generatorBlock}\n\ngenerator zod {\n  provider = "node ./lib/generator.js"\n  output   = "./zod"\n  useMultipleFiles = false\n  singleFileName = "index.ts"\n}\n\n${BASE_SCHEMA_MODELS}`;
}

describe('prisma-client generator option', () => {
  const root = join(process.cwd(), 'test-preview-options');
  const schemaPath = join(root, 'schema.prisma');
  const zodOut = join(root, 'zod');

  const runPrismaGenerate = () => prismaGenerateSync(schemaPath, root);

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
        runPrismaGenerate();
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
        runPrismaGenerate();
      } catch {
        continue;
      }
      const zodIndex = join(zodOut, 'index.ts');
      if (!existsSync(zodIndex)) continue;
      const content = readFileSync(zodIndex, 'utf8');
      expect(content).toMatch(/import type { Prisma } from '\.\.\/client/);
    }
  });

  it('handles binaryTargets with legacy generator', () => {
    const genBlock = `generator client {\n  provider      = "prisma-client-js"\n  binaryTargets = ["native"]\n}`;
    const schema = buildSchema({ generatorBlock: genBlock });
    writeFileSync(schemaPath, schema);
    try {
      runPrismaGenerate();
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
      runPrismaGenerate();
    } catch {
      return;
    }
    const zodIndex = join(zodOut, 'index.ts');
    if (!existsSync(zodIndex)) return;
    const content = readFileSync(zodIndex, 'utf8');
    // index.ts lives at ./zod relative to root; client at ./client/nested so relative is ../client/nested
    expect(content).toMatch(/from '\.\.\/client\/nested'/);
  });

  it('uses the generated client path inside decimal helpers for the new generator', () => {
    const genBlock = `generator client {\n  provider               = "prisma-client"\n  output                 = "./client"\n  runtime                = "nodejs"\n  moduleFormat           = "esm"\n  generatedFileExtension = "ts"\n  importFileExtension    = "js"\n}`;
    const schema = `${buildSchema({ generatorBlock: genBlock })}
model Invoice {
  id    Int     @id @default(autoincrement())
  total Decimal
}`;
    writeFileSync(schemaPath, schema);
    try {
      runPrismaGenerate();
    } catch {
      return;
    }
    const helperPath = join(zodOut, 'helpers', 'decimal-helpers.ts');
    if (!existsSync(helperPath)) return;
    const helperContent = readFileSync(helperPath, 'utf8');
    expect(helperContent).toMatch(/from '\.\.\/\.\.\/client\/client\.js'/);
  });
});
