import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Issue #118: Output Directory Structure', () => {
  const testOutputDir = path.join(__dirname, '..', 'test-output-issue-118');
  const schemasSubdir = path.join(testOutputDir, 'schemas');
  const tempSchemaPath = path.join(__dirname, '..', 'temp-schema-118.prisma');

  beforeAll(async () => {
    // Clean up any existing test output
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist, ignore
    }

    // Create a temporary schema file for testing with output pointing to a "schemas" subdirectory
    const testSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${schemasSubdir}"
}

model TestUser {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts TestPost[]
}

model TestPost {
  id      Int       @id @default(autoincrement())
  title   String
  content String?
  author  TestUser? @relation(fields: [authorId], references: [id])
  authorId Int?
}
`;

    await fs.writeFile(tempSchemaPath, testSchema);
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
      await fs.rm(tempSchemaPath, { force: true });
    } catch {
      // Files might not exist, ignore
    }
  });

  it('should generate schemas directly in the specified output directory, not in a nested schemas/ folder', async () => {
    // Build the generator first
    await execAsync('tsc', { cwd: path.join(__dirname, '..') });

    // Run prisma generate with our test schema
    await execAsync(`npx prisma generate --schema="${tempSchemaPath}"`, {
      cwd: path.join(__dirname, '..'),
    });

    // Verify the directory structure
    const schemasExists = await fs
      .access(schemasSubdir)
      .then(() => true)
      .catch(() => false);
    expect(schemasExists, 'Schemas directory should exist').toBe(true);

    // The problematic behavior: schemas should NOT be nested in another schemas/ folder
    const nestedSchemasPath = path.join(schemasSubdir, 'schemas');
    const nestedSchemasExists = await fs
      .access(nestedSchemasPath)
      .then(() => true)
      .catch(() => false);
    expect(nestedSchemasExists, 'Should NOT create nested schemas/schemas/ directory').toBe(false);

    // Verify schemas are directly in the specified output directory
    const expectedFiles = ['index.ts', 'enums', 'objects'];

    for (const expectedItem of expectedFiles) {
      const itemPath = path.join(schemasSubdir, expectedItem);
      const exists = await fs
        .access(itemPath)
        .then(() => true)
        .catch(() => false);
      expect(exists, `${expectedItem} should exist directly in the output directory`).toBe(true);
    }

    // Verify some actual schema files exist in the expected locations
    const enumsDir = path.join(schemasSubdir, 'enums');
    const objectsDir = path.join(schemasSubdir, 'objects');

    const enumsExists = await fs
      .access(enumsDir)
      .then(() => true)
      .catch(() => false);
    const objectsExists = await fs
      .access(objectsDir)
      .then(() => true)
      .catch(() => false);

    expect(enumsExists, 'enums directory should exist').toBe(true);
    expect(objectsExists, 'objects directory should exist').toBe(true);

    // Check for some generated schema files
    const sampleFiles = [
      path.join(schemasSubdir, 'findManyTestUser.schema.ts'),
      path.join(schemasSubdir, 'createOneTestPost.schema.ts'),
    ];

    for (const sampleFile of sampleFiles) {
      const exists = await fs
        .access(sampleFile)
        .then(() => true)
        .catch(() => false);
      expect(exists, `${path.basename(sampleFile)} should exist in the output directory`).toBe(
        true,
      );
    }
  });

  it('should work correctly when output directory does not end with "schemas"', async () => {
    const regularOutputDir = path.join(testOutputDir, 'regular-output');

    const testSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${regularOutputDir}"
}

model TestUser {
  id    Int     @id @default(autoincrement())
  email String  @unique
}
`;

    const tempSchemaPath2 = path.join(__dirname, '..', 'temp-schema-118-regular.prisma');
    await fs.writeFile(tempSchemaPath2, testSchema);

    try {
      // Run prisma generate with regular output directory
      await execAsync(`npx prisma generate --schema="${tempSchemaPath2}"`, {
        cwd: path.join(__dirname, '..'),
      });

      // For regular output (not ending with 'schemas'), it should create a schemas subdirectory
      const schemasPath = path.join(regularOutputDir, 'schemas');
      const schemasExists = await fs
        .access(schemasPath)
        .then(() => true)
        .catch(() => false);
      expect(
        schemasExists,
        'schemas subdirectory should exist when output does not end with "schemas"',
      ).toBe(true);

      // Verify files are in the schemas subdirectory
      const indexFile = path.join(schemasPath, 'index.ts');
      const indexExists = await fs
        .access(indexFile)
        .then(() => true)
        .catch(() => false);
      expect(indexExists, 'index.ts should exist in schemas subdirectory').toBe(true);
    } finally {
      await fs.rm(tempSchemaPath2, { force: true });
    }
  });
});
