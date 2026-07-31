import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ConfigGenerator, GENERATION_TIMEOUT, TestEnvironment } from './helpers';

/**
 * Typed JSON through the `<Type>FieldUpdateOperationsInput` arm of an update.
 *
 * `data: { label: 'nope' }` and `data: { label: { set: 'nope' } }` are the same write
 * in Prisma. The update property line is
 * `z.union([Typed, z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)])`, so if
 * only the first arm carries the annotation the second one is a route straight round it
 * and the annotation constrains nothing at all.
 *
 * `<Type>FieldUpdateOperationsInput` is shared by every column of that type in the whole
 * schema, so it cannot carry one column's annotation. The typed form has to be a
 * per-field schema, and every unannotated column has to keep pointing at the shared one
 * exactly as it does today.
 *
 * Json is in here for the opposite reason: Prisma emits no operations wrapper for a Json
 * column at all, so `{ set: ... }` is not a write it accepts and there is no second arm
 * to go round. That is asserted rather than assumed.
 */

const SCHEMA_BODY = `
model Post {
  id Int @id @default(autoincrement())

  /// [Tag]
  label String

  /// [Node]
  payload Json

  /// ![1 | 2]
  tier Int

  /// [Ratio]
  ratio Float

  /// [Tag]
  nickname String?

  plain String
  plainJson Json
  plainInt Int
  plainFloat Float
}
`;

/**
 * The hand-authored module the annotations resolve against. Every schema is narrower
 * than the scalar it replaces, so a parse of 'nope' or 9 tells a real replacement from
 * the default.
 */
const JSON_TYPES_MODULE = `import * as z from 'zod';

export const TagSchema = z.enum(['alpha', 'beta']);
export const NodeSchema = z.object({ id: z.string(), label: z.string() });
export const RatioSchema = z.number().min(0).max(1);
`;

interface GeneratedEnv {
  outputDir: string;
}

async function generate(
  envName: string,
  extraConfig: Record<string, unknown>,
): Promise<GeneratedEnv> {
  const testEnv = await TestEnvironment.createTestEnv(envName);
  const config = { ...ConfigGenerator.createBasicConfig(), ...extraConfig };

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

  await testEnv.runGeneration();
  return { outputDir: testEnv.outputDir };
}

const schemasDir = (env: GeneratedEnv) => join(env.outputDir, 'schemas');
const objectFile = (env: GeneratedEnv, name: string) =>
  readFileSync(join(schemasDir(env), 'objects', `${name}.schema.ts`), 'utf-8');

type Parser = { parse: (value: unknown) => unknown };

/** The root `update` operation schema, which is what an application actually calls. */
async function updateOnePost(env: GeneratedEnv): Promise<Parser> {
  const mod = await import(join(schemasDir(env), 'updateOnePost.schema.ts'));
  return mod.PostUpdateOneZodSchema as Parser;
}

/** The single property line for `member`, whitespace-normalised. */
function memberLine(content: string, member: string): string {
  const match = content.match(new RegExp(`^\\s*${member}:\\s*(.+?),?\\s*$`, 'm'));
  if (!match) throw new Error(`No line for "${member}" in:\n${content}`);
  return match[1].replace(/,$/, '').trim();
}

/* -------------------------------------------------------------------------- */

describe('typed JSON: the update-operations arm, configured', () => {
  let env: GeneratedEnv;
  let update: Parser;

  beforeAll(async () => {
    env = await generate('typed-json-update-ops-on', {
      typedJson: { schemaModule: './json-types', schemaSuffix: 'Schema' },
    });
    // Written after generation so the output-directory cleanup never sees it.
    writeFileSync(join(schemasDir(env), 'json-types.ts'), JSON_TYPES_MODULE);
    update = await updateOnePost(env);
  }, GENERATION_TIMEOUT);

  describe('the bare value form, which already worked', () => {
    it('accepts a value the annotation allows and rejects one it does not', () => {
      expect(() => update.parse({ where: { id: 1 }, data: { label: 'alpha' } })).not.toThrow();
      expect(() => update.parse({ where: { id: 1 }, data: { label: 'nope' } })).toThrow();

      expect(() => update.parse({ where: { id: 1 }, data: { tier: 1 } })).not.toThrow();
      expect(() => update.parse({ where: { id: 1 }, data: { tier: 9 } })).toThrow();

      expect(() => update.parse({ where: { id: 1 }, data: { ratio: 0.5 } })).not.toThrow();
      expect(() => update.parse({ where: { id: 1 }, data: { ratio: 4.2 } })).toThrow();
    });
  });

  describe('the { set } form, which is the same write', () => {
    it('rejects a String value the annotation forbids', () => {
      expect(() => update.parse({ where: { id: 1 }, data: { label: { set: 'nope' } } })).toThrow();
    });

    it('still accepts a String value the annotation allows', () => {
      expect(() =>
        update.parse({ where: { id: 1 }, data: { label: { set: 'alpha' } } }),
      ).not.toThrow();
    });

    it('rejects an Int value the annotation forbids', () => {
      expect(() => update.parse({ where: { id: 1 }, data: { tier: { set: 9 } } })).toThrow();
    });

    it('still accepts an Int value the annotation allows', () => {
      expect(() => update.parse({ where: { id: 1 }, data: { tier: { set: 1 } } })).not.toThrow();
    });

    it('rejects a Float value the annotation forbids', () => {
      expect(() => update.parse({ where: { id: 1 }, data: { ratio: { set: 4.2 } } })).toThrow();
    });

    it('still accepts a Float value the annotation allows', () => {
      expect(() => update.parse({ where: { id: 1 }, data: { ratio: { set: 0.5 } } })).not.toThrow();
    });

    it('leaves the arithmetic operations of a numeric column alone', () => {
      // `increment` is not a value of the column, so the annotation has no business
      // constraining it: an Int column typed `1 | 2` is still incremented by 5.
      expect(() =>
        update.parse({ where: { id: 1 }, data: { tier: { increment: 5 } } }),
      ).not.toThrow();
      expect(() =>
        update.parse({ where: { id: 1 }, data: { ratio: { multiply: 3 } } }),
      ).not.toThrow();
    });
  });

  describe('a nullable annotated column', () => {
    it('keeps accepting a bare null', () => {
      expect(() => update.parse({ where: { id: 1 }, data: { nickname: null } })).not.toThrow();
    });

    it('accepts an allowed value and rejects a forbidden one through set', () => {
      expect(() =>
        update.parse({ where: { id: 1 }, data: { nickname: { set: 'beta' } } }),
      ).not.toThrow();
      expect(() =>
        update.parse({ where: { id: 1 }, data: { nickname: { set: 'nope' } } }),
      ).toThrow();
    });
  });

  describe('a Json column, which Prisma gives no operations wrapper', () => {
    it('has no second arm to go round', () => {
      expect(memberLine(objectFile(env, 'PostUpdateInput'), 'payload')).toBe(
        'z.union([JsonNullValueInputSchema, NodeSchema]).optional()',
      );
      expect(objectFile(env, 'PostUpdateInput')).not.toContain('JsonFieldUpdateOperationsInput');
    });

    it('enforces the annotation on the only form there is', () => {
      expect(() =>
        update.parse({ where: { id: 1 }, data: { payload: { id: 'a', label: 'b' } } }),
      ).not.toThrow();
      expect(() =>
        update.parse({ where: { id: 1 }, data: { payload: { id: 1, label: 'b' } } }),
      ).toThrow();
      expect(() =>
        update.parse({ where: { id: 1 }, data: { payload: { set: { id: 'a', label: 'b' } } } }),
      ).toThrow();
    });
  });

  describe('every schema that carries the annotated column, not just PostUpdateInput', () => {
    it('closes the same route in the unchecked and updateMany inputs', () => {
      const checked = memberLine(objectFile(env, 'PostUpdateInput'), 'label');
      expect(memberLine(objectFile(env, 'PostUncheckedUpdateInput'), 'label')).toBe(checked);
      expect(memberLine(objectFile(env, 'PostUpdateManyMutationInput'), 'label')).toBe(checked);
      expect(checked).not.toContain('z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)');
    });
  });

  describe('inertness, with typedJson configured', () => {
    it('leaves an unannotated column taking whatever its scalar type allows', () => {
      expect(() =>
        update.parse({ where: { id: 1 }, data: { plain: { set: 'anything at all' } } }),
      ).not.toThrow();
      expect(() =>
        update.parse({ where: { id: 1 }, data: { plainJson: 'anything at all' } }),
      ).not.toThrow();
      expect(() =>
        update.parse({ where: { id: 1 }, data: { plainInt: { set: 9 } } }),
      ).not.toThrow();
      expect(() =>
        update.parse({ where: { id: 1 }, data: { plainFloat: { set: 4.2 } } }),
      ).not.toThrow();
    });

    it('keeps an unannotated column pointing at the shared operations schema', () => {
      const content = objectFile(env, 'PostUpdateInput');
      expect(memberLine(content, 'plain')).toBe(
        'z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional()',
      );
      expect(memberLine(content, 'plainInt')).toBe(
        'z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional()',
      );
      expect(memberLine(content, 'plainFloat')).toBe(
        'z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputObjectSchema)]).optional()',
      );
    });

    it('leaves the shared operations schemas exactly as they are', () => {
      const shared = objectFile(env, 'StringFieldUpdateOperationsInput');
      expect(memberLine(shared, 'set')).toBe('z.string().optional()');
      expect(shared).not.toContain('TagSchema');
      expect(shared).not.toContain('json-types');

      expect(objectFile(env, 'IntFieldUpdateOperationsInput')).not.toContain('z.literal(1)');
      expect(objectFile(env, 'FloatFieldUpdateOperationsInput')).not.toContain('RatioSchema');
      expect(objectFile(env, 'NullableStringFieldUpdateOperationsInput')).not.toContain(
        'TagSchema',
      );
    });
  });
});

/* -------------------------------------------------------------------------- */

describe('typed JSON: the update-operations arm, unconfigured', () => {
  /**
   * The regression contract. The same annotated schema with no `typedJson` block:
   * every update line is exactly what 3.0.0 emitted, and every operations arm still
   * takes whatever its scalar type allows.
   */
  let env: GeneratedEnv;
  let update: Parser;

  beforeAll(async () => {
    env = await generate('typed-json-update-ops-off', {});
    update = await updateOnePost(env);
  }, GENERATION_TIMEOUT);

  it('emits the 3.0.0 update line for the annotated columns', () => {
    const content = objectFile(env, 'PostUpdateInput');
    expect(memberLine(content, 'label')).toBe(
      'z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional()',
    );
    expect(memberLine(content, 'tier')).toBe(
      'z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputObjectSchema)]).optional()',
    );
    expect(memberLine(content, 'ratio')).toBe(
      'z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputObjectSchema)]).optional()',
    );
    expect(memberLine(content, 'nickname')).toBe(
      'z.union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputObjectSchema)]).optional().nullable()',
    );
    expect(content).not.toContain('json-types');
  });

  it('accepts through set whatever the scalar type allows', () => {
    expect(() =>
      update.parse({ where: { id: 1 }, data: { label: { set: 'nope' } } }),
    ).not.toThrow();
    expect(() => update.parse({ where: { id: 1 }, data: { tier: { set: 9 } } })).not.toThrow();
    expect(() => update.parse({ where: { id: 1 }, data: { ratio: { set: 4.2 } } })).not.toThrow();
  });
});
