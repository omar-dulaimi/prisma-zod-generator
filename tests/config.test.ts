import { writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  TestEnvironment,
} from './helpers';

describe('Configuration System Tests', () => {
  describe('Configuration File Parsing', () => {
    it(
      'should parse valid JSON configuration files',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-parsing-valid');

        try {
          const validConfig = {
            mode: 'full',
            output: './generated/schemas',
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(validConfig, null, 2));

          const { parseConfigFromFile } = await import('../src/config/parser');
          const parseResult = await parseConfigFromFile(configPath);

          expect(parseResult.config).toMatchObject(validConfig);
          expect(parseResult.isDefault).toBe(false);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should warn with tagged messages on file layout conflicts (useMultipleFiles mismatch)',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('file-layout-warnings');
        try {
          // Config says single-file, generator says multi-file
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            useMultipleFiles: false,
            singleFileName: 'bundle.ts',
          } as Record<string, unknown>;

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: {
              config: './config.json',
              useMultipleFiles: 'true',
            },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          const { stdout, stderr } = await testEnv.runGenerationWithOutput();
          const output = `${stdout}\n${stderr}`;
          expect(output).toMatch(/\[prisma-zod-generator\] ⚠️  File layout conflicts detected\./);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle malformed JSON gracefully',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-parsing-malformed');

        try {
          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, '{ invalid json }');

          const { parseConfigFromFile, ConfigParseError } = await import('../src/config/parser');

          await expect(parseConfigFromFile(configPath)).rejects.toThrow(ConfigParseError);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle missing files gracefully',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-parsing-missing');

        try {
          const configPath = join(testEnv.testDir, 'nonexistent.json');

          const { parseConfigFromFile, ConfigParseError } = await import('../src/config/parser');

          await expect(parseConfigFromFile(configPath)).rejects.toThrow(ConfigParseError);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should auto-discover configuration files',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-discovery');

        try {
          const config = { mode: 'minimal', output: './schemas' };
          const configPath = join(testEnv.testDir, 'zod-generator.config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const { parseConfigFromDiscovery } = await import('../src/config/parser');
          const parseResult = await parseConfigFromDiscovery(testEnv.testDir);

          expect(parseResult.config).toMatchObject(config);
          expect(parseResult.isDefault).toBe(false);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Configuration Validation', () => {
    it(
      'should validate valid configuration',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-validation-valid');

        try {
          const validConfig = {
            mode: 'full',
            output: './schemas',
          };

          const { validateConfiguration } = await import('../src/config/validator');
          const result = validateConfiguration(validConfig);

          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should reject invalid configuration',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-validation-invalid');

        try {
          const invalidConfig = {
            mode: 'invalid-mode',
            output: 123, // Should be string
          };

          const { validateConfiguration } = await import('../src/config/validator');
          const result = validateConfiguration(invalidConfig);

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle model validation with model names',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-validation-models');

        try {
          const configWithModels = {
            mode: 'full',
            output: './schemas',
            models: {
              User: { enabled: true },
              NonExistentModel: { enabled: true },
            },
          };

          const modelNames = ['User', 'Post']; // NonExistentModel is not in this list

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

  describe('Default Configuration', () => {
    it(
      'should provide default configuration',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-defaults');

        try {
          const { DEFAULT_CONFIG } = await import('../src/config/schema');

          expect(DEFAULT_CONFIG.mode).toBeDefined();
          expect(DEFAULT_CONFIG.output).toBeDefined();
          expect(DEFAULT_CONFIG.variants).toBeDefined();
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should merge with defaults during validation',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-merge');

        try {
          const partialConfig = {
            output: './custom/output',
          };

          const { validateConfiguration } = await import('../src/config/validator');
          const result = validateConfiguration(partialConfig);

          expect(result.valid).toBe(true);
          expect(result.config?.output).toBe('./custom/output');
          expect(result.config?.mode).toBeDefined(); // Should have default
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Error Handling', () => {
    it(
      'should provide descriptive error messages',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-errors');

        try {
          const { formatValidationErrors } = await import('../src/config/validator');
          const { ValidationErrorType } = await import('../src/config/schema');
          const mockErrors = [
            {
              type: ValidationErrorType.INVALID_JSON_SCHEMA,
              message: 'Invalid value',
              path: 'root.mode',
              value: 'invalid',
            },
          ];

          const errorMessage = formatValidationErrors(mockErrors);
          expect(errorMessage).toContain('validation failed');
          expect(errorMessage).toContain('Invalid value');
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle parse errors gracefully',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-parse-errors');

        try {
          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, 'not json at all');

          const { createConfigErrorMessage, ConfigParseError } = await import(
            '../src/config/parser'
          );

          try {
            const { parseConfigFromFile } = await import('../src/config/parser');
            await parseConfigFromFile(configPath);
          } catch (error) {
            if (error instanceof ConfigParseError) {
              const message = createConfigErrorMessage(error);
              expect(message).toContain('Configuration Error');
              expect(message).toContain('Troubleshooting');
            }
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Configuration Discovery', () => {
    it(
      'should discover configuration files in standard locations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-discovery-standard');

        try {
          const { discoverConfigFile } = await import('../src/config/parser');

          // Test with no config file
          const noConfig = await discoverConfigFile(testEnv.testDir);
          expect(noConfig).toBeNull();

          // Test with config file
          const config = { mode: 'full', output: './test' };
          const configPath = join(testEnv.testDir, 'zod-generator.config.json');
          writeFileSync(configPath, JSON.stringify(config));

          const foundConfig = await discoverConfigFile(testEnv.testDir);
          expect(foundConfig).toBe(configPath);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Configuration Integration', () => {
    it(
      'should work in generation context',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('config-integration');

        try {
          const config = {
            mode: 'full',
            output: './test-schemas',
            variants: {
              pure: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config));

          const { parseConfiguration } = await import('../src/config/parser');
          const { validateConfiguration } = await import('../src/config/validator');

          const parseResult = await parseConfiguration(configPath, testEnv.testDir);
          const validationResult = validateConfiguration(parseResult.config);

          expect(parseResult.isDefault).toBe(false);
          expect(validationResult.valid).toBe(true);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
