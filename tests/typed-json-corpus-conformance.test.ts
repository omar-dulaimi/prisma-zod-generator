/**
 * Corpus conformance: run prisma-json-types-generator's own fixtures through PZG
 * and execute upstream's type assertions as runtime assertions.
 *
 * `tests/compat/pjtg/` is vendored verbatim from upstream (MIT, attribution in
 * UPSTREAM-LICENSE): 18 `.prisma` schemas and 18 matching `.test-d.ts`. This file
 * generates PZG schemas from each schema and translates the assertions:
 *
 *   expectAssignable<Model>(v)     ->  the emitted schema `.parse(v)` succeeds
 *   expectNotAssignable<Model>(v)  ->  the emitted schema `.parse(v)` throws
 *
 * Three rules keep the score honest.
 *
 * 1. Every case runs against a schema PZG actually emitted, imported and executed.
 *    Not against the converter, not against emitted text.
 * 2. A rejection must fail *for upstream's reason*. Each reject case names the field
 *    upstream mutated, and the ZodError has to carry an issue on that path. Without
 *    this, a case can pass because some unrelated field is wrong, which is the
 *    failure mode this repo keeps finding.
 * 3. Where PZG does not match upstream the row is marked `gap` with a reason, and it
 *    still runs: the suite then asserts the *current* behaviour. A gap that gets
 *    fixed turns the suite red and forces the list to be updated, so the gap list
 *    cannot rot and no case is ever deleted or loosened to make the suite green.
 *
 * The scoreboard at the bottom pins the tallies, so a gap cannot be added quietly.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convertTsTypeToZod } from '../src/typed-json';
import { GENERATION_TIMEOUT, TestEnvironment } from './helpers';

const CORPUS_SCHEMAS = join(__dirname, 'compat', 'pjtg', 'schemas');

/* -------------------------------------------------------------------------- */
/* Case model                                                                  */
/* -------------------------------------------------------------------------- */

interface Case {
  /**
   * `<dir>/<name>` under the generated output. `models/Model` is the model output
   * type upstream calls `Model`; `objects/XCreateInput` is `Prisma.XCreateInput`;
   * `results/XGroupByResult` is `XGroupByOutputType`.
   */
  target: string;
  /** upstream's verdict, translated. */
  expect: 'accept' | 'reject';
  value: unknown;
  /**
   * The field upstream made invalid. A rejection that does not name this path did
   * not reject for upstream's reason and is not counted as a match.
   */
  at?: string;
  /** The upstream assertion this row came from. */
  from: string;
  /** Set when the row is not a verbatim expectAssignable/expectNotAssignable. */
  derived?: string;
  /**
   * Set when PZG does not reach upstream's verdict. The row still runs and the
   * suite asserts the opposite outcome, so the gap is pinned rather than skipped.
   */
  gap?: string;
  /**
   * Set when the gap is open **by configuration rather than by omission**: the named
   * option closes it. The corpus is scored again with that option on, and there the row
   * is asserted to *match* upstream, so "the flag closes this" is executed against
   * generated schemas rather than claimed in a comment.
   */
  closedBy?: 'applyToResults';
}

interface CorpusFile {
  /** file name under tests/compat/pjtg/schemas */
  file: string;
  /**
   * The `declare global { namespace ... }` block from the matching `.test-d.ts`,
   * as TypeScript source. PZG's own converter turns these into the schema module
   * the annotations resolve against, so the module cannot be hand-tuned to be
   * more or less permissive than the type upstream declared.
   */
  namespaceTypes?: Record<string, string>;
  /** Extra typedJson config for this schema. */
  typedJson?: Record<string, unknown>;
  cases: Case[];
}

/* -------------------------------------------------------------------------- */
/* Modes                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The corpus is scored twice and both numbers matter.
 *
 * `default` is what a `typedJson` block gives you with nothing else set, and it is the
 * honest headline. `applyToResults` is the ceiling: the same corpus, the same assertions,
 * with the one flag that opts the read path in. Scoring only the first would let the flag
 * rot unmeasured; publishing only the second would advertise a number nobody gets out of
 * the box.
 *
 * Both modes run every case. A mode never drops an assertion. It moves the rows carrying
 * its `closes` marker from "pinned as a gap" to "must match upstream", which is a strictly
 * stronger claim about those rows and leaves every other row asserted exactly as before.
 */
interface Mode {
  /** Distinguishes the generated output directories. */
  key: string;
  /** Merged into every corpus file's `typedJson` block. */
  typedJson: Record<string, unknown>;
  /** Gap rows this mode closes. */
  closes?: Case['closedBy'];
}

const DEFAULT_MODE: Mode = { key: 'default', typedJson: {} };

const APPLY_TO_RESULTS_MODE: Mode = {
  key: 'apply-to-results',
  typedJson: { applyToResults: true },
  closes: 'applyToResults',
};

/** The gap this row still has under this mode, if any. */
function gapIn(testCase: Case, mode: Mode): string | undefined {
  if (!testCase.gap) return undefined;
  if (mode.closes && testCase.closedBy === mode.closes) return undefined;
  return testCase.gap;
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                  */
/* -------------------------------------------------------------------------- */

interface GeneratedCorpus {
  schemasDir: string;
  stdout: string;
  stderr: string;
}

/** Replace the corpus's own generator blocks with a client and PZG. */
function rewriteGenerators(source: string, outputDir: string): string {
  const models = source.replace(/generator\s+\w+\s*\{[^}]*\}\s*/g, '');
  return `generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${outputDir}/schemas"
  config   = "./config.json"
}

${models}`;
}

/** The hand-authored schema module, written from upstream's declared types. */
function buildSchemaModule(types: Record<string, string>): string {
  const lines = ["import * as z from 'zod';", ''];
  for (const [name, typeText] of Object.entries(types)) {
    const converted = convertTsTypeToZod(typeText);
    if (!converted.ok) {
      throw new Error(`corpus type ${name} (${typeText}) did not convert: ${converted.reason}`);
    }
    lines.push(`export const ${name}Schema = ${converted.expression};`);
  }
  return `${lines.join('\n')}\n`;
}

async function generateCorpus(corpus: CorpusFile, mode: Mode): Promise<GeneratedCorpus> {
  const envName = `pjtg-${mode.key}-${corpus.file.replace(/\.prisma$/, '')}`;
  const env = await TestEnvironment.createTestEnv(envName);

  const source = readFileSync(join(CORPUS_SCHEMAS, corpus.file), 'utf8');
  writeFileSync(env.schemaPath, rewriteGenerators(source, env.outputDir));
  writeFileSync(
    join(env.testDir, 'config.json'),
    JSON.stringify(
      {
        mode: 'full',
        pureModels: true,
        typedJson: {
          schemaModule: './json-types',
          schemaSuffix: 'Schema',
          ...(corpus.typedJson ?? {}),
          ...mode.typedJson,
        },
      },
      null,
      2,
    ),
  );

  const { stdout, stderr } = await env.runGenerationWithOutput();

  // Written after generation so the output directory's cleanup never sees it.
  const schemasDir = join(env.outputDir, 'schemas');
  mkdirSync(schemasDir, { recursive: true });
  writeFileSync(join(schemasDir, 'json-types.ts'), buildSchemaModule(corpus.namespaceTypes ?? {}));

  return { schemasDir, stdout, stderr };
}

/* -------------------------------------------------------------------------- */
/* Executing a case                                                            */
/* -------------------------------------------------------------------------- */

const loaded = new Map<string, Promise<z.ZodType>>();

function exportNameFor(dir: string, name: string): string {
  return dir === 'objects' ? `${name}ObjectZodSchema` : `${name}Schema`;
}

function loadTarget(schemasDir: string, target: string): Promise<z.ZodType> {
  const key = `${schemasDir}::${target}`;
  const cached = loaded.get(key);
  if (cached) return cached;

  const [dir, name] = target.split('/');
  const file = join(schemasDir, dir, `${name}.schema.ts`);
  const pending = (async () => {
    if (!existsSync(file)) throw new Error(`PZG emitted no ${target} (looked for ${file})`);
    const mod = (await import(file)) as Record<string, unknown>;
    const exportName = exportNameFor(dir, name);
    const schema = mod[exportName];
    if (!schema) {
      throw new Error(
        `${target} has no export ${exportName}; it exports ${Object.keys(mod).join(', ')}`,
      );
    }
    return schema as z.ZodType;
  })();

  loaded.set(key, pending);
  return pending;
}

/** Every path segment named by a ZodError, including issues nested in unions. */
function issuePaths(error: z.ZodError): string[] {
  const segments: string[] = [];
  const walk = (issues: readonly z.core.$ZodIssue[]): void => {
    for (const issue of issues) {
      for (const part of issue.path ?? []) segments.push(String(part));
      const nested = (issue as { errors?: (readonly z.core.$ZodIssue[])[] }).errors;
      if (Array.isArray(nested)) for (const group of nested) walk(group);
    }
  };
  walk(error.issues);
  return segments;
}

type Outcome =
  | { kind: 'accepted' }
  | { kind: 'rejected'; paths: string[]; message: string }
  | { kind: 'threw'; error: unknown };

function run(schema: z.ZodType, value: unknown): Outcome {
  try {
    schema.parse(value);
    return { kind: 'accepted' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { kind: 'rejected', paths: issuePaths(error), message: error.message };
    }
    return { kind: 'threw', error };
  }
}

/** Did PZG reach upstream's verdict, for upstream's reason? */
function matchesUpstream(testCase: Case, outcome: Outcome): boolean {
  if (outcome.kind === 'threw') return false;
  if (testCase.expect === 'accept') return outcome.kind === 'accepted';
  if (outcome.kind !== 'rejected') return false;
  return testCase.at === undefined || outcome.paths.includes(testCase.at);
}

/* -------------------------------------------------------------------------- */
/* The corpus                                                                  */
/* -------------------------------------------------------------------------- */

/** `PNormalJson.Simple` etc. are the same three types in five corpus files. */
const SIMPLE_OPTIONAL_LIST = { Simple: '1', Optional: '2', List: '3' };
const WITH_TYPE = { WithType: `'C' | 'D'` };

/**
 * Five result-schema rows, under the two reasons below, are open **by configuration rather
 * than by omission**.
 *
 * `typedJson.applyToResults` closes all five - measured, in the `applyToResults` mode of
 * this suite, not asserted here. It defaults to false on purpose: result schemas are
 * emitted by default, so typing them by default would change the read path for everyone
 * who turns `typedJson` on, and a row written before the annotation existed would start
 * throwing. The headline score therefore generates with the default, so it reflects what a
 * user gets out of the box rather than the best PZG can be configured to do.
 */
const RESULTS_NOT_OPTED_IN =
  'typedJson.applyToResults defaults to false, so result schemas keep the column scalar type; the corpus generates with the default';

const AGGREGATE_NOT_NARROWED = `min/max aggregate results are not narrowed: ${RESULTS_NOT_OPTED_IN}`;

const RESULT_JSON_UNTYPED = `result schemas emit z.unknown() for Json columns: ${RESULTS_NOT_OPTED_IN}`;

/**
 * Measured, not assumed: parsing the emitted `ModelGroupByResult` with one aggregate slot
 * set to null at a time rejects `_count` and accepts `_avg`, `_sum`, `_min` and `_max`,
 * which the emitter writes as `.nullable().optional()`. `_count` alone is `.optional()`.
 */
const GROUPBY_COUNT_NOT_NULLABLE =
  "PZG's groupBy result marks _count optional but not nullable (the other four aggregate slots are both), so upstream's explicit _count: null is rejected";

const UPSTREAM_CONTRADICTION =
  "upstream's client is emitted under @ts-nocheck, where expectNotAssignable never fires; this row is a copy of the accept case above it and asserts that a valid value is invalid";

/** Model output type rows shared by literal/normal/normal-prisma-client/use-type. */
function simpleOptionalListModelCases(prefix: string): Case[] {
  return [
    {
      target: 'models/Model',
      expect: 'accept',
      value: { id: 0, simple: 1, optional: 2, list: [3] },
      from: `${prefix}: expectAssignable<Model>({ simple: 1, optional: 2, list: [3] })`,
    },
    {
      target: 'models/Model',
      expect: 'accept',
      value: { id: 0, simple: 1, optional: null, list: [3] },
      from: `${prefix}: expectAssignable<Model>({ optional: null })`,
    },
    {
      target: 'models/Model',
      expect: 'accept',
      value: { id: 0, simple: 1, optional: null, list: [] },
      from: `${prefix}: expectAssignable<Model>({ list: [] })`,
    },
    {
      target: 'models/Model',
      expect: 'accept',
      value: { id: 0, simple: 1, optional: 2, list: [3, 3, 3] },
      from: `${prefix}: expectAssignable<Model>({ list: [3, 3, 3] })`,
    },
    {
      target: 'models/Model',
      expect: 'reject',
      at: 'simple',
      value: { id: 0, simple: '1', optional: 2, list: [3] },
      from: `${prefix}: expectNotAssignable<Model>({ simple: '1' })`,
    },
    {
      target: 'models/Model',
      expect: 'reject',
      at: 'optional',
      value: { id: 0, simple: 1, optional: '2', list: [3] },
      from: `${prefix}: expectNotAssignable<Model>({ optional: '2' })`,
    },
    {
      target: 'models/Model',
      expect: 'reject',
      at: 'optional',
      value: { id: 0, simple: 1, optional: 'undefined', list: 3 },
      from: `${prefix}: expectNotAssignable<Model>({ optional: 'undefined', list: 3 })`,
    },
    {
      target: 'models/Model',
      expect: 'reject',
      at: 'list',
      value: { id: 0, simple: 1, optional: 2, list: '3,3,3' },
      from: `${prefix}: expectNotAssignable<Model>({ list: '3,3,3' })`,
    },
  ];
}

/** UpdateManyInput<Model['list'][number]> rows, shared by four corpus files. */
function listWrapperCases(prefix: string): Case[] {
  const target = 'objects/ModelUpdatelistInput';
  return [
    {
      target,
      expect: 'accept',
      value: { push: 3 },
      from: `${prefix}: expectAssignable<UpdateManyInput>({ push: 3 })`,
    },
    {
      target,
      expect: 'accept',
      value: { push: [] },
      from: `${prefix}: expectAssignable<UpdateManyInput>({ push: [] })`,
    },
    {
      target,
      expect: 'accept',
      value: { push: [3] },
      from: `${prefix}: expectAssignable<UpdateManyInput>({ push: [3] })`,
    },
    {
      target,
      expect: 'accept',
      value: { push: [3, 3, 3] },
      from: `${prefix}: expectAssignable<UpdateManyInput>({ push: [3, 3, 3] })`,
    },
    {
      target,
      expect: 'accept',
      value: { set: [] },
      from: `${prefix}: expectAssignable<UpdateManyInput>({ set: [] })`,
    },
    {
      target,
      expect: 'accept',
      value: { set: [3] },
      from: `${prefix}: expectAssignable<UpdateManyInput>({ set: [3] })`,
    },
    {
      target,
      expect: 'accept',
      value: { set: [3, 3, 3] },
      from: `${prefix}: expectAssignable<UpdateManyInput>({ set: [3, 3, 3] })`,
    },
    {
      target,
      expect: 'reject',
      at: 'push',
      value: { push: '3' },
      from: `${prefix}: expectNotAssignable<UpdateManyInput>({ push: '3' })`,
    },
    {
      target,
      expect: 'reject',
      at: 'push',
      value: { push: ['3'] },
      from: `${prefix}: expectNotAssignable<UpdateManyInput>({ push: ['3'] })`,
    },
    {
      target,
      expect: 'reject',
      at: 'set',
      value: { set: 3 },
      from: `${prefix}: expectNotAssignable<UpdateManyInput>({ set: 3 })`,
    },
    {
      target,
      expect: 'reject',
      at: 'set',
      value: { set: '3' },
      from: `${prefix}: expectNotAssignable<UpdateManyInput>({ set: '3' })`,
    },
    {
      target,
      expect: 'reject',
      at: 'set',
      value: { set: ['3,3,3'] },
      from: `${prefix}: expectNotAssignable<UpdateManyInput>({ set: ['3,3,3'] })`,
    },
  ];
}

/** Text model rows, shared by cockroach/mysql/mssql/sqlite/mongo. */
function textCases(prefix: string, id: unknown): Case[] {
  return [
    {
      target: 'models/Text',
      expect: 'accept',
      value: { id, untyped: '', typed: 'C', literal: 'A' },
      from: `${prefix}: expectType<Text>({ typed: 'C', literal: 'A' })`,
      derived: 'expectType asserts type identity; the value itself is asserted valid',
    },
    {
      target: 'models/Text',
      expect: 'reject',
      at: 'literal',
      value: { id, untyped: 'Arthur', typed: 'D', literal: 'D' },
      from: `${prefix}: expectNotType<Text>({ typed: 'D' as string, literal: 'D' as string })`,
      derived:
        "expectNotType fails on the widening to string, which has no runtime counterpart; what does have one is literal: 'D', outside 'A' | 'B'",
    },
  ];
}

const CORPUS: CorpusFile[] = [
  /* ---------------------------------------------------------------- array */
  {
    file: 'array.prisma',
    cases: [
      {
        target: 'models/Model',
        expect: 'accept',
        value: { id: 0, array: [[[[1, 2, 3]], [[4, 5, 6]]]] },
        from: 'array.test-d.ts: expectAssignable<Model>({ array: [[[[1,2,3]],[[4,5,6]]]] })',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'array',
        value: { id: 0, array: [[[[1, 2, 3]], [[4, 5, '6']]]] },
        from: "array.test-d.ts: expectNotAssignable<Model>({ array: [[[[1,2,3]],[[4,5,'6']]]] })",
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'array',
        value: {
          id: 0,
          array: [
            [
              [
                [1, 2, 3],
                [4, 5, 6],
              ],
            ],
          ],
        },
        from: 'array.test-d.ts: expectNotAssignable<Model>({ array: [[[[1,2,3],[4,5,6]]]] })',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'array',
        value: { id: 0, array: ['asd'] },
        from: "array.test-d.ts: expectNotAssignable<Model>({ array: ['asd'] })",
      },
    ],
  },

  /* -------------------------------------------------------------- literal */
  {
    file: 'literal.prisma',
    cases: [
      ...simpleOptionalListModelCases('literal.test-d.ts'),
      ...listWrapperCases('literal.test-d.ts'),
    ],
  },

  /* --------------------------------------------------------------- normal */
  {
    file: 'normal.prisma',
    namespaceTypes: {
      ...SIMPLE_OPTIONAL_LIST,
      SampleJson: '{ a: number; b: string }',
    },
    cases: [
      ...simpleOptionalListModelCases('normal.test-d.ts'),
      ...listWrapperCases('normal.test-d.ts'),
      {
        target: 'results/ModelGroupByResult',
        expect: 'accept',
        value: [
          {
            id: 0,
            simple: 1,
            optional: 2,
            list: [3],
            _count: null,
            _avg: null,
            _sum: null,
            _min: null,
            _max: null,
          },
        ],
        from: 'normal.test-d.ts: expectAssignable<ModelGroupByOutputType>({ simple: 1, optional: 2, list: [3], _count: null, ... })',
        derived: 'the groupBy result schema is an array, so the row is wrapped in one',
        gap: GROUPBY_COUNT_NOT_NULLABLE,
      },
      {
        target: 'results/ModelGroupByResult',
        expect: 'accept',
        value: [
          {
            id: 0,
            simple: 1,
            optional: null,
            list: [3, 3, 3],
            _count: null,
            _avg: null,
            _sum: null,
            _min: null,
            _max: null,
          },
        ],
        from: 'normal.test-d.ts: expectAssignable<ModelGroupByOutputType>({ optional: null, list: [3,3,3], _count: null, ... })',
        derived: 'the groupBy result schema is an array, so the row is wrapped in one',
        gap: GROUPBY_COUNT_NOT_NULLABLE,
      },
      {
        target: 'results/ModelGroupByResult',
        expect: 'reject',
        at: 'simple',
        value: [{ id: 0, simple: '1', optional: 2, list: [3] }],
        from: "normal.test-d.ts: expectNotAssignable<ModelGroupByOutputType>({ simple: '1' })",
        derived: 'the aggregate slots are dropped so the row fails on simple, not on _count',
        gap: RESULT_JSON_UNTYPED,
        closedBy: 'applyToResults',
      },
      {
        target: 'results/ModelGroupByResult',
        expect: 'reject',
        at: 'optional',
        value: [{ id: 0, simple: 1, optional: '2', list: [3] }],
        from: "normal.test-d.ts: expectNotAssignable<ModelGroupByOutputType>({ optional: '2' })",
        derived: 'the aggregate slots are dropped so the row fails on optional, not on _count',
        gap: RESULT_JSON_UNTYPED,
        closedBy: 'applyToResults',
      },
      {
        target: 'results/ModelGroupByResult',
        expect: 'reject',
        at: 'list',
        value: [{ id: 0, simple: 1, optional: 2, list: ['3'] }],
        from: "normal.test-d.ts: expectNotAssignable<ModelGroupByOutputType>({ list: ['3'] })",
        derived: 'the aggregate slots are dropped so the row fails on list, not on _count',
        gap: RESULT_JSON_UNTYPED,
        closedBy: 'applyToResults',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'accept',
        value: { _count: { id: 1, simple: 1, optional: 1, list: 1, _all: 1 } },
        from: 'normal.test-d.ts: expectAssignable<ModelCountAggregateOutputType>({ simple: 1, optional: 1, list: 1, _all: 1 })',
        derived: 'the count aggregate lives under _count on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'reject',
        at: 'simple',
        value: { _count: { id: 1, simple: '1', optional: 1, list: 1 } },
        from: 'normal.test-d.ts: expectType<number>(modelCount.simple)',
        derived: 'a count column staying numeric is asserted by rejecting a non-number',
      },
      {
        target: 'results/ordersAggregateResult',
        expect: 'accept',
        value: { _count: { id: 1, meta: 1, _all: 1 } },
        from: 'normal.test-d.ts: expectAssignable<OrdersCountAggregateOutputType>({ meta: 1, _all: 1 })',
        derived: 'the count aggregate lives under _count on the aggregate result schema',
      },
      {
        target: 'results/ordersAggregateResult',
        expect: 'reject',
        at: 'meta',
        value: { _count: { id: 1, meta: '1' } },
        from: 'normal.test-d.ts: expectType<number>(ordersCount.meta)',
        derived: 'a count column staying numeric is asserted by rejecting a non-number',
      },
      {
        target: 'models/orders',
        expect: 'accept',
        value: { id: 0, meta: { a: 1, b: 'x' } },
        from: 'normal.test-d.ts: expectType<PNormalJson.SampleJson | null>(aggregate.meta)',
        derived:
          'the groupBy client typing has no runtime counterpart; what does is that meta validates as SampleJson',
      },
      {
        target: 'models/orders',
        expect: 'reject',
        at: 'meta',
        value: { id: 0, meta: { a: '1', b: 'x' } },
        from: 'normal.test-d.ts: expectType<number>(aggregate.meta.a)',
        derived: 'the nested property typing is asserted by rejecting a wrong nested type',
      },
    ],
  },

  /* -------------------------------------------------- normal-prisma-client */
  {
    file: 'normal-prisma-client.prisma',
    namespaceTypes: SIMPLE_OPTIONAL_LIST,
    cases: [
      ...simpleOptionalListModelCases('normal-prisma-client.test-d.ts'),
      ...listWrapperCases('normal-prisma-client.test-d.ts'),
      {
        target: 'objects/SubModelUncheckedUpdateManyWithoutModelInput',
        expect: 'accept',
        value: { simple: 1 },
        from: "normal-prisma-client.test-d.ts: expectAssignable<SubModelUncheckedUpdateManyWithoutModelInput['simple']>(1)",
        derived: 'the field assertion is run as a one-key object against the input schema',
      },
      {
        target: 'objects/SubModelUncheckedUpdateManyWithoutModelInput',
        expect: 'reject',
        at: 'simple',
        value: { simple: 2 },
        from: "normal-prisma-client.test-d.ts: expectNotAssignable<SubModelUncheckedUpdateManyWithoutModelInput['simple']>(2)",
        derived: 'the field assertion is run as a one-key object against the input schema',
      },
    ],
  },

  /* --------------------------------------------------------------- string */
  {
    file: 'string.prisma',
    namespaceTypes: { ...WITH_TYPE, StringArrayType: `'foo' | 'bar'` },
    cases: [
      {
        target: 'models/Model',
        expect: 'accept',
        value: { id: 0, untyped: '', typed: 'C', literal: 'A' },
        from: "string.test-d.ts: expectType<Model>({ typed: 'C', literal: 'A' })",
        derived: 'expectType asserts type identity; the value itself is asserted valid',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'literal',
        value: { id: 0, untyped: 'Mesquita', typed: 'D', literal: 'D' },
        from: "string.test-d.ts: expectNotType<Model>({ typed: 'D' as string, literal: 'D' as string })",
        derived:
          "expectNotType fails on the widening to string, which has no runtime counterpart; what does have one is literal: 'D', outside 'A' | 'B'",
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'accept',
        value: { typed: 'C' },
        from: "string.test-d.ts: expectAssignable<ModelUpdateInput>({ typed: 'C' })",
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'accept',
        value: { typed: { set: 'D' } },
        from: "string.test-d.ts: expectAssignable<ModelUpdateInput>({ typed: { set: 'D' } })",
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'accept',
        value: { literal: 'A' },
        from: "string.test-d.ts: expectAssignable<ModelUpdateInput>({ literal: 'A' })",
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'accept',
        value: { literal: { set: 'B' } },
        from: "string.test-d.ts: expectAssignable<ModelUpdateInput>({ literal: { set: 'B' } })",
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'reject',
        at: 'typed',
        value: { typed: 'invalid' },
        from: "string.test-d.ts: expectNotAssignable<ModelUpdateInput>({ typed: 'invalid' })",
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'reject',
        at: 'typed',
        value: { typed: { set: 'invalid' } },
        from: "string.test-d.ts: expectNotAssignable<ModelUpdateInput>({ typed: { set: 'invalid' } })",
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'reject',
        at: 'literal',
        value: { literal: 'invalid' },
        from: "string.test-d.ts: expectNotAssignable<ModelUpdateInput>({ literal: 'invalid' })",
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'reject',
        at: 'literal',
        value: { literal: { set: 'invalid' } },
        from: "string.test-d.ts: expectNotAssignable<ModelUpdateInput>({ literal: { set: 'invalid' } })",
      },
      {
        target: 'models/StringArrayModel',
        expect: 'accept',
        value: { id: '123e4567-e89b-12d3-a456-426614174000', tags: ['foo', 'bar'] },
        from: "string.test-d.ts: expectAssignable<StringArrayModel>({ tags: ['foo', 'bar'] })",
      },
      {
        target: 'models/StringArrayModel',
        expect: 'reject',
        at: 'tags',
        value: { id: '123e4567-e89b-12d3-a456-426614174000', tags: ['invalid'] },
        from: "string.test-d.ts: expectNotAssignable<StringArrayModel>({ tags: ['invalid'] })",
      },
      {
        target: 'objects/StringArrayModelCreateInput',
        expect: 'accept',
        value: { tags: ['foo'] },
        from: "string.test-d.ts: expectAssignable<StringArrayModelCreateInput>({ tags: ['foo'] })",
      },
      {
        target: 'objects/StringArrayModelCreateInput',
        expect: 'accept',
        value: { tags: { set: ['bar'] } },
        from: "string.test-d.ts: expectAssignable<StringArrayModelCreateInput>({ tags: { set: ['bar'] } })",
      },
      {
        target: 'objects/StringArrayModelCreateInput',
        expect: 'reject',
        at: 'tags',
        value: { tags: ['invalid'] },
        from: "string.test-d.ts: expectNotAssignable<StringArrayModelCreateInput>({ tags: ['invalid'] })",
      },
      {
        target: 'objects/StringArrayModelCreateInput',
        expect: 'reject',
        at: 'tags',
        value: { tags: { set: ['invalid'] } },
        from: "string.test-d.ts: expectNotAssignable<StringArrayModelCreateInput>({ tags: { set: ['invalid'] } })",
      },
      {
        target: 'objects/StringArrayModelUpdateInput',
        expect: 'accept',
        value: { tags: ['foo', 'bar'] },
        from: "string.test-d.ts: expectAssignable<StringArrayModelUpdateInput>({ tags: ['foo', 'bar'] })",
      },
      {
        target: 'objects/StringArrayModelUpdateInput',
        expect: 'accept',
        value: { tags: { set: ['foo'] } },
        from: "string.test-d.ts: expectAssignable<StringArrayModelUpdateInput>({ tags: { set: ['foo'] } })",
      },
      {
        target: 'objects/StringArrayModelUpdateInput',
        expect: 'reject',
        at: 'tags',
        value: { tags: ['invalid'] },
        from: "string.test-d.ts: expectNotAssignable<StringArrayModelUpdateInput>({ tags: ['invalid'] })",
      },
      {
        target: 'objects/StringArrayModelUpdateInput',
        expect: 'reject',
        at: 'tags',
        value: { tags: { set: ['invalid'] } },
        from: "string.test-d.ts: expectNotAssignable<StringArrayModelUpdateInput>({ tags: { set: ['invalid'] } })",
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'accept',
        value: { _count: { id: 1, untyped: 1, typed: 1, literal: 1, _all: 1 } },
        from: 'string.test-d.ts: expectAssignable<ModelCountAggregateOutputType>({ typed: 1, literal: 1, _all: 1 })',
        derived: 'the count aggregate lives under _count on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'accept',
        value: { _min: { id: 1, untyped: 'A', typed: 'C', literal: 'A' } },
        from: "string.test-d.ts: expectAssignable<ModelMinAggregateOutputType>({ typed: 'C', literal: 'A' })",
        derived: 'the min aggregate lives under _min on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'accept',
        value: { _max: { id: 1, untyped: 'Z', typed: 'D', literal: 'B' } },
        from: "string.test-d.ts: expectAssignable<ModelMaxAggregateOutputType>({ typed: 'D', literal: 'B' })",
        derived: 'the max aggregate lives under _max on the aggregate result schema',
      },
      {
        target: 'results/StringArrayModelAggregateResult',
        expect: 'accept',
        value: { _count: { id: 1, tags: 1, _all: 1 } },
        from: 'string.test-d.ts: expectAssignable<StringArrayModelCountAggregateOutputType>({ tags: 1, _all: 1 })',
        derived: 'the count aggregate lives under _count on the aggregate result schema',
      },
    ],
  },

  /* --------------------------------------------------------------- number */
  {
    file: 'number.prisma',
    namespaceTypes: {
      Price: '100 | 200 | 300',
      NullablePrice: '50 | 100',
      FloatPrice: '1.5 | 2.5 | 3.5',
      Config: '{ tier: string; enabled: boolean }',
    },
    cases: [
      {
        target: 'models/Model',
        expect: 'accept',
        value: {
          id: 0,
          price: 100,
          nullablePrice: null,
          floatPrice: 1.5,
          config: { tier: 'basic', enabled: true },
        },
        from: 'number.test-d.ts: expectAssignable<Model>({ price: 100, nullablePrice: null, floatPrice: 1.5, config: {...} })',
      },
      {
        target: 'models/Model',
        expect: 'accept',
        value: { id: 0, price: 200, nullablePrice: 50, floatPrice: 2.5, config: null },
        from: 'number.test-d.ts: expectAssignable<Model>({ price: 200, nullablePrice: 50, floatPrice: 2.5, config: null })',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'price',
        value: { id: 0, price: 999, nullablePrice: null, floatPrice: 1.5, config: null },
        from: 'number.test-d.ts: expectNotAssignable<Model>({ price: 999 })',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'nullablePrice',
        value: { id: 0, price: 100, nullablePrice: 25, floatPrice: 1.5, config: null },
        from: 'number.test-d.ts: expectNotAssignable<Model>({ nullablePrice: 25 })',
      },
      {
        target: 'objects/ModelCreateInput',
        expect: 'accept',
        value: {
          price: 100,
          nullablePrice: 50,
          floatPrice: 1.5,
          config: { tier: 'basic', enabled: true },
        },
        from: 'number.test-d.ts: expectAssignable<ModelCreateInput>({ price: 100, nullablePrice: 50, floatPrice: 1.5, config: {...} })',
      },
      {
        target: 'objects/ModelCreateInput',
        expect: 'accept',
        value: { price: 100, floatPrice: 1.5 },
        from: 'number.test-d.ts: expectAssignable<ModelCreateInput>({ price: 100, floatPrice: 1.5 })',
      },
      {
        target: 'objects/ModelCreateInput',
        expect: 'reject',
        at: 'price',
        value: { price: 400, floatPrice: 1.5 },
        from: 'number.test-d.ts: expectNotAssignable<ModelCreateInput>({ price: 400 })',
      },
      {
        target: 'objects/ModelCreateInput',
        expect: 'reject',
        at: 'floatPrice',
        value: { price: 100, floatPrice: 99.9 },
        from: 'number.test-d.ts: expectNotAssignable<ModelCreateInput>({ floatPrice: 99.9 })',
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'accept',
        value: { price: 200 },
        from: 'number.test-d.ts: expectAssignable<ModelUpdateInput>({ price: 200 })',
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'accept',
        value: { nullablePrice: 100 },
        from: 'number.test-d.ts: expectAssignable<ModelUpdateInput>({ nullablePrice: 100 })',
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'accept',
        value: { floatPrice: 2.5 },
        from: 'number.test-d.ts: expectAssignable<ModelUpdateInput>({ floatPrice: 2.5 })',
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'accept',
        value: { config: { tier: 'premium', enabled: false } },
        from: 'number.test-d.ts: expectAssignable<ModelUpdateInput>({ config: { tier: premium, enabled: false } })',
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'accept',
        value: { nullablePrice: null },
        from: 'number.test-d.ts: expectAssignable<ModelUpdateInput>({ nullablePrice: null })',
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'reject',
        at: 'price',
        value: { price: 999 },
        from: 'number.test-d.ts: expectNotAssignable<ModelUpdateInput>({ price: 999 })',
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'reject',
        at: 'floatPrice',
        value: { floatPrice: 0.5 },
        from: 'number.test-d.ts: expectNotAssignable<ModelUpdateInput>({ floatPrice: 0.5 })',
      },
      {
        target: 'objects/ModelUpdateInput',
        expect: 'reject',
        at: 'nullablePrice',
        value: { nullablePrice: 25 },
        from: 'number.test-d.ts: expectNotAssignable<ModelUpdateInput>({ nullablePrice: 25 })',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'reject',
        at: 'price',
        value: { price: 400 },
        from: 'number.test-d.ts: expectNotAssignable<ModelWhereInput>({ price: 400 })',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'reject',
        at: 'floatPrice',
        value: { floatPrice: 4.5 },
        from: 'number.test-d.ts: expectNotAssignable<ModelWhereInput>({ floatPrice: 4.5 })',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'reject',
        at: 'nullablePrice',
        value: { nullablePrice: 75 },
        from: 'number.test-d.ts: expectNotAssignable<ModelWhereInput>({ nullablePrice: 75 })',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'accept',
        value: { price: { gt: 100 } },
        from: 'number.test-d.ts: expectAssignable<ModelWhereInput>({ price: { gt: 100 } })',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'accept',
        value: { floatPrice: { gte: 1.5 } },
        from: 'number.test-d.ts: expectAssignable<ModelWhereInput>({ floatPrice: { gte: 1.5 } })',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'accept',
        value: { nullablePrice: { not: null } },
        from: 'number.test-d.ts: expectAssignable<ModelWhereInput>({ nullablePrice: { not: null } })',
      },
      {
        target: 'objects/ModelScalarWhereWithAggregatesInput',
        expect: 'accept',
        value: { price: { gt: 100 } },
        from: 'number.test-d.ts: expectAssignable<ModelScalarWhereWithAggregatesInput>({ price: { gt: 100 } })',
      },
      {
        target: 'objects/ModelScalarWhereWithAggregatesInput',
        expect: 'accept',
        value: { floatPrice: { gte: 1.5 } },
        from: 'number.test-d.ts: expectAssignable<ModelScalarWhereWithAggregatesInput>({ floatPrice: { gte: 1.5 } })',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'accept',
        value: {
          _count: { id: 1, price: 1, nullablePrice: 1, floatPrice: 1, config: 1, _all: 1 },
        },
        from: 'number.test-d.ts: expectAssignable<ModelCountAggregateOutputType>({ ... })',
        derived: 'the count aggregate lives under _count on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'reject',
        at: 'price',
        value: {
          _count: { id: 1, price: '1', nullablePrice: 1, floatPrice: 1, config: 1 },
        },
        from: "number.test-d.ts: expectNotAssignable<ModelCountAggregateOutputType>({ price: '1' })",
        derived: 'the count aggregate lives under _count on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'accept',
        value: { _avg: { id: 1, price: 123, nullablePrice: null, floatPrice: 1.25 } },
        from: 'number.test-d.ts: expectAssignable<ModelAvgAggregateOutputType>({ price: 123, floatPrice: 1.25 })',
        derived: 'the avg aggregate lives under _avg on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'reject',
        at: 'price',
        value: { _avg: { id: 1, price: '123', nullablePrice: null, floatPrice: 1.25 } },
        from: "number.test-d.ts: expectNotAssignable<ModelAvgAggregateOutputType>({ price: '123' })",
        derived: 'the avg aggregate lives under _avg on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'accept',
        value: { _sum: { id: 1, price: 123, nullablePrice: null, floatPrice: 2.75 } },
        from: 'number.test-d.ts: expectAssignable<ModelSumAggregateOutputType>({ price: 123, floatPrice: 2.75 })',
        derived: 'the sum aggregate lives under _sum on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'reject',
        at: 'floatPrice',
        value: { _sum: { id: 1, price: 123, nullablePrice: null, floatPrice: '2.75' } },
        from: "number.test-d.ts: expectNotAssignable<ModelSumAggregateOutputType>({ floatPrice: '2.75' })",
        derived: 'the sum aggregate lives under _sum on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'accept',
        value: { _min: { id: 1, price: 100, nullablePrice: 50, floatPrice: 1.5 } },
        from: 'number.test-d.ts: expectAssignable<ModelMinAggregateOutputType>({ price: 100, nullablePrice: 50, floatPrice: 1.5 })',
        derived: 'the min aggregate lives under _min on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'reject',
        at: 'price',
        value: { _min: { id: 1, price: 123, nullablePrice: 75, floatPrice: 2.25 } },
        from: 'number.test-d.ts: expectNotAssignable<ModelMinAggregateOutputType>({ price: 123, nullablePrice: 75, floatPrice: 2.25 })',
        derived: 'the min aggregate lives under _min on the aggregate result schema',
        gap: AGGREGATE_NOT_NARROWED,
        closedBy: 'applyToResults',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'accept',
        value: { _max: { id: 1, price: 300, nullablePrice: 100, floatPrice: 3.5 } },
        from: 'number.test-d.ts: expectAssignable<ModelMaxAggregateOutputType>({ price: 300, nullablePrice: 100, floatPrice: 3.5 })',
        derived: 'the max aggregate lives under _max on the aggregate result schema',
      },
      {
        target: 'results/ModelAggregateResult',
        expect: 'reject',
        at: 'price',
        value: { _max: { id: 1, price: 999, nullablePrice: 75, floatPrice: 9.75 } },
        from: 'number.test-d.ts: expectNotAssignable<ModelMaxAggregateOutputType>({ price: 999, nullablePrice: 75, floatPrice: 9.75 })',
        derived: 'the max aggregate lives under _max on the aggregate result schema',
        gap: AGGREGATE_NOT_NARROWED,
        closedBy: 'applyToResults',
      },
    ],
  },

  /* ------------------------------------------------------------- nullable */
  {
    file: 'nullable.prisma',
    namespaceTypes: { TestJsonType: '{ foo: string; bar: number }' },
    cases: [
      {
        target: 'objects/ModelCreateInput',
        expect: 'accept',
        value: {
          testInt: 42,
          testString: 'hello',
          testBoolean: true,
          testFloat: 3.14,
          testDateTime: new Date(),
          testDecimal: '123.45',
          testBytes: new Uint8Array([1, 2, 3]),
          testBigInt: BigInt('9007199254740991'),
          testJSON: { foo: 'test', bar: 123 },
        },
        from: 'nullable.test-d.ts: expectAssignable<ModelCreateInput>({ ...every scalar..., testJSON: { foo: test, bar: 123 } })',
        derived:
          "Decimal('123.45') is passed as the string '123.45', which PZG's decimal input accepts without loading the client runtime",
      },
      {
        target: 'objects/ModelCreateInput',
        expect: 'reject',
        at: 'testJSON',
        value: { testJSON: { foo: 1, bar: 'x' } },
        from: 'nullable.test-d.ts: declare global { type TestJsonType = { foo: string; bar: number } }',
        derived:
          'upstream has no rejection case for testJSON; this asserts the annotation is actually enforced',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'accept',
        value: {
          testInt: 42,
          testString: 'hello',
          testBoolean: true,
          testFloat: 3.14,
          testDateTime: new Date(),
          testDecimal: '123.45',
          testBytes: new Uint8Array([1, 2, 3]),
          testBigInt: BigInt('9007199254740991'),
        },
        from: 'nullable.test-d.ts: expectAssignable<ModelWhereInput>({ ...every scalar... })',
        derived: "Decimal('123.45') is passed as the string '123.45'",
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'reject',
        at: 'testInt',
        value: { testInt: 'not a number', testFloat: 'not a float' },
        from: "nullable.test-d.ts: expectNotAssignable<ModelWhereInput>({ testInt: 'not a number', testFloat: 'not a float' })",
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'accept',
        value: { testInt: 42, testFloat: 3.14 },
        from: 'nullable.test-d.ts: expectAssignable<ModelWhereInput>({ testInt: 42, testFloat: 3.14 })',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'accept',
        value: { testInt: { gte: 0 } },
        from: 'nullable.test-d.ts: expectAssignable<ModelWhereInput>({ testInt: { gte: 0 } })',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'accept',
        value: { testFloat: { lt: 100.0 } },
        from: 'nullable.test-d.ts: expectAssignable<ModelWhereInput>({ testFloat: { lt: 100.0 } })',
      },
      {
        target: 'objects/ModelWhereInput',
        expect: 'accept',
        value: { testInt: 999999, testFloat: 999.999 },
        from: 'nullable.test-d.ts: expectAssignable<ModelWhereInput>({ testInt: 999999, testFloat: 999.999 })',
      },
    ],
  },

  /* ----------------------------------------------------------- extensions */
  {
    file: 'extensions.prisma',
    namespaceTypes: { UserProfile: `{ theme: 'dark' | 'light'; language?: string }` },
    cases: [
      {
        target: 'objects/UserCreateInput',
        expect: 'accept',
        value: { profile: { theme: 'dark', language: 'en' } },
        from: "extensions.test-d.ts: expectAssignable<Prisma.UserCreateInput>({ profile: { theme: 'dark', language: 'en' } })",
      },
      {
        target: 'objects/UserCreateInput',
        expect: 'accept',
        value: { profile: { theme: 'light' } },
        from: "extensions.test-d.ts: expectAssignable<Prisma.UserCreateInput>({ profile: { theme: 'light' } })",
      },
      {
        target: 'objects/UserCreateInput',
        expect: 'accept',
        value: {},
        from: 'extensions.test-d.ts: expectAssignable<Prisma.UserCreateInput>({})',
      },
      {
        target: 'models/User',
        expect: 'accept',
        value: { id: 1, profile: { theme: 'dark', language: 'en' } },
        from: "extensions.test-d.ts: expectAssignable<User>({ id: 1, profile: { theme: 'dark', language: 'en' } })",
      },
      {
        target: 'models/User',
        expect: 'accept',
        value: { id: 1, profile: null },
        from: 'extensions.test-d.ts: expectAssignable<User>({ id: 1, profile: null })',
      },
      {
        target: 'models/User',
        expect: 'reject',
        at: 'profile',
        value: { id: 1, profile: { theme: 'blue' } },
        from: 'extensions.test-d.ts: "Testing that INVALID types are rejected does not work with tsd when the generated files use @ts-nocheck"',
        derived: 'upstream could not assert this; at runtime PZG can, so it is asserted here',
      },
      {
        target: 'models/User',
        expect: 'reject',
        at: 'profile',
        value: { id: 1, profile: { language: 'en' } },
        from: 'extensions.test-d.ts: "Testing that INVALID types are rejected does not work with tsd when the generated files use @ts-nocheck"',
        derived: 'upstream could not assert this; at runtime PZG can, so it is asserted here',
      },
    ],
  },

  /* ----------------------------------------------------- multiple-clients */
  {
    file: 'multiple-clients.prisma',
    namespaceTypes: {
      Profile: '{ name: string; age: number }',
      Settings: `{ theme: 'light' | 'dark'; notifications: boolean }`,
      Tag: 'string',
    },
    cases: [
      {
        target: 'models/User',
        expect: 'accept',
        value: {
          id: 1,
          profile: { name: 'John', age: 30 },
          settings: { theme: 'dark', notifications: true },
          tags: ['developer', 'typescript'],
        },
        from: 'multiple-clients.test-d.ts: expectAssignable<UserOld>({ profile, settings, tags })',
        derived:
          'both client generators produce the same shape, so one PZG generation covers UserOld and UserNew',
      },
      {
        target: 'models/User',
        expect: 'accept',
        value: { id: 2, profile: { name: 'Jane', age: 25 }, settings: null, tags: [] },
        from: 'multiple-clients.test-d.ts: expectAssignable<UserOld>({ settings: null, tags: [] })',
      },
      {
        target: 'models/User',
        expect: 'reject',
        at: 'profile',
        value: { id: 3, profile: { name: 'Invalid', age: '30' }, settings: null, tags: [] },
        from: "multiple-clients.test-d.ts: expectNotAssignable<UserOld>({ profile: { age: '30' } })",
      },
      {
        target: 'models/User',
        expect: 'reject',
        at: 'settings',
        value: {
          id: 4,
          profile: { name: 'Bob', age: 40 },
          settings: { theme: 'invalid', notifications: true },
          tags: [],
        },
        from: "multiple-clients.test-d.ts: expectNotAssignable<UserOld>({ settings: { theme: 'invalid' } })",
      },
      {
        target: 'models/User',
        expect: 'reject',
        at: 'tags',
        value: { id: 5, profile: { name: 'Alice', age: 35 }, settings: null, tags: [123] },
        from: 'multiple-clients.test-d.ts: expectNotAssignable<UserOld>({ tags: [123] })',
      },
      {
        target: 'models/User',
        expect: 'accept',
        value: {
          id: 1,
          profile: { name: 'John', age: 30 },
          settings: { theme: 'light', notifications: false },
          tags: ['engineer', 'javascript'],
        },
        from: "multiple-clients.test-d.ts: expectAssignable<UserNew>({ settings: { theme: 'light' } })",
      },
      {
        target: 'models/User',
        expect: 'reject',
        at: 'settings',
        value: {
          id: 4,
          profile: { name: 'Bob', age: 40 },
          settings: { theme: 'blue', notifications: true },
          tags: [],
        },
        from: "multiple-clients.test-d.ts: expectNotAssignable<UserNew>({ settings: { theme: 'blue' } })",
      },
      {
        target: 'models/User',
        expect: 'reject',
        at: 'tags',
        value: {
          id: 5,
          profile: { name: 'Alice', age: 35 },
          settings: null,
          tags: [true, false],
        },
        from: 'multiple-clients.test-d.ts: expectNotAssignable<UserNew>({ tags: [true, false] })',
      },
    ],
  },

  /* ---------------------------------------------------------------- mongo */
  {
    file: 'mongo.prisma',
    namespaceTypes: { ...SIMPLE_OPTIONAL_LIST, ...WITH_TYPE },
    cases: [
      {
        target: 'models/Model',
        expect: 'accept',
        value: {
          id: '0',
          simple: 1,
          optional: 2,
          list: [3],
          nested: { simple: 1, optional: 2, list: [3] },
        },
        from: 'mongo.test-d.ts: expectAssignable<Model>({ simple: 1, optional: 2, list: [3], nested: {...} })',
      },
      {
        target: 'models/Model',
        expect: 'accept',
        value: {
          id: '0',
          simple: 1,
          optional: null,
          list: [3],
          nested: { simple: 1, optional: null, list: [3] },
        },
        from: 'mongo.test-d.ts: expectAssignable<Model>({ optional: null })',
      },
      {
        target: 'models/Model',
        expect: 'accept',
        value: {
          id: '0',
          simple: 1,
          optional: null,
          list: [],
          nested: { simple: 1, optional: null, list: [] },
        },
        from: 'mongo.test-d.ts: expectAssignable<Model>({ list: [] })',
      },
      {
        target: 'models/Model',
        expect: 'accept',
        value: {
          id: '0',
          simple: 1,
          optional: 2,
          list: [3, 3, 3],
          nested: { simple: 1, optional: 2, list: [3, 3, 3] },
        },
        from: 'mongo.test-d.ts: expectAssignable<Model>({ list: [3, 3, 3] })',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        value: {
          id: '0',
          simple: 1,
          optional: 2,
          list: [3],
          nested: { simple: 1, optional: 2, list: [3] },
        },
        from: 'mongo.test-d.ts: expectNotAssignable<Model>({ simple: 1, optional: 2, list: [3], nested: {...} })',
        gap: UPSTREAM_CONTRADICTION,
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'optional',
        value: {
          id: '0',
          simple: 1,
          optional: '2',
          list: [3],
          nested: { simple: 1, optional: 2, list: [3] },
        },
        from: "mongo.test-d.ts: expectNotAssignable<Model>({ optional: '2' })",
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'optional',
        value: {
          id: '0',
          simple: 1,
          optional: 'undefined',
          list: 3,
          nested: { simple: 1, optional: 2, list: [3] },
        },
        from: "mongo.test-d.ts: expectNotAssignable<Model>({ optional: 'undefined', list: 3 })",
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'list',
        value: {
          id: '0',
          simple: 1,
          optional: 2,
          list: '3,3,3',
          nested: { simple: 1, optional: 2, list: [3] },
        },
        from: "mongo.test-d.ts: expectNotAssignable<Model>({ list: '3,3,3' })",
      },
      ...listWrapperCases('mongo.test-d.ts'),
      ...textCases('mongo.test-d.ts', '0'),
      {
        target: 'objects/NestedCreateInput',
        expect: 'accept',
        value: { simple: 1, optional: 2, list: [3] },
        from: 'mongo.test-d.ts: expectAssignable<Model>({ nested: { simple: 1, optional: 2, list: [3] } })',
        derived:
          'the pure model schema drops composite fields, so the nested half of the assertion is run against the composite input schema',
      },
      {
        target: 'objects/NestedCreateInput',
        expect: 'reject',
        at: 'simple',
        value: { simple: '1', optional: 2, list: [3] },
        from: "mongo.test-d.ts: expectNotAssignable<Model>({ simple: '1' }) applied to the composite",
        derived:
          'the composite half of the model assertion, run against the composite input schema',
        gap: 'annotations inside a MongoDB composite `type` block are not applied: the emitter resolves a model name from the schema name, and a composite is not a model',
      },
    ],
  },

  /* ------------------------------------------------------------ cockroach */
  {
    file: 'cockroach.prisma',
    namespaceTypes: { ...SIMPLE_OPTIONAL_LIST, ...WITH_TYPE },
    cases: [
      {
        target: 'models/Model',
        expect: 'accept',
        value: { id: 0, simple: 1, optional: 2 },
        from: 'cockroach.test-d.ts: expectAssignable<Model>({ simple: 1, optional: 2 })',
      },
      {
        target: 'models/Model',
        expect: 'accept',
        value: { id: 0, simple: 1, optional: null },
        from: 'cockroach.test-d.ts: expectAssignable<Model>({ optional: null })',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'simple',
        value: { id: 0, simple: '1', optional: 2 },
        from: "cockroach.test-d.ts: expectNotAssignable<Model>({ simple: '1' })",
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'optional',
        value: { id: 0, simple: 1, optional: '2' },
        from: "cockroach.test-d.ts: expectNotAssignable<Model>({ optional: '2' })",
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'optional',
        value: { id: 0, simple: 1, optional: 'undefined' },
        from: "cockroach.test-d.ts: expectNotAssignable<Model>({ optional: 'undefined' })",
      },
      {
        target: 'models/Model',
        expect: 'reject',
        value: { id: 0, simple: 1, optional: 2 },
        from: 'cockroach.test-d.ts: expectNotAssignable<Model>({ simple: 1, optional: 2 })',
        gap: UPSTREAM_CONTRADICTION,
      },
      ...textCases('cockroach.test-d.ts', 0),
    ],
  },

  /* ---------------------------------------------------------------- mysql */
  {
    file: 'mysql.prisma',
    namespaceTypes: { ...SIMPLE_OPTIONAL_LIST, ...WITH_TYPE },
    cases: [
      {
        target: 'models/Model',
        expect: 'accept',
        value: { id: 0, simple: 1, optional: 2 },
        from: 'mysql.test-d.ts: expectAssignable<Model>({ simple: 1, optional: 2 })',
      },
      {
        target: 'models/Model',
        expect: 'accept',
        value: { id: 0, simple: 1, optional: null },
        from: 'mysql.test-d.ts: expectAssignable<Model>({ optional: null })',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'simple',
        value: { id: 0, simple: '1', optional: 2 },
        from: "mysql.test-d.ts: expectNotAssignable<Model>({ simple: '1' })",
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'optional',
        value: { id: 0, simple: 1, optional: '2' },
        from: "mysql.test-d.ts: expectNotAssignable<Model>({ optional: '2' })",
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'optional',
        value: { id: 0, simple: 1, optional: 'undefined' },
        from: "mysql.test-d.ts: expectNotAssignable<Model>({ optional: 'undefined' })",
      },
      {
        target: 'models/Model',
        expect: 'reject',
        value: { id: 0, simple: 1, optional: 2 },
        from: 'mysql.test-d.ts: expectNotAssignable<Model>({ simple: 1, optional: 2 })',
        gap: UPSTREAM_CONTRADICTION,
      },
      ...textCases('mysql.test-d.ts', 0),
    ],
  },

  /* ---------------------------------------------------------------- mssql */
  {
    file: 'mssql.prisma',
    namespaceTypes: WITH_TYPE,
    cases: textCases('mssql.test-d.ts', 0),
  },

  /* --------------------------------------------------------------- sqlite */
  {
    file: 'sqlite.prisma',
    namespaceTypes: WITH_TYPE,
    cases: textCases('sqlite.test-d.ts', 0),
  },

  /* ------------------------------------------------------------- use-type */
  {
    file: 'use-type.prisma',
    namespaceTypes: {
      ...SIMPLE_OPTIONAL_LIST,
      MyOwnType: '{ Simple: 1; Optional: 2; List: 3 }',
    },
    cases: [
      ...simpleOptionalListModelCases('use-type.test-d.ts'),
      ...listWrapperCases('use-type.test-d.ts'),
    ],
  },

  /* ----------------------------------------------------------------- skip */
  {
    file: 'skip.prisma',
    namespaceTypes: SIMPLE_OPTIONAL_LIST,
    cases: [
      {
        target: 'objects/ModelCreateInput',
        expect: 'accept',
        value: { simple: 1, optional: 2, list: [3] },
        from: 'skip.test-d.ts: expectAssignable<XOR<ModelCreateInput, ModelUncheckedCreateInput>>({ simple: 1, optional: 2, list: [3] })',
      },
      {
        target: 'objects/ModelCreateInput',
        expect: 'accept',
        value: { simple: 1, optional: undefined, list: [3] },
        from: 'skip.test-d.ts: expectAssignable<...>({ simple: 1, optional: Prisma.skip, list: [3] })',
        derived: 'Prisma.skip has no PZG analogue; undefined is the nearest runtime value',
      },
      {
        target: 'objects/ModelCreateInput',
        expect: 'reject',
        at: 'optional',
        value: { simple: 1, list: [3] },
        from: 'skip.test-d.ts: expectNotAssignable<...>({ simple: 1, list: [3] })',
        derived:
          'under strictUndefinedChecks an omitted optional must be written Prisma.skip explicitly',
        gap: 'PZG has no strictUndefinedChecks analogue: an optional field may simply be omitted',
      },
    ],
  },

  /* ------------------------------------------------------------------ any */
  {
    file: 'any.prisma',
    cases: [
      {
        target: 'models/Model',
        expect: 'accept',
        value: { id: 0, field: { anything: true } },
        from: 'any.test-d.ts: expectType<Model>({ field: {} as Prisma.JsonValue })',
        derived: 'expectType asserts type identity; the value itself is asserted valid',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        value: { id: 0, field: { anything: true } },
        from: 'any.test-d.ts: expectNotType<Model>({ field: {} as unknown })',
        derived: 'the same value under a different static type',
        gap: 'JsonValue and unknown differ only statically; both accept every runtime value, so no .parse() can tell them apart',
      },
    ],
  },

  /* -------------------------------------------------------------- unknown */
  {
    file: 'unknown.prisma',
    cases: [
      {
        target: 'models/Model',
        expect: 'accept',
        value: {
          id: 0,
          field: {},
          fieldArray: [],
          fieldOptional: {},
          str: '',
          int: 0,
        },
        from: 'unknown.test-d.ts: expectType<Model>({ field: {} as unknown, str: "" as string, int: 0 as number })',
        derived: 'expectType asserts type identity; the value itself is asserted valid',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        at: 'str',
        value: { id: 0, field: {}, fieldArray: [], fieldOptional: {}, str: {}, int: 0 },
        from: 'unknown.test-d.ts: expectNotType<Model>({ str: {} as unknown, int: 0 as unknown })',
        derived: 'the widening has no runtime counterpart; the object value for str does',
      },
      {
        target: 'models/Model',
        expect: 'reject',
        value: {
          id: 0,
          field: {},
          fieldArray: [],
          fieldOptional: {},
          str: '',
          int: 0,
        },
        from: 'unknown.test-d.ts: expectNotType<Model>({ field: {} as any, str: {} as any, int: 0 as any })',
        derived: 'the same value under a different static type',
        gap: 'any and unknown differ only statically; no .parse() can tell them apart',
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* The suite                                                                   */
/* -------------------------------------------------------------------------- */

function defineCorpusSuite(mode: Mode): void {
  for (const corpus of CORPUS) {
    describe(corpus.file, () => {
      let generated: GeneratedCorpus;

      beforeAll(async () => {
        generated = await generateCorpus(corpus, mode);
      }, GENERATION_TIMEOUT);

      for (const testCase of corpus.cases) {
        const label = `${testCase.expect} ${testCase.target}: ${testCase.from}`;
        const gap = gapIn(testCase, mode);

        it(gap ? `KNOWN GAP - ${label}` : label, async () => {
          const schema = await loadTarget(generated.schemasDir, testCase.target);
          const outcome = run(schema, testCase.value);
          const matched = matchesUpstream(testCase, outcome);

          if (gap) {
            // The gap is pinned, not skipped. If PZG starts matching upstream this
            // goes red, and the gap list has to be updated rather than quietly rot.
            expect(
              matched,
              `this row is recorded as a known gap (${gap}) but PZG now matches upstream. Remove the gap.`,
            ).toBe(false);
            return;
          }

          expect(
            matched,
            `upstream says ${testCase.expect}; PZG ${describeOutcome(outcome)}` +
              (testCase.at ? ` (the rejection must name "${testCase.at}")` : ''),
          ).toBe(true);
        });
      }
    });
  }
}

describe('PJTG corpus conformance: generate, then execute upstream assertions', () => {
  defineCorpusSuite(DEFAULT_MODE);
});

/**
 * The same 230 assertions with `typedJson.applyToResults` on.
 *
 * Every row tagged `closedBy: 'applyToResults'` is asserted to *match* here, against a
 * schema this suite generated, imported and `.parse()`d. Without the flag reaching the
 * results generator these rows fail, so the ceiling is a measurement and not an estimate.
 */
describe('PJTG corpus conformance with typedJson.applyToResults: the ceiling', () => {
  defineCorpusSuite(APPLY_TO_RESULTS_MODE);
});

function describeOutcome(outcome: Outcome): string {
  if (outcome.kind === 'accepted') return 'accepted the value';
  if (outcome.kind === 'rejected')
    return `rejected it at [${outcome.paths.join(', ')}]: ${outcome.message}`;
  return `threw a non-ZodError: ${String(outcome.error)}`;
}

/* -------------------------------------------------------------------------- */
/* Scoreboard                                                                  */
/* -------------------------------------------------------------------------- */

const ALL_CASES = CORPUS.flatMap((corpus) =>
  corpus.cases.map((c) => ({ file: corpus.file, ...c })),
);

interface Tally {
  cases: number;
  matching: number;
  gaps: number;
}

/** `expected` is a thunk because the tallies are declared at the foot of the file. */
function defineScoreSuite(mode: Mode, expected: () => Tally): void {
  it('pins the tallies, so a gap cannot be added quietly', () => {
    const gaps = ALL_CASES.filter((c) => gapIn(c, mode));
    const tally: Tally = {
      cases: ALL_CASES.length,
      matching: ALL_CASES.length - gaps.length,
      gaps: gaps.length,
    };
    expect(tally).toEqual(expected());
  });

  it('lists every known gap with its reason', () => {
    const gaps = ALL_CASES.filter((c) => gapIn(c, mode))
      .map((c) => `${c.file} :: ${c.from} :: ${c.gap}`)
      .sort();
    expect(gaps).toMatchSnapshot();
  });
}

describe('PJTG corpus conformance: the score', () => {
  it('covers every vendored schema', () => {
    expect(CORPUS.map((c) => c.file).sort()).toEqual(
      [
        'any.prisma',
        'array.prisma',
        'cockroach.prisma',
        'extensions.prisma',
        'literal.prisma',
        'mongo.prisma',
        'mssql.prisma',
        'multiple-clients.prisma',
        'mysql.prisma',
        'normal-prisma-client.prisma',
        'normal.prisma',
        'nullable.prisma',
        'number.prisma',
        'skip.prisma',
        'sqlite.prisma',
        'string.prisma',
        'unknown.prisma',
        'use-type.prisma',
      ].sort(),
    );
  });

  defineScoreSuite(DEFAULT_MODE, () => EXPECTED_TALLY);
});

describe('PJTG corpus conformance with typedJson.applyToResults: the score', () => {
  defineScoreSuite(APPLY_TO_RESULTS_MODE, () => EXPECTED_TALLY_APPLY_TO_RESULTS);
});

/**
 * Updated deliberately, in the same commit as any change to the gap list.
 *
 * Two numbers, both produced by generating, importing and `.parse()`ing, never by reading
 * the list below:
 *
 *   default                     216 / 230   93.9%   what a `typedJson` block gives you
 *   `applyToResults: true`      221 / 230   96.1%   the same corpus, read path opted in
 *
 * The first is the headline, because it is what a user gets out of the box. The second is
 * the ceiling this branch can reach by configuration alone.
 *
 * The 14 default-mode gaps fall in three groups, and the difference between them matters
 * more than the total:
 *
 *   - **5, open by configuration.** `GroupByOutputType` and the Min/Max aggregate output
 *     types stay at the column's scalar type unless `typedJson.applyToResults` is set. A
 *     result schema describes a row already in the database, so narrowing it on READ can
 *     reject data written before the annotation existed. The flag closes all 5, which is
 *     the whole of the difference between the two scores above.
 *   - **3, PZG defects outside the typed-JSON path.** Two are groupBy's `_count` slot
 *     being `.optional()` without `.nullable()` while the other four aggregate slots are
 *     both, so upstream's explicit `_count: null` is rejected; one is that annotations
 *     inside a MongoDB composite `type` block are never applied, because the emitter
 *     resolves a model name from the schema name and a composite is not a model.
 *   - **6, not closable, and not defects.** `as any` versus `as unknown`, upstream's
 *     `strictUndefinedChecks`, and three rows copied from an accept case under
 *     `@ts-nocheck` where `expectNotAssignable` cannot fire. These are artefacts of
 *     translating type-level assertions into runtime ones: a Zod schema validates a value,
 *     it cannot assert anything about a type's identity.
 *
 * So 224 is the ceiling of the *corpus* (230 minus the 6 that no runtime check can
 * express), not the ceiling of this branch. Reaching it needs the 3 real defects in the
 * middle group fixed. 221 is what configuration alone can reach today.
 *
 * The two `{ field: { set: <value> } }` rows that used to sit here are gone: every
 * annotated column now has its own copy of the shared `<Type>FieldUpdateOperationsInput`,
 * so the operations arm of an update is constrained the same way the direct arm is.
 *
 * Gaps are recorded rather than hidden because a legible gap list is worth more than a
 * green suite that was trimmed to fit. The snapshots name every one with its reason.
 */
const EXPECTED_TALLY: Tally = { cases: 230, matching: 216, gaps: 14 };

/** The same corpus generated with `typedJson.applyToResults: true`. */
const EXPECTED_TALLY_APPLY_TO_RESULTS: Tally = { cases: 230, matching: 221, gaps: 9 };
