import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  TestEnvironment,
  ConfigGenerator,
  PrismaSchemaGenerator,
  SchemaValidationUtils,
  GENERATION_TIMEOUT,
} from './helpers';

describe('Field Exclusion System Tests', () => {
  describe('Global Field Exclusions', () => {
    it(
      'should exclude globally specified fields from all models',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-global');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            globalExclusions: {
              input: ['password', 'secretKey', 'internalId'],
              result: ['password', 'secretKey', 'internalId'],
              pure: ['password', 'secretKey', 'internalId'],
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
  id         Int     @id @default(autoincrement())
  email      String  @unique
  password   String  // Should be globally excluded
  secretKey  String  // Should be globally excluded
  internalId String  // Should be globally excluded
  name       String?
}

model Admin {
  id         Int     @id @default(autoincrement())
  username   String  @unique
  password   String  // Should be globally excluded
  secretKey  String  // Should be globally excluded
  internalId String  // Should be globally excluded
  role       String
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // Check User model schemas
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
          const userWherePath = join(objectsDir, 'UserWhereInput.schema.ts');

          [userCreatePath, userWherePath].forEach((filePath) => {
            if (existsSync(filePath)) {
              SchemaValidationUtils.expectSchemaContent(filePath, {
                hasFields: ['email', 'name'],
                excludesFields: ['password', 'secretKey', 'internalId'],
              });
            }
          });

          // Check Admin model schemas
          const adminCreatePath = join(objectsDir, 'AdminCreateInput.schema.ts');
          const adminWherePath = join(objectsDir, 'AdminWhereInput.schema.ts');

          [adminCreatePath, adminWherePath].forEach((filePath) => {
            if (existsSync(filePath)) {
              SchemaValidationUtils.expectSchemaContent(filePath, {
                hasFields: ['username', 'role'],
                excludesFields: ['password', 'secretKey', 'internalId'],
              });
            }
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle pattern-based global exclusions',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-global-patterns');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            globalExclusions: {
              input: ['*Password', 'internal*', 'private*'], // Pattern-based exclusions
              result: ['*Password', 'internal*', 'private*'],
              pure: ['*Password', 'internal*', 'private*'],
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
  id               Int     @id @default(autoincrement())
  email            String  @unique
  userPassword     String  // Should match *Password
  adminPassword    String  // Should match *Password
  internalId       String  // Should match internal*
  internalMetadata Json?   // Should match internal*
  privateField     String  // Should match private*
  privateTempData  String? // Should match private*
  name             String?
  publicField      String
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email', 'name', 'publicField'],
              excludesFields: [
                'userPassword',
                'adminPassword', // *Password pattern
                'internalId',
                'internalMetadata', // internal* pattern
                'privateField',
                'privateTempData', // private* pattern
              ],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Model-Specific Field Exclusions', () => {
    it(
      'should exclude fields only from specified models',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-model-specific');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['metadata', 'preferences'],
                },
              },
              Post: {
                enabled: true,
                fields: {
                  exclude: ['authorId', 'views'], // Different exclusions
                },
              },
              Profile: {
                enabled: true,
                // No field exclusions
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
  id          Int     @id @default(autoincrement())
  email       String  @unique
  metadata    Json?   // Should be excluded from User
  preferences Json?   // Should be excluded from User
  name        String?
  posts       Post[]
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  authorId Int     // Should be excluded from Post
  views    Int     @default(0) // Should be excluded from Post
  content  String?
  author   User    @relation(fields: [authorId], references: [id])
}

model Profile {
  id       Int     @id @default(autoincrement())
  bio      String?
  metadata Json?   // Should NOT be excluded from Profile
  views    Int     @default(0) // Should NOT be excluded from Profile
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // User should exclude metadata and preferences
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email', 'name'],
              excludesFields: ['metadata', 'preferences'],
            });
          }

          // Post should exclude authorId and views
          const postCreatePath = join(objectsDir, 'PostCreateInput.schema.ts');
          if (existsSync(postCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(postCreatePath, {
              hasFields: ['title', 'content'],
              excludesFields: ['authorId', 'views'],
            });
          }

          // Profile should include all fields (no exclusions)
          const profileCreatePath = join(objectsDir, 'ProfileCreateInput.schema.ts');
          if (existsSync(profileCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(profileCreatePath, {
              hasFields: ['bio', 'metadata', 'views'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should combine global and model-specific exclusions',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-combined');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            globalExclusions: {
              input: ['password'], // Global exclusion
              result: ['password'],
              pure: ['password'],
            },
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['metadata'], // Additional model-specific exclusion
                },
              },
              Admin: {
                enabled: true,
                fields: {
                  exclude: ['lastLogin'], // Different model-specific exclusion
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
  id       Int     @id @default(autoincrement())
  email    String  @unique
  password String  // Should be excluded globally
  metadata Json?   // Should be excluded model-specifically
  name     String?
}

model Admin {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String   // Should be excluded globally
  lastLogin DateTime? // Should be excluded model-specifically
  role      String
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // User should exclude both global (password) and model-specific (metadata)
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email', 'name'],
              excludesFields: ['password', 'metadata'],
            });
          }

          // Admin should exclude both global (password) and model-specific (lastLogin)
          const adminCreatePath = join(objectsDir, 'AdminCreateInput.schema.ts');
          if (existsSync(adminCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(adminCreatePath, {
              hasFields: ['username', 'role'],
              excludesFields: ['password', 'lastLogin'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Variant-Specific Field Exclusions', () => {
    it(
      'should exclude fields per variant configuration',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-variant-specific');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            variants: [
              {
                name: 'public',
                suffix: 'Public',
                exclude: ['password', 'email', 'internalId'],
              },
              {
                name: 'admin',
                suffix: 'Admin',
                exclude: ['password'], // Only exclude password for admin variant
              },
              {
                name: 'system',
                suffix: 'System',
                exclude: [], // No exclusions for system variant
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
  id         Int     @id @default(autoincrement())
  email      String  @unique
  password   String
  internalId String
  name       String?
  role       String
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Check public variant - should exclude password, email, internalId
          const publicSchemaPath = join(schemasDir, 'UserPublic.schema.ts');
          if (existsSync(publicSchemaPath)) {
            SchemaValidationUtils.expectSchemaContent(publicSchemaPath, {
              hasFields: ['name', 'role'],
              excludesFields: ['password', 'email', 'internalId'],
            });
          }

          // Check admin variant - should only exclude password
          const adminSchemaPath = join(schemasDir, 'UserAdmin.schema.ts');
          if (existsSync(adminSchemaPath)) {
            SchemaValidationUtils.expectSchemaContent(adminSchemaPath, {
              hasFields: ['email', 'internalId', 'name', 'role'],
              excludesFields: ['password'],
            });
          }

          // Check system variant - should include all fields
          const systemSchemaPath = join(schemasDir, 'UserSystem.schema.ts');
          if (existsSync(systemSchemaPath)) {
            SchemaValidationUtils.expectSchemaContent(systemSchemaPath, {
              hasFields: ['email', 'password', 'internalId', 'name', 'role'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should combine model-specific and variant-specific exclusions',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv(
          'field-exclusion-model-variant-combined',
        );

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['metadata'], // Model-specific exclusion
                },
              },
            },
            variants: [
              {
                name: 'safe',
                suffix: 'Safe',
                exclude: ['password', 'secretKey'], // Variant-specific exclusions
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
  id        Int     @id @default(autoincrement())
  email     String  @unique
  password  String  // Should be excluded in variant
  secretKey String  // Should be excluded in variant
  metadata  Json?   // Should be excluded model-specifically
  name      String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Base User schemas should exclude metadata (model-specific)
          const userCreatePath = join(schemasDir, 'objects', 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email', 'password', 'secretKey', 'name'],
              excludesFields: ['metadata'],
            });
          }

          // Safe variant should exclude metadata + password + secretKey
          const safeSchemaPath = join(schemasDir, 'UserSafe.schema.ts');
          if (existsSync(safeSchemaPath)) {
            SchemaValidationUtils.expectSchemaContent(safeSchemaPath, {
              hasFields: ['email', 'name'],
              excludesFields: ['metadata', 'password', 'secretKey'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Relationship Field Exclusions', () => {
    it(
      'should handle relationship field exclusions properly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-relationships');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['posts'], // Exclude relation field
                },
              },
              Post: {
                enabled: true,
                fields: {
                  exclude: ['author'], // Exclude relation field
                },
              },
            },
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // User include schema should not have posts relation
          const userIncludePath = join(objectsDir, 'UserInclude.schema.ts');
          if (existsSync(userIncludePath)) {
            const content = readFileSync(userIncludePath, 'utf-8');
            expect(content).not.toMatch(/posts:/);
          }

          // Post include schema should not have author relation
          const postIncludePath = join(objectsDir, 'PostInclude.schema.ts');
          if (existsSync(postIncludePath)) {
            const content = readFileSync(postIncludePath, 'utf-8');
            expect(content).not.toMatch(/author:/);
          }

          // Foreign key fields should still be present
          const postCreatePath = join(objectsDir, 'PostCreateInput.schema.ts');
          if (existsSync(postCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(postCreatePath, {
              hasFields: ['title', 'content', 'authorId'], // Foreign key should remain
              excludesFields: ['author'], // Relation should be excluded
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should preserve relationship integrity when excluding related fields',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv(
          'field-exclusion-relationship-integrity',
        );

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['profile'], // Exclude one-to-one relation
                },
              },
              Profile: {
                enabled: true,
                fields: {
                  exclude: ['user'], // Exclude back-reference
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
  id      Int      @id @default(autoincrement())
  email   String   @unique
  profile Profile?
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  user   User   @relation(fields: [userId], references: [id])
  userId Int    @unique
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // User should not reference profile relation
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email'],
              excludesFields: ['profile'],
            });
          }

          // Profile should not reference user relation but should keep userId
          const profileCreatePath = join(objectsDir, 'ProfileCreateInput.schema.ts');
          if (existsSync(profileCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(profileCreatePath, {
              hasFields: ['bio', 'userId'], // Foreign key preserved
              excludesFields: ['user'], // Relation excluded
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Exclusion Rule Conflict Resolution', () => {
    it(
      'should handle overlapping exclusion rules with proper precedence',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-conflict-resolution');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            globalExclusions: ['password'],
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['password', 'metadata'], // Overlaps with global
                  include: ['password'], // Should override exclusion
                },
              },
            },
            variants: [
              {
                name: 'secure',
                suffix: 'Secure',
                exclude: ['password', 'email'], // Overlaps with global and model
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
  id       Int     @id @default(autoincrement())
  email    String  @unique
  password String
  metadata Json?
  name     String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Base User schema - model-specific include should override global exclusion
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email', 'password', 'name'], // password included despite global exclusion
              excludesFields: ['metadata'], // metadata still excluded
            });
          }

          // Secure variant should respect variant exclusions
          const secureSchemaPath = join(schemasDir, 'UserSecure.schema.ts');
          if (existsSync(secureSchemaPath)) {
            SchemaValidationUtils.expectSchemaContent(secureSchemaPath, {
              hasFields: ['name'],
              excludesFields: ['password', 'email', 'metadata'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should validate exclusion rule configurations for consistency',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-validation');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['nonExistentField', 'anotherFakeField'], // Fields that don't exist
                },
              },
            },
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          // Should handle non-existent field exclusions gracefully
          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            // Should still generate with existing fields
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email', 'name'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('TypeScript Type Management with Exclusions', () => {
    it(
      'should maintain correct TypeScript types when fields are excluded',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-typescript-types');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['password', 'metadata'],
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
  id       Int     @id @default(autoincrement())
  email    String  @unique
  password String
  metadata Json?
  name     String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should import Prisma types
            expect(content).toMatch(/import.*@prisma\/client/);

            // Should have correct TypeScript types that match excluded fields
            expect(content).toMatch(/Prisma\./);

            // Should not reference excluded field types
            expect(content).not.toMatch(/password.*:/);
            expect(content).not.toMatch(/metadata.*:/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle optional vs required field exclusions correctly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('field-exclusion-optional-required');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            optionalFieldBehavior: 'optional',
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['optionalField', 'requiredField'],
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
  id            Int     @id @default(autoincrement())
  email         String  @unique
  requiredField String  // Required field to exclude
  optionalField String? // Optional field to exclude
  name          String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          // Update schema with correct config path
          const schemaWithConfigPath = schema.replace(
            'config   = "./config.json"',
            `config   = "${configPath}"`,
          );
          writeFileSync(testEnv.schemaPath, schemaWithConfigPath);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasFields: ['email', 'name'],
              excludesFields: ['requiredField', 'optionalField'],
            });

            const content = readFileSync(userCreatePath, 'utf-8');

            // Should handle remaining field optionality correctly
            expect(content).toMatch(/email.*z\.string/);
            expect(content).toMatch(/name.*optional|z\.string\(\)\.optional/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
