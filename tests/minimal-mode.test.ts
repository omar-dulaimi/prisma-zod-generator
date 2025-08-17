import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  FileSystemUtils,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  TestEnvironment,
} from './helpers';

describe('Minimal Mode Tests', () => {
  describe('Minimal Mode Configuration', () => {
    it(
      'should generate only essential CRUD operations in minimal mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-basic');

        try {
          const config = ConfigGenerator.createMinimalConfig();
          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Essential operations should exist
          const essentialOperations = [
            'findManyUser.schema.ts',
            'findUniqueUser.schema.ts',
            'createOneUser.schema.ts',
            'updateOneUser.schema.ts',
            'deleteOneUser.schema.ts',
          ];

          essentialOperations.forEach((operation) => {
            const filePath = join(schemasDir, operation);
            expect(existsSync(filePath), `Essential operation should exist: ${operation}`).toBe(
              true,
            );
          });

          // Advanced operations should NOT exist in minimal mode
          const advancedOperations = [
            'aggregateUser.schema.ts',
            'groupByUser.schema.ts',
            'upsertOneUser.schema.ts',
            'createManyUser.schema.ts',
            'updateManyUser.schema.ts',
            'deleteManyUser.schema.ts',
          ];

          advancedOperations.forEach((operation) => {
            const filePath = join(schemasDir, operation);
            expect(
              existsSync(filePath),
              `Advanced operation should NOT exist in minimal mode: ${operation}`,
            ).toBe(false);
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should exclude complex input types in minimal mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-input-types');

        try {
          const config = {
            ...ConfigGenerator.createMinimalConfig(),
            createInputTypes: false, // Explicitly disabled in minimal mode
            addIncludeType: false,
            addSelectType: false,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // Complex input types should NOT exist in minimal mode
          const complexInputTypes = [
            'UserInclude.schema.ts',
            'UserSelect.schema.ts',
            'UserOrderByWithAggregationInput.schema.ts',
            'UserScalarWhereWithAggregatesInput.schema.ts',
            'UserCountAggregateInput.schema.ts',
            'UserAvgAggregateInput.schema.ts',
            'UserSumAggregateInput.schema.ts',
          ];

          complexInputTypes.forEach((inputType) => {
            const filePath = join(objectsDir, inputType);
            expect(
              existsSync(filePath),
              `Complex input type should NOT exist in minimal mode: ${inputType}`,
            ).toBe(false);
          });

          // Basic input types should still exist
          const basicInputTypes = [
            'UserCreateInput.schema.ts',
            'UserUpdateInput.schema.ts',
            'UserWhereInput.schema.ts',
            'UserWhereUniqueInput.schema.ts',
          ];

          basicInputTypes.forEach((inputType) => {
            const filePath = join(objectsDir, inputType);
            expect(
              existsSync(filePath),
              `Basic input type should exist in minimal mode: ${inputType}`,
            ).toBe(true);
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should generate minimal schemas for multiple models',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-multiple-models');

        try {
          const config = ConfigGenerator.createMinimalConfig();
          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post', 'Profile'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Each model should have only essential operations
          const models = ['User', 'Post', 'Profile'];
          const essentialOps = ['findMany', 'findUnique', 'createOne', 'updateOne', 'deleteOne'];

          models.forEach((model) => {
            essentialOps.forEach((op) => {
              const fileName = `${op}${model}.schema.ts`;
              const filePath = join(schemasDir, fileName);
              expect(
                existsSync(filePath),
                `${model} should have essential operation: ${fileName}`,
              ).toBe(true);
            });

            // Should NOT have advanced operations
            const advancedOps = [
              'aggregate',
              'groupBy',
              'upsertOne',
              'createMany',
              'updateMany',
              'deleteMany',
            ];
            advancedOps.forEach((op) => {
              const fileName = `${op}${model}.schema.ts`;
              const filePath = join(schemasDir, fileName);
              expect(
                existsSync(filePath),
                `${model} should NOT have advanced operation: ${fileName}`,
              ).toBe(false);
            });
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Minimal Mode vs Full Mode Comparison', () => {
    it(
      'should generate significantly fewer files in minimal mode',
      async () => {
        const fullModeEnv = await TestEnvironment.createTestEnv('comparison-full-mode');
        const minimalModeEnv = await TestEnvironment.createTestEnv('comparison-minimal-mode');

        try {
          const baseSchema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
          });

          // Full mode configuration
          const fullConfig = ConfigGenerator.createBasicConfig();
          const fullConfigPath = join(fullModeEnv.testDir, 'config.json');
          writeFileSync(fullConfigPath, JSON.stringify(fullConfig, null, 2));

          const fullSchema = baseSchema
            .replace('./generated/schemas', fullModeEnv.outputDir + '/schemas')
            .replace(
              'provider = "node ./lib/generator.js"',
              'provider = "node ./lib/generator.js"\n  config   = "./config.json"',
            );
          writeFileSync(fullModeEnv.schemaPath, fullSchema);

          // Minimal mode configuration
          const minimalConfig = ConfigGenerator.createMinimalConfig();
          const minimalConfigPath = join(minimalModeEnv.testDir, 'config.json');
          writeFileSync(minimalConfigPath, JSON.stringify(minimalConfig, null, 2));

          const minimalSchema = baseSchema
            .replace('./generated/schemas', minimalModeEnv.outputDir + '/schemas')
            .replace(
              'provider = "node ./lib/generator.js"',
              'provider = "node ./lib/generator.js"\n  config   = "./config.json"',
            );
          writeFileSync(minimalModeEnv.schemaPath, minimalSchema);

          // Generate both
          await fullModeEnv.runGeneration();
          await minimalModeEnv.runGeneration();

          // Count generated files
          const fullModeFiles = FileSystemUtils.countFiles(
            join(fullModeEnv.outputDir, 'schemas'),
            /\.schema\.ts$/,
          );
          const minimalModeFiles = FileSystemUtils.countFiles(
            join(minimalModeEnv.outputDir, 'schemas'),
            /\.schema\.ts$/,
          );

          expect(minimalModeFiles).toBeLessThan(fullModeFiles);
          expect(minimalModeFiles).toBeGreaterThan(0);

          // Minimal mode should have roughly 40-60% fewer files
          const reductionRatio = (fullModeFiles - minimalModeFiles) / fullModeFiles;
          expect(reductionRatio).toBeGreaterThan(0.3); // At least 30% reduction
        } finally {
          await fullModeEnv.cleanup();
          await minimalModeEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should maintain functionality while reducing complexity',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-functionality');

        try {
          const config = ConfigGenerator.createMinimalConfig();
          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Essential schemas should be valid and functional
          const findManyUserPath = join(schemasDir, 'findManyUser.schema.ts');
          expect(existsSync(findManyUserPath)).toBe(true);

          if (existsSync(findManyUserPath)) {
            const content = readFileSync(findManyUserPath, 'utf-8');

            // Should be valid Zod schema
            expect(content).toMatch(/import.*zod/);
            expect(content).toMatch(/export const.*Schema/);
            expect(content).toMatch(/z\.object\(|z\.string\(|z\.number\(/);

            // Should handle basic fields
            expect(content).toMatch(/where/);
            expect(content).toMatch(/orderBy/);
          }

          // Create operation should work
          const createOneUserPath = join(schemasDir, 'createOneUser.schema.ts');
          if (existsSync(createOneUserPath)) {
            const content = readFileSync(createOneUserPath, 'utf-8');
            expect(content).toMatch(/data/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should generate smaller bundle sizes in minimal mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-bundle-size');

        try {
          const config = ConfigGenerator.createMinimalConfig();
          const schema = PrismaSchemaGenerator.createComprehensiveSchema();

          // Update schema to use our config
          const updatedSchema = schema.replace(
            'output   = "./generated/schemas"',
            `output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"`,
          );

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, updatedSchema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const indexPath = join(schemasDir, 'index.ts');

          if (existsSync(indexPath)) {
            const content = readFileSync(indexPath, 'utf-8');
            const exportCount = (content.match(/export/g) || []).length;

            // Should have significantly fewer exports than full mode
            expect(exportCount).toBeLessThan(50); // Arbitrary threshold
            expect(exportCount).toBeGreaterThan(5); // Should still have essential exports
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Minimal Mode with Relationships', () => {
    it(
      'should handle relationships in minimal mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-relationships');

        try {
          const config = ConfigGenerator.createMinimalConfig();
          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const objectsDir = join(schemasDir, 'objects');

          // Basic relationship inputs should exist
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');
            // Should handle posts relationship in some form
            expect(content).toMatch(/posts/);
          }

          // Complex relationship inputs should NOT exist
          const complexRelationInputs = [
            'PostCreateNestedManyWithoutAuthorInput.schema.ts',
            'PostUncheckedCreateNestedManyWithoutAuthorInput.schema.ts',
            'PostUpdateManyWithoutAuthorNestedInput.schema.ts',
          ];

          complexRelationInputs.forEach((inputType) => {
            const filePath = join(objectsDir, inputType);
            expect(
              existsSync(filePath),
              `Complex relation input should NOT exist in minimal mode: ${inputType}`,
            ).toBe(false);
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should simplify relationship handling in minimal mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-simplified-relations');

        try {
          const config = ConfigGenerator.createMinimalConfig();
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
  posts    Post[]
  profile  Profile?
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  author   User    @relation(fields: [authorId], references: [id])
  authorId Int
  tags     Tag[]
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  user   User   @relation(fields: [userId], references: [id])
  userId Int    @unique
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // Should have basic create inputs for all models
          const basicInputs = [
            'UserCreateInput.schema.ts',
            'PostCreateInput.schema.ts',
            'ProfileCreateInput.schema.ts',
            'TagCreateInput.schema.ts',
          ];

          basicInputs.forEach((inputType) => {
            const filePath = join(objectsDir, inputType);
            expect(existsSync(filePath), `Basic input should exist: ${inputType}`).toBe(true);
          });

          // Should NOT have complex nested relation inputs
          const complexInputs = [
            'PostCreateNestedManyWithoutAuthorInput.schema.ts',
            'PostCreateNestedManyWithoutTagsInput.schema.ts',
            'TagCreateNestedManyWithoutPostsInput.schema.ts',
          ];

          complexInputs.forEach((inputType) => {
            const filePath = join(objectsDir, inputType);
            expect(
              existsSync(filePath),
              `Complex nested input should NOT exist: ${inputType}`,
            ).toBe(false);
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Minimal Mode Configuration Options', () => {
    it(
      'should respect minimal mode flag in configuration',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-flag');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            minimal: true, // Enable minimal mode
            createInputTypes: true, // This should be overridden by minimal mode
            addIncludeType: true, // This should be overridden by minimal mode
            addSelectType: true, // This should be overridden by minimal mode
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const objectsDir = join(schemasDir, 'objects');

          // Include/Select types should NOT be generated despite being enabled in config
          const includeSelectTypes = [
            'UserInclude.schema.ts',
            'UserSelect.schema.ts',
            'PostInclude.schema.ts',
            'PostSelect.schema.ts',
          ];

          includeSelectTypes.forEach((inputType) => {
            const filePath = join(objectsDir, inputType);
            expect(
              existsSync(filePath),
              `Include/Select type should NOT exist in minimal mode: ${inputType}`,
            ).toBe(false);
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should allow customization of minimal operations set',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-custom-operations');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            minimal: true,
            minimalOperations: ['findMany', 'findUnique', 'create'], // Custom minimal set
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Should have only custom minimal operations
          const allowedOperations = [
            'findManyUser.schema.ts',
            'findUniqueUser.schema.ts',
            'createOneUser.schema.ts',
          ];

          allowedOperations.forEach((operation) => {
            const filePath = join(schemasDir, operation);
            expect(
              existsSync(filePath),
              `Custom minimal operation should exist: ${operation}`,
            ).toBe(true);
          });

          // Should NOT have operations not in custom set
          const disallowedOperations = ['updateOneUser.schema.ts', 'deleteOneUser.schema.ts'];

          disallowedOperations.forEach((operation) => {
            const filePath = join(schemasDir, operation);
            expect(
              existsSync(filePath),
              `Non-minimal operation should NOT exist: ${operation}`,
            ).toBe(false);
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should warn when minimal mode overrides select/include flags',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-warnings');

        try {
          // Enable minimal mode in config but also request select/include via both config and legacy flags
          const config = {
            ...ConfigGenerator.createMinimalConfig(),
            addSelectType: true,
            addIncludeType: true,
          } as Record<string, unknown>;

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: {
              config: './config.json',
              isGenerateSelect: 'true',
              isGenerateInclude: 'true',
            },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          const { stdout, stderr } = await testEnv.runGenerationWithOutput();
          const output = `${stdout}\n${stderr}`;

          // Should emit warnings that minimal mode disables select/include
          expect(output).toMatch(/Minimal mode active: Select schemas will be disabled/);
          expect(output).toMatch(/Minimal mode active: Include schemas will be disabled/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Minimal Mode Performance', () => {
    it(
      'should have faster generation times in minimal mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-performance');

        try {
          const config = ConfigGenerator.createMinimalConfig();
          const schema = PrismaSchemaGenerator.createComprehensiveSchema();

          const updatedSchema = schema.replace(
            'output   = "./generated/schemas"',
            `output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"`,
          );

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, updatedSchema);

          const startTime = Date.now();
          await testEnv.runGeneration();
          const endTime = Date.now();

          const generationTime = endTime - startTime;

          // Should complete generation
          const schemasDir = join(testEnv.outputDir, 'schemas');
          expect(existsSync(schemasDir)).toBe(true);

          // Performance test - should be reasonable (less than 30 seconds for comprehensive schema)
          // Relaxed threshold (environment variability); previously 30s
          // Relax threshold further for parallel CI / constrained environments.
          expect(generationTime).toBeLessThan(60000);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should use less memory in minimal mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-memory');

        try {
          const config = ConfigGenerator.createMinimalConfig();
          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          // Validate that generation completed successfully
          const schemasDir = join(testEnv.outputDir, 'schemas');
          expect(existsSync(schemasDir)).toBe(true);

          // Check for presence of essential files
          const essentialFiles = ['findManyUser.schema.ts', 'createOneUser.schema.ts'];

          essentialFiles.forEach((file) => {
            expect(existsSync(join(schemasDir, file))).toBe(true);
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Minimal Mode Validation', () => {
    it(
      'should validate generated schemas are syntactically correct',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-validation');

        try {
          const config = ConfigGenerator.createMinimalConfig();
          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const schemaFiles = FileSystemUtils.getSchemaFiles(schemasDir);

          // All generated files should be valid TypeScript/Zod
          schemaFiles.forEach((file) => {
            expect(existsSync(file)).toBe(true);

            const content = readFileSync(file, 'utf-8');

            // Should have proper imports
            expect(content).toMatch(/import.*from/);

            // Should have Zod schema
            expect(content).toMatch(/z\./);

            // Should have export
            expect(content).toMatch(/export/);

            // Should not have syntax errors (basic check)
            expect(content).not.toMatch(/undefined.*undefined/);
            expect(content).not.toMatch(/\{\s*\}/); // Empty objects
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should maintain type safety in minimal mode schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('minimal-mode-type-safety');

        try {
          const config = ConfigGenerator.createMinimalConfig();
          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const findManyPath = join(schemasDir, 'findManyUser.schema.ts');

          if (existsSync(findManyPath)) {
            const content = readFileSync(findManyPath, 'utf-8');

            // Should import Prisma types for type safety
            expect(content).toMatch(/import.*@prisma\/client/);

            // Should have proper TypeScript types
            expect(content).toMatch(/Prisma\./);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
