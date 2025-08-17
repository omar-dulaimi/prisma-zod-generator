import { DMMF } from '@prisma/generator-helper';
import { exec } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Mock generators for creating test data and scenarios
 */

/**
 * Generator for creating temporary Prisma schemas for testing
 */
export class PrismaSchemaGenerator {
  /**
   * Generate a basic Prisma schema for testing
   */
  static createBasicSchema(
    options: {
      models?: string[];
      provider?: string;
      outputPath?: string;
      generatorOptions?: Record<string, unknown>;
    } = {},
  ): string {
    const {
      models = ['User', 'Post'],
      provider = 'sqlite',
      outputPath = './generated/schemas',
      generatorOptions = {},
    } = options;

    const generatorOptionsStr = Object.entries(generatorOptions)
      .map(([key, value]) => `  ${key} = "${value}"`)
      .join('\n');

    // Create models based on what's requested, with appropriate relationships
    const modelDefinitions = models
      .map((model) => {
        switch (model) {
          case 'User':
            // Only include Post relationship if Post model is also being generated
            const hasPostRelation = models.includes('Post');
            return `
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?${hasPostRelation ? '\n  posts Post[]' : ''}
}`;
          case 'Post':
            // Only include User relationship if User model is also being generated
            const hasUserRelation = models.includes('User');
            return `
model Post {
  id       Int     @id @default(autoincrement())
  title    String
  content  String?${hasUserRelation ? '\n  author   User    @relation(fields: [authorId], references: [id])\n  authorId Int' : ''}
}`;
          case 'Profile':
            return `
model Profile {
  id   Int    @id @default(autoincrement())
  bio  String?
}`;
          default:
            return `
model ${model} {
  id   Int    @id @default(autoincrement())
  name String
}`;
        }
      })
      .join('\n');

    return `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ${join(process.cwd(), 'lib', 'generator.js')}"
  output   = "${outputPath}"
${generatorOptionsStr}
}

${modelDefinitions}
`;
  }

  /**
   * Generate schema with @zod comments for testing inline validation
   */
  static createSchemaWithZodComments(): string {
    return `
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
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique /// @zod.email()
  name     String? /// @zod.min(2).max(50)
  age      Int?    /// @zod.min(0).max(120)
  username String  @unique /// @zod.regex(/^[a-zA-Z0-9_]+$/)
  posts    Post[]
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String  /// @zod.min(1).max(100)
  content  String? /// @zod.min(10)
  slug     String  @unique /// @zod.regex(/^[a-z0-9-]+$/)
  author   User    @relation(fields: [authorId], references: [id])
  authorId Int
}
`;
  }

  /**
   * Generate schema with comprehensive field types
   */
  static createComprehensiveSchema(): string {
    return `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated/schemas"
}

enum Status {
  ACTIVE
  INACTIVE
  PENDING
}

model ComprehensiveModel {
  id          Int       @id @default(autoincrement())
  stringField String
  intField    Int
  floatField  Float
  boolField   Boolean
  dateField   DateTime  @default(now())
  jsonField   Json?
  bytesField  Bytes?
  decimalField Decimal?
  bigIntField BigInt?
  
  optionalString   String?
  optionalInt      Int?
  optionalBoolean  Boolean?
  
  status      Status    @default(ACTIVE)
  
  listField   String[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
`;
  }

  /**
   * Generate schema with filtering configuration
   */
  static createFilteringSchema(configPath?: string): string {
    const configLine = configPath ? `config   = "${configPath}"` : 'config   = "./config.json"';
    return `
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
  ${configLine}
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
  }
}

/**
 * Configuration file generator for testing
 */
export class ConfigGenerator {
  /**
   * Generate basic configuration
   */
  static createBasicConfig(): Record<string, unknown> {
    return {
      mode: 'full',
      output: './generated/schemas',
      optionalFieldBehavior: 'optional',
      relationModel: true,
      modelCase: 'PascalCase',
      modelSuffix: 'Schema',
      useMultipleFiles: true,
      createInputTypes: true,
      addIncludeType: false,
      addSelectType: false,
      validateWhereUniqueInput: true,
      prismaClientPath: '@prisma/client',
      // Test helper defaults: exercise filtered Create* inputs
      strictCreateInputs: false,
      preserveRequiredScalarsOnCreate: false,
      globalExclusions: {},
      variants: {
        pure: { enabled: true },
        input: { enabled: true },
        result: { enabled: true },
      },
      models: {},
    };
  }

  /**
   * Generate filtering configuration
   */
  static createFilteringConfig(): Record<string, unknown> {
    return {
      ...this.createBasicConfig(),
      models: {
        User: {
          enabled: true,
          operations: ['findMany', 'findUnique', 'create', 'update'],
        },
        Post: {
          enabled: true,
          operations: ['findMany', 'create'],
        },
        Profile: {
          enabled: true,
        },
        Admin: {
          enabled: false,
        },
      },
    };
  }

  /**
   * Generate minimal mode configuration
   */
  static createMinimalConfig(): Record<string, unknown> {
    return {
      ...this.createBasicConfig(),
      mode: 'minimal',
    };
  }

  /**
   * Generate variant configuration
   */
  static createVariantConfig(): Record<string, unknown> {
    return {
      ...this.createBasicConfig(),
      variants: {
        input: {
          enabled: true,
          suffix: '.input',
          excludeFields: ['id', 'createdAt', 'updatedAt'],
        },
        result: {
          enabled: true,
          suffix: '.result',
          excludeFields: ['password'],
        },
        pure: {
          enabled: true,
          suffix: '.model',
          excludeFields: [],
        },
      },
    };
  }

  /**
   * Generate field exclusion configuration
   */
  static createFieldExclusionConfig(): Record<string, unknown> {
    return {
      ...this.createBasicConfig(),
      globalExclusions: {
        input: ['password', 'secretKey'],
        result: ['password', 'secretKey'],
        pure: ['password', 'secretKey'],
      },
      models: {
        User: {
          enabled: true,
          variants: {
            input: {
              enabled: true,
              excludeFields: ['internalId', 'metadata'],
            },
          },
        },
        Post: {
          enabled: true,
          variants: {
            input: {
              enabled: true,
              excludeFields: ['authorId'],
            },
          },
        },
      },
      variants: {
        pure: {
          enabled: true,
          suffix: '.public',
          excludeFields: ['password', 'email', 'internalId'],
        },
        input: { enabled: true },
        result: { enabled: true },
      },
    };
  }
}

/**
 * Test environment setup utilities
 */
export class TestEnvironment {
  /**
   * Create a temporary test environment
   */
  static async createTestEnv(testName: string): Promise<{
    testDir: string;
    schemaPath: string;
    outputDir: string;
    runGeneration: () => Promise<void>;
    runGenerationWithOutput: () => Promise<{ stdout: string; stderr: string }>;
    cleanup: () => Promise<void>;
  }> {
    const testDir = join(process.cwd(), `test-env-${testName}-${Date.now()}`);
    const schemaPath = join(testDir, 'schema.prisma');
    const outputDir = join(testDir, 'generated');

    // Create directories
    mkdirSync(testDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });

    // Function to run generation
    const runGeneration = async () => {
      // Always build the generator to ensure latest code is used
      await execAsync('npx tsc', { cwd: process.cwd() });

      // Run prisma generate
      await execAsync(`npx prisma generate --schema="${schemaPath}"`, {
        cwd: process.cwd(),
      });
    };

    // Same as runGeneration, but returns stdout/stderr for assertions
    const runGenerationWithOutput = async (): Promise<{ stdout: string; stderr: string }> => {
      await execAsync('npx tsc', { cwd: process.cwd() });
      return execAsync(`npx prisma generate --schema="${schemaPath}"`, {
        cwd: process.cwd(),
      });
    };

    // Cleanup function
    const cleanup = async () => {
      const { rmSync } = await import('fs');
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    };

    return {
      testDir,
      schemaPath,
      outputDir,
      runGeneration,
      runGenerationWithOutput,
      cleanup,
    };
  }

  /**
   * Setup test environment with schema and config
   */
  static async setupWithConfig(
    testName: string,
    schema: string,
    config?: Record<string, unknown>,
  ): Promise<{
    testDir: string;
    schemaPath: string;
    outputDir: string;
    configPath?: string;
    runGeneration: () => Promise<void>;
    runGenerationWithOutput: () => Promise<{ stdout: string; stderr: string }>;
    cleanup: () => Promise<void>;
  }> {
    const env = await this.createTestEnv(testName);

    // Write schema file
    writeFileSync(env.schemaPath, schema);

    let configPath: string | undefined;
    if (config) {
      configPath = join(env.testDir, 'config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    // Function to run generation
    const runGeneration = async () => {
      // Always build the generator to ensure latest code is used
      await execAsync('npx tsc', { cwd: process.cwd() });

      // Run prisma generate
      await execAsync(`npx prisma generate --schema="${env.schemaPath}"`, {
        cwd: process.cwd(),
      });
    };

    const runGenerationWithOutput = async (): Promise<{ stdout: string; stderr: string }> => {
      await execAsync('npx tsc', { cwd: process.cwd() });
      return execAsync(`npx prisma generate --schema="${env.schemaPath}"`, {
        cwd: process.cwd(),
      });
    };

    return {
      ...env,
      configPath,
      runGeneration,
      runGenerationWithOutput,
    };
  }
}

/**
 * Mock DMMF data for unit testing without Prisma generation
 */
export class MockDMMF {
  /**
   * Create a mock DMMF document for testing
   */
  static createMockDocument(
    options: {
      models?: DMMF.Model[];
      enums?: DMMF.DatamodelEnum[];
    } = {},
  ): DMMF.Document {
    return {
      datamodel: {
        models: options.models || [this.createUserModel(), this.createPostModel()],
        enums: options.enums || [this.createStatusEnum()],
        types: [],
        indexes: [],
      },
      schema: {
        inputObjectTypes: {
          prisma: [],
        },
        outputObjectTypes: {
          prisma: [],
          model: [],
        },
        enumTypes: {
          prisma: [],
          model: [],
        },
        fieldRefTypes: {
          prisma: [],
        },
      },
      mappings: {
        modelOperations: [
          {
            model: 'User',
            plural: 'users',
            findUnique: 'findUniqueUser',
            findUniqueOrThrow: 'findUniqueUserOrThrow',
            findFirst: 'findFirstUser',
            findFirstOrThrow: 'findFirstUserOrThrow',
            findMany: 'findManyUser',
            create: 'createOneUser',
            createMany: 'createManyUser',
            delete: 'deleteOneUser',
            deleteMany: 'deleteManyUser',
            update: 'updateOneUser',
            updateMany: 'updateManyUser',
            upsert: 'upsertOneUser',
            aggregate: 'aggregateUser',
            groupBy: 'groupByUser',
          },
        ],
        otherOperations: {
          read: [],
          write: [],
        },
      },
    };
  }

  /**
   * Create a mock User model
   */
  static createUserModel(): DMMF.Model {
    return {
      name: 'User',
      dbName: null,
      schema: null,
      fields: [
        {
          name: 'id',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: true,
          isReadOnly: false,
          hasDefaultValue: true,
          type: 'Int',
          default: { name: 'autoincrement', args: [] },
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'email',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: true,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'String',
          documentation: '@zod.email()',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'name',
          kind: 'scalar',
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'String',
          documentation: '@zod.min(2).max(50)',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'posts',
          kind: 'object',
          isList: true,
          isRequired: true,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'Post',
          relationName: 'PostToUser',
          relationFromFields: [],
          relationToFields: [],
          isGenerated: false,
          isUpdatedAt: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      isGenerated: false,
    };
  }

  /**
   * Create a mock Post model
   */
  static createPostModel(): DMMF.Model {
    return {
      name: 'Post',
      dbName: null,
      schema: null,
      fields: [
        {
          name: 'id',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: true,
          isReadOnly: false,
          hasDefaultValue: true,
          type: 'Int',
          default: { name: 'autoincrement', args: [] },
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'title',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'String',
          documentation: '@zod.min(1).max(100)',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'content',
          kind: 'scalar',
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'String',
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'author',
          kind: 'object',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          isReadOnly: false,
          hasDefaultValue: false,
          type: 'User',
          relationName: 'PostToUser',
          relationFromFields: ['authorId'],
          relationToFields: ['id'],
          isGenerated: false,
          isUpdatedAt: false,
        },
        {
          name: 'authorId',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          isReadOnly: true,
          hasDefaultValue: false,
          type: 'Int',
          isGenerated: false,
          isUpdatedAt: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      isGenerated: false,
    };
  }

  /**
   * Create a mock enum
   */
  static createStatusEnum(): DMMF.DatamodelEnum {
    return {
      name: 'Status',
      values: [
        { name: 'ACTIVE', dbName: null },
        { name: 'INACTIVE', dbName: null },
        { name: 'PENDING', dbName: null },
      ],
      dbName: null,
    };
  }
}
