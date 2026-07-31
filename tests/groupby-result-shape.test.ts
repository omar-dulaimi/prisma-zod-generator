import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

/**
 * `results/<Model>GroupByResult.schema.ts` describes what `groupBy()` returns, and diverges
 * from it two ways.
 *
 * A groupBy returns the columns named in `by` and nothing else:
 *
 *   groupBy({ by: ['name'] })  ->  [{ name: 'x' }]
 *
 * so requiring every groupable column rejects every response that does not group by all of
 * them, which is essentially all of them. Prisma's own `GroupByOutputType` lists all the
 * columns because it is the maximal type; the client narrows it with
 * `Pick<..., T['by'][number]>` per call, and a runtime schema cannot know `by`, so the
 * honest schema makes them optional.
 *
 * Second, the generator filtered on `kind === 'scalar'`, which drops enum columns. You can
 * group by an enum, and Prisma's `AuthorGroupByOutputType` lists `colour: Colour` alongside
 * the scalars, so the column was simply missing from the schema.
 *
 * The aggregate slots on a groupBy row come from the same builder as the aggregate result
 * and are covered by tests/aggregate-result-shape.test.ts.
 */

const REPO_ROOT = join(__dirname, '..');
const root = join(REPO_ROOT, `test-env-groupby-shape-${process.pid}`);
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
  tags   String[]
  bio    String?
  books  Book[]
}

model Book {
  id       Int    @id @default(autoincrement())
  title    String
  author   Author @relation(fields: [authorId], references: [id])
  authorId Int
}
`;

let groupBy = '';

/** The right-hand side emitted for a grouped column, before the aggregate slots. */
function member(field: string): string | null {
  const upToAggregates = groupBy.slice(0, groupBy.indexOf('  _count:'));
  const line = upToAggregates.split('\n').find((l) => l.trimStart().startsWith(`${field}:`));
  return line ? line.trim().replace(/,$/, '').replace(`${field}: `, '') : null;
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

  groupBy = readFileSync(join(out, 'results', 'AuthorGroupByResult.schema.ts'), 'utf-8');
}, GENERATION_TIMEOUT);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('grouped columns', () => {
  it('are optional, because a groupBy returns only the columns named in `by`', () => {
    for (const field of ['id', 'name', 'active', 'tags']) {
      expect(member(field), field).toMatch(/\.optional\(\)$/);
    }
  });

  it('includes enum columns, which are groupable and which Prisma lists', () => {
    expect(member('colour')).not.toBeNull();
  });

  it('keeps a nullable column nullable as well as optional', () => {
    expect(member('bio')).toContain('.nullable()');
    expect(member('bio')).toMatch(/\.optional\(\)$/);
  });

  it('leaves relation fields out', () => {
    expect(member('books')).toBeNull();
  });
});

describe('executed against what groupBy actually returns', () => {
  it('accepts a partial grouping and still rejects a wrong type', async () => {
    const mod = await import(join(out, 'results', 'AuthorGroupByResult.schema.ts'));
    const schema = mod.AuthorGroupByResultSchema as { parse: (v: unknown) => unknown };

    // groupBy({ by: ['name'], _count: true })
    expect(() => schema.parse([{ name: 'a', _count: 3 }])).not.toThrow();
    // groupBy({ by: ['name', 'colour'] })
    expect(() => schema.parse([{ name: 'a', colour: 'RED' }])).not.toThrow();
    // groupBy({ by: ['id'], _min: { id: true } })
    expect(() => schema.parse([{ id: 1, _min: { id: 1 } }])).not.toThrow();

    // Still a schema: a grouped column that is present must have the right type.
    expect(() => schema.parse([{ name: 42 }])).toThrow();
    expect(() => schema.parse([{ id: 'one' }])).toThrow();
  });
});
