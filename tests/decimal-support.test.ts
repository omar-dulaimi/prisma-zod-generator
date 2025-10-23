import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

describe('Decimal Support Tests', () => {
  describe('Decimal Mode: decimal (zod-prisma-types compatible)', () => {
    it(
      'should generate Prisma.Decimal instanceof check for pure models',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-mode-pure-models');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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
  id          Int     @id @default(autoincrement())
  name        String
  price       Decimal @db.Decimal(10, 2)
  discount    Decimal? @db.Decimal(5, 2)
  weight      Decimal
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const productModelPath = join(modelsDir, 'Product.schema.ts');

          expect(existsSync(productModelPath)).toBe(true);

          const content = readFileSync(productModelPath, 'utf-8');

          // Should use instanceof(Prisma.Decimal) for pure models
          expect(content).toMatch(/price:\s*z\.instanceof\(Prisma\.Decimal/);
          expect(content).toMatch(/weight:\s*z\.instanceof\(Prisma\.Decimal/);

          // Should have custom error messages
          expect(content).toMatch(/Field 'price' must be a Decimal/);
          expect(content).toMatch(/Location: \['Models', 'Product'\]/);

          // Should have Prisma import (non-type import)
          expect(content).toMatch(/import\s+{\s*Prisma\s*}\s+from\s+['"]@prisma\/client['"]/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should handle nullable Decimal fields correctly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-nullable-fields');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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

model Transaction {
  id       Int      @id @default(autoincrement())
  amount   Decimal
  fee      Decimal?
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const transactionModelPath = join(modelsDir, 'Transaction.schema.ts');

          expect(existsSync(transactionModelPath)).toBe(true);

          const content = readFileSync(transactionModelPath, 'utf-8');

          // Required field should not have nullable/optional
          expect(content).toMatch(/amount:\s*z\.instanceof\(Prisma\.Decimal/);

          // Optional field should have .optional(), .nullable() or .nullish()
          expect(content).toMatch(
            /fee:\s*z\.instanceof\(Prisma\.Decimal[^)]*\)[^,]*\.(nullable|nullish|optional)\(\)/,
          );
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );

    it(
      'should generate correct imports for Decimal mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-imports');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const paymentModelPath = join(modelsDir, 'Payment.schema.ts');

          expect(existsSync(paymentModelPath)).toBe(true);

          const content = readFileSync(paymentModelPath, 'utf-8');

          // Should have Prisma import as non-type import (for instanceof check)
          expect(content).toMatch(/import\s+{\s*Prisma\s*}\s+from\s+['"]@prisma\/client['"]/);

          // Should NOT have type-only import for Prisma in decimal mode
          expect(content).not.toMatch(/import\s+type\s+{\s*Prisma\s*}\s+from/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Decimal Mode: number (legacy)', () => {
    it(
      'should generate z.number() for number mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-number-mode');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const productModelPath = join(modelsDir, 'Product.schema.ts');

          expect(existsSync(productModelPath)).toBe(true);

          const content = readFileSync(productModelPath, 'utf-8');

          // Should use z.number() for number mode
          expect(content).toMatch(/price:\s*z\.number\(\)/);

          // Should NOT use instanceof
          expect(content).not.toMatch(/instanceof\(Prisma\.Decimal\)/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Decimal Mode: string', () => {
    it(
      'should generate z.string() with regex for string mode',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-string-mode');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const productModelPath = join(modelsDir, 'Product.schema.ts');

          expect(existsSync(productModelPath)).toBe(true);

          const content = readFileSync(productModelPath, 'utf-8');

          // Should use z.string() with regex for string mode
          expect(content).toMatch(/price:\s*z\.string\(\)/);
          expect(content).toMatch(/\.regex\(/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Default Decimal Mode', () => {
    it(
      'should default to decimal mode when not specified',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-default-mode');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
            // decimalMode not specified, should default to 'decimal'
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

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const accountModelPath = join(modelsDir, 'Account.schema.ts');

          expect(existsSync(accountModelPath)).toBe(true);

          const content = readFileSync(accountModelPath, 'utf-8');

          // Should default to decimal mode (instanceof Prisma.Decimal)
          expect(content).toMatch(/balance:\s*z\.instanceof\(Prisma\.Decimal/);
          expect(content).toMatch(/import\s+{\s*Prisma\s*}\s+from\s+['"]@prisma\/client['"]/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Array Decimal Fields', () => {
    it(
      'should handle Decimal arrays correctly',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-arrays');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            pureModels: true,
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

model PriceHistory {
  id      Int       @id @default(autoincrement())
  prices  Decimal[]
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const modelsDir = join(testEnv.outputDir, 'schemas', 'models');
          const priceHistoryPath = join(modelsDir, 'PriceHistory.schema.ts');

          expect(existsSync(priceHistoryPath)).toBe(true);

          const content = readFileSync(priceHistoryPath, 'utf-8');

          // Should use array of Prisma.Decimal
          expect(content).toMatch(/prices:\s*z\.array\(z\.instanceof\(Prisma\.Decimal/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });

  describe('Variant Schemas', () => {
    it(
      'should emit Prisma import when Decimal is used in variant schemas',
      async () => {
        const testEnv = await TestEnvironment.createTestEnv('decimal-variants-import');

        try {
          const config = {
            ...ConfigGenerator.createBasicConfig(),
            decimalMode: 'decimal',
            variants: {
              pure: { enabled: true },
            },
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
  id    Int     @id @default(autoincrement())
  price Decimal
}
`;

          const configPath = join(testEnv.testDir, 'config.json');
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          writeFileSync(testEnv.schemaPath, schema);

          await testEnv.runGeneration();

          const variantPath = join(
            testEnv.outputDir,
            'schemas',
            'variants',
            'pure',
            'Product.pure.ts',
          );

          expect(existsSync(variantPath)).toBe(true);

          const content = readFileSync(variantPath, 'utf-8');

          // Should have Prisma value import (not type-only)
          expect(content).toMatch(/import\s+{\s*Prisma\s+}\s+from\s+['"]@prisma\/client['"]/);
          expect(content).not.toMatch(/import\s+type\s+{\s*Prisma\s+}\s+from/);

          // Should have instanceof(Prisma.Decimal)
          expect(content).toMatch(/z\.instanceof\(Prisma\.Decimal/);
        } finally {
          await testEnv.cleanup();
        }
      },
      GENERATION_TIMEOUT,
    );
  });
});
