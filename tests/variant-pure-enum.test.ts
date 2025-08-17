import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, TestEnvironment } from './helpers';

// Verifies variant pure schema uses generated enum schemas instead of importing enums from @prisma/client

describe('Variant Pure Enum Handling', () => {
  it('uses RoleSchema in pure variant instead of @prisma/client Role value import', async () => {
    const testEnv = await TestEnvironment.createTestEnv('variant-pure-enum');
    try {
      const config = {
        ...ConfigGenerator.createBasicConfig(),
        // Enable pure variant explicitly
        variants: {
          pure: { enabled: true },
          input: { enabled: false },
          result: { enabled: false },
        },
        pureModels: false,
      };
      const configPath = join(testEnv.testDir, 'config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const schema = `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "sqlite"\n  url      = "file:./test.db"\n}\n\ngenerator zod {\n  provider = "node ./lib/generator.js"\n  output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"\n}\n\nenum Role {\n  USER\n  ADMIN\n}\n\nmodel User {\n  id   Int  @id @default(autoincrement())\n  role Role\n}`;
      writeFileSync(testEnv.schemaPath, schema);
      await testEnv.runGeneration();

      const pureVariantPath = join(
        testEnv.outputDir,
        'schemas',
        'variants',
        'pure',
        'User.pure.ts',
      );
      expect(existsSync(pureVariantPath)).toBe(true);
      const content = readFileSync(pureVariantPath, 'utf8');
      expect(content).toMatch(/role:\s*RoleSchema/);
      // Import path from variants/pure/ to enums directory is ../../enums
      expect(content).toMatch(
        /import\s*\{\s*RoleSchema\s*\}\s*from\s*'\.\.\.\/\.\.\/enums\/Role\.schema'|import\s*\{\s*RoleSchema\s*\}\s*from\s*'\.\.\/\.\.\/enums\/Role\.schema'/,
      );
      expect(content).not.toMatch(/from '@prisma\/client'/);
    } finally {
      await testEnv.cleanup();
    }
  });
});
