import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

/**
 * A nullable column returns `null`, and every record-shaped result schema rejected it.
 *
 *   bio String?   ->   bio: z.string().optional()
 *
 * `.optional()` admits `undefined`, not `null`, so a row Prisma returns for the ordinary
 * state of a nullable column fails validation on READ. Measured on 3.0.1 across `String?`,
 * `Int?`, `Float?`, `DateTime?`, `Boolean?` and `Bytes?`; only `Json?` and enums escaped it,
 * and only because they map to `z.unknown()`, which takes anything.
 *
 * This is the widest of the result-schema defects, because nullable columns are ordinary.
 * It lands in all seven record-shaped schemas: FindUnique, FindFirst, FindMany, Create,
 * Update, Upsert and Delete.
 *
 * NOT changed here, deliberately: required columns stay required. `select: { name: true }`
 * does narrow a row, so strictly every column is optional, but a query with no `select`
 * returns them all and that is the common case. groupBy is the other way round - `by` is
 * mandatory and the maximal row is never returned - which is why tests/groupby-result-shape
 * makes grouped columns optional and this file does not.
 */

const REPO_ROOT = join(__dirname, '..');
const root = join(REPO_ROOT, `test-env-result-nullable-${process.pid}`);
const out = join(root, 'generated', 'schemas');

const SCHEMA_BODY = `
enum Colour {
  RED
  BLUE
}

model Person {
  id     Int       @id @default(autoincrement())
  name   String
  bio    String?
  age    Int?
  score  Float?
  born   DateTime?
  active Boolean?
  colour Colour?
  meta   Json?
  blob   Bytes?
  tags   String[]
}
`;

/** Every record-shaped result schema, all of which carry the model's columns. */
const RECORD_RESULTS = [
  'PersonFindUniqueResult',
  'PersonFindFirstResult',
  'PersonFindManyResult',
  'PersonCreateResult',
  'PersonUpdateResult',
  'PersonUpsertResult',
  'PersonDeleteResult',
];

const NULLABLE_COLUMNS = ['bio', 'age', 'score', 'born', 'active', 'blob'];

const read = (name: string) => readFileSync(join(out, 'results', `${name}.schema.ts`), 'utf-8');

function member(content: string, field: string): string {
  const line = content.split('\n').find((l) => l.trimStart().startsWith(`${field}:`));
  if (!line) throw new Error(`no member "${field}"`);
  return line.trim().replace(/,$/, '');
}

beforeAll(() => {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });

  writeFileSync(join(root, 'config.json'), JSON.stringify({}, null, 2));
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
  output   = "${out}"
  config   = "${join(root, 'config.json')}"
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

describe('a nullable column in a record-shaped result', () => {
  it('is nullable in every one of the seven schemas', () => {
    for (const name of RECORD_RESULTS) {
      const content = read(name);
      for (const field of NULLABLE_COLUMNS) {
        expect(member(content, field), `${name}.${field}`).toContain('.nullable()');
      }
    }
  });

  it('stays optional as well, so a narrowed select still parses', () => {
    const content = read('PersonFindUniqueResult');
    for (const field of NULLABLE_COLUMNS) {
      expect(member(content, field), field).toMatch(/\.optional\(\)$/);
    }
  });

  it('leaves required columns required', () => {
    const content = read('PersonFindUniqueResult');
    expect(member(content, 'id')).toBe('id: z.number().int()');
    expect(member(content, 'name')).toBe('name: z.string()');
    expect(member(content, 'tags')).toBe('tags: z.array(z.string())');
  });
});

describe('executed against a row Prisma returns', () => {
  it('accepts null in every nullable column and still rejects a wrong type', async () => {
    const mod = await import(join(out, 'results', 'PersonFindUniqueResult.schema.ts'));
    const schema = mod.PersonFindUniqueResultSchema as { parse: (v: unknown) => unknown };

    const base = { id: 1, name: 'a', tags: ['x'] };

    // The ordinary state of a nullable column.
    expect(() =>
      schema.parse({
        ...base,
        bio: null,
        age: null,
        score: null,
        born: null,
        active: null,
        colour: null,
        meta: null,
        blob: null,
      }),
    ).not.toThrow();

    // One at a time, so a single regression names the column.
    for (const field of NULLABLE_COLUMNS) {
      expect(() => schema.parse({ ...base, [field]: null }), field).not.toThrow();
    }

    // A populated row still parses.
    expect(() =>
      schema.parse({ ...base, bio: 'hi', age: 3, score: 1.5, born: new Date(), active: true }),
    ).not.toThrow();

    // Still a schema: null is allowed, nonsense is not.
    expect(() => schema.parse({ ...base, age: 'three' })).toThrow();
    expect(() => schema.parse({ ...base, bio: 42 })).toThrow();
    expect(() => schema.parse({ ...base, name: null })).toThrow();
  });
});
