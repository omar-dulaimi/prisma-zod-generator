import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { 
  TestEnvironment, 
  ConfigGenerator, 
  PrismaSchemaGenerator,
  SchemaValidationUtils,
  GENERATION_TIMEOUT 
} from './helpers';

describe('Inline @zod Comments Tests', () => {
  describe('@zod Comment Parsing', () => {
    it('should parse basic @zod validation annotations', async () => {
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
    }, GENERATION_TIMEOUT);

    it('should handle multiple @zod annotations per field', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-multiple');
      
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

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique /// @zod.email().toLowerCase()
  password String  /// @zod.min(8).max(100).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/)
  name     String? /// @zod.min(1).max(50).trim()
  website  String? /// @zod.url().optional()
}
`;

        const configPath = join(testEnv.testDir, 'config.json');
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
    }, GENERATION_TIMEOUT);

    it('should handle @zod annotations with parameters', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-parameters');
      
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

model Product {
  id          Int     @id @default(autoincrement())
  name        String  /// @zod.min(1, "Name is required").max(100, "Name too long")
  price       Float   /// @zod.positive("Price must be positive").max(999999.99)
  description String? /// @zod.max(1000, "Description too long").optional()
  sku         String  @unique /// @zod.regex(/^[A-Z0-9-]+$/, "Invalid SKU format")
  weight      Float?  /// @zod.positive().multipleOf(0.01, "Weight precision error")
}
`;

        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);

        await testEnv.runGeneration();

        const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
        const productCreatePath = join(objectsDir, 'ProductCreateInput.schema.ts');

        if (existsSync(productCreatePath)) {
          const content = readFileSync(productCreatePath, 'utf-8');
          
          // Should contain validation with custom error messages
          expect(content).toMatch(/\.min\(1,\s*"Name is required"\)/);
          expect(content).toMatch(/\.max\(100,\s*"Name too long"\)/);
          expect(content).toMatch(/\.positive\("Price must be positive"\)/);
          expect(content).toMatch(/\.max\(999999\.99\)/);
          expect(content).toMatch(/\.multipleOf\(0\.01,\s*"Weight precision error"\)/);
          
          // Should handle regex with parameters
          expect(content).toMatch(/\.regex\(\/\^[A-Z0-9-]\+\$\/,\s*"Invalid SKU format"\)/);
        }

      } finally {
        await testEnv.cleanup();
      }
    }, GENERATION_TIMEOUT);

    it('should parse @zod annotations from multi-line comments', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-multiline');
      
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

        const configPath = join(testEnv.testDir, 'config.json');
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
    }, GENERATION_TIMEOUT);
  });

  describe('@zod Validation Application', () => {
    it('should apply validations to correct field types', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-validation-field-types');
      
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

        const configPath = join(testEnv.testDir, 'config.json');
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
    }, GENERATION_TIMEOUT);

    it('should handle optional fields with @zod annotations', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-validation-optional-fields');
      
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

model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique /// @zod.email()
  name      String? /// @zod.min(2).max(50)
  bio       String? /// @zod.max(1000).optional()
  website   String? /// @zod.url()
  phone     String? /// @zod.regex(/^\\+?[1-9]\\d{1,14}$/).optional()
}
`;

        const configPath = join(testEnv.testDir, 'config.json');
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
          expect(content).toMatch(/phone.*\.regex\(/);
          
          // Optional fields should maintain optionality
          expect(content).toMatch(/name.*optional|\.optional\(\)/);
          expect(content).toMatch(/bio.*optional|\.optional\(\)/);
        }

      } finally {
        await testEnv.cleanup();
      }
    }, GENERATION_TIMEOUT);

    it('should handle @zod annotations with default values', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-validation-defaults');
      
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

model Settings {
  id          Int     @id @default(autoincrement())
  theme       String  @default("light") /// @zod.enum(["light", "dark"])
  notifications Boolean @default(true) /// @zod.default(true)
  maxItems    Int     @default(10) /// @zod.min(1).max(100).default(10)
  timeout     Float   @default(30.0) /// @zod.positive().default(30.0)
}
`;

        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);

        await testEnv.runGeneration();

        const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
        const settingsCreatePath = join(objectsDir, 'SettingsCreateInput.schema.ts');

        if (existsSync(settingsCreatePath)) {
          const content = readFileSync(settingsCreatePath, 'utf-8');
          
          // Should handle enum validation
          expect(content).toMatch(/theme.*\.enum\(\["light",\s*"dark"\]\)/);
          
          // Should handle boolean defaults
          expect(content).toMatch(/notifications.*\.default\(true\)/);
          
          // Should handle integer with range and default
          expect(content).toMatch(/maxItems.*\.min\(1\)/);
          expect(content).toMatch(/maxItems.*\.max\(100\)/);
          expect(content).toMatch(/maxItems.*\.default\(10\)/);
          
          // Should handle float with validation and default
          expect(content).toMatch(/timeout.*\.positive\(\)/);
          expect(content).toMatch(/timeout.*\.default\(30\.0\)/);
        }

      } finally {
        await testEnv.cleanup();
      }
    }, GENERATION_TIMEOUT);
  });

  describe('@zod Integration with Existing Comment Processing', () => {
    it('should preserve existing JSDoc while adding @zod validations', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-jsdoc-integration');
      
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

        const configPath = join(testEnv.testDir, 'config.json');
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
    }, GENERATION_TIMEOUT);

    it('should handle @zod annotations alongside other Prisma comments', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-prisma-integration');
      
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

        const configPath = join(testEnv.testDir, 'config.json');
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
    }, GENERATION_TIMEOUT);
  });

  describe('@zod Error Handling', () => {
    it('should handle invalid @zod syntax gracefully', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-invalid-syntax');
      
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

        const configPath = join(testEnv.testDir, 'config.json');
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
    }, GENERATION_TIMEOUT);

    it('should handle @zod annotations on incompatible field types', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-incompatible-types');
      
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

        const configPath = join(testEnv.testDir, 'config.json');
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
    }, GENERATION_TIMEOUT);
  });

  describe('@zod Complex Validation Scenarios', () => {
    it('should handle complex regex patterns in @zod annotations', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-complex-regex');
      
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

        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);

        await testEnv.runGeneration();

        const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
        const validationCreatePath = join(objectsDir, 'ValidationCreateInput.schema.ts');

        if (existsSync(validationCreatePath)) {
          const content = readFileSync(validationCreatePath, 'utf-8');
          
          // Should contain all regex patterns
          expect(content).toMatch(/\.regex\(\/\^[a-zA-Z0-9._%+-]\+@/);
          expect(content).toMatch(/\.regex\(\/\^\(\?\=.*[a-z]\)/);
          expect(content).toMatch(/\.regex\(\/\^\\\+\?[1-9]/);
          expect(content).toMatch(/\.regex\(\/\^[A-Z]\{2,3\}-/);
          expect(content).toMatch(/\.regex\(\/\^\(https\?\:/);
          
          // Should include custom error message
          expect(content).toMatch(/"Invalid product code format"/);
        }

      } finally {
        await testEnv.cleanup();
      }
    }, GENERATION_TIMEOUT);

    it('should handle conditional and transform validations', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-transforms');
      
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

        const configPath = join(testEnv.testDir, 'config.json');
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
          
          // Should handle datetime validation
          expect(content).toMatch(/\.datetime\(\)/);
          
          // Should handle array validation
          expect(content).toMatch(/\.array\(/);
        }

      } finally {
        await testEnv.cleanup();
      }
    }, GENERATION_TIMEOUT);

    it('should handle @zod annotations across different schema types', async () => {
      const testEnv = await TestEnvironment.createTestEnv('zod-comments-schema-types');
      
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

        const configPath = join(testEnv.testDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        writeFileSync(testEnv.schemaPath, schema);

        await testEnv.runGeneration();

        const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

        // Check User create input
        const userCreatePath = join(objectsDir, 'UserCreateInput.schema.ts');
        if (existsSync(userCreatePath)) {
          SchemaValidationUtils.expectSchemaContent(userCreatePath, {
            hasValidations: ['.email()', '.min(2)', '.max(50)']
          });
        }

        // Check User where input
        const userWherePath = join(objectsDir, 'UserWhereInput.schema.ts');
        if (existsSync(userWherePath)) {
          const content = readFileSync(userWherePath, 'utf-8');
          expect(content).toMatch(/email.*\.email\(\)/);
        }

        // Check Post create input
        const postCreatePath = join(objectsDir, 'PostCreateInput.schema.ts');
        if (existsSync(postCreatePath)) {
          SchemaValidationUtils.expectSchemaContent(postCreatePath, {
            hasValidations: ['.min(1)', '.max(200)', '.min(10)']
          });
        }

        // Check Update inputs
        const userUpdatePath = join(objectsDir, 'UserUpdateInput.schema.ts');
        if (existsSync(userUpdatePath)) {
          const content = readFileSync(userUpdatePath, 'utf-8');
          expect(content).toMatch(/email.*\.email\(\)/);
        }

      } finally {
        await testEnv.cleanup();
      }
    }, GENERATION_TIMEOUT);
  });
});