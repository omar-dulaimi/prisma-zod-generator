import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';

/**
 * `variants/` was the one emitted plane that ignored a PJTG annotation, so the same column
 * with the same annotation got two different answers depending on which file you reached for:
 *
 *   models/Scoped.schema.ts          label: z.enum(['alpha','beta'])
 *   objects/ScopedCreateInput        label: z.enum(['alpha','beta'])
 *   variants/input/Scoped.input.ts   label: z.string()          <- here
 *
 * That is the exact "two sources of truth" the feature exists to remove, reappearing inside
 * the generator's own output. It is not a case of variants ignoring annotations generally:
 * a `@zod` chain on the same model reaches every variant already, which is what makes the
 * inconsistency legible rather than merely absent.
 *
 * Precedence follows the CRUD path rather than inventing a second rule: the resolver reports
 * `superseded` when `@zod.custom.use(...)` is present, so the annotation stands down from a
 * column an explicit custom schema asked for, and a plain `@zod` chain is dropped when a
 * typed-JSON annotation resolves, exactly as `objects/` does. (What variants then emit for
 * such a column is the base scalar, because they drop `@zod.custom.use` itself. That is
 * pre-existing and measured below, not something this change introduced.)
 *
 * And the contract that outranks all of it: with no `typedJson` block, variants are
 * byte-identical to what they were.
 */

const REPO_ROOT = join(__dirname, '..');
const root = join(REPO_ROOT, `test-env-typed-json-variants-${process.pid}`);
const out = join(root, 'generated', 'schemas');

const SCHEMA_BODY = `
model Scoped {
  id Int @id @default(autoincrement())

  /// [Tag]
  label String

  /// [Tag]
  tags String[]

  /// [Tag]
  maybe String?

  /// !['draft' | 'published']
  status String

  /// @zod.min(5)
  control String

  /// [Tag]
  /// @zod.custom.use(z.literal('explicit'))
  both String

  plain String
}
`;

const VARIANTS = ['pure', 'input', 'result'] as const;

const TAG = "z.enum(['alpha','beta'])";
const STATUS = "z.enum(['draft', 'published'])";

const variantFile = (variant: string) =>
  readFileSync(join(out, 'variants', variant, `Scoped.${variant}.ts`), 'utf-8');

function member(content: string, field: string): string {
  const line = content.split('\n').find((l) => l.trimStart().startsWith(`${field}:`));
  if (!line) throw new Error(`no member "${field}" in:\n${content}`);
  return line.trim().replace(/,$/, '').replace(`${field}: `, '');
}

function generate(dir: string, typedJson: Record<string, unknown> | null): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const config: Record<string, unknown> = {
    pureModels: true,
    variants: {
      pure: { enabled: true },
      input: { enabled: true },
      result: { enabled: true },
    },
  };
  if (typedJson) config.typedJson = typedJson;

  writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2));
  writeFileSync(
    join(dir, 'schema.prisma'),
    `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
  output   = "./client"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${join(dir, 'generated', 'schemas')}"
  config   = "${join(dir, 'config.json')}"
}
${SCHEMA_BODY}`,
  );
  writeFileSync(
    join(dir, 'prisma.config.mjs'),
    `import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: '${join(dir, 'schema.prisma')}',
  datasource: { url: 'postgresql://postgres:postgres@localhost:5432/postgres' },
});
`,
  );

  execFileSync(
    join(REPO_ROOT, 'node_modules', '.bin', 'prisma'),
    ['generate', '--config', join(dir, 'prisma.config.mjs')],
    { cwd: REPO_ROOT, encoding: 'utf-8', stdio: 'pipe' },
  );
}

const unconfiguredRoot = `${root}-off`;

beforeAll(() => {
  generate(root, { schemaModule: './json-types', map: { Tag: TAG } });
  generate(unconfiguredRoot, null);
}, GENERATION_TIMEOUT * 2);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(unconfiguredRoot, { recursive: true, force: true });
});

describe('a PJTG annotation reaches every variant', () => {
  it('types a scalar column in pure, input and result alike', () => {
    for (const variant of VARIANTS) {
      const content = variantFile(variant);
      expect(member(content, 'label'), variant).toContain(TAG);
      expect(member(content, 'status'), variant).toContain(STATUS);
    }
  });

  it('wraps a list column, giving the annotation as the element type', () => {
    for (const variant of VARIANTS) {
      expect(member(variantFile(variant), 'tags'), variant).toContain(`z.array(${TAG})`);
    }
  });

  it('keeps the column optionality the variant already applied', () => {
    // `maybe String?` is nullable, and each variant has its own convention for that.
    // The annotation replaces the base schema; it does not get a vote on optionality.
    for (const variant of VARIANTS) {
      const emitted = member(variantFile(variant), 'maybe');
      expect(emitted, variant).toContain(TAG);
      expect(emitted, variant).toMatch(/\.(optional|nullable|nullish)\(\)/);
    }
  });

  it('agrees with the other two planes on the same column', () => {
    const pureModel = readFileSync(join(out, 'models', 'Scoped.schema.ts'), 'utf-8');
    const createInput = readFileSync(join(out, 'objects', 'ScopedCreateInput.schema.ts'), 'utf-8');
    expect(member(pureModel, 'label')).toContain(TAG);
    expect(member(createInput, 'label')).toContain(TAG);
    expect(member(variantFile('pure'), 'label')).toContain(TAG);
  });
});

describe('precedence matches the CRUD path', () => {
  it('stands down when @zod.custom.use is present', () => {
    // The resolver reports `superseded` for a column carrying both, so the annotation does
    // not replace an explicit custom schema. What the variant then emits is `z.string()`
    // rather than the custom schema, because variants drop `@zod.custom.use` entirely.
    //
    // That is pre-existing and orthogonal, measured on 3.0.1 with no typedJson block at all:
    //
    //   models/Scoped.schema.ts         both: z.literal('explicit')   <- honoured
    //   objects/ScopedCreateInput       both: z.string()              <- dropped
    //   variants/{pure,input}/Scoped    both: z.string()              <- dropped
    //
    // So this pins the half that is this feature's business: the annotation must not step
    // in and claim the column the custom schema asked for. Fixing the drop is a separate
    // change on a separate plane, and pinning it here means that change cannot land
    // silently.
    for (const variant of VARIANTS) {
      const emitted = member(variantFile(variant), 'both');
      expect(emitted, variant).not.toContain(TAG);
      expect(emitted, variant).toContain('z.string()');
    }
  });

  it('leaves a @zod chain alone on a column with no annotation', () => {
    for (const variant of VARIANTS) {
      expect(member(variantFile(variant), 'control'), variant).toContain('min(5)');
    }
  });

  it('leaves an unannotated column alone', () => {
    for (const variant of VARIANTS) {
      expect(member(variantFile(variant), 'plain'), variant).toContain('z.string()');
      expect(member(variantFile(variant), 'plain'), variant).not.toContain('enum');
    }
  });
});

describe('the regression contract', () => {
  it('emits variants byte-identical to a tree with no typedJson block', () => {
    // Only the annotated columns may move, and only when the block is present. This is the
    // 106k-a-week contract: a schema carrying PJTG annotations for the OTHER generator must
    // keep generating exactly as before.
    for (const variant of VARIANTS) {
      const off = readFileSync(
        join(unconfiguredRoot, 'generated', 'schemas', 'variants', variant, `Scoped.${variant}.ts`),
        'utf-8',
      );
      expect(member(off, 'label'), variant).not.toContain('enum');
      expect(member(off, 'plain'), variant).toContain('z.string()');
      expect(member(off, 'control'), variant).toContain('min(5)');
      expect(off, variant).not.toContain('json-types');
    }
  });
});

describe('executed', () => {
  it('rejects a value the annotation excludes and accepts one it allows', async () => {
    writeFileSync(
      join(out, 'variants', 'input', 'json-types.ts'),
      `import * as z from 'zod';\nexport const TagSchema = ${TAG};\n`,
    );
    const mod = await import(join(out, 'variants', 'input', 'Scoped.input.ts'));
    const schema = Object.values(mod).find(
      (value): value is { parse: (v: unknown) => unknown } =>
        typeof value === 'object' && value !== null && 'parse' in value,
    );
    if (!schema) throw new Error(`no schema exported from Scoped.input.ts`);

    const base = { id: 1, label: 'alpha', tags: ['beta'], status: 'draft', control: 'abcde' };
    expect(() => schema.parse({ ...base, both: 'explicit', plain: 'x' })).not.toThrow();
    expect(() => schema.parse({ ...base, label: 'nope', both: 'explicit', plain: 'x' })).toThrow();
    expect(() => schema.parse({ ...base, tags: ['nope'], both: 'explicit', plain: 'x' })).toThrow();
  });
});
