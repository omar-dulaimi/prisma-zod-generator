import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Issues #225 / #371: @zod.meta({...}) and @zod.describe("...") annotations.
 * meta passes through on Zod v4 (field- and model-level) and downgrades to
 * .describe(description) on v3; describe works on both versions.
 */
describe('Issue #225/#371: .meta() and .describe() annotations', () => {
  async function generate(envName: string, zodImportTarget: 'v3' | 'v4') {
    const testEnv = await TestEnvironment.createTestEnv(envName);
    const config = {
      ...ConfigGenerator.createBasicConfig(),
      pureModels: true,
      zodImportTarget,
    };

    const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

/// @zod .meta({ description: "This is a model description", deprecated: true })
model Api {
  id         Int      @id @default(autoincrement())
  /// @zod.meta({ description: "The updated at date" })
  updated_at DateTime @default(now())
  /// @zod.describe("A described field")
  note       String?
  /// @zod.meta({ deprecated: true })
  legacy     String?
}
`;

    const configPath = join(testEnv.testDir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    writeFileSync(testEnv.schemaPath, schema);
    await testEnv.runGeneration();
    return testEnv;
  }

  it(
    'emits field- and model-level .meta() plus .describe() in Zod v4 mode',
    async () => {
      const testEnv = await generate('issue-225-meta-v4', 'v4');

      try {
        const model = readFileSync(
          join(testEnv.outputDir, 'schemas', 'models', 'Api.schema.ts'),
          'utf-8',
        );

        expect(model).toMatch(
          /updated_at:.*\.meta\(\{\s*description:\s*"The updated at date"\s*\}\)/,
        );
        expect(model).toMatch(/note:.*\.describe\('A described field'\)/);
        expect(model).toMatch(/legacy:.*\.meta\(\{\s*deprecated:\s*true\s*\}\)/);
        // Model-level meta lands after the closing z.object brace
        expect(model).toMatch(
          /\}\)\.meta\(\{\s*description:\s*"This is a model description",\s*deprecated:\s*true\s*\}\);/,
        );

        // Field metadata also applies to CRUD input object schemas
        const createInput = readFileSync(
          join(testEnv.outputDir, 'schemas', 'objects', 'ApiCreateInput.schema.ts'),
          'utf-8',
        );
        expect(createInput).toMatch(/\.meta\(\{\s*description:\s*"The updated at date"\s*\}\)/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'downgrades .meta() to .describe(description) in Zod v3 mode and drops meta without description',
    async () => {
      const testEnv = await generate('issue-225-meta-v3', 'v3');

      try {
        const model = readFileSync(
          join(testEnv.outputDir, 'schemas', 'models', 'Api.schema.ts'),
          'utf-8',
        );

        expect(model).toMatch(/updated_at:.*\.describe\("The updated at date"\)/);
        expect(model).toMatch(/note:.*\.describe\('A described field'\)/);
        expect(model).toMatch(/\}\)\.describe\("This is a model description"\);/);

        // v3 has no .meta(): none may survive, and meta without a description
        // key (legacy field) is dropped rather than downgraded
        expect(model).not.toMatch(/\.meta\(/);
        expect(model).toMatch(/legacy:\s*z\.string\(\)/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
