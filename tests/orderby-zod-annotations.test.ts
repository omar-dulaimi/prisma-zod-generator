import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

/**
 * A user's `@zod` validations are being applied to `OrderBy*` schemas, where the value is a
 * sort direction rather than the column's value. So `@zod.email()` on a column makes
 *
 *   orderBy: { contact: 'asc' }
 *
 * fail with "Invalid email address", while `orderBy: { contact: 'a@b.com' }` is accepted.
 * Sorting is rejected and a meaningless value is not. Shipped in 3.0.1 and hit by any model
 * with a format-style validation on a column, which is the library's headline feature.
 *
 * Seven schema families take a sort direction: `OrderByWithRelationInput`,
 * `OrderByWithAggregationInput`, and the five `<Agg>OrderByAggregateInput`.
 *
 * The guard is deliberately NOT a name test. `extractZodValidationsForField` already bails on
 * `<Model>Select` and on `<Agg>AggregateInput` by name, and the Select one shipped as a
 * substring test that silently dropped every annotation on a model called `SelectionRound`.
 * Repeating that shape here would break a model named `OrderByHistory` in the same way, so
 * this asks the DMMF what the field's value position actually is: an OrderBy member's
 * `inputTypes` are exactly `SortOrder` / `SortOrderInput` and never a scalar, whereas a write
 * or filter member always offers the scalar. That signal is immune to model naming.
 */

const REPO_ROOT = join(__dirname, '..');
const root = join(REPO_ROOT, `test-env-orderby-annotations-${process.pid}`);
const out = join(root, 'generated', 'schemas');
const objects = join(out, 'objects');

const SCHEMA_BODY = `
model Person {
  id Int @id @default(autoincrement())
  /// @zod.email()
  contact  String
  /// @zod.min(7)
  score    Int
  /// @zod.min(3)
  nickname String?
  plain    String
}

/// The naming trap the Select guard fell into, from the other side: this model's own name
/// begins with "OrderBy", so any substring or suffix test would strip its annotations.
model OrderByHistory {
  id Int @id @default(autoincrement())
  /// @zod.email()
  contact String
}
`;

const read = (file: string) => readFileSync(join(objects, file), 'utf-8');

/** The right-hand side emitted for `field` in an object schema. */
function member(file: string, field: string): string {
  const line = read(file)
    .split('\n')
    .find((l) => l.trimStart().startsWith(`${field}:`));
  if (!line) throw new Error(`no member "${field}" in ${file}:\n${read(file)}`);
  return line.trim().replace(/,$/, '');
}

/** Every schema family whose members carry a sort direction rather than a column value. */
const ORDER_BY_FILES = [
  'PersonOrderByWithRelationInput.schema.ts',
  'PersonOrderByWithAggregationInput.schema.ts',
  'PersonCountOrderByAggregateInput.schema.ts',
  'PersonMinOrderByAggregateInput.schema.ts',
  'PersonMaxOrderByAggregateInput.schema.ts',
];

/** Only numeric columns appear in the avg/sum aggregates. */
const NUMERIC_ORDER_BY_FILES = [
  'PersonAvgOrderByAggregateInput.schema.ts',
  'PersonSumOrderByAggregateInput.schema.ts',
];

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

describe('@zod validations must not reach OrderBy schemas', () => {
  it('emits a sort order, not the column validation, in every OrderBy family', () => {
    for (const file of ORDER_BY_FILES) {
      expect(member(file, 'contact'), file).toBe('contact: SortOrderSchema.optional()');
      expect(member(file, 'score'), file).toBe('score: SortOrderSchema.optional()');
    }
    for (const file of NUMERIC_ORDER_BY_FILES) {
      expect(member(file, 'score'), file).toBe('score: SortOrderSchema.optional()');
    }
  });

  it('leaves a nullable column its SortOrderInput member', () => {
    // Prisma offers `SortOrder | SortOrderInput` for a nullable column so `nulls` can be
    // placed. Neither arm carries the column's value, so neither takes the validation.
    const emitted = member('PersonOrderByWithRelationInput.schema.ts', 'nickname');
    expect(emitted).not.toContain('min(3)');
    expect(emitted).toContain('SortOrder');
  });

  it('does not strip annotations from a model whose name starts with OrderBy', () => {
    // The Select guard's failure mode, from the other side. A name test would break this.
    expect(member('OrderByHistoryCreateInput.schema.ts', 'contact')).toBe('contact: z.email()');
    expect(member('OrderByHistoryWhereInput.schema.ts', 'contact')).toContain('z.email()');
    expect(member('OrderByHistoryOrderByWithRelationInput.schema.ts', 'contact')).toBe(
      'contact: SortOrderSchema.optional()',
    );
  });
});

describe('the write and filter paths keep their validations', () => {
  it('keeps them everywhere the member carries the column value', () => {
    for (const file of [
      'PersonCreateInput.schema.ts',
      'PersonUncheckedCreateInput.schema.ts',
      'PersonCreateManyInput.schema.ts',
      'PersonUpdateInput.schema.ts',
      'PersonUncheckedUpdateInput.schema.ts',
      'PersonUpdateManyMutationInput.schema.ts',
      'PersonUncheckedUpdateManyInput.schema.ts',
    ]) {
      expect(member(file, 'contact'), file).toContain('z.email()');
      expect(member(file, 'score'), file).toContain('min(7)');
    }
  });

  it('keeps them on the scalar arm of a filter', () => {
    expect(member('PersonWhereInput.schema.ts', 'contact')).toContain('z.email()');
    expect(member('PersonScalarWhereWithAggregatesInput.schema.ts', 'contact')).toContain(
      'z.email()',
    );
  });

  it('leaves an unannotated column alone in both directions', () => {
    expect(member('PersonCreateInput.schema.ts', 'plain')).toBe('plain: z.string()');
    expect(member('PersonOrderByWithRelationInput.schema.ts', 'plain')).toBe(
      'plain: SortOrderSchema.optional()',
    );
  });
});

describe('executed, which is where the bug actually bites', () => {
  it('accepts a sort direction and rejects a column value', async () => {
    const mod = await import(join(out, 'findManyPerson.schema.ts'));
    const schema = mod.PersonFindManyZodSchema as { parse: (v: unknown) => unknown };

    expect(() => schema.parse({ orderBy: { contact: 'asc' } })).not.toThrow();
    expect(() => schema.parse({ orderBy: { contact: 'desc' } })).not.toThrow();
    expect(() => schema.parse({ orderBy: { score: 'asc' } })).not.toThrow();
    expect(() => schema.parse({ orderBy: { plain: 'asc' } })).not.toThrow();

    // A valid email is not a sort direction and must not be accepted as one.
    expect(() => schema.parse({ orderBy: { contact: 'a@b.com' } })).toThrow();
    expect(() => schema.parse({ orderBy: { score: 9 } })).toThrow();
  });
});
