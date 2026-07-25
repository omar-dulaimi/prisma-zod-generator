import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Issue #396: `globalExclusions` accepts a flat array meaning "exclude these
 * fields from every variant", including custom array-based variants. Field
 * filtering always supported it, but a debug-logging block called `.join()` on
 * the string values that `Object.entries()` yields for an array, which threw and
 * aborted the whole generation.
 */
describe('Issue #396: array-form globalExclusions', () => {
  async function generate(envName: string, globalExclusions: unknown) {
    const testEnv = await TestEnvironment.createTestEnv(envName);
    const config = {
      ...ConfigGenerator.createBasicConfig(),
      globalExclusions,
      variants: [{ name: 'public', suffix: 'Public', exclude: ['password'] }],
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

model User {
  id           Int    @id @default(autoincrement())
  email        String @unique
  globalSecret String
  password     String
}
`;
    writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
    writeFileSync(testEnv.schemaPath, schema);
    await testEnv.runGeneration();
    return testEnv;
  }

  it(
    'applies to custom array-based variants without failing generation',
    async () => {
      const testEnv = await generate('issue-396-array-form', ['globalSecret']);
      try {
        const variant = readFileSync(
          join(testEnv.outputDir, 'schemas', 'variants', 'UserPublic.schema.ts'),
          'utf-8',
        );

        // Global (array) and variant-level exclusions both applied
        expect(variant).not.toMatch(/globalSecret/);
        expect(variant).not.toMatch(/password/);
        expect(variant).toMatch(/email/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'still supports the per-variant object form',
    async () => {
      const testEnv = await generate('issue-396-object-form', {
        input: ['globalSecret'],
        result: ['globalSecret'],
        pure: ['globalSecret'],
      });
      try {
        // Generation succeeds and the object form keeps working; the built-in
        // variants are where these keys apply.
        const variant = readFileSync(
          join(testEnv.outputDir, 'schemas', 'variants', 'UserPublic.schema.ts'),
          'utf-8',
        );
        expect(variant).not.toMatch(/password/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
