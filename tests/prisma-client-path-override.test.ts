import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * `prismaClientPath` overrides the Prisma Client import path generated schemas use,
 * instead of deriving it from the schema's own `generator client` block
 * (Transformer.resolvePrismaImportPath). Runs after that derivation unconditionally,
 * so when set it always wins; unset, the derived path is untouched (see
 * custom-prisma-client-output.test.ts for that path alone).
 */
describe('prismaClientPath config override', () => {
  it(
    'imports from the configured path instead of the derived one',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('prisma-client-path-override');

      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          prismaClientPath: '../somewhere/else/my-client',
        };

        const schema = `
generator client {
  provider = "prisma-client-js"
  output   = "./client"
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

model Post {
  id    Int    @id @default(autoincrement())
  title String
}
`;

        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);

        await testEnv.runGeneration();

        const createInputPath = join(
          testEnv.outputDir,
          'schemas',
          'objects',
          'PostCreateInput.schema.ts',
        );
        expect(existsSync(createInputPath)).toBe(true);
        const content = readFileSync(createInputPath, 'utf-8');

        // "../somewhere/else/my-client" resolves against the schema's own directory
        // (testEnv.testDir), then relative to testEnv.outputDir/schemas/objects/ -
        // four levels back out to testEnv.testDir, then up once more and across.
        expect(content).toContain("from '../../../../somewhere/else/my-client'");
        expect(content).not.toContain("from '../../../client'");
        expect(content).not.toContain("from '@prisma/client'");
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'leaves the derived path untouched when unset',
    async () => {
      // ConfigGenerator.createBasicConfig() (used by many other test files as their
      // base config) already carries prismaClientPath: '@prisma/client' - inert
      // decoration until this feature existed to read it at all. This test caught a
      // real bug during development: resolving that literal as a relative path
      // produced an actual '../../../@prisma/client' directory reference instead of
      // leaving the derived path alone, which every other test using this same base
      // config would have silently inherited. The fix treats '@prisma/client' as "no
      // override" - see the matching comment in prisma-generator.ts.
      const testEnv = await TestEnvironment.createTestEnv('prisma-client-path-no-override');

      try {
        const config = ConfigGenerator.createBasicConfig();

        const schema = `
generator client {
  provider = "prisma-client-js"
  output   = "./client"
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

model Post {
  id    Int    @id @default(autoincrement())
  title String
}
`;

        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);

        await testEnv.runGeneration();

        const createInputPath = join(
          testEnv.outputDir,
          'schemas',
          'objects',
          'PostCreateInput.schema.ts',
        );
        const content = readFileSync(createInputPath, 'utf-8');

        expect(content).toContain("from '../../../client'");
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
