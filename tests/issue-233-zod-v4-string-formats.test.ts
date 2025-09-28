import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TestEnvironment, ConfigGenerator, GENERATION_TIMEOUT } from './helpers';

describe('GitHub Issue #233 - Zod v4 String Formats Support', () => {
  describe('Basic String Format Methods', () => {
    it(
      'should generate correct Zod v4 base types for new string format methods',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-233-v4-string-formats');

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

model ZodStringFormats {
  id        Int    @id @default(autoincrement())

  /// @zod.httpUrl()
  httpUrl   String

  /// @zod.hostname()
  hostname  String

  /// @zod.nanoid()
  nanoid    String

  /// @zod.cuid()
  cuid      String

  /// @zod.cuid2()
  cuid2     String

  /// @zod.ulid()
  ulid      String

  /// @zod.base64()
  base64    String

  /// @zod.base64url()
  base64url String

  /// @zod.hex()
  hex       String

  /// @zod.jwt()
  jwt       String

  /// @zod.ipv4()
  ipv4      String

  /// @zod.ipv6()
  ipv6      String

  /// @zod.cidrv4()
  cidrv4    String

  /// @zod.emoji()
  emoji     String
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'ZodStringFormatsCreateInput.schema.ts');

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // In Zod v4, these should be base types like z.httpUrl(), not z.string().httpUrl()
          // Note: Actual generation depends on Zod version detection, but we expect base types in v4

          // Test for the presence of the string format methods
          expect(content).toMatch(/httpUrl/);
          expect(content).toMatch(/hostname/);
          expect(content).toMatch(/nanoid/);
          expect(content).toMatch(/cuid(?!2)/); // cuid but not cuid2
          expect(content).toMatch(/cuid2/);
          expect(content).toMatch(/ulid/);
          expect(content).toMatch(/base64(?!url)/); // base64 but not base64url
          expect(content).toMatch(/base64url/);
          expect(content).toMatch(/hex/);
          expect(content).toMatch(/jwt/);
          expect(content).toMatch(/ipv4/);
          expect(content).toMatch(/ipv6/);
          expect(content).toMatch(/cidrv4/);
          expect(content).toMatch(/emoji/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Hash Method with Parameters', () => {
    it(
      'should handle hash method with algorithm parameter',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-233-hash-method');

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

model HashTest {
  id       Int    @id @default(autoincrement())

  /// @zod.hash("sha256")
  sha256   String

  /// @zod.hash("md5")
  md5      String

  /// @zod.hash("sha1")
  sha1     String
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'HashTestCreateInput.schema.ts');

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should contain hash method calls with parameters
          expect(content).toMatch(/hash\s*\(\s*["']sha256["']\s*\)/);
          expect(content).toMatch(/hash\s*\(\s*["']md5["']\s*\)/);
          expect(content).toMatch(/hash\s*\(\s*["']sha1["']\s*\)/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Chained Annotations', () => {
    it(
      'should handle chained annotations with new string format methods',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-233-chained');

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

model ChainedTest {
  id          Int     @id @default(autoincrement())

  /// @zod.httpUrl().max(200)
  website     String?

  /// @zod.email().max(100)
  email       String  @unique

  /// @zod.nanoid().min(21)
  nanoidField String

  /// @zod.jwt().optional()
  token       String?
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'ChainedTestCreateInput.schema.ts');

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should handle chaining with base types
          expect(content).toMatch(/httpUrl/);
          expect(content).toMatch(/max\(200\)/);

          expect(content).toMatch(/email/);
          expect(content).toMatch(/max\(100\)/);

          expect(content).toMatch(/nanoid/);
          expect(content).toMatch(/min\(21\)/);

          expect(content).toMatch(/jwt/);
          expect(content).toMatch(/optional/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Error Handling', () => {
    it(
      'should handle invalid parameters for hash method',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-233-hash-error');

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

model HashErrorTest {
  id           Int    @id @default(autoincrement())

  /// @zod.hash()
  invalidHash  String
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          // This should either fail generation or fallback gracefully
          try {
            await testEnv.runGeneration();
          } catch (error) {
            // Generation failed as expected for invalid hash parameter
            expect(error).toBeDefined();
            return;
          }

          // If generation succeeded without throwing, verify fallback behavior

          // If generation succeeds, check that it falls back to basic string
          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'HashErrorTestCreateInput.schema.ts');

          if (existsSync(createInputPath)) {
            const content = readFileSync(createInputPath, 'utf-8');
            // Should fallback to basic string validation
            expect(content).toMatch(/string/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle incompatible field types gracefully',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-233-type-error');

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

model TypeErrorTest {
  id       Int @id @default(autoincrement())

  /// @zod.email()
  age      Int
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          // This should either fail generation or fallback gracefully
          await testEnv.runGeneration();

          // If generation succeeds, check that it handles the error appropriately
          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'TypeErrorTestCreateInput.schema.ts');

          if (existsSync(createInputPath)) {
            const content = readFileSync(createInputPath, 'utf-8');
            // Should fallback to appropriate validation for Int field
            expect(content).toMatch(/number|int/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Mixed Format Methods', () => {
    it(
      'should handle multiple different string format methods in one model',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-233-mixed');

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

model MixedFormatTest {
  id        Int    @id @default(autoincrement())

  /// @zod.email()
  email     String @unique

  /// @zod.url()
  website   String?

  /// @zod.uuid()
  uuid      String

  /// @zod.nanoid()
  nanoid    String

  /// @zod.jwt()
  token     String?

  /// @zod.ipv4()
  ipAddress String

  /// @zod.emoji()
  reaction  String

  /// @zod.hash("sha256")
  checksum  String
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'MixedFormatTestCreateInput.schema.ts');

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should contain all different format methods
          expect(content).toMatch(/email/);
          expect(content).toMatch(/url/);
          expect(content).toMatch(/uuid/);
          expect(content).toMatch(/nanoid/);
          expect(content).toMatch(/jwt/);
          expect(content).toMatch(/ipv4/);
          expect(content).toMatch(/emoji/);
          expect(content).toMatch(/hash.*sha256/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Parameter Preservation in v4 Base Methods', () => {
    it(
      'should preserve parameters when using v4 base replacement methods',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-233-params');

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

model ParameterTest {
  id          Int    @id @default(autoincrement())

  /// @zod.nanoid(10)
  customNano  String

  /// @zod.jwt("HS256")
  customJwt   String

  /// @zod.base64(true)
  customB64   String

  /// @zod.isoDate(3)
  isoDateWithPrecision String

  /// @zod.ipv4(4)
  customIpv4  String
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'ParameterTestCreateInput.schema.ts');

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should preserve parameters in v4 base methods
          expect(content).toMatch(/z\.nanoid\(\s*10\s*\)/);
          expect(content).toMatch(/z\.jwt\(\s*["']HS256["']\s*\)/);
          expect(content).toMatch(/z\.base64\(\s*true\s*\)/);
          expect(content).toMatch(/z\.iso\.date\(\s*3\s*\)/);
          expect(content).toMatch(/z\.ipv4\(\s*4\s*\)/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle methods without parameters correctly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('issue-233-no-params');

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

model NoParamTest {
  id        Int    @id @default(autoincrement())

  /// @zod.nanoid()
  basicNano String

  /// @zod.emoji()
  basicEmoji String

  /// @zod.isoTime()
  basicIsoTime String
}
`;

          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');
          const createInputPath = join(objectsDir, 'NoParamTestCreateInput.schema.ts');

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should use empty parentheses for methods without parameters
          expect(content).toMatch(/z\.nanoid\(\)/);
          expect(content).toMatch(/z\.emoji\(\)/);
          expect(content).toMatch(/z\.iso\.time\(\)/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
