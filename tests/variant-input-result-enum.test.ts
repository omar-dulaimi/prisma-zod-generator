import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, TestEnvironment } from './helpers';

// Verifies input & result variant schemas use generated enum schemas instead of importing enums from @prisma/client

describe('Variant Input/Result Enum Handling', () => {
  it('uses RoleSchema in input & result variants instead of @prisma/client Role value import', async () => {
    const testEnv = await TestEnvironment.createTestEnv('variant-input-result-enum');
    try {
      const config = {
        ...ConfigGenerator.createBasicConfig(),
        variants: {
          pure: { enabled: false },
          input: { enabled: true },
          result: { enabled: true },
        },
        pureModels: false,
      };
      const configPath = join(testEnv.testDir, 'config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const schema = `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "sqlite"\n  url      = "file:./test.db"\n}\n\ngenerator zod {\n  provider = "node ./lib/generator.js"\n  output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"\n}\n\nenum Role {\n  USER\n  ADMIN\n}\n\nmodel User {\n  id   Int  @id @default(autoincrement())\n  role Role\n}`;
      writeFileSync(testEnv.schemaPath, schema);
      await testEnv.runGeneration();

      const inputVariantPath = join(
        testEnv.outputDir,
        'schemas',
        'variants',
        'input',
        'User.input.ts',
      );
      const resultVariantPath = join(
        testEnv.outputDir,
        'schemas',
        'variants',
        'result',
        'User.result.ts',
      );

      expect(existsSync(inputVariantPath)).toBe(true);
      expect(existsSync(resultVariantPath)).toBe(true);

      const inputContent = readFileSync(inputVariantPath, 'utf8');
      const resultContent = readFileSync(resultVariantPath, 'utf8');

      const importRegex =
        /import\s*\{\s*RoleSchema\s*\}\s*from\s*'\.\.\/\.\.\/enums\/Role\.schema'/;

      expect(inputContent).toMatch(/role:\s*RoleSchema/);
      expect(resultContent).toMatch(/role:\s*RoleSchema/);
      expect(inputContent).toMatch(importRegex);
      expect(resultContent).toMatch(importRegex);
      expect(inputContent).not.toMatch(/from '@prisma\/client'/);
      expect(resultContent).not.toMatch(/from '@prisma\/client'/);
    } finally {
      await testEnv.cleanup();
    }
  });
});
