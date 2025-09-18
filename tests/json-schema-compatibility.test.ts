import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ConfigGenerator,
  GENERATION_TIMEOUT,
  TestEnvironment,
} from './helpers';

/**
 * Test suite for JSON Schema compatibility feature (GitHub Issue #236)
 * 
 * This tests the ability to use z.toJSONSchema() with generated schemas
 * when jsonSchemaCompatible is enabled in the configuration.
 */
describe('JSON Schema Compatibility', () => {
  
  describe('Pure Model Schemas with JSON Schema Compatibility', () => {
    it(
      'should generate pure model schemas that work with z.toJSONSchema()',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('json-schema-pure-models');
        
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            jsonSchemaCompatible: true,
            jsonSchemaOptions: {
              dateTimeFormat: 'isoString',
              bigIntFormat: 'string',
              bytesFormat: 'base64String',
            },
            models: {
              Planet: { enabled: true },
              Post: { enabled: true },
              User: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

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
  output   = "./generated/schemas"
  config   = "${configPath}"
}

enum Role {
  USER
  ADMIN
}

model Planet {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id          Int      @id @default(autoincrement())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  title       String
  content     String?
  published   Boolean  @default(false)
  viewCount   Int      @default(0)
  author      User?    @relation(fields: [authorId], references: [id])
  authorId    Int?
  likes       BigInt   @default(0)
  bytes       Bytes?
}

model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique
  name     String?
  password String
  role     Role?
  posts    Post[]
  books    Json[]
}
`;

          writeFileSync(testEnv.schemaPath, schema);

          // Build and generate
          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants', 'pure');

          // Check that pure model files were generated
          const pureFiles = [
            join(variantsDir, 'Planet.pure.ts'),
            join(variantsDir, 'Post.pure.ts'),
            join(variantsDir, 'User.pure.ts'),
          ];

          pureFiles.forEach((file) => {
            expect(existsSync(file), `Pure model file should exist: ${file}`).toBe(true);
          });

          // Import and test Planet pure model
          const planetModule = await import(join(variantsDir, 'Planet.pure.ts'));
          const PlanetModelSchema = planetModule.PlanetModelSchema;
          
          expect(() => {
            const jsonSchema = z.toJSONSchema(PlanetModelSchema);
            expect(jsonSchema).toBeDefined();
            expect(jsonSchema.type).toBe('object');
            expect(jsonSchema.properties).toBeDefined();
            
            // Verify DateTime fields use string patterns
            expect(jsonSchema.properties.createdAt.type).toBe('string');
            expect(jsonSchema.properties.createdAt.pattern).toContain('\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}');
          }).not.toThrow();

          // Import and test Post pure model
          const postModule = await import(join(variantsDir, 'Post.pure.ts'));
          const PostModelSchema = postModule.PostModelSchema;
          
          expect(() => {
            const jsonSchema = z.toJSONSchema(PostModelSchema);
            expect(jsonSchema).toBeDefined();
            expect(jsonSchema.type).toBe('object');
            expect(jsonSchema.properties).toBeDefined();
            
            // Verify BigInt fields use string patterns
            expect(jsonSchema.properties.likes.type).toBe('string');
            expect(jsonSchema.properties.likes.pattern).toContain('\\d+');
            
            // Verify Bytes fields use string patterns (could be nullable)
            if (jsonSchema.properties.bytes.anyOf) {
              expect(jsonSchema.properties.bytes.anyOf[0].type).toBe('string');
              expect(jsonSchema.properties.bytes.anyOf[0].pattern).toContain('A-Za-z0-9');
            } else {
              expect(jsonSchema.properties.bytes.type).toBe('string');
              expect(jsonSchema.properties.bytes.pattern).toContain('A-Za-z0-9');
            }
          }).not.toThrow();

          // Import and test User pure model
          const userModule = await import(join(variantsDir, 'User.pure.ts'));
          const UserModelSchema = userModule.UserModelSchema;
          
          expect(() => {
            const jsonSchema = z.toJSONSchema(UserModelSchema);
            expect(jsonSchema).toBeDefined();
            expect(jsonSchema.type).toBe('object');
            expect(jsonSchema.properties).toBeDefined();
          }).not.toThrow();

        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT
    );
  });

  describe('Input Schema Variants with JSON Schema Compatibility', () => {
    it(
      'should generate input schemas that work with z.toJSONSchema()',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('json-schema-input-variants');
        
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            jsonSchemaCompatible: true,
            jsonSchemaOptions: {
              dateTimeFormat: 'isoString',
              bigIntFormat: 'string',
              bytesFormat: 'base64String',
            },
            models: {
              Planet: { enabled: true },
              Post: { enabled: true },
              User: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

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
  output   = "./generated/schemas"
  config   = "${configPath}"
}

enum Role {
  USER
  ADMIN
}

model Planet {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id          Int      @id @default(autoincrement())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  title       String
  content     String?
  published   Boolean  @default(false)
  viewCount   Int      @default(0)
  author      User?    @relation(fields: [authorId], references: [id])
  authorId    Int?
  likes       BigInt   @default(0)
  bytes       Bytes?
}

model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique
  name     String?
  password String
  role     Role?
  posts    Post[]
  books    Json[]
}
`;

          writeFileSync(testEnv.schemaPath, schema);

          // Build and generate
          await testEnv.runGeneration();

          const inputDir = join(testEnv.outputDir, 'schemas', 'variants', 'input');

          // Check that input variant files were generated
          const inputFiles = [
            join(inputDir, 'Planet.input.ts'),
            join(inputDir, 'Post.input.ts'),
            join(inputDir, 'User.input.ts'),
          ];

          inputFiles.forEach((file) => {
            expect(existsSync(file), `Input variant file should exist: ${file}`).toBe(true);
          });

          // Test Planet input schemas
          const planetInputModule = await import(join(inputDir, 'Planet.input.ts'));
          Object.entries(planetInputModule).forEach(([name, schema]) => {
            if (name.includes('Input') && typeof schema === 'object' && 'parse' in schema) {
              expect(() => {
                const jsonSchema = z.toJSONSchema(schema as z.ZodSchema);
                expect(jsonSchema).toBeDefined();
              }, `Failed to convert ${name} to JSON Schema`).not.toThrow();
            }
          });

          // Test Post input schemas
          const postInputModule = await import(join(inputDir, 'Post.input.ts'));
          Object.entries(postInputModule).forEach(([name, schema]) => {
            if (name.includes('Input') && typeof schema === 'object' && 'parse' in schema) {
              expect(() => {
                const jsonSchema = z.toJSONSchema(schema as z.ZodSchema);
                expect(jsonSchema).toBeDefined();
              }, `Failed to convert ${name} to JSON Schema`).not.toThrow();
            }
          });

          // Test User input schemas
          const userInputModule = await import(join(inputDir, 'User.input.ts'));
          Object.entries(userInputModule).forEach(([name, schema]) => {
            if (name.includes('Input') && typeof schema === 'object' && 'parse' in schema) {
              expect(() => {
                const jsonSchema = z.toJSONSchema(schema as z.ZodSchema);
                expect(jsonSchema).toBeDefined();
              }, `Failed to convert ${name} to JSON Schema`).not.toThrow();
            }
          });

        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT
    );
  });

  describe('Result Schema Variants with JSON Schema Compatibility', () => {
    it(
      'should generate result schemas that work with z.toJSONSchema()',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('json-schema-result-variants');
        
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            generateResultSchemas: true,
            jsonSchemaCompatible: true,
            jsonSchemaOptions: {
              dateTimeFormat: 'isoString',
              bigIntFormat: 'string',
              bytesFormat: 'base64String',
            },
            models: {
              Planet: { enabled: true },
              Post: { enabled: true },
              User: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

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
  output   = "./generated/schemas"
  config   = "${configPath}"
}

enum Role {
  USER
  ADMIN
}

model Planet {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id          Int      @id @default(autoincrement())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  title       String
  content     String?
  published   Boolean  @default(false)
  viewCount   Int      @default(0)
  author      User?    @relation(fields: [authorId], references: [id])
  authorId    Int?
  likes       BigInt   @default(0)
  bytes       Bytes?
}

model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique
  name     String?
  password String
  role     Role?
  posts    Post[]
  books    Json[]
}
`;

          writeFileSync(testEnv.schemaPath, schema);

          // Build and generate
          await testEnv.runGeneration();

          const resultDir = join(testEnv.outputDir, 'schemas', 'variants', 'result');

          // Check that result variant files were generated
          const resultFiles = [
            join(resultDir, 'Planet.result.ts'),
            join(resultDir, 'Post.result.ts'),
            join(resultDir, 'User.result.ts'),
          ];

          resultFiles.forEach((file) => {
            expect(existsSync(file), `Result variant file should exist: ${file}`).toBe(true);
          });

          // Test Planet result schemas
          const planetResultModule = await import(join(resultDir, 'Planet.result.ts'));
          Object.entries(planetResultModule).forEach(([name, schema]) => {
            if (name.includes('Result') && typeof schema === 'object' && 'parse' in schema) {
              expect(() => {
                const jsonSchema = z.toJSONSchema(schema as z.ZodSchema);
                expect(jsonSchema).toBeDefined();
              }, `Failed to convert ${name} to JSON Schema`).not.toThrow();
            }
          });

          // Test Post result schemas
          const postResultModule = await import(join(resultDir, 'Post.result.ts'));
          Object.entries(postResultModule).forEach(([name, schema]) => {
            if (name.includes('Result') && typeof schema === 'object' && 'parse' in schema) {
              expect(() => {
                const jsonSchema = z.toJSONSchema(schema as z.ZodSchema);
                expect(jsonSchema).toBeDefined();
              }, `Failed to convert ${name} to JSON Schema`).not.toThrow();
            }
          });

          // Test User result schemas
          const userResultModule = await import(join(resultDir, 'User.result.ts'));
          Object.entries(userResultModule).forEach(([name, schema]) => {
            if (name.includes('Result') && typeof schema === 'object' && 'parse' in schema) {
              expect(() => {
                const jsonSchema = z.toJSONSchema(schema as z.ZodSchema);
                expect(jsonSchema).toBeDefined();
              }, `Failed to convert ${name} to JSON Schema`).not.toThrow();
            }
          });

        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT
    );
  });

  describe('Comprehensive Integration Test', () => {
    it(
      'should generate all schema types with complete JSON Schema compatibility',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('json-schema-integration');
        
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            generateResultSchemas: true,
            jsonSchemaCompatible: true,
            jsonSchemaOptions: {
              dateTimeFormat: 'isoString',
              bigIntFormat: 'string',
              bytesFormat: 'base64String',
            },
            models: {
              Planet: { enabled: true },
              Post: { enabled: true },
              User: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

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
  output   = "./generated/schemas"
  config   = "${configPath}"
}

enum Role {
  USER
  ADMIN
}

model Planet {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id          Int      @id @default(autoincrement())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  title       String
  content     String?
  published   Boolean  @default(false)
  viewCount   Int      @default(0)
  author      User?    @relation(fields: [authorId], references: [id])
  authorId    Int?
  likes       BigInt   @default(0)
  bytes       Bytes?
}

model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique
  name     String?
  password String
  role     Role?
  posts    Post[]
  books    Json[]
}
`;

          writeFileSync(testEnv.schemaPath, schema);

          // Build and generate
          await testEnv.runGeneration();

          const testResults = {
            pureModels: 0,
            inputSchemas: 0,
            resultSchemas: 0,
            total: 0
          };

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants');

          // Test all pure models
          const pureDir = join(variantsDir, 'pure');
          const pureFiles = ['Planet.pure.ts', 'Post.pure.ts', 'User.pure.ts'];
          
          for (const file of pureFiles) {
            const filePath = join(pureDir, file);
            if (existsSync(filePath)) {
              const module = await import(filePath);
              const schemaName = file.replace('.pure.ts', 'ModelSchema');
              const schema = module[schemaName];
              if (schema) {
                z.toJSONSchema(schema);
                testResults.pureModels++;
                testResults.total++;
              }
            }
          }

          // Test all input variants
          const inputDir = join(variantsDir, 'input');
          const inputFiles = ['Planet.input.ts', 'Post.input.ts', 'User.input.ts'];
          
          for (const file of inputFiles) {
            const filePath = join(inputDir, file);
            if (existsSync(filePath)) {
              const module = await import(filePath);
              Object.entries(module).forEach(([name, schema]) => {
                if (name.includes('Input') && typeof schema === 'object' && 'parse' in schema) {
                  z.toJSONSchema(schema as z.ZodSchema);
                  testResults.inputSchemas++;
                  testResults.total++;
                }
              });
            }
          }

          // Test all result variants
          const resultDir = join(variantsDir, 'result');
          const resultFiles = ['Planet.result.ts', 'Post.result.ts', 'User.result.ts'];
          
          for (const file of resultFiles) {
            const filePath = join(resultDir, file);
            if (existsSync(filePath)) {
              const module = await import(filePath);
              Object.entries(module).forEach(([name, schema]) => {
                if (name.includes('Result') && typeof schema === 'object' && 'parse' in schema) {
                  z.toJSONSchema(schema as z.ZodSchema);
                  testResults.resultSchemas++;
                  testResults.total++;
                }
              });
            }
          }

          // Verify we tested a reasonable number of schemas
          expect(testResults.pureModels).toBeGreaterThan(0);
          expect(testResults.inputSchemas).toBeGreaterThan(0);
          expect(testResults.resultSchemas).toBeGreaterThan(0);
          expect(testResults.total).toBeGreaterThan(5);
          
          console.log(`✅ Successfully converted ${testResults.total} schemas to JSON Schema`);
          console.log(`   - Pure Models: ${testResults.pureModels}`);
          console.log(`   - Input Schemas: ${testResults.inputSchemas}`);
          console.log(`   - Result Schemas: ${testResults.resultSchemas}`);

        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT
    );
  });

  describe('JSON Schema Conversion Options', () => {
    it(
      'should work with different JSON Schema targets and conversion options',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('json-schema-conversion-options');
        
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            jsonSchemaCompatible: true,
            jsonSchemaOptions: {
              dateTimeFormat: 'isoString',
              bigIntFormat: 'string',
              bytesFormat: 'base64String',
              conversionOptions: {
                unrepresentable: 'any',
                cycles: 'throw',
                reused: 'inline',
              },
            },
            models: {
              Planet: { enabled: true },
              Post: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

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
  output   = "./generated/schemas"
  config   = "${configPath}"
}

model Planet {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id          Int      @id @default(autoincrement())
  createdAt   DateTime @default(now())
  title       String
  likes       BigInt   @default(0)
  bytes       Bytes?
}
`;

          writeFileSync(testEnv.schemaPath, schema);

          // Build and generate
          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants', 'pure');
          
          // Test different JSON Schema conversion options
          const planetModule = await import(join(variantsDir, 'Planet.pure.ts'));
          const PlanetModelSchema = planetModule.PlanetModelSchema;
          
          // Test with default config options (should be jsonSchema2020-12)
          expect(() => {
            const jsonSchema = z.toJSONSchema(PlanetModelSchema);
            expect(jsonSchema).toBeDefined();
            expect(jsonSchema.type).toBe('object');
          }).not.toThrow();

          // Test with different configuration options
          expect(() => {
            const jsonSchema = z.toJSONSchema(PlanetModelSchema, { 
              unrepresentable: 'any'
            });
            expect(jsonSchema).toBeDefined();
            expect(jsonSchema.type).toBe('object');
          }).not.toThrow();

          // Test with strict mode
          expect(() => {
            const jsonSchema = z.toJSONSchema(PlanetModelSchema, { 
              unrepresentable: 'any',
              reused: 'inline'
            });
            expect(jsonSchema).toBeDefined();
            expect(jsonSchema.type).toBe('object');
          }).not.toThrow();

          // Test with different unrepresentable handling
          const postModule = await import(join(variantsDir, 'Post.pure.ts'));
          const PostModelSchema = postModule.PostModelSchema;
          
          expect(() => {
            const jsonSchema = z.toJSONSchema(PostModelSchema, { 
              unrepresentable: 'any'
            });
            expect(jsonSchema).toBeDefined();
            expect(jsonSchema.properties).toBeDefined();
          }).not.toThrow();

        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT
    );
  });

  describe('Real-world Usage Scenarios', () => {
    it(
      'should generate schemas suitable for OpenAPI documentation',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('json-schema-openapi');
        
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            generateResultSchemas: true,
            jsonSchemaCompatible: true,
            jsonSchemaOptions: {
              dateTimeFormat: 'isoString',
              bigIntFormat: 'string',
              bytesFormat: 'base64String',
              conversionOptions: {
                unrepresentable: 'any',
                cycles: 'throw',
                reused: 'inline',
              },
            },
            models: {
              User: { enabled: true },
              Post: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

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
  output   = "./generated/schemas"
  config   = "${configPath}"
}

enum Role {
  USER
  ADMIN
}

model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique
  name     String?
  role     Role     @default(USER)
  createdAt DateTime @default(now())
  posts    Post[]
}

model Post {
  id          Int      @id @default(autoincrement())
  title       String
  content     String?
  published   Boolean  @default(false)
  createdAt   DateTime @default(now())
  author      User     @relation(fields: [authorId], references: [id])
  authorId    Int
  viewCount   BigInt   @default(0)
  metadata    Bytes?
}
`;

          writeFileSync(testEnv.schemaPath, schema);

          // Build and generate
          await testEnv.runGeneration();

          // Test pure models for API documentation
          const pureDir = join(testEnv.outputDir, 'schemas', 'variants', 'pure');
          const userModule = await import(join(pureDir, 'User.pure.ts'));
          const postModule = await import(join(pureDir, 'Post.pure.ts'));
          
          const UserModelSchema = userModule.UserModelSchema;
          const PostModelSchema = postModule.PostModelSchema;

          // Generate JSON schemas suitable for APIs
          const userJsonSchema = z.toJSONSchema(UserModelSchema, { 
            unrepresentable: 'any'
          });
          
          const postJsonSchema = z.toJSONSchema(PostModelSchema, { 
            unrepresentable: 'any'
          });

          // Verify JSON Schema compatibility for API use
          expect(userJsonSchema.type).toBe('object');
          expect(userJsonSchema.properties).toBeDefined();
          expect(userJsonSchema.properties.id).toBeDefined();
          expect(userJsonSchema.properties.email).toBeDefined();
          expect(userJsonSchema.properties.createdAt.type).toBe('string');

          expect(postJsonSchema.type).toBe('object');
          expect(postJsonSchema.properties).toBeDefined();
          expect(postJsonSchema.properties.viewCount.type).toBe('string'); // BigInt as string
          expect(postJsonSchema.properties.createdAt.type).toBe('string'); // DateTime as string

          // Test input schemas for API request validation
          const inputDir = join(testEnv.outputDir, 'schemas', 'variants', 'input');
          const userInputModule = await import(join(inputDir, 'User.input.ts'));
          
          // Find a create input schema
          const createInputSchema = Object.entries(userInputModule).find(([name]) => 
            name.includes('CreateInput') && !name.includes('Unchecked')
          )?.[1] as z.ZodSchema;

          if (createInputSchema) {
            const createInputJsonSchema = z.toJSONSchema(createInputSchema, {
              unrepresentable: 'any'
            });
            
            expect(createInputJsonSchema.type).toBe('object');
            expect(createInputJsonSchema.properties).toBeDefined();
          }

        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT
    );

    it(
      'should handle edge cases and error scenarios gracefully',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('json-schema-edge-cases');
        
        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            jsonSchemaCompatible: true,
            jsonSchemaOptions: {
              dateTimeFormat: 'isoString',
              bigIntFormat: 'string',
              bytesFormat: 'base64String',
            },
            models: {
              EdgeCaseModel: { enabled: true },
            },
          };

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));

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
  output   = "./generated/schemas"
  config   = "${configPath}"
}

model EdgeCaseModel {
  id              String    @id @default(uuid())
  requiredString  String
  optionalString  String?
  requiredDate    DateTime
  optionalDate    DateTime?
  requiredBigInt  BigInt
  optionalBigInt  BigInt?
  requiredBytes   Bytes
  optionalBytes   Bytes?
  jsonField       Json?
  arrayField      String[]
}
`;

          writeFileSync(testEnv.schemaPath, schema);

          // Build and generate
          await testEnv.runGeneration();

          const variantsDir = join(testEnv.outputDir, 'schemas', 'variants', 'pure');
          const edgeCaseFilePath = join(variantsDir, 'EdgeCaseModel.pure.ts');
          
          // Check if the file exists first
          expect(existsSync(edgeCaseFilePath), `EdgeCaseModel pure file should exist: ${edgeCaseFilePath}`).toBe(true);
          
          const edgeCaseModule = await import(edgeCaseFilePath);
          const EdgeCaseModelSchema = edgeCaseModule.EdgeCaseModelModelSchema;
          
          expect(EdgeCaseModelSchema).toBeDefined();

          // Test that all field types convert properly
          expect(() => {
            const jsonSchema = z.toJSONSchema(EdgeCaseModelSchema, {
              unrepresentable: 'any'
            });
            
            expect(jsonSchema.type).toBe('object');
            expect(jsonSchema.properties).toBeDefined();
            
            // Check required vs optional field handling
            const props = jsonSchema.properties;
            expect(props.requiredString.type).toBe('string');
            expect(props.requiredDate.type).toBe('string'); // DateTime as string
            expect(props.requiredBigInt.type).toBe('string'); // BigInt as string
            expect(props.requiredBytes.type).toBe('string'); // Bytes as string
            
            // Optional fields should handle null properly
            if (props.optionalString.anyOf) {
              expect(props.optionalString.anyOf).toContainEqual({ type: 'null' });
            }
            
          }).not.toThrow();

          // Test different conversion options
          expect(() => {
            z.toJSONSchema(EdgeCaseModelSchema, { unrepresentable: 'any' });
          }).not.toThrow();

          expect(() => {
            z.toJSONSchema(EdgeCaseModelSchema, { 
              unrepresentable: 'any',
              reused: 'inline'
            });
          }).not.toThrow();

        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT
    );
  });
});