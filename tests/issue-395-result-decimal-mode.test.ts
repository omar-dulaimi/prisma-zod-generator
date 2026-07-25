import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Issue #395: result schemas ignored `decimalMode` and hardcoded `z.number()`
 * for Decimal fields. Prisma returns `Prisma.Decimal` instances, so parsing a
 * real query result threw. Result schemas now honor decimalMode, and the
 * default 'decimal' mode accepts the Decimal shape in addition to the
 * number/string forms that already validated.
 */
describe('Issue #395: decimalMode in result schemas', () => {
  async function generate(envName: string, extra: Record<string, unknown>) {
    const testEnv = await TestEnvironment.createTestEnv(envName);
    const config = {
      ...ConfigGenerator.createBasicConfig(),
      variants: { result: { enabled: true } },
      ...extra,
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

model Product {
  id    Int     @id @default(autoincrement())
  price Decimal
}
`;
    writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
    writeFileSync(testEnv.schemaPath, schema);
    await testEnv.runGeneration();
    return testEnv;
  }

  function priceLine(testEnv: { outputDir: string }): string {
    const content = readFileSync(
      join(testEnv.outputDir, 'schemas', 'results', 'ProductFindManyResult.schema.ts'),
      'utf-8',
    );
    return content.split('\n').find((l) => l.includes('price:')) ?? '';
  }

  it(
    'accepts the Prisma.Decimal shape in the default decimal mode',
    async () => {
      const testEnv = await generate('issue-395-decimal', {});
      try {
        const line = priceLine(testEnv);
        // Union of number, numeric string, and the import-free Decimal shape check
        expect(line).toContain('z.union([');
        expect(line).toContain('z.number()');
        expect(line).toMatch(/'d' in v/);
        expect(line).toMatch(/toFixed/);
        // The regression this fixes: a bare z.number() would reject Prisma output
        expect(line).not.toMatch(/price:\s*z\.number\(\),?\s*$/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits z.number() for decimalMode number and z.string() for decimalMode string',
    async () => {
      const numberEnv = await generate('issue-395-number', { decimalMode: 'number' });
      try {
        expect(priceLine(numberEnv)).toMatch(/price:\s*z\.number\(\)/);
      } finally {
        await numberEnv.cleanup();
      }

      const stringEnv = await generate('issue-395-string', { decimalMode: 'string' });
      try {
        expect(priceLine(stringEnv)).toMatch(/price:\s*z\.string\(\)/);
      } finally {
        await stringEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'validates Decimal-like objects, numbers and numeric strings at runtime, rejecting other values',
    async () => {
      const testEnv = await generate('issue-395-runtime', {});
      try {
        const modulePath = join(
          testEnv.outputDir,
          'schemas',
          'results',
          'ProductFindManyResult.schema.ts',
        );
        const mod = await import(/* @vite-ignore */ modulePath);
        const schema = mod.ProductFindManyResultSchema;

        const wrap = (price: unknown) => ({
          data: [{ id: 1, price }],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });

        // Structural stand-in for a Prisma.Decimal (decimal.js internals)
        const decimalLike = { d: [19, 9900000], e: 1, s: 1, toFixed: () => '19.99' };

        expect(schema.safeParse(wrap(decimalLike)).success).toBe(true);
        expect(schema.safeParse(wrap(19.99)).success).toBe(true);
        expect(schema.safeParse(wrap('19.99')).success).toBe(true);
        expect(schema.safeParse(wrap('not-a-number')).success).toBe(false);
        expect(schema.safeParse(wrap({ nope: true })).success).toBe(false);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
