import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TestEnvironment, ConfigGenerator, GENERATION_TIMEOUT } from './helpers';

/**
 * Feature test for array fields handling across all schema types
 *
 * This test verifies that Issue #174 and related array field bugs are fixed by:
 * 1. Creating actual Prisma schemas with array fields
 * 2. Running the real generator
 * 3. Checking the generated output files contain correct z.array() types
 *
 * Tests cover:
 * - Variant schemas (pure/input/result)
 * - Result schemas (CRUD operations)
 * - Aggregate and GroupBy operations
 * - All array types (String[], Int[], Float[], Boolean[], DateTime[])
 */

describe('Array Fields Feature Tests', () => {
  describe('Variant Schemas with Array Fields', () => {
    it(
      'should generate correct z.array() types in all variant schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('array-fields-variants');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: {
              pure: { enabled: true },
              input: { enabled: true },
              result: { enabled: true },
            },
          };

          // Create schema with comprehensive array field coverage
          const schema = `
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output = "./generated/schemas"
  config = "./config.json"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

model ArrayFieldModel {
  id              Int       @id @default(autoincrement())
  
  // String arrays - most common case from Issue #174
  tags            String[]
  keywords        String[]
  categories      String[]
  
  // Numeric arrays
  scores          Int[]
  ratings         Float[]
  
  // Boolean arrays
  flags           Boolean[]
  
  // DateTime arrays
  timestamps      DateTime[]
  
  // Regular fields for comparison
  name            String
  description     String?
  count           Int
  active          Boolean
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model SimpleModel {
  id     Int      @id @default(autoincrement())
  name   String
  tags   String[]  // Single array field to test in isolation
}`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Test pure variants
          const pureDir = join(variantsDir, 'pure');
          expect(existsSync(pureDir), 'Pure variants directory should exist').toBe(true);

          const arrayFieldModelPure = join(pureDir, 'ArrayFieldModel.pure.ts');
          const simpleModelPure = join(pureDir, 'SimpleModel.pure.ts');

          expect(existsSync(arrayFieldModelPure), 'ArrayFieldModel pure variant should exist').toBe(
            true,
          );
          expect(existsSync(simpleModelPure), 'SimpleModel pure variant should exist').toBe(true);

          if (existsSync(arrayFieldModelPure)) {
            const content = readFileSync(arrayFieldModelPure, 'utf-8');

            // Should contain proper array types, not scalar types
            expect(content).toContain('tags: z.array(z.string())');
            expect(content).toContain('keywords: z.array(z.string())');
            expect(content).toContain('categories: z.array(z.string())');
            expect(content).toContain('scores: z.array(z.number().int())');
            expect(content).toContain('ratings: z.array(z.number())');
            expect(content).toContain('flags: z.array(z.boolean())');
            expect(content).toContain('timestamps: z.array(z.date())');

            // Should NOT contain the bug patterns from Issue #174
            expect(content).not.toMatch(/tags:\s*z\.string\(\)[^.]/);
            expect(content).not.toMatch(/scores:\s*z\.number\(\)\.int\(\)[^.]/);
            expect(content).not.toMatch(/flags:\s*z\.boolean\(\)[^.]/);

            // Regular fields should remain unchanged
            expect(content).toContain('name: z.string()');
            expect(content).toContain('count: z.number().int()');
            expect(content).toContain('active: z.boolean()');
          }

          // Test input variants
          const inputDir = join(variantsDir, 'input');
          expect(existsSync(inputDir), 'Input variants directory should exist').toBe(true);

          const arrayFieldModelInput = join(inputDir, 'ArrayFieldModel.input.ts');
          expect(
            existsSync(arrayFieldModelInput),
            'ArrayFieldModel input variant should exist',
          ).toBe(true);

          if (existsSync(arrayFieldModelInput)) {
            const content = readFileSync(arrayFieldModelInput, 'utf-8');

            // Input variants should also have correct array types
            expect(content).toContain('tags: z.array(z.string())');
            expect(content).toContain('scores: z.array(z.number().int())');
            expect(content).toContain('flags: z.array(z.boolean())');

            // Should not have the original bug
            expect(content).not.toMatch(/tags:\s*z\.string\(\)[^.]/);
          }

          // Test result variants
          const resultDir = join(variantsDir, 'result');
          expect(existsSync(resultDir), 'Result variants directory should exist').toBe(true);

          const arrayFieldModelResult = join(resultDir, 'ArrayFieldModel.result.ts');
          expect(
            existsSync(arrayFieldModelResult),
            'ArrayFieldModel result variant should exist',
          ).toBe(true);

          if (existsSync(arrayFieldModelResult)) {
            const content = readFileSync(arrayFieldModelResult, 'utf-8');

            // Result variants should also have correct array types
            expect(content).toContain('tags: z.array(z.string())');
            expect(content).toContain('scores: z.array(z.number().int())');
            expect(content).toContain('flags: z.array(z.boolean())');
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Result Schemas with Array Fields', () => {
    it(
      'should generate correct z.array() types in CRUD result schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('array-fields-results');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output = "./generated/schemas"
  config = "./config.json"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

model BlogPost {
  id          Int      @id @default(autoincrement())
  title       String
  content     String?
  tags        String[]  // The array field from Issue #174
  viewCounts  Int[]     // Additional array field for testing
  published   Boolean  @default(false)
  authorId    Int
  createdAt   DateTime @default(now())
}`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');
          expect(existsSync(resultsDir), 'Results directory should exist').toBe(true);

          // Test all CRUD result schemas
          const expectedResultFiles = [
            'BlogPostCreateResult.schema.ts',
            'BlogPostUpdateResult.schema.ts',
            'BlogPostDeleteResult.schema.ts',
            'BlogPostUpsertResult.schema.ts',
            'BlogPostFindUniqueResult.schema.ts',
            'BlogPostFindFirstResult.schema.ts',
            'BlogPostFindManyResult.schema.ts',
          ];

          expectedResultFiles.forEach((resultFile) => {
            const filePath = join(resultsDir, resultFile);
            expect(existsSync(filePath), `Result schema should exist: ${resultFile}`).toBe(true);

            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Should be valid Zod schema
              expect(content).toMatch(/import.*z.*from.*zod/);
              expect(content).toMatch(/export const.*ResultSchema/);

              // Should contain correct array types
              expect(content).toContain('tags: z.array(z.string())');
              expect(content).toContain('viewCounts: z.array(z.number().int())');

              // Should NOT contain the bug patterns
              expect(content).not.toMatch(/tags:\s*z\.string\(\)[^.]/);
              expect(content).not.toMatch(/viewCounts:\s*z\.number\(\)\.int\(\)[^.]/);

              // Regular fields should be correct
              expect(content).toContain('title: z.string()');
              expect(content).toContain('published: z.boolean()');
            }
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Aggregate and GroupBy with Array Fields', () => {
    it(
      'should handle array fields correctly in aggregate and groupBy operations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('array-fields-aggregates');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output = "./generated/schemas"
  config = "./config.json"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

model MetricsModel {
  id        Int      @id @default(autoincrement())
  name      String
  tags      String[] // Array field for testing
  scores    Int[]    // Numeric array field
  ratings   Float[]  // Float array field
  count     Int      // Regular numeric field for comparison
  createdAt DateTime @default(now())
}`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Test Aggregate result schema
          const aggregateFile = join(resultsDir, 'MetricsModelAggregateResult.schema.ts');
          expect(existsSync(aggregateFile), 'Aggregate result schema should exist').toBe(true);

          if (existsSync(aggregateFile)) {
            const content = readFileSync(aggregateFile, 'utf-8');

            // _count should count array elements (returns number)
            expect(content).toContain('tags: z.number()');
            expect(content).toContain('scores: z.number()');

            // Note: Min/max behavior on arrays varies by database
            // PostgreSQL min/max on arrays should return arrays, not single values
            // This tests the current expected behavior
          }

          // Test GroupBy result schema
          const groupByFile = join(resultsDir, 'MetricsModelGroupByResult.schema.ts');
          expect(existsSync(groupByFile), 'GroupBy result schema should exist').toBe(true);

          if (existsSync(groupByFile)) {
            const content = readFileSync(groupByFile, 'utf-8');

            // GroupBy should include the original array fields with correct types
            expect(content).toContain('tags: z.array(z.string())');
            expect(content).toContain('scores: z.array(z.number().int())');
            expect(content).toContain('ratings: z.array(z.number())');

            // Should not have the bug patterns
            expect(content).not.toMatch(/tags:\s*z\.string\(\)[^.]/);
            expect(content).not.toMatch(/scores:\s*z\.number\(\)\.int\(\)[^.]/);

            // Regular fields should be present and correct
            expect(content).toContain('name: z.string()');
            expect(content).toContain('count: z.number().int()');
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Multiple Array Types Integration', () => {
    it(
      'should correctly handle all Prisma array types in a comprehensive model',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('array-fields-comprehensive');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: {
              pure: { enabled: true },
              input: { enabled: true },
            },
            generateResultSchemas: true,
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output = "./generated/schemas"  
  config = "./config.json"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

model ComprehensiveArrayModel {
  id              Int       @id @default(autoincrement())
  
  // All supported array types
  stringArrays    String[]
  intArrays       Int[]
  floatArrays     Float[]
  booleanArrays   Boolean[]
  dateTimeArrays  DateTime[]
  bigIntArrays    BigInt[]
  
  // Mixed with regular fields
  title           String
  count           Int
  price           Float
  active          Boolean
  timestamp       DateTime
  largeNumber     BigInt
}`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          // Expected array type mappings
          const expectedArrayMappings = {
            stringArrays: 'z.array(z.string())',
            intArrays: 'z.array(z.number().int())',
            floatArrays: 'z.array(z.number())',
            booleanArrays: 'z.array(z.boolean())',
            dateTimeArrays: 'z.array(z.date())',
            bigIntArrays: 'z.array(z.bigint())',
          };

          // Expected scalar type mappings (should remain unchanged)
          const expectedScalarMappings = {
            title: 'z.string()',
            count: 'z.number().int()',
            price: 'z.number()',
            active: 'z.boolean()',
            timestamp: 'z.date()',
            largeNumber: 'z.bigint()',
          };

          // Test pure variant
          const pureFile = join(
            testEnv.outputDir,
            'schemas',
            'variants',
            'pure',
            'ComprehensiveArrayModel.pure.ts',
          );
          expect(existsSync(pureFile), 'Pure variant should exist').toBe(true);

          if (existsSync(pureFile)) {
            const content = readFileSync(pureFile, 'utf-8');

            // Test all array types
            Object.entries(expectedArrayMappings).forEach(([fieldName, expectedType]) => {
              expect(
                content,
                `Pure variant should contain correct type for ${fieldName}`,
              ).toContain(`${fieldName}: ${expectedType}`);
            });

            // Test scalar types remain correct
            Object.entries(expectedScalarMappings).forEach(([fieldName, expectedType]) => {
              expect(
                content,
                `Pure variant should contain correct type for ${fieldName}`,
              ).toContain(`${fieldName}: ${expectedType}`);
            });
          }

          // Test create result
          const createResultFile = join(
            testEnv.outputDir,
            'schemas',
            'results',
            'ComprehensiveArrayModelCreateResult.schema.ts',
          );
          expect(existsSync(createResultFile), 'Create result should exist').toBe(true);

          if (existsSync(createResultFile)) {
            const content = readFileSync(createResultFile, 'utf-8');

            // Test all array types in result schemas
            Object.entries(expectedArrayMappings).forEach(([fieldName, expectedType]) => {
              expect(
                content,
                `Create result should contain correct type for ${fieldName}`,
              ).toContain(`${fieldName}: ${expectedType}`);
            });
          }

          // Test GroupBy result for array inclusion
          const groupByFile = join(
            testEnv.outputDir,
            'schemas',
            'results',
            'ComprehensiveArrayModelGroupByResult.schema.ts',
          );
          expect(existsSync(groupByFile), 'GroupBy result should exist').toBe(true);

          if (existsSync(groupByFile)) {
            const content = readFileSync(groupByFile, 'utf-8');

            // GroupBy should include all array fields
            Object.entries(expectedArrayMappings).forEach(([fieldName, expectedType]) => {
              expect(content, `GroupBy should include array field ${fieldName}`).toContain(
                `${fieldName}: ${expectedType}`,
              );
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Issue #174 Regression Test', () => {
    it(
      'should specifically test the exact case from Issue #174',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-174-regression');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: {
              pure: { enabled: true },
              input: { enabled: true },
            },
          };

          // Recreate the exact schema from Issue #174
          const schema = `
generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output = "./generated/schemas"
  config = "./config.json"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test:test@localhost:5432/test"
}

model TestModelSchema {
  id          String   @id @default(uuid())
  ipWhitelist String[]
}`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          // Test the specific files mentioned in Issue #174
          const pureFile = join(
            testEnv.outputDir,
            'schemas',
            'variants',
            'pure',
            'TestModelSchema.pure.ts',
          );
          const inputFile = join(
            testEnv.outputDir,
            'schemas',
            'variants',
            'input',
            'TestModelSchema.input.ts',
          );

          expect(existsSync(pureFile), 'Pure variant should exist').toBe(true);
          expect(existsSync(inputFile), 'Input variant should exist').toBe(true);

          if (existsSync(pureFile)) {
            const content = readFileSync(pureFile, 'utf-8');

            // The fix: should contain z.array(z.string())
            expect(content).toContain('ipWhitelist: z.array(z.string())');

            // The bug: should NOT contain z.string() for the array field
            expect(content).not.toMatch(/ipWhitelist:\s*z\.string\(\)[^.]/);
          }

          if (existsSync(inputFile)) {
            const content = readFileSync(inputFile, 'utf-8');

            // Input variant should also be fixed
            expect(content).toContain('ipWhitelist: z.array(z.string())');
            expect(content).not.toMatch(/ipWhitelist:\s*z\.string\(\)[^.]/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
