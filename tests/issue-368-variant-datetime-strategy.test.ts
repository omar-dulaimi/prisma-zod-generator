import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Issue #368: dateTimeStrategy was ignored in split variant files
 * (variants/pure|input|result/<Model>.<variant>.ts) — they always emitted z.date()
 * even when the config requested coerce/isoString, while models/ and objects/
 * honored the strategy.
 */

const buildSchema = (outputDir: string) =>
  `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "sqlite"\n  url      = "file:./test.db"\n}\n\ngenerator zod {\n  provider = "node ./lib/generator.js"\n  output   = "${outputDir}/schemas"\n  config   = "./config.json"\n}\n\nmodel DateModel {\n  id Int @id @default(autoincrement())\n  occurredAt DateTime\n}`;

const readVariant = (outputDir: string, variant: 'pure' | 'input' | 'result'): string => {
  const filePath = join(outputDir, 'schemas', 'variants', variant, `DateModel.${variant}.ts`);
  expect(existsSync(filePath), `${variant} variant file should exist`).toBe(true);
  return readFileSync(filePath, 'utf-8');
};

describe('Issue #368: dateTimeStrategy in variant files', () => {
  it(
    'honors dateTimeStrategy = coerce in pure/input/result variant files',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-368-coerce-variants');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          dateTimeStrategy: 'coerce',
          variants: {
            pure: { enabled: true },
            input: { enabled: true },
            result: { enabled: true },
          },
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));
        await testEnv.runGeneration();

        for (const variant of ['pure', 'input', 'result'] as const) {
          const content = readVariant(testEnv.outputDir, variant);
          expect(content).toMatch(/occurredAt:\s*z\.coerce\.date\(\)/);
          expect(content).not.toMatch(/occurredAt:\s*z\.date\(\)/);
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'preserves split default (input coerces, pure/result stay z.date()) when no strategy is set',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-368-split-default');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          dateTimeSplitStrategy: true,
          variants: {
            pure: { enabled: true },
            input: { enabled: true },
            result: { enabled: true },
          },
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));
        await testEnv.runGeneration();

        for (const variant of ['pure', 'result'] as const) {
          const content = readVariant(testEnv.outputDir, variant);
          expect(content).toMatch(/occurredAt:\s*z\.date\(\)/);
          expect(content).not.toMatch(/occurredAt:\s*z\.coerce\.date\(\)/);
        }
        const inputContent = readVariant(testEnv.outputDir, 'input');
        expect(inputContent).toMatch(/occurredAt:\s*z\.coerce\.date\(\)/);
        expect(inputContent).not.toMatch(/occurredAt:\s*z\.date\(\)/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'honors dateTimeStrategy = isoString in variant files',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-368-isostring-variants');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          dateTimeStrategy: 'isoString',
          variants: {
            pure: { enabled: true },
            input: { enabled: true },
            result: { enabled: true },
          },
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));
        await testEnv.runGeneration();

        const content = readVariant(testEnv.outputDir, 'pure');
        expect(content).toMatch(/Invalid ISO datetime/);
        expect(content).toMatch(/transform\(v => new Date/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'honors dateTimeStrategy = coerce in array-based custom variants',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-368-array-variants');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          dateTimeStrategy: 'coerce',
          variants: [{ name: 'input', suffix: 'Input' }],
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));
        await testEnv.runGeneration();

        const variantPath = join(
          testEnv.outputDir,
          'schemas',
          'variants',
          'DateModelInput.schema.ts',
        );
        expect(existsSync(variantPath), 'array-based variant file should exist').toBe(true);
        const content = readFileSync(variantPath, 'utf-8');
        expect(content).toContain('z.coerce.date()');
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
