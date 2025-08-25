import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT, TestEnvironment } from './helpers';

// Tests for Issue #194: @zod.custom.use comment isn't properly overriding the schema

describe('Issue #194: @zod.custom.use with chained methods', () => {
  it(
    'should properly override base schema with custom.use expression including chained methods',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-194-custom-use-chained');
      try {
        // Use array-based custom variants like in the issue report
        const variantConfig = [
          {
            name: 'pure',
            suffix: 'Model',
          },
        ];
        writeFileSync(
          join(testEnv.testDir, 'zod-generator.config.json'),
          JSON.stringify({ variants: variantConfig }, null, 2),
        );

        const schema = `
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

model Item {
  id         Int             @id @default(autoincrement())
  /// @zod.custom.use(z.enum(['volume', 'mass', 'length', 'area', 'each'])).describe("The unit measure that product is sold in.")
  unitType   String
}
`;
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();

        const variantFile = join(testEnv.outputDir, 'schemas', 'variants', 'ItemModel.schema.ts');
        expect(existsSync(variantFile)).toBe(true);

        const content = readFileSync(variantFile, 'utf-8');

        // Should use the complete custom expression, not append to base type
        expect(content).toMatch(
          /unitType:\s*z\.enum\(\['volume',\s*'mass',\s*'length',\s*'area',\s*'each'\]\)\.describe\("The unit measure that product is sold in\."\)/,
        );

        // Should NOT have the base type concatenated with custom.use
        expect(content).not.toMatch(/z\.string\(\)\.custom\.use/);

        // Should NOT have any .custom.use patterns
        expect(content).not.toMatch(/\.custom\.use/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
