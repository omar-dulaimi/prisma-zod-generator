import { writeFileSync } from 'fs';
import { join } from 'path';
import { ConfigGenerator, TestEnvironment } from './index';

/**
 * Generates the canonical User/Post object schemas used by behavioral tests.
 *
 * These tests used to import from a committed `prisma/generated` fixture. The
 * repository's development schema has since been reduced to a single model, so
 * that fixture no longer exists and the imports resolved to nothing. Generating
 * the fixture here keeps the assertions meaningful and makes the tests
 * independent of whatever the development schema happens to contain.
 */
export interface UserPostFixture {
  objectsDir: string;
  cleanup: () => Promise<void>;
  /** Dynamically import a generated object schema module by file base name. */
  load: <T = Record<string, unknown>>(fileBase: string) => Promise<T>;
}

const SCHEMA_MODELS = `
enum Role {
  USER
  ADMIN
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  name     String?
  password String
  role     Role?
  posts    Post[]
}

model Post {
  id        Int       @id @default(autoincrement())
  title     String
  content   String?
  published Boolean?
  viewCount Int?
  likes     BigInt
  bytes     Bytes?
  createdAt DateTime?
  updatedAt DateTime?
  author    User?     @relation(fields: [authorId], references: [id])
  authorId  Int?
}
`;

export async function createUserPostObjectsFixture(envName: string): Promise<UserPostFixture> {
  const testEnv = await TestEnvironment.createTestEnv(envName);
  const config = {
    ...ConfigGenerator.createBasicConfig(),
    // Select/Include schemas (and the <Model>Args objects that reference them)
    // are only emitted when these are on; the basic config turns them off.
    addSelectType: true,
    addIncludeType: true,
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
${SCHEMA_MODELS}`;

  writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
  writeFileSync(testEnv.schemaPath, schema);
  await testEnv.runGeneration();

  const objectsDir = join(testEnv.outputDir, 'schemas', 'objects');

  return {
    objectsDir,
    cleanup: () => testEnv.cleanup(),
    load: async <T = Record<string, unknown>>(fileBase: string): Promise<T> =>
      (await import(/* @vite-ignore */ join(objectsDir, `${fileBase}.schema.ts`))) as T,
  };
}
