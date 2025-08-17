import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  FileSystemUtils,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  TestEnvironment,
} from './helpers';

describe('Single-file output mode', () => {
  it(
    'creates exactly one file and inlines pure model schemas when pureModels=true',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-with-pure-models');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          pureModels: true, // ensure pure models requested
        } as Partial<import('../src/config/parser').GeneratorConfig>;
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './config.json' },
        });
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();
        const schemasDir = join(env.outputDir, 'schemas');
        const bundlePath = join(schemasDir, 'schemas.ts');
        expect(existsSync(bundlePath)).toBe(true);
        // Ensure no directories (models/ etc.) remain
        expect(existsSync(join(schemasDir, 'models'))).toBe(false);
        // Bundle should contain pure model schema exports (UserSchema) when pureModels inlined
        const content = readFileSync(bundlePath, 'utf-8');
        expect(content).toMatch(/export const UserSchema/);
        expect(content).toMatch(/export const PostSchema/);
        // Directory should contain only the bundle
        const entries = readdirSync(schemasDir);
        expect(entries).toEqual(['schemas.ts']);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits only pure model schemas when variants disabled and pureModels=true in single-file custom mode',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-pure-only');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          mode: 'custom' as const,
          useMultipleFiles: false,
          pureModels: true,
          variants: {
            pure: { enabled: false },
            input: { enabled: false },
            result: { enabled: false },
          },
        } as Partial<import('../src/config/parser').GeneratorConfig>;
        const configPath = join(env.testDir, 'zod-generator.config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './zod-generator.config.json' },
        });
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();
        const schemasDir = join(env.outputDir, 'schemas');
        const bundlePath = join(schemasDir, 'schemas.ts');
        expect(existsSync(bundlePath)).toBe(true);
        const content = readFileSync(bundlePath, 'utf-8');
        // Pure models present (schema naming)
        expect(content).toMatch(/export const UserSchema/);
        // Ensure object / operation schemas not present (e.g., UserCreateInputObjectSchema pattern)
        expect(content).not.toMatch(/CreateInputObjectSchema/);
        expect(content).not.toMatch(/FindMany/);
        // Directory should contain only the bundle
        const entries = readdirSync(schemasDir);
        expect(entries).toEqual(['schemas.ts']);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'creates exactly one file with only object/operation schemas when pureModels=false and all variants disabled',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-no-pure-variants-disabled');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          mode: 'custom' as const,
          useMultipleFiles: false,
          pureModels: false,
          variants: {
            pure: { enabled: false },
            input: { enabled: false },
            result: { enabled: false },
          },
        } as Partial<import('../src/config/parser').GeneratorConfig>;
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './config.json' },
        });
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();
        const schemasDir = join(env.outputDir, 'schemas');
        const bundlePath = join(schemasDir, 'schemas.ts');
        expect(existsSync(bundlePath)).toBe(true);
        const content = readFileSync(bundlePath, 'utf-8');
        // Should NOT include pure model exports
        expect(content).not.toMatch(/export const UserSchema/);
        // Should include some operation/input schema identifiers
        expect(content).toMatch(/UserCreateInput/i);
        // Directory should contain only the bundle
        const entries = readdirSync(schemasDir);
        expect(entries).toEqual(['schemas.ts']);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
  it(
    'creates exactly one file (default name) with all content inlined',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-default');
      try {
        // Config: single-file mode (default bundle name: schemas.ts)
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
        };
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Schema pointing generator to this test env output and config
        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './config.json' },
        });
        writeFileSync(env.schemaPath, schema);

        await env.runGeneration();

        const schemasDir = join(env.outputDir, 'schemas');
        const bundlePath = join(schemasDir, 'schemas.ts');

        // Only one file should remain at the configured output directory
        expect(existsSync(schemasDir)).toBe(true);
        expect(existsSync(bundlePath)).toBe(true);
        // No subdirectories or index.ts should remain in schemasDir
        expect(existsSync(join(schemasDir, 'index.ts'))).toBe(false);
        expect(existsSync(join(schemasDir, 'objects'))).toBe(false);
        expect(existsSync(join(schemasDir, 'enums'))).toBe(false);
        expect(existsSync(join(schemasDir, 'models'))).toBe(false);
        expect(existsSync(join(schemasDir, 'variants'))).toBe(false);
        // Directory should contain only the bundle
        const entries = readdirSync(schemasDir);
        expect(entries).toEqual(['schemas.ts']);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'supports custom singleFileName and leaves no other files',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-custom-name');
      try {
        // Config: single-file mode with custom bundle name
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          singleFileName: 'bundle.ts',
        };
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Schema pointing generator to this test env output and config
        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './config.json' },
        });
        writeFileSync(env.schemaPath, schema);

        await env.runGeneration();

        const schemasDir = join(env.outputDir, 'schemas');
        const bundlePath = join(schemasDir, 'bundle.ts');
        expect(existsSync(schemasDir)).toBe(true);
        expect(existsSync(bundlePath)).toBe(true);
        expect(existsSync(join(schemasDir, 'index.ts'))).toBe(false);
        expect(existsSync(join(schemasDir, 'objects'))).toBe(false);
        expect(existsSync(join(schemasDir, 'enums'))).toBe(false);
        expect(existsSync(join(schemasDir, 'models'))).toBe(false);
        expect(existsSync(join(schemasDir, 'variants'))).toBe(false);
        // Directory should contain only custom bundle
        const entries = readdirSync(schemasDir);
        expect(entries).toEqual(['bundle.ts']);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'keeps multi-file mode behavior unchanged when useMultipleFiles is true',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-multifile-unchanged');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: true,
        };
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './config.json' },
        });
        writeFileSync(env.schemaPath, schema);

        await env.runGeneration();

        const schemasDir = join(env.outputDir, 'schemas');
        const indexPath = join(schemasDir, 'index.ts');

        // Multi-file object directory and index should exist
        expect(FileSystemUtils.validateDirectoryStructure(schemasDir, ['objects'])).toBe(true);
        expect(existsSync(indexPath)).toBe(true);

        const indexContent = readFileSync(indexPath, 'utf-8');
        // Index should export subdirectories (not just a bundle)
        expect(indexContent).toMatch(/export.*from.*enums/);
        expect(indexContent).toMatch(/export.*from.*objects/);
        // 'models' export is conditional (pureModels); don't assert here
        // No default bundle file when in multi-file mode
        expect(existsSync(join(schemasDir, 'schemas.ts'))).toBe(false);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
