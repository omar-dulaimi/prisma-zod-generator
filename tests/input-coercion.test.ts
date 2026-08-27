import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Tests for the inputCoercion generator option.
 *
 * When inputCoercion = true, Int/Float/Boolean/BigInt/Decimal (decimalMode=number)
 * fields should use z.coerce.*() instead of the strict variants, so HTTP query
 * parameters received as strings pass validation without external preprocessing.
 */

const buildSchema = (outputDir: string, extraFields = '') =>
  `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${outputDir}/schemas"
  config   = "./config.json"
}

model CoercionModel {
  id       Int     @id @default(autoincrement())
  count    Int
  price    Float
  active   Boolean
  big      BigInt
  ${extraFields}
}`;

const readVariant = (
  outputDir: string,
  variant: 'pure' | 'input' | 'result',
  model: string,
): string => {
  const filePath = join(outputDir, 'schemas', 'variants', variant, `${model}.${variant}.ts`);
  expect(existsSync(filePath), `${variant} variant file for ${model} should exist`).toBe(true);
  return readFileSync(filePath, 'utf-8');
};

const readAllObjects = (outputDir: string): string => {
  const objectsDir = join(outputDir, 'schemas', 'objects');
  if (!existsSync(objectsDir)) return '';
  const files = readdirSync(objectsDir).filter((f) => f.endsWith('.ts'));
  return files.map((f) => readFileSync(join(objectsDir, f), 'utf-8')).join('\n');
};

const readObject = (outputDir: string, name: string): string | null => {
  const filePath = join(outputDir, 'schemas', 'objects', `${name}.schema.ts`);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8');
};

describe('inputCoercion option', () => {
  it(
    'uses z.coerce.number() / z.coerce.boolean() in input schemas when enabled',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('input-coercion-enabled');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          inputCoercion: true,
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));
        await testEnv.runGeneration();

        const allObjects = readAllObjects(testEnv.outputDir);

        // IntFilter should use z.coerce.number()
        const intFilter = readObject(testEnv.outputDir, 'IntFilter');
        if (intFilter) {
          expect(intFilter).toContain('z.coerce.number()');
        }

        // FloatFilter should use z.coerce.number()
        const floatFilter = readObject(testEnv.outputDir, 'FloatFilter');
        if (floatFilter) {
          expect(floatFilter).toContain('z.coerce.number()');
        }

        // BigIntFilter should use z.coerce.bigint()
        const bigintFilter = readObject(testEnv.outputDir, 'BigIntFilter');
        if (bigintFilter) {
          expect(bigintFilter).toContain('z.coerce.bigint()');
        }

        // At minimum, coercion must appear somewhere in object schemas
        expect(allObjects).toContain('z.coerce.number()');
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'uses strict z.number() / z.boolean() when disabled (default)',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('input-coercion-disabled');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          inputCoercion: false,
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));
        await testEnv.runGeneration();

        const allObjects = readAllObjects(testEnv.outputDir);
        expect(allObjects).not.toContain('z.coerce');
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'applies coercion in variant schemas (pure/input/result)',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('input-coercion-variants');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          inputCoercion: true,
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
          const content = readVariant(testEnv.outputDir, variant, 'CoercionModel');
          expect(content).toMatch(/count:\s*z\.coerce\.number\(\)\.int\(\)/);
          expect(content).toMatch(/price:\s*z\.coerce\.number\(\)/);
          expect(content).toMatch(/active:\s*z\.coerce\.boolean\(\)/);
          expect(content).toMatch(/big:\s*z\.coerce\.bigint\(\)/);
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'applies coercion in pure model schemas',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('input-coercion-pure-models');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          inputCoercion: true,
          pureModels: true,
          variants: {
            pure: { enabled: true },
            input: { enabled: true },
            result: { enabled: true },
          },
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir));
        await testEnv.runGeneration();

        const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
        expect(existsSync(modelsDir), 'models directory should exist').toBe(true);
        const modelFiles = readdirSync(modelsDir).filter((f) => f.endsWith('.ts'));
        expect(modelFiles.length).toBeGreaterThan(0);
        const modelContent = modelFiles
          .map((f) => readFileSync(join(modelsDir, f), 'utf-8'))
          .join('\n');
        expect(modelContent).toContain('z.coerce.number()');
        expect(modelContent).toContain('z.coerce.boolean()');
        expect(modelContent).toContain('z.coerce.bigint()');
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'applies coercion to Decimal with decimalMode=number',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('input-coercion-decimal');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          inputCoercion: true,
          decimalMode: 'number',
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, buildSchema(testEnv.outputDir, 'amount Decimal'));
        await testEnv.runGeneration();

        const decimalFilter = readObject(testEnv.outputDir, 'DecimalFilter');
        if (decimalFilter) {
          expect(decimalFilter).toContain('z.coerce.number()');
        } else {
          // If DecimalFilter doesn't exist as standalone, check all objects
          const allObjects = readAllObjects(testEnv.outputDir);
          expect(allObjects).toContain('z.coerce.number()');
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'does not affect String or DateTime types',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('input-coercion-no-string-date');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          inputCoercion: true,
        };
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(
          testEnv.schemaPath,
          buildSchema(testEnv.outputDir, 'name String\ncreatedAt DateTime'),
        );
        await testEnv.runGeneration();

        const stringFilter = readObject(testEnv.outputDir, 'StringFilter');
        if (stringFilter) {
          expect(stringFilter).toContain('z.string()');
          expect(stringFilter).not.toContain('z.coerce');
        }

        const datetimeFilter = readObject(testEnv.outputDir, 'DateTimeFilter');
        if (datetimeFilter) {
          expect(datetimeFilter).not.toContain('z.coerce.string');
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
