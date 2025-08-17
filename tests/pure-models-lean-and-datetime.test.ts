import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  TestEnvironment,
} from './helpers';

/**
 * Tests for pureModelsLean default behavior and dateTimeStrategy variants.
 */

describe('pureModelsLean & dateTimeStrategy', () => {
  it(
    'emits lean pure model schemas by default (no JSDoc/statistics blocks)',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('pure-models-lean-default');
      try {
        const config = { ...ConfigGenerator.createBasicConfig(), pureModels: true };
        const schema = PrismaSchemaGenerator.createBasicSchema().replace(
          'output   = "./generated/schemas"',
          `output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"`,
        );
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();
        const userModelPath = join(testEnv.outputDir, 'schemas', 'models', 'User.schema.ts');
        if (existsSync(userModelPath)) {
          const content = readFileSync(userModelPath, 'utf-8');
          expect(content).not.toMatch(/Schema Statistics:/);
          expect(content).not.toMatch(/@model User/);
          // Should still contain the object definition
          expect(content).toMatch(/export const UserSchema = z.object/);
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'can disable lean mode to restore documentation',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('pure-models-lean-disabled');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          pureModels: true,
          pureModelsLean: false,
        };
        const schema = PrismaSchemaGenerator.createBasicSchema().replace(
          'output   = "./generated/schemas"',
          `output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"`,
        );
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();
        const userModelPath = join(testEnv.outputDir, 'schemas', 'models', 'User.schema.ts');
        if (existsSync(userModelPath)) {
          const content = readFileSync(userModelPath, 'utf-8');
          expect(content).toMatch(/Schema Statistics:/);
          expect(content).toMatch(/@model User/);
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'supports dateTimeStrategy = coerce',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('pure-models-datetime-coerce');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          pureModels: true,
          dateTimeStrategy: 'coerce',
        };
        const schema = `generator client {\n  provider = \"prisma-client-js\"\n}\n\ndatasource db {\n  provider = \"sqlite\"\n  url      = \"file:./test.db\"\n}\n\ngenerator zod {\n  provider = \"node ./lib/generator.js\"\n  output   = \"${testEnv.outputDir}/schemas\"\n  config   = \"./config.json\"\n}\n\nmodel DateModel {\n  id Int @id @default(autoincrement())\n  occurredAt DateTime\n}`;
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();
        const modelPath = join(testEnv.outputDir, 'schemas', 'models', 'DateModel.schema.ts');
        if (existsSync(modelPath)) {
          const content = readFileSync(modelPath, 'utf-8');
          expect(content).toMatch(/z\.coerce\.date\(\)/);
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'supports dateTimeStrategy = isoString',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('pure-models-datetime-iso');
      try {
        const config = {
          ...ConfigGenerator.createBasicConfig(),
          pureModels: true,
          dateTimeStrategy: 'isoString',
        };
        const schema = `generator client {\n  provider = \"prisma-client-js\"\n}\n\ndatasource db {\n  provider = \"sqlite\"\n  url      = \"file:./test.db\"\n}\n\ngenerator zod {\n  provider = \"node ./lib/generator.js\"\n  output   = \"${testEnv.outputDir}/schemas\"\n  config   = \"./config.json\"\n}\n\nmodel DateModel {\n  id Int @id @default(autoincrement())\n  occurredAt DateTime\n}`;
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();
        const modelPath = join(testEnv.outputDir, 'schemas', 'models', 'DateModel.schema.ts');
        if (existsSync(modelPath)) {
          const content = readFileSync(modelPath, 'utf-8');
          expect(content).toMatch(/Invalid ISO datetime/);
          expect(content).toMatch(/transform\(v => new Date/);
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );

  it(
    'references enum schema (RoleSchema) not Prisma enum import in pure model',
    async () => {
      const testEnv = await TestEnvironment.createTestEnv('pure-models-enum-schema');
      try {
        const config = { ...ConfigGenerator.createBasicConfig(), pureModels: true };
        const schema = `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "sqlite"\n  url      = "file:./test.db"\n}\n\ngenerator zod {\n  provider = "node ./lib/generator.js"\n  output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"\n}\n\nenum Role {\n  USER\n  ADMIN\n}\n\nmodel User {\n  id Int @id @default(autoincrement())\n  role Role\n}`;
        writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);
        await testEnv.runGeneration();
        const userModelPath = join(testEnv.outputDir, 'schemas', 'models', 'User.schema.ts');
        if (existsSync(userModelPath)) {
          const content = readFileSync(userModelPath, 'utf-8');
          expect(content).toMatch(/RoleSchema/);
          expect(content).not.toMatch(/from '@prisma\/client'.*Role/);
        }
      } finally {
        await testEnv.cleanup();
      }
    },
    GENERATION_TIMEOUT,
  );
});
