import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { TestEnvironment } from './helpers/mock-generators';

// Schema that reproduces the exact issue from GitHub #304
const prismaSchema = (outputDir: string, configRef: string) => `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${outputDir}/schemas"
  config   = "./${configRef}"
}

enum LoremDolarEnum {
  hello
  world
}

model LoremModel {
  id        Int   @id @default(autoincrement())
  enumField LoremDolarEnum
}
`;

describe('Issue #304 — Custom naming configuration leads to broken import statements', () => {
  it('generates correct enum import paths with custom naming patterns', async () => {
    const env = await TestEnvironment.createTestEnv('issue-304-custom-naming-imports');
    try {
      const config = {
        mode: 'custom',
        useMultipleFiles: true,
        zodImportTarget: 'v4',
        pureModels: true,
        pureModelsLean: true,
        pureModelsIncludeRelations: false,
        pureModelsExcludeCircularRelations: true,
        emit: {
          variants: false,
          objects: false,
          crud: false,
          enum: true,
        },
        naming: {
          enum: {
            filePattern: '{kebab}.ts',
            exportNamePattern: 'Zod{Enum}',
          },
          pureModel: {
            filePattern: '{kebab}.ts',
            exportNamePattern: 'Zod{Model}Model',
          },
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // Check that enum file is generated with correct naming
      const enumsDir = join(env.outputDir, 'schemas', 'enums');
      const enumFile = join(enumsDir, 'lorem-dolar-enum.ts');
      expect(existsSync(enumFile)).toBe(true);

      const enumContent = readFileSync(enumFile, 'utf-8');
      expect(enumContent).toMatch(/export const ZodLoremDolarEnum/);
      expect(enumContent).toMatch(/z\.enum\(\[.hello., .world.\]\)/);

      // Check that model file is generated with correct naming
      const modelsDir = join(env.outputDir, 'schemas', 'models');
      const modelFile = join(modelsDir, 'lorem-model.ts');
      expect(existsSync(modelFile)).toBe(true);

      const modelContent = readFileSync(modelFile, 'utf-8');
      expect(modelContent).toMatch(/export const ZodLoremModelModel/);

      // CRITICAL: Check that the import path is correct
      // Should import from '../enums/lorem-dolar-enum' NOT './zod-lorem-enum.model.ts'
      expect(modelContent).toMatch(
        /import { ZodLoremDolarEnum } from '\.\.\/enums\/lorem-dolar-enum'/,
      );

      // Should NOT contain the broken import path from the GitHub issue
      expect(modelContent).not.toMatch(/\.\/zod-lorem-enum\.model\.ts/);
      expect(modelContent).not.toMatch(/\.\/zod-lorem-enum/);

      // Should use the correct export name in the schema definition
      expect(modelContent).toMatch(/enumField: ZodLoremDolarEnum/);
    } finally {
      await env.cleanup();
    }
  });

  it('handles different enum naming patterns correctly', async () => {
    const env = await TestEnvironment.createTestEnv('issue-304-different-enum-patterns');
    try {
      const config = {
        mode: 'custom',
        useMultipleFiles: true,
        pureModels: true,
        emit: {
          variants: false,
          objects: false,
          crud: false,
          enum: true,
        },
        naming: {
          enum: {
            filePattern: '{Enum}.enum.ts',
            exportNamePattern: '{Enum}Enum',
          },
          pureModel: {
            filePattern: '{Model}.model.ts',
            exportNamePattern: '{Model}Model',
          },
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();

      // Check enum file
      const enumsDir = join(env.outputDir, 'schemas', 'enums');
      const enumFile = join(enumsDir, 'LoremDolarEnum.enum.ts');
      expect(existsSync(enumFile)).toBe(true);

      const enumContent = readFileSync(enumFile, 'utf-8');
      expect(enumContent).toMatch(/export const LoremDolarEnumEnum/);

      // Check model file
      const modelsDir = join(env.outputDir, 'schemas', 'models');
      const modelFile = join(modelsDir, 'LoremModel.model.ts');
      expect(existsSync(modelFile)).toBe(true);

      const modelContent = readFileSync(modelFile, 'utf-8');
      expect(modelContent).toMatch(/export const LoremModelModel/);

      // Check import path uses the correct enum file name
      expect(modelContent).toMatch(
        /import { LoremDolarEnumEnum } from '\.\.\/enums\/LoremDolarEnum\.enum'/,
      );
    } finally {
      await env.cleanup();
    }
  });
});
