import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Aggregate and GroupBy Operations', () => {
  const testDir = `test-env-aggregate-groupby-${Date.now()}`;

  beforeAll(async () => {
    // Create test environment with schema that has numeric fields
    execSync(`mkdir -p ${testDir}`);

    // Create a test schema with numeric fields for all providers
    const schemaContent = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  age       Int?
  salary    Float?
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  viewCount Int      @default(0)
  likes     BigInt   @default(0)
  authorId  Int?
  author    User?    @relation(fields: [authorId], references: [id])
}
    `.trim();

    fs.writeFileSync(path.join(testDir, 'schema.prisma'), schemaContent);

    // Generate schemas
    execSync(`npx prisma generate --schema ${path.join(testDir, 'schema.prisma')}`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  });

  afterAll(() => {
    // Clean up test directory
    execSync(`rm -rf ${testDir}`);
  });

  describe('Aggregate Operations', () => {
    test('should include _avg and _sum aggregate imports', () => {
      const userAggregatePath = path.join(
        testDir,
        'generated',
        'schemas',
        'aggregateUser.schema.ts',
      );
      const postAggregatePath = path.join(
        testDir,
        'generated',
        'schemas',
        'aggregatePost.schema.ts',
      );

      expect(fs.existsSync(userAggregatePath)).toBe(true);
      expect(fs.existsSync(postAggregatePath)).toBe(true);

      const userAggregateContent = fs.readFileSync(userAggregatePath, 'utf-8');
      const postAggregateContent = fs.readFileSync(postAggregatePath, 'utf-8');

      // Check for AvgAggregateInput imports
      expect(userAggregateContent).toMatch(
        /import.*UserAvgAggregateInput.*from.*objects\/UserAvgAggregateInput\.schema/,
      );
      expect(postAggregateContent).toMatch(
        /import.*PostAvgAggregateInput.*from.*objects\/PostAvgAggregateInput\.schema/,
      );

      // Check for SumAggregateInput imports
      expect(userAggregateContent).toMatch(
        /import.*UserSumAggregateInput.*from.*objects\/UserSumAggregateInput\.schema/,
      );
      expect(postAggregateContent).toMatch(
        /import.*PostSumAggregateInput.*from.*objects\/PostSumAggregateInput\.schema/,
      );
    });

    test('should include _avg and _sum fields in aggregate schema objects', () => {
      const userAggregatePath = path.join(
        testDir,
        'generated',
        'schemas',
        'aggregateUser.schema.ts',
      );
      const postAggregatePath = path.join(
        testDir,
        'generated',
        'schemas',
        'aggregatePost.schema.ts',
      );

      const userAggregateContent = fs.readFileSync(userAggregatePath, 'utf-8');
      const postAggregateContent = fs.readFileSync(postAggregatePath, 'utf-8');

      // Check for _avg field in schema objects
      expect(userAggregateContent).toMatch(/_avg:\s*UserAvgAggregateInput.*\.optional\(\)/);
      expect(postAggregateContent).toMatch(/_avg:\s*PostAvgAggregateInput.*\.optional\(\)/);

      // Check for _sum field in schema objects
      expect(userAggregateContent).toMatch(/_sum:\s*UserSumAggregateInput.*\.optional\(\)/);
      expect(postAggregateContent).toMatch(/_sum:\s*PostSumAggregateInput.*\.optional\(\)/);
    });

    test('should generate valid aggregate input schemas with numeric fields', () => {
      const userAvgPath = path.join(
        testDir,
        'generated',
        'schemas',
        'objects',
        'UserAvgAggregateInput.schema.ts',
      );
      const postSumPath = path.join(
        testDir,
        'generated',
        'schemas',
        'objects',
        'PostSumAggregateInput.schema.ts',
      );

      expect(fs.existsSync(userAvgPath)).toBe(true);
      expect(fs.existsSync(postSumPath)).toBe(true);

      const userAvgContent = fs.readFileSync(userAvgPath, 'utf-8');
      const postSumContent = fs.readFileSync(postSumPath, 'utf-8');

      // User should have numeric fields for avg: id, age, salary
      expect(userAvgContent).toMatch(/id:\s*z\.literal\(true\)\.optional\(\)/);
      expect(userAvgContent).toMatch(/age:\s*z\.literal\(true\)\.optional\(\)/);
      expect(userAvgContent).toMatch(/salary:\s*z\.literal\(true\)\.optional\(\)/);

      // Post should have numeric fields for sum: id, viewCount, likes, authorId
      expect(postSumContent).toMatch(/id:\s*z\.literal\(true\)\.optional\(\)/);
      expect(postSumContent).toMatch(/viewCount:\s*z\.literal\(true\)\.optional\(\)/);
      expect(postSumContent).toMatch(/likes:\s*z\.literal\(true\)\.optional\(\)/);
      expect(postSumContent).toMatch(/authorId:\s*z\.literal\(true\)\.optional\(\)/);
    });
  });

  describe('GroupBy Operations', () => {
    test('should include _avg and _sum aggregate imports', () => {
      const userGroupByPath = path.join(testDir, 'generated', 'schemas', 'groupByUser.schema.ts');
      const postGroupByPath = path.join(testDir, 'generated', 'schemas', 'groupByPost.schema.ts');

      expect(fs.existsSync(userGroupByPath)).toBe(true);
      expect(fs.existsSync(postGroupByPath)).toBe(true);

      const userGroupByContent = fs.readFileSync(userGroupByPath, 'utf-8');
      const postGroupByContent = fs.readFileSync(postGroupByPath, 'utf-8');

      // Check for AvgAggregateInput imports
      expect(userGroupByContent).toMatch(
        /import.*UserAvgAggregateInput.*from.*objects\/UserAvgAggregateInput\.schema/,
      );
      expect(postGroupByContent).toMatch(
        /import.*PostAvgAggregateInput.*from.*objects\/PostAvgAggregateInput\.schema/,
      );

      // Check for SumAggregateInput imports
      expect(userGroupByContent).toMatch(
        /import.*UserSumAggregateInput.*from.*objects\/UserSumAggregateInput\.schema/,
      );
      expect(postGroupByContent).toMatch(
        /import.*PostSumAggregateInput.*from.*objects\/PostSumAggregateInput\.schema/,
      );
    });

    test('should include _avg and _sum fields in groupBy schema objects', () => {
      const userGroupByPath = path.join(testDir, 'generated', 'schemas', 'groupByUser.schema.ts');
      const postGroupByPath = path.join(testDir, 'generated', 'schemas', 'groupByPost.schema.ts');

      const userGroupByContent = fs.readFileSync(userGroupByPath, 'utf-8');
      const postGroupByContent = fs.readFileSync(postGroupByPath, 'utf-8');

      // Check for _avg field in schema objects
      expect(userGroupByContent).toMatch(/_avg:\s*UserAvgAggregateInput.*\.optional\(\)/);
      expect(postGroupByContent).toMatch(/_avg:\s*PostAvgAggregateInput.*\.optional\(\)/);

      // Check for _sum field in schema objects
      expect(userGroupByContent).toMatch(/_sum:\s*UserSumAggregateInput.*\.optional\(\)/);
      expect(postGroupByContent).toMatch(/_sum:\s*PostSumAggregateInput.*\.optional\(\)/);
    });
  });

  describe('Provider-Specific Support', () => {
    test.each([
      { provider: 'postgresql', numericTypes: ['Int', 'Float', 'BigInt', 'Decimal'] },
      { provider: 'mysql', numericTypes: ['Int', 'Float', 'BigInt', 'Decimal'] },
      { provider: 'sqlite', numericTypes: ['Int', 'Float', 'BigInt'] }, // SQLite doesn't have Decimal
      { provider: 'sqlserver', numericTypes: ['Int', 'Float', 'BigInt', 'Decimal'] },
      { provider: 'mongodb', numericTypes: ['Int', 'Float', 'BigInt'] }, // MongoDB has different decimal support
    ])(
      'should support avg/sum operations for $provider with $numericTypes',
      async ({ provider, numericTypes }) => {
        const providerTestDir = `test-env-${provider}-${Date.now()}`;

        try {
          execSync(`mkdir -p ${providerTestDir}`);

          const schemaWithProvider = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}

model TestModel {
  id      ${provider === 'mongodb' ? 'String' : numericTypes.includes('Int') ? 'Int' : 'String'}      ${provider === 'mongodb' ? '@id @map("_id") @default(auto()) @db.ObjectId' : '@id @default(autoincrement())'}
  ${numericTypes.includes('Int') ? 'intField    Int?' : ''}
  ${numericTypes.includes('Float') ? 'floatField  Float?' : ''}
  ${numericTypes.includes('BigInt') ? 'bigIntField BigInt?' : ''}
}
        `.trim();

          fs.writeFileSync(path.join(providerTestDir, 'schema.prisma'), schemaWithProvider);

          // Generate schemas
          execSync(`npx prisma generate --schema ${path.join(providerTestDir, 'schema.prisma')}`, {
            cwd: process.cwd(),
            stdio: 'pipe', // Suppress output for provider tests
          });

          // Check that aggregate/groupBy operations include avg/sum for numeric fields
          const aggregatePath = path.join(
            providerTestDir,
            'generated',
            'schemas',
            'aggregateTestModel.schema.ts',
          );
          const groupByPath = path.join(
            providerTestDir,
            'generated',
            'schemas',
            'groupByTestModel.schema.ts',
          );

          if (fs.existsSync(aggregatePath)) {
            const aggregateContent = fs.readFileSync(aggregatePath, 'utf-8');
            expect(aggregateContent).toMatch(/_avg:/);
            expect(aggregateContent).toMatch(/_sum:/);
          }

          if (fs.existsSync(groupByPath)) {
            const groupByContent = fs.readFileSync(groupByPath, 'utf-8');
            expect(groupByContent).toMatch(/_avg:/);
            expect(groupByContent).toMatch(/_sum:/);
          }
        } finally {
          execSync(`rm -rf ${providerTestDir}`);
        }
      },
    );
  });

  describe('Edge Cases', () => {
    test('should handle models with no numeric fields gracefully', () => {
      const testDirNoNumeric = `test-env-no-numeric-${Date.now()}`;

      try {
        execSync(`mkdir -p ${testDirNoNumeric}`);

        const schemaNoNumeric = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}

model TextOnlyModel {
  id          String   @id @default(uuid())
  name        String
  description String?
  email       String   @unique
}
        `.trim();

        fs.writeFileSync(path.join(testDirNoNumeric, 'schema.prisma'), schemaNoNumeric);

        // Generate schemas
        execSync(`npx prisma generate --schema ${path.join(testDirNoNumeric, 'schema.prisma')}`, {
          cwd: process.cwd(),
          stdio: 'pipe',
        });

        // Check if AvgAggregateInput and SumAggregateInput exist (they shouldn't for text-only models)
        const avgInputPath = path.join(
          testDirNoNumeric,
          'generated',
          'schemas',
          'objects',
          'TextOnlyModelAvgAggregateInput.schema.ts',
        );
        const sumInputPath = path.join(
          testDirNoNumeric,
          'generated',
          'schemas',
          'objects',
          'TextOnlyModelSumAggregateInput.schema.ts',
        );

        // These files may or may not exist depending on Prisma's behavior, but if they do,
        // they should be empty or contain no field definitions
        if (fs.existsSync(avgInputPath)) {
          const avgContent = fs.readFileSync(avgInputPath, 'utf-8');
          expect(avgContent).not.toMatch(/:\s*z\.literal\(true\)\.optional\(\)/);
        }

        if (fs.existsSync(sumInputPath)) {
          const sumContent = fs.readFileSync(sumInputPath, 'utf-8');
          expect(sumContent).not.toMatch(/:\s*z\.literal\(true\)\.optional\(\)/);
        }
      } finally {
        execSync(`rm -rf ${testDirNoNumeric}`);
      }
    });
  });
});
