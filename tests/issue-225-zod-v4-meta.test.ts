import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TestEnvironment, ConfigGenerator, GENERATION_TIMEOUT } from './helpers';

describe('GitHub Issue #225 - Zod v4 Meta Support', () => {
  describe('Error Handling - No Arguments', () => {
    it(
      'should error or fallback gracefully when @zod.meta() has no arguments',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-225-meta-no-args');
        try {
          const config = ConfigGenerator.createBasicConfig();
          const configPath = join(testEnv.testDir, 'config.json');

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model MetaNoArgsTest {
  id        Int    @id @default(autoincrement())
  /// @zod.meta()
  metaField String
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          // Either should throw or produce a fallback without meta applied.
          try {
            await testEnv.runGeneration();
          } catch (error) {
            expect(error).toBeDefined();
            return;
          }

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'MetaNoArgsTestCreateInput.schema.ts');
          expect(existsSync(createInputPath)).toBe(true);
          const content = readFileSync(createInputPath, 'utf-8');

          // Fallback should not contain meta object application
          expect(content).not.toMatch(/meta\s*\(/);
          // Should still generate a string validator
          expect(content).toMatch(/z\.(string|any)/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Description Only', () => {
    it(
      'should attach description when @zod.meta({ "description": "..." }) is used',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-225-meta-description');
        try {
          const config = ConfigGenerator.createBasicConfig();
          const configPath = join(testEnv.testDir, 'config.json');

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model MetaDescriptionTest {
  id        Int    @id @default(autoincrement())
  /// @zod.meta({ "description": "This is a test field" })
  metaField String
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'MetaDescriptionTestCreateInput.schema.ts');
          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should include meta application with description preserved
          expect(content).toMatch(
            /meta\s*\(\s*\{\s*"description"\s*:\s*"This is a test field"\s*\}\s*\)/,
          );
          // Should not include examples when only description provided
          expect(content).not.toMatch(/"examples"/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Description + Examples', () => {
    it(
      'should attach description and examples when both are provided',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-225-meta-desc-examples');
        try {
          const config = ConfigGenerator.createBasicConfig();
          const configPath = join(testEnv.testDir, 'config.json');

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model MetaDescExamplesTest {
  id        Int    @id @default(autoincrement())
  /// @zod.meta({ "description": "This is a test field", "examples": ["example1", "example2"] })
  metaField String
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'MetaDescExamplesTestCreateInput.schema.ts');
          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should include meta with both description and examples preserved
          expect(content).toMatch(/meta\s*\(\s*\{\s*"description"\s*:\s*"This is a test field"/);
          expect(content).toMatch(
            /"examples"\s*:\s*\[\s*"example1"\s*,\s*"example2"\s*\]\s*\}\s*\)/,
          );
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
