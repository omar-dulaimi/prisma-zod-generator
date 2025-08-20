import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  TestEnvironment,
} from './helpers';

describe('Zod import target', () => {
  it(
    "emits 'zod/v4' import when zodImportTarget is v4 (single-file)",
    async () => {
      const env = await TestEnvironment.createTestEnv('zod-imports-v4-single-file');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          zodImportTarget: 'v4',
        } as Partial<import('../src/config/parser').GeneratorConfig>;
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './config.json' },
        });
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();

        const bundlePath = join(env.outputDir, 'schemas', 'schemas.ts');
        const content = readFileSync(bundlePath, 'utf-8');
        expect(content).toContain("import * as z from 'zod/v4'");
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'emits \'import { z } from "zod"\' when zodImportTarget is auto (single-file)',
    async () => {
      const env = await TestEnvironment.createTestEnv('zod-imports-auto-single-file');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          zodImportTarget: 'auto',
        } as Partial<import('../src/config/parser').GeneratorConfig>;
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './config.json' },
        });
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();

        const bundlePath = join(env.outputDir, 'schemas', 'schemas.ts');
        const content = readFileSync(bundlePath, 'utf-8');
        expect(content).toContain("import { z } from 'zod'");
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
