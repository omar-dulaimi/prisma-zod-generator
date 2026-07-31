import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

/**
 * `Transformer.extractZodValidationsForField` bails on `this.name.includes('Select')`.
 * That is a substring test against an arbitrary user-chosen model name, so every
 * `objects/` schema of a model whose name merely contains "Select" silently loses every
 * `@zod` annotation the user wrote. `SelectionRound`, `SelectorProfile`, `PreSelection`
 * are all ordinary names.
 *
 * The failure is silent and asymmetric, which is what makes it dangerous: the same
 * annotations keep working on a differently-named model, and keep working for the same
 * model in `variants/input/`, so nothing in the output looks wrong until an
 * unvalidated payload reaches the database.
 *
 * The guard's real job is to leave the boolean-flag schemas alone, and every one of
 * those is a suffix: `<Model>Select` and `<CountOutputType>Select`. Anchoring the test
 * to `/^\w+Select$/` keeps all of them and loses none. `src/typed-json/emission.ts`
 * already uses exactly that anchor for the sibling matcher; this pins the two rules to
 * one another.
 */

const REPO_ROOT = join(__dirname, '..');
const root = join(REPO_ROOT, `test-env-select-substring-${process.pid}`);
const out = join(root, 'generated', 'schemas');
const objects = join(out, 'objects');

const SCHEMA_BODY = `
/// Model name contains "Select" as a substring. Nothing about it is a Select schema.
model SelectionRound {
  id Int @id @default(autoincrement())
  /// @zod.min(3).max(40)
  title   String
  /// @zod.email()
  contact String
}

/// Same annotations, name free of "Select". The control.
model Workflow {
  id Int @id @default(autoincrement())
  /// @zod.min(3).max(40)
  title   String
  /// @zod.email()
  contact String
}
`;

const read = (file: string) => readFileSync(join(objects, file), 'utf-8');

/** The right-hand side emitted for `field` in an object schema, up to the line end. */
function member(file: string, field: string): string {
  const line = read(file)
    .split('\n')
    .find((l) => l.trimStart().startsWith(`${field}:`));
  if (!line) throw new Error(`no member "${field}" in ${file}:\n${read(file)}`);
  return line.trim().replace(/,$/, '');
}

beforeAll(() => {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });

  writeFileSync(
    join(root, 'config.json'),
    JSON.stringify({ variants: { pure: { enabled: true }, input: { enabled: true } } }, null, 2),
  );

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

describe('@zod annotations on a model whose name contains "Select"', () => {
  it('keeps the annotations in the create input', () => {
    expect(member('SelectionRoundCreateInput.schema.ts', 'title')).toBe(
      'title: z.string().min(3).max(40)',
    );
    expect(member('SelectionRoundCreateInput.schema.ts', 'contact')).toBe('contact: z.email()');
  });

  it('emits the same members as the identically annotated control model', () => {
    for (const [selectish, control] of [
      ['SelectionRoundCreateInput.schema.ts', 'WorkflowCreateInput.schema.ts'],
      ['SelectionRoundUncheckedCreateInput.schema.ts', 'WorkflowUncheckedCreateInput.schema.ts'],
      ['SelectionRoundCreateManyInput.schema.ts', 'WorkflowCreateManyInput.schema.ts'],
      ['SelectionRoundUpdateInput.schema.ts', 'WorkflowUpdateInput.schema.ts'],
      [
        'SelectionRoundUpdateManyMutationInput.schema.ts',
        'WorkflowUpdateManyMutationInput.schema.ts',
      ],
    ] as const) {
      for (const field of ['title', 'contact'] as const) {
        expect(member(selectish, field), `${selectish} ${field}`).toBe(member(control, field));
      }
    }
  });

  it('agrees with the variants tree, which never had the bug', () => {
    const variant = readFileSync(
      join(out, 'variants', 'input', 'SelectionRound.input.ts'),
      'utf-8',
    );
    expect(variant).toContain('title: z.string().min(3).max(40)');
    expect(variant).toContain('contact: z.email()');
    expect(member('SelectionRoundCreateInput.schema.ts', 'title')).toContain('.min(3).max(40)');
    expect(member('SelectionRoundCreateInput.schema.ts', 'contact')).toContain('z.email()');
  });

  it('still leaves the real boolean-flag schemas alone', () => {
    // This is what the guard exists for. A Select schema is a set of boolean flags
    // whatever the column type is, so no user validator may reach it.
    for (const field of ['title', 'contact'] as const) {
      expect(member('SelectionRoundSelect.schema.ts', field)).toBe(
        `${field}: z.boolean().optional()`,
      );
    }
    for (const file of [
      'SelectionRoundCountAggregateInput.schema.ts',
      'SelectionRoundMinAggregateInput.schema.ts',
      'SelectionRoundMaxAggregateInput.schema.ts',
    ]) {
      expect(member(file, 'title')).toContain('z.literal(true)');
      expect(member(file, 'title')).not.toContain('.min(3)');
    }
  });

  it('rejects the values the user asked to be rejected', async () => {
    type Parser = { safeParse: (v: unknown) => { success: boolean } };
    const mod = (await import(join(objects, 'SelectionRoundCreateInput.schema.ts'))) as Record<
      string,
      Parser
    >;
    const schema = mod.SelectionRoundCreateInputObjectZodSchema;

    expect(schema.safeParse({ title: 'a valid title', contact: 'a@b.com' }).success).toBe(true);
    expect(schema.safeParse({ title: 'ab', contact: 'a@b.com' }).success).toBe(false);
    expect(schema.safeParse({ title: 'x'.repeat(41), contact: 'a@b.com' }).success).toBe(false);
    expect(schema.safeParse({ title: 'a valid title', contact: 'not-an-email' }).success).toBe(
      false,
    );
  });
});
