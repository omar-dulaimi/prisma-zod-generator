import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

/**
 * A model carrying `@@id([a, b])` and `@@unique([a, b])` over the same ordered field
 * pair emitted `a_b` twice in `<Model>WhereUniqueInput`, so the whole generated tree
 * stopped typechecking with TS1117 "An object literal cannot have multiple properties
 * with the same name". Shipped in 3.0.0 and 3.0.1; nothing to do with typedJson.
 *
 * Prisma is the source of the duplicate: it emits one selector per unique constraint,
 * and `RegistryWhereUniqueInput.fields` really does list `tenant_value` twice, with
 * `constraints.fields` listing it twice too.
 *
 * The two entries can never legitimately differ, and the controls below are the proof
 * rather than an assertion of faith. A selector is named `name ?? fields.join('_')` and
 * its compound input type is `<Model><Pascal(name ?? fields)>CompoundUniqueInput`, both
 * derived from the same pair, so equal selector names force equal types. Two constraints
 * can only produce the same name by both omitting `name` and listing the same fields in
 * the same order, because Prisma rejects a repeated explicit `name` outright (P1012,
 * "The given custom name `x` has to be unique on the model"). `NamedPk` and `Reversed`
 * below are the two ways to be near-identical and still keep distinct selectors, and
 * both must keep two keys.
 */

const REPO_ROOT = join(__dirname, '..');
const root = join(REPO_ROOT, `test-env-compound-unique-${process.pid}`);
const objects = join(root, 'generated', 'schemas', 'objects');

const SCHEMA_BODY = `
/// The collision: @@id and @@unique over the same ordered pair.
model Registry {
  tenant String
  value  String

  @@id([tenant, value])
  @@unique([tenant, value])
}

/// The same collision reached through a mapped duplicate unique.
model MappedDup {
  a String
  b String

  @@id([a, b])
  @@unique([a, b], map: "mapped_dup_alt")
}

/// Two uniques over one pair, neither of them the primary key.
model TwoUniques {
  id String @id
  b  String
  c  String

  @@unique([b, c])
  @@unique([b, c], map: "two_uniques_alt")
}

/// The duplicate is not adjacent: Prisma orders these fields a_b, a_b_c, a_b, so a
/// dedupe that kept the LAST occurrence would silently reorder the surviving keys.
model Superset {
  a String
  b String
  c String

  @@id([a, b])
  @@unique([a, b])
  @@unique([a, b, c])
}

/// Compound primary key only. No collision: must not move.
model Ledger {
  book  String
  entry String
  memo  String?

  @@id([book, entry])
}

/// Compound unique only. No collision: must not move.
model Book {
  isbn    String
  edition Int
  title   String

  @@unique([isbn, edition])
}

/// Same field pair twice, but the @@id carries an explicit name, so the two
/// selectors are named differently and both are real. Must keep both keys.
model NamedPk {
  a String
  b String

  @@id([a, b], name: "pk")
  @@unique([a, b])
}

/// Same two fields in the opposite order: two distinct selectors, two distinct
/// compound types. Must keep both keys.
model Reversed {
  a String
  b String

  @@id([a, b])
  @@unique([b, a])
}

/// A scalar that is both @id and @unique. Prisma lists "slug" twice in
/// constraints.fields but only once in fields, so it was never broken; it is here
/// so a dedupe keyed off constraints.fields cannot pass by accident.
model Tag {
  slug String @id @unique
  name String
}

model Plain {
  id   Int    @id @default(autoincrement())
  name String
}
`;

/** Keys of the top-level `z.object({ ... })` literal, in emission order, duplicates kept. */
function objectKeys(schemaFile: string): string[] {
  const content = readFileSync(join(objects, schemaFile), 'utf-8');
  const body = content.match(/z\.object\(\{([\s\S]*?)\n\}\)/);
  if (!body) throw new Error(`no z.object literal in ${schemaFile}:\n${content}`);
  return [...body[1].matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
}

function compile(): string {
  writeFileSync(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'es2022',
        module: 'preserve',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
        types: ['node'],
        typeRoots: [join(REPO_ROOT, 'node_modules', '@types')],
      },
      include: ['generated/**/*.ts'],
    }),
  );

  try {
    execFileSync(
      join(REPO_ROOT, 'node_modules', '.bin', 'tsc'),
      ['-p', join(root, 'tsconfig.json')],
      {
        encoding: 'utf-8',
        stdio: 'pipe',
      },
    );
    return '';
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    const output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    const lines = output.split('\n').filter((line) => line.includes('error TS'));
    return `${lines.length} type error(s):\n${lines.slice(0, 8).join('\n')}`;
  }
}

beforeAll(() => {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });

  writeFileSync(
    join(root, 'schema.prisma'),
    `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
  output   = "./client"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}
${SCHEMA_BODY}`,
  );

  writeFileSync(
    join(root, 'prisma.config.mjs'),
    `import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: '${join(root, 'schema.prisma')}',
  datasource: { url: 'postgresql://postgres:postgres@localhost:5432/postgres' },
});
`,
  );

  execFileSync(
    join(REPO_ROOT, 'node_modules', '.bin', 'prisma'),
    ['generate', '--config', join(root, 'prisma.config.mjs')],
    { cwd: REPO_ROOT, encoding: 'utf-8', stdio: 'pipe' },
  );
}, GENERATION_TIMEOUT);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('WhereUniqueInput compound selector collisions', () => {
  it('emits one key per selector when @@id and @@unique cover the same field pair', () => {
    expect(objectKeys('RegistryWhereUniqueInput.schema.ts')).toEqual(['tenant_value']);
  });

  it('collapses a mapped duplicate unique onto the same single selector', () => {
    expect(objectKeys('MappedDupWhereUniqueInput.schema.ts')).toEqual(['a_b']);
  });

  it('collapses two uniques over one pair when neither is the primary key', () => {
    expect(objectKeys('TwoUniquesWhereUniqueInput.schema.ts')).toEqual(['id', 'b_c']);
  });

  it('keeps the surviving keys in their original order when the duplicate is not adjacent', () => {
    expect(objectKeys('SupersetWhereUniqueInput.schema.ts')).toEqual(['a_b', 'a_b_c']);
  });

  it('leaves a lone compound primary key alone', () => {
    expect(objectKeys('LedgerWhereUniqueInput.schema.ts')).toEqual(['book_entry']);
  });

  it('leaves a lone compound unique alone', () => {
    expect(objectKeys('BookWhereUniqueInput.schema.ts')).toEqual(['isbn_edition']);
  });

  it('keeps both selectors when an explicit @@id name makes them distinct', () => {
    // Not a collision: `pk` and `a_b` are two different ways to address the row, and
    // Prisma emits a distinct compound type for each. The order is the one HEAD already
    // emits (DMMF field order, which is not `constraints.fields` order), pinned so the
    // dedupe cannot reorder anything either.
    expect(objectKeys('NamedPkWhereUniqueInput.schema.ts')).toEqual(['a_b', 'pk']);
  });

  it('keeps both selectors when the same fields appear in a different order', () => {
    expect(objectKeys('ReversedWhereUniqueInput.schema.ts')).toEqual(['b_a', 'a_b']);
  });

  it('keeps a scalar that is both @id and @unique exactly once', () => {
    expect(objectKeys('TagWhereUniqueInput.schema.ts')).toEqual(['slug']);
  });

  it(
    'produces a tree that typechecks',
    () => {
      expect(compile()).toBe('');
    },
    GENERATION_TIMEOUT,
  );

  it('emits a working selector schema, not just a syntactically valid one', async () => {
    type Parser = { safeParse: (v: unknown) => { success: boolean } };
    const mod = (await import(join(objects, 'RegistryWhereUniqueInput.schema.ts'))) as Record<
      string,
      Parser
    >;
    const schema = mod.RegistryWhereUniqueInputObjectZodSchema;

    expect(schema.safeParse({ tenant_value: { tenant: 'acme', value: 'x' } }).success).toBe(true);
    // The compound member is itself validated, not accepted as any object.
    expect(schema.safeParse({ tenant_value: { tenant: 'acme' } }).success).toBe(false);
    // .strict() still rejects anything outside the selector set.
    expect(schema.safeParse({ tenant: 'acme', value: 'x' }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(true);
  });
});
