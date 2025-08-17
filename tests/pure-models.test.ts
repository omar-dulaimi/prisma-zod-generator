import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  ConfigGenerator,
  GENERATION_TIMEOUT,
  PrismaSchemaGenerator,
  SchemaValidationUtils,
  TestEnvironment,
} from './helpers';

describe('Pure Model Schema Generation Tests', () => {
  describe('Prisma Type Mapping', () => {
    it(
      'should map all Prisma field types to appropriate Zod schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-type-mapping');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true, // Enable pure model generation
            variants: [
              {
                name: 'pure',
                suffix: '',
                exclude: [],
              },
            ],
          };

          const schema = PrismaSchemaGenerator.createComprehensiveSchema();
          const updatedSchema = schema.replace(
            'output   = "./generated/schemas"',
            `output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"`,
          );

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, updatedSchema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const comprehensiveModelPath = join(modelsDir, 'ComprehensiveModel.schema.ts');

          if (existsSync(comprehensiveModelPath)) {
            const content = readFileSync(comprehensiveModelPath, 'utf-8');

            // String fields should map to z.string()
            expect(content).toMatch(/stringField.*z\.string\(\)/);

            // Int fields should map to z.number().int()
            expect(content).toMatch(/intField.*z\.number\(\)\.int\(\)/);

            // Float fields should map to z.number()
            expect(content).toMatch(/floatField.*z\.number\(\)/);

            // Boolean fields should map to z.boolean()
            expect(content).toMatch(/boolField.*z\.boolean\(\)/);

            // DateTime fields should map to z.date() or z.coerce.date()
            expect(content).toMatch(/dateField.*z\.date\(\)|z\.coerce\.date\(\)/);

            // JSON fields should map to z.unknown() or z.record()
            expect(content).toMatch(/jsonField.*z\.unknown\(\)|z\.record\(\)/);

            // Bytes fields should map to z.instanceof(Uint8Array) or z.string()
            expect(content).toMatch(/bytesField.*z\.instanceof\(Uint8Array\)|z\.string\(\)/);

            // Decimal fields should map to z.number() or z.string()
            expect(content).toMatch(/decimalField.*z\.number\(\)|z\.string\(\)/);

            // BigInt fields should map to z.bigint()
            expect(content).toMatch(/bigIntField.*z\.bigint\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle field optionality correctly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-optionality');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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
  id             Int      @id @default(autoincrement())
  email          String   @unique // Required field
  name           String?  // Optional field
  age            Int?     // Optional field
  isActive       Boolean  @default(true) // Required with default
  lastLogin      DateTime? // Optional DateTime
  preferences    Json?    // Optional JSON
  profileImage   Bytes?   // Optional Bytes
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const userModelPath = join(modelsDir, 'User.schema.ts');

          if (existsSync(userModelPath)) {
            const content = readFileSync(userModelPath, 'utf-8');

            // Required fields should not have .optional()
            expect(content).toMatch(/email.*z\.string\(\)/);
            expect(content).not.toMatch(/email.*\.optional\(\)/);
            expect(content).toMatch(/isActive.*z\.boolean\(\)/);
            expect(content).not.toMatch(/isActive.*\.optional\(\)/);

            // Optional fields should have .optional()
            expect(content).toMatch(/name.*\.optional\(\)/);
            expect(content).toMatch(/age.*\.optional\(\)/);
            expect(content).toMatch(/lastLogin.*\.optional\(\)/);
            expect(content).toMatch(/preferences.*\.optional\(\)/);
            expect(content).toMatch(/profileImage.*\.optional\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle default values appropriately',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-defaults');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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

model Settings {
  id          Int     @id @default(autoincrement())
  theme       String  @default("light")
  notifications Boolean @default(true)
  maxItems    Int     @default(10)
  timeout     Float   @default(30.0)
  createdAt   DateTime @default(now())
  isActive    Boolean @default(true)
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const settingsModelPath = join(modelsDir, 'Settings.schema.ts');

          if (existsSync(settingsModelPath)) {
            const content = readFileSync(settingsModelPath, 'utf-8');

            // Fields with defaults should include .default() values
            expect(content).toMatch(/theme.*\.default\("light"\)/);
            expect(content).toMatch(/notifications.*\.default\(true\)/);
            expect(content).toMatch(/maxItems.*\.default\(10\)/);
            expect(content).toMatch(/timeout.*\.default\(30\.0\)/);
            expect(content).toMatch(/isActive.*\.default\(true\)/);

            // Auto-increment and now() might be handled differently
            if (content.includes('createdAt')) {
              expect(content).toMatch(/createdAt.*z\.date\(\)|z\.coerce\.date\(\)/);
            }
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Inline @zod Validation Application', () => {
    it(
      'should apply @zod validations to pure model schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-zod-validations');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
          };

          const schema = PrismaSchemaGenerator.createSchemaWithZodComments();
          const updatedSchema = schema.replace(
            'output   = "./generated/schemas"',
            `output   = "${testEnv.outputDir}/schemas"\n  config   = "./config.json"`,
          );

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, updatedSchema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const userModelPath = join(modelsDir, 'User.schema.ts');

          if (existsSync(userModelPath)) {
            const content = readFileSync(userModelPath, 'utf-8');

            // Should apply @zod validations from comments
            expect(content).toMatch(/email.*\.email\(\)/);
            expect(content).toMatch(/name.*\.min\(2\)/);
            expect(content).toMatch(/name.*\.max\(50\)/);
            expect(content).toMatch(/age.*\.min\(0\)/);
            expect(content).toMatch(/age.*\.max\(120\)/);
            expect(content).toMatch(/username.*\.regex\(/);
          }

          const postModelPath = join(modelsDir, 'Post.schema.ts');
          if (existsSync(postModelPath)) {
            const content = readFileSync(postModelPath, 'utf-8');

            expect(content).toMatch(/title.*\.min\(1\)/);
            expect(content).toMatch(/title.*\.max\(100\)/);
            expect(content).toMatch(/content.*\.min\(10\)/);
            expect(content).toMatch(/slug.*\.regex\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should combine Prisma type mapping with @zod validations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-combined-validation');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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
  id          Int      @id @default(autoincrement())
  name        String   /// @zod.min(1).max(100)
  price       Float    /// @zod.positive().max(999999.99)
  isActive    Boolean  @default(true) /// @zod.default(true)
  rating      Float?   /// @zod.min(0).max(5).optional()
  tags        String   /// @zod.regex(/^[a-z,]+$/)
  createdAt   DateTime @default(now())
  metadata    Json?    /// @zod.record(z.string()).optional()
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const productModelPath = join(modelsDir, 'Product.schema.ts');

          if (existsSync(productModelPath)) {
            const content = readFileSync(productModelPath, 'utf-8');

            // Should combine Zod type with validation
            expect(content).toMatch(/name.*z\.string\(\).*\.min\(1\).*\.max\(100\)/);
            expect(content).toMatch(/price.*z\.number\(\).*\.positive\(\).*\.max\(999999\.99\)/);
            expect(content).toMatch(/isActive.*z\.boolean\(\).*\.default\(true\)/);
            expect(content).toMatch(
              /rating.*z\.number\(\).*\.min\(0\).*\.max\(5\).*\.optional\(\)/,
            );
            expect(content).toMatch(/tags.*z\.string\(\).*\.regex\(/);
            expect(content).toMatch(/createdAt.*z\.date\(\)|z\.coerce\.date\(\)/);
            expect(content).toMatch(/metadata.*z\.record\(z\.string\(\)\).*\.optional\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('JSDoc Generation', () => {
    it(
      'should generate JSDoc documentation from Prisma field comments',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-jsdoc');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            pureModelsLean: false,
            generateJSDoc: true,
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
  
  /**
   * The user's email address
   * Used for authentication and notifications
   * @example "john.doe@example.com"
   */
  email String @unique
  
  /// Display name for the user
  name  String?
  
  /**
   * User's age in years
   * Must be between 0 and 120
   * @minimum 0
   * @maximum 120
   */
  age   Int?
  
  /// Whether the user account is active
  isActive Boolean @default(true)
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const userModelPath = join(modelsDir, 'User.schema.ts');

          if (existsSync(userModelPath)) {
            const content = readFileSync(userModelPath, 'utf-8');

            // Should contain JSDoc comments
            expect(content).toMatch(/\/\*\*[\s\S]*?The user's email address[\s\S]*?\*\//);
            expect(content).toMatch(/\/\/\/\s*Display name for the user/);
            expect(content).toMatch(/\/\*\*[\s\S]*?User's age in years[\s\S]*?\*\//);
            expect(content).toMatch(/\/\/\/\s*Whether the user account is active/);

            // Should preserve @example and other JSDoc tags
            if (content.includes('@example')) {
              expect(content).toMatch(/@example\s+"john\.doe@example\.com"/);
            }

            if (content.includes('@minimum')) {
              expect(content).toMatch(/@minimum\s+0/);
              expect(content).toMatch(/@maximum\s+120/);
            }
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle complex documentation patterns',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-complex-jsdoc');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            pureModelsLean: false,
            generateJSDoc: true,
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
  id Int @id @default(autoincrement())
  
  /**
   * Product name
   * @description The display name of the product
   * @example "Wireless Headphones"
   * @minLength 1
   * @maxLength 100
   */
  name String
  
  /**
   * Product price in USD
   * @description The price of the product in US dollars
   * @example 99.99
   * @minimum 0.01
   * @maximum 999999.99
   * @multipleOf 0.01
   */
  price Float
  
  /// @deprecated Use 'isAvailable' instead
  inStock Boolean @default(true)
  
  /**
   * Product availability status
   * @since 2.0.0
   * @default true
   */
  isAvailable Boolean @default(true)
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const productModelPath = join(modelsDir, 'Product.schema.ts');

          if (existsSync(productModelPath)) {
            const content = readFileSync(productModelPath, 'utf-8');

            // Should preserve all JSDoc tags
            expect(content).toMatch(/@description/);
            expect(content).toMatch(/@example/);
            expect(content).toMatch(/@minLength|@minimum/);
            expect(content).toMatch(/@maxLength|@maximum/);
            expect(content).toMatch(/@multipleOf/);
            expect(content).toMatch(/@deprecated/);
            expect(content).toMatch(/@since/);
            expect(content).toMatch(/@default/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Complex Type Handling', () => {
    it(
      'should handle Decimal, JSON, Bytes, and DateTime types correctly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-complex-types');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model ComplexTypes {
  id          Int      @id @default(autoincrement())
  
  // Decimal handling
  price       Decimal  @db.Decimal(10, 2)
  weight      Decimal? @db.Decimal(8, 3)
  
  // JSON handling
  settings    Json
  metadata    Json?
  
  // Bytes handling
  avatar      Bytes?
  document    Bytes
  
  // DateTime handling
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  scheduledAt DateTime?
  
  // BigInt handling
  bigNumber   BigInt
  bigOptional BigInt?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const complexTypesPath = join(modelsDir, 'ComplexTypes.schema.ts');

          if (existsSync(complexTypesPath)) {
            const content = readFileSync(complexTypesPath, 'utf-8');

            // Decimal fields - might be z.number() or z.string()
            expect(content).toMatch(/price.*z\.(number|string)\(\)/);
            expect(content).toMatch(/weight.*z\.(number|string)\(\).*\.optional\(\)/);

            // JSON fields - should be z.unknown() or z.record()
            expect(content).toMatch(/settings.*z\.(unknown|record)\(\)/);
            expect(content).toMatch(/metadata.*z\.(unknown|record)\(\).*\.optional\(\)/);

            // Bytes fields - should be z.instanceof(Uint8Array) or z.string()
            expect(content).toMatch(
              /avatar.*z\.(instanceof\(Uint8Array\)|string)\(\).*\.optional\(\)/,
            );
            expect(content).toMatch(/document.*z\.(instanceof\(Uint8Array\)|string)\(\)/);

            // DateTime fields - should be z.date() or z.coerce.date()
            expect(content).toMatch(/createdAt.*z\.(date|coerce\.date)\(\)/);
            expect(content).toMatch(/updatedAt.*z\.(date|coerce\.date)\(\)/);
            expect(content).toMatch(/scheduledAt.*z\.(date|coerce\.date)\(\).*\.optional\(\)/);

            // BigInt fields - should be z.bigint()
            expect(content).toMatch(/bigNumber.*z\.bigint\(\)/);
            expect(content).toMatch(/bigOptional.*z\.bigint\(\).*\.optional\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle enum types properly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-enums');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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

enum UserRole {
  ADMIN
  USER
  MODERATOR
  GUEST
}

enum Status {
  ACTIVE
  INACTIVE
  PENDING
  SUSPENDED
}

model User {
  id     Int      @id @default(autoincrement())
  email  String   @unique
  role   UserRole @default(USER)
  status Status   @default(ACTIVE)
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const userModelPath = join(modelsDir, 'User.schema.ts');

          if (existsSync(userModelPath)) {
            const content = readFileSync(userModelPath, 'utf-8');

            // Should reference enum schemas
            expect(content).toMatch(/role.*UserRole/);
            expect(content).toMatch(/status.*Status/);

            // Should import enum schemas
            expect(content).toMatch(/import.*UserRole.*from/);
            expect(content).toMatch(/import.*Status.*from/);

            // Should handle defaults
            expect(content).toMatch(/role.*\.default\(.*USER.*\)/);
            expect(content).toMatch(/status.*\.default\(.*ACTIVE.*\)/);
          }

          // Check enum schema files
          const enumsDir = join(testEnv.outputDir, 'schemas', 'enums');
          const userRoleEnumPath = join(enumsDir, 'UserRole.schema.ts');
          const statusEnumPath = join(enumsDir, 'Status.schema.ts');

          if (existsSync(userRoleEnumPath)) {
            const content = readFileSync(userRoleEnumPath, 'utf-8');
            expect(content).toMatch(/z\.enum\(\[/);
            expect(content).toMatch(/'ADMIN'/);
            expect(content).toMatch(/'USER'/);
            expect(content).toMatch(/'MODERATOR'/);
            expect(content).toMatch(/'GUEST'/);
          }

          if (existsSync(statusEnumPath)) {
            const content = readFileSync(statusEnumPath, 'utf-8');
            expect(content).toMatch(/z\.enum\(\[/);
            expect(content).toMatch(/'ACTIVE'/);
            expect(content).toMatch(/'INACTIVE'/);
            expect(content).toMatch(/'PENDING'/);
            expect(content).toMatch(/'SUSPENDED'/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'single-file-enums: should not import enum values from @prisma/client in single-file pure models (uses generated enum schemas)',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-single-file-enums');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            variants: {
              pure: { enabled: false },
              input: { enabled: false },
              result: { enabled: false },
            },
          };

          const schema = `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "sqlite"\n  url      = "file:./test.db"\n}\n\ngenerator zod {\n  provider              = "node ./lib/generator.js"\n  output                = "${testEnv.outputDir}/schemas"\n  useMultipleFiles      = false\n  singleFileName        = "schemas.ts"\n  placeSingleFileAtRoot = true\n  config                = "./config.json"\n}\n\nenum Role {\n  USER\n  ADMIN\n}\n\nenum Status {\n  ACTIVE\n  INACTIVE\n}\n\nmodel User {\n  id     Int    @id @default(autoincrement())\n  role   Role\n  status Status\n}`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();

          const singleFilePath = join(testEnv.outputDir, 'schemas.ts');
          if (existsSync(singleFilePath)) {
            const content = readFileSync(singleFilePath, 'utf-8');
            // Should define enum schemas locally
            expect(content).toMatch(/export const RoleSchema\s*=\s*z\.enum/);
            expect(content).toMatch(/export const StatusSchema\s*=\s*z\.enum/);
            // User schema should reference RoleSchema/StatusSchema
            expect(content).toMatch(/role:\s*RoleSchema/);
            expect(content).toMatch(/status:\s*StatusSchema/);
            // No value import of Role or Status from @prisma/client
            expect(content).not.toMatch(/import\s*\{[^}]*Role[^}]*\}\s*from\s*'@prisma\/client'/);
            expect(content).not.toMatch(/import\s*\{[^}]*Status[^}]*\}\s*from\s*'@prisma\/client'/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Schema Composition Logic', () => {
    it(
      'should compose type mapping, optionality, validation, and documentation into cohesive schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-composition');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            pureModelsLean: false,
            generateJSDoc: true,
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
  id Int @id @default(autoincrement())
  
  /**
   * User's email address
   * @example "user@example.com"
   */
  email String @unique /// @zod.email().toLowerCase()
  
  /**
   * User's full name
   * @minLength 2
   * @maxLength 50
   */
  name String? /// @zod.min(2).max(50).trim()
  
  /// User's age in years
  age Int? /// @zod.min(0).max(120)
  
  /// Whether the user is active
  isActive Boolean @default(true) /// @zod.default(true)
  
  /// User registration date
  createdAt DateTime @default(now())
  
  /// User preferences stored as JSON
  preferences Json? /// @zod.record(z.string()).optional()
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const userModelPath = join(modelsDir, 'User.schema.ts');

          if (existsSync(userModelPath)) {
            const content = readFileSync(userModelPath, 'utf-8');

            // Should have proper TypeScript structure
            expect(content).toMatch(/import.*z.*from.*zod/);
            expect(content).toMatch(/export const.*UserSchema/);
            expect(content).toMatch(/z\.object\(\{/);

            // Should compose all aspects for email field
            expect(content).toMatch(
              /email:[\s\S]*z\.string\(\)[\s\S]*\.email\(\)[\s\S]*\.toLowerCase\(\)/,
            );

            // Should compose optionality with validation for name
            expect(content).toMatch(
              /name:[\s\S]*z\.string\(\)[\s\S]*\.min\(2\)[\s\S]*\.max\(50\)[\s\S]*\.trim\(\)[\s\S]*\.optional\(\)/,
            );

            // Should compose validation with optionality for age
            expect(content).toMatch(
              /age:[\s\S]*z\.number\(\)\.int\(\)[\s\S]*\.min\(0\)[\s\S]*\.max\(120\)[\s\S]*\.optional\(\)/,
            );

            // Should compose type with default for isActive
            expect(content).toMatch(/isActive:[\s\S]*z\.boolean\(\)[\s\S]*\.default\(true\)/);

            // Should handle DateTime with defaults
            expect(content).toMatch(/createdAt:[\s\S]*z\.(date|coerce\.date)\(\)/);

            // Should compose complex type with validation and optionality
            expect(content).toMatch(
              /preferences:[\s\S]*z\.record\(z\.string\(\)\)[\s\S]*\.optional\(\)/,
            );

            // Should include JSDoc comments
            expect(content).toMatch(/\/\*\*[\s\S]*?User's email address[\s\S]*?\*\//);
            expect(content).toMatch(/\/\*\*[\s\S]*?User's full name[\s\S]*?\*\//);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should maintain proper schema structure and exports',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-structure');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
          };

          const schema = PrismaSchemaGenerator.createBasicSchema({
            models: ['User', 'Post'],
            generatorOptions: { config: './config.json' },
          });

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');

          // Check individual model files
          const userModelPath = join(modelsDir, 'User.schema.ts');
          const postModelPath = join(modelsDir, 'Post.schema.ts');

          [userModelPath, postModelPath].forEach((filePath) => {
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8');

              // Should have proper imports
              expect(content).toMatch(/import.*z.*from.*zod/);

              // Should have main schema export
              expect(content).toMatch(/export const.*Schema\s*=/);

              // Should be a z.object
              expect(content).toMatch(/z\.object\(\{/);

              // Should end with proper export
              expect(content).toMatch(/\}\)/);

              // Should be valid TypeScript
              expect(content).not.toMatch(/\{\s*\}/); // No empty objects
              expect(content).not.toMatch(/undefined.*undefined/); // No undefined chains
            }
          });

          // Check models index file
          const modelsIndexPath = join(modelsDir, 'index.ts');
          if (existsSync(modelsIndexPath)) {
            const content = readFileSync(modelsIndexPath, 'utf-8');

            // Should export all model schemas
            expect(content).toMatch(/export.*UserSchema.*from/);
            expect(content).toMatch(/export.*PostSchema.*from/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Pure Model Integration with Other Features', () => {
    it(
      'should work correctly with field exclusions',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-field-exclusions');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            models: {
              User: {
                enabled: true,
                fields: {
                  exclude: ['password', 'internalId'],
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
  id         Int     @id @default(autoincrement())
  email      String  @unique
  password   String  // Should be excluded
  internalId String  // Should be excluded
  name       String?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const userModelPath = join(modelsDir, 'User.schema.ts');

          if (existsSync(userModelPath)) {
            SchemaValidationUtils.expectSchemaContent(userModelPath, {
              hasFields: ['id', 'email', 'name'],
              excludesFields: ['password', 'internalId'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should integrate with schema variants',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-variants');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            variants: [
              {
                name: 'public',
                suffix: 'Public',
                exclude: ['password', 'internalId'],
              },
              {
                name: 'admin',
                suffix: 'Admin',
                exclude: ['password'],
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
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');

          // Check base pure model
          const userModelPath = join(modelsDir, 'User.schema.ts');
          if (existsSync(userModelPath)) {
            SchemaValidationUtils.expectSchemaContent(userModelPath, {
              hasFields: ['id', 'email', 'password', 'internalId', 'name'],
            });
          }

          // Check public variant
          const userPublicPath = join(modelsDir, 'UserPublic.schema.ts');
          if (existsSync(userPublicPath)) {
            SchemaValidationUtils.expectSchemaContent(userPublicPath, {
              hasFields: ['id', 'email', 'name'],
              excludesFields: ['password', 'internalId'],
            });
          }

          // Check admin variant
          const userAdminPath = join(modelsDir, 'UserAdmin.schema.ts');
          if (existsSync(userAdminPath)) {
            SchemaValidationUtils.expectSchemaContent(userAdminPath, {
              hasFields: ['id', 'email', 'internalId', 'name'],
              excludesFields: ['password'],
            });
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('pureModelsIncludeRelations flag', () => {
    it(
      'omits relation fields by default when pureModels enabled',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-relations-default');
        try {
          const config = { ...ConfigGenerator.createBasicConfig(), pureModels: true };
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
  email String @unique
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User?  @relation(fields: [authorId], references: [id])
  authorId Int?
}
`;
          writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();
          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const userModelPath = join(modelsDir, 'User.schema.ts');
          if (existsSync(userModelPath)) {
            const content = readFileSync(userModelPath, 'utf-8');
            expect(content).not.toMatch(/posts:/);
          }
          const postModelPath = join(modelsDir, 'Post.schema.ts');
          if (existsSync(postModelPath)) {
            const content = readFileSync(postModelPath, 'utf-8');
            expect(content).not.toMatch(/author:/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'includes relation fields when pureModelsIncludeRelations=true',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-models-relations-enabled');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            pureModelsIncludeRelations: true,
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
  email String @unique
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User?  @relation(fields: [authorId], references: [id])
  authorId Int?
}
`;
          writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);
          await testEnv.runGeneration();
          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const userModelPath = join(modelsDir, 'User.schema.ts');
          if (existsSync(userModelPath)) {
            const content = readFileSync(userModelPath, 'utf-8');
            expect(content).toMatch(/posts:/);
          }
          const postModelPath = join(modelsDir, 'Post.schema.ts');
          if (existsSync(postModelPath)) {
            const content = readFileSync(postModelPath, 'utf-8');
            expect(content).toMatch(/author:/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Pure Variant Only Mode', () => {
    it(
      'should generate only pure variant (no CRUD/object schemas) when input/result disabled',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('pure-variant-only-mode');
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            mode: 'custom',
            pureModels: true,
            variants: {
              pure: { enabled: true, suffix: '.model' },
              input: { enabled: false, suffix: '.input' },
              result: { enabled: false, suffix: '.result' },
            },
          } as Partial<import('../src/config/parser').GeneratorConfig>;

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
  email String @unique
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const schemasDir = join(testEnv.outputDir, 'schemas');
          const variantsPureDir = join(schemasDir, 'variants', 'pure');
          const objectsDir = join(schemasDir, 'objects');
          const crudFindMany = join(schemasDir, 'UserFindMany.schema.ts');

          expect(existsSync(variantsPureDir)).toBe(true);
          // Should NOT have objects directory or CRUD operation files
          expect(existsSync(objectsDir)).toBe(false);
          expect(existsSync(crudFindMany)).toBe(false);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
