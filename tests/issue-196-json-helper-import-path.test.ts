import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { TestEnvironment, PrismaSchemaGenerator, GENERATION_TIMEOUT } from './helpers';

describe('Issue #196 — json-helpers import path', () => {
  let testEnv: Awaited<ReturnType<typeof TestEnvironment.createTestEnv>> | null = null;

  beforeAll(async () => {
    testEnv = await TestEnvironment.createTestEnv('issue-196-json-import');

    const schemaWithJson = PrismaSchemaGenerator.createBasicSchema({
      models: ['User', 'Post', 'Profile'],
      outputPath: `${testEnv!.outputDir}/schemas`,
    }).concat(`

model JsonHolder {
  id        Int   @id @default(autoincrement())
  payload   Json?
}
`);

  // Write schema
  await fs.writeFile(testEnv!.schemaPath, schemaWithJson, 'utf8');

    // Run generation (build + prisma generate)
    await testEnv!.runGeneration();
  }, GENERATION_TIMEOUT);

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  it('emits a correct relative import to helpers/json-helpers from object schemas', async () => {
    const objectsDir = join(testEnv!.outputDir, 'schemas', 'objects');
    const helpersDir = join(testEnv!.outputDir, 'schemas', 'helpers');

    // Ensure helpers file exists
    await expect(fs.stat(join(helpersDir, 'json-helpers.ts'))).resolves.toBeDefined();

    // Scan object schema files for json helper import
    const entries = await fs.readdir(objectsDir);
    const jsonImportRegex = /import\s+\{\s*JsonValueSchema\s+as\s+jsonSchema\s*\}\s+from\s+['"](\.{1,2}\/)+helpers\/json-helpers['"];?/;
    let foundValidImport = false;
    let foundInvalidImport = false;

    for (const name of entries) {
      if (!name.endsWith('.ts')) continue;
      const p = join(objectsDir, name);
      const content = await fs.readFile(p, 'utf8');
      if (/jsonSchema\b/.test(content)) {
        if (jsonImportRegex.test(content)) foundValidImport = true;
        if (/from ['"]\.\/helpers\/json-helpers['"]/.test(content)) foundInvalidImport = true;
      }
    }

    expect(foundInvalidImport).toBe(false);
    expect(foundValidImport).toBe(true);
  });
});
