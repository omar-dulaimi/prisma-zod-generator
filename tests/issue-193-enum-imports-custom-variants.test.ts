import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

// Tests for Issue #193: Enums not being imported in schemas when using custom variants

describe('Issue #193: Enum imports with custom variants', () => {
  it(
    'should import enum when referenced in custom variant schema',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('issue-193-enum-imports');
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

enum UnitType {
  volume
  mass
  length
  area
  each
}

model Item {
  id         Int             @id @default(autoincrement())
  /// @zod.describe("The unit measure that product is sold in.")
  unitType   UnitType
}
`;
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();

        const variantFile = join(
          testEnv.outputDir,
          'schemas',
          'variants',
          'ItemModel.schema.ts',
        );
        expect(existsSync(variantFile)).toBe(true);
        
        const content = readFileSync(variantFile, 'utf-8');
        
        // Should have the enum reference
        expect(content).toMatch(/z\.enum\(UnitType\)/);
        
        // Should have the enum import
        expect(content).toMatch(/import.*\{.*UnitType.*\}.*from.*@prisma\/client/);
        
        // Should have the description
        expect(content).toMatch(/describe\("The unit measure that product is sold in\."\)/);
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});