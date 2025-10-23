import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('Decimal Input Schema Tests', () => {
  describe('Decimal mode: decimal (input schemas)', () => {
    it(
      'should generate union with Prisma.Decimal and helpers for CreateInput',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-input-createinput');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            decimalMode: 'decimal',
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Product {
  id     Int     @id @default(autoincrement())
  name   String
  price  Decimal
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const createInputPath = join(
            testEnv.outputDir,
            'schemas',
            'objects',
            'ProductCreateInput.schema.ts',
          );

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should have Prisma value import (not type-only)
          expect(content).toMatch(/import\s+{\s*Prisma\s+}\s+from/);
          expect(content).not.toMatch(/import\s+type\s+{\s*Prisma\s+}\s+from/);

          // Should import decimal helpers
          expect(content).toMatch(
            /import\s+{\s*DecimalJSLikeSchema,\s*isValidDecimalInput\s+}\s+from/,
          );
          expect(content).toMatch(/\/helpers\/decimal-helpers/);

          // Should have union with Decimal instanceof checks
          expect(content).toMatch(/z\.union\(\[/);
          // Decimal instanceof check is conditional based on decimal.js availability
          const hasDecimalJsImport = content.includes("import Decimal from 'decimal.js'");
          if (hasDecimalJsImport) {
            expect(content).toMatch(/z\.instanceof\(Decimal\)/);
          }
          expect(content).toMatch(/z\.instanceof\(Prisma\.Decimal\)/);
          expect(content).toMatch(/DecimalJSLikeSchema/);

          // Should have refine with validation function
          expect(content).toMatch(/\.refine\(\(v\)\s*=>\s*isValidDecimalInput\(v\)/);
          expect(content).toMatch(/message:.*must be a Decimal/i);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should work for UpdateInput schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-input-updateinput');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            decimalMode: 'decimal',
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Account {
  id       Int     @id @default(autoincrement())
  balance  Decimal
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const updateInputPath = join(
            testEnv.outputDir,
            'schemas',
            'objects',
            'AccountUpdateInput.schema.ts',
          );

          expect(existsSync(updateInputPath)).toBe(true);

          const content = readFileSync(updateInputPath, 'utf-8');

          // Should have Decimal support
          expect(content).toMatch(/import\s+{\s*Prisma\s+}\s+from/);
          expect(content).toMatch(/DecimalJSLikeSchema/);
          expect(content).toMatch(/isValidDecimalInput/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should conditionally import Decimal from decimal.js if available',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-input-decimal-js');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            decimalMode: 'decimal',
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Payment {
  id      Int     @id @default(autoincrement())
  amount  Decimal
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const createInputPath = join(
            testEnv.outputDir,
            'schemas',
            'objects',
            'PaymentCreateInput.schema.ts',
          );

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // If decimal.js is installed, should have the import
          // This is conditional based on whether decimal.js is in the project
          const hasDecimalJsImport = content.includes("import Decimal from 'decimal.js'");

          // Either way, should have Prisma.Decimal support
          expect(content).toMatch(/z\.instanceof\(Prisma\.Decimal\)/);

          // If decimal.js import exists, should also check for it in instanceof
          if (hasDecimalJsImport) {
            expect(content).toMatch(/z\.instanceof\(Decimal\)/);
          }
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Decimal mode: number (legacy)', () => {
    it(
      'should use z.number() for number mode in input schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-input-number-mode');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            decimalMode: 'number',
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Product {
  id     Int     @id @default(autoincrement())
  price  Decimal
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const createInputPath = join(
            testEnv.outputDir,
            'schemas',
            'objects',
            'ProductCreateInput.schema.ts',
          );

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should use z.number() for Decimal fields
          expect(content).toMatch(/price:\s*z\.number\(\)/);

          // Should NOT have decimal helpers
          expect(content).not.toMatch(/DecimalJSLikeSchema/);
          expect(content).not.toMatch(/isValidDecimalInput/);
          expect(content).not.toMatch(/instanceof\(Decimal\)/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Decimal mode: string', () => {
    it(
      'should use z.string() for string mode in input schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-input-string-mode');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            decimalMode: 'string',
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Product {
  id     Int     @id @default(autoincrement())
  price  Decimal
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const createInputPath = join(
            testEnv.outputDir,
            'schemas',
            'objects',
            'ProductCreateInput.schema.ts',
          );

          expect(existsSync(createInputPath)).toBe(true);

          const content = readFileSync(createInputPath, 'utf-8');

          // Should use z.string() for Decimal fields
          expect(content).toMatch(/price:\s*z\.string\(\)/);

          // Should NOT have decimal helpers
          expect(content).not.toMatch(/DecimalJSLikeSchema/);
          expect(content).not.toMatch(/isValidDecimalInput/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Helper file generation', () => {
    it(
      'should generate decimal-helpers.ts file in helpers directory',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-helpers-file');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            decimalMode: 'decimal',
          };

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Product {
  id     Int     @id @default(autoincrement())
  price  Decimal
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const helpersFilePath = join(
            testEnv.outputDir,
            'schemas',
            'helpers',
            'decimal-helpers.ts',
          );

          expect(existsSync(helpersFilePath)).toBe(true);

          const content = readFileSync(helpersFilePath, 'utf-8');

          // Should export helper schemas and functions
          expect(content).toMatch(/export const DecimalJSLikeSchema/);
          expect(content).toMatch(/export const DECIMAL_STRING_REGEX/);
          expect(content).toMatch(/export const isValidDecimalInput/);

          // Should have Prisma import
          expect(content).toMatch(/import\s+{\s*Prisma\s+}\s+from\s+['"]@prisma\/client['"]/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
