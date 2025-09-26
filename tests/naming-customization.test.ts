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
      expect(content).toMatch(/export type User.*Shape = z.infer<typeof UserZod>/);
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

  it('applies custom enum naming patterns', async () => {
    const env = await TestEnvironment.createTestEnv('naming-custom-enum');
    try {
      const config = {
        naming: {
          enum: {
            filePattern: '{kebab}-enum.ts',
            exportNamePattern: '{Enum}',
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
      const enumsDir = join(env.outputDir, 'schemas', 'enums');

      // Check that enum file is generated with correct naming
      const roleEnumFile = join(enumsDir, 'role-enum.ts');
      expect(existsSync(roleEnumFile)).toBe(true);
      const content = readFileSync(roleEnumFile, 'utf-8');
      expect(content).toMatch(/export const Role(?:Schema)? = z\.enum/);
    } finally {
      await env.cleanup();
    }
  });

  it('applies custom input naming patterns', async () => {
    const env = await TestEnvironment.createTestEnv('naming-custom-input');
    try {
      const config = {
        naming: {
          input: {
            filePattern: '{kebab}-input.ts',
            exportNamePattern: '{Model}{InputType}',
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
      const objectsDir = join(env.outputDir, 'schemas', 'objects');

      // Check that input files are generated with correct naming pattern
      const inputFiles = (await import('fs'))
        .readdirSync(objectsDir)
        .filter((f) => f.endsWith('-input.ts'));
      expect(inputFiles.length).toBeGreaterThan(0);

      // Check one specific input file
      const inputFile = inputFiles.find((f) => f.includes('user'));
      if (inputFile) {
        const content = readFileSync(join(objectsDir, inputFile), 'utf-8');
        // Should have custom export name pattern applied
        expect(content).toMatch(/export const User\w+ObjectSchema/);
      }
    } finally {
      await env.cleanup();
    }
  });

  it('dedupes filename when pattern includes {Model}{InputType}', async () => {
    const env = await TestEnvironment.createTestEnv('naming-dedupe-input-file');
    try {
      const config = {
        naming: {
          input: {
            filePattern: '{Model}{InputType}.schema.ts',
            exportNamePattern: '{Model}{InputType}ObjectSchema',
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
      const objectsDir = join(env.outputDir, 'schemas', 'objects');

      // Expect deduped filename like UserWhereInput.schema.ts instead of UserUserWhereInput.schema.ts
      const deduped = join(objectsDir, 'UserWhereInput.schema.ts');
      const duplicated = join(objectsDir, 'UserUserWhereInput.schema.ts');
      expect(existsSync(deduped)).toBe(true);
      expect(existsSync(duplicated)).toBe(false);
    } finally {
      await env.cleanup();
    }
  });

  it('dedupes filename when pattern includes {model}{InputType}', async () => {
    const env = await TestEnvironment.createTestEnv('naming-dedupe-input-file-lower');
    try {
      const config = {
        naming: {
          input: {
            filePattern: '{model}{InputType}.schema.ts',
            exportNamePattern: '{Model}{InputType}ObjectSchema',
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
      const objectsDir = join(env.outputDir, 'schemas', 'objects');

      // Expect deduped filename like userWhereInput.schema.ts instead of userUserWhereInput.schema.ts
      const deduped = join(objectsDir, 'userWhereInput.schema.ts');
      const duplicated = join(objectsDir, 'userUserWhereInput.schema.ts');
      expect(existsSync(deduped)).toBe(true);
      expect(existsSync(duplicated)).toBe(false);
    } finally {
      await env.cleanup();
    }
  });

  it('dedupes export name when pattern includes {model}{InputType}', async () => {
    const env = await TestEnvironment.createTestEnv('naming-dedupe-export-lower');
    try {
      const config = {
        naming: {
          input: {
            // Keep default file pattern; focus on export name
            exportNamePattern: '{model}{InputType}ObjectSchema',
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
      const objectsDir = join(env.outputDir, 'schemas', 'objects');

      // Default object file should exist; check its contents
      const file = join(objectsDir, 'UserWhereInput.schema.ts');
      expect(existsSync(file)).toBe(true);
      const content = readFileSync(file, 'utf-8');
      // Should export deduped name 'userWhereInputObjectSchema', not 'userUserWhereInputObjectSchema'
      expect(content).toMatch(/export const userWhereInputObjectSchema\b/);
      expect(content).not.toMatch(/export const userUserWhereInputObjectSchema\b/);
    } finally {
      await env.cleanup();
    }
  });

  it('applies custom schema operation naming patterns', async () => {
    const env = await TestEnvironment.createTestEnv('naming-custom-schema');
    try {
      const config = {
        pureModels: true, // Enable pure models to generate UserSchema
        naming: {
          pureModel: {
            filePattern: '{kebab}-schema.ts',
            exportNamePattern: '{Model}Schema',
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

      // Check that schema files are generated with correct naming in models directory
      const schemaFiles = (await import('fs'))
        .readdirSync(modelsDir)
        .filter((f) => f.endsWith('-schema.ts'));
      expect(schemaFiles.length).toBeGreaterThan(0);

      // Check one specific schema file
      const userSchemaFile = join(modelsDir, 'user-schema.ts');
      if (existsSync(userSchemaFile)) {
        const content = readFileSync(userSchemaFile, 'utf-8');
        expect(content).toMatch(/export const UserSchema/);
      }
    } finally {
      await env.cleanup();
    }
  });

  it('applies all custom naming patterns together', async () => {
    const env = await TestEnvironment.createTestEnv('naming-all-patterns');
    try {
      const config = {
        pureModels: true,
        naming: {
          pureModel: {
            filePattern: '{kebab}-model.ts',
            exportNamePattern: '{Model}Model',
          },
          enum: {
            filePattern: '{kebab}-enum.ts',
            exportNamePattern: '{Enum}',
          },
          input: {
            filePattern: '{kebab}-input.ts',
            exportNamePattern: '{Model}{InputType}',
          },
          schema: {
            filePattern: '{kebab}-schema.ts',
            exportNamePattern: '{Model}Schema',
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
      const schemasDir = join(env.outputDir, 'schemas');

      // Check pureModel files
      const modelsDir = join(schemasDir, 'models');
      const userModelFile = join(modelsDir, 'user-model.ts');
      expect(existsSync(userModelFile)).toBe(true);
      const userModelContent = readFileSync(userModelFile, 'utf-8');
      expect(userModelContent).toMatch(/export const UserModel/);

      // Check enum files
      const enumsDir = join(schemasDir, 'enums');
      const roleEnumFile = join(enumsDir, 'role-enum.ts');
      expect(existsSync(roleEnumFile)).toBe(true);
      const enumContent = readFileSync(roleEnumFile, 'utf-8');
      expect(enumContent).toMatch(/export const Role(?:Schema)? = z\.enum/);

      // Check input files
      const objectsDir = join(schemasDir, 'objects');
      const inputFiles = (await import('fs'))
        .readdirSync(objectsDir)
        .filter((f) => f.endsWith('-input.ts'));
      expect(inputFiles.length).toBeGreaterThan(0);

      // Check schema files
      const schemaFiles = (await import('fs'))
        .readdirSync(schemasDir)
        .filter((f) => f.endsWith('-schema.ts') && !f.includes('/'));
      expect(schemaFiles.length).toBeGreaterThan(0);
    } finally {
      await env.cleanup();
    }
  });
});
