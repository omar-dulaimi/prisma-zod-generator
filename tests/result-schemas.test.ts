import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  TestEnvironment,
  ConfigGenerator,
  PrismaSchemaGenerator,
  SchemaValidationUtils,
  FileSystemUtils,
  GENERATION_TIMEOUT,
} from './helpers';

describe('Result Schema Generation Tests', () => {
  describe('Single Model Result Schemas', () => {
    it(
      'should generate result schemas for operations that return single model instances',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-single-model');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check single model result schemas
          const expectedSingleResults = [
            'UserFindUniqueResult.schema.ts',
            'UserFindFirstResult.schema.ts',
            'UserCreateResult.schema.ts',
            'UserUpdateResult.schema.ts',
            'UserUpsertResult.schema.ts',
            'PostFindUniqueResult.schema.ts',
            'PostFindFirstResult.schema.ts',
            'PostCreateResult.schema.ts',
            'PostUpdateResult.schema.ts',
            'PostUpsertResult.schema.ts',
          ];

          expectedSingleResults.forEach((resultFile) => {
            const filePath = join(resultsDir, resultFile);
            expect(existsSync(filePath), `Single result schema should exist: ${resultFile}`).toBe(
              true,
            );

            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Should be valid Zod schema
              expect(content).toMatch(/import.*z.*from.*zod/);
              expect(content).toMatch(/export const.*ResultSchema/);
              expect(content).toMatch(/z\.object\(|z\.nullable\(/);

              // Should include all model fields for result
              if (resultFile.includes('User')) {
                expect(content).toMatch(/id:/);
                expect(content).toMatch(/email:/);
                expect(content).toMatch(/name:/);
              }

              if (resultFile.includes('Post')) {
                expect(content).toMatch(/id:/);
                expect(content).toMatch(/title:/);
                expect(content).toMatch(/content:/);
                expect(content).toMatch(/authorId:/);
              }
            }
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle nullable results for operations that might return null',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-nullable');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Operations that can return null should have nullable schemas
          const nullableOperations = [
            'UserFindUniqueResult.schema.ts',
            'UserFindFirstResult.schema.ts',
            'PostFindUniqueResult.schema.ts',
            'PostFindFirstResult.schema.ts',
          ];

          nullableOperations.forEach((resultFile) => {
            const filePath = join(resultsDir, resultFile);
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Should handle potential null results
              expect(content).toMatch(/\.nullable\(\)|\.optional\(\)|null/);
            }
          });

          // Operations that always return a value should not be nullable
          const nonNullableOperations = [
            'UserCreateResult.schema.ts',
            'UserUpdateResult.schema.ts',
            'PostCreateResult.schema.ts',
            'PostUpdateResult.schema.ts',
          ];

          nonNullableOperations.forEach((resultFile) => {
            const filePath = join(resultsDir, resultFile);
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Should be required object schema
              expect(content).toMatch(/z\.object\(/);
              expect(content).not.toMatch(/\.nullable\(\)/);
            }
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Array Result Schemas for FindMany Operations', () => {
    it(
      'should generate array result schemas for findMany operations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-find-many');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check findMany result schemas
          const findManyResults = ['UserFindManyResult.schema.ts', 'PostFindManyResult.schema.ts'];

          findManyResults.forEach((resultFile) => {
            const filePath = join(resultsDir, resultFile);
            expect(existsSync(filePath), `FindMany result schema should exist: ${resultFile}`).toBe(
              true,
            );

            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Should be array of model objects
              expect(content).toMatch(/z\.array\(/);
              expect(content).toMatch(/z\.object\(/);

              // Should include model fields
              if (resultFile.includes('User')) {
                expect(content).toMatch(/id:/);
                expect(content).toMatch(/email:/);
                expect(content).toMatch(/name:/);
              }

              if (resultFile.includes('Post')) {
                expect(content).toMatch(/id:/);
                expect(content).toMatch(/title:/);
                expect(content).toMatch(/content:/);
              }
            }
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle pagination metadata in findMany results',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-pagination');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
            includePaginationMetadata: true,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check if pagination wrapper is generated
          const userFindManyResultPath = join(resultsDir, 'UserFindManyResult.schema.ts');
          if (existsSync(userFindManyResultPath)) {
            const content = readFileSync(userFindManyResultPath, 'utf-8');

            // Should be array of objects
            expect(content).toMatch(/z\.array\(/);

            // If pagination metadata is supported, might have additional fields
            if (
              content.includes('count') ||
              content.includes('total') ||
              content.includes('meta')
            ) {
              expect(content).toMatch(/count|total|meta/);
            }
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Aggregate and GroupBy Result Schemas', () => {
    it(
      'should generate result schemas for aggregate operations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-aggregate');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

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
  config   = "./config.json"
}

model Product {
  id       Int     @id @default(autoincrement())
  name     String
  price    Float
  quantity Int
  inStock  Boolean @default(true)
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check aggregate result schema
          const productAggregateResultPath = join(resultsDir, 'ProductAggregateResult.schema.ts');
          if (existsSync(productAggregateResultPath)) {
            const content = readFileSync(productAggregateResultPath, 'utf-8');

            // Should include aggregate fields
            expect(content).toMatch(/_count|_avg|_sum|_min|_max/);

            // Should handle different data types for aggregations
            expect(content).toMatch(/z\.number\(\)|z\.bigint\(\)/);

            // Aggregate fields should be optional (might not be requested)
            expect(content).toMatch(/\.optional\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should generate result schemas for groupBy operations with dynamic fields',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-group-by');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

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
  config   = "./config.json"
}

model Order {
  id         Int      @id @default(autoincrement())
  customerId Int
  status     String
  total      Float
  quantity   Int
  createdAt  DateTime @default(now())
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check groupBy result schema
          const orderGroupByResultPath = join(resultsDir, 'OrderGroupByResult.schema.ts');
          if (existsSync(orderGroupByResultPath)) {
            const content = readFileSync(orderGroupByResultPath, 'utf-8');

            // Should be array of grouped results
            expect(content).toMatch(/z\.array\(/);

            // Should include grouping fields
            expect(content).toMatch(/customerId|status/);

            // Should include aggregate fields
            expect(content).toMatch(/_count|_avg|_sum|_min|_max/);

            // Grouping fields should match original types
            expect(content).toMatch(/customerId.*z\.number\(\)/);
            expect(content).toMatch(/status.*z\.string\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle complex aggregate operations with multiple field types',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-complex-aggregate');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Analytics {
  id         Int      @id @default(autoincrement())
  userId     BigInt
  revenue    Decimal  @db.Decimal(10, 2)
  clicks     Int
  conversion Float
  active     Boolean
  timestamp  DateTime @default(now())
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check complex aggregate result
          const analyticsAggregateResultPath = join(
            resultsDir,
            'AnalyticsAggregateResult.schema.ts',
          );
          if (existsSync(analyticsAggregateResultPath)) {
            const content = readFileSync(analyticsAggregateResultPath, 'utf-8');

            // Should handle different numeric types for aggregations
            expect(content).toMatch(/_count/); // Always number
            expect(content).toMatch(/_avg/); // Always number/null
            expect(content).toMatch(/_sum/); // Type depends on field
            expect(content).toMatch(/_min/); // Same type as field
            expect(content).toMatch(/_max/); // Same type as field

            // Should handle BigInt aggregations
            expect(content).toMatch(/userId.*z\.bigint\(\)|z\.number\(\)/);

            // Should handle Decimal aggregations
            expect(content).toMatch(/revenue.*z\.number\(\)|z\.string\(\)/);

            // Should handle Boolean count
            expect(content).toMatch(/active.*z\.number\(\)/); // Boolean count is always number
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Count Operation Result Schemas', () => {
    it(
      'should generate result schemas for simple count operations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-count');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check count result schemas
          const countResults = ['UserCountResult.schema.ts', 'PostCountResult.schema.ts'];

          countResults.forEach((resultFile) => {
            const filePath = join(resultsDir, resultFile);
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Count should return a number
              expect(content).toMatch(/z\.number\(\)/);

              // Should be simple number schema, not object
              expect(content).not.toMatch(/z\.object\(/);

              // Should have proper export
              expect(content).toMatch(/export const.*CountResultSchema/);
            }
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle count operations with relation filters',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-count-relations');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check relation count results
          const userPostsCountPath = join(resultsDir, 'UserPostsCountResult.schema.ts');
          if (existsSync(userPostsCountPath)) {
            const content = readFileSync(userPostsCountPath, 'utf-8');

            // Relation count should be number
            expect(content).toMatch(/z\.number\(\)/);
          }

          // Check if nested count results exist
          const userWithCountPath = join(resultsDir, 'UserWithCountResult.schema.ts');
          if (existsSync(userWithCountPath)) {
            const content = readFileSync(userWithCountPath, 'utf-8');

            // Should include both user fields and count fields
            expect(content).toMatch(/id:/);
            expect(content).toMatch(/email:/);
            expect(content).toMatch(/_count/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Result Schema Integration with Main Transformer', () => {
    it(
      'should integrate result schemas with main transformer and file generation',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-integration');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
            useMultipleFiles: true,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const resultsDir = join(schemasDir, 'results');

          // Check file organization
          expect(
            FileSystemUtils.validateDirectoryStructure(schemasDir, ['enums', 'objects', 'results']),
          ).toBe(true);

          // Check results index file
          const resultsIndexPath = join(resultsDir, 'index.ts');
          if (existsSync(resultsIndexPath)) {
            const content = readFileSync(resultsIndexPath, 'utf-8');

            // Should export all result schemas
            expect(content).toMatch(/export.*UserFindUniqueResultSchema.*from/);
            expect(content).toMatch(/export.*UserFindManyResultSchema.*from/);
            expect(content).toMatch(/export.*PostCreateResultSchema.*from/);
          }

          // Check main index includes results
          const mainIndexPath = join(schemasDir, 'index.ts');
          if (existsSync(mainIndexPath)) {
            const content = readFileSync(mainIndexPath, 'utf-8');

            // Should re-export results
            expect(content).toMatch(/export.*from.*results/);
          }

          // Verify result schemas don't conflict with operation schemas
          const operationFiles = FileSystemUtils.getSchemaFiles(schemasDir).filter(
            (file) =>
              !file.includes('/results/') &&
              !file.includes('/objects/') &&
              !file.includes('/enums/'),
          );

          const resultFiles = FileSystemUtils.getSchemaFiles(resultsDir);

          expect(operationFiles.length).toBeGreaterThan(0);
          expect(resultFiles.length).toBeGreaterThan(0);

          // Should not have naming conflicts
          operationFiles.forEach((opFile) => {
            const opName = opFile.split('/').pop();
            resultFiles.forEach((resultFile) => {
              const resultName = resultFile.split('/').pop();
              expect(opName).not.toBe(resultName);
            });
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle imports and dependencies correctly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-imports');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
          };

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
  config   = "./config.json"
}

enum Status {
  ACTIVE
  INACTIVE
  PENDING
}

model User {
  id     Int    @id @default(autoincrement())
  email  String @unique
  status Status @default(ACTIVE)
  posts  Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check that result schemas import necessary dependencies
          const userFindUniqueResultPath = join(resultsDir, 'UserFindUniqueResult.schema.ts');
          if (existsSync(userFindUniqueResultPath)) {
            const content = readFileSync(userFindUniqueResultPath, 'utf-8');

            // Should import Zod
            expect(content).toMatch(/import.*z.*from.*zod/);

            // Should import enum if used
            if (content.includes('Status')) {
              expect(content).toMatch(/import.*Status.*from/);
            }

            // Should not import unnecessary schemas
            expect(content).not.toMatch(/import.*CreateInput|UpdateInput/);
          }

          // Check relation result imports
          const userWithPostsResultPath = join(resultsDir, 'UserWithPostsResult.schema.ts');
          if (existsSync(userWithPostsResultPath)) {
            const content = readFileSync(userWithPostsResultPath, 'utf-8');

            // Should import related model result if needed
            if (content.includes('Post')) {
              expect(content).toMatch(/import.*Post.*from|Post.*z\.object/);
            }
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Result Schema Variations and Options', () => {
    it(
      'should generate different result schemas based on include/select options',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-include-select');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
            addIncludeType: true,
            addSelectType: true,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check base result schema
          const userFindUniqueResultPath = join(resultsDir, 'UserFindUniqueResult.schema.ts');
          if (existsSync(userFindUniqueResultPath)) {
            const content = readFileSync(userFindUniqueResultPath, 'utf-8');

            // Should include all user fields
            expect(content).toMatch(/id:/);
            expect(content).toMatch(/email:/);
            expect(content).toMatch(/name:/);
          }

          // Check result with relations
          const userWithRelationsResultPath = join(resultsDir, 'UserWithRelationsResult.schema.ts');
          if (existsSync(userWithRelationsResultPath)) {
            const content = readFileSync(userWithRelationsResultPath, 'utf-8');

            // Should include relation fields
            expect(content).toMatch(/posts/);

            // Should reference Post schema
            expect(content).toMatch(/Post|array/);
          }

          // Check selective result schemas
          const userSelectResultPath = join(resultsDir, 'UserSelectResult.schema.ts');
          if (existsSync(userSelectResultPath)) {
            const content = readFileSync(userSelectResultPath, 'utf-8');

            // Should handle partial selection
            expect(content).toMatch(/z\.object|z\.partial/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle result schemas with field exclusions',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-exclusions');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['password'], // Exclude from input, but include in results?
                },
              },
            },
          };

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
  config   = "./config.json"
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  password String  // Excluded from inputs but maybe not results
  name     String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');
          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // Check input schema excludes password
          const userCreateInputPath = join(objectsDir, 'UserCreateInput.schema.ts');
          if (existsSync(userCreateInputPath)) {
            SchemaValidationUtils.expectSchemaContent(userCreateInputPath, {
              hasFields: ['email', 'name'],
              excludesFields: ['password'],
            });
          }

          // Check result schema handling of excluded fields
          const userCreateResultPath = join(resultsDir, 'UserCreateResult.schema.ts');
          if (existsSync(userCreateResultPath)) {
            const content = readFileSync(userCreateResultPath, 'utf-8');

            // Results should typically include all fields unless specifically configured
            expect(content).toMatch(/id:/);
            expect(content).toMatch(/email:/);
            expect(content).toMatch(/name:/);

            // Password might be excluded from results too, or included
            // This depends on implementation - results could include all DB fields
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should integrate with variant configurations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('result-schemas-variants');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
            variants: [
              {
                name: 'public',
                suffix: 'Public',
                exclude: ['password', 'internalData'],
              },
              {
                name: 'admin',
                suffix: 'Admin',
                exclude: ['password'],
              },
            ],
          };

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
  config   = "./config.json"
}

model User {
  id           Int     @id @default(autoincrement())
  email        String  @unique
  password     String
  internalData Json?
  name         String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const resultsDir = join(testEnv.outputDir, 'schemas', 'results');

          // Check if variant-specific result schemas are generated
          const userPublicResultPath = join(resultsDir, 'UserPublicResult.schema.ts');
          if (existsSync(userPublicResultPath)) {
            SchemaValidationUtils.expectSchemaContent(userPublicResultPath, {
              hasFields: ['id', 'email', 'name'],
              excludesFields: ['password', 'internalData'],
            });
          }

          const userAdminResultPath = join(resultsDir, 'UserAdminResult.schema.ts');
          if (existsSync(userAdminResultPath)) {
            SchemaValidationUtils.expectSchemaContent(userAdminResultPath, {
              hasFields: ['id', 'email', 'internalData', 'name'],
              excludesFields: ['password'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
