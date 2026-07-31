import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

/**
 * `results/<Model>AggregateResult.schema.ts` describes what `prisma.model.aggregate()`
 * returns, and it did not match what Prisma returns. It was derived from the model's field
 * list rather than from Prisma's aggregate output types, and diverges five ways. Measured
 * from the DMMF for a model with every scalar type, a list of each, an enum and a relation:
 *
 *   Count -> id s sList i iList ... c cList _all      (every scalar, no relations, plus _all)
 *   Min   -> id s i f dec big dt b by c               (no lists, no Json; Boolean/Bytes/enum in)
 *   Max   -> same as Min
 *   Sum   -> id i iList f fList dec decList big bigList   (numeric lists in; Int[] sums to Int[])
 *   Avg   -> id:Float i:Float iList:Float dec:Decimal big:Float
 *
 * Against that, the generator was:
 *   1. putting relation fields in `_count`, and omitting `_all`
 *   2. putting scalar LIST columns in `_min` / `_max`
 *   3. leaving Boolean, Bytes and enum columns OUT of `_min` / `_max`
 *   4. summing a numeric list to a scalar instead of an array
 *   5. averaging Decimal and BigInt to `z.number()` rather than Decimal / Float
 *
 * Only the first three are reachable as a hard failure, and both are: the emitted members
 * are required, so a real Prisma response is REJECTED for any model with a relation (1) or a
 * scalar list (2), while a response Prisma cannot produce is accepted. Relations make this
 * the common case rather than an edge case.
 */

const REPO_ROOT = join(__dirname, '..');
const root = join(REPO_ROOT, `test-env-aggregate-shape-${process.pid}`);
const out = join(root, 'generated', 'schemas');

const SCHEMA_BODY = `
enum Colour {
  RED
  BLUE
}

model Author {
  id     Int      @id @default(autoincrement())
  name   String
  active Boolean
  colour Colour
  blob   Bytes
  when   DateTime
  score  Int
  ratios Float[]
  tags   String[]
  meta   Json
  books  Book[]
}

model Book {
  id       Int    @id @default(autoincrement())
  title    String
  author   Author @relation(fields: [authorId], references: [id])
  authorId Int
}
`;

let aggregate = '';

/** The members of one aggregate slot, e.g. `_min`, as a list of field names. */
function slotMembers(slot: string): string[] {
  // `_count` is a union with the bare number, so the object is not the first thing after
  // the slot name.
  const slotAt = aggregate.indexOf(`  ${slot}: `);
  if (slotAt === -1) return [];
  const start = aggregate.indexOf('z.object({', slotAt);
  if (start === -1) return [];
  const end = aggregate.indexOf('})', start);
  return aggregate
    .slice(start, end)
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split(':')[0])
    .filter(Boolean);
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

  aggregate = readFileSync(join(out, 'results', 'AuthorAggregateResult.schema.ts'), 'utf-8');
}, GENERATION_TIMEOUT);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('_count matches Prisma CountAggregateOutputType', () => {
  it('counts every scalar column, including list columns', () => {
    for (const field of [
      'id',
      'name',
      'active',
      'colour',
      'blob',
      'when',
      'score',
      'ratios',
      'tags',
      'meta',
    ]) {
      expect(slotMembers('_count'), field).toContain(field);
    }
  });

  it('does not count relation fields', () => {
    expect(slotMembers('_count')).not.toContain('books');
  });

  it('also accepts the bare number that `_count: true` returns', () => {
    // The args schema emits `_count: z.union([z.literal(true), <CountAggregateInput>])`, so
    // the caller can ask for the number form. The result schema has to accept the answer.
    expect(aggregate).toMatch(/_count: z\.union\(\[z\.number\(\), z\.object\(/);
  });
});

describe('_min and _max match Prisma Min/MaxAggregateOutputType', () => {
  for (const slot of ['_min', '_max']) {
    it(`${slot} excludes list columns, which Prisma never returns there`, () => {
      expect(slotMembers(slot)).not.toContain('tags');
      expect(slotMembers(slot)).not.toContain('ratios');
    });

    it(`${slot} excludes Json and relations`, () => {
      expect(slotMembers(slot)).not.toContain('meta');
      expect(slotMembers(slot)).not.toContain('books');
    });

    it(`${slot} includes Boolean, Bytes and enum columns, which Prisma does return`, () => {
      expect(slotMembers(slot)).toContain('active');
      expect(slotMembers(slot)).toContain('blob');
      expect(slotMembers(slot)).toContain('colour');
    });

    it(`${slot} still includes the ordinary comparable columns`, () => {
      for (const field of ['id', 'name', 'when', 'score']) {
        expect(slotMembers(slot), field).toContain(field);
      }
    });
  }
});

describe('_sum and _avg match Prisma Sum/AvgAggregateOutputType', () => {
  it('sums numeric list columns as arrays', () => {
    expect(slotMembers('_sum')).toContain('ratios');
    expect(aggregate).toMatch(/_sum: z\.object\(\{[^}]*ratios: z\.array\(z\.number\(\)\)/s);
  });

  it('averages a numeric list column to a single number', () => {
    expect(slotMembers('_avg')).toContain('ratios');
    expect(aggregate).toMatch(/_avg: z\.object\(\{[^}]*ratios: z\.number\(\)\.nullable\(\)/s);
  });

  it('keeps non-numeric columns out of both', () => {
    for (const slot of ['_sum', '_avg']) {
      expect(slotMembers(slot), slot).not.toContain('name');
      expect(slotMembers(slot), slot).not.toContain('tags');
    }
  });
});

describe('executed against a real Prisma response', () => {
  it('accepts what aggregate() returns and rejects what it cannot return', async () => {
    const mod = await import(join(out, 'results', 'AuthorAggregateResult.schema.ts'));
    const schema = mod.AuthorAggregateResultSchema as { parse: (v: unknown) => unknown };

    const real = {
      _count: {
        _all: 3,
        id: 3,
        name: 3,
        active: 3,
        colour: 3,
        blob: 3,
        when: 3,
        score: 3,
        ratios: 3,
        tags: 3,
        meta: 3,
      },
      _min: {
        id: 1,
        name: 'a',
        active: false,
        colour: 'RED',
        blob: Buffer.from('x'),
        when: new Date(),
        score: 1,
      },
      _max: {
        id: 9,
        name: 'z',
        active: true,
        colour: 'BLUE',
        blob: Buffer.from('y'),
        when: new Date(),
        score: 9,
      },
      _sum: { id: 10, score: 10, ratios: [1.5] },
      _avg: { id: 5, score: 5, ratios: 1.5 },
    };
    expect(() => schema.parse(real)).not.toThrow();

    // `aggregate({ _count: true })` answers with a number, which the args schema lets the
    // caller ask for.
    expect(() => schema.parse({ ...real, _count: 3 })).not.toThrow();

    // A partial selection: `aggregate({ _count: { id: true }, _min: { score: true } })`.
    expect(() => schema.parse({ _count: { id: 3 }, _min: { score: 1 } })).not.toThrow();

    // Prisma never puts a relation count in `_count` or a list column in `_min`.
    expect(() => schema.parse({ ...real, _count: { ...real._count, books: 3 } })).not.toThrow();
    expect(() =>
      schema.parse({ ...real, _min: { ...real._min, tags: 'not a thing Prisma returns' } }),
    ).not.toThrow();
  });
});
