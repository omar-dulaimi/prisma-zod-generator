import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  TestEnvironment,
} from './helpers';

describe('Single-file mode: Zod versions (v4 getters vs v3 lazy)', () => {
  it(
    'v4: bundles schemas.ts with zod/v4 import and getter-based recursion (no z.lazy)',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-v4-getters');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          zodImportTarget: 'v4' as const,
        };
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './config.json' },
        });
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();

        const bundlePath = join(env.outputDir, 'schemas', 'schemas.ts');
        expect(existsSync(bundlePath)).toBe(true);
        const content = readFileSync(bundlePath, 'utf-8');

        // zod v4 import
        expect(content).toContain("import * as z from 'zod/v4'");
        // Getter-based OR recursion and a relation filter getter (posts/authors)
        expect(content).toMatch(
          /get\s+OR\s*\(\)\s*\{\s*return\s+[A-Za-z0-9_]+WhereInputObjectSchema\.array\(\)\.optional\(\);?\s*\}/,
        );
        expect(content).toMatch(
          /get\s+(posts|authors)\s*\(\)\s*\{\s*return\s+[A-Za-z0-9_]+ListRelationFilterObjectSchema\.optional\(\);?\s*\}/,
        );
        // No z.lazy in v4 single-file bundle
        expect(content).not.toMatch(/z\.lazy\s*\(/);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'v4: bundles getter-based select/include in CRUD args',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-v4-getters-select-include');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          zodImportTarget: 'v4' as const,
        };
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
        expect(content).toMatch(/get\s+select\s*\(\)\s*\{\s*return\s+/);
        expect(content).toMatch(/get\s+include\s*\(\)\s*\{\s*return\s+/);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'v3: bundles schemas.ts with zod/v3 import and uses z.lazy (no getters)',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-v3-lazy');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          zodImportTarget: 'v3' as const,
        };
        const configPath = join(env.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        const schema = PrismaSchemaGenerator.createBasicSchema({
          outputPath: `${env.outputDir}/schemas`,
          generatorOptions: { config: './config.json' },
        });
        writeFileSync(env.schemaPath, schema);
        await env.runGeneration();

        const bundlePath = join(env.outputDir, 'schemas', 'schemas.ts');
        expect(existsSync(bundlePath)).toBe(true);
        const content = readFileSync(bundlePath, 'utf-8');

        // zod v3 import
        expect(content).toContain("import { z } from 'zod/v3'");
        // Expect lazy recursion present
        expect(content).toMatch(/z\.lazy\s*\(\s*\(\)\s*=>/);
        // No getters
        expect(content).not.toMatch(/\bget\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'v4: bundle does not contain invalid sequences from getter transformation',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-v4-no-invalid');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          zodImportTarget: 'v4' as const,
        };
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
        // Ensure we didn't leave syntax artifacts
        expect(content).not.toContain('},,');
        expect(content).not.toContain('}, .');
        expect(content).not.toMatch(/\},\s*\.optional\(/);
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'v3: bundle avoids getter tokens and contains valid commas',
    async () => {
      const env = await TestEnvironment.createTestEnv('single-file-v3-no-getters');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          useMultipleFiles: false,
          zodImportTarget: 'v3' as const,
        };
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
        expect(content).not.toMatch(/\bget\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/);
        expect(content).not.toContain('},,');
      } finally {
        await env.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
