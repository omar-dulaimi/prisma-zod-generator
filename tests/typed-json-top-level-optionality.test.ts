import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Optionality at the TOP LEVEL of a typed replacement, which is the emitter's to decide.
 *
 * `tests/typed-json-inner-optionality.test.ts` pins the other half: a marker written
 * *inside* the user's type - `{ a: string; b?: number }`, or an element inside
 * `z.array(...)` - is the user's, and the composed property line must not rewrite it.
 *
 * The boundary between the two is positional, and it is the whole of the rule:
 *
 *   a trailing run of `.optional()` / `.nullable()` / `.nullish()` on the replacement,
 *   still outermost where the replacement lands, is the emitter's;
 *   everything else in the replacement is the user's.
 *
 * "Still outermost where it lands" is the part that carries its weight on list fields.
 * `Json[]` composes `<element>.array()`, so the element's own trailing marker is no
 * longer the field's marker - it sits under the array wrapper and describes an element.
 * `InputJsonArray` is `ReadonlyArray<InputJsonValue | null>`, so a null element is a
 * value Prisma really does accept, and the emitter has no business deleting it.
 *
 * Why the emitter owns the outermost one: every emitted object schema is cast to the
 * Prisma input type for the same operation -
 *
 *   export const Req2CreateInputObjectSchema: z.ZodType<Prisma.Req2CreateInput> = ...
 *
 * so requiredness and null-admission are not opinions the annotation gets to hold. They
 * come from the DMMF, and a schema that disagrees accepts payloads the type it is cast to
 * rejects: an omitted key for a required column, a raw `null` where `Prisma.Req2CreateInput`
 * says `string`, or where a required `Json` column says `JsonNullValueInput | InputJsonValue`
 * and means `Prisma.JsonNull`, not `null`.
 *
 * Text assertions alone cannot see this. `z.union([JsonNullValueInputSchema, X.optional()])`
 * is valid TypeScript and reads as a union of two members, but one optional member makes
 * the whole key omittable in Zod. The schemas are executed below.
 */

const SCHEMA_BODY = `
model Req2 {
  id Int @id @default(autoincrement())
  /// ![{ a: string } | undefined]
  needed Json
  /// ![string | undefined]
  neededStr String
  /// ![{ a: string } | null]
  nullableJson Json
}

model Boundary {
  id Int @id @default(autoincrement())

  /// ![{ a: string; b?: number }]
  inner Json

  /// ![{ a: string; b?: number } | undefined]
  bothAtOnce Json

  /// ![({ a: string } | undefined)[]]
  innerArray Json

  /// ![{ a: string; b?: number }]
  innerList Json[]

  /// ![{ a: string } | null]
  nullableElement Json[]

  /// ![string | null | undefined]
  nullish String

  /// ![string | undefined]
  optionalColumn String?

  /// ![string | null]
  nullableColumn String?

  note String?

  plainJson Json
}
`;

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
  const config = { ...ConfigGenerator.createBasicConfig(), pureModels: true, ...extraConfig };

  writeFileSync(join(testEnv.testDir, 'config.json'), JSON.stringify(config, null, 2));
  writeFileSync(
    testEnv.schemaPath,
    `
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
${SCHEMA_BODY}`,
  );

  const { stdout, stderr } = await testEnv.runGenerationWithOutput();
  return { outputDir: testEnv.outputDir, stdout, stderr };
}

const schemasDir = (env: GeneratedEnv) => join(env.outputDir, 'schemas');
const objectFile = (env: GeneratedEnv, name: string) =>
  readFileSync(join(schemasDir(env), 'objects', `${name}.schema.ts`), 'utf-8');

/** The single property line for `member`, whitespace-normalised. */
function memberLine(content: string, member: string): string {
  const match = content.match(new RegExp(`^\\s*${member}:\\s*(.+?),?\\s*$`, 'm'));
  if (!match) throw new Error(`No line for "${member}" in:\n${content}`);
  return match[1].replace(/,$/, '').trim();
}

type Parser = {
  parse: (value: unknown) => unknown;
  safeParse: (value: unknown) => { success: boolean };
};

async function objectSchema(env: GeneratedEnv, name: string): Promise<Parser> {
  const mod = await import(join(schemasDir(env), 'objects', `${name}.schema.ts`));
  return mod[`${name}ObjectZodSchema`] as Parser;
}

/* -------------------------------------------------------------------------- */

describe('typed JSON: top-level optionality belongs to the emitter', () => {
  let env: GeneratedEnv;

  beforeAll(async () => {
    env = await generate('typed-json-top-level-optionality-on', {
      typedJson: { schemaModule: './json-types', schemaSuffix: 'Schema' },
    });
  }, GENERATION_TIMEOUT);

  describe('a required column stays required', () => {
    it('drops a top-level .optional() the annotation put on a required Json column', () => {
      expect(memberLine(objectFile(env, 'Req2CreateInput'), 'needed')).toBe(
        'z.union([JsonNullValueInputSchema, z.object({ a: z.string() })])',
      );
    });

    it('drops a top-level .optional() the annotation put on a required String column', () => {
      expect(memberLine(objectFile(env, 'Req2CreateInput'), 'neededStr')).toBe('z.string()');
    });

    it('drops a top-level .nullable() where Prisma admits no null', () => {
      // `nullableJson Json` is a required, non-null column. `Prisma.Req2CreateInput` types
      // it `JsonNullValueInput | InputJsonValue`, and that is what the union's other member
      // is for: the JSON null is written as `Prisma.JsonNull`, never as a bare `null`.
      expect(memberLine(objectFile(env, 'Req2CreateInput'), 'nullableJson')).toBe(
        'z.union([JsonNullValueInputSchema, z.object({ a: z.string() })])',
      );
    });

    it('drops a top-level .nullish() from both halves at once', () => {
      expect(memberLine(objectFile(env, 'BoundaryCreateInput'), 'nullish')).toBe('z.string()');
    });

    it('refuses a payload the Prisma type it is cast to refuses', async () => {
      const schema = await objectSchema(env, 'Req2CreateInput');
      const full = { needed: { a: 'x' }, neededStr: 's', nullableJson: { a: 'x' } };

      expect(schema.safeParse(full).success).toBe(true);
      // The JSON null, spelled the one way Prisma spells it.
      expect(schema.safeParse({ ...full, nullableJson: 'JsonNull' }).success).toBe(true);

      // Every one of these is rejected by Prisma.Req2CreateInput.
      for (const [label, payload] of [
        ['no keys at all', {}],
        ['needed omitted', { neededStr: 's', nullableJson: { a: 'x' } }],
        ['neededStr omitted', { needed: { a: 'x' }, nullableJson: { a: 'x' } }],
        ['nullableJson omitted', { needed: { a: 'x' }, neededStr: 's' }],
        ['needed undefined', { ...full, needed: undefined }],
        ['neededStr undefined', { ...full, neededStr: undefined }],
        ['nullableJson null', { ...full, nullableJson: null }],
      ] as const) {
        expect(schema.safeParse(payload).success, label).toBe(false);
      }
    });

    it('still replaces the schema rather than rubber-stamping it', async () => {
      const schema = await objectSchema(env, 'Req2CreateInput');
      const full = { needed: { a: 'x' }, neededStr: 's', nullableJson: { a: 'x' } };
      expect(schema.safeParse({ ...full, needed: { a: 1 } }).success).toBe(false);
      expect(schema.safeParse({ ...full, neededStr: 7 }).success).toBe(false);
    });
  });

  describe('the emitter re-applies its own policy, once', () => {
    it('emits a single marker where the annotation already carried one', () => {
      // `optionalColumn String?` is optional and nullable by column, and its annotation
      // says `| undefined` too. The emitter's policy answers that question, so the line is
      // the same one an unannotated `String?` gets.
      const create = objectFile(env, 'BoundaryCreateInput');
      expect(memberLine(create, 'optionalColumn')).toBe('z.string().optional().nullable()');
      expect(memberLine(create, 'nullableColumn')).toBe('z.string().optional().nullable()');
      expect(memberLine(create, 'note')).toBe('z.string().optional().nullable()');
    });

    it('accepts null, undefined and a value on an optional nullable column', async () => {
      const schema = await objectSchema(env, 'BoundaryCreateInput');
      const full = {
        inner: { a: 'x' },
        bothAtOnce: { a: 'x' },
        innerArray: [{ a: 'x' }],
        nullish: 's',
        plainJson: { anything: true },
      };
      for (const value of [null, undefined, 'v']) {
        expect(
          schema.safeParse({ ...full, optionalColumn: value, nullableColumn: value }).success,
        ).toBe(true);
      }
    });
  });

  describe('a marker nested in the replacement belongs to the annotation', () => {
    it('keeps an optional object property', () => {
      expect(memberLine(objectFile(env, 'BoundaryCreateInput'), 'inner')).toBe(
        'z.union([JsonNullValueInputSchema, z.object({ a: z.string(), b: z.number().optional() })])',
      );
    });

    it('takes the outer marker and keeps the inner one, from a single annotation', () => {
      // The boundary in one expression. `![{ a: string; b?: number } | undefined]` puts a
      // marker on both sides of it at once: the `| undefined` is the field's, the `b?` is
      // the type's. Exactly one of them survives, and it is not the one the column decides.
      expect(memberLine(objectFile(env, 'BoundaryCreateInput'), 'bothAtOnce')).toBe(
        'z.union([JsonNullValueInputSchema, z.object({ a: z.string(), b: z.number().optional() })])',
      );
    });

    it('keeps a marker under a z.array() the annotation itself wrote', () => {
      expect(memberLine(objectFile(env, 'BoundaryCreateInput'), 'innerArray')).toBe(
        'z.union([JsonNullValueInputSchema, z.array(z.object({ a: z.string() }).optional())])',
      );
    });

    it('keeps a marker under the list wrapper the emitter appends', () => {
      // `nullableElement Json[]` with `![{ a: string } | null]`. The `.nullable()` is the
      // element's once `.array()` lands on top of it, and `InputJsonArray` is
      // `ReadonlyArray<InputJsonValue | null>` - a null element is a value Prisma accepts.
      expect(memberLine(objectFile(env, 'BoundaryCreatenullableElementInput'), 'set')).toBe(
        'z.object({ a: z.string() }).nullable().array()',
      );
      expect(memberLine(objectFile(env, 'BoundaryCreateinnerListInput'), 'set')).toBe(
        'z.object({ a: z.string(), b: z.number().optional() }).array()',
      );
    });

    it('splits the two members of push the way Prisma types them', () => {
      // `push?: InputJsonValue | InputJsonValue[]`. The single-value member is the field's
      // own slot, so the annotation's `| null` comes off it; the array member wraps the
      // replacement, so the same `| null` stays there. The asymmetry is not a wobble in
      // the rule, it is Prisma's own: `InputJsonValue` excludes null, `InputJsonArray`
      // is `ReadonlyArray<InputJsonValue | null>`.
      expect(memberLine(objectFile(env, 'BoundaryUpdatenullableElementInput'), 'push')).toBe(
        'z.union([z.object({ a: z.string() }), z.object({ a: z.string() }).nullable().array()]).optional()',
      );
    });

    it('parses values the nested markers allow and rejects the ones they do not', async () => {
      const create = await objectSchema(env, 'BoundaryCreateInput');
      const base = { nullish: 's', plainJson: 1, bothAtOnce: { a: 'x' } };

      expect(create.safeParse({ ...base, inner: { a: 'x' }, innerArray: [] }).success).toBe(true);
      expect(create.safeParse({ ...base, inner: { a: 'x', b: 2 }, innerArray: [] }).success).toBe(
        true,
      );
      expect(create.safeParse({ ...base, inner: { b: 2 }, innerArray: [] }).success).toBe(false);
      expect(
        create.safeParse({ ...base, inner: { a: 'x' }, innerArray: [{ a: 'x' }, undefined] })
          .success,
      ).toBe(true);
      expect(create.safeParse({ ...base, inner: { a: 'x' }, innerArray: [{ a: 1 }] }).success).toBe(
        false,
      );

      // Both halves of `![{ a: string; b?: number } | undefined]`, executed: the key is
      // required, `b` is not.
      expect(create.safeParse({ ...base, inner: { a: 'x' }, innerArray: [] }).success).toBe(true);
      expect(
        create.safeParse({
          ...base,
          bothAtOnce: { a: 'x', b: 1 },
          inner: { a: 'x' },
          innerArray: [],
        }).success,
      ).toBe(true);
      const withoutBothAtOnce = { ...base, inner: { a: 'x' }, innerArray: [] } as Record<
        string,
        unknown
      >;
      delete withoutBothAtOnce.bothAtOnce;
      expect(create.safeParse(withoutBothAtOnce).success).toBe(false);

      const elements = await objectSchema(env, 'BoundaryCreatenullableElementInput');
      expect(elements.safeParse({ set: [{ a: 'x' }, null] }).success).toBe(true);
      expect(elements.safeParse({ set: [{ a: 1 }] }).success).toBe(false);
      // The wrapper itself is still required where the emitter says so.
      expect(elements.safeParse({}).success).toBe(false);
    });
  });

  describe('inertness, with typedJson configured', () => {
    it('leaves the unannotated fields exactly as they were', () => {
      expect(memberLine(objectFile(env, 'BoundaryCreateInput'), 'plainJson')).toBe(
        'z.union([JsonNullValueInputSchema, jsonSchema])',
      );
      expect(memberLine(objectFile(env, 'BoundaryUpdateInput'), 'note')).toBe(
        'z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable()',
      );
    });
  });
});

/* -------------------------------------------------------------------------- */

describe('typed JSON: top-level optionality, unconfigured', () => {
  /** The regression contract: no `typedJson` block, no replacement, no change. */
  let env: GeneratedEnv;

  beforeAll(async () => {
    env = await generate('typed-json-top-level-optionality-off', {});
  }, GENERATION_TIMEOUT);

  it('emits the untyped lines the generator has always emitted', () => {
    const req2 = objectFile(env, 'Req2CreateInput');
    expect(memberLine(req2, 'needed')).toBe('z.union([JsonNullValueInputSchema, jsonSchema])');
    expect(memberLine(req2, 'neededStr')).toBe('z.string()');
    expect(memberLine(req2, 'nullableJson')).toBe(
      'z.union([JsonNullValueInputSchema, jsonSchema])',
    );

    const boundary = objectFile(env, 'BoundaryCreateInput');
    expect(memberLine(boundary, 'inner')).toBe('z.union([JsonNullValueInputSchema, jsonSchema])');
    expect(memberLine(boundary, 'nullish')).toBe('z.string()');
    expect(memberLine(boundary, 'optionalColumn')).toBe('z.string().optional().nullable()');
    expect(memberLine(boundary, 'note')).toBe('z.string().optional().nullable()');
    expect(memberLine(objectFile(env, 'BoundaryCreateinnerListInput'), 'set')).toBe(
      'jsonSchema.array()',
    );
  });
});
