import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * `typedJson.applyToResults`: the same annotation, the same answer, on the read path.
 *
 * Without it PZG is self-inconsistent. The same field with the same annotation gets two
 * different schemas depending on which emitted file you reach for:
 *
 *     objects/WorkflowCreateInput      status: z.enum(['draft', 'published'])
 *     results/WorkflowFindManyResult   status: z.string()
 *
 * The flag closes that, and it defaults to **false** on purpose. Result schemas are emitted
 * by default (thirteen per model here, with no `emit` config at all), so typing them by
 * default would change the READ path for everyone who turns `typedJson` on: a row written
 * before the annotation existed would start throwing on read. That is someone else's
 * production data. Being loudly inconsistent and safe beats being quietly strict about rows
 * that are already in the database.
 *
 * So this file pins both halves. Flag off: `results/` is byte-identical to a tree generated
 * with no `typedJson` block at all. Flag on: every result schema that carries the field
 * carries the annotation too, `_count` stays numeric, and the emitted modules are executed
 * rather than merely read.
 */

const SCHEMA_BODY = `
model Workflow {
  id Int @id @default(autoincrement())

  /// [WorkflowNode]
  nodes Json

  /// [WorkflowNode]
  meta Json?

  /// [WorkflowNode]
  steps Json[]

  plainJson Json

  /// !['draft' | 'published']
  status String

  /// ![1 | 2 | 3]
  tier Int

  /// [Ratio]
  ratio Float

  /// [Tag]
  tags String[]

  plainString String
  plainInt    Int
  plainTags   String[]
  createdAt   DateTime

  // Nullable and unannotated: the gate. Nothing about these two may move when the flag
  // is on, because moving them would mean moving them with the flag off too.
  plainOptionalJson   Json?
  plainOptionalString String?

  owner   Owner @relation(fields: [ownerId], references: [id])
  ownerId Int
}

model Owner {
  id        Int        @id @default(autoincrement())
  name      String
  workflows Workflow[]
}
`;

/**
 * The module the annotations resolve against. `RatioSchema` is deliberately narrower than
 * `z.number()` and `TagSchema` narrower than `z.string()`, so a test that parses 5 or 'nope'
 * can tell a real replacement apart from the scalar the generator would emit anyway.
 */
const JSON_TYPES_MODULE = `import * as z from 'zod';

export const WorkflowNodeSchema = z.object({ id: z.string(), label: z.string() });
export const RatioSchema = z.number().min(0).max(1);
export const TagSchema = z.enum(['alpha', 'beta']);
`;

const TYPED_JSON = { schemaModule: './json-types', schemaSuffix: 'Schema' };

interface GeneratedEnv {
  outputDir: string;
  stdout: string;
  stderr: string;
}

async function generate(
  envName: string,
  extraConfig: Record<string, unknown>,
): Promise<GeneratedEnv> {
  const testEnv = await TestEnvironment.createTestEnv(envName);
  const config = {
    ...ConfigGenerator.createBasicConfig(),
    pureModels: true,
    ...extraConfig,
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
${SCHEMA_BODY}`;

  writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
  writeFileSync(testEnv.schemaPath, schema);
  const { stdout, stderr } = await testEnv.runGenerationWithOutput();

  return { outputDir: testEnv.outputDir, stdout, stderr };
}

const schemasDir = (env: GeneratedEnv) => join(env.outputDir, 'schemas');
const resultsDir = (env: GeneratedEnv) => join(schemasDir(env), 'results');
const resultFile = (env: GeneratedEnv, name: string) =>
  readFileSync(join(resultsDir(env), `${name}.schema.ts`), 'utf-8');

/**
 * Every property line for `fieldName`, in document order, whitespace-normalised.
 *
 * Plural on purpose: a groupBy result mentions the same column four times (the grouped
 * value, `_count`, `_min`, `_max`), and which of those may change is the whole question.
 */
function fieldLines(content: string, fieldName: string): string[] {
  const matches = content.matchAll(new RegExp(`^\\s*${fieldName}:\\s*(.+?),?\\s*$`, 'gm'));
  return [...matches].map((match) => match[1].replace(/,$/, '').trim());
}

/** The single property line for `fieldName`. Throws when the field is not unique. */
function fieldLine(content: string, fieldName: string): string {
  const lines = fieldLines(content, fieldName);
  if (lines.length !== 1) {
    throw new Error(`expected one line for "${fieldName}", found ${lines.length}: ${lines}`);
  }
  return lines[0];
}

/** The seven result schemas shaped like a record of the model's fields. */
const RECORD_RESULTS = [
  'WorkflowFindUniqueResult',
  'WorkflowFindFirstResult',
  'WorkflowFindManyResult',
  'WorkflowCreateResult',
  'WorkflowUpdateResult',
  'WorkflowUpsertResult',
  'WorkflowDeleteResult',
];

/** The result schemas that carry no model field at all: `{ count }` and `z.number()`. */
const FIELDLESS_RESULTS = [
  'WorkflowCreateManyResult',
  'WorkflowUpdateManyResult',
  'WorkflowDeleteManyResult',
  'WorkflowCountResult',
];

const ENUM = "z.enum(['draft', 'published'])";
const TIER = 'z.union([z.literal(1), z.literal(2), z.literal(3)])';

/** A row as Prisma would return it, valid against every annotation on the model. */
const VALID_ROW = {
  id: 1,
  nodes: { id: 'n1', label: 'start' },
  meta: { id: 'n2', label: 'end' },
  steps: [{ id: 'a', label: 'b' }],
  plainJson: { anything: true },
  status: 'draft',
  tier: 2,
  ratio: 0.5,
  tags: ['alpha'],
  plainString: 'x',
  plainInt: 7,
  plainTags: ['whatever'],
  createdAt: new Date(),
  plainOptionalJson: null,
  // A string rather than null, because the untyped read path still rejects null for a
  // nullable column in a groupBy result. See the inertness test below.
  plainOptionalString: 'y',
  ownerId: 1,
};

/**
 * The same row as Prisma returns it when the nullable columns are null, which is the
 * ordinary state of a nullable column and not a legacy row.
 */
const ROW_WITH_NULLS = { ...VALID_ROW, meta: null };

describe('typedJson.applyToResults: on', () => {
  let env: GeneratedEnv;

  beforeAll(async () => {
    env = await generate('typed-json-results-on', {
      typedJson: { ...TYPED_JSON, applyToResults: true },
    });
    // Written after generation so the output directory's cleanup never sees it.
    writeFileSync(join(schemasDir(env), 'json-types.ts'), JSON_TYPES_MODULE);
  }, GENERATION_TIMEOUT);

  it('types the field in every record-shaped result schema, not only groupBy', () => {
    for (const name of RECORD_RESULTS) {
      const content = resultFile(env, name);

      expect(fieldLine(content, 'nodes'), name).toBe('WorkflowNodeSchema');
      expect(fieldLine(content, 'steps'), name).toBe('z.array(WorkflowNodeSchema)');
      expect(fieldLine(content, 'status'), name).toBe(ENUM);
      expect(fieldLine(content, 'tier'), name).toBe(TIER);
      expect(fieldLine(content, 'ratio'), name).toBe('RatioSchema');
      expect(fieldLine(content, 'tags'), name).toBe('z.array(TagSchema)');
      // Optionality is the emitter's, applied outside the replacement exactly as before,
      // and a nullable column also gets the null its own database row holds.
      expect(fieldLine(content, 'meta'), name).toBe('WorkflowNodeSchema.nullable().optional()');
    }
  });

  it('leaves unannotated fields and relations exactly as they were', () => {
    for (const name of RECORD_RESULTS) {
      const content = resultFile(env, name);

      expect(fieldLine(content, 'plainJson'), name).toBe('z.unknown()');
      expect(fieldLine(content, 'plainString'), name).toBe('z.string()');
      expect(fieldLine(content, 'plainInt'), name).toBe('z.number().int()');
      expect(fieldLine(content, 'plainTags'), name).toBe('z.array(z.string())');
      expect(fieldLine(content, 'createdAt'), name).toBe('z.date()');
      expect(fieldLine(content, 'owner'), name).toBe('OwnerSchema.optional()');
      // Unannotated and nullable: still exactly the 3.0.0 expression, `.nullable()` and
      // all. Adding it here would add it with the flag off too.
      expect(fieldLine(content, 'plainOptionalJson'), name).toBe(
        'z.unknown().nullable().optional()',
      );
      expect(fieldLine(content, 'plainOptionalString'), name).toBe(
        'z.string().nullable().optional()',
      );
    }
  });

  it('types the grouped value and _min/_max, and leaves _count numeric', () => {
    const content = resultFile(env, 'WorkflowGroupByResult');

    // In document order: the grouped value, the _count, the _min, the _max.
    expect(fieldLines(content, 'status')).toEqual([
      `${ENUM}.optional()`,
      'z.number().optional()',
      `${ENUM}.nullable().optional()`,
      `${ENUM}.nullable().optional()`,
    ]);
    expect(fieldLines(content, 'tier')).toEqual([
      `${TIER}.optional()`,
      'z.number().optional()',
      // _sum and _avg are numbers whatever the column holds, so they keep z.number().
      'z.number().nullable().optional()',
      'z.number().nullable().optional()',
      `${TIER}.nullable().optional()`,
      `${TIER}.nullable().optional()`,
    ]);
    expect(fieldLines(content, 'nodes')).toEqual([
      'WorkflowNodeSchema.optional()',
      'z.number().optional()',
    ]);
    expect(fieldLines(content, 'steps')).toEqual([
      'z.array(WorkflowNodeSchema).optional()',
      'z.number().optional()',
    ]);
  });

  it('gives the grouped value of a nullable column the same optionality the record results give it', () => {
    const content = resultFile(env, 'WorkflowGroupByResult');

    // The grouped value, then the _count. A nullable column groups as null, and a
    // groupBy that does not name the column in `by` omits it entirely.
    expect(fieldLines(content, 'meta')).toEqual([
      'WorkflowNodeSchema.nullable().optional()',
      'z.number().optional()',
    ]);
    // The untyped path now says the same thing. A nullable column groups as null and a
    // column outside `by` is absent, so both markers belong on both paths.
    expect(fieldLines(content, 'plainOptionalJson')).toEqual([
      'z.unknown().nullable().optional()',
      'z.number().optional()',
    ]);
    expect(fieldLines(content, 'plainOptionalString')).toEqual([
      'z.string().nullable().optional()',
      'z.number().optional()',
      'z.string().nullable().optional()',
      'z.string().nullable().optional()',
    ]);
  });

  it('types _min and _max on the aggregate result too', () => {
    const content = resultFile(env, 'WorkflowAggregateResult');

    // _count, then _min, then _max. No grouped value on an aggregate result.
    expect(fieldLines(content, 'status')).toEqual([
      'z.number().optional()',
      `${ENUM}.nullable().optional()`,
      `${ENUM}.nullable().optional()`,
    ]);
    expect(fieldLines(content, 'ratio')).toEqual([
      'z.number().optional()',
      'z.number().nullable().optional()',
      'z.number().nullable().optional()',
      'RatioSchema.nullable().optional()',
      'RatioSchema.nullable().optional()',
    ]);
  });

  it('leaves the count-shaped results alone and imports nothing into them', () => {
    for (const name of FIELDLESS_RESULTS) {
      const content = resultFile(env, name);
      expect(content, name).not.toContain('json-types');
      expect(content, name).not.toContain('Schema,');
    }
    expect(resultFile(env, 'WorkflowCountResult')).toContain('z.number()');
    expect(resultFile(env, 'WorkflowCreateManyResult')).toContain('count: z.number()');
  });

  it('imports the module once per file, resolved relative to the results directory', () => {
    for (const name of [...RECORD_RESULTS, 'WorkflowGroupByResult', 'WorkflowAggregateResult']) {
      const content = resultFile(env, name);
      const statements = content
        .split('\n')
        .filter((line) => line.includes("from '../json-types'"));

      expect(statements, name).toHaveLength(1);
    }

    // Only the names the file actually mentions: the aggregate result narrows _min/_max,
    // which never touches the Json columns.
    expect(resultFile(env, 'WorkflowFindManyResult')).toContain(
      "import { RatioSchema, TagSchema, WorkflowNodeSchema } from '../json-types'",
    );
    // `TagSchema` used to appear here too, but only because `tags String[]` was wrongly
    // emitted into _min/_max. Prisma takes no min or max of a list column, so the column
    // is gone from those slots and the import goes with it. `ratio Float` still needs
    // RatioSchema, which is what keeps this assertion honest rather than vacuous.
    expect(resultFile(env, 'WorkflowAggregateResult')).toContain(
      "import { RatioSchema } from '../json-types'",
    );
  });

  it('leaves a model with no annotations untouched', () => {
    const content = resultFile(env, 'OwnerFindManyResult');
    expect(fieldLine(content, 'name')).toBe('z.string()');
    expect(content).not.toContain('json-types');
  });

  describe('the emitted result schemas actually validate', () => {
    const row = VALID_ROW;

    async function load(name: string, exportName: string) {
      const mod = await import(join(resultsDir(env), `${name}.schema.ts`));
      return mod[exportName] as { parse: (value: unknown) => unknown };
    }

    const PAGINATION = {
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };

    /**
     * `meta Json?` is null in the row Prisma just returned. That is what a nullable column
     * holds most of the time, not a row written before the annotation existed, so a flag
     * that rejects it is a flag nobody can turn on.
     */
    it('accepts an explicit null in a nullable annotated column', async () => {
      const findMany = await load('WorkflowFindManyResult', 'WorkflowFindManyResultSchema');
      expect(() =>
        findMany.parse({ data: [ROW_WITH_NULLS], pagination: PAGINATION }),
      ).not.toThrow();

      const findUnique = await load('WorkflowFindUniqueResult', 'WorkflowFindUniqueResultSchema');
      expect(() => findUnique.parse(ROW_WITH_NULLS)).not.toThrow();

      const groupBy = await load('WorkflowGroupByResult', 'WorkflowGroupByResultSchema');
      expect(() => groupBy.parse([ROW_WITH_NULLS])).not.toThrow();

      // Nullable is not "anything": the annotation still holds for a non-null value.
      expect(() =>
        findMany.parse({ data: [{ ...row, meta: { id: 1 } }], pagination: PAGINATION }),
      ).toThrow();
      expect(() => groupBy.parse([{ ...row, meta: { id: 1 } }])).toThrow();
    });

    /**
     * A groupBy result names only the columns in `by`, so every column has to survive
     * being absent. The untyped path gets that from `z.unknown()`; the typed one has to
     * be told.
     */
    it('accepts a groupBy row that omits an annotated nullable column', async () => {
      const groupBy = await load('WorkflowGroupByResult', 'WorkflowGroupByResultSchema');
      const withoutMeta: Record<string, unknown> = { ...row };
      delete withoutMeta.meta;

      expect(() => groupBy.parse([withoutMeta])).not.toThrow();
    });

    it('accepts a conforming findMany payload and rejects what the annotation excludes', async () => {
      const schema = await load('WorkflowFindManyResult', 'WorkflowFindManyResultSchema');
      const pagination = PAGINATION;

      expect(() => schema.parse({ data: [row], pagination })).not.toThrow();
      expect(() => schema.parse({ data: [{ ...row, status: 'archived' }], pagination })).toThrow();
      expect(() => schema.parse({ data: [{ ...row, tier: 4 }], pagination })).toThrow();
      // RatioSchema is z.number().min(0).max(1); a plain z.number() would accept 5.
      expect(() => schema.parse({ data: [{ ...row, ratio: 5 }], pagination })).toThrow();
      expect(() => schema.parse({ data: [{ ...row, nodes: { id: 1 } }], pagination })).toThrow();
      expect(() => schema.parse({ data: [{ ...row, tags: ['nope'] }], pagination })).toThrow();
      // An unannotated Json column still takes anything at all.
      expect(() => schema.parse({ data: [{ ...row, plainJson: 42 }], pagination })).not.toThrow();
    });

    it('validates the grouped value and the _min/_max slots', async () => {
      const schema = await load('WorkflowGroupByResult', 'WorkflowGroupByResultSchema');
      // Every comparable column appears in _min/_max and each one is nullable, so the
      // columns this test is not about are passed as null rather than omitted.
      const nulls = {
        id: null,
        status: null,
        tier: null,
        ratio: null,
        tags: null,
        plainString: null,
        plainInt: null,
        plainTags: null,
        createdAt: null,
        plainOptionalString: null,
        ownerId: null,
      };
      const minMax = (status: string) => ({
        _min: { ...nulls, status },
        _max: { ...nulls, status },
      });

      expect(() => schema.parse([{ ...row, ...minMax('draft') }])).not.toThrow();
      expect(() => schema.parse([{ ...row, status: 'archived' }])).toThrow();
      expect(() => schema.parse([{ ...row, ...minMax('archived') }])).toThrow();
    });
  });
});

describe('typedJson.applyToResults: single-file mode', () => {
  /**
   * Every schema collapses into one bundle here, and the bundle de-duplicates imports by
   * exact statement text. A merged statement (`{ A, B, C }`) differs from file to file, so
   * it survives that de-duplication and lands as a duplicate identifier - a bundle that
   * throws the moment it is imported. Result schemas were the last emitter still outside
   * that handling.
   */
  it(
    'imports each schema exactly once and the bundle still runs',
    async () => {
      const env = await generate('typed-json-results-single-file', {
        useMultipleFiles: false,
        typedJson: { ...TYPED_JSON, applyToResults: true },
      });
      writeFileSync(join(schemasDir(env), 'json-types.ts'), JSON_TYPES_MODULE);

      const bundlePath = join(schemasDir(env), 'schemas.ts');
      const bundle = readFileSync(bundlePath, 'utf-8');

      // The bundle sits at the output root, so the specifier stays as configured.
      expect(bundle).toContain("from './json-types'");
      expect(bundle).not.toContain("from '../json-types'");

      for (const name of ['WorkflowNodeSchema', 'RatioSchema', 'TagSchema']) {
        const statements = bundle
          .split('\n')
          .filter((line) => line.startsWith('import') && new RegExp(`\\b${name}\\b`).test(line));
        expect(statements, name).toHaveLength(1);
      }

      const mod = await import(bundlePath);
      const schema = mod.WorkflowGroupByResultSchema as { parse: (value: unknown) => unknown };
      expect(() => schema.parse([VALID_ROW])).not.toThrow();
      expect(() => schema.parse([{ ...VALID_ROW, status: 'archived' }])).toThrow();
    },
    GENERATION_TIMEOUT,
  );
});

describe('typedJson.applyToResults: off (the default)', () => {
  let configured: GeneratedEnv;
  let unconfigured: GeneratedEnv;

  beforeAll(async () => {
    configured = await generate('typed-json-results-off', { typedJson: TYPED_JSON });
    unconfigured = await generate('typed-json-results-none', {});
  }, GENERATION_TIMEOUT);

  it('emits result schemas byte-identical to a tree with no typedJson block at all', () => {
    const names = readdirSync(resultsDir(configured)).sort();
    expect(names).toEqual(readdirSync(resultsDir(unconfigured)).sort());
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const left = readFileSync(join(resultsDir(configured), name), 'utf-8');
      const right = readFileSync(join(resultsDir(unconfigured), name), 'utf-8');
      expect(left, name).toBe(right);
    }
  });

  it('leaves the read path on the column scalar type, which is the documented cost', () => {
    const content = resultFile(configured, 'WorkflowFindManyResult');

    expect(fieldLine(content, 'status')).toBe('z.string()');
    expect(fieldLine(content, 'nodes')).toBe('z.unknown()');
    expect(fieldLine(content, 'tags')).toBe('z.array(z.string())');
    expect(content).not.toContain('json-types');
  });

  it('still types the write path, which is where the flag is not needed', () => {
    const content = readFileSync(
      join(schemasDir(configured), 'objects', 'WorkflowCreateInput.schema.ts'),
      'utf-8',
    );
    expect(fieldLine(content, 'status')).toBe(ENUM);
  });

  /**
   * Both paths now say the same thing. This assertion used to pin the opposite, because a
   * nullable scalar emitted `z.string().optional()`, which admits undefined and not null and
   * so rejected the ordinary state of the column. It is fixed with the rest of the
   * result-schema shape; what stays pinned here is that turning `typedJson` OFF does not
   * change any of it.
   */
  it('leaves the untyped nullable columns as the record path emits them', async () => {
    const content = resultFile(configured, 'WorkflowFindManyResult');
    expect(fieldLine(content, 'meta')).toBe('z.unknown().nullable().optional()');
    expect(fieldLine(content, 'plainOptionalString')).toBe('z.string().nullable().optional()');

    const mod = await import(join(resultsDir(configured), 'WorkflowGroupByResult.schema.ts'));
    const groupBy = mod.WorkflowGroupByResultSchema as { parse: (value: unknown) => unknown };

    // z.unknown() takes the null, which is why the annotated column is where this showed.
    expect(() => groupBy.parse([{ ...VALID_ROW, meta: null }])).not.toThrow();
    // And so does z.string() now. A nullable column groups as null, so the grouped value
    // is `.nullable().optional()` on both paths. This assertion used to pin the opposite:
    // the defect was known but left alone because correcting it moves bytes in a tree with
    // no typedJson block, which the flag-off contract forbade during that work. It is fixed
    // deliberately now, with the rest of the result-schema shape.
    expect(() => groupBy.parse([{ ...VALID_ROW, plainOptionalString: null }])).not.toThrow();
  });
});
