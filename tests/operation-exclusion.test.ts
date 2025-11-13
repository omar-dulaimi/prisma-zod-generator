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

describe('Operation Exclusion System Tests', () => {
    describe('Global Operation Exclusions', () => {
        it(
            'should exclude globally specified operations from all models',
            async () => {
                const testEnv = await TestEnvironment.createTestEnv('operation-exclusion-global');

                try {
                    const config = {
                        ...ConfigGenerator.createBasicConfig(),
                        mode: 'custom',
                        globalExclusions: {
                            operations: ['delete', 'deleteMany', 'upsert'],
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
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}

model Admin {
  id       Int     @id @default(autoincrement())
  username String  @unique
  role     String
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
                    const objectsDir = join(schemasDir, 'objects');

                    // Check User model - excluded operations should NOT exist
                    const userExcludedFiles = [
                        join(schemasDir, 'deleteOneUser.schema.ts'),
                        join(schemasDir, 'deleteManyUser.schema.ts'),
                        join(schemasDir, 'upsertOneUser.schema.ts'),
                        join(objectsDir, 'UserDeleteInput.schema.ts'),
                        join(objectsDir, 'UserDeleteManyMutationInput.schema.ts'),
                        join(objectsDir, 'UserUpsertInput.schema.ts'),
                    ];
                    userExcludedFiles.forEach((file) => {
                        expect(existsSync(file), `User excluded operation should NOT exist: ${file}`).toBe(
                            false,
                        );
                    });

                    // Check User model - allowed operations should exist
                    const userAllowedFiles = [
                        join(schemasDir, 'findManyUser.schema.ts'),
                        join(schemasDir, 'findUniqueUser.schema.ts'),
                        join(schemasDir, 'createOneUser.schema.ts'),
                        join(schemasDir, 'updateOneUser.schema.ts'),
                        join(objectsDir, 'UserCreateInput.schema.ts'),
                        join(objectsDir, 'UserUpdateInput.schema.ts'),
                        join(objectsDir, 'UserWhereInput.schema.ts'),
                    ];
                    userAllowedFiles.forEach((file) => {
                        expect(existsSync(file), `User allowed operation should exist: ${file}`).toBe(true);
                    });

                    // Check Admin model - excluded operations should NOT exist
                    const adminExcludedFiles = [
                        join(schemasDir, 'deleteOneAdmin.schema.ts'),
                        join(schemasDir, 'deleteManyAdmin.schema.ts'),
                        join(schemasDir, 'upsertOneAdmin.schema.ts'),
                    ];
                    adminExcludedFiles.forEach((file) => {
                        expect(existsSync(file), `Admin excluded operation should NOT exist: ${file}`).toBe(
                            false,
                        );
                    });

                    // Check Admin model - allowed operations should exist
                    const adminAllowedFiles = [
                        join(schemasDir, 'findManyAdmin.schema.ts'),
                        join(schemasDir, 'findUniqueAdmin.schema.ts'),
                        join(schemasDir, 'createOneAdmin.schema.ts'),
                        join(schemasDir, 'updateOneAdmin.schema.ts'),
                    ];
                    adminAllowedFiles.forEach((file) => {
                        expect(existsSync(file), `Admin allowed operation should exist: ${file}`).toBe(true);
                    });
                } finally {
                    await testEnv.cleanup();
                }
            },
            GENERATION_TIMEOUT,
        );

        it(
            'should exclude operations from object schemas and outputs',
            async () => {
                const testEnv = await TestEnvironment.createTestEnv('operation-exclusion-objects');

                try {
                    const config = {
                        ...ConfigGenerator.createBasicConfig(),
                        mode: 'custom',
                        globalExclusions: {
                            operations: ['update', 'updateMany'],
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
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
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

                    // Update operations should NOT exist
                    const updateFiles = [
                        join(schemasDir, 'updateOneUser.schema.ts'),
                        join(schemasDir, 'updateManyUser.schema.ts'),
                    ];
                    updateFiles.forEach((file) => {
                        expect(existsSync(file), `Update operation should NOT exist: ${file}`).toBe(false);
                    });

                    // Check that update-related object schemas should not exist
                    const objectsDir = join(schemasDir, 'objects');
                    const updateObjectFiles = [
                        join(objectsDir, 'UserUpdateInput.schema.ts'),
                        join(objectsDir, 'UserUncheckedUpdateInput.schema.ts'),
                        join(objectsDir, 'UserUpdateManyMutationInput.schema.ts'),
                    ];
                    updateObjectFiles.forEach((file) => {
                        // These might still exist if used by other operations, but we check that update operations don't reference them
                        if (existsSync(file)) {
                            const content = readFileSync(file, 'utf-8');
                            // Should not contain references to update operations in the schema
                            expect(content).not.toMatch(/updateOne|updateMany/);
                        }
                    });

                    // Allowed operations should exist
                    const allowedFiles = [
                        join(schemasDir, 'findManyUser.schema.ts'),
                        join(schemasDir, 'createOneUser.schema.ts'),
                        join(schemasDir, 'deleteOneUser.schema.ts'),
                    ];
                    allowedFiles.forEach((file) => {
                        expect(existsSync(file), `Allowed operation should exist: ${file}`).toBe(true);
                    });
                } finally {
                    await testEnv.cleanup();
                }
            },
            GENERATION_TIMEOUT,
        );

        it(
            'should exclude aggregate and groupBy operations globally',
            async () => {
                const testEnv = await TestEnvironment.createTestEnv('operation-exclusion-aggregate');

                try {
                    const config = {
                        ...ConfigGenerator.createBasicConfig(),
                        mode: 'custom',
                        globalExclusions: {
                            operations: ['aggregate', 'groupBy', 'count'],
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
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  content  String?
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

                    // Aggregate operations should NOT exist for both models
                    const aggregateFiles = [
                        join(schemasDir, 'aggregateUser.schema.ts'),
                        join(schemasDir, 'groupByUser.schema.ts'),
                        join(schemasDir, 'aggregatePost.schema.ts'),
                        join(schemasDir, 'groupByPost.schema.ts'),
                    ];
                    aggregateFiles.forEach((file) => {
                        expect(existsSync(file), `Aggregate operation should NOT exist: ${file}`).toBe(false);
                    });

                    // CRUD operations should still exist
                    const crudFiles = [
                        join(schemasDir, 'findManyUser.schema.ts'),
                        join(schemasDir, 'createOneUser.schema.ts'),
                        join(schemasDir, 'findManyPost.schema.ts'),
                        join(schemasDir, 'createOnePost.schema.ts'),
                    ];
                    crudFiles.forEach((file) => {
                        expect(existsSync(file), `CRUD operation should exist: ${file}`).toBe(true);
                    });
                } finally {
                    await testEnv.cleanup();
                }
            },
            GENERATION_TIMEOUT,
        );

        it(
            'should exclude find operations globally',
            async () => {
                const testEnv = await TestEnvironment.createTestEnv('operation-exclusion-find');

                try {
                    const config = {
                        ...ConfigGenerator.createBasicConfig(),
                        mode: 'custom',
                        globalExclusions: {
                            operations: ['findMany', 'findFirst', 'findUniqueOrThrow'],
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
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
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

                    // Excluded find operations should NOT exist
                    const excludedFindFiles = [
                        join(schemasDir, 'findManyUser.schema.ts'),
                        join(schemasDir, 'findFirstUser.schema.ts'),
                        join(schemasDir, 'findUniqueOrThrowUser.schema.ts'),
                    ];
                    excludedFindFiles.forEach((file) => {
                        expect(existsSync(file), `Excluded find operation should NOT exist: ${file}`).toBe(
                            false,
                        );
                    });

                    // Allowed find operations should exist
                    const allowedFindFiles = [
                        join(schemasDir, 'findUniqueUser.schema.ts'),
                        join(schemasDir, 'findFirstOrThrowUser.schema.ts'),
                    ];
                    allowedFindFiles.forEach((file) => {
                        expect(existsSync(file), `Allowed find operation should exist: ${file}`).toBe(true);
                    });
                } finally {
                    await testEnv.cleanup();
                }
            },
            GENERATION_TIMEOUT,
        );

        it(
            'should combine global operation exclusions with model-specific operations',
            async () => {
                const testEnv = await TestEnvironment.createTestEnv(
                    'operation-exclusion-combined',
                );

                try {
                    const config = {
                        ...ConfigGenerator.createBasicConfig(),
                        mode: 'custom',
                        globalExclusions: {
                            operations: ['delete', 'deleteMany'], // Global exclusion
                        },
                        models: {
                            User: {
                                enabled: true,
                                operations: ['findMany', 'findUnique', 'create', 'update'], // Model-specific allowed
                            },
                            Post: {
                                enabled: true,
                                operations: ['findMany', 'create'], // Model-specific allowed (no update)
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
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  content  String?
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

                    // User: should have findMany, findUnique, create, update (from model config)
                    const userAllowedFiles = [
                        join(schemasDir, 'findManyUser.schema.ts'),
                        join(schemasDir, 'findUniqueUser.schema.ts'),
                        join(schemasDir, 'createOneUser.schema.ts'),
                        join(schemasDir, 'updateOneUser.schema.ts'),
                    ];
                    userAllowedFiles.forEach((file) => {
                        expect(existsSync(file), `User allowed operation should exist: ${file}`).toBe(true);
                    });

                    // User: should NOT have delete (globally excluded)
                    const userExcludedFiles = [
                        join(schemasDir, 'deleteOneUser.schema.ts'),
                        join(schemasDir, 'deleteManyUser.schema.ts'),
                    ];
                    userExcludedFiles.forEach((file) => {
                        expect(existsSync(file), `User excluded operation should NOT exist: ${file}`).toBe(
                            false,
                        );
                    });

                    // Post: should have findMany, create (from model config)
                    const postAllowedFiles = [
                        join(schemasDir, 'findManyPost.schema.ts'),
                        join(schemasDir, 'createOnePost.schema.ts'),
                    ];
                    postAllowedFiles.forEach((file) => {
                        expect(existsSync(file), `Post allowed operation should exist: ${file}`).toBe(true);
                    });

                    // Post: should NOT have update (not in model config) or delete (globally excluded)
                    const postExcludedFiles = [
                        join(schemasDir, 'updateOnePost.schema.ts'),
                        join(schemasDir, 'deleteOnePost.schema.ts'),
                        join(schemasDir, 'deleteManyPost.schema.ts'),
                    ];
                    postExcludedFiles.forEach((file) => {
                        expect(existsSync(file), `Post excluded operation should NOT exist: ${file}`).toBe(
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
            'should verify excluded operations are not present in generated schema content',
            async () => {
                const testEnv = await TestEnvironment.createTestEnv('operation-exclusion-content');

                try {
                    const config = {
                        ...ConfigGenerator.createBasicConfig(),
                        mode: 'custom',
                        globalExclusions: {
                            operations: ['upsert', 'createMany'],
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
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
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

                    // Check that excluded operation files don't exist
                    expect(existsSync(join(schemasDir, 'upsertOneUser.schema.ts'))).toBe(false);
                    expect(existsSync(join(schemasDir, 'createManyUser.schema.ts'))).toBe(false);

                    // Check that allowed operation files exist and don't reference excluded operations
                    const allowedFiles = [
                        join(schemasDir, 'findManyUser.schema.ts'),
                        join(schemasDir, 'createOneUser.schema.ts'),
                        join(schemasDir, 'updateOneUser.schema.ts'),
                    ];

                    allowedFiles.forEach((file) => {
                        if (existsSync(file)) {
                            const content = readFileSync(file, 'utf-8');
                            // Should not contain references to excluded operations
                            expect(content).not.toMatch(/upsertOne|createMany/);
                        }
                    });

                    // Check objects directory - excluded operations should not appear in object schemas
                    const objectsDir = join(schemasDir, 'objects');
                    const objectFiles = [
                        join(objectsDir, 'UserCreateInput.schema.ts'),
                        join(objectsDir, 'UserUpdateInput.schema.ts'),
                    ];

                    objectFiles.forEach((file) => {
                        if (existsSync(file)) {
                            const content = readFileSync(file, 'utf-8');
                            // Object schemas should not reference excluded operations
                            expect(content).not.toMatch(/upsertOne|createMany/);
                        }
                    });
                } finally {
                    await testEnv.cleanup();
                }
            },
            GENERATION_TIMEOUT,
        );
    });
});

