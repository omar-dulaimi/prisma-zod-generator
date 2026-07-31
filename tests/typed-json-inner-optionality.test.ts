import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Optionality *inside* a typed replacement.
 *
 * The annotation is one authored schema. `{ a: string; b?: number }` says `b` may be
 * absent, and every artifact reading that annotation has to agree about it. The pure
 * model and the result schema do. The CRUD inputs and the `{ set }` / `{ push }`
 * wrappers used to disagree, because the property line they are composed into is run
 * through a strip that removes `.optional()`, `.nullable()` and `.nullish()` from the
 * whole composed string.
 *
 * That strip is load-bearing on the *outer* expression: alternatives arrive from
 * `wrapWithZodValidators` already carrying `.optional()`, the union tail adds another,
 * and the emitter then re-applies one marker from its own optional/nullable policy. Two
 * markers where the policy allows one is what it exists to prevent, so the fix is not to
 * delete it - it is to stop it reaching inside the replacement expression, which is
 * user-authored schema content the emitter has no business rewriting.
 *
 * Text assertions alone would not catch this: the emitted file is still valid TypeScript
 * either way. The schemas are executed below against a value that omits the optional key,
 * which is the difference the user actually sees.
 *
 * "Inside" is meant literally, and the other half of the boundary lives in
 * tests/typed-json-top-level-optionality.test.ts: a marker at the TOP LEVEL of the
 * replacement is not inside anything. It is the outermost operator of the field's own
 * schema, answering the requiredness question the emitter has already answered from the
 * DMMF, in a file cast to `z.ZodType<Prisma.<M><Op>Input>`. Those come off.
 */

const SCHEMA_BODY = `
model Doc {
  id Int @id @default(autoincrement())

  /// ![{ a: string; b?: number }]
  items Json[]

  /// [Nullish]
  mappedList Json[]

  /// ![{ a: string; b?: number }]
  meta Json

  /// [Nullish]
  mapped Json

  /// ![string | null]
  maybeName String

  /// ![string | null]
  maybeNick String?

  note String?

  plain Json[]
}
`;

/**
 * One `typedJson.map` entry carrying all three markers, so the map path is covered
 * independently of the inline `![...]` converter that produces them from TypeScript.
 */
const NULLISH_EXPRESSION =
  'z.object({ a: z.string().optional(), b: z.string().nullable(), c: z.number().nullish() })';

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

type Parser = { parse: (value: unknown) => unknown };

async function objectSchema(env: GeneratedEnv, name: string): Promise<Parser> {
  const mod = await import(join(schemasDir(env), 'objects', `${name}.schema.ts`));
  return mod[`${name}ObjectZodSchema`] as Parser;
}

/* -------------------------------------------------------------------------- */

describe('typed JSON: inner optionality, configured', () => {
  let env: GeneratedEnv;

  beforeAll(async () => {
    env = await generate('typed-json-inner-optionality-on', {
      typedJson: { map: { Nullish: NULLISH_EXPRESSION } },
    });
  }, GENERATION_TIMEOUT);

  describe('the inline ![{ a?: b }] form', () => {
    it('keeps the optional property in the { set } wrapper', () => {
      expect(memberLine(objectFile(env, 'DocCreateitemsInput'), 'set')).toBe(
        'z.object({ a: z.string(), b: z.number().optional() }).array()',
      );
    });

    it('keeps it in both members of the { set } / { push } wrapper', () => {
      const content = objectFile(env, 'DocUpdateitemsInput');
      expect(memberLine(content, 'set')).toBe(
        'z.object({ a: z.string(), b: z.number().optional() }).array().optional()',
      );
      expect(memberLine(content, 'push')).toBe(
        'z.union([z.object({ a: z.string(), b: z.number().optional() }), ' +
          'z.object({ a: z.string(), b: z.number().optional() }).array()]).optional()',
      );
    });

    it('keeps it on a scalar Json field in the CRUD input itself', () => {
      expect(memberLine(objectFile(env, 'DocCreateInput'), 'meta')).toBe(
        'z.union([JsonNullValueInputSchema, z.object({ a: z.string(), b: z.number().optional() })])',
      );
      expect(memberLine(objectFile(env, 'DocUpdateInput'), 'meta')).toBe(
        'z.union([JsonNullValueInputSchema, z.object({ a: z.string(), b: z.number().optional() })]).optional()',
      );
    });

    it('leaves a whole-expression null to the emitter, which owns the top level', () => {
      // The other side of the boundary, and the limit of what "inside" means.
      // `![string | null]` resolves to `z.string().nullable()`, where the marker is not
      // inside anything: it is the outermost operator of the field's own schema, and
      // requiredness and null-admission there come from the column. `maybeName String` is
      // required and non-null, `Prisma.DocCreateInput` types it `string`, and the schema
      // is cast to that type - so the null comes off and the emitter's policy decides.
      // tests/typed-json-top-level-optionality.test.ts pins that half in full.
      expect(memberLine(objectFile(env, 'DocCreateInput'), 'maybeName')).toBe('z.string()');
    });

    it('emits one marker, not two, where the annotation agreed with the column', () => {
      // `maybeNick String?` is nullable by column *and* nullable by annotation. Only one
      // of the two gets to answer, the column does, and the line it produces is the same
      // one an unannotated `String?` gets rather than a chain with the marker repeated.
      expect(memberLine(objectFile(env, 'DocCreateInput'), 'maybeNick')).toBe(
        'z.string().optional().nullable()',
      );
    });
  });

  describe('the typedJson.map form', () => {
    it('keeps .optional(), .nullable() and .nullish() in the wrapper', () => {
      expect(memberLine(objectFile(env, 'DocCreatemappedListInput'), 'set')).toBe(
        `${NULLISH_EXPRESSION}.array()`,
      );
      expect(memberLine(objectFile(env, 'DocUpdatemappedListInput'), 'push')).toBe(
        `z.union([${NULLISH_EXPRESSION}, ${NULLISH_EXPRESSION}.array()]).optional()`,
      );
    });

    it('keeps them in the CRUD input', () => {
      expect(memberLine(objectFile(env, 'DocCreateInput'), 'mapped')).toBe(
        `z.union([JsonNullValueInputSchema, ${NULLISH_EXPRESSION}])`,
      );
    });
  });

  describe('every artifact answers the same question the same way', () => {
    it('emits the same element schema in the pure model and the CRUD input', () => {
      const pure = readFileSync(join(schemasDir(env), 'models', 'Doc.schema.ts'), 'utf-8');
      const element = 'z.object({ a: z.string(), b: z.number().optional() })';
      expect(pure).toContain(`items: z.array(${element})`);
      expect(objectFile(env, 'DocCreateitemsInput')).toContain(element);
      expect(objectFile(env, 'DocCreateInput')).toContain(element);
    });
  });

  describe('the emitted schemas accept what the annotation accepts', () => {
    it('accepts a set value that omits the optional key', async () => {
      const schema = await objectSchema(env, 'DocCreateitemsInput');
      expect(() => schema.parse({ set: [{ a: 'x' }] })).not.toThrow();
      expect(() => schema.parse({ set: [{ a: 'x', b: 1 }] })).not.toThrow();
      // Still a real replacement, not a rubber stamp.
      expect(() => schema.parse({ set: [{ a: 1 }] })).toThrow();
      expect(() => schema.parse({ set: [{ a: 'x', b: 'nope' }] })).toThrow();
    });

    it('accepts a push value that omits the optional key', async () => {
      const schema = await objectSchema(env, 'DocUpdateitemsInput');
      expect(() => schema.parse({ push: { a: 'x' } })).not.toThrow();
      expect(() => schema.parse({ push: [{ a: 'x' }] })).not.toThrow();
      expect(() => schema.parse({ push: { b: 1 } })).toThrow();
    });

    it('accepts nulls and omissions the map expression allows', async () => {
      const schema = await objectSchema(env, 'DocCreatemappedListInput');
      expect(() => schema.parse({ set: [{ b: null }] })).not.toThrow();
      expect(() => schema.parse({ set: [{ a: 'x', b: 'y', c: null }] })).not.toThrow();
      expect(() => schema.parse({ set: [{ a: 'x', b: 'y', c: 1 }] })).not.toThrow();
      expect(() => schema.parse({ set: [{ a: 1, b: null }] })).toThrow();
      // `b` is nullable, not optional: omitting it is still a failure.
      expect(() => schema.parse({ set: [{ a: 'x' }] })).toThrow();
    });

    it('accepts the same values through the CRUD input the client is written with', async () => {
      const schema = await objectSchema(env, 'DocCreateInput');
      expect(() =>
        schema.parse({ meta: { a: 'x' }, mapped: { b: null }, maybeName: 'name' }),
      ).not.toThrow();
      expect(() =>
        schema.parse({
          meta: { a: 'x', b: 1 },
          mapped: { a: 'x', b: 'y', c: 2 },
          maybeName: 'name',
          maybeNick: null,
          items: { set: [{ a: 'x' }] },
        }),
      ).not.toThrow();
      expect(() =>
        schema.parse({ meta: { b: 1 }, mapped: { b: null }, maybeName: 'name' }),
      ).toThrow();
      // `maybeName String` is required and non-null, whatever `![string | null]` says.
      // `Prisma.DocCreateInput` types it `string`, and this is the schema cast to it.
      expect(() =>
        schema.parse({ meta: { a: 'x' }, mapped: { b: null }, maybeName: null }),
      ).toThrow();
    });

    it('emits a parseable schema for an annotation whose null meets an optional column', async () => {
      // `maybeNick String?` is optional and nullable in Prisma *and* nullable by
      // annotation. Whatever the composed marker chain ends up being, it has to load and
      // still accept all three of null, undefined and a string.
      const schema = await objectSchema(env, 'DocCreateInput');
      for (const maybeNick of [null, undefined, 'nick']) {
        expect(() =>
          schema.parse({ meta: { a: 'x' }, mapped: { b: null }, maybeName: 'name', maybeNick }),
        ).not.toThrow();
      }
    });
  });

  describe('inertness, with typedJson configured', () => {
    it('leaves an unannotated Json[] wrapper exactly as it was', () => {
      expect(memberLine(objectFile(env, 'DocCreateplainInput'), 'set')).toBe('jsonSchema.array()');
      const update = objectFile(env, 'DocUpdateplainInput');
      expect(memberLine(update, 'set')).toBe('jsonSchema.array().optional()');
      expect(memberLine(update, 'push')).toBe(
        'z.union([jsonSchema, jsonSchema.array()]).optional()',
      );
    });

    it('still collapses the emitter own duplicate optionality on unannotated fields', () => {
      // The strip's actual job, and the thing the fix must not undo. `note String?` is
      // optional and nullable, and its update line is composed from two alternatives that
      // each arrive carrying `.optional()`, plus the union's own tail. Exactly one
      // `.optional()` and one `.nullable()` may survive, from the emitter's policy.
      expect(memberLine(objectFile(env, 'DocCreateInput'), 'note')).toBe(
        'z.string().optional().nullable()',
      );
      expect(memberLine(objectFile(env, 'DocUpdateInput'), 'note')).toBe(
        'z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable()',
      );
    });
  });
});

/* -------------------------------------------------------------------------- */

describe('typed JSON: inner optionality, unconfigured', () => {
  /**
   * The regression contract: the same annotated schema with no `typedJson` block emits
   * exactly what 3.0.0 emitted, markers and all.
   */
  let env: GeneratedEnv;

  beforeAll(async () => {
    env = await generate('typed-json-inner-optionality-off', {});
  }, GENERATION_TIMEOUT);

  it('replaces nothing and strips the composed line the way it always did', () => {
    expect(memberLine(objectFile(env, 'DocCreateitemsInput'), 'set')).toBe('jsonSchema.array()');
    expect(memberLine(objectFile(env, 'DocCreateInput'), 'meta')).toBe(
      'z.union([JsonNullValueInputSchema, jsonSchema])',
    );
    expect(memberLine(objectFile(env, 'DocCreateInput'), 'maybeName')).toBe('z.string()');
    expect(memberLine(objectFile(env, 'DocCreateInput'), 'maybeNick')).toBe(
      'z.string().optional().nullable()',
    );
    expect(memberLine(objectFile(env, 'DocCreateInput'), 'note')).toBe(
      'z.string().optional().nullable()',
    );
    expect(memberLine(objectFile(env, 'DocUpdateInput'), 'note')).toBe(
      'z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable()',
    );
  });

  it('mentions no typed replacement anywhere in the objects it emitted', () => {
    for (const name of ['DocCreateInput', 'DocUpdateInput', 'DocCreateitemsInput']) {
      const content = objectFile(env, name);
      expect(content).not.toContain('z.number().optional()');
      expect(content).not.toContain('z.number().nullish()');
    }
  });
});
