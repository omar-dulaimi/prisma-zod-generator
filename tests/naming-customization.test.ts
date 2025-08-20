import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { TestEnvironment } from './helpers/mock-generators';

// Basic schema with two models and an enum to verify naming & imports
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

enum Role {
  USER
  ADMIN
}

model User {
  id    Int   @id @default(autoincrement())
  name  String
  posts Post[]
  role  Role  @default(USER)
}

model Post {
  id     Int    @id @default(autoincrement())
  title  String
  user   User   @relation(fields: [userId], references: [id])
  userId Int
}
`;

describe('Naming Customization (experimental)', () => {
  it('applies custom filePattern and suffixes', async () => {
    const env = await TestEnvironment.createTestEnv('naming-custom-pattern');
    try {
      const config = {
        pureModels: true,
        naming: {
          pureModel: {
            filePattern: '{model}.zod.ts',
            schemaSuffix: 'Zod',
            typeSuffix: 'Shape',
            exportNamePattern: '{Model}{SchemaSuffix}',
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
      const modelsDir = join(env.outputDir, 'schemas', 'models');
      const userFile = join(modelsDir, 'user.zod.ts');
      expect(existsSync(userFile)).toBe(true);
      const content = readFileSync(userFile, 'utf-8');
      expect(content).toMatch(/export const UserZod/);
      expect(content).toMatch(/export type UserShape = z.infer<typeof UserZod>/);
    } finally {
      await env.cleanup();
    }
  });

  it('supports empty schema/type suffix and legacy aliases', async () => {
    const env = await TestEnvironment.createTestEnv('naming-empty-suffix');
    try {
      const config = {
        pureModels: true,
        naming: {
          pureModel: {
            filePattern: '{Model}.schema.ts',
            schemaSuffix: '',
            typeSuffix: '',
            exportNamePattern: '{Model}',
            legacyAliases: true,
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
      const modelsDir = join(env.outputDir, 'schemas', 'models');
      const userFile = join(modelsDir, 'User.schema.ts');
      expect(existsSync(userFile)).toBe(true);
      const content = readFileSync(userFile, 'utf-8');
      // Primary export with no suffix
      expect(content).toMatch(/export const User = z\.object/);
      // Legacy alias comment marker
      expect(content).toMatch(/Legacy aliases/);
    } finally {
      await env.cleanup();
    }
  });

  it('applies preset zod-prisma-types (empty suffix with legacy aliases)', async () => {
    const env = await TestEnvironment.createTestEnv('naming-preset-zpt');
    try {
      const config = {
        pureModels: true,
        naming: {
          preset: 'zod-prisma-types',
        },
      };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));

      await env.runGeneration();
      const modelsDir = join(env.outputDir, 'schemas', 'models');
      const userFile = join(modelsDir, 'User.schema.ts');
      expect(existsSync(userFile)).toBe(true);
      const content = readFileSync(userFile, 'utf-8');
      // Should have at least a schema export const
      expect(/export const User(Schema)? = z\.object/.test(content)).toBe(true);
    } finally {
      await env.cleanup();
    }
  });

  it('applies preset zod-prisma (Schema suffix + legacy alias)', async () => {
    const env = await TestEnvironment.createTestEnv('naming-preset-zp');
    try {
      const config = { pureModels: true, naming: { preset: 'zod-prisma' } };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));
      await env.runGeneration();
      const modelsDir = join(env.outputDir, 'schemas', 'models');
      const userFile = join(modelsDir, 'User.schema.ts');
      const content = readFileSync(userFile, 'utf-8');
      expect(content).toMatch(/export const UserSchema/);
    } finally {
      await env.cleanup();
    }
  });

  it('applies preset legacy-model-suffix (Model suffix, .model.ts)', async () => {
    const env = await TestEnvironment.createTestEnv('naming-preset-legacy-model');
    try {
      const config = { pureModels: true, naming: { preset: 'legacy-model-suffix' } };
      const configName = 'config.json';
      const schema = prismaSchema(env.outputDir, configName);
      await (await import('fs')).promises.writeFile(env.schemaPath, schema);
      await (
        await import('fs')
      ).promises.writeFile(join(env.testDir, configName), JSON.stringify(config, null, 2));
      await env.runGeneration();
      const modelsDir = join(env.outputDir, 'schemas', 'models');
      const userFile = join(modelsDir, 'User.model.ts');
      expect(existsSync(userFile)).toBe(true);
      const content = readFileSync(userFile, 'utf-8');
      expect(content).toMatch(/export const UserModel = z\.object/);
    } finally {
      await env.cleanup();
    }
  });

  it('generates correct import paths for custom filePattern with relations', async () => {
    const env = await TestEnvironment.createTestEnv('naming-import-paths');
    try {
      const config = {
        pureModels: true,
        pureModelsIncludeRelations: true,
        pureModelsExcludeCircularRelations: true,
        naming: {
          pureModel: {
            filePattern: '{model}.ts',
            schemaSuffix: 'Schema',
            typeSuffix: 'Type',
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
      const modelsDir = join(env.outputDir, 'schemas', 'models');

      // Check that files are generated with correct names
      const userFile = join(modelsDir, 'user.ts');
      const postFile = join(modelsDir, 'post.ts');
      expect(existsSync(userFile)).toBe(true);
      expect(existsSync(postFile)).toBe(true);

      // Check that Post imports from User using the correct path pattern
      const postContent = readFileSync(postFile, 'utf-8');
      expect(postContent).toMatch(/import { UserSchema } from '\.\/user'/);
      expect(postContent).not.toMatch(/User\.schema/); // Should not use default naming

      // Check that User has correct export name pattern
      const userContent = readFileSync(userFile, 'utf-8');
      expect(userContent).toMatch(/export const UserSchema/);
      expect(userContent).toMatch(/export type UserType/);
    } finally {
      await env.cleanup();
    }
  });
});
