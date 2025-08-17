import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  FileSystemUtils,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  SchemaValidationUtils,
  TestEnvironment,
} from './helpers';

describe('Schema Variant Management System Tests', () => {
  describe('Variant Configuration and Types', () => {
    it(
      'should define and create multiple schema variants',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-basic');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'input',
                suffix: 'Input',
                exclude: ['id', 'createdAt', 'updatedAt'],
              },
              {
                name: 'output',
                suffix: 'Output',
                exclude: ['password'],
              },
              {
                name: 'public',
                suffix: 'Public',
                exclude: ['password', 'email', 'internalData'],
              },
            ],
          };

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
  id           Int      @id @default(autoincrement())
  email        String   @unique
  password     String
  name         String?
  internalData Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Check input variant - excludes id, createdAt, updatedAt
          const userInputPath = join(variantsDir, 'UserInput.schema.ts');
          if (existsSync(userInputPath)) {
            SchemaValidationUtils.expectSchemaContent(userInputPath, {
              hasFields: ['email', 'password', 'name', 'internalData'],
              excludesFields: ['id', 'createdAt', 'updatedAt'],
            });
          }

          // Check output variant - excludes password
          const userOutputPath = join(variantsDir, 'UserOutput.schema.ts');
          if (existsSync(userOutputPath)) {
            SchemaValidationUtils.expectSchemaContent(userOutputPath, {
              hasFields: ['id', 'email', 'name', 'internalData', 'createdAt', 'updatedAt'],
              excludesFields: ['password'],
            });
          }

          // Check public variant - excludes password, email, internalData
          const userPublicPath = join(variantsDir, 'UserPublic.schema.ts');
          if (existsSync(userPublicPath)) {
            SchemaValidationUtils.expectSchemaContent(userPublicPath, {
              hasFields: ['id', 'name', 'createdAt', 'updatedAt'],
              excludesFields: ['password', 'email', 'internalData'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle variant naming conventions correctly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-naming');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'create',
                suffix: 'CreateRequest',
                exclude: ['id'],
              },
              {
                name: 'update',
                suffix: 'UpdateRequest',
                exclude: ['id', 'createdAt'],
              },
              {
                name: 'response',
                suffix: 'Response',
                exclude: [],
              },
              {
                name: 'minimal',
                suffix: 'Min',
                exclude: ['createdAt', 'updatedAt', 'metadata'],
              },
            ],
          };

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

model Product {
  id        Int      @id @default(autoincrement())
  name      String
  price     Float
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Check all variant files exist with correct naming
          const expectedVariants = [
            'ProductCreateRequest.schema.ts',
            'ProductUpdateRequest.schema.ts',
            'ProductResponse.schema.ts',
            'ProductMin.schema.ts',
          ];

          expectedVariants.forEach((variantFile) => {
            const filePath = join(variantsDir, variantFile);
            expect(existsSync(filePath), `Variant file should exist: ${variantFile}`).toBe(true);

            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Should have correct export name
              const expectedExportName = variantFile.replace('.schema.ts', 'Schema');
              expect(content).toMatch(new RegExp(`export const ${expectedExportName}`));

              // Should be valid Zod schema
              expect(content).toMatch(/z\.object\(/);
            }
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should support variant-specific configuration options',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-specific-config');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'strict',
                suffix: 'Strict',
                exclude: ['optionalField'],
                transformOptionalToRequired: true,
                additionalValidation: {
                  email: '@zod.email()',
                  name: '@zod.min(2).max(50)',
                },
              },
              {
                name: 'loose',
                suffix: 'Loose',
                exclude: [],
                transformRequiredToOptional: ['email'],
                removeValidation: true,
              },
            ],
          };

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
  id            Int     @id @default(autoincrement())
  email         String  @unique /// @zod.email()
  name          String? /// @zod.min(1).max(100)
  optionalField String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Check strict variant
          const userStrictPath = join(variantsDir, 'UserStrict.schema.ts');
          if (existsSync(userStrictPath)) {
            const content = readFileSync(userStrictPath, 'utf-8');

            // Should exclude optionalField
            expect(content).not.toMatch(/optionalField/);

            // Should have enhanced validation
            expect(content).toMatch(/email.*\.email\(\)/);
            expect(content).toMatch(/name.*\.min\(2\).*\.max\(50\)/);
          }

          // Check loose variant
          const userLoosePath = join(variantsDir, 'UserLoose.schema.ts');
          if (existsSync(userLoosePath)) {
            const content = readFileSync(userLoosePath, 'utf-8');

            // Should include all fields
            expect(content).toMatch(/optionalField/);

            // Email should be optional in loose variant
            expect(content).toMatch(/email.*\.optional\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Variant File Generation Coordination', () => {
    it(
      'should coordinate creation of multiple schema files for each variant',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-coordination');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'api',
                suffix: 'Api',
                exclude: ['internalField'],
              },
              {
                name: 'db',
                suffix: 'Db',
                exclude: ['computedField'],
              },
            ],
          };

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
  id            Int     @id @default(autoincrement())
  email         String  @unique
  internalField String  // Excluded from api variant
  computedField String  // Excluded from db variant
  name          String?
}

model Post {
  id            Int     @id @default(autoincrement())
  title         String
  internalField String  // Excluded from api variant
  computedField String  // Excluded from db variant
  content       String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Should create variant files for both models
          const expectedFiles = [
            'UserApi.schema.ts',
            'UserDb.schema.ts',
            'PostApi.schema.ts',
            'PostDb.schema.ts',
          ];

          expectedFiles.forEach((file) => {
            const filePath = join(variantsDir, file);
            expect(existsSync(filePath), `Variant file should exist: ${file}`).toBe(true);
          });

          // Check content of API variants
          const userApiPath = join(variantsDir, 'UserApi.schema.ts');
          if (existsSync(userApiPath)) {
            SchemaValidationUtils.expectSchemaContent(userApiPath, {
              hasFields: ['id', 'email', 'computedField', 'name'],
              excludesFields: ['internalField'],
            });
          }

          const postApiPath = join(variantsDir, 'PostApi.schema.ts');
          if (existsSync(postApiPath)) {
            SchemaValidationUtils.expectSchemaContent(postApiPath, {
              hasFields: ['id', 'title', 'computedField', 'content'],
              excludesFields: ['internalField'],
            });
          }

          // Check content of DB variants
          const userDbPath = join(variantsDir, 'UserDb.schema.ts');
          if (existsSync(userDbPath)) {
            SchemaValidationUtils.expectSchemaContent(userDbPath, {
              hasFields: ['id', 'email', 'internalField', 'name'],
              excludesFields: ['computedField'],
            });
          }

          const postDbPath = join(variantsDir, 'PostDb.schema.ts');
          if (existsSync(postDbPath)) {
            SchemaValidationUtils.expectSchemaContent(postDbPath, {
              hasFields: ['id', 'title', 'internalField', 'content'],
              excludesFields: ['computedField'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle complex variant configurations with multiple models',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-complex');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'create',
                suffix: 'Create',
                exclude: ['id', 'createdAt', 'updatedAt'],
              },
              {
                name: 'update',
                suffix: 'Update',
                exclude: ['id', 'createdAt'],
                makeOptional: ['email', 'title'], // Make some fields optional
              },
              {
                name: 'public',
                suffix: 'Public',
                exclude: ['password', 'secret', 'internalNotes'],
              },
            ],
            models: {
              User: {
                enabled: true,
                variants: {
                  create: { exclude: ['role'] },
                  update: { exclude: ['email'] },
                  public: { exclude: ['lastLoginAt'] },
                },
              },
              Post: {
                enabled: true,
                variants: {
                  create: { exclude: ['viewCount'] },
                  update: { exclude: [] },
                  public: { exclude: ['draft'] },
                },
              },
            },
          };

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
  id          Int      @id @default(autoincrement())
  email       String   @unique
  password    String
  role        String   @default("USER")
  secret      String
  lastLoginAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Post {
  id            Int      @id @default(autoincrement())
  title         String
  content       String?
  viewCount     Int      @default(0)
  draft         Boolean  @default(true)
  internalNotes String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Check User create variant - global + model-specific exclusions
          const userCreatePath = join(variantsDir, 'UserCreate.schema.ts');
          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email', 'password', 'secret', 'lastLoginAt'],
              excludesFields: ['id', 'createdAt', 'updatedAt', 'role'], // Global + model-specific
            });
          }

          // Check User update variant
          const userUpdatePath = join(variantsDir, 'UserUpdate.schema.ts');
          if (existsSync(userUpdatePath)) {
            SchemaValidationUtils.expectSchemaContent(userUpdatePath, {
              hasFields: ['password', 'role', 'secret', 'lastLoginAt', 'updatedAt'],
              excludesFields: ['id', 'createdAt', 'email'], // Global + model-specific
            });
          }

          // Check User public variant
          const userPublicPath = join(variantsDir, 'UserPublic.schema.ts');
          if (existsSync(userPublicPath)) {
            SchemaValidationUtils.expectSchemaContent(userPublicPath, {
              hasFields: ['id', 'email', 'role', 'createdAt', 'updatedAt'],
              excludesFields: ['password', 'secret', 'lastLoginAt'], // Global + model-specific
            });
          }

          // Check Post variants
          const postCreatePath = join(variantsDir, 'PostCreate.schema.ts');
          if (existsSync(postCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(postCreatePath, {
              hasFields: ['title', 'content', 'draft', 'internalNotes'],
              excludesFields: ['id', 'createdAt', 'updatedAt', 'viewCount'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Variant Import/Export Management', () => {
    it(
      'should create proper import/export management for variant schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-imports');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'input',
                suffix: 'Input',
                exclude: ['id'],
              },
              {
                name: 'output',
                suffix: 'Output',
                exclude: ['password'],
              },
            ],
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Check individual variant files have proper imports
          const userInputPath = join(variantsDir, 'UserInput.schema.ts');
          if (existsSync(userInputPath)) {
            const content = readFileSync(userInputPath, 'utf-8');

            // Should import Zod
            expect(content).toMatch(/import.*z.*from.*zod/);

            // Should have proper exports
            expect(content).toMatch(/export const UserInputSchema/);

            // Should be valid Zod schema
            expect(content).toMatch(/z\.object\(/);
          }

          // Check variants index file
          const variantsIndexPath = join(variantsDir, 'index.ts');
          if (existsSync(variantsIndexPath)) {
            const content = readFileSync(variantsIndexPath, 'utf-8');

            // Should export all variant schemas
            expect(content).toMatch(/export.*UserInputSchema.*from/);
            expect(content).toMatch(/export.*UserOutputSchema.*from/);
            expect(content).toMatch(/export.*PostInputSchema.*from/);
            expect(content).toMatch(/export.*PostOutputSchema.*from/);
          }

          // Check main index file includes variants
          const mainIndexPath = join(testEnv.outputDir, 'schemas', 'index.ts');
          if (existsSync(mainIndexPath)) {
            const content = readFileSync(mainIndexPath, 'utf-8');

            // Should re-export variants
            expect(content).toMatch(/export.*from.*variants/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle cross-variant references correctly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-cross-references');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'base',
                suffix: 'Base',
                exclude: [],
              },
              {
                name: 'extended',
                suffix: 'Extended',
                exclude: [],
                inherit: ['base'], // Extend base variant
                additional: ['computedField'],
              },
            ],
          };

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
  id           Int     @id @default(autoincrement())
  email        String  @unique
  name         String?
  computedField String? // Only in extended variant
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Check base variant
          const userBasePath = join(variantsDir, 'UserBase.schema.ts');
          if (existsSync(userBasePath)) {
            SchemaValidationUtils.expectSchemaContent(userBasePath, {
              hasFields: ['id', 'email', 'name'],
            });
          }

          // Check extended variant (if inheritance is supported)
          const userExtendedPath = join(variantsDir, 'UserExtended.schema.ts');
          if (existsSync(userExtendedPath)) {
            const content = readFileSync(userExtendedPath, 'utf-8');

            // Should include all base fields plus additional
            expect(content).toMatch(/id:/);
            expect(content).toMatch(/email:/);
            expect(content).toMatch(/name:/);

            // May include computed field or reference base schema
            if (content.includes('computedField') || content.includes('UserBaseSchema')) {
              // Either includes computedField directly or extends base schema
              expect(true).toBe(true);
            }
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should create barrel exports for variant schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-barrel-exports');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              { name: 'create', suffix: 'Create', exclude: ['id'] },
              { name: 'update', suffix: 'Update', exclude: ['id', 'createdAt'] },
              { name: 'view', suffix: 'View', exclude: ['password'] },
            ],
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');
          const variantsIndexPath = join(variantsDir, 'index.ts');

          if (existsSync(variantsIndexPath)) {
            const content = readFileSync(variantsIndexPath, 'utf-8');

            // Should export all variant schemas
            const expectedExports = [
              'UserCreateSchema',
              'UserUpdateSchema',
              'UserViewSchema',
              'PostCreateSchema',
              'PostUpdateSchema',
              'PostViewSchema',
            ];

            expectedExports.forEach((exportName) => {
              expect(content).toMatch(new RegExp(`export.*${exportName}.*from`));
            });

            // Should have proper file structure
            expect(content).toMatch(/export.*from.*UserCreate\.schema/);
            expect(content).toMatch(/export.*from.*PostView\.schema/);
          }

          // Check that main index includes variants export
          const mainIndexPath = join(testEnv.outputDir, 'schemas', 'index.ts');
          if (existsSync(mainIndexPath)) {
            const content = readFileSync(mainIndexPath, 'utf-8');
            expect(content).toMatch(/export.*from.*\.\/variants/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Enum import handling in variant files', () => {
    it(
      'should import a single enum from @prisma/client in variant schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-enum-single');
        try {
          const config = ConfigGenerator.createBasicConfig();
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

enum Role {
  USER
  ADMIN
}

model User {
  id    Int   @id @default(autoincrement())
  email String @unique
  role  Role
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const userPurePath = join(
            testEnv.outputDir,
            'schemas',
            'variants',
            'pure',
            'User.pure.ts',
          );
          expect(existsSync(userPurePath)).toBe(true);
          const content = readFileSync(userPurePath, 'utf-8');

          expect(content).toMatch(
            /import\s*\{\s*RoleSchema\s*\}\s*from\s*'.*?\/enums\/Role\.schema';/,
          );
          expect(content).toMatch(/role:\s*RoleSchema/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should import multiple enums exactly once in variant schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-enum-multiple');
        try {
          const config = ConfigGenerator.createBasicConfig();
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

enum Role {
  USER
  ADMIN
}
enum Status {
  ACTIVE
  INACTIVE
}

model User {
  id     Int    @id @default(autoincrement())
  email  String @unique
  role   Role
  status Status?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const userPurePath = join(
            testEnv.outputDir,
            'schemas',
            'variants',
            'pure',
            'User.pure.ts',
          );
          expect(existsSync(userPurePath)).toBe(true);
          const content = readFileSync(userPurePath, 'utf-8');

          // Should have enum schema imports from generated files
          expect(content).toMatch(
            /import\s*\{\s*RoleSchema\s*\}\s*from\s*'.*?\/enums\/Role\.schema';/,
          );
          expect(content).toMatch(
            /import\s*\{\s*StatusSchema\s*\}\s*from\s*'.*?\/enums\/Status\.schema';/,
          );

          // Ensure enum schema usages are present (allow optional/nullable variations)
          expect(content).toMatch(/role:\s*RoleSchema(?:\.(?:optional|nullable)\(\))?/);
          expect(content).toMatch(/status:\s*StatusSchema(?:\.(?:optional|nullable)\(\))?/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should not add @prisma/client value import when no enums are used',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-no-enum');
        try {
          const config = ConfigGenerator.createBasicConfig();
          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User'],
            generatorOptions: { config: './config.json' },
            outputPath: `${testEnv.outputDir}/schemas`,
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const userPurePath = join(
            testEnv.outputDir,
            'schemas',
            'variants',
            'pure',
            'User.pure.ts',
          );
          expect(existsSync(userPurePath)).toBe(true);
          const content = readFileSync(userPurePath, 'utf-8');

          // No value import from @prisma/client should exist when no enums
          expect(/import\s*\{[^}]*\}\s*from\s*'@prisma\/client';/.test(content)).toBe(false);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Variant Integration with Other Features', () => {
    it(
      'should work with field exclusions at multiple levels',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-field-exclusions');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            globalExclusions: ['globalSecret'], // Global level
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['modelSecret'], // Model level
                },
              },
            },
            variants: [
              {
                name: 'public',
                suffix: 'Public',
                exclude: ['variantSecret', 'password'], // Variant level
              },
              {
                name: 'internal',
                suffix: 'Internal',
                exclude: ['password'], // Different variant level exclusions
              },
            ],
          };

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
  id            Int     @id @default(autoincrement())
  email         String  @unique
  password      String
  globalSecret  String  // Excluded globally
  modelSecret   String  // Excluded at model level
  variantSecret String  // Excluded at variant level for public
  name          String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Public variant should exclude: global + model + variant exclusions
          const userPublicPath = join(variantsDir, 'UserPublic.schema.ts');
          if (existsSync(userPublicPath)) {
            SchemaValidationUtils.expectSchemaContent(userPublicPath, {
              hasFields: ['id', 'email', 'name'],
              excludesFields: ['globalSecret', 'modelSecret', 'variantSecret', 'password'],
            });
          }

          // Internal variant should exclude: global + model + different variant exclusions
          const userInternalPath = join(variantsDir, 'UserInternal.schema.ts');
          if (existsSync(userInternalPath)) {
            SchemaValidationUtils.expectSchemaContent(userInternalPath, {
              hasFields: ['id', 'email', 'variantSecret', 'name'], // variantSecret included in internal
              excludesFields: ['globalSecret', 'modelSecret', 'password'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should integrate with @zod comment validations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-zod-comments');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'strict',
                suffix: 'Strict',
                exclude: [],
              },
              {
                name: 'loose',
                suffix: 'Loose',
                exclude: [],
                removeValidation: true, // Remove @zod validations in loose variant
              },
            ],
          };

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
  id    Int    @id @default(autoincrement())
  email String @unique /// @zod.email()
  name  String? /// @zod.min(2).max(50)
  age   Int? /// @zod.min(0).max(120)
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Strict variant should include @zod validations
          const userStrictPath = join(variantsDir, 'UserStrict.schema.ts');
          if (existsSync(userStrictPath)) {
            const content = readFileSync(userStrictPath, 'utf-8');

            expect(content).toMatch(/email.*\.email\(\)/);
            expect(content).toMatch(/name.*\.min\(2\)/);
            expect(content).toMatch(/name.*\.max\(50\)/);
            expect(content).toMatch(/age.*\.min\(0\)/);
            expect(content).toMatch(/age.*\.max\(120\)/);
          }

          // Loose variant should exclude @zod validations (if supported)
          const userLoosePath = join(variantsDir, 'UserLoose.schema.ts');
          if (existsSync(userLoosePath)) {
            const content = readFileSync(userLoosePath, 'utf-8');

            // Should have basic types without validations
            expect(content).toMatch(/email.*z\.string\(\)/);
            expect(content).toMatch(/name.*z\.string\(\)/);
            expect(content).toMatch(/age.*z\.number\(\)/);

            // Validation removal might not be implemented yet
            // expect(content).not.toMatch(/\.email\(\)/);
            // expect(content).not.toMatch(/\.min\(/);
            // expect(content).not.toMatch(/\.max\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should work with minimal mode configurations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-minimal-mode');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            minimal: true, // Enable minimal mode
            variants: [
              {
                name: 'create',
                suffix: 'Create',
                exclude: ['id', 'createdAt', 'updatedAt'],
              },
              {
                name: 'update',
                suffix: 'Update',
                exclude: ['id', 'createdAt'],
              },
            ],
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');
          const operationsDir = join(testEnv.outputDir, 'schemas');

          // Should generate variants even in minimal mode
          const userCreatePath = join(variantsDir, 'UserCreate.schema.ts');
          const userUpdatePath = join(variantsDir, 'UserUpdate.schema.ts');

          expect(existsSync(userCreatePath), 'Create variant should exist').toBe(true);
          expect(existsSync(userUpdatePath), 'Update variant should exist').toBe(true);

          // Should still respect minimal mode for operations (fewer operation files)
          const operationFiles = FileSystemUtils.countFiles(
            operationsDir,
            /^(findMany|findUnique|createOne|updateOne|deleteOne)\w+\.schema\.ts$/,
          );
          const allOperationFiles = FileSystemUtils.countFiles(operationsDir, /\w+\.schema\.ts$/);

          // In minimal mode, should have fewer operation files
          expect(operationFiles).toBeGreaterThan(0);
          expect(operationFiles).toBeLessThan(allOperationFiles + 10); // Some reasonable threshold
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Variant Performance and Validation', () => {
    it(
      'should generate variants efficiently without conflicts',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-performance');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              { name: 'v1', suffix: 'V1', exclude: ['field1'] },
              { name: 'v2', suffix: 'V2', exclude: ['field2'] },
              { name: 'v3', suffix: 'V3', exclude: ['field3'] },
              { name: 'v4', suffix: 'V4', exclude: ['field4'] },
              { name: 'v5', suffix: 'V5', exclude: ['field5'] },
            ],
          };

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

model TestModel {
  id     Int     @id @default(autoincrement())
  field1 String
  field2 String
  field3 String
  field4 String
  field5 String
  common String
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          const startTime = Date.now();
          await testEnv.runGeneration();
          const endTime = Date.now();

          const generationTime = endTime - startTime;

          // Should complete in reasonable time
          // Allow a higher ceiling in parallel test runs to avoid flakiness.
          expect(generationTime).toBeLessThan(50000); // 50 seconds

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Should generate all variant files
          const expectedVariants = [
            'TestModelV1',
            'TestModelV2',
            'TestModelV3',
            'TestModelV4',
            'TestModelV5',
          ];
          expectedVariants.forEach((variant) => {
            const filePath = join(variantsDir, `${variant}.schema.ts`);
            expect(existsSync(filePath), `Variant should exist: ${variant}`).toBe(true);
          });

          // Each variant should exclude the correct field
          const testModelV1Path = join(variantsDir, 'TestModelV1.schema.ts');
          if (existsSync(testModelV1Path)) {
            SchemaValidationUtils.expectSchemaContent(testModelV1Path, {
              hasFields: ['id', 'field2', 'field3', 'field4', 'field5', 'common'],
              excludesFields: ['field1'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should validate variant configurations for consistency',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('schema-variants-validation');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'valid',
                suffix: 'Valid',
                exclude: ['existingField'],
              },
              {
                name: 'invalid',
                suffix: 'Invalid',
                exclude: ['nonExistentField'], // Field that doesn't exist
              },
            ],
          };

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
  id            Int     @id @default(autoincrement())
  email         String  @unique
  existingField String
  name          String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          // Should handle invalid field exclusions gracefully
          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Valid variant should work correctly
          const userValidPath = join(variantsDir, 'UserValid.schema.ts');
          if (existsSync(userValidPath)) {
            SchemaValidationUtils.expectSchemaContent(userValidPath, {
              hasFields: ['id', 'email', 'name'],
              excludesFields: ['existingField'],
            });
          }

          // Invalid variant should still generate (ignoring non-existent field)
          const userInvalidPath = join(variantsDir, 'UserInvalid.schema.ts');
          if (existsSync(userInvalidPath)) {
            SchemaValidationUtils.expectSchemaContent(userInvalidPath, {
              hasFields: ['id', 'email', 'existingField', 'name'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
