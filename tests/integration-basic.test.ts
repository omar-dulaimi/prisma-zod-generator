import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  TestEnvironment,
  ConfigGenerator,
  PrismaSchemaGenerator,
  GENERATION_TIMEOUT,
} from './helpers';

describe('Basic Integration Tests', () => {
  describe('Configuration Integration', () => {
    it(
      'should parse and validate configuration with all features',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-config');

        try {
          const config = {
            mode: 'full',
            output: './test-schemas',
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Test configuration parsing
          const { parseConfigFromFile } = await import('../src/config/parser');
          const parseResult = await parseConfigFromFile(configPath);

          expect(parseResult.config).toMatchObject(config);
          expect(parseResult.isDefault).toBe(false);

          // Test configuration validation
          const { validateConfiguration } = await import('../src/config/validator');
          const validationResult = validateConfiguration(parseResult.config);

          expect(validationResult.valid).toBe(true);
          expect(validationResult.errors).toHaveLength(0);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle configuration with model validation',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-model-validation');

        try {
          const configWithModels = {
            mode: 'full',
            output: './schemas',
            models: {
              User: { enabled: true, operations: ['findMany'] },
              Post: { enabled: true, operations: ['create'] },
              NonExistentModel: { enabled: true }, // This should cause validation error
            },
          };

          const modelNames = ['User', 'Post']; // NonExistentModel is not in Prisma schema

          const { validateConfigurationWithModels } = await import('../src/config/validator');
          const result = validateConfigurationWithModels(configWithModels, modelNames);

          expect(result.valid).toBe(false);
          expect(result.errors.some((err) => err.message.includes('NonExistentModel'))).toBe(true);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Schema Generation Integration', () => {
    it(
      'should create proper test schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-schema-gen');

        try {
          // Test basic schema generation
          const basicSchema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            provider: 'sqlite',
            generatorOptions: { config: './config.json' },
          });

          expect(basicSchema).toContain('model User');
          expect(basicSchema).toContain('model Post');
          expect(basicSchema).toContain('generator zod');
          expect(basicSchema).toContain('provider = "sqlite"');

          // Test schema with zod comments
          const zodSchema = PrismaSchemaGenerator.createSchemaWithZodComments();
          expect(zodSchema).toContain('@zod');
          expect(zodSchema).toContain('email');
          expect(zodSchema).toContain('min(');

          // Test comprehensive schema
          const comprehensiveSchema = PrismaSchemaGenerator.createComprehensiveSchema();
          expect(comprehensiveSchema).toContain('ComprehensiveModel');
          expect(comprehensiveSchema).toContain('Decimal');
          expect(comprehensiveSchema).toContain('Json');
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Configuration Generator Integration', () => {
    it(
      'should generate various configuration types',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-config-gen');

        try {
          // Test basic config
          const basicConfig = ConfigGenerator.createBasicConfig();
          expect(basicConfig.output).toBe('./generated/schemas');
          expect(basicConfig.relationModel).toBe(true);

          // Test filtering config
          const filteringConfig = ConfigGenerator.createFilteringConfig();
          expect(filteringConfig.models).toBeDefined();
          expect(filteringConfig.models.User).toBeDefined();
          expect(filteringConfig.models.User.enabled).toBe(true);

          // Test minimal config
          const minimalConfig = ConfigGenerator.createMinimalConfig();
          expect(minimalConfig.minimal).toBe(true);
          expect(minimalConfig.createInputTypes).toBe(false);

          // Test variant config
          const variantConfig = ConfigGenerator.createVariantConfig();
          expect(variantConfig.variants).toBeDefined();
          expect(Array.isArray(variantConfig.variants)).toBe(true);
          expect(variantConfig.variants.length).toBeGreaterThan(0);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Error Handling Integration', () => {
    it(
      'should handle configuration parsing errors gracefully',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-error-handling');

        try {
          // Test malformed JSON
          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, '{ malformed json }');

          const { parseConfigFromFile, ConfigParseError } = await import('../src/config/parser');

          await expect(parseConfigFromFile(configPath)).rejects.toThrow(ConfigParseError);

          // Test missing file
          const missingPath = join(testEnv.testDir, 'missing.json');
          await expect(parseConfigFromFile(missingPath)).rejects.toThrow(ConfigParseError);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle validation errors with helpful messages',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-validation-errors');

        try {
          const invalidConfig = {
            mode: 'invalid-mode',
            output: 123, // Should be string
            models: {
              User: {
                operations: ['invalidOperation'],
              },
            },
          };

          const { validateConfiguration, formatValidationErrors } = await import(
            '../src/config/validator'
          );
          const result = validateConfiguration(invalidConfig);

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);

          const errorMessage = formatValidationErrors(result.errors);
          expect(errorMessage).toContain('validation failed');
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Feature Compatibility', () => {
    it(
      'should validate configuration with multiple features enabled',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-feature-compatibility');

        try {
          const complexConfig = {
            mode: 'full',
            output: './schemas',
          };

          const { validateConfiguration } = await import('../src/config/validator');
          const result = validateConfiguration(complexConfig);

          expect(result.valid).toBe(true);
          expect(result.config).toBeDefined();
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle configuration discovery and defaults',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-discovery');

        try {
          // Test discovery with no config file
          const { parseConfigFromDiscovery } = await import('../src/config/parser');
          const noConfigResult = await parseConfigFromDiscovery(testEnv.testDir);

          expect(noConfigResult.isDefault).toBe(true);
          expect(noConfigResult.config).toEqual({});

          // Test discovery with config file
          const config = { mode: 'minimal', output: './test' };
          const configPath = join(testEnv.testDir, 'zod-generator.config.json');
          writeFileSync(configPath, JSON.stringify(config));

          const foundConfigResult = await parseConfigFromDiscovery(testEnv.testDir);

          expect(foundConfigResult.isDefault).toBe(false);
          expect(foundConfigResult.config).toMatchObject(config);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Test Infrastructure Integration', () => {
    it(
      'should provide consistent test utilities',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('integration-test-utils');

        try {
          // Test that test environment is set up correctly
          expect(testEnv.testDir).toBeDefined();
          expect(testEnv.schemaPath).toBeDefined();
          expect(testEnv.outputDir).toBeDefined();
          expect(testEnv.runGeneration).toBeDefined();
          expect(testEnv.cleanup).toBeDefined();

          // Test that paths are properly constructed
          expect(testEnv.schemaPath).toContain('schema.prisma');
          expect(testEnv.outputDir).toContain('generated');

          // Test configuration generators work consistently
          const basicConfig = ConfigGenerator.createBasicConfig();
          const filteringConfig = ConfigGenerator.createFilteringConfig();
          const minimalConfig = ConfigGenerator.createMinimalConfig();

          expect(basicConfig).toBeDefined();
          expect(filteringConfig).toBeDefined();
          expect(minimalConfig).toBeDefined();

          // Test schema generators work consistently
          const basicSchema = PrismaSchemaGenerator.createBasicSchema();
          const zodSchema = PrismaSchemaGenerator.createSchemaWithZodComments();

          expect(basicSchema).toContain('generator zod');
          expect(zodSchema).toContain('@zod');
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
