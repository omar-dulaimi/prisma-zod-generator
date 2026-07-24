import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('Issue #382 — MongoDB models with "Raw" in their name', () => {
  let testEnv: Awaited<ReturnType<typeof TestEnvironment.createTestEnv>> | null = null;

  beforeAll(async () => {
    testEnv = await TestEnvironment.createTestEnv('issue-382-raw-suffix-model');

    const config = {
      ...ConfigGenerator.createBasicConfig(),
      addSelectType: true,
      addIncludeType: true,
    };
    writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));

    // MaterialRaw ends with 'Raw' (the reported case), BerkMaterialRawInitial
    // carries 'Raw' mid-name (the issue-comment case), Material is a control.
    const schema = `
generator client {
  provider = "prisma-client-js"
  output   = "${testEnv.outputDir}/client"
}

datasource db {
  provider = "mongodb"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model MaterialRaw {
  id   String @id @default(auto()) @map("_id") @db.ObjectId
  name String
}

model Material {
  id   String @id @default(auto()) @map("_id") @db.ObjectId
  name String
}

model BerkMaterialRawInitial {
  id   String @id @default(auto()) @map("_id") @db.ObjectId
  name String
}
`;

    writeFileSync(testEnv.schemaPath, schema.trimStart());
    await testEnv.runGeneration();
  }, GENERATION_TIMEOUT);

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  it('completes generation with an index file', () => {
    if (!testEnv) throw new Error('Test environment not initialized');
    expect(existsSync(join(testEnv.outputDir, 'schemas', 'index.ts'))).toBe(true);
  });

  it('generates CRUD schemas for Raw-named models and plain models alike', () => {
    if (!testEnv) throw new Error('Test environment not initialized');

    const schemasDir = join(testEnv.outputDir, 'schemas');
    for (const file of [
      'findManyMaterialRaw.schema.ts',
      'createOneMaterialRaw.schema.ts',
      'groupByMaterialRaw.schema.ts',
      'findManyBerkMaterialRawInitial.schema.ts',
      'findManyMaterial.schema.ts',
    ]) {
      expect(existsSync(join(schemasDir, file)), `${file} should exist`).toBe(true);
    }
  });

  it('generates non-empty results and variants directories', () => {
    if (!testEnv) throw new Error('Test environment not initialized');

    for (const dir of ['results', 'variants']) {
      const dirPath = join(testEnv.outputDir, 'schemas', dir);
      expect(existsSync(dirPath), `${dir} directory should exist`).toBe(true);
      expect(readdirSync(dirPath).length).toBeGreaterThan(0);
    }
  });

  it('still generates the genuine mongo raw-op args objects with correct exports', () => {
    if (!testEnv) throw new Error('Test environment not initialized');

    const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

    const findRawContent = readFileSync(join(objectsDir, 'findMaterialRawRaw.schema.ts'), 'utf-8');
    expect(findRawContent).toContain('export const MaterialRawFindRawObjectSchema');

    const aggregateRawContent = readFileSync(
      join(objectsDir, 'aggregateMaterialRawRaw.schema.ts'),
      'utf-8',
    );
    expect(aggregateRawContent).toContain('MaterialRawAggregateRawObjectSchema');

    // findMaterialRaw is the genuine findRaw op of the plain Material model —
    // exact-name matching must not misclassify or drop it.
    const materialFindRawContent = readFileSync(
      join(objectsDir, 'findMaterialRaw.schema.ts'),
      'utf-8',
    );
    expect(materialFindRawContent).toContain('MaterialFindRawObjectSchema');
  });

  it('keeps regular input objects for Raw-named models intact', () => {
    if (!testEnv) throw new Error('Test environment not initialized');

    expect(
      existsSync(join(testEnv.outputDir, 'schemas', 'objects', 'MaterialRawWhereInput.schema.ts')),
    ).toBe(true);
  });
});
