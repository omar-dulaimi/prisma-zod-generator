import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

const PRO_FACTORIES = join(
  __dirname,
  '..',
  'src',
  'pro',
  'features',
  'data-factories',
  'data-factories.ts',
);
const proAvailable = existsSync(PRO_FACTORIES);

const SCHEMA = `
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model Author {
  id    String @id @default(cuid())
  name  String
  posts Post[]
}

model Post {
  id       String @id @default(cuid())
  title    String
  author   Author @relation(fields: [authorId], references: [id])
  authorId String
}
`;

/**
 * `create()` and `createMany()` are documented as persisting. Without the
 * undocumented `setPrismaClient()` they warned and returned the built object with
 * a random integer id — so a seeder ran to completion, printed nothing alarming,
 * and wrote no rows. Silently succeeding at nothing is worse than refusing.
 *
 * Relation foreign keys were also filled with prose: `authorId` got a generated
 * sentence rather than anything that could match a real row.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Data Factories persistence', () => {
  let dir: string;
  let source: string;
  const savedDevMode = process.env.PZG_DEV_MODE;

  beforeAll(async () => {
    process.env.PZG_DEV_MODE = 'true';
    dir = mkdtempSync(join(tmpdir(), 'pzg-factories-'));

    const { generateDataFactories } = await import(
      '../src/pro/features/data-factories/data-factories'
    );

    // The pack takes (schemaPath, options) and reads the schema itself, so the
    // file has to exist — it previously ignored the path entirely.
    const schemaPath = join(dir, 'schema.prisma');
    writeFileSync(schemaPath, SCHEMA);

    await generateDataFactories(schemaPath, { outputPath: join(dir, 'factories') });

    source = readFileSync(join(dir, 'factories', 'factories.ts'), 'utf-8');
  }, GENERATION_TIMEOUT);

  afterAll(() => {
    if (savedDevMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = savedDevMode;
    rmSync(dir, { recursive: true, force: true });
  });

  it('generates factories for the models in the schema', () => {
    // The pack shipped a hardcoded sample schema (User/Post/Comment/Organization)
    // and ignored the file it was given, so a customer got factories for models
    // they do not have and none for the models they do.
    const emitted = [...source.matchAll(/export class (\w+)Factory/g)].map((match) => match[1]);

    expect(emitted).toContain('Author');
    expect(emitted).toContain('Post');
    expect(emitted).not.toContain('Comment');
    expect(emitted).not.toContain('Organization');
  });

  it('refuses to pretend a create succeeded without a client', () => {
    // Returning `{ ...data, id: random }` made an unpersisted object look saved.
    expect(source).not.toMatch(/id:\s*Math\.floor\(Math\.random\(\)/);
    expect(source).toMatch(/throw new Error\([^)]*setPrismaClient/);
  });

  it('leaves a relation foreign key unset rather than inventing prose', () => {
    // `authorId: generate.sentence(2)` can never match a real Author row.
    const authorIdLine = source.split('\n').find((line) => line.includes('authorId:')) ?? '';
    expect(authorIdLine).not.toMatch(/sentence|paragraph|words/);
  });

  it('documents that a client is required for persistence', () => {
    expect(source).toMatch(/setPrismaClient/);
  });
});
