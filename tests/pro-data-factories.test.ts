import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
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

enum PostState {
  DRAFT
  PUBLISHED
}

model Post {
  id       String    @id @default(cuid())
  title    String
  state    PostState @default(DRAFT)
  author   Author    @relation(fields: [authorId], references: [id])
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

  it('gives an enum column a real member rather than null', () => {
    // Enum fields fell through to `null`, which contradicts the generated <Model>Shape — it types
    // the column as a string — and is rejected outright by prisma.create() for a non-nullable
    // column. So `build()` produced an object that could not be persisted. This fixture had no
    // enum in it until using the pack on a real schema turned it up.
    expect(source).toMatch(/state:\s*'DRAFT'|state:\s*"DRAFT"/);
    expect(source).not.toMatch(/state:\s*null/);
  });

  it('respects a model excluded in the generator config', async () => {
    // Same gap as the Performance Pack: this pack parses the schema itself, so it
    // bypassed the `models` exclusion the other packs honour.
    const { generateDataFactories } = await import(
      '../src/pro/features/data-factories/data-factories'
    );
    const outputPath = join(dir, 'excluded');

    await generateDataFactories(join(dir, 'schema.prisma'), {
      outputPath,
      models: { Post: { enabled: false } },
    });

    const emitted = readFileSync(join(outputPath, 'factories.ts'), 'utf-8');
    expect(emitted).toContain('AuthorFactory');
    expect(emitted).not.toContain('PostFactory');
  });

  describe('options that produced output nobody could compile', () => {
    /**
     * Found by generating every documented value of every option and type-checking each result.
     * `generateFixtures: false` and `generateFactories: false` left seeders.ts and test-helpers.ts
     * importing `./fixtures` and `./factories`, which were never written (TS2307), and
     * `locale: 'de'` emitted providers.ts indexing a hardcoded `{ en, es, fr }` map (TS7053).
     * All three are documented options, and all three produced output that does not compile.
     */
    async function generateWith(label: string, config: Record<string, unknown>) {
      const logged: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      };

      const outputPath = join(dir, label);
      try {
        const { generateDataFactories } = await import(
          '../src/pro/features/data-factories/data-factories'
        );
        await generateDataFactories(join(dir, 'schema.prisma'), { outputPath, ...config });
      } finally {
        console.log = origLog;
      }

      return { outputPath, output: logged.join('\n') };
    }

    /**
     * Relative imports with no matching emitted module, resolved the way TypeScript does: a
     * specifier may name a sibling file or a directory carrying an index.
     */
    function unresolved(outputPath: string): string[] {
      const entries = readdirSync(outputPath, { withFileTypes: true });
      const modules = new Set<string>();
      for (const entry of entries) {
        if (entry.isDirectory() && existsSync(join(outputPath, entry.name, 'index.ts'))) {
          modules.add(entry.name);
        } else if (entry.name.endsWith('.ts')) {
          modules.add(entry.name.replace(/\.ts$/, ''));
        }
      }

      const missing: string[] = [];
      for (const entry of entries.filter((e) => e.isFile() && e.name.endsWith('.ts'))) {
        const source = readFileSync(join(outputPath, entry.name), 'utf-8');
        for (const match of source.matchAll(/from '\.\/([^']+)'/g)) {
          const target = match[1].replace(/\.js$/, '');
          if (!modules.has(target)) missing.push(`${entry.name} -> ./${target}`);
        }
      }
      return missing;
    }

    it('resolves every import by default', async () => {
      const { outputPath } = await generateWith('imports-default', {});
      expect(unresolved(outputPath)).toEqual([]);
    });

    it('resolves every import with fixtures disabled', async () => {
      const { outputPath } = await generateWith('no-fixtures', { generateFixtures: false });
      expect(unresolved(outputPath)).toEqual([]);
    });

    it('resolves every import with factories disabled', async () => {
      const { outputPath } = await generateWith('no-factories', { generateFactories: false });
      expect(unresolved(outputPath)).toEqual([]);
    });

    it('falls back to a locale it has data for, and says so', async () => {
      const { outputPath, output } = await generateWith('locale-de', { locale: 'de' });

      expect(output).toMatch(/locale/i);
      // providers.ts must not index its data map with a key the map does not have.
      const providers = readFileSync(join(outputPath, 'providers.ts'), 'utf-8');
      const localeKeys = [...providers.matchAll(/locales\[['"]([a-z-]+)['"]\]/g)].map((m) => m[1]);
      for (const key of localeKeys) expect(['en', 'es', 'fr']).toContain(key);
    });
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

  /**
   * The pack advertises "Type-Safe: follows your Prisma schema exactly", but every
   * factory was `implements Factory<any>` with `Partial<any>` overrides and
   * `Promise<any>` results — so nothing about a build() call was checked, and a
   * typo in an override compiled happily.
   */
  describe('typing', () => {
    it('declares a shape type per model', () => {
      expect(source).toMatch(/export interface AuthorShape\b/);
      expect(source).toMatch(/export interface PostShape\b/);
    });

    it('parameterises the factory on that shape rather than any', () => {
      expect(source).toContain('implements Factory<AuthorShape>');
      expect(source).not.toContain('implements Factory<any>');
    });

    it('types build and its overrides', () => {
      expect(source).toMatch(/build\(overrides: Partial<AuthorShape> = \{\}\): AuthorShape/);
      expect(source).not.toContain('overrides: Partial<any>');
    });

    it('gives the shape a field for each scalar column', () => {
      const block = source.slice(
        source.indexOf('export interface AuthorShape'),
        source.indexOf('}', source.indexOf('export interface AuthorShape')),
      );

      expect(block).toContain('id');
      expect(block).toContain('name');
    });
  });
});
