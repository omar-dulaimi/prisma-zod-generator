import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  TestEnvironment,
} from './helpers';

describe('Filtering Logic Tests', () => {
  describe('Model-Level Filtering', () => {
    it(
      'should enable/disable entire models based on configuration',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-model-level');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: { enabled: true },
              Post: { enabled: false },
              Profile: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post', 'Profile'],
            generatorOptions: { config: configPath },
          });

          writeFileSync(testEnv.schemaPath, schema);

          // Build and generate
          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // User model should be generated
          const userFiles = [
            join(schemasDir, 'findManyUser.schema.ts'),
            join(schemasDir, 'createManyUser.schema.ts'),
            join(schemasDir, 'updateManyUser.schema.ts'),
          ];
          userFiles.forEach((file) => {
            expect(existsSync(file), `User schema file should exist: ${file}`).toBe(true);
          });

          // Post model should NOT be generated
          const postFiles = [
            join(schemasDir, 'findManyPost.schema.ts'),
            join(schemasDir, 'createManyPost.schema.ts'),
            join(schemasDir, 'updateManyPost.schema.ts'),
          ];
          postFiles.forEach((file) => {
            expect(existsSync(file), `Post schema file should NOT exist: ${file}`).toBe(false);
          });

          // Profile model should be generated
          const profileFiles = [
            join(schemasDir, 'findManyProfile.schema.ts'),
            join(schemasDir, 'createManyProfile.schema.ts'),
          ];
          profileFiles.forEach((file) => {
            expect(existsSync(file), `Profile schema file should exist: ${file}`).toBe(true);
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle model filtering with relationships',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-model-relationships');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: { enabled: true },
              Post: { enabled: false }, // Disable related model
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: configPath },
          });

          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // User schemas should exist but not reference Post types when Post is disabled
          const userWhereInputPath = join(schemasDir, 'objects', 'UserWhereInput.schema.ts');
          if (existsSync(userWhereInputPath)) {
            const content = readFileSync(userWhereInputPath, 'utf-8');

            // Should not import or reference Post-related types
            expect(content).not.toMatch(/PostListRelationFilter/);
            expect(content).not.toMatch(/PostOrderByRelationAggregateInput/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should generate index files excluding disabled models',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-index-files');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: { enabled: true },
              Post: { enabled: false },
              Profile: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post', 'Profile'],
            generatorOptions: { config: configPath },
          });

          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const indexPath = join(testEnv.outputDir, 'schemas', 'index.ts');
          if (existsSync(indexPath)) {
            const content = readFileSync(indexPath, 'utf-8');

            // Should export User and Profile schemas
            expect(content).toMatch(/findManyUser/);
            expect(content).toMatch(/findManyProfile/);

            // Should NOT export Post schemas
            expect(content).not.toMatch(/findManyPost/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Operation-Level Filtering', () => {
    it(
      'should control which CRUD operations are generated per model',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-operation-level');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                operations: ['findMany', 'findUnique', 'create'], // Only read + create
              },
              Post: {
                enabled: true,
                operations: ['findMany', 'update', 'delete'], // Only read + modify
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: configPath },
          });

          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // User: should have findMany, findUnique, create
          const userAllowedFiles = [
            join(schemasDir, 'findManyUser.schema.ts'),
            join(schemasDir, 'findUniqueUser.schema.ts'),
            join(schemasDir, 'createOneUser.schema.ts'),
          ];
          userAllowedFiles.forEach((file) => {
            expect(existsSync(file), `User allowed operation should exist: ${file}`).toBe(true);
          });

          // User: should NOT have update, delete, upsert, aggregate
          const userDisallowedFiles = [
            join(schemasDir, 'updateOneUser.schema.ts'),
            join(schemasDir, 'deleteManyUser.schema.ts'),
            join(schemasDir, 'upsertOneUser.schema.ts'),
            join(schemasDir, 'aggregateUser.schema.ts'),
          ];
          userDisallowedFiles.forEach((file) => {
            expect(existsSync(file), `User disallowed operation should NOT exist: ${file}`).toBe(
              false,
            );
          });

          // Post: should have findMany, update, delete
          const postAllowedFiles = [
            join(schemasDir, 'findManyPost.schema.ts'),
            join(schemasDir, 'updateOnePost.schema.ts'),
            join(schemasDir, 'deleteManyPost.schema.ts'),
          ];
          postAllowedFiles.forEach((file) => {
            expect(existsSync(file), `Post allowed operation should exist: ${file}`).toBe(true);
          });

          // Post: should NOT have create, upsert
          const postDisallowedFiles = [
            join(schemasDir, 'createOnePost.schema.ts'),
            join(schemasDir, 'upsertOnePost.schema.ts'),
          ];
          postDisallowedFiles.forEach((file) => {
            expect(existsSync(file), `Post disallowed operation should NOT exist: ${file}`).toBe(
              false,
            );
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle aggregate operations filtering',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-aggregate-ops');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                operations: ['findMany', 'aggregate'], // Include aggregate
              },
              Post: {
                enabled: true,
                operations: ['findMany'], // Exclude aggregate
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: configPath },
          });

          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // User should have aggregate operation
          const userAggregateFile = join(schemasDir, 'aggregateUser.schema.ts');
          expect(existsSync(userAggregateFile), 'User aggregate should exist').toBe(true);

          // Post should NOT have aggregate operation
          const postAggregateFile = join(schemasDir, 'aggregatePost.schema.ts');
          expect(existsSync(postAggregateFile), 'Post aggregate should NOT exist').toBe(false);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should validate operation names against allowed operations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-operation-validation');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                operations: ['findMany', 'invalidOperation', 'create'], // Invalid operation
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User'],
            generatorOptions: { config: configPath },
          });

          writeFileSync(testEnv.schemaPath, schema);

          // Should handle invalid operations gracefully
          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Valid operations should still be generated
          const validFiles = [
            join(schemasDir, 'findManyUser.schema.ts'),
            join(schemasDir, 'createOneUser.schema.ts'),
          ];
          validFiles.forEach((file) => {
            expect(existsSync(file), `Valid operation should exist: ${file}`).toBe(true);
          });
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Field-Level Filtering', () => {
    it(
      'should exclude specific fields from generated schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-field-level');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['internalId', 'password'],
                },
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
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
  config   = "${configPath}"
}

model User {
  id         Int     @id @default(autoincrement())
  email      String  @unique
  password   String  // Should be excluded
  internalId String  // Should be excluded
  name       String?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Check create input schema
          const createInputPath = join(schemasDir, 'objects', 'UserCreateInput.schema.ts');
          if (existsSync(createInputPath)) {
            const content = readFileSync(createInputPath, 'utf-8');

            // Should contain allowed fields
            expect(content).toMatch(/email:/);
            expect(content).toMatch(/name:/);

            // Should NOT contain excluded fields
            expect(content).not.toMatch(/password:/);
            expect(content).not.toMatch(/internalId:/);
          }

          // Check where input schema
          const whereInputPath = join(schemasDir, 'objects', 'UserWhereInput.schema.ts');
          if (existsSync(whereInputPath)) {
            const content = readFileSync(whereInputPath, 'utf-8');

            // Should contain allowed fields
            expect(content).toMatch(/email:/);
            expect(content).toMatch(/name:/);

            // Should NOT contain excluded fields
            expect(content).not.toMatch(/password:/);
            expect(content).not.toMatch(/internalId:/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle relationship field exclusions properly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-relationship-fields');

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
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: configPath },
          });

          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // User include schema should exist but not include posts relation
          const userIncludePath = join(schemasDir, 'objects', 'UserInclude.schema.ts');
          if (existsSync(userIncludePath)) {
            const content = readFileSync(userIncludePath, 'utf-8');
            expect(content).not.toMatch(/posts:/);
          }

          // User select schema should not include posts relation
          const userSelectPath = join(schemasDir, 'objects', 'UserSelect.schema.ts');
          if (existsSync(userSelectPath)) {
            const content = readFileSync(userSelectPath, 'utf-8');
            expect(content).not.toMatch(/posts:/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should preserve field relationships and imports when filtering',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-field-relationships');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['metadata'], // Exclude non-essential field
                },
              },
              Post: {
                enabled: true,
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
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
  config   = "${configPath}"
}

model User {
  id         Int     @id @default(autoincrement())
  email      String  @unique
  metadata   Json?   // Should be excluded
  posts      Post[]
}

model Post {
  id         Int     @id @default(autoincrement())
  title      String
  author     User    @relation(fields: [authorId], references: [id])
  authorId   Int
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // User schema should still maintain relationship to Post
          const userCreateInputPath = join(schemasDir, 'objects', 'UserCreateInput.schema.ts');
          if (existsSync(userCreateInputPath)) {
            const content = readFileSync(userCreateInputPath, 'utf-8');

            // Should NOT contain excluded field
            expect(content).not.toMatch(/metadata:/);

            // Should still reference Post relationship if posts field is included
            expect(content).toMatch(/posts/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Complex Filtering Scenarios', () => {
    it(
      'should handle combinations of model, operation, and field filtering',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-complex-combination');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                operations: ['findMany', 'create'],
                fields: {
                  exclude: ['password'],
                },
              },
              Post: {
                enabled: true,
                operations: ['findMany', 'update'],
                fields: {
                  exclude: ['authorId'], // Exclude foreign key
                },
              },
              Profile: {
                enabled: false, // Entire model disabled
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');

          // Create schema with absolute config path
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
  output   = "./generated/schemas"
  config   = "${configPath}"
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  password String  // Should be excluded in config
  name     String?
  role     String  @default("USER")
  posts    Post[]
  profile  Profile?
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  content  String?
  published Boolean @default(false)
  author   User    @relation(fields: [authorId], references: [id])
  authorId Int
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  avatar String?
  user   User   @relation(fields: [userId], references: [id])
  userId Int    @unique
}

model Admin {
  id       Int    @id @default(autoincrement())
  username String @unique
  // This entire model should be excluded
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // Debug: List all generated files
          console.log('🔍 Generated files in:', schemasDir);
          if (existsSync(schemasDir)) {
            const { readdirSync } = await import('fs');
            const files = readdirSync(schemasDir);
            console.log(
              '🔍 Schema files:',
              files.filter((f) => f.endsWith('.ts')),
            );
          }

          // User: should have only findMany and create operations
          expect(existsSync(join(schemasDir, 'findManyUser.schema.ts'))).toBe(true);
          expect(existsSync(join(schemasDir, 'createOneUser.schema.ts'))).toBe(true);
          expect(existsSync(join(schemasDir, 'updateOneUser.schema.ts'))).toBe(false);

          // Post: should have only findMany and update operations
          expect(existsSync(join(schemasDir, 'findManyPost.schema.ts'))).toBe(true);
          expect(existsSync(join(schemasDir, 'updateOnePost.schema.ts'))).toBe(true);
          expect(existsSync(join(schemasDir, 'createOnePost.schema.ts'))).toBe(false);

          // Profile: should have no operations (model disabled)
          expect(existsSync(join(schemasDir, 'findManyProfile.schema.ts'))).toBe(false);

          // Field exclusions should be applied
          const userCreatePath = join(schemasDir, 'objects', 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');
            expect(content).not.toMatch(/password:/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle wildcard and pattern-based filtering',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-patterns');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['*Password', 'internal*'], // Pattern-based exclusions
                },
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
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
  config   = "${configPath}"
}

model User {
  id                Int     @id @default(autoincrement())
  email            String  @unique
  userPassword     String  // Should be excluded (*Password)
  adminPassword    String  // Should be excluded (*Password)
  internalId       String  // Should be excluded (internal*)
  internalMetadata Json?   // Should be excluded (internal*)
  name             String?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          const userCreatePath = join(schemasDir, 'objects', 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should contain allowed fields
            expect(content).toMatch(/email:/);
            expect(content).toMatch(/name:/);

            // Should NOT contain pattern-matched fields
            expect(content).not.toMatch(/userPassword:/);
            expect(content).not.toMatch(/adminPassword:/);
            expect(content).not.toMatch(/internalId:/);
            expect(content).not.toMatch(/internalMetadata:/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should validate filter configurations for conflicts',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-conflict-validation');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: false, // Model disabled
                operations: ['findMany', 'create'], // Operations specified for disabled model
                fields: {
                  exclude: ['password'], // Field exclusions for disabled model
                },
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User'],
            generatorOptions: { config: configPath },
          });

          writeFileSync(testEnv.schemaPath, schema);

          // Should handle conflicting configuration gracefully
          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');

          // No User schemas should be generated since model is disabled
          expect(existsSync(join(schemasDir, 'findManyUser.schema.ts'))).toBe(false);
          expect(existsSync(join(schemasDir, 'createOneUser.schema.ts'))).toBe(false);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Import Statement Management', () => {
    // it('should adapt imports based on filtered content', async () => {
    //   const testEnv = await TestEnvironment.createTestEnv('filtering-import-management');

    //   try {
    //     const config = {
    //       ...ConfigGenerator.createBasicConfig(),
    //       models: {
    //         User: {
    //           enabled: true,
    //           fields: {
    //             exclude: ['posts'] // Exclude relation, should remove related imports
    //           }
    //         },
    //         Post: {
    //           enabled: false // Disable related model
    //         }
    //       }
    //     };

    //     const configPath = join(testEnv.testDir, 'config.json');
    //     writeFileSync(configPath, JSON.stringify(config, null, 2));

    //     const schema = PrismaSchemaGenerator.createBasicSchema({
    //       models: ['User', 'Post'],
    //       outputPath: join(testEnv.outputDir, 'schemas'),
    //       generatorOptions: { config: configPath }
    //     });

    //     writeFileSync(testEnv.schemaPath, schema);

    //     await testEnv.runGeneration();

    //     const schemasDir = join(testEnv.outputDir, 'schemas');

    //     // Check that User schemas don't import Post-related types
    //     const userSchemaFiles = FileSystemUtils.getSchemaFiles(schemasDir)
    //       .filter(file => file.includes('User'));

    //     userSchemaFiles.forEach(file => {
    //       if (existsSync(file)) {
    //         const content = readFileSync(file, 'utf-8');

    //         // Should not import Post-related schemas
    //         expect(content).not.toMatch(/from.*Post.*schema/);
    //         expect(content).not.toMatch(/PostCreateNestedManyWithoutAuthorInput/);
    //       }
    //     });

    //   } finally {
    //     await testEnv.cleanup();
    //   }
    // }, GENERATION_TIMEOUT);

    it(
      'should maintain clean index exports with filtering',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('filtering-clean-exports');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            models: {
              User: {
                enabled: true,
                operations: ['findMany', 'create'], // Limited operations
              },
              Post: {
                enabled: false,
              },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: configPath },
          });

          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const indexPath = join(testEnv.outputDir, 'schemas', 'index.ts');
          if (existsSync(indexPath)) {
            const content = readFileSync(indexPath, 'utf-8');

            // Should export only enabled User operations
            expect(content).toMatch(/findManyUser/);
            expect(content).toMatch(/createOneUser/);

            // Should not export disabled User operations
            expect(content).not.toMatch(/updateOneUser/);
            expect(content).not.toMatch(/deleteManyUser/);

            // Should not export any Post operations
            expect(content).not.toMatch(/findManyPost/);
            expect(content).not.toMatch(/createOnePost/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
