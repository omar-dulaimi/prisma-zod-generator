/**
 * Acceptance tests against prisma-json-types-generator's own vendored fixtures
 * (`tests/compat/pjtg/`, MIT, attribution in UPSTREAM-LICENSE).
 *
 * Upstream asserts at the type level. The translation is direct:
 *
 *   expectAssignable<Model>(v)     ->  the emitted schema `.parse(v)` succeeds
 *   expectNotAssignable<Model>(v)  ->  the emitted schema `.parse(v)` throws
 *
 * So every case here **runs** the converted Zod, it does not merely read it. A
 * schema that looks right and does not validate is the failure mode this repo
 * keeps finding.
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  convertTsTypeToZod,
  parsePjtgAnnotation,
  resolveTypedJsonConfig,
  resolveTypedJsonField,
} from '../src/typed-json';

const CORPUS = path.join(__dirname, 'compat', 'pjtg');
const SCHEMA_DIR = path.join(CORPUS, 'schemas');

/* -------------------------------------------------------------------------- */
/* The namespace types the corpus declares in its .test-d.ts files             */
/* -------------------------------------------------------------------------- */

/**
 * Verbatim from the `declare global { namespace ... }` blocks. These are the
 * hand-authored schema module a PZG user would write; converting them here also
 * proves the converter handles every shape upstream's own fixtures use.
 */
const NAMESPACE_TYPES: Record<string, string> = {
  Simple: '1',
  Optional: '2',
  List: '3',
  WithType: `'C' | 'D'`,
  StringArrayType: `'foo' | 'bar'`,
  Price: '100 | 200 | 300',
  NullablePrice: '50 | 100',
  FloatPrice: '1.5 | 2.5 | 3.5',
  Config: '{ tier: string; enabled: boolean }',
  UserProfile: `{ theme: 'dark' | 'light'; language?: string }`,
  SampleJson: '{ a: number; b: string }',
  Profile: '{ name: string; age: number }',
  Settings: `{ theme: 'light' | 'dark'; notifications: boolean }`,
  Tag: 'string',
  TestJsonType: '{ foo: string; bar: number }',
  MyOwnType: '{ Simple: 1; Optional: 2; List: 3 }',
};

const CONFIG = resolveTypedJsonConfig({ typedJson: { schemaModule: './json-types' } })!;

/** The evaluated schema module: `SimpleSchema`, `WithTypeSchema`, and so on. */
const SCHEMA_MODULE: Record<string, z.ZodType> = {};
for (const [name, typeText] of Object.entries(NAMESPACE_TYPES)) {
  const converted = convertTsTypeToZod(typeText);
  if (!converted.ok) {
    throw new Error(
      `corpus namespace type ${name} (${typeText}) did not convert: ${converted.reason}`,
    );
  }
  SCHEMA_MODULE[`${name}Schema`] = evaluate(converted.expression);
}

/** Turn a Zod expression string into a live schema. */
function evaluate(expression: string): z.ZodType {
  const names = Object.keys(SCHEMA_MODULE);
  const factory = new Function('z', ...names, `"use strict"; return (${expression});`) as (
    ...args: unknown[]
  ) => z.ZodType;
  return factory(z, ...names.map((name) => SCHEMA_MODULE[name]));
}

/* -------------------------------------------------------------------------- */
/* Corpus row table                                                            */
/* -------------------------------------------------------------------------- */

interface Row {
  /** `<schema file>#<Model>.<field>`, so a failure names its corpus origin. */
  id: string;
  documentation: string;
  isList?: boolean;
  isOptional?: boolean;
  /** The element-level Zod the resolver is expected to produce. */
  element: string;
  /** Values upstream asserts assignable to the model output type. */
  accept: unknown[];
  /** Values upstream asserts not assignable. */
  reject: unknown[];
}

const ROWS: Row[] = [
  {
    id: 'array.prisma#Model.array',
    documentation: '![[number[]][]]',
    isList: true,
    element: 'z.array(z.tuple([z.array(z.number())]))',
    accept: [[[[[1, 2, 3]], [[4, 5, 6]]]]],
    reject: [
      [[[[1, 2, 3]], [[4, 5, '6']]]],
      [
        [
          [
            [1, 2, 3],
            [4, 5, 6],
          ],
        ],
      ],
      ['asd'],
    ],
  },
  {
    id: 'literal.prisma#Model.simple',
    documentation: '![1]',
    element: 'z.literal(1)',
    accept: [1],
    reject: ['1', 2, null],
  },
  {
    id: 'literal.prisma#Model.optional',
    documentation: '![2]',
    isOptional: true,
    element: 'z.literal(2)',
    accept: [2, null, undefined],
    reject: ['2', 'undefined', 3],
  },
  {
    id: 'literal.prisma#Model.list',
    documentation: '![3]',
    isList: true,
    element: 'z.literal(3)',
    accept: [[3], [], [3, 3, 3]],
    reject: [3, '3,3,3', ['3']],
  },
  {
    id: 'string.prisma#Model.literal',
    documentation: `!['A' | 'B']`,
    element: `z.enum(['A', 'B'])`,
    accept: ['A', 'B'],
    reject: ['invalid', 'D', 0],
  },
  {
    id: 'string.prisma#Model.typed',
    documentation: '[WithType]',
    element: 'WithTypeSchema',
    accept: ['C', 'D'],
    reject: ['invalid', 'A'],
  },
  {
    id: 'string.prisma#StringArrayModel.tags',
    documentation: '[StringArrayType]',
    isList: true,
    element: 'StringArrayTypeSchema',
    accept: [['foo', 'bar'], ['foo'], []],
    reject: [['invalid'], 'foo'],
  },
  {
    id: 'number.prisma#Model.price',
    documentation: '[Price]',
    element: 'PriceSchema',
    accept: [100, 200, 300],
    reject: [400, 999, '100'],
  },
  {
    id: 'number.prisma#Model.nullablePrice',
    documentation: '[NullablePrice]',
    isOptional: true,
    element: 'NullablePriceSchema',
    accept: [50, 100, null],
    reject: [75, 25],
  },
  {
    id: 'number.prisma#Model.floatPrice',
    documentation: '[FloatPrice]',
    element: 'FloatPriceSchema',
    accept: [1.5, 2.5, 3.5],
    reject: [4.5, 0.5, 99.9],
  },
  {
    id: 'number.prisma#Model.config',
    documentation: '[Config]',
    isOptional: true,
    element: 'ConfigSchema',
    accept: [{ tier: 'basic', enabled: true }, { tier: 'premium', enabled: false }, null],
    reject: [{ tier: 1 }, {}, { tier: 'basic' }],
  },
  {
    id: 'extensions.prisma#User.profile',
    documentation: '[UserProfile]',
    isOptional: true,
    element: 'UserProfileSchema',
    accept: [{ theme: 'dark', language: 'en' }, { theme: 'light' }, null, undefined],
    // Upstream could not assert these: its file is under @ts-nocheck, where
    // expectNotAssignable does not fire. They are ours.
    reject: [{ theme: 'blue' }, { language: 'en' }],
  },
  {
    id: 'normal.prisma#orders.meta',
    documentation: '[SampleJson]',
    isOptional: true,
    element: 'SampleJsonSchema',
    accept: [{ a: 1, b: 'x' }, null],
    reject: [{ a: '1', b: 'x' }, { a: 1 }],
  },
  {
    id: 'normal.prisma#Model.simple',
    documentation: '[Simple]',
    element: 'SimpleSchema',
    accept: [1],
    reject: [2, '1'],
  },
  {
    id: 'normal.prisma#Model.optional',
    documentation: '[Optional]',
    isOptional: true,
    element: 'OptionalSchema',
    accept: [2, null],
    reject: ['2', 3],
  },
  {
    id: 'normal.prisma#Model.list',
    documentation: '[List]',
    isList: true,
    element: 'ListSchema',
    accept: [[3], [], [3, 3, 3]],
    reject: [3, ['3']],
  },
  {
    id: 'multiple-clients.prisma#User.profile',
    documentation: '[Profile]',
    element: 'ProfileSchema',
    accept: [{ name: 'John', age: 30 }],
    reject: [{ name: 'Invalid', age: '30' }],
  },
  {
    id: 'multiple-clients.prisma#User.settings',
    documentation: '[Settings]',
    isOptional: true,
    element: 'SettingsSchema',
    accept: [{ theme: 'dark', notifications: true }, null],
    reject: [
      { theme: 'invalid', notifications: true },
      { theme: 'blue', notifications: true },
    ],
  },
  {
    id: 'multiple-clients.prisma#User.tags',
    documentation: '[Tag]',
    isList: true,
    element: 'TagSchema',
    accept: [['developer', 'typescript'], []],
    reject: [[123], [true, false]],
  },
  {
    id: 'nullable.prisma#Model.testJSON',
    documentation: '[TestJsonType]',
    isOptional: true,
    element: 'TestJsonTypeSchema',
    accept: [{ foo: 'test', bar: 123 }, null],
    reject: [{ foo: 1, bar: 'x' }],
  },
  {
    id: 'normal-prisma-client.prisma#SubModel.simple',
    documentation: '[Simple]',
    element: 'SimpleSchema',
    accept: [1],
    reject: [2],
  },
  {
    id: 'mongo.prisma#Text.literal',
    documentation: `!['A' | 'B']`,
    element: `z.enum(['A', 'B'])`,
    accept: ['A', 'B'],
    reject: ['D'],
  },
  {
    id: 'mongo.prisma#Nested.list',
    documentation: '[List]',
    isList: true,
    element: 'ListSchema',
    accept: [[3], []],
    reject: [3],
  },
];

describe('PJTG corpus: every annotation converts, and the result validates', () => {
  for (const row of ROWS) {
    it(row.id, () => {
      const result = resolveTypedJsonField(
        {
          modelName: row.id.split('#')[1].split('.')[0],
          fieldName: row.id.split('.').pop()!,
          documentation: row.documentation,
          isList: row.isList,
          isOptional: row.isOptional,
        },
        CONFIG,
      );

      expect(result.status, `${row.id}: ${'reason' in result ? result.reason : ''}`).toBe(
        'resolved',
      );
      if (result.status !== 'resolved') return;

      expect(result.elementExpression).toBe(row.element);
      expect(result.expression).toBe(row.isList ? `z.array(${row.element})` : row.element);

      // The model output type: the field schema plus the optionality the
      // emitters apply. Upstream's assertions are against exactly this.
      const modelSchema = row.isOptional
        ? evaluate(`(${result.expression}).nullish()`)
        : evaluate(result.expression);

      for (const value of row.accept) {
        expect(
          () => modelSchema.parse(value),
          `should accept ${JSON.stringify(value)}`,
        ).not.toThrow();
      }
      for (const value of row.reject) {
        expect(() => modelSchema.parse(value), `should reject ${JSON.stringify(value)}`).toThrow(
          z.ZodError,
        );
      }
    });
  }
});

describe('PJTG corpus: imports are synthesized for namespace references only', () => {
  it('a [TypeName] row imports exactly the schema it uses', () => {
    const result = resolveTypedJsonField(
      { modelName: 'Model', fieldName: 'typed', documentation: '[WithType]' },
      CONFIG,
    );
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.imports).toEqual([
      {
        importStatement: "import { WithTypeSchema } from './json-types'",
        source: './json-types',
        importedItems: ['WithTypeSchema'],
        isDefault: false,
        isNamespace: false,
        isTypeOnly: false,
        originalStatement: "import { WithTypeSchema } from './json-types'",
      },
    ]);
  });

  it('an ![inline] row needs no import', () => {
    const result = resolveTypedJsonField(
      { modelName: 'Model', fieldName: 'literal', documentation: `!['A' | 'B']` },
      CONFIG,
    );
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.imports).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Coverage of the vendored .prisma files themselves                          */
/* -------------------------------------------------------------------------- */

interface CorpusField {
  file: string;
  block: string;
  field: string;
  documentation: string;
}

/** Minimal Prisma reader: field-level `///` comments inside model/type blocks. */
function readCorpusFields(file: string): CorpusField[] {
  const source = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8');
  const fields: CorpusField[] = [];
  let block: string | null = null;
  let docs: string[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;

    if (block === null) {
      const open = line.match(/^(?:model|type)\s+(\w+)\s*\{/);
      if (open) {
        block = open[1];
        docs = [];
      }
      continue;
    }

    if (line === '}') {
      block = null;
      docs = [];
      continue;
    }
    if (line.startsWith('///')) {
      docs.push(line.slice(3).trim());
      continue;
    }
    if (line.startsWith('//')) continue;

    const name = line.match(/^(\w+)\s/);
    if (name) fields.push({ file, block, field: name[1], documentation: docs.join('\n') });
    docs = [];
  }

  return fields;
}

const CORPUS_FILES = fs
  .readdirSync(SCHEMA_DIR)
  .filter((name) => name.endsWith('.prisma'))
  .sort();

describe('PJTG corpus: coverage over the vendored schemas', () => {
  it('vendors 18 schemas and 18 type-assertion files', () => {
    expect(CORPUS_FILES).toHaveLength(18);
    expect(
      fs.readdirSync(path.join(CORPUS, 'types')).filter((n) => n.endsWith('.test-d.ts')),
    ).toHaveLength(18);
  });

  it('recognises every annotation the corpus carries, and nothing else', () => {
    const annotated: string[] = [];
    const unannotated: string[] = [];

    for (const file of CORPUS_FILES) {
      for (const field of readCorpusFields(file)) {
        const parsed = parsePjtgAnnotation(field.documentation);
        const id = `${file}#${field.block}.${field.field}`;
        if (parsed.annotation) annotated.push(`${id} ${parsed.annotation.raw}`);
        else if (field.documentation !== '') unannotated.push(`${id} ${field.documentation}`);
      }
    }

    // Every `///` comment in the corpus is a PJTG annotation; there is no doc
    // text there for us to accidentally read as one.
    expect(unannotated).toEqual([]);
    expect(annotated.length).toBeGreaterThan(0);
    expect(annotated).toMatchSnapshot();
  });

  it('resolves every recognised annotation, with no unconvertible left over', () => {
    const unconvertible: string[] = [];
    let resolved = 0;

    for (const file of CORPUS_FILES) {
      for (const field of readCorpusFields(file)) {
        const result = resolveTypedJsonField(
          {
            modelName: field.block,
            fieldName: field.field,
            documentation: field.documentation,
            isList: false,
          },
          CONFIG,
        );
        if (result.status === 'resolved') resolved++;
        else if (result.status === 'unconvertible') unconvertible.push(`${file}: ${result.reason}`);
      }
    }

    expect(unconvertible).toEqual([]);
    expect(resolved).toBeGreaterThan(0);
  });

  it('pins what is deliberately NOT emulated, so it cannot drift silently', () => {
    // use-type.prisma and nullable.prisma set PJTG's `useType` generator option,
    // under which `[Simple]` means `PrismaJson.MyOwnType['Simple']` rather than
    // `PrismaJson.Simple`. There is no PZG analogue and none is invented here:
    // `[Simple]` resolves to the plain `SimpleSchema`. Users of `useType` must
    // point typedJson.map at the right export.
    const useType = resolveTypedJsonField(
      { modelName: 'Model', fieldName: 'simple', documentation: '[Simple]' },
      CONFIG,
    );
    expect(useType.status).toBe('resolved');
    if (useType.status === 'resolved') expect(useType.expression).toBe('SimpleSchema');

    // ...and typedJson.map is the documented escape hatch for exactly that.
    const mapped = resolveTypedJsonField(
      { modelName: 'Model', fieldName: 'simple', documentation: '[Simple]' },
      resolveTypedJsonConfig({
        typedJson: {
          schemaModule: './json-types',
          map: { Simple: 'MyOwnTypeSchema.shape.Simple' },
        },
      })!,
    );
    expect(mapped.status === 'resolved' && mapped.expression).toBe('MyOwnTypeSchema.shape.Simple');

    // skip.prisma exercises `Prisma.skip` and `strictUndefinedChecks`, neither of
    // which PZG has. Its annotations are ordinary and still parse; only its type
    // assertions are untranslatable.
    for (const field of readCorpusFields('skip.prisma')) {
      if (field.documentation === '') continue;
      expect(parsePjtgAnnotation(field.documentation).annotation).not.toBeNull();
    }

    // PJTG's `allowAny` changes an *unannotated* Json field from `unknown` to
    // `Prisma.JsonValue`. Both accept everything at runtime, so no .parse()
    // assertion can tell them apart and nothing here tries.
    expect(resolveTypedJsonField({ fieldName: 'field', documentation: '' }, CONFIG).status).toBe(
      'none',
    );
  });

  it('leaves the zero-annotation control fixtures completely untouched', () => {
    // any.prisma and unknown.prisma exist to prove nothing changes for fields
    // that carry no annotation. They are the regression contract in fixture form.
    for (const file of ['any.prisma', 'unknown.prisma']) {
      for (const field of readCorpusFields(file)) {
        expect(parsePjtgAnnotation(field.documentation).annotation).toBeNull();
        expect(
          resolveTypedJsonField(
            { fieldName: field.field, documentation: field.documentation },
            CONFIG,
          ).status,
        ).toBe('none');
      }
    }
  });
});
