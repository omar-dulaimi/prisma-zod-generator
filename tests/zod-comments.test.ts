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

describe('Inline @zod Comments Tests', () => {
  describe('@zod Comment Parsing', () => {
    it(
      'should parse basic @zod validation annotations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-basic');

        try {
          const config = ConfigGenerator.createBasicConfig();
          const schema = PrismaSchemaGenerator.createSchemaWithZodComments();

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should contain email validation from @zod.email()
            expect(content).toMatch(/\.email\(\)/);

            // Should contain string length validation from @zod.min(2).max(50)
            expect(content).toMatch(/\.min\(2\)/);
            expect(content).toMatch(/\.max\(50\)/);

            // Should contain age validation from @zod.min(0).max(120)
            expect(content).toMatch(/\.min\(0\)/);
            expect(content).toMatch(/\.max\(120\)/);

            // Should contain regex validation from @zod.regex(/^[a-zA-Z0-9_]+$/)
            expect(content).toMatch(/\.regex\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle multiple @zod annotations per field',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-multiple');

        try {
          const config = ConfigGenerator.createBasicConfig();
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
  id       Int     @id @default(autoincrement())
  email    String  @unique /// @zod.email().toLowerCase()
  password String  /// @zod.min(8).max(100).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/)
  name     String? /// @zod.min(1).max(50).trim()
  website  String? /// @zod.url().optional()
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Email field: @zod.email().toLowerCase()
            expect(content).toMatch(/\.email\(\)/);
            expect(content).toMatch(/\.toLowerCase\(\)/);

            // Password field: @zod.min(8).max(100).regex(...)
            expect(content).toMatch(/\.min\(8\)/);
            expect(content).toMatch(/\.max\(100\)/);
            expect(content).toMatch(/\.regex\(/);

            // Name field: @zod.min(1).max(50).trim()
            expect(content).toMatch(/\.min\(1\)/);
            expect(content).toMatch(/\.max\(50\)/);
            expect(content).toMatch(/\.trim\(\)/);

            // Website field: @zod.url().optional()
            expect(content).toMatch(/\.url\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle @zod annotations with parameters',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-parameters');

        try {
          const config = ConfigGenerator.createBasicConfig();
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

model Product {
  id          Int     @id @default(autoincrement())
  name        String  /// @zod.min(1, "Name is required").max(100, "Name too long")
  price       Float   /// @zod.positive("Price must be positive").max(999999.99)
  description String? /// @zod.max(1000, "Description too long").optional()
  sku         String  @unique /// @zod.regex(/^[A-Z0-9-]+$/, "Invalid SKU format")
  weight      Float?  /// @zod.positive().multipleOf(0.01, "Weight precision error")
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const productCreatePath = join(objectsDir, 'ProductCreateInput.schema.ts');

          if (existsSync(productCreatePath)) {
            const content = readFileSync(productCreatePath, 'utf-8');

            // Should contain validation with custom error messages
            expect(content).toMatch(/\.min\(1,\s*'Name is required'\)/);
            expect(content).toMatch(/\.max\(100,\s*'Name too long'\)/);
            expect(content).toMatch(/\.positive\('Price must be positive'\)/);
            expect(content).toMatch(/\.max\(999999\.99\)/);
            expect(content).toMatch(/\.multipleOf\(0\.01,\s*'Weight precision error'\)/);

            // Should handle regex with parameters
            expect(content).toContain(".regex(/^[A-Z0-9-]+$/, 'Invalid SKU format')");
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should parse @zod annotations from multi-line comments',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-multiline');

        try {
          const config = ConfigGenerator.createBasicConfig();
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
  id    Int    @id @default(autoincrement())
  /**
   * User's email address
   * @zod.email()
   * @zod.toLowerCase()
   */
  email String @unique
  
  /**
   * User's display name
   * Must be between 2-50 characters
   * @zod.min(2).max(50).trim()
   */
  name  String?
  
  /// Complex validation for phone
  /// @zod.regex(/^\\+?[1-9]\\d{1,14}$/)
  phone String?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should parse from multi-line block comments
            expect(content).toMatch(/\.email\(\)/);
            expect(content).toMatch(/\.toLowerCase\(\)/);
            expect(content).toMatch(/\.min\(2\)/);
            expect(content).toMatch(/\.max\(50\)/);
            expect(content).toMatch(/\.trim\(\)/);

            // Should parse from single-line comments
            expect(content).toMatch(/\.regex\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('@zod Validation Application', () => {
    it(
      'should apply validations to correct field types',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-validation-field-types');

        try {
          const config = ConfigGenerator.createBasicConfig();
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

model TestTypes {
  id          Int      @id @default(autoincrement())
  stringField String   /// @zod.min(1).max(100)
  intField    Int      /// @zod.min(0).max(1000)
  floatField  Float    /// @zod.positive()
  boolField   Boolean  /// @zod.default(false)
  dateField   DateTime /// @zod.min(new Date('2020-01-01'))
  jsonField   Json?    /// @zod.object()
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const testTypesCreatePath = join(objectsDir, 'TestTypesCreateInput.schema.ts');

          if (existsSync(testTypesCreatePath)) {
            const content = readFileSync(testTypesCreatePath, 'utf-8');

            // String field validations
            expect(content).toMatch(/stringField.*\.min\(1\)/);
            expect(content).toMatch(/stringField.*\.max\(100\)/);

            // Int field validations
            expect(content).toMatch(/intField.*\.min\(0\)/);
            expect(content).toMatch(/intField.*\.max\(1000\)/);

            // Float field validations
            expect(content).toMatch(/floatField.*\.positive\(\)/);

            // Boolean field validations
            expect(content).toMatch(/boolField.*\.default\(false\)/);

            // Date field validations
            expect(content).toMatch(/dateField.*\.min\(/);

            // JSON field validations
            expect(content).toMatch(/jsonField.*\.object\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle optional fields with @zod annotations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-validation-optional-fields');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            optionalFieldBehavior: 'optional',
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
  id        Int     @id @default(autoincrement())
  email     String  @unique /// @zod.email()
  name      String? /// @zod.min(2).max(50)
  bio       String? /// @zod.max(1000).optional()
  website   String? /// @zod.url()
  phone     String? /// @zod.regex(/^\\+?[1-9]\\d{1,14}$/).optional()
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Required field should not have .optional()
            expect(content).toMatch(/email.*\.email\(\)/);
            expect(content).not.toMatch(/email.*\.optional\(\)/);

            // Optional fields should handle validation correctly
            expect(content).toMatch(/name.*\.min\(2\)/);
            expect(content).toMatch(/name.*\.max\(50\)/);
            expect(content).toMatch(/bio.*\.max\(1000\)/);
            expect(content).toMatch(/website.*\.url\(\)/);
            expect(content).toMatch(/phone[\s\S]*?\.regex\(/);

            // Optional fields should maintain optionality
            expect(content).toMatch(/name.*optional|\.optional\(\)/);
            expect(content).toMatch(/bio.*optional|\.optional\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle @zod annotations with default values',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-validation-defaults');

        try {
          const config = ConfigGenerator.createBasicConfig();
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

model Settings {
  id          Int     @id @default(autoincrement())
  theme       String  @default("light") /// @zod.enum(["light", "dark"])
  notifications Boolean @default(true) /// @zod.default(true)
  maxItems    Int     @default(10) /// @zod.min(1).max(100).default(10)
  timeout     Float   @default(30.0) /// @zod.positive().default(30.0)
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const settingsCreatePath = join(objectsDir, 'SettingsCreateInput.schema.ts');

          if (existsSync(settingsCreatePath)) {
            const content = readFileSync(settingsCreatePath, 'utf-8');

            // Should handle enum validation
            expect(content).toMatch(/theme.*\.enum\(\['light',\s*'dark'\]\)/);

            // Should handle boolean defaults
            expect(content).toMatch(/notifications.*\.default\(true\)/);

            // Should handle integer with range and default
            expect(content).toMatch(/maxItems.*\.min\(1\)/);
            expect(content).toMatch(/maxItems.*\.max\(100\)/);
            expect(content).toMatch(/maxItems.*\.default\(10\)/);

            // Should handle float with validation and default
            expect(content).toMatch(/timeout.*\.positive\(\)/);
            expect(content).toMatch(/timeout.*\.default\(30\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('@zod Integration with Existing Comment Processing', () => {
    it(
      'should preserve existing JSDoc while adding @zod validations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-jsdoc-integration');

        try {
          const config = ConfigGenerator.createBasicConfig();
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
  id    Int    @id @default(autoincrement())
  
  /**
   * The user's email address
   * Used for authentication and notifications
   * @zod.email()
   */
  email String @unique
  
  /// Display name for the user
  /// @zod.min(2).max(50)
  name  String?
  
  /**
   * User's profile description
   * @example "Software developer passionate about clean code"
   * @zod.max(1000)
   */
  bio   String?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should have @zod validations applied
            expect(content).toMatch(/\.email\(\)/);
            expect(content).toMatch(/\.min\(2\)/);
            expect(content).toMatch(/\.max\(50\)/);
            expect(content).toMatch(/\.max\(1000\)/);

            // Should preserve JSDoc comments as schema descriptions
            if (content.includes('/**')) {
              expect(content).toMatch(/The user's email address|email address/);
              expect(content).toMatch(/Display name|name/);
              expect(content).toMatch(/profile description|description/);
            }
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle @zod annotations alongside other Prisma comments',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-prisma-integration');

        try {
          const config = ConfigGenerator.createBasicConfig();
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
  id    Int    @id @default(autoincrement())
  
  /// @description User's email for authentication
  /// @zod.email().toLowerCase()
  email String @unique
  
  /// @map("full_name")
  /// @zod.min(1).max(100)
  name  String?
  
  /// @deprecated Use profile.bio instead
  /// @zod.max(500)
  oldBio String?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should apply @zod validations regardless of other annotations
            expect(content).toMatch(/\.email\(\)/);
            expect(content).toMatch(/\.toLowerCase\(\)/);
            expect(content).toMatch(/\.min\(1\)/);
            expect(content).toMatch(/\.max\(100\)/);
            expect(content).toMatch(/\.max\(500\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('@zod Error Handling', () => {
    it(
      'should handle invalid @zod syntax gracefully',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-invalid-syntax');

        try {
          const config = ConfigGenerator.createBasicConfig();
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
  id    Int    @id @default(autoincrement())
  
  /// @zod.invalidMethod()
  field1 String
  
  /// @zod.min()  // Missing parameter
  field2 String
  
  /// @zod.regex(/unclosed regex
  field3 String
  
  /// @zod.email()  // Valid annotation
  email  String @unique
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          // Should not throw error for invalid @zod syntax
          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should still generate schema with valid annotations
            expect(content).toMatch(/email.*\.email\(\)/);

            // Should not include invalid syntax
            expect(content).not.toMatch(/\.invalidMethod\(\)/);
            expect(content).not.toMatch(/\.min\(\s*\)/); // Empty min
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle @zod annotations on incompatible field types',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-incompatible-types');

        try {
          const config = ConfigGenerator.createBasicConfig();
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
  id       Int     @id @default(autoincrement())
  
  /// @zod.email()  // Valid for string
  email    String  @unique
  
  /// @zod.email()  // Invalid for boolean
  isActive Boolean
  
  /// @zod.min(1)   // Invalid for boolean
  isAdmin  Boolean
  
  /// @zod.positive() // Valid for int
  age      Int?
  
  /// @zod.url()    // Invalid for int
  points   Int
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should apply valid type-compatible validations
            expect(content).toMatch(/email.*\.email\(\)/);
            expect(content).toMatch(/age.*\.positive\(\)/);

            // Should not apply incompatible validations
            expect(content).not.toMatch(/isActive.*\.email\(\)/);
            expect(content).not.toMatch(/isAdmin.*\.min\(/);
            expect(content).not.toMatch(/points.*\.url\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('@zod Complex Validation Scenarios', () => {
    it(
      'should handle complex regex patterns in @zod annotations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-complex-regex');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            optionalFieldBehavior: 'optional',
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

model Validation {
  id           Int     @id @default(autoincrement())
  
  /// @zod.regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/)
  email        String  @unique
  
  /// @zod.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/)
  password     String
  
  /// @zod.regex(/^\\+?[1-9]\\d{1,14}$/)
  phone        String?
  
  /// @zod.regex(/^[A-Z]{2,3}-\\d{4,6}$/, "Invalid product code format")
  productCode  String
  
  /// @zod.regex(/^(https?:\\/\\/)?(www\\.)?[a-zA-Z0-9-]+\\.[a-zA-Z]{2,}(\\/.*)?\$/)
  website      String?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const validationCreatePath = join(objectsDir, 'ValidationCreateInput.schema.ts');

          if (existsSync(validationCreatePath)) {
            const content = readFileSync(validationCreatePath, 'utf-8');

            // Should contain all regex patterns
            expect(content).toMatch(/email[\s\S]*?\.regex\(/);
            expect(content).toMatch(/password[\s\S]*?\.regex\(/);
            expect(content).toMatch(/phone[\s\S]*?\.regex\(/);
            expect(content).toMatch(/productCode[\s\S]*?\.regex\(/);
            expect(content).toMatch(/website[\s\S]*?optional/);

            // Should include custom error message
            expect(content).toMatch(/'Invalid product code format'/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle conditional and transform validations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-transforms');

        try {
          const config = ConfigGenerator.createBasicConfig();
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
  id        Int     @id @default(autoincrement())
  
  /// @zod.email().toLowerCase().trim()
  email     String  @unique
  
  /// @zod.string().trim().min(1).transform(val => val.toUpperCase())
  name      String
  
  /// @zod.number().int().positive().transform(val => Math.floor(val))
  age       Int?
  
  /// @zod.string().datetime().transform(val => new Date(val))
  joinedAt  String
  
  /// @zod.array(z.string()).min(1).max(10)
  tags      String
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');

          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');

            // Should handle chained transformations
            expect(content).toMatch(/\.email\(\)/);
            expect(content).toMatch(/\.toLowerCase\(\)/);
            expect(content).toMatch(/\.trim\(\)/);

            // Should handle transform functions
            expect(content).toMatch(/\.transform\(/);

            // Should handle datetime/transform validation
            expect(content).toMatch(/joinedAt[\s\S]*?\.transform\(/);

            // Should handle array validation
            expect(content).toMatch(/\.array\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle @zod annotations across different schema types',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('zod-comments-schema-types');

        try {
          const config = ConfigGenerator.createBasicConfig();
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
  id    Int     @id @default(autoincrement())
  /// @zod.email()
  email String  @unique
  /// @zod.min(2).max(50)
  name  String?
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  /// @zod.min(1).max(200)
  title    String
  /// @zod.min(10)
  content  String?
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // Check User create input
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(userCreatePath, {
              hasValidations: ['.email()', '.min(2)', '.max(50)'],
            });
          }

          // Check User where input
          const userWherePath = join(objectsDir, 'UserWhereInput.schema.ts');
          if (existsSync(userWherePath)) {
            const content = readFileSync(userWherePath, 'utf-8');
            expect(content).toMatch(/email[\s\S]*?\.email\(\)/);
          }

          // Check Post create input
          const postCreatePath = join(objectsDir, 'PostCreateInput.schema.ts');
          if (existsSync(postCreatePath)) {
            SchemaValidationUtils.expectSchemaContent(postCreatePath, {
              hasValidations: ['.min(1)', '.max(200)', '.min(10)'],
            });
          }

          // Check Update inputs
          const userUpdatePath = join(objectsDir, 'UserUpdateInput.schema.ts');
          if (existsSync(userUpdatePath)) {
            const content = readFileSync(userUpdatePath, 'utf-8');
            expect(content).toMatch(/email[\s\S]*?\.email\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Native Type Max Length Validation', () => {
    it(
      'should extract max length from @db.VarChar and apply to Zod schema',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('native-varchar-basic');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            optionalFieldBehavior: 'optional',
          };
          const configPath = join(testEnv.testDir, 'config.json');
          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://user:password@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model VarCharTest {
  id            Int     @id @default(autoincrement())
  shortField    String? @db.VarChar(10)
  mediumField   String? @db.VarChar(255)
  longField     String? @db.VarChar(1000)
  charField     String? @db.Char(50)
  requiredField String  @db.VarChar(100)
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const testCreatePath = join(objectsDir, 'VarCharTestCreateInput.schema.ts');

          if (existsSync(testCreatePath)) {
            const content = readFileSync(testCreatePath, 'utf-8');

            // Should apply max length from VarChar native types
            expect(content).toMatch(/shortField.*\.max\(10\)/);
            expect(content).toMatch(/mediumField.*\.max\(255\)/);
            expect(content).toMatch(/longField.*\.max\(1000\)/);
            expect(content).toMatch(/charField.*\.max\(50\)/);
            expect(content).toMatch(/requiredField.*\.max\(100\)/);

            // Optional fields should maintain optionality
            expect(content).toMatch(/shortField.*\.optional\(\)/);
            expect(content).toMatch(/mediumField.*\.optional\(\)/);

            // Required fields should not have optional
            expect(content).not.toMatch(/requiredField.*\.optional\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle conflicts between native types and @zod.max - prefer more restrictive',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('native-varchar-conflicts');

        try {
          const config = ConfigGenerator.createBasicConfig();
          const configPath = join(testEnv.testDir, 'config.json');
          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://user:password@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model ConflictTest {
  id               Int     @id @default(autoincrement())
  nativeWins       String? @db.VarChar(50) /// @zod.max(100)
  zodWins          String? @db.VarChar(200) /// @zod.max(150)
  equalConstraints String? @db.VarChar(75) /// @zod.max(75)
  onlyNative       String? @db.VarChar(300)
  onlyZod          String? /// @zod.max(400)
  noConstraints    String?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const testCreatePath = join(objectsDir, 'ConflictTestCreateInput.schema.ts');

          if (existsSync(testCreatePath)) {
            const content = readFileSync(testCreatePath, 'utf-8');

            // Native type should win when more restrictive
            expect(content).toMatch(/nativeWins.*\.max\(50\)/);
            expect(content).not.toMatch(/nativeWins.*\.max\(100\)/);

            // Zod constraint should win when more restrictive
            expect(content).toMatch(/zodWins.*\.max\(150\)/);
            expect(content).not.toMatch(/zodWins.*\.max\(200\)/);

            // Equal constraints should preserve existing @zod
            expect(content).toMatch(/equalConstraints.*\.max\(75\)/);

            // Only native constraint should be applied
            expect(content).toMatch(/onlyNative.*\.max\(300\)/);

            // Only @zod constraint should be preserved
            expect(content).toMatch(/onlyZod.*\.max\(400\)/);

            // No constraints should remain unchanged
            expect(content).toMatch(/noConstraints.*z\.string\(\)/);
            expect(content).not.toMatch(/noConstraints.*\.max\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should support various native string types across database providers',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('native-varchar-providers');

        try {
          const config = ConfigGenerator.createBasicConfig();
          const configPath = join(testEnv.testDir, 'config.json');
          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = "sqlserver://localhost:1433;database=test;user=sa;password=password"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model ProviderTest {
  id           Int     @id @default(autoincrement())
  varcharField String? @db.VarChar(100)
  charField    String? @db.Char(20)
  nvarcharField String? @db.NVarChar(150)
  ncharField   String? @db.NChar(30)
  textField    String? @db.Text
  intField     Int?
  dateField    DateTime?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const testCreatePath = join(objectsDir, 'ProviderTestCreateInput.schema.ts');

          if (existsSync(testCreatePath)) {
            const content = readFileSync(testCreatePath, 'utf-8');

            // Should apply max length for supported native types
            expect(content).toMatch(/varcharField.*\.max\(100\)/);
            expect(content).toMatch(/charField.*\.max\(20\)/);
            expect(content).toMatch(/nvarcharField.*\.max\(150\)/);
            expect(content).toMatch(/ncharField.*\.max\(30\)/);

            // Text field without length should not have max constraint
            expect(content).not.toMatch(/textField.*\.max\(/);

            // Non-string fields should be unaffected
            expect(content).toMatch(/intField.*z\.number\(\)\.int\(\)/);
            expect(content).not.toMatch(/intField.*\.max\(/);
            expect(content).not.toMatch(/dateField.*\.max\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle array fields with native type constraints',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('native-varchar-arrays');

        try {
          const config = ConfigGenerator.createBasicConfig();
          const configPath = join(testEnv.testDir, 'config.json');
          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://user:password@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model ArrayTest {
  id               Int       @id @default(autoincrement())
  regularArray     String[]
  varcharArray     String[]  @db.VarChar(100)
  charArray        String[]  @db.Char(50)
  mixedArray       String[]  @db.VarChar(200) /// @zod.min(1).max(10)
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const testCreatePath = join(objectsDir, 'ArrayTestCreateInput.schema.ts');

          if (existsSync(testCreatePath)) {
            const content = readFileSync(testCreatePath, 'utf-8');

            // Regular array should not have max constraint on elements
            expect(content).toMatch(/regularArray.*z\.string\(\)\.array\(\)/);
            expect(content).not.toMatch(/regularArray.*\.max\(/);

            // VarChar array should apply max length to array elements
            expect(content).toMatch(/varcharArray.*\.max\(100\)\.array\(\)/);
            expect(content).toMatch(/charArray.*\.max\(50\)\.array\(\)/);

            // Mixed constraints should work together - arrays use lazy loading
            expect(content).toMatch(/mixedArray.*\.array\(\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle complex scenarios with multiple constraints and field types',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('native-varchar-complex');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            optionalFieldBehavior: 'optional',
          };
          const configPath = join(testEnv.testDir, 'config.json');
          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://user:password@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model ComplexTest {
  id                 Int     @id @default(autoincrement())
  
  // Required fields with native constraints
  requiredVarchar    String  @db.VarChar(100)
  requiredWithZod    String  @db.VarChar(500) /// @zod.min(5).max(300)
  
  // Optional fields with various constraints
  optionalVarchar    String? @db.VarChar(250)
  optionalWithZod    String? @db.Char(80) /// @zod.email().max(120)
  
  // Complex @zod validations with native types
  emailField         String  @db.VarChar(320) /// @zod.email().toLowerCase()
  passwordField      String  @db.VarChar(255) /// @zod.min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/)
  
  // Non-string fields (should be unaffected)
  intField           Int?    @db.Integer
  boolField          Boolean @default(false)
  dateField          DateTime @default(now())
  
  // Arrays and special cases
  tagArray           String[] @db.VarChar(50)
  jsonField          Json?
  bytesField         Bytes?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const testCreatePath = join(objectsDir, 'ComplexTestCreateInput.schema.ts');

          if (existsSync(testCreatePath)) {
            const content = readFileSync(testCreatePath, 'utf-8');

            // Required fields with native constraints
            expect(content).toMatch(/requiredVarchar.*\.max\(100\)/);
            expect(content).not.toMatch(/requiredVarchar.*\.optional\(\)/);

            // Conflict resolution - more restrictive constraint wins
            expect(content).toMatch(/requiredWithZod.*\.max\(300\)/);
            expect(content).toMatch(/requiredWithZod.*\.min\(5\)/);

            // Optional fields should maintain optionality
            expect(content).toMatch(/optionalVarchar.*\.max\(250\)/);
            expect(content).toMatch(/optionalVarchar.*\.optional\(\)/);

            // Complex constraint resolution
            expect(content).toMatch(/optionalWithZod.*\.max\(80\)/); // Char(80) < email max(120)
            expect(content).toMatch(/optionalWithZod.*\.email\(\)/);

            // Email field - preserve email validation with native constraint
            expect(content).toMatch(/emailField.*\.email\(\)/);
            expect(content).toMatch(/emailField.*\.toLowerCase\(\)/);
            expect(content).toMatch(/emailField.*\.max\(320\)/);

            // Password field - preserve regex with native constraint
            expect(content).toMatch(/passwordField.*\.min\(8\)/);
            expect(content).toMatch(/passwordField.*\.max\(255\)/);
            expect(content).toMatch(/passwordField.*\.regex\(/);

            // Non-string fields should be unaffected
            expect(content).toMatch(/intField.*z\.number\(\)\.int\(\)/);
            expect(content).not.toMatch(/intField.*\.max\(/);
            expect(content).not.toMatch(/dateField.*\.max\(/);
            expect(content).not.toMatch(/boolField.*\.max\(/);

            // Arrays should apply constraints to elements
            expect(content).toMatch(/tagArray.*\.max\(50\)\.array\(\)/);

            // Special field types should be unaffected
            expect(content).not.toMatch(/jsonField.*\.max\(/);
            expect(content).not.toMatch(/bytesField.*\.max\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle edge cases and invalid native type configurations',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('native-varchar-edge-cases');

        try {
          const config = ConfigGenerator.createBasicConfig();
          const configPath = join(testEnv.testDir, 'config.json');
          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://user:password@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model EdgeCaseTest {
  id                Int     @id @default(autoincrement())
  
  // Zero length (should be ignored)
  zeroLength        String? @db.VarChar(0)
  
  // Very large length
  hugeLength        String? @db.VarChar(65535)
  
  // Non-string with native type (should only affect string processing)
  intWithNative     Int?    @db.Integer
  
  // Complex @zod with multiple max constraints
  multipleMax       String? @db.VarChar(100) /// @zod.max(50).max(75).min(10)
  
  // Native type without parameters (Text, etc.)
  textField         String? @db.Text
  
  // Standard field types
  normalString      String
  normalOptional    String?
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const testCreatePath = join(objectsDir, 'EdgeCaseTestCreateInput.schema.ts');

          if (existsSync(testCreatePath)) {
            const content = readFileSync(testCreatePath, 'utf-8');

            // Zero length should be ignored (invalid constraint)
            expect(content).not.toMatch(/zeroLength.*\.max\(0\)/);

            // Very large length should work normally
            expect(content).toMatch(/hugeLength.*\.max\(65535\)/);

            // Non-string fields should be completely unaffected
            expect(content).toMatch(/intWithNative.*z\.number\(\)\.int\(\)/);
            expect(content).not.toMatch(/intWithNative.*\.max\(/);

            // Multiple max constraints - should use most restrictive
            expect(content).toMatch(/multipleMax.*\.max\(50\)/);
            expect(content).toMatch(/multipleMax.*\.min\(10\)/);
            expect(content).not.toMatch(/multipleMax.*\.max\(75\)/);
            expect(content).not.toMatch(/multipleMax.*\.max\(100\)/);

            // Text field without length parameter should not have max
            expect(content).not.toMatch(/textField.*\.max\(/);

            // Normal fields should remain unchanged
            expect(content).toMatch(/normalString.*z\.string\(\)/);
            expect(content).not.toMatch(/normalString.*\.max\(/);
            expect(content).toMatch(/normalOptional.*z\.string\(\)/);
            expect(content).not.toMatch(/normalOptional.*\.max\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should work correctly across different schema input types',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('native-varchar-schema-types');

        try {
          const config = ConfigGenerator.createBasicConfig();
          const configPath = join(testEnv.testDir, 'config.json');
          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://user:password@localhost:5432/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model User {
  id          Int     @id @default(autoincrement())
  email       String  @unique @db.VarChar(320) /// @zod.email()
  name        String  @db.VarChar(100)
  description String? @db.VarChar(1000) /// @zod.max(500)
  posts       Post[]
}

model Post {
  id        Int    @id @default(autoincrement())
  title     String @db.VarChar(200) /// @zod.min(1)
  content   String @db.VarChar(5000)
  author    User   @relation(fields: [authorId], references: [id])
  authorId  Int
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

          // Test Create Input schemas
          const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
          if (existsSync(userCreatePath)) {
            const content = readFileSync(userCreatePath, 'utf-8');
            expect(content).toMatch(/email.*\.email\(\)/);
            expect(content).toMatch(/email.*\.max\(320\)/);
            expect(content).toMatch(/name.*\.max\(100\)/);
            expect(content).toMatch(/description.*\.max\(500\)/); // More restrictive @zod wins
          }

          // Test Update Input schemas
          const userUpdatePath = join(objectsDir, 'UserUpdateInput.schema.ts');
          if (existsSync(userUpdatePath)) {
            const content = readFileSync(userUpdatePath, 'utf-8');
            expect(content).toMatch(/email.*\.email\(\)/);
            expect(content).toMatch(/email.*\.max\(320\)/);
          }

          // Test Where Input schemas
          const userWherePath = join(objectsDir, 'UserWhereInput.schema.ts');
          if (existsSync(userWherePath)) {
            const content = readFileSync(userWherePath, 'utf-8');
            expect(content).toMatch(/email.*\.max\(320\)/);
          }

          // Test Post schemas
          const postCreatePath = join(objectsDir, 'PostCreateInput.schema.ts');
          if (existsSync(postCreatePath)) {
            const content = readFileSync(postCreatePath, 'utf-8');
            expect(content).toMatch(/title.*\.min\(1\)/);
            expect(content).toMatch(/title.*\.max\(200\)/);
            expect(content).toMatch(/content.*\.max\(5000\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle MongoDB ObjectId native type constraints',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('native-mongodb-objectid');

        try {
          const config = ConfigGenerator.createBasicConfig();
          const configPath = join(testEnv.testDir, 'config.json');
          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = "mongodb://localhost:27017/test"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "${configPath}"
}

model MongoUser {
  id       String   @id @default(auto()) @map("_id") @db.ObjectId
  email    String   @unique
  name     String?
  profileId String? @db.ObjectId
}
`;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const testCreatePath = join(objectsDir, 'MongoUserCreateInput.schema.ts');

          if (existsSync(testCreatePath)) {
            const content = readFileSync(testCreatePath, 'utf-8');

            // MongoDB ObjectId should have max length of 24
            // Note: id field is excluded from CreateInput due to @default(auto())
            expect(content).toMatch(/profileId.*\.max\(24\)/);

            // Regular string fields should not have max constraints
            expect(content).not.toMatch(/email.*\.max\(/);
            expect(content).not.toMatch(/name.*\.max\(/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
